/**
 * cdr/mockCdrProvider — a stand-in CDR data-holder + auth server, faithful to
 * the real flow's SHAPE so the accredited client can replace it 1:1:
 *
 *   initiateConsent → (user "authorises" out of band) → completeConsent
 *   → tokened data calls (listAccounts / listTransactions, paginated,
 *   data/links/meta envelopes, string decimal amounts) → revokeConsent.
 *
 * It is deliberately stateful ONLY in memory (a Map of consents) — nothing it
 * holds survives a restart, matching the rule that raw provider data is never
 * persisted by us beyond what the ingestion layer explicitly stores.
 *
 * Edge behaviours are driven by the persona fixtures: accounts listed in
 * `failingAccountIds` throw CdrPartialDataError; the revokes-mid-session
 * persona self-revokes after the first successful transactions page, so the
 * caller's NEXT call fails with CdrConsentRevokedError — exactly how a real
 * mid-sync withdrawal presents.
 */

'use strict';

const { getPersonaData, PERSONAS } = require('./fixtures/personas');
const { CdrAuthError, CdrConsentRevokedError, CdrPartialDataError } = require('./errors');

/** Transactions per page — small enough that fixtures exercise pagination. */
const PAGE_SIZE = 25;

/** @type {Map<string, Object>} consentId → consent record */
const consents = new Map();
/** @type {Map<string, Object>} accessToken → consent record */
const tokens = new Map();
let consentCounter = 0;

/**
 * Step 1 of the consent handshake. In the real flow the returned authUrl is
 * where the consumer authenticates with their data holder; the mock returns a
 * mock:// URL and expects completeConsent to be called with any auth code.
 */
function initiateConsent({ userId, scopes = ['bank:accounts.basic:read', 'bank:transactions:read'], durationDays = 365, persona = 'grad-hecs-bnpl' }) {
  if (!userId) throw new CdrAuthError('initiateConsent requires a userId');
  if (!PERSONAS.includes(persona)) throw new CdrAuthError(`Unknown persona "${persona}"`);
  consentCounter += 1;
  const consentId = `mock-consent-${consentCounter}`;
  consents.set(consentId, {
    consentId,
    userId,
    persona,
    scopes: [...scopes],
    durationDays,
    state: 'awaiting-authorisation',
    transactionsPagesServed: 0,
  });
  return { consentId, state: 'awaiting-authorisation', authUrl: `mock://cdr-auth/${consentId}` };
}

/** Step 2: exchange the (mock) auth code for tokens + a CDR arrangement id. */
function completeConsent({ consentId, authCode }) {
  const consent = consents.get(consentId);
  if (!consent) throw new CdrAuthError(`Unknown consent "${consentId}"`);
  if (!authCode) throw new CdrAuthError('completeConsent requires an authCode');
  if (consent.state === 'revoked') throw new CdrConsentRevokedError('Consent has been revoked');

  consent.state = 'active';
  consent.cdrArrangementId = `mock-arrangement-${consentId}`;
  consent.accessToken = `mock-access-${consentId}`;
  consent.refreshToken = `mock-refresh-${consentId}`;
  tokens.set(consent.accessToken, consent);

  return {
    accessToken: consent.accessToken,
    refreshToken: consent.refreshToken,
    cdrArrangementId: consent.cdrArrangementId,
    expiresInSeconds: consent.durationDays * 24 * 60 * 60,
  };
}

/** Resolve a token to an ACTIVE consent or throw the right error class. */
function requireActiveConsent(accessToken) {
  const consent = tokens.get(accessToken);
  if (!consent) throw new CdrAuthError('Invalid or unknown access token');
  if (consent.state === 'revoked') throw new CdrConsentRevokedError('Consent has been revoked');
  return consent;
}

/** CDR-envelope list of the persona's accounts. */
function listAccounts({ accessToken }) {
  const consent = requireActiveConsent(accessToken);
  const { accounts } = getPersonaData(consent.persona);
  return {
    data: { accounts },
    links: { self: 'mock://cdr/banking/accounts' },
    meta: { totalRecords: accounts.length, totalPages: 1 },
  };
}

/**
 * CDR-envelope page of one account's transactions, newest first. Throws
 * CdrPartialDataError for the persona's failing accounts, and (for the
 * revokes-mid-session persona) revokes the consent after the first
 * successfully served page.
 */
function listTransactions({ accessToken, accountId, page = 1 }) {
  const consent = requireActiveConsent(accessToken);
  const data = getPersonaData(consent.persona);

  if (data.failingAccountIds.includes(accountId)) {
    throw new CdrPartialDataError(`Data holder could not serve transactions for this account`, { accountId });
  }

  const all = data.transactions
    .filter((t) => t.accountId === accountId)
    .sort((a, b) => (a.postingDateTime < b.postingDateTime ? 1 : -1));
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const p = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const slice = all.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);

  consent.transactionsPagesServed += 1;
  if (data.revokeAfterFirstTransactionsPage && consent.transactionsPagesServed >= 1) {
    consent.state = 'revoked'; // the consumer just withdrew consent mid-sync
  }

  return {
    data: { transactions: slice },
    links: {
      self: `mock://cdr/banking/accounts/${accountId}/transactions?page=${p}`,
      next: p < totalPages ? `mock://cdr/banking/accounts/${accountId}/transactions?page=${p + 1}` : null,
    },
    meta: { totalRecords: all.length, totalPages },
  };
}

/** Consumer-initiated (or our-side) consent withdrawal. Idempotent. */
function revokeConsent({ cdrArrangementId }) {
  for (const consent of consents.values()) {
    if (consent.cdrArrangementId === cdrArrangementId) {
      consent.state = 'revoked';
      return { revoked: true };
    }
  }
  return { revoked: false };
}

/** Test hook — wipe all in-memory consent state. */
function _reset() {
  consents.clear();
  tokens.clear();
  consentCounter = 0;
}

module.exports = {
  PAGE_SIZE,
  initiateConsent,
  completeConsent,
  listAccounts,
  listTransactions,
  revokeConsent,
  _reset,
};
