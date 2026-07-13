export const MONEY_CONTENT_VERSION = 'money-pilot-v1';
export const SALARY_CALCULATION_VERSION = 'salary-estimate-v1';

export const TAX_YEARS = {
  '2026-27': [
    { threshold: 0, rate: 0, base: 0 },
    { threshold: 18_200, rate: 0.15, base: 0 },
    { threshold: 45_000, rate: 0.30, base: 4_020 },
    { threshold: 135_000, rate: 0.37, base: 31_020 },
    { threshold: 190_000, rate: 0.45, base: 51_370 },
  ],
};

export function estimateIncomeTax(income, year = '2026-27') {
  const taxableIncome = Math.max(0, Number(income) || 0);
  const brackets = TAX_YEARS[year] || TAX_YEARS['2026-27'];
  for (let index = brackets.length - 1; index >= 0; index -= 1) {
    const bracket = brackets[index];
    if (taxableIncome > bracket.threshold) {
      return bracket.base + ((taxableIncome - bracket.threshold) * bracket.rate);
    }
  }
  return 0;
}

export function calculateSalaryEstimate({
  hourlyRate,
  hoursPerWeek,
  weeksPerYear = 52,
  includeMedicare = true,
  superRate = 0.12,
  taxYear = '2026-27',
}) {
  const hourly = Math.max(0, Number(hourlyRate) || 0);
  const hours = Math.max(0, Number(hoursPerWeek) || 0);
  const weeks = Math.max(1, Number(weeksPerYear) || 52);
  const gross = hourly * hours * weeks;
  const incomeTax = estimateIncomeTax(gross, taxYear);
  const medicare = includeMedicare ? gross * 0.02 : 0;
  const superAmount = gross * Math.max(0, Number(superRate) || 0);
  const totalDeductions = incomeTax + medicare;

  return {
    hourlyRate: hourly,
    hoursPerWeek: hours,
    weeksPerYear: weeks,
    gross,
    incomeTax,
    medicare,
    totalDeductions,
    netAnnual: Math.max(0, gross - totalDeductions),
    superAmount,
    taxYear,
    superRate: Number(superRate) || 0,
    calculationVersion: SALARY_CALCULATION_VERSION,
    assumptions: [
      'Australian resident income-tax rates for the selected financial year',
      'Simplified 2% Medicare levy estimate',
      'No deductions, offsets, HELP debt, thresholds or salary packaging',
      'Super estimate uses the supplied rate and is not take-home pay',
    ],
  };
}

export function calculateBasketInflation(items) {
  const rows = (items || []).map((item) => ({
    ...item,
    base: Math.max(0, Number(item.base) || 0),
    change: Number(item.change) || 0,
  }));
  const baseTotal = rows.reduce((sum, item) => sum + item.base, 0);
  const currentTotal = rows.reduce((sum, item) => sum + (item.base * (1 + item.change / 100)), 0);
  const movement = baseTotal > 0 ? ((currentTotal / baseTotal) - 1) * 100 : 0;
  return { rows, baseTotal, currentTotal, movement };
}

