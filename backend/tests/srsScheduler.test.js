/**
 * Pure unit tests for the spaced-repetition scheduler.
 * No database, no OpenAI key, no clock dependency — `now` is injected.
 */
const {
  STAGE_INTERVALS_DAYS,
  MAX_STAGE,
  DAY_MS,
  isPass,
  normalizeRecall,
  intervalForStage,
  nextReview,
} = require('../services/srsScheduler');

describe('srsScheduler', () => {
  describe('isPass / normalizeRecall', () => {
    it('treats pass-like values as success', () => {
      for (const v of [true, 'pass', 'Pass', ' good ', 'easy', 'correct', 'yes', 3, 5]) {
        expect(isPass(v)).toBe(true);
        expect(normalizeRecall(v)).toBe('pass');
      }
    });

    it('treats everything else as failure', () => {
      for (const v of [false, 'fail', 'again', '', null, undefined, 0, 2, 'nope']) {
        expect(isPass(v)).toBe(false);
        expect(normalizeRecall(v)).toBe('fail');
      }
    });
  });

  describe('intervalForStage', () => {
    it('maps each stage to its ladder interval and clamps out-of-range', () => {
      expect(intervalForStage(0)).toBe(1);
      expect(intervalForStage(1)).toBe(3);
      expect(intervalForStage(2)).toBe(7);
      expect(intervalForStage(3)).toBe(14);
      expect(intervalForStage(99)).toBe(14); // clamp high
      expect(intervalForStage(-5)).toBe(1); // clamp low
      expect(intervalForStage(undefined)).toBe(1); // default
    });
  });

  describe('nextReview — ladder advances 1, 3, 7, 14 on repeated success', () => {
    it('walks the full ladder from a new item and holds the 14-day cadence', () => {
      const now = 0;
      const expected = [1, 3, 7, 14, 14, 14]; // first four rungs, then held
      let stage = null; // never scheduled

      expected.forEach((intervalDays, i) => {
        const r = nextReview(stage, 'pass', now);
        expect(r.intervalDays).toBe(intervalDays);
        expect(r.nextDueAt.getTime()).toBe(now + intervalDays * DAY_MS);
        expect(r.recall).toBe('pass');
        // stage advances 0,1,2,3,3,3 — capped at MAX_STAGE
        expect(r.stage).toBe(Math.min(i, MAX_STAGE));
        stage = r.stage;
      });
    });

    it('stage 3 success holds at stage 3 (14 days), never auto-learned', () => {
      const r = nextReview(MAX_STAGE, 'pass', 0);
      expect(r.stage).toBe(MAX_STAGE);
      expect(r.intervalDays).toBe(14);
    });
  });

  describe('nextReview — resets to stage 0 on failure', () => {
    it('a failure at any stage drops back to stage 0 / 1 day', () => {
      for (const stage of [0, 1, 2, 3]) {
        const r = nextReview(stage, 'fail', 0);
        expect(r.stage).toBe(0);
        expect(r.intervalDays).toBe(1);
        expect(r.recall).toBe('fail');
        expect(r.nextDueAt.getTime()).toBe(1 * DAY_MS);
      }
    });

    it('a failure right after several successes still resets fully', () => {
      const now = 1000000;
      let { stage } = nextReview(null, 'pass', now); // stage 0
      ({ stage } = nextReview(stage, 'pass', now)); // stage 1
      ({ stage } = nextReview(stage, 'pass', now)); // stage 2
      const failed = nextReview(stage, 'fail', now);
      expect(failed.stage).toBe(0);
      expect(failed.intervalDays).toBe(1);
      expect(failed.nextDueAt.getTime()).toBe(now + 1 * DAY_MS);
    });
  });

  describe('nextReview — now injection', () => {
    it('computes nextDueAt relative to the provided now', () => {
      const now = 1700000000000;
      const r = nextReview(0, 'pass', now); // advance to stage 1 -> 3 days
      expect(r.nextDueAt.getTime()).toBe(now + 3 * DAY_MS);
    });
  });

  it('exposes the canonical ladder', () => {
    expect(STAGE_INTERVALS_DAYS).toEqual([1, 3, 7, 14]);
    expect(MAX_STAGE).toBe(3);
  });
});
