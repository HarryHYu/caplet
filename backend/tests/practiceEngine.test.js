const {
  multipleChoiceResult,
  writtenFallback,
} = require('../services/practiceEngine');

describe('practice evaluation', () => {
  const question = {
    marks: 1,
    options: ['Demand falls', 'Supply rises', 'Demand rises'],
    answerKey: { index: 2, value: 'Demand rises', letter: 'C' },
  };

  test.each(['C', 2, 'Demand rises'])(
    'accepts equivalent multiple-choice representation %p',
    (answer) => expect(multipleChoiceResult(question, answer)).toEqual({ correct: true, score: 1 }),
  );

  test('does not expose false certainty when AI is unavailable for writing', () => {
    const result = writtenFallback({
      marks: 4,
      rubric: ['Explains how lower interest rates raise consumption and investment'],
      modelAnswer: 'Lower interest rates reduce borrowing costs and can raise consumption and investment.',
    }, 'Lower interest rates reduce borrowing costs, so households consume and firms invest more.');
    expect(result.confidence).toBe('low');
    expect(result.markingMethod).toBe('heuristic');
    expect(result.score).toBeGreaterThan(0);
  });
});
