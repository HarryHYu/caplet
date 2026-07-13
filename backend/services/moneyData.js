'use strict';

const { Op } = require('sequelize');

const SOURCE_DEFINITIONS = [
  {
    code: 'ABS',
    name: 'Australian Bureau of Statistics',
    baseUrl: 'https://www.abs.gov.au/',
    termsUrl: 'https://www.abs.gov.au/about/data-services/application-programming-interfaces-apis/indicator-api/terms-use',
    metadata: { role: 'official_australian_statistical_producer' },
  },
  {
    code: 'RBA',
    name: 'Reserve Bank of Australia',
    baseUrl: 'https://www.rba.gov.au/',
    termsUrl: 'https://www.rba.gov.au/terms-conditions.html',
    metadata: { role: 'official_australian_central_bank' },
  },
];

// Provider identifiers are deliberately explicit registry values. The ABS
// values must be verified against the selected Data/Indicator API dimensions
// before a live adapter is enabled; the API never invents observations when
// the registry is pending verification.
const SERIES_DEFINITIONS = [
  {
    key: 'au.cpi.headline.yoy',
    sourceCode: 'ABS',
    providerSeriesId: 'ABS:CONSUMER_PRICE_INDEX:ALL_GROUPS',
    title: 'Consumer Price Index, All Groups',
    displayTitle: 'Inflation',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/latest-release',
    unit: 'percent',
    nativeFrequency: 'monthly',
    adjustment: 'original',
    transformation: 'pct_change_12m',
    expectedReleaseRule: { cadence: 'monthly', timezone: 'Australia/Canberra', source: 'ABS release calendar' },
    freshnessGraceHours: 120,
    metadata: { informationClass: 'sourced_fact', registryStatus: 'adapter_pending_verification' },
  },
  {
    key: 'au.labour.unemployment.sa',
    sourceCode: 'ABS',
    providerSeriesId: 'ABS:LABOUR_FORCE:UNEMPLOYMENT_RATE_SA',
    title: 'Unemployment rate, seasonally adjusted',
    displayTitle: 'Unemployment',
    sourceUrl: 'https://www.abs.gov.au/statistics/labour/employment-and-unemployment/labour-force-australia/latest-release',
    unit: 'percent',
    nativeFrequency: 'monthly',
    adjustment: 'seasonally_adjusted',
    transformation: 'none',
    expectedReleaseRule: { cadence: 'monthly', timezone: 'Australia/Canberra', source: 'ABS release calendar' },
    freshnessGraceHours: 120,
    metadata: { informationClass: 'sourced_fact', registryStatus: 'adapter_pending_verification' },
  },
  {
    key: 'au.gdp.real.growth',
    sourceCode: 'ABS',
    providerSeriesId: 'ABS:NATIONAL_ACCOUNTS:REAL_GDP_CHAIN_VOLUME_SA',
    title: 'Gross domestic product, chain volume measure',
    displayTitle: 'Real GDP growth',
    sourceUrl: 'https://www.abs.gov.au/statistics/economy/national-accounts-australia/latest-release',
    unit: 'percent',
    nativeFrequency: 'quarterly',
    adjustment: 'seasonally_adjusted',
    transformation: 'pct_change_qoq',
    expectedReleaseRule: { cadence: 'quarterly', timezone: 'Australia/Canberra', source: 'ABS release calendar' },
    freshnessGraceHours: 240,
    metadata: { informationClass: 'sourced_fact', registryStatus: 'adapter_pending_verification' },
  },
  {
    key: 'au.rba.cash_rate_target',
    sourceCode: 'RBA',
    providerSeriesId: 'RBA:F1:FIRMMCRTD',
    title: 'Cash rate target',
    displayTitle: 'Cash-rate target',
    sourceUrl: 'https://www.rba.gov.au/statistics/cash-rate/',
    unit: 'percent',
    nativeFrequency: 'event',
    adjustment: 'not_applicable',
    transformation: 'none',
    expectedReleaseRule: { cadence: 'event', timezone: 'Australia/Sydney', source: 'RBA monetary policy decision' },
    freshnessGraceHours: 720,
    metadata: { informationClass: 'sourced_fact', registryStatus: 'adapter_ready' },
  },
];

const FREQUENCY_MAX_AGE_DAYS = {
  monthly: 75,
  quarterly: 210,
  event: 500,
};

function dependencies(models = require('../models')) {
  return {
    EconomicSource: models.EconomicSource,
    EconomicSeries: models.EconomicSeries,
    EconomicObservation: models.EconomicObservation,
    EconomicIngestionRun: models.EconomicIngestionRun,
    sequelize: models.sequelize,
  };
}

async function ensureMoneyRegistry(models = require('../models')) {
  const { EconomicSource, EconomicSeries } = dependencies(models);
  if (!EconomicSource?.findOrCreate || !EconomicSeries?.findOrCreate) return { sources: 0, series: 0 };

  const sourcesByCode = new Map();
  for (const definition of SOURCE_DEFINITIONS) {
    const [source] = await EconomicSource.findOrCreate({
      where: { code: definition.code },
      defaults: { ...definition, lastReviewedAt: null },
    });
    sourcesByCode.set(definition.code, source);
  }

  for (const definition of SERIES_DEFINITIONS) {
    const source = sourcesByCode.get(definition.sourceCode);
    if (!source) continue;
    await EconomicSeries.findOrCreate({
      where: { key: definition.key },
      defaults: {
        sourceId: source.id,
        providerSeriesId: definition.providerSeriesId,
        title: definition.title,
        displayTitle: definition.displayTitle,
        sourceUrl: definition.sourceUrl,
        unit: definition.unit,
        nativeFrequency: definition.nativeFrequency,
        adjustment: definition.adjustment,
        transformation: definition.transformation,
        expectedReleaseRule: definition.expectedReleaseRule,
        freshnessGraceHours: definition.freshnessGraceHours,
        metadata: definition.metadata,
      },
    });
  }

  return { sources: SOURCE_DEFINITIONS.length, series: SERIES_DEFINITIONS.length };
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageDays(value, now = new Date()) {
  const date = dateValue(value);
  if (!date) return Infinity;
  return Math.max(0, (now.getTime() - date.getTime()) / 86400000);
}

function freshnessFor(series, observation, now = new Date()) {
  if (!observation) {
    return { state: 'unavailable', message: 'No validated observation is available yet.' };
  }

  const expected = dateValue(series.nextExpectedReleaseAt);
  const graceMs = Math.max(1, Number(series.freshnessGraceHours || 72)) * 3600000;
  if (expected && now.getTime() > expected.getTime() + graceMs) {
    const releasedAt = dateValue(observation.releasedAt);
    if (!releasedAt || releasedAt.getTime() < expected.getTime()) {
      return {
        state: 'source_delayed',
        message: 'The source release is later than the expected release window. Showing the last validated observation.',
        nextExpectedReleaseAt: expected.toISOString(),
      };
    }
  }

  const maxAge = FREQUENCY_MAX_AGE_DAYS[series.nativeFrequency] || 90;
  if (ageDays(observation.retrievedAt, now) > maxAge) {
    return {
      state: 'stale',
      message: 'The last validated observation is older than its normal release cadence.',
      nextExpectedReleaseAt: expected?.toISOString() || null,
    };
  }

  return {
    // A registry entry without a release-calendar timestamp is not an
    // error. It means the adapter has not supplied a date-specific expectation
    // yet, so a validated observation can still be described as current.
    state: !expected || now.getTime() < expected.getTime() ? 'current' : 'awaiting_release',
    message: !expected || now.getTime() < expected.getTime()
      ? 'The latest validated observation is available.'
      : 'The next source release is not yet due.',
    nextExpectedReleaseAt: expected?.toISOString() || null,
  };
}

function sourcePayload(source) {
  return source ? {
    code: source.code,
    name: source.name,
    url: source.baseUrl,
    termsUrl: source.termsUrl,
  } : null;
}

function observationPayload(observation) {
  if (!observation) return null;
  const plain = observation.toJSON ? observation.toJSON() : observation;
  return {
    value: toNumber(plain.value),
    previousValue: toNumber(plain.previousValue),
    observationDate: plain.observationDate,
    periodStart: plain.periodStart,
    periodEnd: plain.periodEnd,
    periodLabel: plain.periodLabel,
    releasedAt: plain.releasedAt ? new Date(plain.releasedAt).toISOString() : null,
    retrievedAt: plain.retrievedAt ? new Date(plain.retrievedAt).toISOString() : null,
    revisionState: plain.revisionState,
    revisionDetectedAt: plain.revisionDetectedAt ? new Date(plain.revisionDetectedAt).toISOString() : null,
    isProvisional: Boolean(plain.isProvisional),
  };
}

function seriesPayload(series, source) {
  const plain = series.toJSON ? series.toJSON() : series;
  return {
    key: plain.key,
    title: plain.title,
    displayTitle: plain.displayTitle,
    unit: plain.unit,
    nativeFrequency: plain.nativeFrequency,
    adjustment: plain.adjustment,
    transformation: plain.transformation,
    sourceUrl: plain.sourceUrl,
    source: sourcePayload(source || plain.source),
  };
}

async function latestObservation(seriesId, models) {
  const { EconomicObservation } = dependencies(models);
  if (!EconomicObservation?.findOne) return null;
  return EconomicObservation.findOne({ where: { seriesId }, order: [['observationDate', 'DESC']] });
}

async function listIndicatorSummaries({ models = require('../models'), now = new Date() } = {}) {
  const { EconomicSeries, EconomicSource } = dependencies(models);
  if (!EconomicSeries?.findAll) return [];
  const seriesRows = await EconomicSeries.findAll({
    where: { active: true },
    include: [{ model: EconomicSource, as: 'source', required: false }],
    order: [['key', 'ASC']],
  });
  return Promise.all(seriesRows.map(async (series) => {
    const plain = series.toJSON ? series.toJSON() : series;
    const observation = await latestObservation(plain.id, models);
    const source = plain.source || series.source;
    return {
      ...seriesPayload(plain, source),
      current: observationPayload(observation),
      freshness: freshnessFor(plain, observation, now),
    };
  }));
}

async function getIndicatorHistory(key, { models = require('../models'), limit = 24, now = new Date() } = {}) {
  const { EconomicSeries, EconomicSource, EconomicObservation } = dependencies(models);
  const series = await EconomicSeries.findOne({
    where: { key, active: true },
    include: [{ model: EconomicSource, as: 'source', required: false }],
  });
  if (!series) return null;
  const plain = series.toJSON ? series.toJSON() : series;
  const observations = await EconomicObservation.findAll({
    where: { seriesId: plain.id },
    order: [['observationDate', 'DESC']],
    limit: Math.max(1, Math.min(120, Number(limit) || 24)),
  });
  const latest = observations[0] || null;
  return {
    series: seriesPayload(plain, plain.source || series.source),
    current: observationPayload(latest),
    freshness: freshnessFor(plain, latest, now),
    observations: observations.reverse().map(observationPayload),
  };
}

async function upsertObservations(seriesKey, observations, { models = require('../models'), now = new Date(), transaction } = {}) {
  const { EconomicSeries, EconomicObservation, EconomicIngestionRun, sequelize } = dependencies(models);
  const series = await EconomicSeries.findOne({ where: { key: seriesKey } });
  if (!series) throw new Error(`Unknown economic series: ${seriesKey}`);
  const sourceId = series.sourceId;
  const work = async (tx) => {
    const startedAt = now;
    const run = await EconomicIngestionRun.create({
      sourceId,
      seriesId: series.id,
      adapterVersion: 'fixture-or-adapter-v1',
      startedAt,
      retrievedAt: now,
      status: 'running',
    }, { transaction: tx });
    let accepted = 0;
    let rejected = 0;
    let latestObservationDate = null;
    for (const input of Array.isArray(observations) ? observations : []) {
      const value = toNumber(input.value);
      const observationDate = String(input.observationDate || '').slice(0, 10);
      const periodStart = String(input.periodStart || observationDate).slice(0, 10);
      const periodEnd = String(input.periodEnd || observationDate).slice(0, 10);
      if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(observationDate) || !/^\d{4}-\d{2}-\d{2}$/.test(periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(periodEnd)) {
        rejected += 1;
        continue;
      }
      const existing = await EconomicObservation.findOne({ where: { seriesId: series.id, observationDate }, transaction: tx });
      const oldValue = existing ? toNumber(existing.value) : null;
      const revised = oldValue !== null && oldValue !== value;
      const payload = {
        seriesId: series.id,
        observationDate,
        periodStart,
        periodEnd,
        periodLabel: input.periodLabel || observationDate,
        value,
        previousValue: revised ? oldValue : (existing?.previousValue ?? null),
        releasedAt: dateValue(input.releasedAt),
        retrievedAt: dateValue(input.retrievedAt) || now,
        revisionState: revised ? 'revised' : existing?.revisionState || 'initial',
        revisionDetectedAt: revised ? now : existing?.revisionDetectedAt || null,
        isProvisional: Boolean(input.isProvisional),
        sourceHash: input.sourceHash || null,
      };
      if (existing) await existing.update(payload, { transaction: tx });
      else await EconomicObservation.create(payload, { transaction: tx });
      accepted += 1;
      if (!latestObservationDate || observationDate > latestObservationDate) latestObservationDate = observationDate;
    }
    await run.update({
      completedAt: now,
      status: rejected && !accepted ? 'quarantined' : rejected ? 'partial' : 'succeeded',
      observationsAccepted: accepted,
      observationsRejected: rejected,
      latestObservationDate,
    }, { transaction: tx });
    return { accepted, rejected, latestObservationDate, runId: run.id };
  };
  return transaction ? work(transaction) : sequelize.transaction(work);
}

module.exports = {
  SOURCE_DEFINITIONS,
  SERIES_DEFINITIONS,
  ensureMoneyRegistry,
  freshnessFor,
  listIndicatorSummaries,
  getIndicatorHistory,
  upsertObservations,
};
