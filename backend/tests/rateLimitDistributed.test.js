const express = require('express');
const request = require('supertest');
const { createRateLimiter } = require('../middleware/rateLimit');

function appWith(limiter) {
  const app = express();
  app.use(limiter);
  app.get('/', (req, res) => res.json({ ok: true }));
  return app;
}

describe('distributed request rate limiting', () => {
  test('uses shared atomic counts and standard response headers', async () => {
    const distributedStore = {
      incrementFixedWindow: jest.fn()
        .mockResolvedValueOnce({ count: 1, resetMs: 50_000 })
        .mockResolvedValueOnce({ count: 2, resetMs: 49_000 }),
    };
    const limiter = createRateLimiter({
      scope: 'distributed-test',
      windowMs: 60_000,
      max: 1,
      distributedStore,
      keyGenerator: () => 'raw-private-identity',
    });

    const first = await request(appWith(limiter)).get('/');
    expect(first.status).toBe(200);
    const second = await request(appWith(limiter)).get('/');
    expect(second.status).toBe(429);
    expect(second.headers['retry-after']).toBe('49');
    expect(distributedStore.incrementFixedWindow).toHaveBeenCalledWith(expect.objectContaining({
      scope: 'distributed-test',
      identityHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
    expect(JSON.stringify(distributedStore.incrementFixedWindow.mock.calls)).not.toContain('raw-private-identity');
  });

  test('can fail closed when shared safety storage is unavailable', async () => {
    const limiter = createRateLimiter({
      scope: 'distributed-test',
      windowMs: 60_000,
      max: 10,
      failClosed: true,
      logger: () => {},
      distributedStore: {
        incrementFixedWindow: jest.fn().mockRejectedValue(new Error('offline')),
      },
    });
    const response = await request(appWith(limiter)).get('/');
    expect(response.status).toBe(503);
    expect(response.body.message).toMatch(/safety controls/);
    expect(response.body).not.toHaveProperty('error');
  });
});
