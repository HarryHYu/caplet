import { describe, it, expect } from 'vitest';
import { standardDebtPayoff, STANDARD_PAYOFF_PARITY_CASES } from '../lib/debtMath';

describe('standardDebtPayoff', () => {
  it('reproduces the shared parity vectors exactly (drift guard vs backend engine)', () => {
    // The same input→output pairs are asserted by backend/tests/debtEngine.test.js
    // against calculateStandardDebtPayoff in backend/services/debtEngine.js. These
    // two suites are what keep the ESM and CommonJS copies from drifting.
    for (const { input, expected } of STANDARD_PAYOFF_PARITY_CASES) {
      expect(standardDebtPayoff(input)).toMatchObject(expected);
    }
  });

  it('matches the closed-form the CreditCardPayoff component relied on', () => {
    // 5,000 @ 19.9% APR, $150/mo — recomputed from the raw formula.
    const B = 5000;
    const r = 19.9 / 100 / 12;
    const P = 150;
    const months = Math.ceil(-Math.log(1 - (B * r) / P) / Math.log(1 + r));
    const res = standardDebtPayoff({ balance: B, annualRate: 19.9, monthlyPayment: P });
    expect(res.months).toBe(months);
    expect(res.totalPaid).toBe(P * months);
    expect(res.totalInterest).toBe(P * months - B);
    expect(res.neverPayoff).toBe(false);
  });

  it('treats a 0% balance as a linear, interest-free payoff', () => {
    expect(standardDebtPayoff({ balance: 1200, annualRate: 0, monthlyPayment: 100 })).toMatchObject({
      months: 12,
      totalPaid: 1200,
      totalInterest: 0,
      neverPayoff: false,
    });
  });

  it('flags a payment that cannot cover interest', () => {
    expect(standardDebtPayoff({ balance: 3000, annualRate: 24, monthlyPayment: 50 }).neverPayoff).toBe(true);
  });
});
