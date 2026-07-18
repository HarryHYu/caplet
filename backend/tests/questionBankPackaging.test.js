jest.mock('../models', () => ({
  CurriculumEdition: {
    findOne: jest.fn().mockResolvedValue({ id: 'edition-2025' }),
  },
  CurriculumOutcome: {
    findOrCreate: jest.fn(async ({ where, defaults }) => [{
      id: `outcome-${where.code}`,
      ...where,
      ...defaults,
    }, true]),
  },
  Question: {
    findOrCreate: jest.fn(async ({ where, defaults }) => [{
      id: `question-${where.sourceKey}`,
      ...defaults,
      update: jest.fn(),
    }, true]),
  },
  QuestionOutcome: {
    findOrCreate: jest.fn().mockResolvedValue([{}, true]),
  },
}));

const packagedQuestions = require('../data/economicsQuestionBank.json');
const { ensureEconomicsQuestionBank } = require('../services/questionBankService');

describe('packaged Economics question bank', () => {
  test('seeds from backend-owned data without the frontend source tree', async () => {
    expect(packagedQuestions.length).toBeGreaterThan(100);
    expect(packagedQuestions.filter((question) => (
      question.lifecycleStatus === 'published' && question.responseType === 'multiple_choice'
    )).length).toBeGreaterThanOrEqual(5);
    expect(new Set(packagedQuestions.map((question) => question.sourceKey)).size).toBe(packagedQuestions.length);

    await expect(ensureEconomicsQuestionBank()).resolves.toMatchObject({
      questions: packagedQuestions.length,
      created: packagedQuestions.length,
    });
  });
});
