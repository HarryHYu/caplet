const { Op } = require('sequelize');
const {
  EconomicsExamSession,
  MarkedAttempt,
  PracticeSession,
  StudyPlan,
  UserProgress,
} = require('../models');

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WEEKLY_GOAL = 3;
const HISTORY_DAYS = 366;
const VISIBLE_DAYS = 91;

function parseTimezoneOffset(value = 0) {
  const offset = Number(value);
  if (!Number.isInteger(offset) || offset < -840 || offset > 840) {
    const error = new Error('timezoneOffset must be an integer between -840 and 840');
    error.status = 400;
    throw error;
  }
  return offset;
}

function localDayKey(value, timezoneOffset = 0) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() - timezoneOffset * 60 * 1000).toISOString().slice(0, 10);
}

function shiftDayKey(dayKey, amount) {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function rowValue(row, field) {
  if (!row) return undefined;
  if (typeof row.get === 'function') return row.get(field);
  return row[field];
}

function buildStudyMomentum({ plan, progress = [], practiceSessions = [], markedAttempts = [], examSessions = [] } = {}, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const timezoneOffset = parseTimezoneOffset(options.timezoneOffset ?? 0);
  const today = localDayKey(now, timezoneOffset);
  const earliest = shiftDayKey(today, -(HISTORY_DAYS - 1));
  const activities = new Map();
  const seen = new Set();

  const add = (occurredAt, type, id) => {
    const date = occurredAt instanceof Date ? occurredAt : new Date(occurredAt);
    const day = localDayKey(date, timezoneOffset);
    if (!day || day < earliest || day > today) return;
    const key = `${type}:${id || date.toISOString()}`;
    if (seen.has(key)) return;
    seen.add(key);
    const current = activities.get(day) || { count: 0, types: new Set() };
    current.count += 1;
    current.types.add(type);
    activities.set(day, current);
  };

  const tasks = rowValue(plan, 'tasks');
  for (const task of Array.isArray(tasks) ? tasks : []) {
    if (task?.completed && task.completedAt) add(task.completedAt, 'study_task', task.id);
  }
  for (const item of progress) {
    if (rowValue(item, 'status') === 'completed') add(rowValue(item, 'completedAt'), 'lesson', rowValue(item, 'id'));
  }
  for (const session of practiceSessions) {
    if (rowValue(session, 'status') === 'completed') add(rowValue(session, 'completedAt'), 'practice', rowValue(session, 'id'));
  }
  for (const attempt of markedAttempts) {
    add(rowValue(attempt, 'createdAt'), 'marked_practice', rowValue(attempt, 'id'));
  }
  for (const session of examSessions) {
    if (rowValue(session, 'status') === 'submitted') add(rowValue(session, 'submittedAt'), 'exam_practice', rowValue(session, 'id'));
  }

  const activeDays = [...activities.keys()].sort();
  const activeDaySet = new Set(activeDays);
  let cursor = activeDaySet.has(today) ? today : shiftDayKey(today, -1);
  let currentStreak = 0;
  while (activeDaySet.has(cursor)) {
    currentStreak += 1;
    cursor = shiftDayKey(cursor, -1);
  }

  let bestStreak = 0;
  let running = 0;
  let previous = null;
  for (const day of activeDays) {
    running = previous && shiftDayKey(previous, 1) === day ? running + 1 : 1;
    bestStreak = Math.max(bestStreak, running);
    previous = day;
  }

  const weekday = new Date(`${today}T00:00:00.000Z`).getUTCDay();
  const weekStart = shiftDayKey(today, -((weekday + 6) % 7));
  const weekDays = Array.from({ length: 7 }, (_, index) => shiftDayKey(weekStart, index));
  const weekActiveDays = weekDays.filter((day) => activeDaySet.has(day)).length;
  const availableDays = rowValue(plan, 'availableDays');
  const weeklyGoal = Array.isArray(availableDays) && availableDays.length
    ? Math.min(7, Math.max(1, new Set(availableDays).size))
    : DEFAULT_WEEKLY_GOAL;
  const visibleStart = shiftDayKey(today, -(VISIBLE_DAYS - 1));
  const activityDays = Array.from({ length: VISIBLE_DAYS }, (_, index) => {
    const date = shiftDayKey(visibleStart, index);
    const activity = activities.get(date);
    return {
      date,
      count: activity?.count || 0,
      types: activity ? [...activity.types].sort() : [],
    };
  });

  return {
    currentStreak,
    bestStreak,
    todayComplete: activeDaySet.has(today),
    todayCount: activities.get(today)?.count || 0,
    weekActiveDays,
    weeklyGoal,
    weeklyGoalMet: weekActiveDays >= weeklyGoal,
    activityDays,
  };
}

async function getStudyMomentum(userId, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const timezoneOffset = parseTimezoneOffset(options.timezoneOffset ?? 0);
  const since = new Date(now.getTime() - HISTORY_DAYS * DAY_MS);
  const [plan, progress, practiceSessions, markedAttempts, examSessions] = await Promise.all([
    StudyPlan.findOne({ where: { userId }, attributes: ['tasks', 'availableDays'] }),
    UserProgress.findAll({
      where: { userId, status: 'completed', completedAt: { [Op.gte]: since } },
      attributes: ['id', 'status', 'completedAt'],
    }),
    PracticeSession.findAll({
      where: { userId, status: 'completed', completedAt: { [Op.gte]: since } },
      attributes: ['id', 'status', 'completedAt'],
    }),
    MarkedAttempt.findAll({
      where: { userId, createdAt: { [Op.gte]: since } },
      attributes: ['id', 'createdAt'],
    }),
    EconomicsExamSession.findAll({
      where: { userId, status: 'submitted', submittedAt: { [Op.gte]: since } },
      attributes: ['id', 'status', 'submittedAt'],
    }),
  ]);

  return buildStudyMomentum(
    { plan, progress, practiceSessions, markedAttempts, examSessions },
    { now, timezoneOffset },
  );
}

module.exports = {
  buildStudyMomentum,
  getStudyMomentum,
  localDayKey,
  parseTimezoneOffset,
  shiftDayKey,
};
