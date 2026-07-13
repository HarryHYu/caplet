const {
  assertSharedLimiterConfiguration,
  createRedisLimitStore,
  millisecondsUntilNextUtcDay,
  redisConfiguration,
} = require('../services/distributedLimitStore');

describe('distributed limiter storage', () => {
  test('requires Redis before a deployment declares multiple replicas', () => {
    expect(() => assertSharedLimiterConfiguration({ CAPLET_BACKEND_REPLICA_COUNT: '2' }))
      .toThrow(/REDIS_URL is required/);
    expect(() => assertSharedLimiterConfiguration({
      CAPLET_BACKEND_REPLICA_COUNT: '2',
      REDIS_URL: 'redis://localhost:6379',
    })).not.toThrow();
    expect(redisConfiguration({})).toBeNull();
  });

  test('uses only hashed identities in Redis keys and translates fixed-window results', async () => {
    const evalMock = jest.fn().mockResolvedValue([3, 42_000]);
    const store = createRedisLimitStore({
      env: { REDIS_URL: 'redis://localhost:6379', NODE_ENV: 'test' },
      clientProvider: async () => ({ eval: evalMock }),
    });
    await expect(store.incrementFixedWindow({
      scope: 'auth', identityHash: 'hashed-value', windowMs: 60_000,
    })).resolves.toEqual({ count: 3, resetMs: 42_000 });
    const [, options] = evalMock.mock.calls[0];
    expect(options.keys[0]).toContain('hashed-value');
    expect(options.keys[0]).not.toContain('user@example.com');
  });

  test('reserves weighted AI capacity with a product-wide daily key', async () => {
    const evalMock = jest.fn().mockResolvedValue([1, 0, 8, 1, 25, 120_000]);
    const store = createRedisLimitStore({
      env: { REDIS_URL: 'redis://localhost:6379', NODE_ENV: 'test' },
      clientProvider: async () => ({ eval: evalMock }),
    });
    const result = await store.reserveAI({
      identityHash: 'safe-hash',
      units: 3,
      windowMs: 900_000,
      maxUnits: 40,
      maxConcurrent: 2,
      dailyMaxUnits: 10_000,
      leaseMs: 600_000,
      now: new Date('2026-07-13T12:00:00.000Z'),
    });
    expect(result).toMatchObject({ ok: true, unitsUsed: 8, active: 1, dailyUnitsUsed: 25 });
    expect(evalMock.mock.calls[0][1].keys).toContain('caplet-test:ai:daily:2026-07-13');
  });

  test('calculates the daily budget TTL at UTC midnight', () => {
    expect(millisecondsUntilNextUtcDay(new Date('2026-07-13T23:59:30.000Z'))).toBe(30_000);
  });
});
