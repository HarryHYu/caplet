// Pure calculation helpers shared by the Money tools.
//
// Every function here is side-effect free so the maths can be unit tested
// directly (see src/test/toolMath.test.js). Components should parse and
// validate their inputs with the parse helpers below, then delegate the
// arithmetic to these functions instead of re-implementing it inline.

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Locale-stable AUD formatter. Always uses en-AU so "$1,234,567" never
 * becomes "$1.234.567" for visitors with a European system locale.
 */
export const formatCurrencyAUD = (value, options = {}) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', ...options }).format(value);

/** Whole-dollar AUD formatting for large headline figures. */
export const formatWholeCurrencyAUD = (value) =>
  formatCurrencyAUD(Math.round(value), { minimumFractionDigits: 0, maximumFractionDigits: 0 });

// ---------------------------------------------------------------------------
// Input parsing / validation
// ---------------------------------------------------------------------------

/** Parses a form value; returns the number only when finite and > 0, else null. */
export function parsePositive(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Parses a form value; returns the number only when finite and >= 0, else null. */
export function parseNonNegative(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

// ---------------------------------------------------------------------------
// Australian resident income tax (shared by TaxCalculator and CapitalGains)
// ---------------------------------------------------------------------------

export const TAX_YEARS = {
  '2025-26': {
    label: '2025–26',
    brackets: [
      { threshold: 0, rate: 0, base: 0 },
      { threshold: 18200, rate: 0.16, base: 0 },
      { threshold: 45000, rate: 0.30, base: 4288 },
      { threshold: 135000, rate: 0.37, base: 31288 },
      { threshold: 190000, rate: 0.45, base: 51638 },
    ],
  },
  '2026-27': {
    label: '2026–27',
    brackets: [
      { threshold: 0, rate: 0, base: 0 },
      { threshold: 18200, rate: 0.15, base: 0 },
      { threshold: 45000, rate: 0.30, base: 4020 },
      { threshold: 135000, rate: 0.37, base: 31020 },
      { threshold: 190000, rate: 0.45, base: 51370 },
    ],
  },
};

export const DEFAULT_TAX_YEAR = '2026-27';

export const calculateTax = (income, year = DEFAULT_TAX_YEAR) => {
  if (!income || income <= 0) return 0;

  const brackets = TAX_YEARS[year]?.brackets || TAX_YEARS[DEFAULT_TAX_YEAR].brackets;
  let tax = 0;
  for (let i = brackets.length - 1; i >= 0; i -= 1) {
    const bracket = brackets[i];
    if (income > bracket.threshold) {
      tax = bracket.base + (income - bracket.threshold) * bracket.rate;
      break;
    }
  }
  return tax;
};

/** Marginal rate for a taxable income under the given (current) year's brackets. */
export function marginalTaxRate(taxableIncome, year = DEFAULT_TAX_YEAR) {
  const brackets = TAX_YEARS[year]?.brackets || TAX_YEARS[DEFAULT_TAX_YEAR].brackets;
  let rate = 0;
  for (const bracket of brackets) {
    if (taxableIncome > bracket.threshold) rate = bracket.rate;
  }
  return rate;
}

// ---------------------------------------------------------------------------
// Capital gains (uses the current-year resident brackets above)
// ---------------------------------------------------------------------------

export function estimateCapitalGains({
  purchasePrice,
  salePrice,
  purchaseCosts = 0,
  saleCosts = 0,
  otherIncome = 0,
  heldOver12m = true,
  year = DEFAULT_TAX_YEAR,
}) {
  const costBase = purchasePrice + purchaseCosts;
  const netProceeds = salePrice - saleCosts;
  const grossGain = netProceeds - costBase;

  if (grossGain <= 0) {
    return { isLoss: true, capitalLoss: Math.abs(grossGain), costBase, netProceeds };
  }

  const discountedGain = heldOver12m ? grossGain * 0.5 : grossGain;
  // Bracket-differential: tax attributable to the gain only.
  const taxOnGain = calculateTax(otherIncome + discountedGain, year) - calculateTax(otherIncome, year);
  const marginalRate = marginalTaxRate(otherIncome + discountedGain, year);
  const effectiveRate = (taxOnGain / grossGain) * 100;

  return { isLoss: false, grossGain, discountedGain, heldOver12m, taxOnGain, effectiveRate, marginalRate, costBase, netProceeds };
}

// ---------------------------------------------------------------------------
// Superannuation projection
// ---------------------------------------------------------------------------

/** Superannuation guarantee rate, 12% from 1 July 2025. */
export const SG_EMPLOYER_RATE = 12;

export function projectSuperBalance({
  currentBalance = 0,
  salary = 0,
  employerRate = SG_EMPLOYER_RATE,
  personalAnnual = 0,
  years,
  annualReturn = 0.07,
}) {
  const monthlyReturn = annualReturn / 12;
  const numMonths = Math.round(years * 12);

  const employerMonthly = (salary * employerRate / 100) / 12;
  const totalMonthlyContribution = employerMonthly + personalAnnual / 12;

  let futureBalance = currentBalance;
  for (let i = 0; i < numMonths; i += 1) {
    futureBalance = futureBalance * (1 + monthlyReturn) + totalMonthlyContribution;
  }

  // numMonths already covers the whole horizon — no extra ×12 factor.
  const employerTotal = employerMonthly * numMonths;
  const personalTotal = personalAnnual * years;
  const totalContributions = currentBalance + employerTotal + personalTotal;

  return {
    futureBalance,
    totalContributions,
    growth: futureBalance - totalContributions,
    employerTotal,
    personalTotal,
    years,
  };
}

// ---------------------------------------------------------------------------
// Savings goal timeline
// ---------------------------------------------------------------------------

export function savingsGoalTimeline({ goal, current = 0, monthly = 0, annualRate = 0 }) {
  const monthlyRate = annualRate / 100 / 12;
  const needed = goal - current;

  if (needed <= 0) {
    return { reachable: true, months: 0, years: 0, totalContributed: 0, interestEarned: 0, finalBalance: current };
  }

  let months;
  if (monthly > 0) {
    months = annualRate > 0
      ? Math.ceil(
        Math.log((goal * monthlyRate + monthly) / (current * monthlyRate + monthly))
          / Math.log(1 + monthlyRate),
      )
      : Math.ceil(needed / monthly);
  } else if (annualRate > 0 && current > 0) {
    months = Math.ceil(Math.log(goal / current) / Math.log(1 + monthlyRate));
  } else {
    // No contributions and nothing to grow (or no growth at all): the goal is
    // unreachable — never report "Infinity months".
    return { reachable: false, months: null };
  }

  // Balance actually reached after the (ceil'd) number of months, so the
  // interest figure can never go negative.
  const growthFactor = Math.pow(1 + monthlyRate, months);
  const finalBalance = annualRate > 0
    ? current * growthFactor + monthly * ((growthFactor - 1) / monthlyRate)
    : current + monthly * months;
  const totalContributed = monthly * months;
  const interestEarned = Math.max(0, finalBalance - current - totalContributed);

  return { reachable: true, months, years: months / 12, totalContributed, interestEarned, finalBalance };
}

// ---------------------------------------------------------------------------
// Credit card minimum-payment simulation
// ---------------------------------------------------------------------------

/**
 * Simulates the "typical minimum payment" schedule (greater of 2% of the
 * balance or $25). At high APRs the 2% minimum never amortises the balance:
 * instead of silently truncating, this reports `neverAmortizes: true`.
 */
export function simulateMinimumPayments({ balance, annualRate, maxMonths = 1200 }) {
  const monthlyRate = annualRate / 100 / 12;
  let runningBalance = balance;
  let months = 0;
  let totalPaid = 0;

  while (runningBalance > 0 && months < maxMonths) {
    const payment = Math.min(Math.max(25, runningBalance * 0.02), runningBalance * (1 + monthlyRate));
    const interest = runningBalance * monthlyRate;
    const nextBalance = runningBalance + interest - payment;
    if (nextBalance >= runningBalance) {
      // The minimum payment no longer covers the interest — the balance will
      // never be cleared on minimum payments.
      return { neverAmortizes: true, months: null, totalPaid: null, totalInterest: null };
    }
    runningBalance = nextBalance;
    totalPaid += payment;
    months += 1;
  }

  if (runningBalance > 0) {
    return { neverAmortizes: true, months: null, totalPaid: null, totalInterest: null };
  }

  return { neverAmortizes: false, months, totalPaid, totalInterest: totalPaid - balance };
}

// ---------------------------------------------------------------------------
// Compound growth (allows a genuine 0% rate)
// ---------------------------------------------------------------------------

export function compoundGrowth({ principal = 0, monthly = 0, annualRate, years }) {
  const numMonths = Math.round(years * 12);
  const monthlyRate = annualRate / 100 / 12;

  let finalBalance;
  if (annualRate === 0) {
    // Linear branch: no growth, just accumulation.
    finalBalance = principal + monthly * numMonths;
  } else {
    const growthFactor = Math.pow(1 + monthlyRate, numMonths);
    finalBalance = principal * growthFactor
      + (monthly > 0 ? monthly * ((growthFactor - 1) / monthlyRate) : 0);
  }

  const totalContributions = principal + monthly * numMonths;
  return { finalBalance, totalContributions, interestEarned: finalBalance - totalContributions, years };
}

// ---------------------------------------------------------------------------
// FIRE projection
// ---------------------------------------------------------------------------

export function fireProjection({
  monthlyExpenses,
  withdrawalRate,
  currentSavings = 0,
  monthlyContribution = 0,
  annualReturn = 0,
}) {
  const annualExpenses = monthlyExpenses * 12;
  const fireNumber = annualExpenses / (withdrawalRate / 100);
  const remaining = Math.max(0, fireNumber - currentSavings);

  let yearsToFIRE = null;
  if (remaining === 0) {
    yearsToFIRE = 0;
  } else if (monthlyContribution > 0 && annualReturn > 0) {
    const monthlyRate = annualReturn / 12;
    // FV = CS*(1+r)^n + MC*((1+r)^n - 1)/r = fireNumber — solve numerically.
    let lo = 0;
    let hi = 1200;
    for (let i = 0; i < 100; i += 1) {
      const mid = (lo + hi) / 2;
      const fv = currentSavings * Math.pow(1 + monthlyRate, mid)
        + monthlyContribution * (Math.pow(1 + monthlyRate, mid) - 1) / monthlyRate;
      if (fv < fireNumber) lo = mid; else hi = mid;
    }
    yearsToFIRE = hi / 12;
  } else if (monthlyContribution > 0) {
    yearsToFIRE = remaining / (monthlyContribution * 12);
  }

  const savingsRate = monthlyContribution > 0 && (monthlyExpenses + monthlyContribution) > 0
    ? (monthlyContribution / (monthlyExpenses + monthlyContribution)) * 100
    : null;

  return { annualExpenses, fireNumber, remaining, yearsToFIRE, savingsRate };
}

// ---------------------------------------------------------------------------
// Rent vs buy comparison
// ---------------------------------------------------------------------------

export function rentVsBuyComparison({
  homePrice,
  downPaymentPct,
  mortgageRatePct,
  loanTermYears,
  monthlyRent,
  compareYears,
  homeAppreciationPct = 0,
  transferTaxPct = 0,
}) {
  const rate = mortgageRatePct / 100 / 12;
  const termMonths = loanTermYears * 12;
  const compareMonths = compareYears * 12;
  // Once the loan is paid off there are no more mortgage payments — clamp the
  // paying period to the loan term.
  const payingMonths = Math.min(compareMonths, termMonths);

  const downPayment = homePrice * (downPaymentPct / 100);
  const loanAmount = homePrice - downPayment;

  const monthlyMortgage = loanAmount * (rate * Math.pow(1 + rate, termMonths))
    / (Math.pow(1 + rate, termMonths) - 1);

  const transferTax = homePrice * (transferTaxPct / 100);
  const upfrontCosts = downPayment + transferTax + homePrice * 0.01; // + ~1% closing fees
  const totalMortgagePayments = monthlyMortgage * payingMonths;
  const ongoingCosts = homePrice * 0.01 * compareYears; // ~1% p.a. maintenance/insurance
  const totalBuyingCashOut = upfrontCosts + totalMortgagePayments + ongoingCosts;

  // Loan balance remaining after the comparison period (zero once past term).
  const remainingBalance = compareMonths >= termMonths
    ? 0
    : loanAmount * (Math.pow(1 + rate, termMonths) - Math.pow(1 + rate, compareMonths))
      / (Math.pow(1 + rate, termMonths) - 1);

  const homeValue = homePrice * Math.pow(1 + homeAppreciationPct / 100, compareYears);
  const equity = homeValue - Math.max(0, remainingBalance);

  const netBuyingCost = totalBuyingCashOut - equity;
  const totalRentingCost = monthlyRent * compareMonths;
  const diff = netBuyingCost - totalRentingCost;

  return {
    monthlyMortgage,
    downPayment,
    totalBuyingCashOut,
    homeValue,
    equity,
    netBuyingCost,
    totalRentingCost,
    diff,
    n: compareYears,
    buyingWins: diff < 0,
  };
}
