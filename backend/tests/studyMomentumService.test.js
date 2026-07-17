const {
  buildStudyMomentum,
  localDayKey,
  parseTimezoneOffset,
} = require('../services/studyMomentumService');

describe('studyMomentumService', () => {
  test('counts consecutive meaningful study days and deduplicates source records', () => {
    const momentum = buildStudyMomentum({
      plan: {
        availableDays: [1, 3, 5],
        tasks: [
          { id: 'task-1', completed: true, completedAt: '2026-07-17T02:00:00.000Z' },
          { id: 'task-2', completed: true, completedAt: '2026-07-16T03:00:00.000Z' },
        ],
      },
      progress: [
        { id: 'lesson-1', status: 'completed', completedAt: '2026-07-15T04:00:00.000Z' },
        { id: 'lesson-1', status: 'completed', completedAt: '2026-07-15T04:00:00.000Z' },
      ],
      practiceSessions: [
        { id: 'practice-1', status: 'completed', completedAt: '2026-07-17T05:00:00.000Z' },
      ],
    }, { now: new Date('2026-07-17T12:00:00.000Z'), timezoneOffset: 0 });

    expect(momentum.currentStreak).toBe(3);
    expect(momentum.bestStreak).toBe(3);
    expect(momentum.todayComplete).toBe(true);
    expect(momentum.todayCount).toBe(2);
    expect(momentum.weeklyGoal).toBe(3);
    expect(momentum.weekActiveDays).toBe(3);
    expect(momentum.weeklyGoalMet).toBe(true);
  });

  test('keeps yesterday active until the current day ends', () => {
    const momentum = buildStudyMomentum({
      markedAttempts: [
        { id: 'attempt-1', createdAt: '2026-07-16T08:00:00.000Z' },
        { id: 'attempt-2', createdAt: '2026-07-15T08:00:00.000Z' },
      ],
    }, { now: new Date('2026-07-17T06:00:00.000Z'), timezoneOffset: 0 });

    expect(momentum.todayComplete).toBe(false);
    expect(momentum.currentStreak).toBe(2);
  });

  test('groups completions using the learner timezone offset', () => {
    expect(localDayKey('2026-07-16T16:30:00.000Z', -480)).toBe('2026-07-17');
    expect(() => parseTimezoneOffset('900')).toThrow(/between -840 and 840/);
  });
});
