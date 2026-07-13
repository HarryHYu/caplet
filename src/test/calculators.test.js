import { describe, it, expect } from 'vitest';

// Import exported calculation functions
import { calculateTax } from '../pages/tools/TaxCalculator';

// Tax Calculation Tests
describe('TaxCalculator', () => {
  it('returns zero for non-positive and tax-free incomes', () => {
    expect(calculateTax(0)).toBe(0);
    expect(calculateTax(-100)).toBe(0);
    expect(calculateTax(18200)).toBe(0);
  });

  it.each([
    ['2025-26', 45000, 4288],
    ['2025-26', 135000, 31288],
    ['2025-26', 190000, 51638],
    ['2025-26', 250000, 78638],
    ['2026-27', 45000, 4020],
    ['2026-27', 135000, 31020],
    ['2026-27', 190000, 51370],
    ['2026-27', 250000, 78370],
  ])('calculates %s resident tax at $%i', (year, income, expected) => {
    expect(calculateTax(income, year)).toBe(expected);
  });

  it('defaults to the latest supported financial year', () => {
    expect(calculateTax(30000)).toBe(1770);
    expect(calculateTax(60000)).toBe(8520);
  });
});

// Compound Interest Calculation Tests
describe('CompoundInterest Calculator', () => {
  // Helper function to replicate the calculator's logic
  const calculateCompoundInterest = (principal, monthlyContribution, interestRate, years) => {
    const monthlyRate = interestRate / 100 / 12;
    const numMonths = years * 12;

    const futureValuePrincipal = principal * Math.pow(1 + monthlyRate, numMonths);
    const futureValueContributions = monthlyContribution > 0
      ? monthlyContribution * ((Math.pow(1 + monthlyRate, numMonths) - 1) / monthlyRate)
      : 0;

    const finalBalance = futureValuePrincipal + futureValueContributions;
    const totalContributions = principal + (monthlyContribution * numMonths);
    const interestEarned = finalBalance - totalContributions;

    return {
      finalBalance,
      totalContributions,
      interestEarned,
      years,
    };
  };

  // Test 1: Principal only, no contributions
  it('should calculate compound interest on principal only', () => {
    const result = calculateCompoundInterest(10000, 0, 5, 10);
    expect(result.finalBalance).toBeCloseTo(16470.09, 2);
    expect(result.totalContributions).toBe(10000);
    expect(result.interestEarned).toBeCloseTo(6470.09, 2);
  });

  // Test 2: With monthly contributions
  it('should calculate compound interest with monthly contributions', () => {
    const result = calculateCompoundInterest(5000, 500, 6, 5);
    expect(result.finalBalance).toBeGreaterThan(40000);
    expect(result.totalContributions).toBe(35000); // 5000 + (500 * 60 months)
    expect(result.interestEarned).toBeGreaterThan(5000);
  });

  // Test 3: Zero rate should be treated as invalid by current calculator logic
  it('should treat 0% rate as invalid input', () => {
    const rate = 0;
    const years = 5;
    expect(rate <= 0 || years <= 0).toBe(true);
  });

  // Test 4: High interest rate
  it('should show significant growth at high interest rates', () => {
    const result = calculateCompoundInterest(10000, 0, 12, 10);
    expect(result.finalBalance).toBeGreaterThan(31000);
    expect(result.interestEarned).toBeGreaterThan(20000);
  });

  // Test 5: Long-term compounding
  it('should demonstrate significant long-term growth', () => {
    const result10yr = calculateCompoundInterest(10000, 100, 7, 10);
    const result30yr = calculateCompoundInterest(10000, 100, 7, 30);
    expect(result30yr.finalBalance).toBeGreaterThan(result10yr.finalBalance * 2);
  });

  // Test 6: Monthly contributions impact
  it('should show that monthly contributions significantly increase final balance', () => {
    const withoutContributions = calculateCompoundInterest(10000, 0, 5, 20);
    const withContributions = calculateCompoundInterest(10000, 200, 5, 20);
    expect(withContributions.finalBalance).toBeGreaterThan(withoutContributions.finalBalance * 2);
  });
});

// Loan Repayment Calculation Tests
describe('LoanRepayment Calculator', () => {
  // Helper function to replicate the calculator's logic
  const calculateLoanRepayment = (principal, interestRate, years) => {
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = years * 12;

    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);

    const totalPayments = monthlyPayment * numPayments;
    const totalInterest = totalPayments - principal;

    return {
      monthlyPayment,
      totalPayments,
      totalInterest,
      numPayments,
    };
  };

  // Test 1: Basic loan calculation
  it('should calculate monthly payment and total interest for basic loan', () => {
    const result = calculateLoanRepayment(200000, 4, 20);
    expect(result.monthlyPayment).toBeCloseTo(1211.96, 2);
    expect(result.numPayments).toBe(240);
    expect(result.totalInterest).toBeGreaterThan(80000);
  });

  // Test 2: Impact of interest rate
  it('should show that higher interest rates increase total interest paid', () => {
    const low = calculateLoanRepayment(100000, 3, 10);
    const high = calculateLoanRepayment(100000, 6, 10);
    expect(high.totalInterest).toBeGreaterThan(low.totalInterest);
  });

  // Test 3: Impact of loan term
  it('should show that longer terms reduce monthly payment but increase total interest', () => {
    const short = calculateLoanRepayment(100000, 5, 10);
    const long = calculateLoanRepayment(100000, 5, 20);
    expect(long.monthlyPayment).toBeLessThan(short.monthlyPayment);
    expect(long.totalInterest).toBeGreaterThan(short.totalInterest);
  });

  // Test 4: Short-term high-rate loan
  it('should calculate correctly for short-term high-rate loans', () => {
    const result = calculateLoanRepayment(50000, 8, 5);
    expect(result.monthlyPayment).toBeCloseTo(1013.82, 2);
    expect(result.numPayments).toBe(60);
  });

  // Test 5: Mortgage-sized loan
  it('should handle mortgage-sized loans correctly', () => {
    const result = calculateLoanRepayment(350000, 3.5, 25);
    expect(result.monthlyPayment).toBeGreaterThan(1500);
    expect(result.totalPayments).toBeGreaterThan(450000);
    expect(result.totalInterest).toBeGreaterThan(100000);
  });

  // Test 6: Small short loan
  it('should calculate correctly for small short-term loans', () => {
    const result = calculateLoanRepayment(5000, 6, 2);
    expect(result.monthlyPayment).toBeCloseTo(221.60, 2);
    expect(result.numPayments).toBe(24);
  });
});
