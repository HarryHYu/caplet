/**
 * twinCategorizer — deterministic, rule-based separation of a user's CDR
 * transaction feed into the categories the Financial Twin models.
 *
 * RESPONSIBILITY: given normalized accounts + transactions (see cdr/index.js),
 * decide per transaction: income | hecs | bnpl | consumer_debt | super |
 * transfer | spending | uncertain — with a confidence score and the signals
 * that produced it.
 *
 * HARD CONSTRAINTS (same discipline as debtEngine.js):
 *  1. DETERMINISTIC. Pure functions, no AI/LLM, no network, no clock. The
 *     same input always yields the same categories — auditable, testable.
 *  2. FAIL SAFE. Ambiguity resolves to 'uncertain', never to a confident
 *     guess. Two structural rules enforce this:
 *       - conflicting category votes above the noise floor → 'uncertain',
 *         regardless of how confident the strongest vote is;
 *       - combined confidence below CONFIDENCE_THRESHOLD → 'uncertain'.
 *  3. HECS IS NOT CONSUMER DEBT. 'hecs' can ONLY be produced by the explicit
 *     HECS rule (an ATO + HELP/HECS descriptor); no account prior, recurrence
 *     heuristic or fallback can emit it, and nothing here ever converts a
 *     hecs row into consumer_debt or vice versa. Downstream, HECS remains
 *     income-contingent and indexed (debtEngine), never interest-bearing.
 *
 * The pattern tables below are heuristics over Australian banking feed text,
 * not regulatory figures — but they still carry a review date so staleness is
 * visible. Patterns may name real-world descriptors (that's what arrives in
 * feeds); user-facing strings never do.
 */

'use strict';

/** @typedef {import('./twinTypes').TwinAccount} TwinAccount */
/** @typedef {import('./twinTypes').TwinTransaction} TwinTransaction */
/** @typedef {import('./twinTypes').CategorizedTxn} CategorizedTxn */
/** @typedef {import('./twinTypes').CategorizedSummary} CategorizedSummary */

/** Every category the pipeline can emit. 'uncertain' is the fail-safe state. */
const CATEGORIES = ['income', 'hecs', 'bnpl', 'consumer_debt', 'super', 'transfer', 'spending', 'uncertain'];

/** Below this combined confidence a transaction is flagged uncertain. */
const CONFIDENCE_THRESHOLD = 0.7;

/** Votes at/above this are "real" — two disagreeing real votes force uncertain. */
const CONFLICT_NOISE_FLOOR = 0.45;

/** Last human review of the pattern tables. Update when editing any table. */
const RULES_EFFECTIVE_DATE = '2026-07-04';

/**
 * Explicit HECS/HELP signals — the ONLY source of the 'hecs' category.
 * Word-boundary anchored on purpose: "HELP ST ESPRESSO" contains HELP but not
 * ATO; "HECSTATIC" does not contain \bHECS\b; "ATO PAYMENT PLAN" names the
 * ATO but not HELP/HECS (could be any tax debt) — none of these match.
 */
const HECS_SIGNALS = [
  { pattern: /\bATO\b.*\b(HELP|HECS)\b|\b(HELP|HECS)\b.*\bATO\b/i, signal: 'hecs:ato-help', confidence: 0.95 },
  { pattern: /\bHECS-HELP\b/i, signal: 'hecs:hecs-help', confidence: 0.95 },
];

/**
 * BNPL descriptor patterns seen in real Australian feeds, plus the generic
 * instalment vocabulary. Generic tokens alone are NOT enough — they need the
 * connection to actually hold a BNPL account with a matching brand, otherwise
 * they only reach the "maybe" tier and fail safe to uncertain.
 */
const BNPL_PATTERNS = [
  { pattern: /\bAFTERPAY\b|\bZIP ?PAY\b|\bZIP CO\b|\bKLARNA\b|\bHUMM\b|\bLATITUDE PAY\b/i, signal: 'bnpl:known-descriptor', confidence: 0.9 },
];
const INSTALMENT_TOKEN = /\bINSTAL?LMENTS?\b|\bPAY IN 4\b/i;

/** Superannuation signals. \bSUPER\b will not match SUPA/SUPERCHEAP-style names. */
const SUPER_PATTERNS = [
  { pattern: /\bSUPERANNUATION\b|\bSG CONTRIBUTION\b|\bSUPER (GUARANTEE|CONTRIBUTION)\b/i, signal: 'super:descriptor', confidence: 0.9 },
];

/** Income signals for credits into a transaction account. */
const INCOME_PATTERNS = [
  { pattern: /\bSALARY\b|\bWAGES\b|\bPAYROLL\b|\bPAY RUN\b/i, signal: 'income:descriptor', confidence: 0.8 },
];

/** Interest/repayment vocabulary on debt products. */
const DEBT_PATTERNS = [
  { pattern: /\bINTEREST CHARGED\b|\bLOAN REPAYMENT\b|\bMIN(IMUM)? PAYMENT\b/i, signal: 'consumer_debt:descriptor', confidence: 0.85 },
];

const TRANSFER_TOKEN = /\bTRANSFER\b/i;

/**
 * An ATO payment with no HELP/HECS token could be any tax debt (income tax
 * instalment, an activity-statement plan…). It must NOT be called hecs, and
 * confidently calling it ordinary spending would be a guess — so it gets a
 * deliberately sub-threshold vote and falls out as uncertain.
 */
const ATO_TOKEN = /\bATO\b/i;

/**
 * How strongly an account's product category predicts its transactions'
 * category, before reading any text. Deliberately none for HECS (constraint 3)
 * and none for TRANS_AND_SAVINGS (a transaction account predicts nothing).
 */
const ACCOUNT_PRIORS = {
  CRED_AND_CHRG_CARDS: { category: 'consumer_debt', signal: 'prior:card-account', confidence: 0.75 },
  PERS_LOANS: { category: 'consumer_debt', signal: 'prior:loan-account', confidence: 0.75 },
  BUY_NOW_PAY_LATER: { category: 'bnpl', signal: 'prior:bnpl-account', confidence: 0.8 },
  SUPERANNUATION: { category: 'super', signal: 'prior:super-account', confidence: 0.8 },
};

/** Normalize a description for recurrence grouping (strip digits/refs). */
function recurrenceKey(txn) {
  return `${txn.accountId}|${txn.description.replace(/[\d/#*-]+/g, '').replace(/\s+/g, ' ').trim().toUpperCase()}`;
}

/**
 * Find recurring credits that look like pay: ≥3 occurrences, amounts within
 * ±2% of the median, median gap 12–16 days (fortnightly) or 27–33 (monthly).
 * Returns a Set of transactionIds carrying the recurrence signal.
 * @param {TwinTransaction[]} transactions
 */
function detectRecurringCredits(transactions) {
  const groups = new Map();
  for (const t of transactions) {
    if (t.amount <= 0) continue;
    const key = recurrenceKey(t);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  const recurring = new Set();
  for (const group of groups.values()) {
    if (group.length < 3) continue;
    const amounts = group.map((t) => t.amount).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    if (!group.every((t) => Math.abs(t.amount - median) <= median * 0.02)) continue;

    const times = group.map((t) => Date.parse(t.postedAt)).sort((a, b) => a - b);
    const gaps = times.slice(1).map((ms, i) => (ms - times[i]) / (24 * 60 * 60 * 1000)).sort((a, b) => a - b);
    const medianGap = gaps[Math.floor(gaps.length / 2)];
    const fortnightly = medianGap >= 12 && medianGap <= 16;
    const monthly = medianGap >= 27 && medianGap <= 33;
    if (fortnightly || monthly) {
      for (const t of group) recurring.add(t.transactionId);
    }
  }
  return recurring;
}

/**
 * Build the per-connection context the rules need: account lookup and the
 * uppercase brand tokens of any BNPL accounts (so "PLATYPAY INSTALMENT" from
 * a transaction account can be tied to the user's actual PlatyPay account).
 * @param {TwinAccount[]} accounts
 */
function buildAccountContext(accounts, rawAccounts = []) {
  const byId = new Map(accounts.map((a) => [a.accountId, a]));
  const bnplBrands = rawAccounts
    .filter((a) => a.productCategory === 'BUY_NOW_PAY_LATER' && a.providerBrand)
    .map((a) => a.providerBrand.toUpperCase());
  return { byId, bnplBrands };
}

/**
 * Categorize one transaction. Pure; all context is passed in.
 * @param {TwinTransaction} txn
 * @param {{ byId: Map<string, TwinAccount>, bnplBrands: string[], recurringIds?: Set<string> }} ctx
 * @returns {CategorizedTxn}
 */
function categorizeTransaction(txn, ctx) {
  const votes = []; // { category, confidence, signal }
  const desc = txn.description || '';
  const account = ctx.byId.get(txn.accountId) || null;

  // 1. Explicit HECS — the only rule allowed to emit 'hecs'.
  for (const rule of HECS_SIGNALS) {
    if (rule.pattern.test(desc)) votes.push({ category: 'hecs', confidence: rule.confidence, signal: rule.signal });
  }
  // ATO payment with no HELP/HECS token: ambiguous by design — see ATO_TOKEN.
  if (ATO_TOKEN.test(desc) && !votes.some((v) => v.category === 'hecs')) {
    votes.push({ category: 'spending', confidence: 0.4, signal: 'ambiguous:ato-non-help' });
  }

  // 2. BNPL: known descriptors, or instalment vocabulary tied to a BNPL
  //    account the user actually holds. Instalment wording alone is only a
  //    weak vote — it must fail safe, not guess.
  for (const rule of BNPL_PATTERNS) {
    if (rule.pattern.test(desc)) votes.push({ category: 'bnpl', confidence: rule.confidence, signal: rule.signal });
  }
  if (INSTALMENT_TOKEN.test(desc)) {
    const upper = desc.toUpperCase();
    const brandMatch = ctx.bnplBrands.some((brand) => upper.includes(brand));
    votes.push(
      brandMatch
        ? { category: 'bnpl', confidence: 0.9, signal: 'bnpl:instalment-with-held-account' }
        : { category: 'bnpl', confidence: 0.5, signal: 'bnpl:instalment-token-only' }
    );
  }

  // 3. Super, income, consumer-debt descriptors.
  for (const rule of SUPER_PATTERNS) {
    if (rule.pattern.test(desc)) votes.push({ category: 'super', confidence: rule.confidence, signal: rule.signal });
  }
  // Income signals only make sense on a transaction account — a recurring
  // credit into a super account is a contribution, into a card a repayment.
  if (txn.amount > 0 && account && account.productCategory === 'TRANS_AND_SAVINGS_ACCOUNTS') {
    for (const rule of INCOME_PATTERNS) {
      if (rule.pattern.test(desc)) votes.push({ category: 'income', confidence: rule.confidence, signal: rule.signal });
    }
    if (ctx.recurringIds && ctx.recurringIds.has(txn.transactionId)) {
      votes.push({ category: 'income', confidence: 0.75, signal: 'income:recurring-credit' });
    }
  }
  for (const rule of DEBT_PATTERNS) {
    if (rule.pattern.test(desc)) votes.push({ category: 'consumer_debt', confidence: rule.confidence, signal: rule.signal });
  }

  // 4. Transfers between the user's own accounts.
  if (TRANSFER_TOKEN.test(desc) && /^TRANSFER_(IN|OUT)/.test(txn.type)) {
    votes.push({ category: 'transfer', confidence: 0.8, signal: 'transfer:own-account' });
  }

  // 5. Account prior.
  if (account && ACCOUNT_PRIORS[account.productCategory]) {
    const prior = ACCOUNT_PRIORS[account.productCategory];
    votes.push({ category: prior.category, confidence: prior.confidence, signal: prior.signal });
  }

  // 6. Plain spending: a debit on a transaction account with no better story.
  if (txn.amount < 0 && account && account.productCategory === 'TRANS_AND_SAVINGS_ACCOUNTS' && votes.length === 0) {
    votes.push({ category: 'spending', confidence: 0.72, signal: 'spending:default-debit' });
  }

  return combineVotes(txn, votes);
}

/**
 * Fold votes into a verdict. Same-category votes corroborate (max + a small
 * bonus per extra signal, capped at 0.98); different categories both above
 * the noise floor CONFLICT and force 'uncertain' — that, plus the threshold,
 * is the fail-safe.
 */
function combineVotes(txn, votes) {
  if (votes.length === 0) {
    return { txnId: txn.transactionId, category: 'uncertain', confidence: 0, uncertain: true, signals: ['no-signal'] };
  }

  const byCategory = new Map();
  for (const vote of votes) {
    if (!byCategory.has(vote.category)) byCategory.set(vote.category, []);
    byCategory.get(vote.category).push(vote);
  }

  const scored = [...byCategory.entries()]
    .map(([category, catVotes]) => ({
      category,
      confidence: Math.min(0.98, Math.max(...catVotes.map((v) => v.confidence)) + 0.05 * (catVotes.length - 1)),
      signals: catVotes.map((v) => v.signal),
    }))
    .sort((a, b) => b.confidence - a.confidence);

  const contenders = scored.filter((s) => s.confidence >= CONFLICT_NOISE_FLOOR);
  const allSignals = scored.flatMap((s) => s.signals);

  if (contenders.length > 1) {
    return {
      txnId: txn.transactionId,
      category: 'uncertain',
      confidence: scored[0].confidence,
      uncertain: true,
      signals: [...allSignals, `conflict:${contenders.map((c) => c.category).join('-vs-')}`],
    };
  }

  const top = scored[0];
  if (top.confidence < CONFIDENCE_THRESHOLD) {
    return { txnId: txn.transactionId, category: 'uncertain', confidence: top.confidence, uncertain: true, signals: [...allSignals, 'below-threshold'] };
  }
  return { txnId: txn.transactionId, category: top.category, confidence: top.confidence, uncertain: false, signals: top.signals };
}

/**
 * Aggregate categorized rows into a summary. Works on fresh results AND on
 * rows re-read from the cdr_transactions table, so the API never needs to
 * re-run categorization just to summarize.
 * @param {Array<{ amount:number, category:string, uncertain:boolean, postedAt:string|Date }>} rows
 * @returns {CategorizedSummary}
 */
function summarizeCategorized(rows) {
  const totalsByCategory = {};
  for (const c of CATEGORIES) totalsByCategory[c] = 0;
  let uncertainCount = 0;
  for (const row of rows) {
    totalsByCategory[row.category] = (totalsByCategory[row.category] || 0) + row.amount;
    if (row.uncertain) uncertainCount += 1;
  }

  // Months spanned by the feed, for rough monthly estimates.
  const times = rows.map((r) => (r.postedAt instanceof Date ? r.postedAt.getTime() : Date.parse(r.postedAt))).filter(Number.isFinite);
  const spanMonths = times.length > 1 ? Math.max(1, (Math.max(...times) - Math.min(...times)) / (30.44 * 24 * 60 * 60 * 1000)) : 1;

  const incomeTotal = rows.reduce((sum, r) => (r.category === 'income' ? sum + r.amount : sum), 0);
  const spendTotal = rows.reduce((sum, r) => (r.category === 'spending' ? sum + Math.abs(r.amount) : sum), 0);

  return {
    totalsByCategory,
    monthlyIncomeEstimate: Math.round(incomeTotal / spanMonths),
    monthlySpendEstimate: Math.round(spendTotal / spanMonths),
    transactionCount: rows.length,
    uncertainCount,
    uncertainRatio: rows.length ? uncertainCount / rows.length : 0,
  };
}

/**
 * Categorize a whole normalized feed and aggregate it.
 * @param {{ accounts: TwinAccount[], transactions: TwinTransaction[], rawAccounts?: Array }} args
 *   rawAccounts (optional) supplies providerBrand for BNPL brand matching —
 *   brands are used for matching only and are never stored or logged.
 * @returns {{ categorized: CategorizedTxn[], summary: CategorizedSummary }}
 */
function categorizeAll({ accounts = [], transactions = [], rawAccounts = [] }) {
  const ctx = buildAccountContext(accounts, rawAccounts);
  ctx.recurringIds = detectRecurringCredits(transactions);

  const categorized = transactions.map((t) => categorizeTransaction(t, ctx));
  const byId = new Map(transactions.map((t) => [t.transactionId, t]));
  const rows = categorized.map((c) => {
    const t = byId.get(c.txnId);
    return { amount: t.amount, category: c.category, uncertain: c.uncertain, postedAt: t.postedAt };
  });

  return { categorized, summary: summarizeCategorized(rows) };
}

module.exports = {
  CATEGORIES,
  CONFIDENCE_THRESHOLD,
  CONFLICT_NOISE_FLOOR,
  RULES_EFFECTIVE_DATE,
  HECS_SIGNALS,
  BNPL_PATTERNS,
  SUPER_PATTERNS,
  INCOME_PATTERNS,
  DEBT_PATTERNS,
  ACCOUNT_PRIORS,
  detectRecurringCredits,
  categorizeTransaction,
  summarizeCategorized,
  categorizeAll,
};
