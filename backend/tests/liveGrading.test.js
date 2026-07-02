/**
 * Pure unit tests for live-session grading. No database, no sockets —
 * `rng` is injected wherever shuffling happens so results are deterministic.
 */
const {
  isGradable,
  shuffleWithMap,
  prepareQuestion,
  gradeResponse,
  computePoints,
  MAX_POINTS,
  MIN_POINTS,
} = require('../utils/liveGrading');

// Deterministic "rng" that always swaps with the last remaining index —
// reverses the array. Good enough to prove the mapping is honoured without
// needing to hand-derive a real Fisher-Yates trace.
const reverseRng = () => 0.999999;

describe('isGradable', () => {
  it('flags the six interactive types and nothing else', () => {
    for (const type of ['choice', 'fillblank', 'match', 'order', 'hotspot', 'timeline']) {
      expect(isGradable({ type })).toBe(true);
    }
    for (const type of ['text', 'media', 'cards', 'table', 'divider', 'chart', 'diagram', 'embed', 'desmos']) {
      expect(isGradable({ type })).toBe(false);
    }
    expect(isGradable(null)).toBe(false);
  });
});

describe('shuffleWithMap', () => {
  it('shuffled[i] always equals items[originalIndexOfShown[i]]', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];
    const { shuffled, originalIndexOfShown } = shuffleWithMap(items, reverseRng);
    shuffled.forEach((v, i) => {
      expect(v).toBe(items[originalIndexOfShown[i]]);
    });
    expect(originalIndexOfShown.slice().sort()).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('choice grading', () => {
  const slide = { type: 'choice', question: 'Q', options: ['A', 'B', 'C'], correctIndices: [1], mode: 'single', explanation: 'because' };

  it('strips the answer key and explanation from the public slide', () => {
    const { publicSlide } = prepareQuestion(slide);
    expect(publicSlide.correctIndices).toBeUndefined();
    expect(publicSlide.explanation).toBeUndefined();
    expect(publicSlide.options).toEqual(['A', 'B', 'C']);
  });

  it('grades single-select correctly', () => {
    const { answerKey } = prepareQuestion(slide);
    expect(gradeResponse(answerKey, [1])).toBe(true);
    expect(gradeResponse(answerKey, [0])).toBe(false);
    expect(gradeResponse(answerKey, [])).toBe(false);
  });

  it('grades multi-select as an exact set match', () => {
    const multi = { ...slide, mode: 'multiple', correctIndices: [0, 2] };
    const { answerKey } = prepareQuestion(multi);
    expect(gradeResponse(answerKey, [0, 2])).toBe(true);
    expect(gradeResponse(answerKey, [2, 0])).toBe(true); // order doesn't matter
    expect(gradeResponse(answerKey, [0])).toBe(false); // partial isn't a pass
    expect(gradeResponse(answerKey, [0, 1, 2])).toBe(false);
  });
});

describe('fillblank grading', () => {
  const slide = {
    type: 'fillblank',
    template: '{{0}} plus {{1}}',
    blanks: [{ answers: ['two', '2'] }, { answers: ['Paris'], caseSensitive: true }],
  };

  it('hides answers on the public slide but keeps dropdown options', () => {
    const withOptions = { ...slide, blanks: [{ answers: ['two'], options: ['one', 'two'] }] };
    const { publicSlide } = prepareQuestion(withOptions);
    expect(publicSlide.blanks[0].answers).toBeUndefined();
    expect(publicSlide.blanks[0].options).toEqual(['one', 'two']);
  });

  it('matches case-insensitively unless caseSensitive is set', () => {
    const { answerKey } = prepareQuestion(slide);
    expect(gradeResponse(answerKey, ['TWO', 'Paris'])).toBe(true); // blank 0 not case-sensitive
    expect(gradeResponse(answerKey, ['two', 'paris'])).toBe(false); // blank 1 is case-sensitive
    expect(gradeResponse(answerKey, ['three', 'Paris'])).toBe(false);
  });
});

describe('match grading', () => {
  const slide = {
    type: 'match',
    pairs: [{ left: 'Dog', right: 'Woof' }, { left: 'Cat', right: 'Meow' }, { left: 'Cow', right: 'Moo' }],
  };

  it('never exposes which shown right-option belongs to which row', () => {
    const { publicSlide } = prepareQuestion(slide, reverseRng);
    expect(publicSlide.left).toEqual(['Dog', 'Cat', 'Cow']);
    expect(new Set(publicSlide.rightOptions)).toEqual(new Set(['Woof', 'Meow', 'Moo']));
    expect(publicSlide.pairs).toBeUndefined();
  });

  it('grades a fully correct placement (accounting for the shuffle)', () => {
    const { answerKey } = prepareQuestion(slide, reverseRng);
    // Build the "perfect" placement: for each row, find the shown index whose
    // original pair index equals that row.
    const placement = answerKey.originalIndexOfShown.reduce((acc, origIdx, shownIdx) => {
      acc[origIdx] = shownIdx;
      return acc;
    }, []);
    expect(gradeResponse(answerKey, placement)).toBe(true);
  });

  it('grades an incorrect placement as false', () => {
    const { answerKey } = prepareQuestion(slide, reverseRng);
    const n = answerKey.originalIndexOfShown.length;
    const scrambled = Array.from({ length: n }, (_, i) => (i + 1) % n);
    // If that happens to be correct by coincidence, nudge it — the point of
    // this test is just to exercise the "false" path.
    if (gradeResponse(answerKey, scrambled)) {
      scrambled[0] = (scrambled[0] + 1) % n;
    }
    expect(gradeResponse(answerKey, scrambled)).toBe(false);
  });
});

describe('order grading', () => {
  const slide = { type: 'order', prompt: 'Sort', items: ['First', 'Second', 'Third'], correctOrder: [0, 1, 2] };

  it('does not leak correctOrder, only the (possibly reordered) item text', () => {
    const { publicSlide } = prepareQuestion(slide, reverseRng);
    expect(publicSlide.correctOrder).toBeUndefined();
    expect(publicSlide.items.slice().sort()).toEqual(slide.items.slice().sort());
  });

  it('grades the correct sequence as true regardless of shown shuffle', () => {
    const { answerKey } = prepareQuestion(slide, reverseRng);
    // The sequence of shown-indices whose original indices are 0,1,2 in order:
    const correctSequence = [0, 1, 2].map((origIdx) => answerKey.originalIndexOfShown.indexOf(origIdx));
    expect(gradeResponse(answerKey, correctSequence)).toBe(true);
  });

  it('grades a wrong sequence as false', () => {
    const { answerKey } = prepareQuestion(slide, reverseRng);
    const correctSequence = [0, 1, 2].map((origIdx) => answerKey.originalIndexOfShown.indexOf(origIdx));
    const wrongSequence = [...correctSequence].reverse();
    expect(gradeResponse(answerKey, wrongSequence)).toBe(false);
  });
});

describe('timeline grading', () => {
  // Storage order IS correct order, same convention as SlideRenderer.jsx TimelineSlide.
  const slide = { type: 'timeline', events: [{ label: 'A', year: '1900' }, { label: 'B', year: '1950' }, { label: 'C', year: '2000' }] };

  it('grades the chronological sequence as true', () => {
    const { answerKey } = prepareQuestion(slide, reverseRng);
    const correctSequence = [0, 1, 2].map((origIdx) => answerKey.originalIndexOfShown.indexOf(origIdx));
    expect(gradeResponse(answerKey, correctSequence)).toBe(true);
  });

  it('grades an out-of-order sequence as false', () => {
    const { answerKey } = prepareQuestion(slide, reverseRng);
    const correctSequence = [0, 1, 2].map((origIdx) => answerKey.originalIndexOfShown.indexOf(origIdx));
    const wrong = [correctSequence[1], correctSequence[0], correctSequence[2]];
    expect(gradeResponse(answerKey, wrong)).toBe(false);
  });
});

describe('hotspot grading', () => {
  const slide = {
    type: 'hotspot',
    image: 'https://example.com/map.png',
    question: 'Click France',
    regions: [
      { id: 1, label: 'France', x: 10, y: 10, w: 5, h: 5, correct: true },
      { id: 2, label: 'Germany', x: 20, y: 20, w: 5, h: 5, correct: false },
    ],
  };

  it('strips the correct flag from every region on the public slide', () => {
    const { publicSlide } = prepareQuestion(slide);
    expect(publicSlide.regions.every((r) => r.correct === undefined)).toBe(true);
    expect(publicSlide.regions.map((r) => r.id)).toEqual([1, 2]);
  });

  it('grades by region id', () => {
    const { answerKey } = prepareQuestion(slide);
    expect(gradeResponse(answerKey, 1)).toBe(true);
    expect(gradeResponse(answerKey, 2)).toBe(false);
  });
});

describe('non-gradable presentation slides', () => {
  it('passes through unchanged with a null answerKey', () => {
    const slide = { type: 'text', content: 'Hello world' };
    const { publicSlide, answerKey } = prepareQuestion(slide);
    expect(publicSlide).toEqual(slide);
    expect(answerKey).toBeNull();
    expect(gradeResponse(answerKey, 'anything')).toBe(false);
  });
});

describe('computePoints', () => {
  it('always scores zero for a wrong answer', () => {
    expect(computePoints({ correct: false, elapsedMs: 0, windowMs: 20000 })).toBe(0);
    expect(computePoints({ correct: false, elapsedMs: 99999, windowMs: 20000 })).toBe(0);
  });

  it('scores max points for an instant correct answer', () => {
    expect(computePoints({ correct: true, elapsedMs: 0, windowMs: 20000 })).toBe(MAX_POINTS);
  });

  it('decays toward the floor as the window runs out, never going below it', () => {
    const half = computePoints({ correct: true, elapsedMs: 10000, windowMs: 20000 });
    const atDeadline = computePoints({ correct: true, elapsedMs: 20000, windowMs: 20000 });
    const overDeadline = computePoints({ correct: true, elapsedMs: 50000, windowMs: 20000 });
    expect(half).toBeLessThan(MAX_POINTS);
    expect(half).toBeGreaterThan(MIN_POINTS);
    expect(atDeadline).toBe(MIN_POINTS);
    expect(overDeadline).toBe(MIN_POINTS); // clamped, not negative/undefined
  });

  it('falls back to max points when there is no timer window', () => {
    expect(computePoints({ correct: true, elapsedMs: 5000, windowMs: 0 })).toBe(MAX_POINTS);
    expect(computePoints({ correct: true, elapsedMs: 5000, windowMs: null })).toBe(MAX_POINTS);
  });
});
