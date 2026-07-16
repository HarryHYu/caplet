jest.mock('../services/questionBankService', () => ({
  ensureEconomicsQuestionBank: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../models', () => ({
  CurriculumOutcome: { findAll: jest.fn() },
  MasteryState: { findAll: jest.fn() },
  Question: { findAll: jest.fn() },
  QuestionOutcome: { findAll: jest.fn() },
}));

const models = require('../models');
const { selectQuestions } = require('../services/practiceEngine');

describe('practice question selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('builds a quick diagnostic from five multiple-choice questions', async () => {
    const questions = Array.from({ length: 7 }, (_, index) => ({
      id: `question-${index + 1}`,
      responseType: 'multiple_choice',
      sourceKey: `source-${index + 1}`,
    }));
    models.Question.findAll.mockResolvedValue(questions);
    models.QuestionOutcome.findAll.mockResolvedValue(questions.map((question, index) => ({
      questionId: question.id,
      outcomeId: `outcome-${index + 1}`,
    })));
    models.CurriculumOutcome.findAll.mockResolvedValue(questions.map((question, index) => ({
      id: `outcome-${index + 1}`,
      code: `E12.${index + 1}`,
      title: `Outcome ${index + 1}`,
    })));

    const selected = await selectQuestions({ userId: 'new-user', subject: 'economics', mode: 'diagnostic' });

    expect(models.Question.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ responseType: 'multiple_choice' }),
    }));
    expect(selected).toHaveLength(5);
    expect(new Set(selected.map((question) => question.id)).size).toBe(5);
  });
});
