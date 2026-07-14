import { describe, expect, it } from 'vitest';
import { calculateBasketInflation, calculateSalaryEstimate, estimateIncomeTax } from '../lib/moneyCalculations';
import { DEFAULT_SUPER_RATE, calculateSalaryBreakdown } from '../lib/salaryCalculations';

describe('Money pilot calculations', () => {
  it('uses the 2026–27 resident tax schedule and keeps super outside take-home pay', () => {
    const result = calculateSalaryEstimate({ hourlyRate: 22, hoursPerWeek: 15 });

    expect(result.gross).toBe(17160);
    expect(result.superAmount).toBeCloseTo(2059.2, 5);
    expect(result.netAnnual).toBeGreaterThan(0);
    expect(result.superAmount).not.toBe(result.netAnnual);
    expect(result.calculationVersion).toBe('salary-estimate-v1');
  });

  it('returns zero tax below the tax-free threshold', () => {
    expect(estimateIncomeTax(18_200)).toBe(0);
    expect(estimateIncomeTax(45_000)).toBeCloseTo(4_020, 5);
  });

  it('keeps tax out of the quoted salary package and defaults super to the current SG baseline', () => {
    const result = calculateSalaryBreakdown({ grossSalary: 95_000 });

    expect(DEFAULT_SUPER_RATE).toBe(12);
    expect(result.netPay).toBeLessThan(result.gross);
    expect(result.totalPackage).toBe(106_400);
  });

  it('weights a synthetic basket rather than applying one rate to every item', () => {
    const result = calculateBasketInflation([
      { name: 'Housing', base: 25, change: 6.5 },
      { name: 'Food', base: 75, change: 3.3 },
    ]);

    expect(result.baseTotal).toBe(100);
    expect(result.currentTotal).toBeCloseTo(104.1, 5);
    expect(result.movement).toBeCloseTo(4.1, 5);
  });
});
