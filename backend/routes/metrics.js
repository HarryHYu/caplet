/**
 * Public metrics endpoint — aggregated platform statistics.
 * No auth required; useful for transparency and public dashboards.
 */
const express = require('express');
const { Op } = require('sequelize');
const {
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
} = require('../models');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Users
    const [totalUsers, usersByRole, usersThisWeek, usersThisMonth] = await Promise.all([
      User.count(),
      User.findAll({
        attributes: ['role'],
        raw: true,
      }).then((rows) => {
        const map = { student: 0, instructor: 0, admin: 0 };
        rows.forEach((r) => { map[r.role] = (map[r.role] || 0) + 1; });
        return map;
      }),
      User.count({ where: { createdAt: { [Op.gte]: oneWeekAgo } } }),
      User.count({ where: { createdAt: { [Op.gte]: oneMonthAgo } } }),
    ]);

    // Content
    const [totalCourses, publishedCourses, totalModules, totalLessons, publishedLessons] = await Promise.all([
      Course.count(),
      Course.count({ where: { isPublished: true } }),
      Module.count(),
      Lesson.count(),
      Lesson.count({ where: { isPublished: true } }),
    ]);

    // Progress (lesson completions, in-progress, etc.)
    const progressCounts = await UserProgress.findAll({
      attributes: ['status'],
      raw: true,
    }).then((rows) => {
      const map = { not_started: 0, in_progress: 0, completed: 0 };
      rows.forEach((r) => { map[r.status] = (map[r.status] || 0) + 1; });
      return map;
    });

    const lessonsCompletedThisWeek = await UserProgress.count({
      where: {
        status: 'completed',
        completedAt: { [Op.gte]: oneWeekAgo },
      },
    });

    const uniqueUsersWithProgress = await UserProgress.count({
      distinct: true,
      col: 'userId',
    });

    const uniqueUsersCompleted = await UserProgress.count({
      distinct: true,
      col: 'userId',
      where: { status: 'completed' },
    });

    // Classes & assignments
    const [totalClasses, totalClassMembers, totalAssignments, assignmentCompletions] = await Promise.all([
      Classroom.count(),
      ClassMembership.count(),
      Assignment.count(),
      AssignmentSubmission.count({ where: { status: 'completed' } }),
    ]);

    // Survey
    let surveyTotal = 0;
    let surveyConfidence = 0;
    try {
      const surveys = await Survey.findAll({ raw: true });
      surveyTotal = surveys.length;
      if (surveys.length > 0) {
        surveyConfidence = (surveys.reduce((s, x) => s + (x.confidence || 0), 0) / surveys.length).toFixed(1);
      }
    } catch {
      // ignore
    }

    // Top courses by completions (approximate via progress)
    const courseProgress = await UserProgress.findAll({
      where: { status: 'completed', courseId: { [Op.ne]: null } },
      attributes: ['courseId'],
      raw: true,
    }).then((rows) => {
      const map = {};
      rows.forEach((r) => {
        const id = r.courseId;
        map[id] = (map[id] || 0) + 1;
      });
      return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, count]) => ({ courseId: id, completions: count }));
    });

    const courseIds = courseProgress.map((c) => c.courseId);
    const coursesById = courseIds.length
      ? (await Course.findAll({
          where: { id: courseIds },
          attributes: ['id', 'title'],
          raw: true,
        })).reduce((acc, c) => {
          acc[c.id] = c.title;
          return acc;
        }, {})
      : {};

    const topCourses = courseProgress.map((c) => ({
      title: coursesById[c.courseId] || 'Unknown',
      completions: c.completions,
    }));

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
      },
      progress: {
        lessonsCompleted: progressCounts.completed || 0,
        inProgress: progressCounts.in_progress || 0,
        notStarted: progressCounts.not_started || 0,
        totalRecords: progressCounts.completed + progressCounts.in_progress + progressCounts.not_started,
        lessonsCompletedThisWeek,
        uniqueUsersWithProgress,
        uniqueUsersCompleted,
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
      topCourses,
    });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ message: 'Failed to load metrics' });
  }
});

module.exports = router;
