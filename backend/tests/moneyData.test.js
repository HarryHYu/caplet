const express = require('express');
const request = require('supertest');

describe('public Money indicator API', () => {
  let moneyRouter;
  let service;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../services/moneyData', () => ({
      listIndicatorSummaries: jest.fn().mockResolvedValue([
        {
          key: 'au.cpi.headline.yoy',
          displayTitle: 'Inflation',
          nativeFrequency: 'monthly',
          current: {
            value: 3.2,
            observationDate: '2026-05-01',
            releasedAt: '2026-06-24T01:30:00.000Z',
            retrievedAt: '2026-07-13T03:00:00.000Z',
            revisionState: 'initial',
          },
          freshness: { state: 'current', message: 'Latest validated observation.' },
          source: { code: 'ABS', name: 'Australian Bureau of Statistics' },
        },
      ]),
      getIndicatorHistory: jest.fn().mockImplementation(async (key) => (
        key === 'au.cpi.headline.yoy'
          ? {
            series: { key, nativeFrequency: 'monthly' },
            current: { value: 3.2, observationDate: '2026-05-01' },
            freshness: { state: 'current' },
            observations: [{ value: 3.2, observationDate: '2026-05-01' }],
          }
          : null
      )),
    }));
    service = require('../services/moneyData');
    moneyRouter = require('../routes/money');
  });

  afterEach(() => {
    jest.dontMock('../services/moneyData');
  });

  function app() {
    const instance = express();
    instance.use('/api/money', moneyRouter);
    return instance;
  }

  test('returns public indicator summaries without authentication', async () => {
    const response = await request(app()).get('/api/money/indicators');
    expect(response.status).toBe(200);
    expect(response.body.schemaVersion).toBe(1);
    expect(response.body.indicators[0]).toMatchObject({
      key: 'au.cpi.headline.yoy',
      nativeFrequency: 'monthly',
      freshness: { state: 'current' },
    });
    expect(response.headers['cache-control']).toMatch(/public/);
  });

  test('rejects invalid history limits and unknown series', async () => {
    const invalid = await request(app()).get('/api/money/indicators/au.cpi.headline.yoy?limit=121');
    expect(invalid.status).toBe(400);

    const missing = await request(app()).get('/api/money/indicators/not-a-series');
    expect(missing.status).toBe(404);
  });

  test('returns history with source and freshness metadata', async () => {
    const response = await request(app()).get('/api/money/indicators/au.cpi.headline.yoy?limit=12');
    expect(response.status).toBe(200);
    expect(response.body.series.nativeFrequency).toBe('monthly');
    expect(response.body.current.observationDate).toBe('2026-05-01');
    expect(service.getIndicatorHistory).toHaveBeenCalledWith('au.cpi.headline.yoy', { limit: 12 });
  });
});

describe('Money freshness semantics', () => {
  test('does not call a monthly observation daily data', () => {
    const { freshnessFor } = jest.requireActual('../services/moneyData');
    const observation = {
      retrievedAt: '2026-07-13T00:00:00.000Z',
      releasedAt: '2026-06-24T00:00:00.000Z',
    };
    const series = {
      nativeFrequency: 'monthly',
      freshnessGraceHours: 120,
      nextExpectedReleaseAt: '2026-07-29T00:00:00.000Z',
    };
    expect(freshnessFor(series, observation, new Date('2026-07-13T12:00:00.000Z')).state).toBe('current');
  });

  test('marks missing data unavailable and late releases delayed', () => {
    const { freshnessFor } = jest.requireActual('../services/moneyData');
    expect(freshnessFor({ nativeFrequency: 'monthly' }, null).state).toBe('unavailable');
    const delayed = freshnessFor({
      nativeFrequency: 'monthly',
      freshnessGraceHours: 1,
      nextExpectedReleaseAt: '2026-07-01T00:00:00.000Z',
    }, {
      retrievedAt: '2026-06-01T00:00:00.000Z',
      releasedAt: '2026-06-01T00:00:00.000Z',
    }, new Date('2026-07-13T00:00:00.000Z'));
    expect(delayed.state).toBe('source_delayed');
  });
});
