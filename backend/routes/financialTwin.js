/**
 * /api/financial-twin — the Financial Twin's API surface. Thin by design:
 * every calculation lives in services/ (cdr adapter, twinCategorizer,
 * twinProjection); this file only authenticates, validates, clamps, persists
 * and shapes responses.
 *
 * Endpoints:
 *   POST /connect            — run the (mock) CDR consent flow, ingest +
 *                              categorize the feed, persist it.
 *   GET  /connection         — consent status + minimized accounts snapshot.
 *   POST /connection/revoke  — withdraw consent and PURGE stored transactions.
 *   GET  /categorized        — stored categorization summary + uncertain rows.
 *   GET  /projection         — seeded Monte Carlo projection (see query params).
 *
 * Logging here goes through services/twinLog.js — identifiers and counts
 * only, never descriptions/amounts/balances.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const CdrConnection = require('../models/CdrConnection');
const CdrTransaction = require('../models/CdrTransaction');
const UserFinancialProfile = require('../models/UserFinancialProfile');
const {
  getCdrProvider,
  normalizeAccounts,
  normalizeTransactions,
  CdrConsentRevokedError,
  CdrPartialDataError,
} = require('../services/cdr');
const { PERSONAS } = require('../services/cdr/fixtures/personas');
const { categorizeAll, summarizeCategorized } = require('../services/twinCategorizer');
const {
  runTwinProjection,
  DEFAULT_SEED,
  DEFAULT_TRIALS,
  MIN_TRIALS,
  MAX_TRIALS,
  DEFAULT_HORIZON_YEARS,
  MAX_HORIZON_YEARS,
} = require('../services/twinProjection');
const { logTwin, logTwinError } = require('../services/twinLog');

const router = express.Router();
router.use(requireAuth);

// Same clamped-param helper as routes/debtSequencing.js: garbage in a query
// string falls back to a clean default instead of producing garbage output.
function num(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/** Fetch every page of one account's transactions from the provider. */
async function fetchAllTransactions(provider, accessToken, accountId) {
  const all = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = provider.listTransactions({ accessToken, accountId, page });
    all.push(...res.data.transactions);
    totalPages = res.meta.totalPages;
    page += 1;
  } while (page <= totalPages);
  return all;
}

/**
 * POST /connect — consent handshake + ingest + categorize + persist.
 * Body: { persona? } (mock-mode only; which synthetic dataset to draw).
 */
router.post(
  '/connect',
  [body('persona').optional().isString().isIn(PERSONAS).withMessage(`persona must be one of: ${PERSONAS.join(', ')}`)],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const persona = req.body.persona || 'grad-hecs-bnpl';
    let connection = null;
    try {
      const provider = getCdrProvider();

      // Consent handshake. The mock auth server auto-approves; a real flow
      // would redirect the user to authUrl and return via a callback.
      const { consentId } = provider.initiateConsent({ userId: req.user.id, persona });
      const grant = provider.completeConsent({ consentId, authCode: 'mock-auto-approved' });

      // One connection per user: reuse the row, purge superseded transactions.
      connection = await CdrConnection.findOne({ where: { userId: req.user.id } });
      if (connection) {
        await CdrTransaction.destroy({ where: { connectionId: connection.id } });
      } else {
        connection = await CdrConnection.create({ userId: req.user.id });
      }

      const rawAccounts = provider.listAccounts({ accessToken: grant.accessToken }).data.accounts;
      const accounts = normalizeAccounts(rawAccounts);

      // Pull transactions per account; a partial-data failure on one account
      // must not sink the others — it is recorded and surfaced instead.
      const partialAccountIds = [];
      const transactions = [];
      for (const account of accounts) {
        try {
          const raw = await fetchAllTransactions(provider, grant.accessToken, account.accountId);
          transactions.push(...normalizeTransactions(raw));
        } catch (error) {
          if (error instanceof CdrPartialDataError) {
            partialAccountIds.push(account.accountId);
            continue;
          }
          throw error;
        }
      }

      const { categorized, summary } = categorizeAll({ accounts, transactions, rawAccounts });

      const byId = new Map(transactions.map((t) => [t.transactionId, t]));
      await CdrTransaction.bulkCreate(
        categorized.map((c) => {
          const t = byId.get(c.txnId);
          return {
            connectionId: connection.id,
            accountId: t.accountId,
            transactionId: t.transactionId,
            postedAt: t.postedAt,
            amount: t.amount,
            description: t.description,
            merchantCategoryCode: t.merchantCategoryCode,
            category: c.category,
            confidence: c.confidence,
            uncertain: c.uncertain,
          };
        })
      );

      await connection.update({
        status: 'active',
        consentId,
        cdrArrangementId: grant.cdrArrangementId,
        persona,
        scopes: ['bank:accounts.basic:read', 'bank:transactions:read'],
        // Minimized snapshot only — no masked numbers, names or brands.
        accountsSnapshot: accounts.map((a) => ({ accountId: a.accountId, productCategory: a.productCategory, balance: a.balance })),
        consentedAt: new Date(),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      logTwin('cdr.sync.completed', {
        userId: req.user.id,
        connectionId: connection.id,
        accountCount: accounts.length,
        transactionCount: summary.transactionCount,
        uncertainCount: summary.uncertainCount,
        partialAccounts: partialAccountIds.length,
      });

      return res.json({
        connection: serializeConnection(connection),
        summary,
        partial: partialAccountIds.length > 0,
        partialAccountIds,
      });
    } catch (error) {
      if (error instanceof CdrConsentRevokedError) {
        // Consent withdrawn mid-sync: purge whatever this connection holds.
        let purged = 0;
        if (connection) {
          purged = await CdrTransaction.destroy({ where: { connectionId: connection.id } });
          await connection.update({ status: 'revoked', revokedAt: new Date(), accountsSnapshot: null });
        }
        logTwin('cdr.sync.revoked-mid-session', { userId: req.user.id, purged });
        return res.status(409).json({ message: 'Consent was revoked during the sync. Ingested data has been removed.', purged });
      }
      logTwinError('cdr.sync.failed', error, { userId: req.user.id });
      console.error('Financial twin connect error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
);

/** GET /connection — consent status; never includes transactions. */
router.get('/connection', async (req, res) => {
  try {
    const connection = await CdrConnection.findOne({ where: { userId: req.user.id } });
    if (!connection) return res.json({ connection: null });
    return res.json({ connection: serializeConnection(connection) });
  } catch (error) {
    console.error('Financial twin connection error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/** POST /connection/revoke — withdraw consent and purge stored data. */
router.post('/connection/revoke', async (req, res) => {
  try {
    const connection = await CdrConnection.findOne({ where: { userId: req.user.id } });
    if (!connection) return res.status(404).json({ message: 'No CDR connection to revoke' });

    if (connection.cdrArrangementId) {
      getCdrProvider().revokeConsent({ cdrArrangementId: connection.cdrArrangementId });
    }
    const purged = await CdrTransaction.destroy({ where: { connectionId: connection.id } });
    await connection.update({ status: 'revoked', revokedAt: new Date(), accountsSnapshot: null });

    logTwin('cdr.consent.revoked', { userId: req.user.id, connectionId: connection.id, purged });
    return res.json({ connection: serializeConnection(connection), purged });
  } catch (error) {
    console.error('Financial twin revoke error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/** GET /categorized — stored summary + the uncertain rows needing a human. */
router.get('/categorized', async (req, res) => {
  try {
    const connection = await CdrConnection.findOne({ where: { userId: req.user.id } });
    if (!connection || connection.status !== 'active') {
      return res.json({ connected: false, summary: null, uncertain: [] });
    }

    const rows = await CdrTransaction.findAll({ where: { connectionId: connection.id }, order: [['postedAt', 'DESC']] });
    const summary = summarizeCategorized(rows);
    const uncertain = rows
      .filter((r) => r.uncertain)
      .slice(0, 50)
      .map((r) => ({ id: r.id, description: r.description, amount: r.amount, postedAt: r.postedAt, confidence: r.confidence }));

    return res.json({ connected: true, summary, uncertain });
  } catch (error) {
    console.error('Financial twin categorized error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /projection — the seeded Monte Carlo projection.
 * Query params (all optional, clamped):
 *   seed    uint32 (default 1 — an unparameterized GET is idempotent; the UI
 *           passes a random seed explicitly to explore other draws)
 *   trials  100–2000 (default 500)
 *   years   1–40 (default 20)
 */
router.get('/projection', async (req, res) => {
  try {
    const seed = num(req.query.seed, DEFAULT_SEED, 0, 4294967295);
    const trials = num(req.query.trials, DEFAULT_TRIALS, MIN_TRIALS, MAX_TRIALS);
    const years = num(req.query.years, DEFAULT_HORIZON_YEARS, 1, MAX_HORIZON_YEARS);

    const profile = await UserFinancialProfile.findOne({ where: { userId: req.user.id } });

    // Observed CDR flows, when an active connection exists.
    let categorizedSummary = null;
    const connection = await CdrConnection.findOne({ where: { userId: req.user.id } });
    if (connection && connection.status === 'active') {
      const rows = await CdrTransaction.findAll({ where: { connectionId: connection.id } });
      if (rows.length > 0) categorizedSummary = summarizeCategorized(rows);
    }

    const projection = runTwinProjection({
      profile: profile
        ? {
            annualIncome: profile.annualIncome,
            hecsBalance: profile.hecsBalance,
            savingsBalance: profile.savingsBalance,
            superBalance: profile.superBalance,
          }
        : {},
      categorizedSummary,
      seed,
      trials,
      horizonYears: years,
    });

    logTwin('twin.projection.served', {
      userId: req.user.id,
      seed: projection.seed,
      trials: projection.trials,
      horizonYears: projection.horizonYears,
      usedCdrData: projection.generatedFor.usedCdrData,
    });

    return res.json({ projection });
  } catch (error) {
    console.error('Financial twin projection error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/** Public shape of a connection — lifecycle + minimized snapshot only. */
function serializeConnection(connection) {
  return {
    id: connection.id,
    status: connection.status,
    persona: connection.persona,
    scopes: connection.scopes,
    accountsSnapshot: connection.accountsSnapshot,
    consentedAt: connection.consentedAt,
    revokedAt: connection.revokedAt,
    expiresAt: connection.expiresAt,
  };
}

module.exports = router;
