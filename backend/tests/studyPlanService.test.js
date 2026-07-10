const {
  publicOptions,
  normalizeConfig,
  validateConfig,
  markerSignal,
  generatePlan
} = require('../services/studyPlanService');

const validConfig = {
  yearLevel: '12',
  subjects: ['economics', 'english'],
  goal: 'Prepare consistently for the HSC',
  examDates: { economics: '2026-08-01', english: '2026-09-15' },
  availableDays: [1, 3, 5],
  minutesPerDay: 45,
  diagnosticAnswers: { economics: 2, english: 0 }
};

describe('studyPlanService', () => {
  test('publishes safe diagnostic options without answer keys', () => {
    const options = publicOptions();
    expect(options.subjects.length).toBeGreaterThanOrEqual(5);
    expect(options.subjects[0].diagnostic.answer).toBeUndefined();
    expect(options.subjects.every((subject) => subject.diagnostic.options.length === 4)).toBe(true);
  });

  test('normalizes and validates onboarding configuration', () => {
    const config = normalizeConfig({ ...validConfig, subjects: ['economics', 'economics', 'unknown'] });
    expect(config.subjects).toEqual(['economics']);
    expect(config.minutesPerDay).toBe(45);
    expect(validateConfig(config)).toEqual([]);
  });

  test('rejects incomplete diagnostics and dates', () => {
    const config = normalizeConfig({ yearLevel: '12', subjects: ['economics'], goal: 'Improve' });
    expect(validateConfig(config)).toEqual(expect.arrayContaining([
      expect.stringContaining('exam date'),
      expect.stringContaining('diagnostic')
    ]));
  });

  test('builds the next seven calendar days using only real routes and requested minutes', () => {
    const plan = generatePlan(validConfig, { now: new Date('2026-07-10T03:00:00Z') });
    expect(plan.tasks).toHaveLength(3);
    expect(plan.tasks.every((task) => task.estimatedMinutes === 45)).toBe(true);
    expect(plan.tasks.every((task) => task.resourcePath.startsWith('/'))).toBe(true);
    expect(plan.tasks.map((task) => new Date(`${task.dueDate}T12:00:00Z`).getUTCDay()))
      .toEqual([5, 1, 3]);
    expect(plan.weakTopics.some((topic) => topic.source === 'diagnostic')).toBe(true);
  });

  test('does not silently replace an explicitly empty schedule', () => {
    const config = normalizeConfig({ ...validConfig, availableDays: [] });
    expect(config.availableDays).toEqual([]);
    expect(validateConfig(config)).toContain('Choose at least one study day');
  });

  test('prioritizes the latest marked-answer signal and preserves completed work', () => {
    const first = generatePlan(validConfig, { now: new Date('2026-07-10T03:00:00Z') });
    first.tasks[0].completed = true;
    first.tasks[0].completedAt = '2026-07-10T04:00:00Z';
    const marker = {
      id: 'attempt-1',
      updatedAt: '2026-07-10T05:00:00Z',
      estimatedMark: 12,
      markValue: 20,
      focusArea: 'Fiscal policy evaluation',
      gaps: []
    };
    const next = generatePlan(validConfig, {
      marker,
      existingTasks: first.tasks,
      now: new Date('2026-07-10T03:00:00Z')
    });
    expect(markerSignal(marker).fingerprint).toContain('attempt-1');
    expect(next.weakTopics[0]).toMatchObject({ topic: 'Fiscal policy evaluation', source: 'marked-answer' });
    expect(next.signalSummary).toContain('12/20');
  });
});
