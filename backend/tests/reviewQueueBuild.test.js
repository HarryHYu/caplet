jest.mock('../models', () => ({
  Course: {},
  Essay: { findAll: jest.fn() },
  Lesson: {},
  MasteryState: { findAll: jest.fn() },
  Question: {},
  QuestionOutcome: { findAll: jest.fn() },
  ReviewItem: { findAll: jest.fn() },
  SavedSlide: { findAll: jest.fn() },
}));

const models = require('../models');
const { getReviewQueue } = require('../services/reviewQueueService');

describe('getReviewQueue', () => {
  beforeEach(() => jest.clearAllMocks());

  test('hydrates due outcomes, saved slides, and essay paragraphs into one bounded session', async () => {
    models.MasteryState.findAll.mockResolvedValue([{
      outcomeId: 'outcome-1',
      nextReviewAt: new Date('2026-07-20T00:00:00.000Z'),
      misconceptions: ['Primary and secondary markets were confused.'],
      outcome: {
        id: 'outcome-1',
        code: 'ECO-11-02',
        title: 'Markets and institutions',
        subject: 'economics',
      },
    }]);
    models.QuestionOutcome.findAll.mockResolvedValue([{
      outcomeId: 'outcome-1',
      isPrimary: true,
      question: {
        id: 'question-1',
        prompt: 'A company issuing new shares is using which market?',
        responseType: 'multiple_choice',
        options: ['A secondary debt market', 'An equity market'],
        answerKey: 'B',
        explanation: 'New shares raise equity capital.',
        marks: 1,
      },
    }]);
    models.SavedSlide.findAll.mockResolvedValue([{
      id: 'slide-1',
      slideIndex: 0,
      createdAt: new Date('2026-07-21T00:00:00.000Z'),
      lesson: {
        title: 'Market failure',
        slides: [{ type: 'content', title: 'Externalities', body: 'External costs spill over to third parties.' }],
      },
      course: { title: 'Economics' },
    }]);
    models.ReviewItem.findAll
      .mockResolvedValueOnce([{
        itemType: 'essayParagraph',
        itemId: 'essay-1:0',
        nextDueAt: new Date('2026-07-22T00:00:00.000Z'),
        lastRecall: 'pass',
      }])
      .mockResolvedValueOnce([]);
    models.Essay.findAll.mockResolvedValue([{
      id: 'essay-1',
      title: 'Markets essay',
      parsedStructure: {
        bodyParagraphs: [{
          topicSentence: 'Information failure can reduce allocative efficiency.',
          text: 'Information failure can reduce allocative efficiency when one party knows more than another.',
          quotes: [],
        }],
      },
    }]);

    const queue = await getReviewQueue('user-1', {
      now: new Date('2026-07-26T00:00:00.000Z'),
    });

    expect(queue).toMatchObject({
      totalDue: 3,
      truncated: false,
    });
    expect(queue.items).toHaveLength(3);
    expect(queue.items.map((item) => item.itemType)).toEqual(
      expect.arrayContaining(['outcome', 'savedSlide', 'essayParagraph']),
    );
    expect(queue.groups).toEqual([
      expect.objectContaining({ id: 'outcomes', count: 1 }),
      expect.objectContaining({ id: 'savedSlides', count: 1 }),
      expect.objectContaining({ id: 'essays', count: 1 }),
    ]);
    expect(queue.items.find((item) => item.itemType === 'outcome')).toMatchObject({
      answer: 'An equity market',
      repairPrompt: 'Apply Markets and institutions to a different real-world example.',
    });
  });
});
