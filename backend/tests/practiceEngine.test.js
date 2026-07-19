const {
  multipleChoiceResult,
  validatePracticeCompletion,
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

  test('rejects premature ordinary and assigned completion but permits timed submission', () => {
    expect(() => validatePracticeCompletion({
      mode: 'daily',
      questionIds: ['one', 'two'],
      currentIndex: 1,
    })).toThrow(/every question/);
    expect(() => validatePracticeCompletion({
      mode: 'assigned',
      assignmentId: 'assignment-1',
      questionIds: ['one', 'two'],
      currentIndex: 1,
    })).toThrow(/assigned question/);
    expect(() => validatePracticeCompletion({
      mode: 'timed-exam',
      questionIds: ['one', 'two'],
      currentIndex: 0,
    })).not.toThrow();
  });
});
