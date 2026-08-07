const {
  publicOptions,
  normalizeConfig,
  validateConfig,
  markerSignal,
  recommendationSignal,
  generatePlan
} = require('../services/studyPlanService');

const validConfig = {
  yearLevel: '12',
  subjects: ['economics', 'english-standard'],
  goal: 'Prepare consistently for the HSC',
  examDates: { economics: '2026-08-01', 'english-standard': '2026-09-15' },
  availableDays: [1, 3, 5],
  minutesPerDay: 45,
  diagnosticAnswers: { economics: 2 }
};

describe('studyPlanService', () => {
  test('publishes safe diagnostic options without answer keys', () => {
    const options = publicOptions();
    const labels = options.subjects.map((subject) => subject.label);
    const economics = options.subjects.find((subject) => subject.value === 'economics');

    expect(options.subjects).toHaveLength(41);
    expect(options.subjects.filter((subject) => subject.yearLevels.includes('11'))).toHaveLength(39);
    expect(labels).toEqual(expect.arrayContaining([
      'English Extension 1',
      'English Extension 2',
      'Mathematics Extension 1',
      'Mathematics Extension 2',
      'Software Engineering',
    ]));
    expect(labels).not.toContain('Society & Culture');
    expect(labels).not.toContain('Extension 1');
    expect(labels).not.toContain('Extension 2');
    expect(economics.diagnostic.answer).toBeUndefined();
    expect(economics.diagnostic.options).toHaveLength(4);
    expect(options.subjects.filter((subject) => subject.placeholder).every((subject) => subject.diagnostic === null)).toBe(true);
  });

  test('keeps Stage 6 Mathematics and English courses distinct and fully named', () => {
    const stageSixLabels = publicOptions().subjects
      .filter((subject) => subject.years.includes(12))
      .map((subject) => subject.label);

    expect(stageSixLabels).toEqual(expect.arrayContaining([
      'Mathematics Extension 1',
      'Mathematics Extension 2',
      'English Advanced',
      'English Extension 1',
      'English Extension 2',
    ]));
    expect(stageSixLabels).not.toContain('Extension 1');
    expect(stageSixLabels).not.toContain('Extension 2');
    expect(stageSixLabels).not.toContain('English');
  });

  test('accepts every Year 12 catalogue subject without truncating the selection', () => {
    const subjects = publicOptions().subjects
      .filter((subject) => subject.years.includes(12))
      .map((subject) => subject.value);
    const config = normalizeConfig({
      yearLevel: '12',
      subjects,
      goal: 'Keep every subject moving forward',
      examDates: Object.fromEntries(subjects.map((subject) => [subject, '2026-09-01'])),
      availableDays: [1, 3, 5],
      diagnosticAnswers: Object.fromEntries(subjects.map((subject) => [subject, 0]))
    });

    expect(config.subjects).toEqual(subjects);
    expect(validateConfig(config)).toEqual([]);
  });

  test('excludes Year 12-only extension courses from a Year 11 plan', () => {
    const config = normalizeConfig({
      yearLevel: '11',
      subjects: ['economics', 'english-extension-2', 'mathematics-extension-2'],
    });

    expect(config.subjects).toEqual(['economics']);
  });

  test('normalizes and validates onboarding configuration', () => {
    const config = normalizeConfig({ ...validConfig, subjects: ['economics', 'economics', 'unknown'] });
    expect(config.subjects).toEqual(['economics']);
    expect(config.minutesPerDay).toBe(45);
    expect(validateConfig(config)).toEqual([]);
  });

  test('rejects incomplete diagnostics while allowing unknown exam dates', () => {
    const config = normalizeConfig({ yearLevel: '12', subjects: ['economics'], goal: 'Improve' });
    expect(validateConfig(config)).toEqual([
      expect.stringContaining('diagnostic')
    ]);
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

  test('deep-links a sourced marked answer back to its exact Economics activity', () => {
    const marker = {
      id: 'attempt-2', updatedAt: '2026-07-10T05:00:00Z', estimatedMark: 3, markValue: 6,
      focusArea: 'Monetary policy', gaps: [], sourceResourceId: 'eco12-management-sa-1',
      sourceFocusId: 'year-12-economic-management',
    };
    const plan = generatePlan(validConfig, { marker, now: new Date('2026-07-10T03:00:00Z') });
    expect(plan.tasks[0]).toMatchObject({
      resourceLabel: 'Retry the linked Economics activity',
      resourcePath: '/library/economics/focus/year-12-economic-management?resource=eco12-management-sa-1',
    });
  });

  test('prioritizes a live mastery recommendation in the weekly plan', () => {
    const recommendation = {
      subject: 'economics',
      reasonCode: 'weak_outcome',
      reason: 'Recent evidence shows this outcome needs reinforcement.',
      score: 64.25,
      outcome: { id: 'outcome-12-08', code: 'ECO-12-08', title: 'Economic data analysis' },
      resourcePath: '/practice?mode=weak-topic&outcomeId=outcome-12-08',
    };
    const plan = generatePlan(validConfig, { recommendation, now: new Date('2026-07-10T03:00:00Z') });
    expect(recommendationSignal(recommendation).fingerprint).toContain('outcome-12-08');
    expect(plan.weakTopics[0]).toMatchObject({ topic: 'Economic data analysis', source: 'mastery' });
    expect(plan.tasks[0]).toMatchObject({
      resourceLabel: 'Start adaptive practice',
      resourcePath: '/practice?mode=weak-topic&outcomeId=outcome-12-08',
    });
    expect(plan.signalSummary).toContain('live Economics mastery evidence');
  });
});
