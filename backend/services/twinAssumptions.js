/**
 * twinAssumptions — every economic assumption the Financial Twin projection
 * engine (services/twinProjection.js) draws on, in one auditable place.
 *
 * RESPONSIBILITY: hold dated, sourced constant tables and derive the sampling
 * parameters (means/stdevs) the Monte Carlo engine uses. No simulation logic
 * lives here; no I/O, no clock, no randomness — pure data + pure derivations.
 *
 * CONVENTIONS (same as debtEngine.js):
 *  - Every figure carries an explicit effective date and source in code, not
 *    just in comments — listAssumptions() echoes them into API responses so
 *    the provenance travels with every projection.
 *  - VERIFY AGAINST CURRENT ATO / ABS FIGURES BEFORE SHIPPING TO REAL USERS.
 *    The exact numbers are JUDGMENT CALLS a human must reconcile with the
 *    current published schedules; tests assert them verbatim so they cannot
 *    drift silently.
 */

'use strict';

const { DEFAULT_INDEXATION_RATE } = require('./debtEngine');

/**
 * Bump when any assumption below changes, so stored/compared projections can
 * be told apart. Echoed in every projection response.
 */
const ASSUMPTIONS_VERSION = '2026-07.1';

/**
 * HELP/HECS indexation applied on 1 June of each year, as fractions.
 *
 * 2023 and 2024 are the EFFECTIVE rates after the Universities Accord
 * (Student Support and Other Measures) Act 2024 retrospectively capped
 * indexation at the lower of CPI and WPI: 2023's published 7.1% was
 * re-credited down to 3.2%, 2024's 4.7% down to 4.0%. The effective rates are
 * used here because they are what balances actually grew by.
 *
 * Source: ATO "HELP indexation rates" schedule (studyassist.gov.au / ato.gov.au),
 * as at 2025-06-01. VERIFY each year after the 1 June figure is published.
 */
const HECS_INDEXATION_HISTORY = [
  { year: 2016, rate: 0.015 },
  { year: 2017, rate: 0.015 },
  { year: 2018, rate: 0.019 },
  { year: 2019, rate: 0.018 },
  { year: 2020, rate: 0.018 },
  { year: 2021, rate: 0.006 },
  { year: 2022, rate: 0.039 },
  { year: 2023, rate: 0.032 }, // 7.1% published, re-credited to 3.2% (lower of CPI/WPI)
  { year: 2024, rate: 0.04 },  // 4.7% published, re-credited to 4.0%
  { year: 2025, rate: 0.032 },
];

/** Mean/stdev of a list of numbers (population stdev — this IS the population). */
function meanAndStdev(values) {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  return { mean, stdev: Math.sqrt(variance) };
}

/**
 * Sampling parameters for annual HELP indexation, derived from the 10-year
 * effective history above. Sampled draws are floored at 0 by the engine
 * (indexation is never negative). effectiveDate = the most recent observation.
 */
const HECS_INDEXATION = {
  ...meanAndStdev(HECS_INDEXATION_HISTORY.map((r) => r.rate)),
  effectiveDate: '2025-06-01',
  source: 'ATO HELP indexation rates 2016–2025 (post-2024-Act effective rates)',
};

/**
 * Assumed annual wage growth for repayment income. Centred on the ABS Wage
 * Price Index trend (~3.4% annual growth through 2025); the stdev is a
 * JUDGMENT CALL wide enough to cover the 2016–2025 WPI range (~1.4%–4.2%).
 * Source: ABS "Wage Price Index, Australia", 2025 releases.
 */
const WAGE_GROWTH = {
  mean: 0.034,
  stdev: 0.01,
  effectiveDate: '2025-08-01',
  source: 'ABS Wage Price Index, Australia — annual growth trend (2025)',
};

/**
 * Superannuation guarantee rate — the legislated final step of the SG
 * schedule, 12% of ordinary time earnings from 1 July 2025. Treated as fixed
 * (legislated), not sampled. Source: ATO "Super guarantee percentage".
 */
const SUPER_GUARANTEE = {
  rate: 0.12,
  effectiveDate: '2025-07-01',
  source: 'ATO super guarantee percentage (legislated schedule, final step)',
};

/**
 * Assumed nominal annual return of a balanced/growth super option. Mean ~7%
 * with stdev ~8% approximates long-run balanced-option behaviour (e.g. APRA
 * fund-level statistics / ASFA long-run averages). A JUDGMENT CALL — super
 * returns are the widest, least knowable assumption in the model, which is
 * exactly why output is a range and not a number.
 */
const SUPER_RETURN = {
  mean: 0.07,
  stdev: 0.08,
  effectiveDate: '2025-06-30',
  source: 'Long-run balanced-option super returns (APRA/ASFA statistics) — judgment call',
};

/**
 * Assumed nominal annual return on cash savings. Centred on typical 2025
 * Australian high-interest savings rates; stdev reflects cash-rate cycles.
 * JUDGMENT CALL — re-check against prevailing rates.
 */
const SAVINGS_RETURN = {
  mean: 0.04,
  stdev: 0.012,
  effectiveDate: '2025-12-01',
  source: 'Prevailing Australian at-call savings rates, late 2025 — judgment call',
};

/**
 * Flat list of every assumption with its provenance, echoed verbatim in every
 * projection API response so a reader can always see what the ranges rest on.
 * @returns {Array<{key:string, value:number, effectiveDate:string, source:string}>}
 */
function listAssumptions() {
  return [
    { key: 'hecsIndexationMean', value: HECS_INDEXATION.mean, effectiveDate: HECS_INDEXATION.effectiveDate, source: HECS_INDEXATION.source },
    { key: 'hecsIndexationStdev', value: HECS_INDEXATION.stdev, effectiveDate: HECS_INDEXATION.effectiveDate, source: HECS_INDEXATION.source },
    { key: 'wageGrowthMean', value: WAGE_GROWTH.mean, effectiveDate: WAGE_GROWTH.effectiveDate, source: WAGE_GROWTH.source },
    { key: 'wageGrowthStdev', value: WAGE_GROWTH.stdev, effectiveDate: WAGE_GROWTH.effectiveDate, source: WAGE_GROWTH.source },
    { key: 'superGuaranteeRate', value: SUPER_GUARANTEE.rate, effectiveDate: SUPER_GUARANTEE.effectiveDate, source: SUPER_GUARANTEE.source },
    { key: 'superReturnMean', value: SUPER_RETURN.mean, effectiveDate: SUPER_RETURN.effectiveDate, source: SUPER_RETURN.source },
    { key: 'superReturnStdev', value: SUPER_RETURN.stdev, effectiveDate: SUPER_RETURN.effectiveDate, source: SUPER_RETURN.source },
    { key: 'savingsReturnMean', value: SAVINGS_RETURN.mean, effectiveDate: SAVINGS_RETURN.effectiveDate, source: SAVINGS_RETURN.source },
    { key: 'savingsReturnStdev', value: SAVINGS_RETURN.stdev, effectiveDate: SAVINGS_RETURN.effectiveDate, source: SAVINGS_RETURN.source },
  ];
}

// The most recent observed HELP indexation must equal the debt engine's
// default — the two modules describe the same world. Asserted in tests too,
// but checked at require-time so a mismatch can't even boot.
const latestIndexation = HECS_INDEXATION_HISTORY[HECS_INDEXATION_HISTORY.length - 1];
if (latestIndexation.rate !== DEFAULT_INDEXATION_RATE) {
  throw new Error(
    `twinAssumptions: latest HELP indexation (${latestIndexation.rate}) disagrees with ` +
      `debtEngine.DEFAULT_INDEXATION_RATE (${DEFAULT_INDEXATION_RATE}) — reconcile before shipping.`
  );
}

module.exports = {
  ASSUMPTIONS_VERSION,
  HECS_INDEXATION_HISTORY,
  HECS_INDEXATION,
  WAGE_GROWTH,
  SUPER_GUARANTEE,
  SUPER_RETURN,
  SAVINGS_RETURN,
  meanAndStdev,
  listAssumptions,
};
