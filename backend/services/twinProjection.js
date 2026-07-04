/**
 * twinProjection — the Financial Twin's forward model: a seeded Monte Carlo
 * simulation of a student's HELP balance, super, and savings over 10–20+
 * years, reported as PERCENTILE RANGES, never a single number.
 *
 * HARD CONSTRAINTS (same discipline as debtEngine.js):
 *  1. DETERMINISTIC GIVEN ITS SEED. All randomness flows from mulberry32(seed);
 *     no Math.random, no clock, no I/O. The same {profile, seed, trials,
 *     horizon} always reproduces the same ranges bit-for-bit, and the seed is
 *     echoed in every result. Trial t uses its own derived stream, so trial 7
 *     of a 100-trial run equals trial 7 of a 2000-trial run.
 *  2. HECS IS NOT A CREDIT CARD. Every simulated HELP year is
 *     debtEngine.hecsYearStep() — the SAME function the deterministic
 *     projection uses — so the twin can never disagree with the debt engine
 *     about how HELP behaves (income-contingent repayment, once-a-year
 *     indexation, never monthly interest). With volatilityScale=0 the whole
 *     simulation collapses to debtEngine.calculateHecsProjection exactly;
 *     the parity suite asserts this.
 *  3. SCENARIOS, NOT ADVICE. Output strings are template-selected
 *     comparisons of simulated ranges ("in half the scenarios…"), never
 *     directives. Every economic figure the ranges rest on is echoed with
 *     its effective date and source (twinAssumptions.listAssumptions).
 *
 * Money is whole AUD dollars throughout, matching the rest of the repo.
 */

'use strict';

const { hecsYearStep, CALCULATOR_DISCLAIMER } = require('./debtEngine');
const defaultAssumptions = require('./twinAssumptions');

/** @typedef {import('./twinTypes').ProjectionResult} ProjectionResult */
/** @typedef {import('./twinTypes').PercentileYear} PercentileYear */

// --- Configuration: the single home for every tunable of the simulation. ---
const DEFAULT_SEED = 1;
const DEFAULT_TRIALS = 500;
const MIN_TRIALS = 100;
const MAX_TRIALS = 2000;
const DEFAULT_HORIZON_YEARS = 20;
const MID_HORIZON_YEARS = 10; // the "~10 year" reporting snapshot
const MAX_HORIZON_YEARS = 40;
const PERCENTILES = [10, 25, 50, 75, 90];

/**
 * Scenario-framed wording that travels with every projection, alongside the
 * debt engine's calculator disclaimer.
 */
const TWIN_DISCLAIMER =
  'These are simulated scenarios generated from stated assumptions, shown as ' +
  'ranges across many simulated paths. They are general information — not ' +
  'predictions, not personal advice, and not a recommendation of any product ' +
  'or course of action.';

// ---------------------------------------------------------------------------
// Seeded randomness
// ---------------------------------------------------------------------------

/** mulberry32 — small, fast, seedable PRNG over uint32 state. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal draw via Box–Muller. */
function gaussian(rng) {
  let u1 = rng();
  if (u1 <= Number.EPSILON) u1 = Number.EPSILON; // guard log(0)
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Percentile by linear interpolation over a SORTED array. */
function percentileOf(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Whole-dollar money formatter for template strings (mirrors debtEngine). */
const money = (n) =>
  '$' + Math.round(toNumber(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ---------------------------------------------------------------------------
// The simulation
// ---------------------------------------------------------------------------

/**
 * One simulated future, year by year.
 *
 * Cash-flow judgment calls, stated plainly:
 *  - HECS repayment income is the profile's gross annualIncome, grown by the
 *    sampled wage path (compulsory repayment is income-contingent — derived,
 *    never chosen).
 *  - Savings accumulate the OBSERVED net monthly flow (categorized CDR income
 *    minus spending) when CDR data exists; with no observed data the flow is
 *    zero and savings only earn returns. We deliberately do not invent a tax
 *    model to fabricate a flow. Observed net flow is assumed to already
 *    reflect PAYG withholding (including HECS).
 *  - Super gets balance × sampled return + gross income × SG rate.
 *  - Consumer/BNPL debts are NOT projected here — they are the debt
 *    sequencer's domain (see debtEngine.sequenceDebts) — so netPosition is
 *    savings + super − HELP balance.
 *
 * @returns {{ hecs:number[], super:number[], savings:number[], net:number[] }} one value per year.
 */
function runTrial({ startState, horizonYears, volatilityScale, assumptions, rng }) {
  const A = assumptions;
  let hecs = startState.hecsBalance;
  let income = startState.annualIncome;
  let superBal = startState.superBalance;
  let savings = startState.savingsBalance;
  let annualFlow = startState.annualNetFlow;

  const out = { hecs: [], super: [], savings: [], net: [] };

  for (let year = 1; year <= horizonYears; year += 1) {
    // Sample this year's world. volatilityScale=0 collapses to the means.
    const idxRate = Math.max(0, A.HECS_INDEXATION.mean + volatilityScale * A.HECS_INDEXATION.stdev * gaussian(rng));
    const wageGrowth = A.WAGE_GROWTH.mean + volatilityScale * A.WAGE_GROWTH.stdev * gaussian(rng);
    const superReturn = A.SUPER_RETURN.mean + volatilityScale * A.SUPER_RETURN.stdev * gaussian(rng);
    const savingsReturn = A.SAVINGS_RETURN.mean + volatilityScale * A.SAVINGS_RETURN.stdev * gaussian(rng);

    // HELP year — the debt engine's step function, and only it.
    if (hecs > 0) {
      hecs = hecsYearStep({ openingBalance: hecs, repaymentIncome: income, indexationRate: idxRate, voluntaryAnnual: 0 }).closingBalance;
    }

    superBal = Math.max(0, Math.round(superBal * (1 + superReturn) + income * A.SUPER_GUARANTEE.rate));
    savings = Math.max(0, Math.round(savings * (1 + savingsReturn) + annualFlow));

    income = Math.max(0, Math.round(income * (1 + wageGrowth)));
    annualFlow = Math.round(annualFlow * (1 + wageGrowth));

    out.hecs.push(hecs);
    out.super.push(superBal);
    out.savings.push(savings);
    out.net.push(savings + superBal - hecs);
  }
  return out;
}

/**
 * Run the full Monte Carlo projection.
 *
 * @param {Object}   args
 * @param {Object}   args.profile             UserFinancialProfile-shaped: { annualIncome, hecsBalance, savingsBalance, superBalance }.
 * @param {Object?}  args.categorizedSummary  CategorizedSummary from twinCategorizer, or null when no CDR data.
 * @param {number}   [args.seed]              uint32; echoed in the result. Same seed → identical result.
 * @param {number}   [args.trials]            clamped to [MIN_TRIALS, MAX_TRIALS].
 * @param {number}   [args.horizonYears]      clamped to [1, MAX_HORIZON_YEARS].
 * @param {number}   [args.volatilityScale]   1 = full sampled volatility; 0 = deterministic means (the parity lever).
 * @param {Object}   [args.assumptions]       injectable for tests; defaults to twinAssumptions.
 * @returns {ProjectionResult}
 */
function runTwinProjection({
  profile = {},
  categorizedSummary = null,
  seed = DEFAULT_SEED,
  trials = DEFAULT_TRIALS,
  horizonYears = DEFAULT_HORIZON_YEARS,
  volatilityScale = 1,
  assumptions = defaultAssumptions,
} = {}) {
  const cleanSeed = toNumber(seed) >>> 0;
  const cleanTrials = Math.min(MAX_TRIALS, Math.max(MIN_TRIALS, Math.round(toNumber(trials) || DEFAULT_TRIALS)));
  const horizon = Math.min(MAX_HORIZON_YEARS, Math.max(1, Math.round(toNumber(horizonYears) || DEFAULT_HORIZON_YEARS)));
  const volScale = Math.max(0, toNumber(volatilityScale));

  const startState = {
    hecsBalance: Math.max(0, Math.round(toNumber(profile.hecsBalance))),
    annualIncome: Math.max(0, Math.round(toNumber(profile.annualIncome))),
    superBalance: Math.max(0, Math.round(toNumber(profile.superBalance))),
    savingsBalance: Math.max(0, Math.round(toNumber(profile.savingsBalance))),
    annualNetFlow: categorizedSummary
      ? Math.round((toNumber(categorizedSummary.monthlyIncomeEstimate) - toNumber(categorizedSummary.monthlySpendEstimate)) * 12)
      : 0,
  };

  // trialsByYear[series][year] = number[] across trials
  const seriesNames = ['hecs', 'super', 'savings', 'net'];
  const byYear = Object.fromEntries(seriesNames.map((s) => [s, Array.from({ length: horizon }, () => [])]));

  for (let t = 0; t < cleanTrials; t += 1) {
    // Derived per-trial stream: trial t is identical whatever the trial count.
    const rng = mulberry32((cleanSeed ^ Math.imul(t + 1, 2654435761)) >>> 0);
    const trial = runTrial({ startState, horizonYears: horizon, volatilityScale: volScale, assumptions, rng });
    for (const s of seriesNames) {
      for (let y = 0; y < horizon; y += 1) byYear[s][y].push(trial[s][y]);
    }
  }

  const toPercentileYears = (yearsArr) =>
    yearsArr.map((values, i) => {
      const sorted = [...values].sort((a, b) => a - b);
      /** @type {PercentileYear} */
      const row = { year: i + 1 };
      for (const p of PERCENTILES) row[`p${p}`] = Math.round(percentileOf(sorted, p));
      return row;
    });

  const series = {
    hecsBalance: toPercentileYears(byYear.hecs),
    superBalance: toPercentileYears(byYear.super),
    savingsBalance: toPercentileYears(byYear.savings),
    netPosition: toPercentileYears(byYear.net),
  };

  const snapshotAt = (yearIndex) =>
    Object.fromEntries(
      Object.entries(series).map(([name, rows]) => [name, rows[Math.min(yearIndex, rows.length - 1)]])
    );
  const horizons = {};
  if (horizon >= MID_HORIZON_YEARS) horizons[`y${MID_HORIZON_YEARS}`] = snapshotAt(MID_HORIZON_YEARS - 1);
  horizons[`y${horizon}`] = snapshotAt(horizon - 1);

  // Scenario-framed summary — a comparison of simulated ranges, no directives.
  const lastHecs = series.hecsBalance[horizon - 1];
  const lastNet = series.netPosition[horizon - 1];
  let hecsClause;
  if (startState.hecsBalance <= 0) {
    hecsClause = 'This projection starts with no HELP balance.';
  } else if (lastHecs.p90 === 0) {
    hecsClause = `In at least nine out of ten simulated paths the HELP balance reaches $0 within ${horizon} years.`;
  } else if (lastHecs.p50 === 0) {
    hecsClause = `In half or more of the simulated paths the HELP balance reaches $0 within ${horizon} years; in others a balance of up to ${money(lastHecs.p90)} remains.`;
  } else {
    hecsClause = `After ${horizon} years the simulated HELP balance ranges from ${money(lastHecs.p10)} to ${money(lastHecs.p90)}, with a middle path of ${money(lastHecs.p50)}.`;
  }
  const summary =
    `Across ${cleanTrials} simulated scenarios: ${hecsClause} ` +
    `The simulated overall position (savings plus super, less any HELP balance) after ${horizon} years ` +
    `spans ${money(lastNet.p10)} to ${money(lastNet.p90)} across the middle 80% of paths. ` +
    `These ranges follow from the stated assumptions, not from a prediction of your future.`;

  return {
    seed: cleanSeed,
    trials: cleanTrials,
    horizonYears: horizon,
    volatilityScale: volScale,
    generatedFor: {
      hecsBalance: startState.hecsBalance,
      annualIncome: startState.annualIncome,
      superBalance: startState.superBalance,
      savingsBalance: startState.savingsBalance,
      annualNetFlow: startState.annualNetFlow,
      usedCdrData: Boolean(categorizedSummary),
    },
    assumptionsVersion: assumptions.ASSUMPTIONS_VERSION,
    assumptions: assumptions.listAssumptions(),
    series,
    horizons,
    summary,
    disclaimer: `${TWIN_DISCLAIMER} ${CALCULATOR_DISCLAIMER}`,
  };
}

module.exports = {
  DEFAULT_SEED,
  DEFAULT_TRIALS,
  MIN_TRIALS,
  MAX_TRIALS,
  DEFAULT_HORIZON_YEARS,
  MID_HORIZON_YEARS,
  MAX_HORIZON_YEARS,
  PERCENTILES,
  TWIN_DISCLAIMER,
  mulberry32,
  gaussian,
  percentileOf,
  runTwinProjection,
};
