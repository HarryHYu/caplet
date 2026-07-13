const { Op } = require('sequelize');
const { buildLearningAnalytics, percentage } = require('../services/learningAnalytics');

const NOW = new Date('2026-07-13T12:00:00.000Z');

function dependencies({
  eventTotals = [],
  activityRows = [],
  trendRows = [],
  practiceRows = [],
  masteryCounts = [0, 0, 0, 0],
  confidenceRows = [],
} = {}) {
  const ProductEvent = {
    findAll: jest.fn()
      .mockResolvedValueOnce(eventTotals)
      .mockResolvedValueOnce(activityRows)
      .mockResolvedValueOnce(trendRows),
  };
  const PracticeSession = { findAll: jest.fn().mockResolvedValue(practiceRows) };
  const MasteryState = {
    count: jest.fn(),
    findAll: jest.fn().mockResolvedValue(confidenceRows),
  };
  masteryCounts.forEach((count) => MasteryState.count.mockResolvedValueOnce(count));
  return {
    sequelize: {
      fn: jest.fn((name, ...args) => ({ fn: name, args })),
      col: jest.fn((name) => ({ col: name })),
    },
    ProductEvent,
    PracticeSession,
    MasteryState,
    User: { modelName: 'User' },
    UserPrivacyPreference: { modelName: 'UserPrivacyPreference' },
  };
}

describe('learning analytics', () => {
  test('returns a bounded, consented learning funnel and quality snapshot', async () => {
    const deps = dependencies({
      eventTotals: [
        { type: 'practice_started', learnerCount: '10' },
        { type: 'practice_completed', learnerCount: '7' },
        { type: 'diagnostic_completed', learnerCount: '4' },
        { type: 'recommendation_displayed', learnerCount: '5' },
        { type: 'recommendation_accepted', learnerCount: '2' },
        { type: 'question_attempted', learnerCount: '9' },
      ],
      trendRows: [
        { date: '2026-06-30', type: 'practice_started', learnerCount: '3' },
        { date: '2026-07-13', type: 'practice_completed', learnerCount: '2' },
      ],
      practiceRows: [
        { status: 'completed', count: '12' },
        { status: 'abandoned', count: '3' },
        { status: 'in_progress', count: '5' },
      ],
      masteryCounts: [10, 4, 3, 3],
      confidenceRows: [
        { confidence: 'low', count: '2' },
        { confidence: 'medium', count: '3' },
        { confidence: 'high', count: '5' },
      ],
    });

    const result = await buildLearningAnalytics({ now: NOW, ...deps });

    expect(result).toEqual(expect.objectContaining({
      windowDays: 30,
      consentScope: 'analytics_opt_in',
      funnel: expect.objectContaining({
        practiceStartedLearners: 10,
        practiceCompletedLearners: 7,
        diagnosticCompletedLearners: 4,
        recommendationDisplayedLearners: 5,
        recommendationAcceptedLearners: 2,
        questionAttemptLearners: 9,
        practiceCompletionRate: 70,
        recommendationAcceptanceRate: 40,
      }),
      practiceSessions: { started: 20, completed: 12, completionRate: 60 },
      mastery: {
        totalStates: 10,
        masteredStates: 4,
        developingStates: 3,
        needsSupportStates: 3,
        averageConfidence: 76.7,
        confidenceCounts: { low: 2, medium: 3, high: 5 },
      },
    }));
    expect(result.dailyTrend).toHaveLength(14);
    expect(result.dailyTrend[0]).toEqual(expect.objectContaining({
      date: '2026-06-30',
      practiceStartedLearners: 3,
    }));
    expect(result.dailyTrend[13]).toEqual(expect.objectContaining({
      date: '2026-07-13',
      practiceCompletedLearners: 2,
    }));

    const [funnelQuery, activityQuery, trendQuery] = deps.ProductEvent.findAll.mock.calls.map(([query]) => query);
    expect(funnelQuery.where.type[Op.in]).toEqual(expect.arrayContaining([
      'practice_started', 'practice_completed', 'diagnostic_completed',
    ]));
    expect(funnelQuery.where.userId[Op.ne]).toBeNull();
    expect(funnelQuery.where.occurredAt[Op.between]).toEqual([
      new Date('2026-06-13T12:00:00.000Z'),
      NOW,
    ]);
    expect(trendQuery.where.occurredAt[Op.between][0]).toEqual(
      new Date('2026-06-30T00:00:00.000Z'),
    );
    expect(funnelQuery.attributes).toHaveLength(2);
    expect(funnelQuery.group).toEqual(['type']);

    const aggregateQueries = [
      funnelQuery,
      activityQuery,
      trendQuery,
      deps.PracticeSession.findAll.mock.calls[0][0],
      ...deps.MasteryState.count.mock.calls.map(([query]) => query),
      deps.MasteryState.findAll.mock.calls[0][0],
    ];
    aggregateQueries.forEach((query) => {
      expect(query.include[0]).toEqual(expect.objectContaining({
        as: 'user',
        attributes: [],
        required: true,
      }));
      expect(query.include[0].include[0]).toEqual(expect.objectContaining({
        as: 'privacyPreference',
        attributes: [],
        required: true,
        where: { analyticsEnabled: true },
      }));
    });
  });

  test('fills missing trend days and protects empty denominators', async () => {
    const deps = dependencies();
    const result = await buildLearningAnalytics({ now: NOW, ...deps });

    expect(result.funnel.practiceCompletionRate).toBe(0);
    expect(result.funnel.recommendationAcceptanceRate).toBe(0);
    expect(result.practiceSessions.completionRate).toBe(0);
    expect(result.mastery.averageConfidence).toBe(0);
    expect(result.dailyTrend).toHaveLength(14);
    expect(result.dailyTrend.every((row) => row.questionAttemptLearners === 0)).toBe(true);
    expect(percentage(1, 3)).toBe(33.3);
  });

  test('uses ordered journeys and reports weekly retention', async () => {
    const deps = dependencies({
      activityRows: [
        { userId: 'returning', type: 'practice_started', occurredAt: '2026-07-02T10:00:00Z' },
        { userId: 'out-of-order', type: 'practice_completed', occurredAt: '2026-07-10T09:00:00Z' },
        { userId: 'returning', type: 'practice_started', occurredAt: '2026-07-10T10:00:00Z' },
        { userId: 'returning', type: 'practice_completed', occurredAt: '2026-07-10T10:05:00Z' },
        { userId: 'out-of-order', type: 'practice_started', occurredAt: '2026-07-10T11:00:00Z' },
        { userId: 'recommendation-user', type: 'recommendation_displayed', occurredAt: '2026-07-11T10:00:00Z' },
        { userId: 'recommendation-user', type: 'recommendation_accepted', occurredAt: '2026-07-11T10:01:00Z' },
      ],
    });

    const result = await buildLearningAnalytics({ now: NOW, ...deps });
    expect(result.measurement.orderedJourneysAvailable).toBe(true);
    expect(result.measurement.practice).toEqual({ started: 2, completedAfterStart: 1, rate: 50 });
    expect(result.measurement.recommendations).toEqual({ started: 1, completedAfterStart: 1, rate: 100 });
    expect(result.measurement.weeklyRetention).toEqual(expect.objectContaining({
      previousWeekActiveLearners: 1,
      retainedLearners: 1,
      retentionRate: 100,
    }));
  });
});
