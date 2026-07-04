/**
 * Adversarial categorization tests. The categorizer's contract is FAIL SAFE:
 * these tests actively try to trick it into a confident miscategorization —
 * the acceptable outcomes are "right" or "uncertain", never "confidently
 * wrong". The HECS-vs-consumer-debt separation is treated as a correctness
 * requirement equal to the maths.
 */

const {
  CATEGORIES,
  CONFIDENCE_THRESHOLD,
  RULES_EFFECTIVE_DATE,
  categorizeAll,
  summarizeCategorized,
  detectRecurringCredits,
} = require('../services/twinCategorizer');
const { getPersonaData } = require('../services/cdr/fixtures/personas');
const { normalizeAccounts, normalizeTransactions } = require('../services/cdr');

/** Categorize one description in a plain transaction-account context. */
function categorizeOne({ description, amount = -100, type = 'PAYMENT', bnplBrand = null }) {
  const accounts = [
    { accountId: 'acc-1', productCategory: 'TRANS_AND_SAVINGS_ACCOUNTS', displayName: 'Everyday', balance: 1000 },
  ];
  const rawAccounts = bnplBrand
    ? [{ accountId: 'acc-2', productCategory: 'BUY_NOW_PAY_LATER', providerBrand: bnplBrand }]
    : [];
  const transactions = [
    { transactionId: 't-1', accountId: 'acc-1', description, amount, postedAt: '2026-06-01T00:00:00.000Z', merchantCategoryCode: null, type },
  ];
  const { categorized } = categorizeAll({ accounts, transactions, rawAccounts });
  return categorized[0];
}

describe('HECS separation (the non-negotiable)', () => {
  it('recognises explicit ATO HELP/HECS descriptors', () => {
    expect(categorizeOne({ description: 'BPAY ATO HELP VOLUNTARY PAYMENT' }).category).toBe('hecs');
    expect(categorizeOne({ description: 'ATO HECS-HELP PAYMENT' }).category).toBe('hecs');
    expect(categorizeOne({ description: 'HELP REPAYMENT TO ATO' }).category).toBe('hecs');
  });

  it('is NOT fooled by a café on Help St', () => {
    const r = categorizeOne({ description: 'HELP ST ESPRESSO' });
    expect(r.category).not.toBe('hecs');
  });

  it('is NOT fooled by a merchant name containing the letters HECS', () => {
    const r = categorizeOne({ description: 'HECSTATIC HAIR STUDIO' });
    expect(r.category).not.toBe('hecs');
  });

  it('flags an ATO payment with no HELP token as uncertain — never hecs, never confident spending', () => {
    const r = categorizeOne({ description: 'ATO PAYMENT PLAN 004521', type: 'DIRECT_DEBIT' });
    expect(r.category).toBe('uncertain');
    expect(r.uncertain).toBe(true);
    expect(r.signals).toContain('ambiguous:ato-non-help');
  });

  it('never emits hecs without an explicit HECS signal, across every persona', () => {
    for (const persona of ['grad-hecs-bnpl', 'messy-merchants', 'partial-data']) {
      const data = getPersonaData(persona);
      const accounts = normalizeAccounts(data.accounts);
      const transactions = normalizeTransactions(data.transactions);
      const { categorized } = categorizeAll({ accounts, transactions, rawAccounts: data.accounts });
      for (const c of categorized) {
        if (c.category === 'hecs') {
          expect(c.signals.some((s) => s.startsWith('hecs:'))).toBe(true);
        }
      }
    }
  });

  it('keeps hecs and consumer_debt disjoint — no transaction carries signals from both', () => {
    const data = getPersonaData('messy-merchants');
    const { categorized } = categorizeAll({
      accounts: normalizeAccounts(data.accounts),
      transactions: normalizeTransactions(data.transactions),
      rawAccounts: data.accounts,
    });
    for (const c of categorized) {
      const hasHecs = c.signals.some((s) => s.startsWith('hecs:'));
      const hasDebt = c.signals.some((s) => s.startsWith('consumer_debt:') || s.startsWith('prior:card') || s.startsWith('prior:loan'));
      expect(hasHecs && hasDebt).toBe(false);
    }
  });
});

describe('BNPL adversarial cases', () => {
  it('ties instalment wording to a BNPL account the user actually holds', () => {
    const r = categorizeOne({ description: 'PLATYPAY INSTALMENT 2/4', type: 'DIRECT_DEBIT', bnplBrand: 'PlatyPay' });
    expect(r.category).toBe('bnpl');
    expect(r.uncertain).toBe(false);
  });

  it('recognises known BNPL descriptors even without a linked account', () => {
    expect(categorizeOne({ description: 'AFTERPAY PAYMENT SYDNEY' }).category).toBe('bnpl');
    expect(categorizeOne({ description: 'ZIP PAY REPAYMENT' }).category).toBe('bnpl');
  });

  it('does NOT call a gym instalment plan BNPL (or confident spending) — fails safe', () => {
    const r = categorizeOne({ description: 'GYMLIFE INSTALMENT PLAN', type: 'DIRECT_DEBIT' });
    expect(r.category).toBe('uncertain');
    expect(r.signals).toContain('bnpl:instalment-token-only');
  });

  it('is NOT fooled by a zipline tour', () => {
    const r = categorizeOne({ description: 'PAYPORTAL *ZIPLINE ADVENTURE CAIRNS' });
    expect(r.category).not.toBe('bnpl');
  });
});

describe('super and income adversarial cases', () => {
  it('is NOT fooled by SUPA in a retailer name', () => {
    const r = categorizeOne({ description: 'SUPA CHEAP AUTO PARTS' });
    expect(r.category).not.toBe('super');
  });

  it('categorizes SG contributions on a super account as super, not income, despite being recurring credits', () => {
    const data = getPersonaData('grad-hecs-bnpl');
    const { categorized } = categorizeAll({
      accounts: normalizeAccounts(data.accounts),
      transactions: normalizeTransactions(data.transactions),
      rawAccounts: data.accounts,
    });
    const txns = normalizeTransactions(data.transactions);
    const sgRows = categorized.filter((c) => {
      const t = txns.find((x) => x.transactionId === c.txnId);
      return t.description.includes('SG CONTRIBUTION');
    });
    expect(sgRows.length).toBeGreaterThan(0);
    for (const row of sgRows) {
      expect(row.category).toBe('super');
      expect(row.uncertain).toBe(false);
    }
  });

  it('detects an unlabelled fortnightly recurring credit as income', () => {
    const accounts = [{ accountId: 'acc-1', productCategory: 'TRANS_AND_SAVINGS_ACCOUNTS', displayName: 'x', balance: 0 }];
    const transactions = [0, 14, 28, 42].map((d, i) => ({
      transactionId: `t-${i}`,
      accountId: 'acc-1',
      description: 'EMPLOYER DEPOSIT REF 88', // no SALARY/WAGES token
      amount: 2500,
      postedAt: new Date(Date.parse('2026-06-01T00:00:00.000Z') - d * 86400000).toISOString(),
      merchantCategoryCode: null,
      type: 'TRANSFER_INCOMING',
    }));
    const { categorized } = categorizeAll({ accounts, transactions });
    for (const c of categorized) {
      expect(c.category).toBe('income');
      expect(c.signals).toContain('income:recurring-credit');
    }
  });

  it('does NOT let irregular casual credits trigger the recurrence signal', () => {
    const transactions = [
      { amount: 412, daysAgo: 5 },
      { amount: 287, daysAgo: 16 },
      { amount: 553, daysAgo: 24 },
      { amount: 311, daysAgo: 41 },
    ].map((s, i) => ({
      transactionId: `t-${i}`,
      accountId: 'acc-1',
      description: 'CASUAL SHIFT PAYOUT',
      amount: s.amount,
      postedAt: new Date(Date.parse('2026-06-01T00:00:00.000Z') - s.daysAgo * 86400000).toISOString(),
      merchantCategoryCode: null,
      type: 'TRANSFER_INCOMING',
    }));
    expect(detectRecurringCredits(transactions).size).toBe(0);
  });
});

describe('fail-safe mechanics', () => {
  it('forces uncertain when strong signals conflict, regardless of confidence', () => {
    const r = categorizeOne({ description: 'ATO HELP SUPERANNUATION SWEEP' });
    expect(r.category).toBe('uncertain');
    expect(r.signals.some((s) => s.startsWith('conflict:'))).toBe(true);
  });

  it('flags no-signal transactions (credits with no story) as uncertain', () => {
    const r = categorizeOne({ description: 'REF 20260601-88412', amount: 250, type: 'TRANSFER_INCOMING' });
    expect(r.category).toBe('uncertain');
  });

  it('is deterministic — identical input, identical output', () => {
    const data = getPersonaData('messy-merchants');
    const input = {
      accounts: normalizeAccounts(data.accounts),
      transactions: normalizeTransactions(data.transactions),
      rawAccounts: data.accounts,
    };
    expect(categorizeAll(input)).toEqual(categorizeAll(input));
  });

  it('the messy-merchants persona produces uncertain rows (the traps are actually trapping)', () => {
    const data = getPersonaData('messy-merchants');
    const { summary } = categorizeAll({
      accounts: normalizeAccounts(data.accounts),
      transactions: normalizeTransactions(data.transactions),
      rawAccounts: data.accounts,
    });
    expect(summary.uncertainCount).toBeGreaterThan(0);
    expect(summary.uncertainRatio).toBeLessThan(0.5); // …but it isn't giving up on everything
  });
});

describe('module constants (drift guard)', () => {
  it('pins the category list and threshold', () => {
    expect(CATEGORIES).toEqual(['income', 'hecs', 'bnpl', 'consumer_debt', 'super', 'transfer', 'spending', 'uncertain']);
    expect(CONFIDENCE_THRESHOLD).toBe(0.7);
  });

  it('rule tables carry a dated review stamp', () => {
    expect(RULES_EFFECTIVE_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('summarizeCategorized excludes nothing from totals but counts uncertain separately', () => {
    const rows = [
      { amount: 100, category: 'income', uncertain: false, postedAt: '2026-01-01T00:00:00.000Z' },
      { amount: -40, category: 'uncertain', uncertain: true, postedAt: '2026-03-01T00:00:00.000Z' },
    ];
    const s = summarizeCategorized(rows);
    expect(s.totalsByCategory.income).toBe(100);
    expect(s.totalsByCategory.uncertain).toBe(-40);
    expect(s.uncertainCount).toBe(1);
    expect(s.transactionCount).toBe(2);
  });
});
