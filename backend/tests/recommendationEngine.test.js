jest.mock('../models', () => ({
  CurriculumOutcome: { findAll: jest.fn() },
  MasteryState: { findAll: jest.fn() },
  QuestionOutcome: { findAll: jest.fn() },
  Question: { count: jest.fn() },
}));

const models = require('../models');
const { getNextRecommendation } = require('../services/recommendationEngine');

describe('recommendationEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    models.CurriculumOutcome.findAll.mockResolvedValue([
      { id: 'outcome-1', code: 'E12.1', title: 'Apply economic concepts' },
    ]);
  });

  test('starts a learner without mastery evidence on a diagnostic', async () => {
    models.MasteryState.findAll.mockResolvedValue([]);

    const recommendation = await getNextRecommendation('new-user', 'economics');

    expect(recommendation).toMatchObject({
      mode: 'diagnostic',
      reasonCode: 'diagnostic_needed',
      outcome: null,
      resourcePath: '/practice?subject=economics&mode=diagnostic',
    });
    expect(models.QuestionOutcome.findAll).not.toHaveBeenCalled();
  });

  test('does not invent mastery states for outcomes the learner has never attempted', async () => {
    const demonstratedOutcome = { id: 'outcome-1', code: 'E12.1', title: 'Apply economic concepts' };
    models.CurriculumOutcome.findAll.mockResolvedValue([
      demonstratedOutcome,
      { id: 'outcome-2', code: 'E12.2', title: 'Analyse policy' },
    ]);
    models.MasteryState.findAll.mockResolvedValue([{
      outcomeId: 'outcome-1',
      probability: 0.4,
      retentionStrength: 0.4,
      confidence: 'medium',
      nextReviewAt: null,
    }]);
    models.QuestionOutcome.findAll.mockResolvedValue([{ questionId: 'question-1' }]);
    models.Question.count.mockResolvedValue(1);

    const recommendation = await getNextRecommendation('returning-user', 'economics');

    expect(recommendation.outcome).toEqual(demonstratedOutcome);
    expect(models.QuestionOutcome.findAll).toHaveBeenCalledTimes(1);
  });
});
