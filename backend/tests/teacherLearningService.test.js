const {
  buildClassAnalytics,
  currentEvidence,
  refreshMasteryAfterOverride,
  selectAssignmentQuestions,
} = require('../services/teacherLearningService');

const OUTCOME_A = '11111111-1111-4111-8111-111111111111';
const OUTCOME_B = '22222222-2222-4222-8222-222222222222';
const QUESTION_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const QUESTION_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('teacherLearningService', () => {
  test('analytics exposes heatmap, profiles, misconceptions, interventions and remediation groups', () => {
    const analytics = buildClassAnalytics({
      students: [
        { id: 'student-1', firstName: 'Ada', lastName: 'Lovelace' },
        { id: 'student-2', firstName: 'Charles', lastName: 'Babbage' },
      ],
      outcomes: [
        { id: OUTCOME_A, code: 'E1', title: 'Markets', sortOrder: 1 },
        { id: OUTCOME_B, code: 'E2', title: 'Policy', sortOrder: 2 },
      ],
      states: [
        { userId: 'student-1', outcomeId: OUTCOME_A, probability: 0.35, evidenceCount: 2, confidence: 'medium' },
        { userId: 'student-2', outcomeId: OUTCOME_A, probability: 0.9, evidenceCount: 4, confidence: 'high' },
      ],
      evidence: [
        {
          id: 'evidence-original', userId: 'student-1', outcomeId: OUTCOME_A,
          misconceptionCodes: ['demand-vs-quantity-demanded'],
        },
        {
          id: 'evidence-revision', revisionOfId: 'evidence-original', userId: 'student-1',
          outcomeId: OUTCOME_A, misconceptionCodes: ['movement-vs-shift'],
        },
      ],
      threshold: 0.6,
      now: new Date('2026-07-13T00:00:00Z'),
    });

    expect(analytics.heatmap.cells).toHaveLength(4);
    expect(analytics.individualProfiles).toHaveLength(2);
    expect(analytics.studentsNeedingIntervention.map((item) => item.student.id))
      .toEqual(expect.arrayContaining(['student-1', 'student-2']));
    expect(analytics.recommendedGroups).toEqual(expect.arrayContaining([
      expect.objectContaining({
        outcome: expect.objectContaining({ id: OUTCOME_A }),
        studentIds: ['student-1'],
      }),
    ]));
    expect(analytics.commonMisconceptions).toEqual([
      expect.objectContaining({ code: 'movement-vs-shift', count: 1 }),
    ]);
    expect(analytics.summary.evidenceCount).toBe(1);
  });

  test('currentEvidence retains only the leaves of an immutable revision chain', () => {
    const records = [
      { id: 'one' },
      { id: 'two', revisionOfId: 'one' },
      { id: 'three', revisionOfId: 'two' },
      { id: 'unrelated' },
    ];
    expect(currentEvidence(records).map((item) => item.id)).toEqual(['three', 'unrelated']);
  });

  test('balanced question selection covers outcomes and excludes drafts', async () => {
    const QuestionOutcome = {
      findAll: jest.fn().mockResolvedValue([
        { questionId: QUESTION_A, outcomeId: OUTCOME_A, weight: 1 },
        { questionId: QUESTION_B, outcomeId: OUTCOME_B, weight: 1 },
      ]),
    };
    const Question = {
      findAll: jest.fn().mockResolvedValue([
        { id: QUESTION_A, status: 'published', difficulty: 'medium' },
        { id: QUESTION_B, status: 'draft', difficulty: 'medium' },
      ]),
    };

    const selected = await selectAssignmentQuestions({
      outcomeIds: [OUTCOME_A, OUTCOME_B],
      selection: { count: 2, difficulties: ['medium'] },
      Question,
      QuestionOutcome,
    });

    expect(selected).toEqual([QUESTION_A]);
  });

  test('manual selection rejects a question outside the selected outcomes', async () => {
    const QuestionOutcome = {
      findAll: jest.fn().mockResolvedValue([
        { questionId: QUESTION_A, outcomeId: OUTCOME_A, weight: 1 },
      ]),
    };
    await expect(selectAssignmentQuestions({
      outcomeIds: [OUTCOME_A],
      requestedQuestionIds: [QUESTION_B],
      selection: { strategy: 'manual' },
      Question: { findAll: jest.fn() },
      QuestionOutcome,
    })).rejects.toMatchObject({ status: 400 });
  });

  test('mastery refresh ignores the superseded score after an override', async () => {
    const original = {
      id: 'original', userId: 'student-1', outcomeId: OUTCOME_A,
      score: 0, maxScore: 10, normalizedScore: 0,
      markingMethod: 'ai', assessmentType: 'practice', difficulty: 'medium',
      occurredAt: new Date('2026-07-12T00:00:00Z'),
    };
    const revision = {
      id: 'revision', revisionOfId: 'original', userId: 'student-1', outcomeId: OUTCOME_A,
      score: 10, maxScore: 10, normalizedScore: 1,
      markingMethod: 'human', assessmentType: 'practice', difficulty: 'medium',
      occurredAt: new Date('2026-07-13T00:00:00Z'),
    };
    const state = { version: 1, update: jest.fn() };
    const LearningEvidence = { findAll: jest.fn().mockResolvedValue([original, revision]) };
    const MasteryState = { findOrCreate: jest.fn().mockResolvedValue([state, false]) };

    await refreshMasteryAfterOverride({
      userId: 'student-1',
      outcomeId: OUTCOME_A,
      LearningEvidence,
      MasteryState,
      now: new Date('2026-07-13T01:00:00Z'),
    });

    expect(state.update).toHaveBeenCalledWith(
      expect.objectContaining({ evidenceCount: 1, probability: expect.any(Number), version: 2 }),
      { transaction: undefined },
    );
    expect(state.update.mock.calls[0][0].probability).toBeGreaterThan(0.4);
  });
});
