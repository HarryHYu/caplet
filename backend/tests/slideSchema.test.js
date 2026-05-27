const { normalizeSlide, validateSlides, CANONICAL_TYPES } = require('../utils/slideSchema');

describe('normalizeSlide', () => {
  test('passes canonical text slide through', () => {
    const r = normalizeSlide({ type: 'text', content: 'hi', layout: 'hero' });
    expect(r).toEqual({ type: 'text', content: 'hi', caption: undefined, layout: 'hero', tone: 'neutral' });
  });

  test('legacy image → media', () => {
    const r = normalizeSlide({ type: 'image', content: 'https://x/y.jpg', caption: 'cap' });
    expect(r).toEqual({ type: 'media', source: 'image', url: 'https://x/y.jpg', caption: 'cap', aspect: 'auto' });
  });

  test('legacy video → media with 16:9', () => {
    const r = normalizeSlide({ type: 'video', content: 'https://yt' });
    expect(r.type).toBe('media');
    expect(r.source).toBe('video');
    expect(r.aspect).toBe('16:9');
  });

  test('legacy question (single correctIndex) → choice single', () => {
    const r = normalizeSlide({ type: 'question', question: 'Q?', options: ['a', 'b'], correctIndex: 1 });
    expect(r.type).toBe('choice');
    expect(r.correctIndices).toEqual([1]);
    expect(r.mode).toBe('single');
  });

  test('choice with 2+ correct → mode multiple', () => {
    const r = normalizeSlide({ type: 'choice', question: 'Q?', options: ['a', 'b', 'c'], correctIndices: [0, 2] });
    expect(r.mode).toBe('multiple');
  });

  test('truefalse normalized to choice', () => {
    const r = normalizeSlide({ type: 'truefalse', question: 'Sky is blue', correct: true });
    expect(r.type).toBe('choice');
    expect(r.options).toEqual(['True', 'False']);
    expect(r.correctIndices).toEqual([0]);
    expect(r.mode).toBe('truefalse');
  });

  test('legacy fillblank with string blanks + alternatives', () => {
    const r = normalizeSlide({
      type: 'fillblank',
      template: 'There are {{0}} types.',
      blanks: ['eight'],
      alternatives: [['eight', '8']],
    });
    expect(r.blanks).toEqual([{ answers: ['eight', '8'] }]);
    expect(r.mode).toBe('textbox');
  });

  test('flashcard → cards carousel', () => {
    const r = normalizeSlide({ type: 'flashcard', cards: [{ front: 'F', back: 'B' }] });
    expect(r.type).toBe('cards');
    expect(r.mode).toBe('carousel');
  });

  test('matching → match', () => {
    const r = normalizeSlide({ type: 'matching', pairs: [{ left: 'a', right: 'b' }] });
    expect(r.type).toBe('match');
  });

  test('ordering with no correctOrder defaults to identity', () => {
    const r = normalizeSlide({ type: 'ordering', items: ['A', 'B', 'C'] });
    expect(r.type).toBe('order');
    expect(r.correctOrder).toEqual([0, 1, 2]);
  });

  test('unknown type passes through', () => {
    const r = normalizeSlide({ type: 'mystery', foo: 1 });
    expect(r.type).toBe('mystery');
  });
});

describe('validateSlides', () => {
  test('accepts a complete lesson', () => {
    const result = validateSlides([
      { type: 'text', content: 'intro' },
      { type: 'choice', question: 'Q?', options: ['a', 'b'], correctIndex: 0 },
      { type: 'cards', cards: [{ front: 'F', back: 'B' }] },
      { type: 'match', pairs: [{ left: 'a', right: 'b' }, { left: 'c', right: 'd' }] },
      { type: 'order', items: ['A', 'B'] },
      { type: 'fillblank', template: 'X {{0}}', blanks: ['y'] },
      { type: 'table', rows: [['a', 'b'], ['c', 'd']] },
      { type: 'divider', title: 'Break' },
    ]);
    expect(result.ok).toBe(true);
    expect(result.slides).toHaveLength(8);
  });

  test('rejects text without content', () => {
    const result = validateSlides([{ type: 'text', content: '' }]);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/text.*content/);
  });

  test('rejects choice with bad correctIndex', () => {
    const result = validateSlides([{ type: 'choice', question: 'Q?', options: ['a', 'b'], correctIndex: 5 }]);
    expect(result.ok).toBe(false);
  });

  test('rejects non-array input', () => {
    expect(validateSlides(null).ok).toBe(false);
    expect(validateSlides('nope').ok).toBe(false);
  });
});

describe('CANONICAL_TYPES', () => {
  test('lists the nine canonical types', () => {
    expect(CANONICAL_TYPES).toEqual(['text', 'media', 'choice', 'fillblank', 'cards', 'match', 'order', 'table', 'divider']);
  });
});
