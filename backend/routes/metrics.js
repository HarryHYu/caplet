const express = require('express');
const { Op } = require('sequelize');
const { requireAdmin } = require('../middleware/auth');
const { buildLearningAnalytics } = require('../services/learningAnalytics');
const {
  sequelize,
  User,
  Course,
  Module,
  Lesson,
  UserProgress,
  Survey,
  Classroom,
  ClassMembership,
  Assignment,
  AssignmentSubmission,
  SavedSlide,
  ChatMessage,
  ProductEvent,
  MasteryState,
  PracticeSession,
  UserPrivacyPreference,
} = require('../models');

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const oneWeekAgo  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── Users ──────────────────────────────────────────────────────────────
    const [totalUsers, usersByRole, usersThisWeek, usersThisMonth] = await Promise.all([
      User.count(),
      User.findAll({ attributes: ['role'], raw: true }).then((rows) => {
        const map = { student: 0, instructor: 0, admin: 0 };
        rows.forEach((r) => { map[r.role] = (map[r.role] || 0) + 1; });
        return map;
      }),
      User.count({ where: { createdAt: { [Op.gte]: oneWeekAgo } } }),
      User.count({ where: { createdAt: { [Op.gte]: oneMonthAgo } } }),
    ]);

    // ── Content ────────────────────────────────────────────────────────────
    const [totalCourses, publishedCourses, totalModules, totalLessons, publishedLessons] = await Promise.all([
      Course.count(),
      Course.count({ where: { isPublished: true } }),
      Module.count(),
      Lesson.count(),
      Lesson.count({ where: { isPublished: true } }),
    ]);

    // Count total individual slides stored across all lessons (Postgres JSONB).
    let totalSlides = 0;
    try {
      const dialect = sequelize.getDialect();
      if (dialect === 'postgres') {
        const [[row]] = await sequelize.query(`
          SELECT COALESCE(SUM(jsonb_array_length(slides)), 0)::int AS total
          FROM lessons
          WHERE slides IS NOT NULL
            AND jsonb_typeof(slides) = 'array'
        `);
        totalSlides = row?.total ?? 0;
      } else {
        // SQLite — iterate in memory
        const rows = await Lesson.findAll({ attributes: ['slides'], raw: true });
        for (const r of rows) {
          const s = typeof r.slides === 'string' ? (() => { try { return JSON.parse(r.slides); } catch { return null; } })() : r.slides;
          if (Array.isArray(s)) totalSlides += s.length;
        }
      }
    } catch { /* non-fatal */ }

    // ── Progress ───────────────────────────────────────────────────────────
    const progressCounts = await UserProgress.findAll({ attributes: ['status'], raw: true })
      .then((rows) => {
        const map = { not_started: 0, in_progress: 0, completed: 0 };
        rows.forEach((r) => { map[r.status] = (map[r.status] || 0) + 1; });
        return map;
      });

    const [lessonsCompletedThisWeek, uniqueUsersWithProgress, uniqueUsersCompleted, totalMinutesSpent] = await Promise.all([
      UserProgress.count({
        where: { status: 'completed', completedAt: { [Op.gte]: oneWeekAgo } },
      }),
      UserProgress.count({ distinct: true, col: 'userId' }),
      UserProgress.count({ distinct: true, col: 'userId', where: { status: 'completed' } }),
      UserProgress.sum('timeSpent').then((v) => v || 0),
    ]);

    // ── Saved slides ───────────────────────────────────────────────────────
    const totalSavedSlides = await SavedSlide.count();

    // ── Classes & assignments ──────────────────────────────────────────────
    const [totalClasses, totalClassMembers, totalAssignments, assignmentCompletions] = await Promise.all([
      Classroom.count(),
      ClassMembership.count(),
      Assignment.count(),
      AssignmentSubmission.count({ where: { status: 'completed' } }),
    ]);

    // ── Chat (AI assistant messages) ───────────────────────────────────────
    let totalChatMessages = 0;
    try {
      totalChatMessages = await ChatMessage.count();
    } catch { /* table might not exist in some envs */ }

    // ── Survey ─────────────────────────────────────────────────────────────
    let surveyTotal = 0;
    let surveyConfidence = 0;
    try {
      const surveys = await Survey.findAll({ raw: true });
      surveyTotal = surveys.length;
      if (surveys.length > 0) {
        surveyConfidence = (surveys.reduce((s, x) => s + (x.confidence || 0), 0) / surveys.length).toFixed(1);
      }
    } catch { /* ignore */ }

    // ── Top courses by completions ─────────────────────────────────────────
    const courseProgressRows = await UserProgress.findAll({
      where: { status: 'completed', courseId: { [Op.ne]: null } },
      attributes: ['courseId'],
      raw: true,
    }).then((rows) => {
      const map = {};
      rows.forEach((r) => { map[r.courseId] = (map[r.courseId] || 0) + 1; });
      return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, count]) => ({ courseId: id, completions: count }));
    });

    const courseIds = courseProgressRows.map((c) => c.courseId);
    const coursesById = courseIds.length
      ? (await Course.findAll({ where: { id: courseIds }, attributes: ['id', 'title'], raw: true }))
          .reduce((acc, c) => { acc[c.id] = c.title; return acc; }, {})
      : {};
    const topCourses = courseProgressRows.map((c) => ({
      title: coursesById[c.courseId] || 'Unknown',
      completions: c.completions,
    }));
    const learning = await buildLearningAnalytics({
      now,
      sequelize,
      ProductEvent,
      MasteryState,
      PracticeSession,
      User,
      UserPrivacyPreference,
    });

    res.json({
      generatedAt: now.toISOString(),
      users: {
        total: totalUsers,
        byRole: usersByRole,
        newThisWeek: usersThisWeek,
        newThisMonth: usersThisMonth,
      },
      content: {
        courses: { total: totalCourses, published: publishedCourses },
        modules: totalModules,
        lessons: { total: totalLessons, published: publishedLessons },
        totalSlides,
      },
      progress: {
        lessonsCompleted: progressCounts.completed || 0,
        inProgress: progressCounts.in_progress || 0,
        notStarted: progressCounts.not_started || 0,
        totalRecords: progressCounts.completed + progressCounts.in_progress + progressCounts.not_started,
        lessonsCompletedThisWeek,
        uniqueUsersWithProgress,
        uniqueUsersCompleted,
        totalMinutesSpent,
      },
      engagement: {
        savedSlides: totalSavedSlides,
        chatMessages: totalChatMessages,
      },
      classes: {
        total: totalClasses,
        totalMembers: totalClassMembers,
      },
      assignments: {
        total: totalAssignments,
        completions: assignmentCompletions,
      },
      survey: {
        totalResponses: surveyTotal,
        averageConfidence: parseFloat(surveyConfidence),
      },
      learning,
      topCourses,
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ message: 'Failed to load metrics' });
  }
});

module.exports = router;
