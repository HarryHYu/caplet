import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiService } from '../services/api';

afterEach(() => vi.restoreAllMocks());

describe('ApiService environment safety', () => {
  it('never falls back from a failed local mutation to production', async () => {
    const service = new ApiService();
    service.baseURL = 'http://localhost:5002/api';
    service.baseURLCandidates = ['http://localhost:5000/api'];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('backend offline'));

    await expect(service.request('/courses', { method: 'POST', body: '{}' })).rejects.toThrow('backend offline');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.every(([url]) => !String(url).includes('railway.app'))).toBe(true);
  });

  it('may try the explicitly configured local fallback for a network-failed GET', async () => {
    const service = new ApiService();
    service.baseURL = 'http://localhost:5002/api';
    service.baseURLCandidates = ['http://localhost:5000/api'];
    vi.spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('backend offline'))
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: { get: () => null },
        json: async () => ({ ok: true }),
      });

    await expect(service.request('/health')).resolves.toEqual({ ok: true });
    expect(service.baseURL).toBe('http://localhost:5000/api');
  });
});
