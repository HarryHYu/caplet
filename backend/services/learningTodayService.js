const { Op } = require('sequelize');
const {
  AssignmentSubmission,
  ClassMembership,
  EconomicsExamSession,
  OutcomeAssignmentConfig,
  PracticeSession,
  ReviewItem,
  StudyPlan,
  UserProgress,
} = require('../models');
const { getNextRecommendation } = require('./recommendationEngine');

const DAY_MS = 24 * 60 * 60 * 1000;

function plain(value) {
  return value?.toJSON ? value.toJSON() : value;
}

function withSource(href, source = 'today') {
  if (!href) return href;
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}source=${encodeURIComponent(source)}`;
}

function dueCopy(dueAt, now) {
  if (!dueAt) return 'Set by your teacher';
  const delta = new Date(dueAt).getTime() - now.getTime();
  if (delta < 0) return 'Overdue — make this your first priority';
  if (delta <= DAY_MS) return 'Due within 24 hours';
  const days = Math.max(1, Math.ceil(delta / DAY_MS));
  return `Due in ${days} ${days === 1 ? 'day' : 'days'}`;
}

function assignmentPriority(dueAt, now) {
  if (!dueAt) return 35;
  const delta = new Date(dueAt).getTime() - now.getTime();
  if (delta < 0) return 5;
  if (delta <= DAY_MS) return 10;
  return 35;
}

function rankTodayActions(actions) {
  return actions
    .filter(Boolean)
    .sort((left, right) => left.priority - right.priority || String(left.dueAt || '').localeCompare(String(right.dueAt || '')) || left.title.localeCompare(right.title))
    .map((action, index) => {
      const rankedAction = { ...action, position: index + 1 };
      delete rankedAction.priority;
      return rankedAction;
    });
}

function recommendationAction(recommendation) {
  if (!recommendation) return null;
  return {
    id: `recommendation:${recommendation.outcome?.id || recommendation.mode || 'diagnostic'}`,
    type: 'recommendation',
    eyebrow: 'Recommended for you',
    title: recommendation.outcome?.title ? `Strengthen ${recommendation.outcome.title}` : 'Build your first mastery signal',
    detail: recommendation.reason || 'A short practice set will help Caplet choose your next useful activity.',
    href: withSource(recommendation.resourcePath || `/practice?subject=${recommendation.subject || 'economics'}&mode=${recommendation.mode || 'diagnostic'}`),
    mode: recommendation.mode || 'diagnostic',
    estimatedMinutes: recommendation.estimatedMinutes || 10,
    priority: 60,
  };
}

async function loadAssignedActions(userId, now) {
  const memberships = await ClassMembership.findAll({ where: { userId, role: 'student' }, attributes: ['classroomId'] });
  const classroomIds = memberships.map((membership) => membership.classroomId);
  if (!classroomIds.length) return [];
  const submissions = await AssignmentSubmission.findAll({
    where: { studentId: userId, status: 'assigned' },
    include: [{ association: 'assignment', required: true, where: { classroomId: { [Op.in]: classroomIds } } }],
  });
  const assignmentIds = submissions.map((submission) => submission.assignmentId);
  const configs = assignmentIds.length
    ? await OutcomeAssignmentConfig.findAll({ where: { assignmentId: { [Op.in]: assignmentIds } }, attributes: ['assignmentId'] })
    : [];
  const adaptiveIds = new Set(configs.map((config) => String(config.assignmentId)));
  return submissions.map((submission) => {
    const assignment = plain(submission.assignment);
    const adaptive = adaptiveIds.has(String(assignment.id));
    const href = adaptive
      ? `/practice?subject=economics&mode=assigned&assignmentId=${encodeURIComponent(assignment.id)}&source=today`
      : assignment.lessonId
        ? `/courses/${assignment.courseId}/lessons/${assignment.lessonId}`
        : `/classes/${assignment.classroomId}`;
    return {
      id: `assignment:${assignment.id}`,
      type: 'assignment',
      eyebrow: 'Teacher assigned',
      title: assignment.title,
      detail: dueCopy(assignment.dueDate, now),
      href,
      mode: adaptive ? 'assigned' : 'classwork',
      dueAt: assignment.dueDate || null,
      priority: assignmentPriority(assignment.dueDate, now),
    };
  });
}

async function getLearningToday(userId, { now = new Date() } = {}) {
  const [assignedActions, practice, exam, plan, dueReviewItems, progress, recommendation] = await Promise.all([
    loadAssignedActions(userId, now),
    PracticeSession.findOne({ where: { userId, status: 'in_progress' }, order: [['lastActivityAt', 'DESC']] }),
    EconomicsExamSession.findOne({ where: { userId, status: 'in_progress' }, order: [['startedAt', 'DESC']] }),
    StudyPlan.findOne({ where: { userId } }),
    ReviewItem.findAll({ where: { userId, nextDueAt: { [Op.lte]: now } }, order: [['nextDueAt', 'ASC']] }),
    UserProgress.findOne({ where: { userId, status: 'in_progress', lessonId: { [Op.ne]: null } }, order: [['lastAccessedAt', 'DESC']] }),
    getNextRecommendation(userId, 'economics'),
  ]);

  const actions = [...assignedActions];
  const practiceData = plain(practice);
  if (practiceData) {
    if (practiceData.assignmentId) {
      const duplicateIndex = actions.findIndex((action) => action.id === `assignment:${practiceData.assignmentId}`);
      if (duplicateIndex >= 0) actions.splice(duplicateIndex, 1);
    }
    const total = Array.isArray(practiceData.questionIds) ? practiceData.questionIds.length : 0;
    actions.push({
      id: `practice:${practiceData.id}`,
      type: 'resume_practice',
      eyebrow: 'Continue learning',
      title: practiceData.assignmentId ? 'Resume your assigned practice' : 'Resume your Economics practice',
      detail: total ? `Continue from question ${Math.min(Number(practiceData.currentIndex || 0) + 1, total)} of ${total}.` : 'Your latest answer and position are saved.',
      href: `/practice?subject=${encodeURIComponent(practiceData.subject)}&session=${practiceData.id}&source=today`,
      mode: practiceData.mode,
      priority: practiceData.assignmentId ? 8 : 25,
    });
  }

  const examData = plain(exam);
  if (examData) actions.push({
    id: `exam:${examData.id}`,
    type: 'resume_exam',
    eyebrow: 'Timed session in progress',
    title: examData.packTitle,
    detail: `Resume before this ${examData.durationMinutes}-minute session expires.`,
    href: `/library/economics/exam-practice/${examData.packId}/session?session=${examData.id}`,
    dueAt: examData.expiresAt,
    priority: 12,
  });

  const incompleteTasks = (plan?.tasks || []).filter((task) => !task.completed);
  incompleteTasks.slice(0, 3).forEach((task) => {
    const dueAt = task.dueDate ? new Date(`${task.dueDate}T23:59:59`) : null;
    const overdue = dueAt && dueAt < now;
    const today = dueAt && dueAt.toDateString() === now.toDateString();
    actions.push({
      id: `study-task:${task.id}`,
      type: 'study_task',
      eyebrow: overdue ? 'Planned task overdue' : today ? 'Today’s study plan' : 'Coming up in your plan',
      title: task.title,
      detail: `${task.subjectLabel || task.subject || 'Study'}${task.estimatedMinutes ? ` · ${task.estimatedMinutes} minutes` : ''}`,
      href: withSource(task.resourcePath || '/study-plan'),
      dueAt: dueAt?.toISOString() || null,
      estimatedMinutes: task.estimatedMinutes || null,
      priority: overdue ? 18 : today ? 30 : 45,
    });
  });

  if (!plan) actions.push({
    id: 'study-plan:setup',
    type: 'study_plan_setup',
    eyebrow: 'Your first step',
    title: 'Build your weekly study plan',
    detail: 'Choose your subjects and available days so Caplet can line up one useful next step.',
    href: '/study-plan',
    priority: 55,
  });

  if (dueReviewItems.length) actions.push({
    id: 'review:due',
    type: 'review',
    eyebrow: 'Due for review',
    title: `${dueReviewItems.length} ${dueReviewItems.length === 1 ? 'item is' : 'items are'} ready for retrieval`,
    detail: 'A few minutes of spaced review will help keep this learning available.',
    href: '/revision?source=today',
    priority: 40,
  });

  const progressData = plain(progress);
  if (progressData) actions.push({
    id: `course:${progressData.courseId}:${progressData.lessonId}`,
    type: 'resume_course',
    eyebrow: 'Continue your course',
    title: 'Return to your latest lesson',
    detail: Number(progressData.lastSlideIndex) > 0 ? `Continue from slide ${Number(progressData.lastSlideIndex) + 1}.` : 'Resume from the beginning of this lesson.',
    href: `/courses/${progressData.courseId}/lessons/${progressData.lessonId}${Number(progressData.lastSlideIndex) > 0 ? `?slide=${progressData.lastSlideIndex}` : ''}`,
    priority: 50,
  });

  actions.push(recommendationAction(recommendation) || {
    id: 'recommendation:diagnostic',
    type: 'recommendation',
    eyebrow: 'Best place to start',
    title: 'Take the quick Economics diagnostic',
    detail: 'Five questions give Caplet the evidence it needs to choose your next useful activity.',
    href: '/practice?subject=economics&mode=diagnostic&source=today',
    mode: 'diagnostic',
    estimatedMinutes: 10,
    priority: 60,
  });
  const queue = rankTodayActions(actions);
  return { generatedAt: now.toISOString(), primaryAction: queue[0] || null, actions: queue.slice(0, 8) };
}

module.exports = { dueCopy, getLearningToday, rankTodayActions, recommendationAction };
