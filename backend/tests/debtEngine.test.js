const {
  HECS_REPAYMENT_BANDS,
  DEFAULT_INDEXATION_RATE,
  STANDARD_PAYOFF_PARITY_CASES,
  hecsCompulsoryRepayment,
  calculateHecsProjection,
  calculateStandardDebtPayoff,
  sequenceDebts,
} = require('../services/debtEngine');

describe('hecsCompulsoryRepayment (2025-26 marginal bands)', () => {
  it('is nil below the first threshold and exactly on it', () => {
    expect(hecsCompulsoryRepayment(0)).toBe(0);
    expect(hecsCompulsoryRepayment(66999)).toBe(0);
    // Boundary: exactly $67,000 → nothing is "above" the threshold → 0.
    expect(hecsCompulsoryRepayment(67000)).toBe(0);
  });

  it('applies 15% only to the portion inside the $67k–$125k band', () => {
    // $100,000 → 15% of (100,000 - 67,000) = 15% of 33,000 = 4,950.
    expect(hecsCompulsoryRepayment(100000)).toBe(4950);
    // Boundary: exactly $125,000 → 15% of the full 58,000 band = 8,700, no 17%.
    expect(hecsCompulsoryRepayment(125000)).toBe(8700);
    expect(hecsCompulsoryRepayment(125001)).toBe(8700); // 17% of $1 rounds to 0
  });

  it('adds 17% marginally above $125k (never a flat rate on whole income)', () => {
    // $150,000 → 8,700 + 17% of 25,000 = 8,700 + 4,250 = 12,950.
    expect(hecsCompulsoryRepayment(150000)).toBe(12950);
    // Sanity that it is MARGINAL, not flat: a flat 17% of 150k would be 25,500.
    expect(hecsCompulsoryRepayment(150000)).toBeLessThan(0.17 * 150000);
  });

  it('exposes a data-driven band table with the documented thresholds', () => {
    expect(HECS_REPAYMENT_BANDS.map((b) => b.min)).toEqual([0, 67000, 125000]);
    expect(HECS_REPAYMENT_BANDS.map((b) => b.rate)).toEqual([0, 0.15, 0.17]);
  });
});

describe('calculateStandardDebtPayoff', () => {
  it('handles a 0% (BNPL) debt with a linear payoff and no interest', () => {
    const r = calculateStandardDebtPayoff({ balance: 1200, annualRate: 0, monthlyPayment: 100 });
    expect(r).toMatchObject({ months: 12, totalPaid: 1200, totalInterest: 0, neverPayoff: false });
  });

  it('flags a payment too small to cover interest as neverPayoff', () => {
    const r = calculateStandardDebtPayoff({ balance: 3000, annualRate: 24, monthlyPayment: 50 });
    expect(r.neverPayoff).toBe(true);
    expect(r.months).toBe(Infinity);
  });

  it('reproduces the frontend parity vectors exactly (drift guard)', () => {
    // These same input→output pairs are asserted by src/test/debtMath.test.js
    // against the ESM copy in src/lib/debtMath.js. If either implementation
    // drifts, one of the two suites fails.
    for (const { input, expected } of STANDARD_PAYOFF_PARITY_CASES) {
      const r = calculateStandardDebtPayoff(input);
      expect(r).toMatchObject(expected);
    }
  });
});

describe('calculateHecsProjection', () => {
  it('grows by indexation AFTER repayments, once per year (not monthly)', () => {
    const p = calculateHecsProjection({ balance: 50000, repaymentIncome: 90000, indexationRate: 0.032, years: 1 });
    // 90k income → compulsory 3,450. (50,000 - 3,450) = 46,550 indexed 3.2% = 1,490.
    expect(p.compulsoryRepayment).toBe(3450);
    expect(p.projection[0].indexationApplied).toBe(1490);
    expect(p.projectedBalanceAfterIndexation).toBe(48040);
  });

  it('never drives the balance below zero', () => {
    const p = calculateHecsProjection({ balance: 1000, repaymentIncome: 200000, indexationRate: 0.05, voluntaryAnnual: 5000, years: 3 });
    p.projection.forEach((row) => expect(row.closingBalance).toBeGreaterThanOrEqual(0));
  });
});

describe('sequenceDebts', () => {
  it('ranks non-HECS debts avalanche-style (highest rate first)', () => {
    const res = sequenceDebts({
      debts: [
        { label: 'Card B', balance: 5000, rate: 14 },
        { label: 'Card A', balance: 2000, rate: 22 },
      ],
      hecsProfile: null,
    });
    expect(res.standardRanking.map((d) => d.label)).toEqual(['Card A', 'Card B']);
    expect(res.hecs).toBeNull();
    // Cost comparison, not a directive.
    expect(res.summary).toMatch(/costs the most/i);
    expect(res.summary).not.toMatch(/you should/i);
  });

  it('handles a user with ONLY HECS (worthConsidering is null → "depends")', () => {
    const res = sequenceDebts({
      debts: [],
      hecsProfile: { balance: 30000, repaymentIncome: 60000, indexationRate: 0.035 },
    });
    expect(res.standardRanking).toHaveLength(0);
    expect(res.hecs).not.toBeNull();
    expect(res.hecs.worthConsidering).toBeNull();
    expect(res.hecs.indexationPct).toBe(3.5); // no float noise
    expect(res.hecs.message).toMatch(/comparison, not a recommendation/i);
  });

  it('handles a user with ONLY non-HECS debt', () => {
    const res = sequenceDebts({
      debts: [{ label: 'Visa', balance: 3000, rate: 19.9, type: 'credit_card' }],
      hecsProfile: null,
    });
    expect(res.order).toHaveLength(1);
    expect(res.order[0]).toMatchObject({ kind: 'standard', label: 'Visa' });
  });

  it('handles a user with BOTH: HECS reported separately, real debt ranked first', () => {
    const res = sequenceDebts({
      debts: [{ label: 'Visa', balance: 3000, rate: 19.9, type: 'credit_card' }],
      hecsProfile: { balance: 25000, repaymentIncome: 85000, indexationRate: 0.032 },
      extraMonthlyAmount: 400,
    });
    // Every real debt (19.9%) costs more than 3.2% indexation → HECS not worth it.
    expect(res.hecs.worthConsidering).toBe(false);
    expect(res.order[0]).toMatchObject({ kind: 'standard', label: 'Visa' });
    expect(res.order[res.order.length - 1].kind).toBe('hecs');
    expect(res.extraMonthlyAmount).toBe(400);
  });

  it('flips: when the cheapest real debt is below indexation, HECS is worth considering and rises above it', () => {
    const res = sequenceDebts({
      debts: [{ label: 'Family loan', balance: 8000, rate: 1, type: 'personal_loan' }],
      hecsProfile: { balance: 20000, repaymentIncome: 70000, indexationRate: 0.032 },
    });
    expect(res.hecs.worthConsidering).toBe(true);
    // HECS (3.2%) sits above the 1% loan in the spare-money order.
    const kinds = res.order.map((o) => o.kind);
    expect(kinds.indexOf('hecs')).toBeLessThan(kinds.indexOf('standard'));
  });

  it('handles ZERO debts', () => {
    const res = sequenceDebts({ debts: [], hecsProfile: null });
    expect(res.order).toEqual([]);
    expect(res.standardRanking).toEqual([]);
    expect(res.hecs).toBeNull();
    expect(res.summary).toMatch(/no debts/i);
  });

  it('never emits a directive or a product/provider name', () => {
    const res = sequenceDebts({
      debts: [{ label: 'Visa', balance: 3000, rate: 19.9, type: 'credit_card' }, { label: 'Afterpay', balance: 600, rate: 0, type: 'bnpl' }],
      hecsProfile: { balance: 25000, repaymentIncome: 85000, indexationRate: 0.032 },
    });
    const allText = JSON.stringify(res);
    // Cost-comparison framing, never instruction.
    expect(allText).not.toMatch(/you should|we recommend|pay off .* first!|invest in/i);
    // The only proper nouns are user-supplied labels; the engine adds none.
    // (Guard against a stray bank/fund name creeping into a template.)
    expect(allText).not.toMatch(/Commonwealth|Westpac|Vanguard|NAB Bank|Betashares/i);
  });

  it('ignores malformed debt rows and zero-balance debts', () => {
    const res = sequenceDebts({
      debts: [null, 42, { label: 'Paid off', balance: 0, rate: 20 }, { label: 'Real', balance: 1000, rate: 10 }],
      hecsProfile: null,
    });
    expect(res.standardRanking.map((d) => d.label)).toEqual(['Real']);
  });

  it('defaults an unknown debt type to "other"', () => {
    const res = sequenceDebts({ debts: [{ label: 'X', balance: 500, rate: 5, type: 'wat' }], hecsProfile: null });
    expect(res.standardRanking[0].type).toBe('other');
  });
});

describe('module constants', () => {
  it('defaults indexation to the documented 3.2%', () => {
    expect(DEFAULT_INDEXATION_RATE).toBe(0.032);
  });
});
