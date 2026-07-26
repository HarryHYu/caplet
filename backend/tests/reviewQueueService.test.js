const {
  groupSummary,
  parseEssayItemId,
  questionAnswer,
  reviewSort,
} = require('../services/reviewQueueService');

describe('reviewQueueService helpers', () => {
  test('parses paragraph and quote review ids without assuming UUID length', () => {
    expect(parseEssayItemId('essay-1:2')).toEqual({
      essayId: 'essay-1',
      kind: 'paragraph',
      paragraphIndex: 2,
      quoteIndex: null,
    });
    expect(parseEssayItemId('essay-1:q:3:1')).toEqual({
      essayId: 'essay-1',
      kind: 'quote',
      paragraphIndex: 3,
      quoteIndex: 1,
    });
  });

  test('resolves a multiple-choice answer label from a letter answer key', () => {
    expect(questionAnswer({
      options: ['A debt market', 'An equity market', 'Monetary policy'],
      answerKey: 'B',
    })).toBe('An equity market');
  });

  test('summarises only the items in the bounded session', () => {
    const groups = groupSummary([
      { group: 'outcomes', groupLabel: 'Economics outcomes' },
      { group: 'outcomes', groupLabel: 'Economics outcomes' },
      { group: 'savedSlides' },
    ]);
    expect(groups).toEqual([
      expect.objectContaining({ id: 'outcomes', label: 'Economics outcomes', count: 2, estimatedMinutes: 3 }),
      expect.objectContaining({ id: 'savedSlides', count: 1, estimatedMinutes: 2 }),
      expect.objectContaining({ id: 'essays', count: 0, estimatedMinutes: 0 }),
    ]);
  });

  test('puts recent misses before older ordinary due items', () => {
    const items = [
      { id: 'older', recentMiss: false, dueAt: '2026-07-20T00:00:00.000Z' },
      { id: 'miss', recentMiss: true, dueAt: '2026-07-25T00:00:00.000Z' },
    ];
    expect(items.sort(reviewSort).map((item) => item.id)).toEqual(['miss', 'older']);
  });
});
