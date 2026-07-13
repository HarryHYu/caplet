const crypto = require('crypto');

/**
 * The MVP subject catalogue. Every resource points to a route that already
 * exists in Caplet; no generated plan can strand a student on a dead link.
 */
const SUBJECTS = {
  economics: {
    label: 'Economics',
    topics: ['Markets and consumers', 'Macroeconomic management', 'The global economy', 'Economic policies'],
    diagnostic: {
      topic: 'Macroeconomic management',
      question: 'Which measure is most commonly used to track changes in the general price level?',
      options: ['Consumer Price Index', 'Unemployment rate', 'Terms of trade', 'Cash balance'],
      answer: 0
    },
    resources: [
      { label: 'Economics resource library', path: '/library/economics', kind: 'Learn' },
      { label: 'Economics practice answer', path: '/edutools/economics-marker', kind: 'Practise' }
    ]
  },
  business: {
    label: 'Business Studies',
    topics: ['Operations', 'Marketing', 'Finance', 'Human resources'],
    diagnostic: {
      topic: 'Finance',
      question: 'Which statement best describes cash flow?',
      options: ['Money moving into and out of a business', 'The total value of business assets', 'Profit after tax only', 'The number of units sold'],
      answer: 0
    },
    resources: [
      { label: 'Browse Business courses', path: '/courses', kind: 'Learn' },
      { label: 'Practise an extended response', path: '/essays', kind: 'Practise' }
    ]
  },
  legal: {
    label: 'Legal Studies',
    topics: ['Crime', 'Human rights', 'Family law', 'Law reform'],
    diagnostic: {
      topic: 'Law reform',
      question: 'What is the main role of precedent in common law?',
      options: ['Guiding decisions in later similar cases', 'Replacing legislation', 'Electing judges', 'Creating a jury'],
      answer: 0
    },
    resources: [
      { label: 'Browse Legal Studies courses', path: '/courses', kind: 'Learn' },
      { label: 'Build an evidence-rich essay', path: '/essays', kind: 'Practise' }
    ]
  },
  english: {
    label: 'English',
    topics: ['Thesis and argument', 'Textual evidence', 'Analysis', 'Essay structure'],
    diagnostic: {
      topic: 'Analysis',
      question: 'Which response moves beyond identifying a technique?',
      options: ['Explaining how it shapes meaning for the audience', 'Naming the technique twice', 'Retelling the plot', 'Adding a longer quotation'],
      answer: 0
    },
    resources: [
      { label: 'Essay Memoriser', path: '/essays', kind: 'Practise' },
      { label: 'Browse English courses', path: '/courses', kind: 'Learn' }
    ]
  },
  mathematics: {
    label: 'Mathematics',
    topics: ['Algebra', 'Functions', 'Calculus', 'Statistics'],
    diagnostic: {
      topic: 'Algebra',
      question: 'If 3x + 6 = 18, what is x?',
      options: ['4', '6', '8', '12'],
      answer: 0
    },
    resources: [
      { label: 'Browse Mathematics courses', path: '/courses', kind: 'Learn' },
      { label: 'Review archived slides', path: '/revision', kind: 'Review' }
    ]
  }
};

const DEFAULT_DAYS = [1, 2, 3, 4, 5];
const VALID_YEAR_LEVELS = new Set(['9', '10', '11', '12', 'other']);

function publicOptions() {
  return {
    yearLevels: [
      { value: '9', label: 'Year 9' },
      { value: '10', label: 'Year 10' },
      { value: '11', label: 'Year 11' },
      { value: '12', label: 'Year 12' },
      { value: 'other', label: 'Other / independent study' }
    ],
    subjects: Object.entries(SUBJECTS).map(([value, subject]) => ({
      value,
      label: subject.label,
      topics: subject.topics,
      diagnostic: {
        topic: subject.diagnostic.topic,
        question: subject.diagnostic.question,
        options: subject.diagnostic.options
      }
    }))
  };
}

function normalizeConfig(input = {}) {
  const subjects = [...new Set(Array.isArray(input.subjects) ? input.subjects : [])]
    .filter((subject) => SUBJECTS[subject])
    .slice(0, 5);
  const hasAvailableDays = Array.isArray(input.availableDays);
  const availableDays = [...new Set(hasAvailableDays ? input.availableDays : DEFAULT_DAYS)]
    .map(Number)
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort();
  const examDates = {};
  const sourceDates = input.examDates && typeof input.examDates === 'object' ? input.examDates : {};
  subjects.forEach((subject) => {
    const value = String(sourceDates[subject] || '');
    if (isDateString(value)) examDates[subject] = value;
  });

  return {
    yearLevel: VALID_YEAR_LEVELS.has(String(input.yearLevel)) ? String(input.yearLevel) : '',
    subjects,
    goal: String(input.goal || '').trim().slice(0, 200),
    examDates,
    availableDays,
    minutesPerDay: Math.round(Math.max(15, Math.min(180, Number(input.minutesPerDay) || 45))),
    diagnosticAnswers: normalizeAnswers(input.diagnosticAnswers, subjects)
  };
}

function validateConfig(config) {
  const errors = [];
  if (!config.yearLevel) errors.push('Choose a year level');
  if (!config.subjects.length) errors.push('Choose at least one subject');
  if (!config.goal) errors.push('Add a study goal');
  if (!config.availableDays.length) errors.push('Choose at least one study day');
  config.subjects.forEach((subject) => {
    if (!config.examDates[subject]) errors.push(`Add an exam date for ${SUBJECTS[subject].label}`);
    if (!Number.isInteger(config.diagnosticAnswers[subject])) {
      errors.push(`Complete the ${SUBJECTS[subject].label} diagnostic`);
    }
  });
  return errors;
}

function normalizeAnswers(answers, subjects) {
  const source = answers && typeof answers === 'object' ? answers : {};
  return subjects.reduce((result, subject) => {
    const value = Number(source[subject]);
    if (Number.isInteger(value) && value >= 0 && value < SUBJECTS[subject].diagnostic.options.length) {
      result[subject] = value;
    }
    return result;
  }, {});
}

function diagnosticWeakTopics(config) {
  return config.subjects.map((subject) => {
    const definition = SUBJECTS[subject];
    const correct = config.diagnosticAnswers[subject] === definition.diagnostic.answer;
    return {
      subject,
      subjectLabel: definition.label,
      topic: correct ? definition.topics[0] : definition.diagnostic.topic,
      reason: correct ? 'Keep this foundation active' : 'Your quick diagnostic flagged this for review',
      source: 'diagnostic',
      priority: correct ? 'medium' : 'high'
    };
  });
}

function markerSignal(attempt) {
  if (!attempt) return null;
  const raw = typeof attempt.toJSON === 'function' ? attempt.toJSON() : attempt;
  const gaps = Array.isArray(raw.gaps) ? raw.gaps : [];
  const topic = String(raw.focusArea || gaps[0] || 'HSC Economics response structure').trim().slice(0, 120);
  const updated = raw.updatedAt ? new Date(raw.updatedAt).toISOString() : '';
  return {
    fingerprint: `marked-answer:${raw.id}:${updated}`,
    summary: `Updated from your latest Economics marked answer${raw.estimatedMark != null && raw.markValue ? ` (${raw.estimatedMark}/${raw.markValue})` : ''}.`,
    weakTopic: {
      subject: 'economics',
      subjectLabel: SUBJECTS.economics.label,
      topic,
      reason: 'Your latest marked answer identified this as the next improvement area',
      source: 'marked-answer',
      priority: 'high',
      resourcePath: raw.sourceFocusId ? `/library/economics/focus/${raw.sourceFocusId}?resource=${encodeURIComponent(raw.sourceResourceId || '')}` : null,
      resourceLabel: raw.sourceFocusId ? 'Retry the linked Economics activity' : null,
    }
  };
}

function recommendationSignal(recommendation) {
  if (!recommendation || recommendation.subject !== 'economics') return null;
  const outcome = recommendation.outcome;
  if (!outcome?.id || !outcome.title) return null;
  return {
    fingerprint: `mastery:${outcome.id}:${recommendation.reasonCode || 'next'}:${Number(recommendation.score || 0).toFixed(2)}`,
    summary: `Updated from your live Economics mastery evidence: ${recommendation.reason}`,
    weakTopic: {
      subject: 'economics',
      subjectLabel: SUBJECTS.economics.label,
      topic: outcome.title,
      reason: recommendation.reason,
      source: 'mastery',
      priority: 'high',
      resourcePath: recommendation.resourcePath || `/practice?mode=weak-topic&outcomeId=${encodeURIComponent(outcome.id)}`,
      resourceLabel: 'Start adaptive practice',
      outcomeId: outcome.id,
      outcomeCode: outcome.code || null,
    },
  };
}

function generatePlan(configInput, { marker = null, recommendation = null, existingTasks = [], now = new Date() } = {}) {
  const config = normalizeConfig(configInput);
  const diagnosticTopics = diagnosticWeakTopics(config);
  const markerData = markerSignal(marker);
  const masteryData = recommendationSignal(recommendation);
  const weakTopics = mergeWeakTopics(diagnosticTopics, markerData?.weakTopic, masteryData?.weakTopic, config.subjects);
  const days = nextStudyDays(config.availableDays, now, 7);
  const completed = new Map(
    (Array.isArray(existingTasks) ? existingTasks : [])
      .filter((task) => task.completed)
      .map((task) => [taskSignature(task), task])
  );

  const tasks = days.map((date, index) => {
    const weak = weakTopics[index % weakTopics.length];
    const definition = SUBJECTS[weak.subject];
    const resource = definition.resources[index % definition.resources.length];
    const dueDate = isoDate(date);
    const priority = examPriority(config.examDates[weak.subject], date, weak.priority);
    const base = {
      id: taskId(dueDate, weak.subject, weak.topic, index),
      dueDate,
      subject: weak.subject,
      subjectLabel: definition.label,
      topic: weak.topic,
      title: `${resource.kind}: ${weak.topic}`,
      resourceLabel: weak.resourceLabel || resource.label,
      resourcePath: weak.resourcePath || resource.path,
      estimatedMinutes: config.minutesPerDay,
      priority,
      completed: false,
      completedAt: null
    };
    const prior = completed.get(taskSignature(base));
    return prior ? { ...base, completed: true, completedAt: prior.completedAt } : base;
  });

  return {
    config,
    weakTopics,
    tasks,
    sourceFingerprint: [markerData?.fingerprint, masteryData?.fingerprint].filter(Boolean).join('|') || diagnosticFingerprint(config),
    signalSummary: [masteryData?.summary, markerData?.summary].filter(Boolean).join(' ') || 'Built from your quick subject diagnostic and exam deadlines.',
    generatedAt: new Date(now).toISOString()
  };
}

function mergeWeakTopics(diagnosticTopics, markerTopic, masteryTopic, subjects) {
  const liveTopics = [masteryTopic, markerTopic].filter((topic) => topic && subjects.includes(topic.subject));
  const topics = [...liveTopics, ...diagnosticTopics];
  const seen = new Set();
  return topics.filter((item) => {
    const key = `${item.subject}:${item.topic.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function nextStudyDays(availableDays, now, count) {
  const start = new Date(now);
  start.setUTCHours(12, 0, 0, 0);
  const result = [];
  for (let offset = 0; offset < count; offset += 1) {
    const candidate = new Date(start);
    candidate.setUTCDate(start.getUTCDate() + offset);
    if (availableDays.includes(candidate.getUTCDay())) result.push(candidate);
  }
  return result;
}

function isDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function examPriority(examDate, taskDate, basePriority) {
  if (!examDate) return basePriority || 'medium';
  const days = Math.ceil((new Date(`${examDate}T12:00:00Z`) - taskDate) / 86400000);
  if (days <= 14) return 'high';
  return basePriority || 'medium';
}

function diagnosticFingerprint(config) {
  return `diagnostic:${crypto.createHash('sha1').update(JSON.stringify(config.diagnosticAnswers)).digest('hex').slice(0, 16)}`;
}

function taskId(dueDate, subject, topic, index) {
  return crypto.createHash('sha1').update(`${dueDate}|${subject}|${topic}|${index}`).digest('hex').slice(0, 20);
}

function taskSignature(task) {
  return `${task.dueDate}|${task.subject}|${task.topic}`;
}

function isoDate(date) {
  return new Date(date).toISOString().slice(0, 10);
}

module.exports = {
  SUBJECTS,
  publicOptions,
  normalizeConfig,
  validateConfig,
  markerSignal,
  recommendationSignal,
  generatePlan,
  taskSignature
};
