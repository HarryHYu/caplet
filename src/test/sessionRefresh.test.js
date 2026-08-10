import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '../services/api';

afterEach(() => vi.restoreAllMocks());

const jsonResponse = (status, body = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  headers: { get: () => null },
  json: async () => body,
});

const makeService = () => {
  const service = new ApiService();
  service.baseURL = 'http://localhost:5002/api';
  service.baseURLCandidates = ['http://localhost:5002/api'];
  return service;
};

describe('session refresh resilience', () => {
  it('shares one in-flight refresh across concurrent callers', async () => {
    const service = makeService();
    let resolveRefresh;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise((resolve) => { resolveRefresh = resolve; }),
    );

    const first = service.refreshAccessToken();
    const second = service.refreshAccessToken();
    resolveRefresh(jsonResponse(200, { token: 'fresh-token' }));

    await expect(first).resolves.toBe('fresh-token');
    await expect(second).resolves.toBe('fresh-token');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(service.token).toBe('fresh-token');
  });

  it('keeps the session alive when refresh is rate limited or the server hiccups', async () => {
    for (const status of [429, 500, 502, 403]) {
      const service = makeService();
      service.setToken('still-good');
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(status, {}));

      await expect(service.refreshAccessToken()).resolves.toBeNull();
      expect(service.token).toBe('still-good');
      expect(service.sessionDead).toBe(false);
      vi.restoreAllMocks();
    }
  });

  it('signs out only when the refresh session itself is rejected with 401', async () => {
    const service = makeService();
    service.setToken('stale');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(401, {}));

    await expect(service.refreshAccessToken()).resolves.toBeNull();
    expect(service.token).toBeNull();
    expect(service.sessionDead).toBe(true);
  });

  it('recovers a 401 request by refreshing once and retrying with the new token', async () => {
    const service = makeService();
    service.setToken('expired');
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Token expired' }))
      .mockResolvedValueOnce(jsonResponse(200, { token: 'renewed' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    await expect(service.request('/courses')).resolves.toEqual({ ok: true });
    expect(service.token).toBe('renewed');
    const retryHeaders = fetchMock.mock.calls[2][1].headers;
    expect(retryHeaders.Authorization).toBe('Bearer renewed');
  });

  it('does not treat a wrong editor workspace code as an expired account session', async () => {
    const service = makeService();
    service.setToken('account-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(401, { message: 'Invalid code' }));

    await expect(service.request('/editor/enter', { method: 'POST', body: '{}' }))
      .rejects.toThrow('Invalid code');
    // No refresh attempt, and the account token survives.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(service.token).toBe('account-token');
  });

  it('retries a transiently failed boot restore before giving up', async () => {
    vi.useFakeTimers();
    try {
      const service = makeService();
      const fetchMock = vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(jsonResponse(429, {}))
        .mockResolvedValueOnce(jsonResponse(200, { token: 'second-chance' }));

      const restore = service.restoreSession();
      await vi.runAllTimersAsync();

      await expect(restore).resolves.toBe('second-chance');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not retry a boot restore when the refresh session is conclusively dead', async () => {
    vi.useFakeTimers();
    try {
      const service = makeService();
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(401, {}));

      const restore = service.restoreSession();
      await vi.runAllTimersAsync();

      await expect(restore).resolves.toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(service.sessionDead).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
