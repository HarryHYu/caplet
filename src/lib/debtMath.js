/**
 * debtMath — the frontend (ESM) copy of the standard debt-payoff math.
 *
 * This is the closed-form "months to clear an interest-charging debt at a fixed
 * monthly payment" used by CreditCardPayoff.jsx. It is intentionally identical to
 * `calculateStandardDebtPayoff` in backend/services/debtEngine.js. The two live
 * on opposite sides of the ESM (Vite) / CommonJS (Node) split and cannot share a
 * single import, so they are instead pinned together by STANDARD_PAYOFF_PARITY_CASES
 * below: src/test/debtMath.test.js asserts these cases against this copy, and
 * backend/tests/debtEngine.test.js asserts the same literals against the backend
 * copy. If either implementation drifts, one of the two suites goes red.
 *
 * Pure — no React, no side effects. Values are left unrounded so they match the
 * backend copy bit-for-bit; round only at display time.
 */

/**
 * @param {{ balance:number, annualRate:number, monthlyPayment:number }} args
 *   annualRate is a percentage (e.g. 19.9), not a fraction.
 * @returns {{ months:number, totalPaid:number, totalInterest:number,
 *             monthlyInterestAtStart:number, neverPayoff:boolean }}
 */
export function standardDebtPayoff({ balance, annualRate, monthlyPayment }) {
  const B = Math.max(0, Number(balance) || 0);
  const ratePct = Math.max(0, Number(annualRate) || 0);
  const P = Math.max(0, Number(monthlyPayment) || 0);
  const r = ratePct / 100 / 12; // monthly rate
  const monthlyInterestAtStart = B * r;

  if (B <= 0) {
    return { months: 0, totalPaid: 0, totalInterest: 0, monthlyInterestAtStart: 0, neverPayoff: false };
  }

  // 0% interest (e.g. BNPL): linear payoff, no interest cost.
  if (r === 0) {
    if (P <= 0) {
      return { months: Infinity, totalPaid: Infinity, totalInterest: Infinity, monthlyInterestAtStart: 0, neverPayoff: true };
    }
    return { months: Math.ceil(B / P), totalPaid: B, totalInterest: 0, monthlyInterestAtStart: 0, neverPayoff: false };
  }

  // Payment doesn't cover the first month's interest → never pays off.
  if (P <= monthlyInterestAtStart) {
    return { months: Infinity, totalPaid: Infinity, totalInterest: Infinity, monthlyInterestAtStart, neverPayoff: true };
  }

  const months = Math.ceil(-Math.log(1 - (B * r) / P) / Math.log(1 + r));
  const totalPaid = P * months;
  const totalInterest = totalPaid - B;
  return { months, totalPaid, totalInterest, monthlyInterestAtStart, neverPayoff: false };
}

/**
 * Shared drift-guard vectors. Kept identical (by hand) to the array of the same
 * name in backend/services/debtEngine.js.
 */
export const STANDARD_PAYOFF_PARITY_CASES = [
  { input: { balance: 5000, annualRate: 19.99, monthlyPayment: 200 }, expected: { months: 33, totalPaid: 6600, totalInterest: 1600, neverPayoff: false } },
  { input: { balance: 12000, annualRate: 6.5, monthlyPayment: 400 }, expected: { months: 33, totalPaid: 13200, totalInterest: 1200, neverPayoff: false } },
  { input: { balance: 1200, annualRate: 0, monthlyPayment: 100 }, expected: { months: 12, totalPaid: 1200, totalInterest: 0, neverPayoff: false } },
  { input: { balance: 3000, annualRate: 24, monthlyPayment: 50 }, expected: { neverPayoff: true } },
];
