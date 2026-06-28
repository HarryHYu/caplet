import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import api from '../services/api';

// api.submitLessonScore and api.logEvent must degrade gracefully so the lesson
// player works identically whether or not the backend has shipped
// POST /api/progress/:lessonId/score and POST /api/events.
describe('api lesson scoring + events graceful degradation', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const okResponse = (data) => ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: async () => data,
  });

  it('submitLessonScore returns data on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse({ saved: true }));
    const res = await api.submitLessonScore('l1', { score: 80, answers: [] });
    expect(res).toEqual({ saved: true });
  });

  it('submitLessonScore resolves to null on a 404 instead of throwing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: { get: () => 'application/json' },
      json: async () => ({ message: 'Not Found' }),
    });
    await expect(api.submitLessonScore('l1', { score: 80, answers: [] })).resolves.toBeNull();
  });

  it('submitLessonScore resolves to null on a network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api.submitLessonScore('l1', { score: 1, answers: [] })).resolves.toBeNull();
  });

  it('submitLessonScore returns null without calling fetch when lessonId is missing', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
    await expect(api.submitLessonScore(undefined, {})).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('logEvent returns data on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(okResponse({ ok: true }));
    const res = await api.logEvent({ type: 'slide_viewed', entityType: 'lesson', entityId: 'l1', metadata: { slideIndex: 0 } });
    expect(res).toEqual({ ok: true });
  });

  it('logEvent resolves to null on a 404 instead of throwing', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: { get: () => 'application/json' },
      json: async () => ({ message: 'Not Found' }),
    });
    await expect(api.logEvent({ type: 'lesson_completed', entityType: 'lesson', entityId: 'l1' })).resolves.toBeNull();
  });

  it('logEvent resolves to null on a network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api.logEvent({ type: 'slide_viewed', entityType: 'lesson', entityId: 'l1' })).resolves.toBeNull();
  });
});
