import { describe, it, expect } from 'vitest';

import {
  DEFAULT_TAX_YEAR,
  SG_EMPLOYER_RATE,
  calculateTax,
  compoundGrowth,
  estimateCapitalGains,
  fireProjection,
  formatCurrencyAUD,
  formatWholeCurrencyAUD,
  marginalTaxRate,
  parseNonNegative,
  parsePositive,
  projectSuperBalance,
  rentVsBuyComparison,
  savingsGoalTimeline,
  simulateMinimumPayments,
} from '../pages/tools/toolMath';

// ---------------------------------------------------------------------------
// Input parsing — the hole behind every "$NaN" result. `parseFloat('')` is NaN,
// and `NaN <= 0` is false, so an empty field used to sail straight past the
// tools' `<= 0` validation guards.
// ---------------------------------------------------------------------------

describe('parsePositive / parseNonNegative', () => {
  it.each(['', '   ', 'abc', null, undefined, 'NaN'])('rejects the non-numeric input %p', (value) => {
    expect(parsePositive(value)).toBeNull();
    expect(parseNonNegative(value)).toBeNull();
  });

  it('rejects Infinity rather than letting it through as "finite enough"', () => {
    expect(parsePositive('Infinity')).toBeNull();
    expect(parseNonNegative('Infinity')).toBeNull();
  });

  it('separates zero from "missing": positive rejects it, non-negative keeps it', () => {
    expect(parsePositive('0')).toBeNull();
    expect(parseNonNegative('0')).toBe(0);
  });

  it('accepts ordinary numbers and rejects negatives', () => {
    expect(parsePositive('19.9')).toBeCloseTo(19.9);
    expect(parseNonNegative('19.9')).toBeCloseTo(19.9);
    expect(parsePositive('-1')).toBeNull();
    expect(parseNonNegative('-1')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Locale-stable currency formatting (a European system locale used to render
// "$1.234.567" from the raw `'$' + Intl.NumberFormat(undefined, …)` pattern).
// ---------------------------------------------------------------------------

describe('AUD formatting', () => {
  it('groups with commas and a dot decimal regardless of the host locale', () => {
    expect(formatCurrencyAUD(1234567.5)).toBe('$1,234,567.50');
  });

  it('rounds whole-dollar headline figures without decimals', () => {
    expect(formatWholeCurrencyAUD(1234567.5)).toBe('$1,234,568');
    expect(formatWholeCurrencyAUD(0)).toBe('$0');
  });
});

// ---------------------------------------------------------------------------
// Capital gains — was using the repealed pre-Stage-3 19% / 32.5% brackets.
// ---------------------------------------------------------------------------

describe('estimateCapitalGains', () => {
  it('reports a capital loss instead of a negative tax bill', () => {
    const result = estimateCapitalGains({ purchasePrice: 100000, salePrice: 80000 });
    expect(result.isLoss).toBe(true);
    expect(result.capitalLoss).toBe(20000);
  });

  it('halves the gain when the asset was held over 12 months', () => {
    const held = estimateCapitalGains({ purchasePrice: 100000, salePrice: 200000, otherIncome: 90000, heldOver12m: true });
    const sold = estimateCapitalGains({ purchasePrice: 100000, salePrice: 200000, otherIncome: 90000, heldOver12m: false });
    expect(held.grossGain).toBe(100000);
    expect(held.discountedGain).toBe(50000);
    expect(sold.discountedGain).toBe(100000);
    expect(held.taxOnGain).toBeLessThan(sold.taxOnGain);
  });

  it('taxes the gain on the current-year brackets, not the repealed 32.5% one', () => {
    // $90k other income + a $50k discounted gain lands in the 37% bracket for
    // the part above $135,000 — the old table would have used 37% from $120k
    // and 32.5% below it.
    const result = estimateCapitalGains({ purchasePrice: 100000, salePrice: 200000, otherIncome: 90000 });
    const expected = calculateTax(140000) - calculateTax(90000);
    expect(result.taxOnGain).toBeCloseTo(expected, 6);
    expect(result.marginalRate).toBe(marginalTaxRate(140000));
    expect(result.marginalRate).toBe(0.37);
  });

  it('nets acquisition and disposal costs into the cost base', () => {
    const result = estimateCapitalGains({
      purchasePrice: 100000, salePrice: 150000, purchaseCosts: 5000, saleCosts: 5000, otherIncome: 0,
    });
    expect(result.costBase).toBe(105000);
    expect(result.netProceeds).toBe(145000);
    expect(result.grossGain).toBe(40000);
  });

  it('defaults to the current financial year', () => {
    expect(DEFAULT_TAX_YEAR).toBe('2026-27');
  });
});

// ---------------------------------------------------------------------------
// Superannuation — employer contributions were counted 12x too high because
// `numMonths` (already years × 12) was multiplied by 12 again.
// ---------------------------------------------------------------------------

describe('projectSuperBalance', () => {
  it('defaults the employer rate to the 12% superannuation guarantee', () => {
    expect(SG_EMPLOYER_RATE).toBe(12);
  });

  it('totals employer contributions over the horizon exactly once', () => {
    const result = projectSuperBalance({ salary: 100000, employerRate: 12, years: 10 });
    // 12% of $100k for 10 years = $120,000. The old code reported $1,440,000.
    expect(result.employerTotal).toBeCloseTo(120000, 6);
  });

  it('never reports contributions larger than the projected balance', () => {
    const result = projectSuperBalance({ currentBalance: 50000, salary: 90000, years: 20 });
    expect(result.totalContributions).toBeLessThan(result.futureBalance);
    expect(result.growth).toBeGreaterThan(0);
  });

  it('adds personal contributions once per year, not once per month', () => {
    const result = projectSuperBalance({ salary: 0, personalAnnual: 6000, years: 5, annualReturn: 0 });
    expect(result.personalTotal).toBe(30000);
    expect(result.futureBalance).toBeCloseTo(30000, 6);
  });
});

// ---------------------------------------------------------------------------
// Savings goal — "Infinity months" and negative interest from the ceil'd month
// count.
// ---------------------------------------------------------------------------

describe('savingsGoalTimeline', () => {
  it('reports the goal as unreachable instead of "Infinity months"', () => {
    const result = savingsGoalTimeline({ goal: 10000, current: 0, monthly: 0, annualRate: 3.5 });
    expect(result.reachable).toBe(false);
    expect(result.months).toBeNull();
  });

  it('is also unreachable with savings but no contribution and no growth', () => {
    expect(savingsGoalTimeline({ goal: 10000, current: 500, monthly: 0, annualRate: 0 }).reachable).toBe(false);
  });

  it('never reports negative interest earned', () => {
    // Any ceil'd month count previously overstated contributions against a
    // balance projected for the exact (fractional) time.
    for (const monthly of [50, 137, 999]) {
      const result = savingsGoalTimeline({ goal: 10000, current: 250, monthly, annualRate: 3.5 });
      expect(result.reachable).toBe(true);
      expect(result.interestEarned).toBeGreaterThanOrEqual(0);
    }
  });

  it('reaches at least the goal by the reported month', () => {
    const result = savingsGoalTimeline({ goal: 10000, current: 250, monthly: 200, annualRate: 3.5 });
    expect(result.finalBalance).toBeGreaterThanOrEqual(10000);
    expect(result.years).toBeCloseTo(result.months / 12, 10);
  });

  it('handles a 0% rate with a plain division', () => {
    const result = savingsGoalTimeline({ goal: 10000, current: 1000, monthly: 500, annualRate: 0 });
    expect(result.months).toBe(18);
    expect(result.interestEarned).toBe(0);
  });

  it('returns immediately when the goal is already met', () => {
    const result = savingsGoalTimeline({ goal: 1000, current: 5000, monthly: 100, annualRate: 3 });
    expect(result).toMatchObject({ reachable: true, months: 0, interestEarned: 0 });
  });

  it('can grow to the goal on interest alone when there is a balance to grow', () => {
    const result = savingsGoalTimeline({ goal: 2000, current: 1000, monthly: 0, annualRate: 7 });
    expect(result.reachable).toBe(true);
    expect(result.months).toBeGreaterThan(0);
    expect(Number.isFinite(result.months)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Credit card minimum payments — the loop silently truncated at 1200 months
// and quoted a bogus saving instead of saying the minimum never amortises.
// ---------------------------------------------------------------------------

describe('simulateMinimumPayments', () => {
  it('flags a minimum payment that never clears the balance', () => {
    // A 2% minimum is 24% p.a. of the balance; at a 30% APR it never catches up.
    const result = simulateMinimumPayments({ balance: 20000, annualRate: 30 });
    expect(result.neverAmortizes).toBe(true);
    expect(result.months).toBeNull();
    expect(result.totalPaid).toBeNull();
  });

  it('amortises normally at a typical APR', () => {
    const result = simulateMinimumPayments({ balance: 5000, annualRate: 19.9 });
    expect(result.neverAmortizes).toBe(false);
    expect(result.months).toBeGreaterThan(0);
    expect(result.months).toBeLessThan(1200);
    expect(result.totalInterest).toBeGreaterThan(0);
    expect(result.totalPaid).toBeCloseTo(5000 + result.totalInterest, 6);
  });

  it('does not report a truncated schedule as a completed one', () => {
    const result = simulateMinimumPayments({ balance: 5000, annualRate: 19.9, maxMonths: 3 });
    expect(result.neverAmortizes).toBe(true);
    expect(result.months).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Compound growth — a genuine 0% rate was rejected as invalid input.
// ---------------------------------------------------------------------------

describe('compoundGrowth', () => {
  it('accepts a 0% rate and accumulates linearly', () => {
    const result = compoundGrowth({ principal: 1000, monthly: 100, annualRate: 0, years: 10 });
    expect(result.finalBalance).toBe(13000);
    expect(result.totalContributions).toBe(13000);
    expect(result.interestEarned).toBe(0);
  });

  it('never divides by a zero monthly rate', () => {
    const result = compoundGrowth({ principal: 0, monthly: 500, annualRate: 0, years: 3 });
    expect(Number.isFinite(result.finalBalance)).toBe(true);
    expect(result.finalBalance).toBe(18000);
  });

  it('compounds a positive rate above the contributed total', () => {
    const result = compoundGrowth({ principal: 10000, monthly: 200, annualRate: 7, years: 20 });
    expect(result.finalBalance).toBeGreaterThan(result.totalContributions);
    expect(result.interestEarned).toBeCloseTo(result.finalBalance - result.totalContributions, 6);
  });
});

// ---------------------------------------------------------------------------
// FIRE projection.
// ---------------------------------------------------------------------------

describe('fireProjection', () => {
  it('applies the withdrawal rate to annual expenses', () => {
    const result = fireProjection({ monthlyExpenses: 5000, withdrawalRate: 4 });
    expect(result.annualExpenses).toBe(60000);
    expect(result.fireNumber).toBe(1500000);
    expect(result.remaining).toBe(1500000);
  });

  it('reports zero years once the target is already covered', () => {
    const result = fireProjection({ monthlyExpenses: 1000, withdrawalRate: 4, currentSavings: 500000 });
    expect(result.remaining).toBe(0);
    expect(result.yearsToFIRE).toBe(0);
  });

  it('still answers with a 0% expected return by dividing contributions', () => {
    // The old inline version left yearsToFIRE null in this branch and simply
    // hid the answer.
    const result = fireProjection({
      monthlyExpenses: 1000, withdrawalRate: 4, currentSavings: 0, monthlyContribution: 1000, annualReturn: 0,
    });
    expect(result.fireNumber).toBe(300000);
    expect(result.yearsToFIRE).toBeCloseTo(25, 6);
  });

  it('gets there faster with compounding than without', () => {
    const withReturn = fireProjection({
      monthlyExpenses: 1000, withdrawalRate: 4, monthlyContribution: 1000, annualReturn: 0.07,
    });
    const without = fireProjection({
      monthlyExpenses: 1000, withdrawalRate: 4, monthlyContribution: 1000, annualReturn: 0,
    });
    expect(withReturn.yearsToFIRE).toBeLessThan(without.yearsToFIRE);
    expect(Number.isFinite(withReturn.yearsToFIRE)).toBe(true);
  });

  it('leaves the savings rate null when nothing is being contributed', () => {
    expect(fireProjection({ monthlyExpenses: 4000, withdrawalRate: 4 }).savingsRate).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Rent vs buy — mortgage payments were charged for the whole comparison period
// even after the loan term ended.
// ---------------------------------------------------------------------------

describe('rentVsBuyComparison', () => {
  const base = {
    homePrice: 800000,
    downPaymentPct: 20,
    mortgageRatePct: 6,
    loanTermYears: 30,
    monthlyRent: 2500,
    homeAppreciationPct: 4,
    transferTaxPct: 4,
  };

  it('stops charging mortgage payments once the loan term is over', () => {
    const atTerm = rentVsBuyComparison({ ...base, compareYears: 30 });
    const past = rentVsBuyComparison({ ...base, compareYears: 40 });
    const extraOngoing = base.homePrice * 0.01 * 10;
    // The only extra buying cash-out over the last 10 years is maintenance —
    // no further mortgage instalments.
    expect(past.totalBuyingCashOut - atTerm.totalBuyingCashOut).toBeCloseTo(extraOngoing, 6);
  });

  it('leaves no loan balance outstanding past the term', () => {
    const past = rentVsBuyComparison({ ...base, compareYears: 40 });
    expect(past.equity).toBeCloseTo(past.homeValue, 6);
  });

  it('produces finite figures for an ordinary comparison', () => {
    const result = rentVsBuyComparison({ ...base, compareYears: 10 });
    for (const key of ['monthlyMortgage', 'downPayment', 'totalBuyingCashOut', 'homeValue', 'equity', 'netBuyingCost', 'totalRentingCost', 'diff']) {
      expect(Number.isFinite(result[key])).toBe(true);
    }
    expect(result.downPayment).toBe(160000);
    expect(result.totalRentingCost).toBe(2500 * 120);
    expect(result.buyingWins).toBe(result.diff < 0);
  });

  it('still amortises correctly when the comparison is shorter than the term', () => {
    const result = rentVsBuyComparison({ ...base, compareYears: 5 });
    expect(result.equity).toBeLessThan(result.homeValue);
  });
});
