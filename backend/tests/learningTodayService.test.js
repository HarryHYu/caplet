jest.mock('../models', () => ({}));
jest.mock('../services/recommendationEngine', () => ({ getNextRecommendation: jest.fn() }));

const { dueCopy, rankTodayActions, recommendationAction } = require('../services/learningTodayService');

describe('learningTodayService ranking', () => {
  const now = new Date('2026-07-18T10:00:00.000Z');

  test('puts urgent teacher work before saved practice and recommendations', () => {
    const ranked = rankTodayActions([
      { id: 'recommendation', title: 'Diagnostic', priority: 60 },
      { id: 'practice', title: 'Resume practice', priority: 25 },
      { id: 'assignment', title: 'Teacher checkpoint', priority: 5 },
    ]);

    expect(ranked.map((action) => action.id)).toEqual(['assignment', 'practice', 'recommendation']);
    expect(ranked.map((action) => action.position)).toEqual([1, 2, 3]);
    expect(ranked[0]).not.toHaveProperty('priority');
  });

  test('explains overdue and imminent deadlines plainly', () => {
    expect(dueCopy('2026-07-18T09:00:00.000Z', now)).toMatch(/Overdue/);
    expect(dueCopy('2026-07-19T08:00:00.000Z', now)).toBe('Due within 24 hours');
  });

  test('keeps recommendation context and adds the today source', () => {
    const action = recommendationAction({ mode: 'weak-topic', reason: 'Needs work', outcome: { id: 'o1', title: 'Inflation' }, resourcePath: '/practice?mode=weak-topic' });
    expect(action).toMatchObject({ id: 'recommendation:o1', title: 'Strengthen Inflation', href: '/practice?mode=weak-topic&source=today' });
  });
});
