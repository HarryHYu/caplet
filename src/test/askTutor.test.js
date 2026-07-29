import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import api from '../services/api';

// api.askTutor must degrade gracefully so the tutor UI never crashes before
// the backend ships POST /api/ai/tutor.
describe('api.askTutor graceful degradation', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns the answer on a successful response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ answer: 'Compound interest means earning interest on interest.' }),
    });

    const res = await api.askTutor({ lessonId: 'l1', slide: { type: 'text' }, question: 'what is this?' });
    expect(res.unavailable).toBe(false);
    expect(res.answer).toContain('Compound interest');
  });

  it('resolves to a friendly fallback on a 404 instead of throwing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: { get: () => 'application/json' },
      json: async () => ({ message: 'Not Found' }),
    });

    const res = await api.askTutor({ lessonId: 'l1', slide: {}, question: 'help' });
    expect(res.unavailable).toBe(true);
    expect(res.answer).toBe('');
    expect(res.message).toMatch(/unavailable/i);
  });

  it('surfaces the actionable reason (and code) on a consent-gated 403', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: { get: () => 'application/json' },
      json: async () => ({
        message: 'Add your date of birth in Settings → Profile before enabling optional AI-assisted learning.',
        code: 'age_confirmation_required',
        consentRequired: true,
      }),
    });

    const res = await api.askTutor({ slide: {}, question: 'help' });
    expect(res.unavailable).toBe(true);
    expect(res.consentRequired).toBe(true);
    expect(res.code).toBe('age_confirmation_required');
    expect(res.message).toMatch(/date of birth/i);
  });

  it('resolves to a friendly fallback on a network error instead of throwing', async () => {
    // A TypeError simulates a network failure (fetch rejects).
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const res = await api.askTutor({ lessonId: 'l1', slide: {}, question: 'help' });
    expect(res.unavailable).toBe(true);
    expect(res.message).toMatch(/unavailable/i);
  });
});
