/**
 * Projection engine tests: seed reproducibility, distribution sanity, the
 * ZERO-VOLATILITY PARITY GATE (the Monte Carlo engine, with volatility off
 * and means pinned, must reproduce debtEngine.calculateHecsProjection
 * year-for-year — proving HECS has exactly one implementation), and the
 * dated-assumption drift guards.
 */

const {
  runTwinProjection,
  DEFAULT_SEED,
  MIN_TRIALS,
  MAX_TRIALS,
  MAX_HORIZON_YEARS,
  PERCENTILES,
  percentileOf,
  mulberry32,
} = require('../services/twinProjection');
const { calculateHecsProjection, DEFAULT_INDEXATION_RATE, HECS_REPAYMENT_BANDS } = require('../services/debtEngine');
const assumptions = require('../services/twinAssumptions');

const PROFILE = { annualIncome: 85000, hecsBalance: 32000, superBalance: 12000, savingsBalance: 5000 };

/** Assumption set with all volatility removable and HECS mean pinned to the debt engine default. */
function pinnedAssumptions({ hecsMean = DEFAULT_INDEXATION_RATE, wageMean = 0 } = {}) {
  return {
    ASSUMPTIONS_VERSION: 'test-pinned',
    HECS_INDEXATION: { mean: hecsMean, stdev: 0.01, effectiveDate: '2025-06-01', source: 'test' },
    WAGE_GROWTH: { mean: wageMean, stdev: 0.01, effectiveDate: '2025-06-01', source: 'test' },
    SUPER_GUARANTEE: { rate: 0.12, effectiveDate: '2025-07-01', source: 'test' },
    SUPER_RETURN: { mean: 0.07, stdev: 0.08, effectiveDate: '2025-06-30', source: 'test' },
    SAVINGS_RETURN: { mean: 0.04, stdev: 0.012, effectiveDate: '2025-12-01', source: 'test' },
    listAssumptions: () => [],
  };
}

describe('seeded reproducibility', () => {
  it('same seed → bit-identical result', () => {
    const a = runTwinProjection({ profile: PROFILE, seed: 42, trials: 200, horizonYears: 15 });
    const b = runTwinProjection({ profile: PROFILE, seed: 42, trials: 200, horizonYears: 15 });
    expect(a).toEqual(b);
    expect(a.seed).toBe(42);
  });

  it('different seed → different draw', () => {
    const a = runTwinProjection({ profile: PROFILE, seed: 1, trials: 200, horizonYears: 15 });
    const b = runTwinProjection({ profile: PROFILE, seed: 2, trials: 200, horizonYears: 15 });
    expect(a.series.superBalance).not.toEqual(b.series.superBalance);
  });

  it('trial streams are derived per-trial: a bigger run reproduces the smaller run inside it', () => {
    // Not directly observable from percentiles alone, but with 100 vs 2000
    // trials the medians must stay close because the first 100 trials are
    // shared and the sampler is unbiased. A loose statistical pin.
    const small = runTwinProjection({ profile: PROFILE, seed: 7, trials: 100, horizonYears: 10 });
    const large = runTwinProjection({ profile: PROFILE, seed: 7, trials: 2000, horizonYears: 10 });
    const s = small.series.superBalance[9].p50;
    const l = large.series.superBalance[9].p50;
    expect(Math.abs(s - l) / l).toBeLessThan(0.05);
  });

  it('echoes seed, trials, horizon and clamps out-of-range values', () => {
    const r = runTwinProjection({ profile: PROFILE, seed: -1, trials: 5, horizonYears: 999 });
    expect(r.seed).toBe(4294967295); // -1 >>> 0
    expect(r.trials).toBe(MIN_TRIALS);
    expect(r.horizonYears).toBe(MAX_HORIZON_YEARS);
    const r2 = runTwinProjection({ profile: PROFILE, trials: 999999, horizonYears: 20 });
    expect(r2.trials).toBe(MAX_TRIALS);
    expect(r2.seed).toBe(DEFAULT_SEED);
  });
});

describe('zero-volatility parity with the deterministic debt engine (THE gate)', () => {
  it.each([10, 20])('reproduces calculateHecsProjection exactly over %s years', (horizon) => {
    const twin = runTwinProjection({
      profile: PROFILE,
      seed: 123,
      trials: MIN_TRIALS,
      horizonYears: horizon,
      volatilityScale: 0,
      assumptions: pinnedAssumptions(),
    });
    const engine = calculateHecsProjection({
      balance: PROFILE.hecsBalance,
      repaymentIncome: PROFILE.annualIncome,
      indexationRate: DEFAULT_INDEXATION_RATE,
      voluntaryAnnual: 0,
      incomeGrowthRate: 0,
      years: horizon,
    });

    for (let y = 0; y < horizon; y += 1) {
      const twinYear = twin.series.hecsBalance[y];
      // The engine's loop stops once the balance clears; past that, zero.
      const expected = engine.projection[y] ? engine.projection[y].closingBalance : 0;
      // With volatility off, every trial is identical → the fan collapses.
      expect(twinYear.p10).toBe(expected);
      expect(twinYear.p50).toBe(expected);
      expect(twinYear.p90).toBe(expected);
    }
  });

  it('holds with wage growth on (both models grow income identically)', () => {
    const growth = 0.03;
    const horizon = 12;
    const twin = runTwinProjection({
      profile: PROFILE,
      trials: MIN_TRIALS,
      horizonYears: horizon,
      volatilityScale: 0,
      assumptions: pinnedAssumptions({ wageMean: growth }),
    });
    const engine = calculateHecsProjection({
      balance: PROFILE.hecsBalance,
      repaymentIncome: PROFILE.annualIncome,
      indexationRate: DEFAULT_INDEXATION_RATE,
      incomeGrowthRate: growth,
      years: horizon,
    });
    for (let y = 0; y < horizon; y += 1) {
      const expected = engine.projection[y] ? engine.projection[y].closingBalance : 0;
      expect(twin.series.hecsBalance[y].p50).toBe(expected);
    }
  });
});

describe('distribution properties', () => {
  const result = runTwinProjection({ profile: PROFILE, seed: 99, trials: 500, horizonYears: 20 });

  it('percentiles are ordered p10 ≤ p25 ≤ p50 ≤ p75 ≤ p90 for every series and year', () => {
    for (const rows of Object.values(result.series)) {
      for (const row of rows) {
        expect(row.p10).toBeLessThanOrEqual(row.p25);
        expect(row.p25).toBeLessThanOrEqual(row.p50);
        expect(row.p50).toBeLessThanOrEqual(row.p75);
        expect(row.p75).toBeLessThanOrEqual(row.p90);
      }
    }
  });

  it('more volatility → wider fan', () => {
    const narrow = runTwinProjection({ profile: PROFILE, seed: 5, trials: 400, horizonYears: 20, volatilityScale: 0.5 });
    const wide = runTwinProjection({ profile: PROFILE, seed: 5, trials: 400, horizonYears: 20, volatilityScale: 1.5 });
    const spread = (r) => r.series.superBalance[19].p90 - r.series.superBalance[19].p10;
    expect(spread(wide)).toBeGreaterThan(spread(narrow));
  });

  it('reports both the ~10y and final horizon snapshots', () => {
    expect(result.horizons.y10.hecsBalance.year).toBe(10);
    expect(result.horizons.y20.netPosition.year).toBe(20);
  });

  it('a HECS balance never goes negative and super never shrinks below zero', () => {
    for (const row of result.series.hecsBalance) expect(row.p10).toBeGreaterThanOrEqual(0);
    for (const row of result.series.superBalance) expect(row.p10).toBeGreaterThanOrEqual(0);
  });

  it('percentileOf interpolates linearly', () => {
    expect(percentileOf([0, 10], 50)).toBe(5);
    expect(percentileOf([1, 2, 3, 4, 5], 50)).toBe(3);
    expect(percentileOf([], 50)).toBe(0);
    expect(PERCENTILES).toEqual([10, 25, 50, 75, 90]);
  });

  it('mulberry32 streams are deterministic and uniform-ish', () => {
    const a = mulberry32(1);
    const b = mulberry32(1);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('assumption provenance (drift guards)', () => {
  it('every echoed assumption carries an effective date and a source', () => {
    const r = runTwinProjection({ profile: PROFILE, trials: MIN_TRIALS, horizonYears: 5 });
    expect(r.assumptions.length).toBeGreaterThan(0);
    for (const a of r.assumptions) {
      expect(a.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof a.source).toBe('string');
      expect(a.source.length).toBeGreaterThan(5);
      expect(Number.isFinite(a.value)).toBe(true);
    }
    expect(r.assumptionsVersion).toBe(assumptions.ASSUMPTIONS_VERSION);
  });

  it('the latest observed HELP indexation equals the debt engine default (one world, two modules)', () => {
    const latest = assumptions.HECS_INDEXATION_HISTORY[assumptions.HECS_INDEXATION_HISTORY.length - 1];
    expect(latest).toEqual({ year: 2025, rate: DEFAULT_INDEXATION_RATE });
  });

  it('pins the legislated figures verbatim', () => {
    expect(assumptions.SUPER_GUARANTEE).toMatchObject({ rate: 0.12, effectiveDate: '2025-07-01' });
    expect(assumptions.HECS_INDEXATION_HISTORY.map((r) => r.year)).toEqual([2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]);
    // The debt engine's bands are already pinned in debtEngine.test.js; assert
    // the two modules see the same 2025-26 marginal system here too.
    expect(HECS_REPAYMENT_BANDS.map((b) => b.min)).toEqual([0, 67000, 125000]);
  });

  it('uses observed CDR flow only when a categorized summary is provided', () => {
    const withFlow = runTwinProjection({
      profile: PROFILE,
      categorizedSummary: { monthlyIncomeEstimate: 5000, monthlySpendEstimate: 3000 },
      trials: MIN_TRIALS,
      horizonYears: 5,
    });
    const without = runTwinProjection({ profile: PROFILE, trials: MIN_TRIALS, horizonYears: 5 });
    expect(withFlow.generatedFor.annualNetFlow).toBe(24000);
    expect(withFlow.generatedFor.usedCdrData).toBe(true);
    expect(without.generatedFor.annualNetFlow).toBe(0);
    expect(without.generatedFor.usedCdrData).toBe(false);
  });
});
