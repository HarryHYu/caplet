import { calculateTax } from '../pages/tools/TaxCalculator';

export const DEFAULT_SUPER_RATE = 12;

export function calculateSalaryBreakdown({ grossSalary, superRate = DEFAULT_SUPER_RATE, includeMedicare = true }) {
  const gross = Number(grossSalary);
  const parsedSuperRate = Number(superRate);

  if (!Number.isFinite(gross) || gross <= 0) {
    return { error: 'Please enter a valid gross salary.' };
  }
  if (!Number.isFinite(parsedSuperRate) || parsedSuperRate < 0 || parsedSuperRate > 20) {
    return { error: 'Please enter a superannuation rate between 0% and 20%.' };
  }

  const superAmount = gross * (parsedSuperRate / 100);
  const incomeTax = calculateTax(gross);
  const medicare = includeMedicare ? gross * 0.02 : 0;
  const totalTax = incomeTax + medicare;

  return {
    gross,
    superAmount,
    incomeTax,
    medicare,
    totalTax,
    netPay: gross - totalTax,
    totalPackage: gross + superAmount,
    superRate: parsedSuperRate,
  };
}
