const { Op } = require('sequelize');

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 30;
const TREND_DAYS = 14;

const FUNNEL_EVENTS = Object.freeze({
  lesson_started: 'lessonStartedLearners',
  lesson_completed: 'lessonCompletedLearners',
  practice_started: 'practiceStartedLearners',
  practice_completed: 'practiceCompletedLearners',
  diagnostic_completed: 'diagnosticCompletedLearners',
  recommendation_displayed: 'recommendationDisplayedLearners',
  recommendation_accepted: 'recommendationAcceptedLearners',
  question_attempted: 'questionAttemptLearners',
  learning_action_viewed: 'learningActionViewedLearners',
  learning_action_started: 'learningActionStartedLearners',
  activity_resumed: 'activityResumedLearners',
  feedback_viewed: 'feedbackViewedLearners',
  activity_completed: 'activityCompletedLearners',
  next_action_started: 'nextActionStartedLearners',
  study_plan_generated: 'studyPlanGeneratedLearners',
  subject_pack_published: 'subjectPackPublishedAuthors',
});

const TREND_EVENTS = Object.freeze([
  'lesson_started',
  'lesson_completed',
  'practice_started',
  'practice_completed',
  'question_attempted',
  'recommendation_accepted',
  'learning_action_started',
  'activity_completed',
]);

function orderedJourney(rows, startType, completionType) {
  const byUser = new Map();
  for (const row of rows || []) {
    if (!row.userId || ![startType, completionType].includes(row.type)) continue;
    const timestamp = new Date(row.occurredAt).getTime();
    if (!Number.isFinite(timestamp)) continue;
    const state = byUser.get(String(row.userId)) || { startedAt: null, completedAt: null };
    if (row.type === startType && (state.startedAt == null || timestamp < state.startedAt)) state.startedAt = timestamp;
    if (row.type === completionType && (state.completedAt == null || timestamp < state.completedAt)) state.completedAt = timestamp;
    byUser.set(String(row.userId), state);
  }
  const started = [...byUser.values()].filter((state) => state.startedAt != null).length;
  const completedAfterStart = [...byUser.values()].filter((state) => (
    state.startedAt != null && state.completedAt != null && state.completedAt >= state.startedAt
  )).length;
  return { started, completedAfterStart, rate: percentage(completedAfterStart, started) };
}

function weeklyRetention(rows, now) {
  const currentStart = now.getTime() - 7 * DAY_MS;
  const previousStart = now.getTime() - 14 * DAY_MS;
  const current = new Set();
  const previous = new Set();
  for (const row of rows || []) {
    if (!row.userId) continue;
    const timestamp = new Date(row.occurredAt).getTime();
    if (!Number.isFinite(timestamp)) continue;
    if (timestamp >= currentStart && timestamp <= now.getTime()) current.add(String(row.userId));
    else if (timestamp >= previousStart && timestamp < currentStart) previous.add(String(row.userId));
  }
  const retained = [...previous].filter((userId) => current.has(userId)).length;
  return {
    previousWeekActiveLearners: previous.size,
    currentWeekActiveLearners: current.size,
    retainedLearners: retained,
    retentionRate: percentage(retained, previous.size),
  };
}

function productLoopMetrics(rows, now) {
  const ordered = [...(rows || [])].sort((left, right) => new Date(left.occurredAt) - new Date(right.occurredAt));
  const viewed = ordered.filter((row) => row.type === 'learning_action_viewed' && row.userId);
  const fastStarts = new Set();
  viewed.forEach((view) => {
    const viewAt = new Date(view.occurredAt).getTime();
    const match = ordered.find((row) => row.type === 'next_action_started'
      && String(row.userId) === String(view.userId)
      && (!view.entityId || !row.entityId || String(row.entityId) === String(view.entityId))
      && new Date(row.occurredAt).getTime() >= viewAt
      && new Date(row.occurredAt).getTime() - viewAt <= 60_000);
    if (match) fastStarts.add(String(view.userId));
  });
  const viewedLearners = new Set(viewed.map((row) => String(row.userId)));

  const plans = ordered.filter((row) => row.type === 'study_plan_generated' && row.userId);
  const activated = new Set();
  plans.forEach((plan) => {
    const planAt = new Date(plan.occurredAt).getTime();
    const match = ordered.find((row) => ['practice_completed', 'diagnostic_completed'].includes(row.type)
      && String(row.userId) === String(plan.userId)
      && new Date(row.occurredAt).getTime() >= planAt
      && new Date(row.occurredAt).getTime() - planAt <= 7 * DAY_MS);
    if (match) activated.add(String(plan.userId));
  });
  const planLearners = new Set(plans.map((row) => String(row.userId)));

  const weekStart = now.getTime() - 7 * DAY_MS;
  const activeDays = new Map();
  ordered.filter((row) => row.userId
    && new Date(row.occurredAt).getTime() >= weekStart
    && ['activity_completed', 'practice_completed', 'diagnostic_completed', 'lesson_completed'].includes(row.type))
    .forEach((row) => {
      const key = String(row.userId);
      if (!activeDays.has(key)) activeDays.set(key, new Set());
      activeDays.get(key).add(dateKey(row.occurredAt));
    });
  const threeDayLearners = [...activeDays.values()].filter((days) => days.size >= 3).length;

  const published = ordered.filter((row) => row.type === 'subject_pack_published');
  const evidencedPacks = new Set();
  published.forEach((pack) => {
    const subject = pack.metadata?.subject;
    if (!subject) return;
    const publishedAt = new Date(pack.occurredAt).getTime();
    const match = ordered.find((row) => row.type === 'activity_completed'
      && row.metadata?.subject === subject
      && new Date(row.occurredAt).getTime() >= publishedAt);
    if (match) evidencedPacks.add(String(pack.entityId || subject));
  });

  return {
    usefulActionWithin60Seconds: {
      eligibleLearners: viewedLearners.size,
      learners: fastStarts.size,
      rate: percentage(fastStarts.size, viewedLearners.size),
    },
    activatedAfterPlan: {
      eligibleLearners: planLearners.size,
      learners: activated.size,
      rate: percentage(activated.size, planLearners.size),
    },
    threeActiveDaysInSeven: {
      activeLearners: activeDays.size,
      learners: threeDayLearners,
      rate: percentage(threeDayLearners, activeDays.size),
    },
    publishedPackToEvidence: {
      publishedPacks: published.length,
      packsWithEvidence: evidencedPacks.size,
      rate: percentage(evidencedPacks.size, published.length),
    },
  };
}

function percentage(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((Number(numerator || 0) / Number(denominator)) * 1000) / 10;
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dateKey(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value || '').slice(0, 10);
}

function consentedUserInclude(User, UserPrivacyPreference) {
  return [{
    model: User,
    as: 'user',
    attributes: [],
    required: true,
    include: [{
      model: UserPrivacyPreference,
      as: 'privacyPreference',
      attributes: [],
      required: true,
      where: { analyticsEnabled: true },
    }],
  }];
}

function rowsToMap(rows, keyName, valueName = 'count') {
  return (rows || []).reduce((result, row) => {
    result[row[keyName]] = Number(row[valueName] || 0);
    return result;
  }, {});
}

async function buildLearningAnalytics({
  now = new Date(),
  sequelize,
  ProductEvent,
  MasteryState,
  PracticeSession,
  User,
  UserPrivacyPreference,
}) {
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * DAY_MS);
  const trendStart = new Date(startOfUtcDay(now).getTime() - (TREND_DAYS - 1) * DAY_MS);
  const eventDate = sequelize.fn('DATE', sequelize.col('ProductEvent.occurredAt'));
  const uniqueLearners = sequelize.fn(
    'COUNT',
    sequelize.fn('DISTINCT', sequelize.col('ProductEvent.userId')),
  );
  const consentedUsers = () => consentedUserInclude(User, UserPrivacyPreference);

  const [
    eventTotals,
    activityRows,
    trendRows,
    practiceRows,
    totalMasteryStates,
    masteredStates,
    developingStates,
    needsSupportStates,
    confidenceRows,
  ] = await Promise.all([
    ProductEvent.findAll({
      attributes: ['type', [uniqueLearners, 'learnerCount']],
      where: {
        type: { [Op.in]: Object.keys(FUNNEL_EVENTS) },
        userId: { [Op.ne]: null },
        occurredAt: { [Op.between]: [windowStart, now] },
      },
      include: consentedUsers(),
      group: ['type'],
      raw: true,
    }),
    ProductEvent.findAll({
      attributes: ['userId', 'type', 'entityId', 'metadata', 'occurredAt'],
      where: {
        type: { [Op.in]: Object.keys(FUNNEL_EVENTS) },
        userId: { [Op.ne]: null },
        occurredAt: { [Op.between]: [windowStart, now] },
      },
      include: consentedUsers(),
      order: [['occurredAt', 'ASC']],
      raw: true,
    }),
    ProductEvent.findAll({
      attributes: [[eventDate, 'date'], 'type', [uniqueLearners, 'learnerCount']],
      where: {
        type: { [Op.in]: TREND_EVENTS },
        userId: { [Op.ne]: null },
        occurredAt: { [Op.between]: [trendStart, now] },
      },
      include: consentedUsers(),
      group: [eventDate, 'type'],
      order: [[eventDate, 'ASC'], ['type', 'ASC']],
      raw: true,
    }),
    PracticeSession.findAll({
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('PracticeSession.id')), 'count'],
      ],
      where: { startedAt: { [Op.between]: [windowStart, now] } },
      include: consentedUsers(),
      group: ['status'],
      raw: true,
    }),
    MasteryState.count({
      where: { calculatedAt: { [Op.between]: [windowStart, now] } },
      include: consentedUsers(),
    }),
    MasteryState.count({
      where: {
        calculatedAt: { [Op.between]: [windowStart, now] },
        probability: { [Op.gte]: 0.8 },
      },
      include: consentedUsers(),
    }),
    MasteryState.count({
      where: {
        calculatedAt: { [Op.between]: [windowStart, now] },
        probability: { [Op.gte]: 0.5, [Op.lt]: 0.8 },
      },
      include: consentedUsers(),
    }),
    MasteryState.count({
      where: {
        calculatedAt: { [Op.between]: [windowStart, now] },
        probability: { [Op.lt]: 0.5 },
      },
      include: consentedUsers(),
    }),
    MasteryState.findAll({
      attributes: [
        'confidence',
        [sequelize.fn('COUNT', sequelize.col('MasteryState.id')), 'count'],
      ],
      where: { calculatedAt: { [Op.between]: [windowStart, now] } },
      include: consentedUsers(),
      group: ['confidence'],
      raw: true,
    }),
  ]);

  const funnel = Object.values(FUNNEL_EVENTS).reduce((result, key) => {
    result[key] = 0;
    return result;
  }, {});
  eventTotals.forEach((row) => {
    const key = FUNNEL_EVENTS[row.type];
    if (key) funnel[key] = Number(row.learnerCount || 0);
  });
  const practiceJourney = orderedJourney(activityRows, 'practice_started', 'practice_completed');
  const recommendationJourney = orderedJourney(activityRows, 'recommendation_displayed', 'recommendation_accepted');
  const lessonJourney = orderedJourney(activityRows, 'lesson_started', 'lesson_completed');
  const learningLoopJourney = orderedJourney(activityRows, 'learning_action_started', 'activity_completed');
  const hasOrderedRows = Array.isArray(activityRows) && activityRows.length > 0;
  funnel.practiceCompletionRate = hasOrderedRows
    ? practiceJourney.rate
    : percentage(funnel.practiceCompletedLearners, funnel.practiceStartedLearners);
  funnel.recommendationAcceptanceRate = hasOrderedRows
    ? recommendationJourney.rate
    : percentage(funnel.recommendationAcceptedLearners, funnel.recommendationDisplayedLearners);
  funnel.lessonCompletionRate = hasOrderedRows
    ? lessonJourney.rate
    : percentage(funnel.lessonCompletedLearners, funnel.lessonStartedLearners);
  funnel.learningLoopCompletionRate = hasOrderedRows
    ? learningLoopJourney.rate
    : percentage(funnel.activityCompletedLearners, funnel.learningActionStartedLearners);

  const trendByDate = new Map();
  trendRows.forEach((row) => {
    const day = dateKey(row.date);
    if (!trendByDate.has(day)) trendByDate.set(day, {});
    trendByDate.get(day)[row.type] = Number(row.learnerCount || 0);
  });
  const dailyTrend = Array.from({ length: TREND_DAYS }, (_, index) => {
    const date = new Date(trendStart.getTime() + index * DAY_MS).toISOString().slice(0, 10);
    const values = trendByDate.get(date) || {};
    return {
      date,
      practiceStartedLearners: values.practice_started || 0,
      practiceCompletedLearners: values.practice_completed || 0,
      lessonStartedLearners: values.lesson_started || 0,
      lessonCompletedLearners: values.lesson_completed || 0,
      questionAttemptLearners: values.question_attempted || 0,
      recommendationAcceptedLearners: values.recommendation_accepted || 0,
      learningActionStartedLearners: values.learning_action_started || 0,
      activityCompletedLearners: values.activity_completed || 0,
    };
  });

  const practiceByStatus = rowsToMap(practiceRows, 'status');
  const practiceStarted = Object.values(practiceByStatus).reduce((sum, count) => sum + count, 0);
  const practiceCompleted = practiceByStatus.completed || 0;
  const confidenceCounts = {
    low: 0,
    medium: 0,
    high: 0,
    ...rowsToMap(confidenceRows, 'confidence'),
  };
  const confidenceWeight = (
    confidenceCounts.low * 33
    + confidenceCounts.medium * 67
    + confidenceCounts.high * 100
  );

  return {
    windowDays: WINDOW_DAYS,
    windowStart: windowStart.toISOString(),
    trendDays: TREND_DAYS,
    consentScope: 'analytics_opt_in',
    measurement: {
      orderedJourneysAvailable: hasOrderedRows,
      practice: practiceJourney,
      recommendations: recommendationJourney,
      lessons: lessonJourney,
      learningLoop: learningLoopJourney,
      weeklyRetention: weeklyRetention(activityRows, now),
      productLoop: productLoopMetrics(activityRows, now),
    },
    funnel,
    practiceSessions: {
      started: practiceStarted,
      completed: practiceCompleted,
      completionRate: percentage(practiceCompleted, practiceStarted),
    },
    mastery: {
      totalStates: Number(totalMasteryStates || 0),
      masteredStates: Number(masteredStates || 0),
      developingStates: Number(developingStates || 0),
      needsSupportStates: Number(needsSupportStates || 0),
      averageConfidence: percentage(confidenceWeight, Number(totalMasteryStates || 0) * 100),
      confidenceCounts,
    },
    dailyTrend,
  };
}

module.exports = {
  buildLearningAnalytics,
  percentage,
  TREND_DAYS,
  WINDOW_DAYS,
  productLoopMetrics,
};
