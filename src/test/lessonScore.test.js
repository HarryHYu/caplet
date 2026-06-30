import { describe, it, expect } from 'vitest';

import { buildLessonScorePayload } from '../components/lesson/SlideRenderer';

// buildLessonScorePayload turns the player's slides + quizScores map into the
// payload the backend expects: { score: 0-100, answers:[{slideIndex,type,correct}] }.
describe('buildLessonScorePayload', () => {
  const choice = { type: 'choice', question: 'Q', options: ['a', 'b'], correctIndices: [0] };
  const fillblank = { type: 'fillblank', template: '{{0}}', blanks: [{ answers: ['x'] }] };
  const match = { type: 'match', pairs: [{ left: 'a', right: '1' }] };
  const order = { type: 'order', items: ['a', 'b'] };
  const text = { type: 'text', content: 'just reading' };

  it('returns a safe empty payload when there are no interactive slides', () => {
    expect(buildLessonScorePayload([text, text], {})).toEqual({ score: 0, answers: [] });
  });

  it('only includes answered interactive slides and uses real slide indices', () => {
    const slides = [text, choice, text, fillblank];
    // choice at index 1 answered correctly; fillblank at index 3 not answered.
    const payload = buildLessonScorePayload(slides, { 1: true });
    expect(payload.answers).toEqual([{ slideIndex: 1, type: 'choice', correct: true }]);
    expect(payload.score).toBe(100);
  });

  it('computes score as the rounded percentage of answered questions correct', () => {
    const slides = [choice, fillblank, match]; // indices 0,1,2
    const payload = buildLessonScorePayload(slides, { 0: true, 1: false, 2: true });
    // 2 of 3 correct -> 67
    expect(payload.score).toBe(67);
    expect(payload.answers).toEqual([
      { slideIndex: 0, type: 'choice', correct: true },
      { slideIndex: 1, type: 'fillblank', correct: false },
      { slideIndex: 2, type: 'match', correct: true },
    ]);
  });

  it('treats any non-true recorded value as incorrect', () => {
    const payload = buildLessonScorePayload([order], { 0: false });
    expect(payload).toEqual({ score: 0, answers: [{ slideIndex: 0, type: 'order', correct: false }] });
  });

  it('is defensive against bad inputs and never throws', () => {
    expect(buildLessonScorePayload(null, null)).toEqual({ score: 0, answers: [] });
    expect(buildLessonScorePayload(undefined)).toEqual({ score: 0, answers: [] });
    expect(buildLessonScorePayload([null, 'nope', choice], { 2: true })).toEqual({
      score: 100,
      answers: [{ slideIndex: 2, type: 'choice', correct: true }],
    });
  });
});
