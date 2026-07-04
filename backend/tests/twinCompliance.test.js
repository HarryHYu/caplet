/**
 * Compliance-language tests for the Financial Twin. Caplet has no AFSL, so
 * every user-facing string must be scenario/comparison framing — never a
 * directive, never a product or provider recommendation. This suite treats
 * that as a correctness requirement equal to the maths (same posture as the
 * guardrail tests in debtEngine.test.js).
 *
 * Scope note: the checks target USER-FACING string fields (summary,
 * disclaimer, message, reason, descriptions shown in the UI). Internal
 * diagnostic `signals` legitimately contain rule-table tokens and are not
 * user copy.
 */

const { runTwinProjection, TWIN_DISCLAIMER } = require('../services/twinProjection');
const { categorizeAll } = require('../services/twinCategorizer');
const { getPersonaData, PERSONAS } = require('../services/cdr/fixtures/personas');
const { normalizeAccounts, normalizeTransactions } = require('../services/cdr');

/** Directive/advice phrasing that must never appear in user-facing output. */
const ADVICE_RE =
  /\byou should\b|\bwe recommend\b|\byou ought\b|\byou need to\b|\bbest (option|choice|strategy)\b|\bswitch to\b|\binvest in\b|\bconsider (paying|switching|moving|buying)\b|\bpay (off|down) .* first\b|\bwe suggest\b/i;

/** Real Australian provider/bank/fund/BNPL names — banned everywhere a user can see. */
const PROVIDER_RE =
  /\bcommbank\b|\bcommonwealth bank\b|\bwestpac\b|\banz\b|\bnab\b|\bing\b|\bmacquarie\b|\bafterpay\b|\bzip pay\b|\bzippay\b|\bzip co\b|\bklarna\b|\bhumm\b|\bpaypal\b|\bvanguard\b|\baustraliansuper\b|\bhostplus\b|\brest super\b|\bhesta\b|\bunisuper\b/i;

const PROFILES = [
  { annualIncome: 85000, hecsBalance: 32000, superBalance: 12000, savingsBalance: 5000 },
  { annualIncome: 45000, hecsBalance: 60000, superBalance: 0, savingsBalance: 0 },
  { annualIncome: 0, hecsBalance: 0, superBalance: 0, savingsBalance: 1000 },
  { annualIncome: 150000, hecsBalance: 5000, superBalance: 90000, savingsBalance: 40000 },
];

describe('projection output language', () => {
  it.each(PROFILES.map((p, i) => [i, p]))('profile %s: no advice phrasing, no provider names, disclaimer present', (_i, profile) => {
    for (const seed of [1, 77]) {
      const r = runTwinProjection({ profile, seed, trials: 100, horizonYears: 20 });
      const userFacing = [r.summary, r.disclaimer].join(' ');
      expect(userFacing).not.toMatch(ADVICE_RE);
      expect(userFacing).not.toMatch(PROVIDER_RE);
      expect(r.disclaimer).toMatch(/not .*advice/i);
      expect(r.disclaimer).toMatch(/not.*(prediction|recommendation)/i);
      expect(r.summary).toMatch(/simulated|scenario/i);
    }
  });

  it('frames output as ranges, not points: the summary never claims a single future', () => {
    const r = runTwinProjection({ profile: PROFILES[0], trials: 100, horizonYears: 20 });
    expect(r.summary).toMatch(/paths|ranges?|scenarios/i);
    expect(r.summary).not.toMatch(/\bwill be\b|\byou will\b|\bguarantee/i);
  });

  it('the twin disclaimer is scenario-framed and constant', () => {
    expect(TWIN_DISCLAIMER).toMatch(/not personal advice/i);
    expect(TWIN_DISCLAIMER).not.toMatch(ADVICE_RE);
  });
});

describe('synthetic fixture hygiene', () => {
  it.each(PERSONAS)('persona %s names no real provider anywhere a user could see', (persona) => {
    const data = getPersonaData(persona);
    for (const account of data.accounts) {
      expect(`${account.displayName} ${account.providerBrand}`).not.toMatch(PROVIDER_RE);
    }
    for (const txn of data.transactions) {
      expect(txn.description).not.toMatch(PROVIDER_RE);
    }
  });
});

describe('categorized output surfaces no advice', () => {
  it('summaries are numbers and flags only — nothing directive to render', () => {
    const data = getPersonaData('grad-hecs-bnpl');
    const { summary } = categorizeAll({
      accounts: normalizeAccounts(data.accounts),
      transactions: normalizeTransactions(data.transactions),
      rawAccounts: data.accounts,
    });
    // Structural: every summary field is numeric — the categorizer cannot
    // smuggle advice because it has no free-text output surface at all.
    expect(Object.keys(summary).sort()).toEqual(
      ['monthlyIncomeEstimate', 'monthlySpendEstimate', 'totalsByCategory', 'transactionCount', 'uncertainCount', 'uncertainRatio'].sort()
    );
    for (const value of Object.values(summary.totalsByCategory)) expect(typeof value).toBe('number');
  });

  it('the engine never ranks or orders products/providers in its output', () => {
    const r = runTwinProjection({ profile: PROFILES[0], trials: 100, horizonYears: 10 });
    // The projection result exposes series keyed by the user's OWN balances —
    // there is no field that names, ranks or scores any external product.
    expect(Object.keys(r.series).sort()).toEqual(['hecsBalance', 'netPosition', 'savingsBalance', 'superBalance'].sort());
  });
});
