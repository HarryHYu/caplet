const express = require('express');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const {
  User,
  Classroom,
  ClassMembership,
  Assignment,
  AssignmentSubmission,
  Course,
  Lesson,
  ClassAnnouncement,
  Comment,
  CommentModerationRecord,
  CommentModerationAction,
  TeacherProfile,
} = require('../models');
const { sequelize } = require('../config/database');
const { createRateLimiter } = require('../middleware/rateLimit');
const { notifyModerationQueue } = require('../services/moderationNotifications');
const {
  ageInYears,
  hasRecordedConsent,
  latestConsent,
  requiresGuardianConsent,
} = require('../services/privacyConsent');

const router = express.Router();

const { requireAuth } = require('../middleware/auth');

const COMMENT_MAX_LENGTH = 2000;
const COMMENT_REPORT_REASONS = ['bullying', 'harassment', 'inappropriate', 'privacy', 'spam', 'other'];
const MODERATION_ACTION_STATUSES = ['reviewed', 'dismissed', 'actioned'];
const INDEPENDENT_REVIEW_REASONS = new Set(['bullying', 'harassment', 'privacy']);
const MODERATION_SLA_MS = 24 * 60 * 60 * 1000;
const commentCreateLimiter = createRateLimiter({
  scope: 'class_comment_create',
  windowMs: 60 * 1000,
  max: 10,
  message: 'You are posting comments too quickly. Please wait a moment and try again.',
});
const commentReportLimiter = createRateLimiter({
  scope: 'class_comment_report',
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'You have submitted several reports. Please wait before reporting again.',
});
const classJoinLimiter = createRateLimiter({
  scope: 'class_join',
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many join attempts. Please wait before trying again.',
});

const hasVerifiedTeacherAccess = async (req) => {
  if (req.user?.role === 'admin') return true;
  if (req.user?.role !== 'instructor') return false;
  if (req.teacherVerificationChecked) return req.teacherVerificationVerified === true;
  const profile = await TeacherProfile.findOne({
    where: { userId: req.user.id },
    attributes: ['id', 'status'],
  });
  req.teacherVerificationChecked = true;
  req.teacherVerificationVerified = profile?.status === 'verified';
  return req.teacherVerificationVerified;
};

const isStaffViewer = async (req, membership) => (
  req.user?.role === 'admin'
  || (membership?.role === 'teacher' && await hasVerifiedTeacherAccess(req))
);

const userAttributes = (includeEmail) => [
  'id',
  'firstName',
  'lastName',
  ...(includeEmail ? ['email'] : []),
];

const userDto = (user, includeEmail = false) => {
  if (!user) return null;
  const dto = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
  };
  if (includeEmail) dto.email = user.email;
  return dto;
};

const moderationReportDto = (report, options = {}) => {
  const now = options.now || new Date();
  const createdAt = new Date(report.createdAt);
  const dueAt = Number.isNaN(createdAt.getTime())
    ? null
    : new Date(createdAt.getTime() + MODERATION_SLA_MS);
  const dto = {
    id: report.id,
    classroomId: report.classroomId,
    commentId: report.commentId,
    reason: report.reason,
    details: report.details,
    contentSnapshot: report.contentSnapshot,
    status: report.status,
    reviewQueue: report.reviewQueue,
    priority: report.priority,
    createdAt: report.createdAt,
    dueAt,
    overdue: report.status === 'pending' && dueAt ? dueAt.getTime() < now.getTime() : false,
    reviewedAt: report.reviewedAt,
    classroom: report.classroom
      ? { id: report.classroom.id, name: report.classroom.name }
      : null,
    reporter: userDto(report.reporter, true),
    commentAuthor: userDto(report.commentAuthor, true),
    reviewer: userDto(report.reviewer, true),
    actions: (report.actions || []).map((action) => ({
      id: action.id,
      fromStatus: action.fromStatus,
      toStatus: action.toStatus,
      note: action.note,
      createdAt: action.createdAt,
      actor: userDto(action.actor, true),
    })),
  };
  if (options.includeNotification) {
    dto.notification = {
      status: report.notificationStatus || 'pending',
      channel: report.notificationChannel || null,
      attempts: Number(report.notificationAttempts || 0),
      lastAttemptAt: report.notificationLastAttemptAt || null,
      nextAttemptAt: report.notificationNextAttemptAt || null,
      deliveredAt: report.notificationDeliveredAt || null,
      lastError: report.notificationLastError || null,
    };
  }
  return dto;
};

const moderationIncludes = (includeClassroom = false) => [
  ...(includeClassroom
    ? [{ model: Classroom, as: 'classroom', attributes: ['id', 'name'], required: false }]
    : []),
  { model: User, as: 'reporter', attributes: userAttributes(true), required: false },
  { model: User, as: 'commentAuthor', attributes: userAttributes(true), required: false },
  { model: User, as: 'reviewer', attributes: userAttributes(true), required: false },
  {
    model: CommentModerationAction,
    as: 'actions',
    include: [{ model: User, as: 'actor', attributes: userAttributes(true), required: false }],
    required: false,
  },
];

const moderationGuidance = Object.freeze({
  targetReviewHours: 24,
  serviceLevel: 'Class owners should review new reports within 24 hours.',
  emergency: 'If anyone is in immediate danger, contact Triple Zero (000) or a trusted adult now. Do not wait for an in-app review.',
});

const requireTeacher = async (req, res, next) => {
  if (!req.user || (req.user.role !== 'instructor' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Teacher account required' });
  }
  if (!(await hasVerifiedTeacherAccess(req))) {
    return res.status(403).json({
      message: 'A currently verified teacher profile is required',
      code: 'teacher_verification_required',
    });
  }
  return next();
};

const generateClassCode = async () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  // Try a few times to avoid collisions
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[crypto.randomInt(chars.length)];
    }
    const existing = await Classroom.findOne({ where: { code } });
    if (!existing) return code;
  }
  // Cryptographic fallback avoids predictable class identifiers even under collisions.
  return `CL${crypto.randomBytes(12).toString('base64url').toUpperCase().replace(/[-_]/g, '').slice(0, 14)}`;
};

const requireTeacherInClass = async (req, res, classroomId) => {
  // Admin can do everything without being explicitly a member
  if (req.user?.role === 'admin') return true;

  const membership = await ClassMembership.findOne({
    where: { classroomId, userId: req.user.id },
  });
  return !!membership && membership.role === 'teacher' && await hasVerifiedTeacherAccess(req);
};

/** True if user is the class owner (created the class). Only owner (or admin) can delete class, add/remove teachers, remove students. */
const isClassOwner = (classroom, userId) => {
  return classroom && (classroom.createdBy === userId);
};

const canModerateClass = async (req, classroom) => (
  req.user?.role === 'admin'
  || (isClassOwner(classroom, req.user?.id) && await hasVerifiedTeacherAccess(req))
);

// Get all classes for current user (both teaching and enrolled)
router.get('/', requireAuth, async (req, res) => {
  try {
    const memberships = await ClassMembership.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Classroom,
          as: 'classroom',
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const teaching = [];
    const student = [];
    const hasTeachingMembership = memberships.some((membership) => membership.role === 'teacher');
    const canAccessTeachingClasses = !hasTeachingMembership || await hasVerifiedTeacherAccess(req);

    for (const m of memberships) {
      const dto = {
        id: m.classroom.id,
        name: m.classroom.name,
        code: m.classroom.code,
        role: m.role,
        createdAt: m.classroom.createdAt,
      };
      if (m.role === 'teacher') {
        if (canAccessTeachingClasses) teaching.push(dto);
      } else {
        student.push(dto);
      }
    }

    res.json({
      teaching,
      student,
      teacherAccess: hasTeachingMembership ? canAccessTeachingClasses : null,
    });
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new class (teachers only)
router.post(
  '/',
  requireAuth,
  requireTeacher,
  [body('name').trim().isLength({ min: 1, max: 100 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description } = req.body;
      const code = await generateClassCode();

      const classroom = await Classroom.create({
        name,
        description: description || '',
        code,
        createdBy: req.user.id,
      });

      await ClassMembership.create({
        classroomId: classroom.id,
        userId: req.user.id,
        role: 'teacher',
      });

      res.status(201).json({ classroom });
    } catch (error) {
      console.error('Create class error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Join a class by code (students only; teachers cannot join — only the owner can add them)
router.post(
  '/join',
  requireAuth,
  classJoinLimiter,
  [body('code').trim().isLength({ min: 4 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const isTeacherAccount = req.user.role === 'instructor' || req.user.role === 'admin';
      if (isTeacherAccount) {
        return res.status(403).json({
          message: 'Teachers cannot join a class with a code. Only the class owner can add you as a teacher.',
        });
      }

      if (ageInYears(req.user.dateOfBirth) === null) {
        return res.status(403).json({
          message: 'Add a valid date of birth in Settings → Profile before joining a classroom.',
          code: 'age_confirmation_required',
          consentRequired: true,
        });
      }
      if (!(await hasRecordedConsent(req.user.id, 'classroom_data'))) {
        return res.status(403).json({
          message: 'Review and accept classroom data sharing in Settings → Privacy & data before joining.',
          code: 'classroom_consent_required',
          consentRequired: true,
        });
      }
      if (requiresGuardianConsent(req.user)) {
        const parentalConsent = await latestConsent(req.user.id, 'parental');
        const parentalPurposes = Array.isArray(parentalConsent?.metadata?.purposes)
          ? parentalConsent.metadata.purposes
          : [];
        const validParentalConsent = parentalConsent?.status === 'granted'
          && parentalConsent.grantedAt
          && !parentalConsent.withdrawnAt;
        if (!validParentalConsent || !parentalPurposes.includes('classroom_data')) {
          return res.status(403).json({
            message: 'A parent or guardian must approve classroom participation before you can join.',
            code: 'guardian_consent_required',
            consentRequired: true,
          });
        }
      }

      const { code } = req.body;
      const normalizedCode = code.trim().toUpperCase();

      const classroom = await Classroom.findOne({ where: { code: normalizedCode } });
      if (!classroom) {
        return res.status(404).json({ message: 'Unable to join this class. Check the code and try again.' });
      }

      const [membership] = await ClassMembership.findOrCreate({
        where: {
          classroomId: classroom.id,
          userId: req.user.id,
        },
        defaults: {
          role: 'student',
        },
      });

      res.json({
        classroom,
        membership: {
          id: membership.id,
          role: membership.role,
        },
      });
    } catch (error) {
      console.error('Join class error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Leave a class (students and class teachers; owner cannot leave — must delete class)
router.post('/:id/leave', requireAuth, async (req, res) => {
  try {
    const classroom = await Classroom.findByPk(req.params.id);
    if (!classroom) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const membership = await ClassMembership.findOne({
      where: { classroomId: classroom.id, userId: req.user.id },
    });
    if (!membership) {
      return res.status(400).json({ message: 'You are not in this class' });
    }

    if (isClassOwner(classroom, req.user.id)) {
      return res.status(400).json({
        message: 'You are the class owner. Delete the class instead if you want to leave.',
      });
    }

    if (membership.role === 'teacher') {
      const teacherCount = await ClassMembership.count({
        where: { classroomId: classroom.id, role: 'teacher' },
      });
      if (teacherCount <= 1) {
        return res
          .status(400)
          .json({ message: 'You are the last teacher. Only the class owner can remove you or delete the class.' });
      }
    }

    if (membership.role === 'student') {
      const assignmentIds = await Assignment.findAll({
        where: { classroomId: classroom.id },
        attributes: ['id'],
        raw: true,
      }).then((rows) => rows.map((r) => r.id));
      if (assignmentIds.length > 0) {
        await AssignmentSubmission.destroy({
          where: { studentId: req.user.id, assignmentId: assignmentIds },
        });
      }
    }

    await membership.destroy();
    res.json({ message: 'Left class successfully' });
  } catch (error) {
    console.error('Leave class error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove a member (student or teacher) — only class owner or admin
router.delete('/:id/members/:userId', requireAuth, async (req, res) => {
  try {
    const classroom = await Classroom.findByPk(req.params.id);
    if (!classroom) {
      return res.status(404).json({ message: 'Class not found' });
    }
    if (!isClassOwner(classroom, req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the class owner can remove members' });
    }
    if (req.user.role !== 'admin' && !(await hasVerifiedTeacherAccess(req))) {
      return res.status(403).json({ message: 'A currently verified teacher profile is required', code: 'teacher_verification_required' });
    }

    const targetUserId = req.params.userId;
    if (targetUserId === req.user.id) {
      return res.status(400).json({ message: 'To leave the class, use Discard membership. To delete the class, use Terminate Class.' });
    }

    const targetMembership = await ClassMembership.findOne({
      where: { classroomId: classroom.id, userId: targetUserId },
    });
    if (!targetMembership) {
      return res.status(404).json({ message: 'Member not found in this class' });
    }

    const teacherCount = await ClassMembership.count({
      where: { classroomId: classroom.id, role: 'teacher' },
    });
    if (targetMembership.role === 'teacher' && teacherCount <= 1) {
      return res.status(400).json({ message: 'Cannot remove the last teacher. Delete the class or add another teacher first.' });
    }

    if (targetMembership.role === 'student') {
      const assignmentIds = await Assignment.findAll({
        where: { classroomId: classroom.id },
        attributes: ['id'],
        raw: true,
      }).then((rows) => rows.map((r) => r.id));
      if (assignmentIds.length > 0) {
        await AssignmentSubmission.destroy({
          where: { studentId: targetUserId, assignmentId: assignmentIds },
        });
      }
    }

    await targetMembership.destroy();
    res.json({ message: 'Member removed' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add a teacher to the class — only class owner or admin
router.post(
  '/:id/teachers',
  requireAuth,
  [body('email').trim().isEmail()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const classroom = await Classroom.findByPk(req.params.id);
      if (!classroom) {
        return res.status(404).json({ message: 'Class not found' });
      }
      if (!isClassOwner(classroom, req.user.id) && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Only the class owner can add teachers' });
      }
      if (req.user.role !== 'admin' && !(await hasVerifiedTeacherAccess(req))) {
        return res.status(403).json({ message: 'A currently verified teacher profile is required', code: 'teacher_verification_required' });
      }

      const email = req.body.email.trim().toLowerCase();
      const newTeacher = await User.findOne({ where: { email } });
      if (!newTeacher) {
        return res.status(404).json({ message: 'No user found with that email' });
      }
      if (newTeacher.role !== 'instructor' && newTeacher.role !== 'admin') {
        return res.status(400).json({ message: 'That user is not a teacher account. They can join the class as a student with the class code.' });
      }
      if (newTeacher.role !== 'admin') {
        const newTeacherProfile = await TeacherProfile.findOne({
          where: { userId: newTeacher.id },
          attributes: ['id', 'status'],
        });
        if (newTeacherProfile?.status !== 'verified') {
          return res.status(400).json({ message: 'That teacher does not have a currently verified teacher profile.' });
        }
      }

      const [membership, created] = await ClassMembership.findOrCreate({
        where: { classroomId: classroom.id, userId: newTeacher.id },
        defaults: { role: 'teacher' },
      });
      if (!created) {
        if (membership.role === 'teacher') {
          return res.status(400).json({ message: 'That user is already a teacher in this class' });
        }
        membership.role = 'teacher';
        await membership.save();
      }

      res.status(201).json({
        message: 'Teacher added',
        user: {
          id: newTeacher.id,
          firstName: newTeacher.firstName,
          lastName: newTeacher.lastName,
          email: newTeacher.email,
        },
      });
    } catch (error) {
      console.error('Add teacher error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Delete a class (only class owner or admin)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const classroom = await Classroom.findByPk(req.params.id);
    if (!classroom) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const isOwner = isClassOwner(classroom, req.user.id);
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Only the class owner can delete this class' });
    }
    if (!isAdmin && !(await hasVerifiedTeacherAccess(req))) {
      return res.status(403).json({ message: 'A currently verified teacher profile is required', code: 'teacher_verification_required' });
    }

    await classroom.destroy();
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a single class with members and assignments
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const classroom = await Classroom.findByPk(req.params.id);
    if (!classroom) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const membership = await ClassMembership.findOne({
      where: { classroomId: classroom.id, userId: req.user.id },
    });
    if (!membership && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You are not a member of this class' });
    }
    const canViewContact = await isStaffViewer(req, membership);
    if (membership?.role === 'teacher' && !canViewContact) {
      return res.status(403).json({ message: 'A currently verified teacher profile is required', code: 'teacher_verification_required' });
    }
    const canViewPerformance = canViewContact;

    const memberships = await ClassMembership.findAll({
      where: { classroomId: classroom.id },
      include: [{ model: User, as: 'user', attributes: userAttributes(canViewContact) }],
      order: [['createdAt', 'ASC']],
    });

    const includeSubmissions =
      canViewPerformance
        ? {
          model: AssignmentSubmission,
          as: 'submissions',
          include: [{ model: User, as: 'student', attributes: ['id', 'firstName', 'lastName', 'email'] }],
          required: false,
        }
        : {
          model: AssignmentSubmission,
          as: 'submissions',
          where: { studentId: req.user.id },
          required: false,
        };

    const assignments = await Assignment.findAll({
      where: { classroomId: classroom.id },
      include: [
        { model: Course, as: 'course', attributes: ['id', 'title'] },
        { model: Lesson, as: 'lesson', attributes: ['id', 'title'] },
        includeSubmissions,
      ],
      order: [['dueDate', 'ASC'], ['createdAt', 'DESC']],
    });

    const members = memberships.map((m) => ({
      ...userDto(m.user, canViewContact),
      role: m.role,
    }));

    const currentMemberIds = new Set(members.map((m) => m.id));

    const assignmentsDto = assignments.map((a) => {
      if (canViewPerformance) {
        const allSubmissions = (a.submissions || []).map((s) => ({
          id: s.id,
          studentId: s.studentId,
          status: s.status,
          submittedAt: s.submittedAt,
          student: s.student
            ? {
              ...userDto(s.student, true),
            }
            : null,
        }));
        // Only include submissions for current members (exclude students who left)
        const submissions = allSubmissions.filter((s) => currentMemberIds.has(s.studentId));

        return {
          id: a.id,
          title: a.title,
          description: a.description,
          dueDate: a.dueDate,
          course: a.course ? { id: a.course.id, title: a.course.title } : null,
          lesson: a.lesson ? { id: a.lesson.id, title: a.lesson.title } : null,
          submissions,
        };
      }

      const submission = a.submissions?.[0];
      return {
        id: a.id,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate,
        course: a.course ? { id: a.course.id, title: a.course.title } : null,
        lesson: a.lesson ? { id: a.lesson.id, title: a.lesson.title } : null,
        statusForCurrentUser: submission ? submission.status : 'assigned',
        submittedAt: submission ? submission.submittedAt : null,
      };
    });

    // Load announcements (defensive: return empty array if fails)
    let announcementsDto = [];
    try {
      const announcements = await ClassAnnouncement.findAll({
        where: { classroomId: classroom.id },
        include: [
          {
            model: User,
            as: 'author',
            attributes: userAttributes(canViewContact),
            required: false,
          },
        ],
        order: [['createdAt', 'DESC']],
        limit: 50,
      });
      announcementsDto = announcements.map((a) => ({
        id: a.id,
        content: a.content,
        attachments: a.attachments || [],
        createdAt: a.createdAt,
        author: userDto(a.author, canViewContact),
      }));
    } catch (announcementError) {
      console.warn('Failed to load announcements (non-critical):', announcementError.message);
      announcementsDto = [];
    }

    // Leaderboard: students by completed assignment count (most first)
    let fullLeaderboard = [];
    try {
      const studentMembers = memberships.filter((m) => m.role === 'student');
      if (studentMembers.length > 0) {
        const assignmentsInClass = await Assignment.findAll({
          where: { classroomId: classroom.id },
          attributes: ['id'],
          raw: true,
        });
        const assignmentIds = assignmentsInClass.map((a) => a.id);
        if (assignmentIds.length > 0) {
          const completed = await AssignmentSubmission.findAll({
            where: { assignmentId: assignmentIds, status: 'completed' },
            attributes: ['studentId'],
            raw: true,
          });
          const countByStudent = {};
          studentMembers.forEach((m) => (countByStudent[m.user.id] = 0));
          completed.forEach((r) => {
            if (countByStudent[r.studentId] !== undefined) countByStudent[r.studentId]++;
          });
          fullLeaderboard = studentMembers
            .map((m) => ({
              userId: m.user.id,
              firstName: m.user.firstName,
              lastName: m.user.lastName,
              completedCount: countByStudent[m.user.id] || 0,
            }))
            .sort((a, b) => b.completedCount - a.completedCount);
        } else {
          fullLeaderboard = studentMembers.map((m) => ({
            userId: m.user.id,
            firstName: m.user.firstName,
            lastName: m.user.lastName,
            completedCount: 0,
          }));
        }
      }
    } catch (leaderboardErr) {
      console.warn('Leaderboard (non-critical):', leaderboardErr.message);
    }
    const leaderboard = canViewPerformance ? fullLeaderboard : [];
    const ownLeaderboardIndex = fullLeaderboard.findIndex((entry) => entry.userId === req.user.id);
    const leaderboardSummary = canViewPerformance || ownLeaderboardIndex < 0
      ? null
      : {
        position: ownLeaderboardIndex + 1,
        totalStudents: fullLeaderboard.length,
        completedCount: fullLeaderboard[ownLeaderboardIndex].completedCount,
      };

    // Comment counts for announcements and assignments (so frontend can show comments open by default)
    try {
      const countRows = await Comment.findAll({
        where: {
          classroomId: classroom.id,
          ...(canViewContact ? {} : {
            [Op.or]: [
              { isPrivate: false },
              { authorId: req.user.id },
              { targetUserId: req.user.id },
            ],
          }),
        },
        attributes: [
          'commentableType',
          'commentableId',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['commentableType', 'commentableId'],
        raw: true,
      });
      const countMap = {};
      countRows.forEach((r) => {
        countMap[`${r.commentableType}-${r.commentableId}`] = parseInt(r.count, 10) || 0;
      });
      announcementsDto.forEach((a) => {
        a.commentCount = countMap[`announcement-${a.id}`] || 0;
      });
      assignmentsDto.forEach((a) => {
        a.commentCount = countMap[`assignment-${a.id}`] || 0;
      });
    } catch (commentCountErr) {
      console.warn('Comment counts (non-critical):', commentCountErr.message);
    }

    res.json({
      classroom: {
        id: classroom.id,
        name: classroom.name,
        code: classroom.code,
        description: classroom.description,
        createdBy: classroom.createdBy,
      },
      membership: {
        role: req.user.role === 'admin' ? 'admin' : membership.role,
        isOwner: isClassOwner(classroom, req.user.id),
      },
      members,
      assignments: assignmentsDto,
      announcements: announcementsDto,
      leaderboard,
      leaderboardSummary,
    });
  } catch (error) {
    console.error('Get class detail error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create assignment for a class (teachers only)
router.post(
  '/:id/assignments',
  requireAuth,
  [body('title').trim().isLength({ min: 1, max: 200 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const classroom = await Classroom.findByPk(req.params.id);
      if (!classroom) {
        return res.status(404).json({ message: 'Class not found' });
      }

      const membership = await ClassMembership.findOne({
        where: { classroomId: classroom.id, userId: req.user.id },
      });
      if (!membership || membership.role !== 'teacher' || !(await hasVerifiedTeacherAccess(req))) {
        return res.status(403).json({ message: 'Only teachers in this class can create assignments' });
      }

      const { title, description, dueDate, courseId, lessonId } = req.body;

      const assignment = await Assignment.create({
        classroomId: classroom.id,
        title,
        description: description || '',
        dueDate: dueDate ? new Date(dueDate) : null,
        courseId: courseId || null,
        lessonId: lessonId || null,
      });

      res.status(201).json({ assignment });
    } catch (error) {
      console.error('Create assignment error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Delete assignment (teacher in class or admin)
router.delete('/:classId/assignments/:assignmentId', requireAuth, async (req, res) => {
  try {
    const { classId, assignmentId } = req.params;

    const classroom = await Classroom.findByPk(classId);
    if (!classroom) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const allowed = await requireTeacherInClass(req, res, classroom.id);
    if (!allowed) {
      return res.status(403).json({ message: 'Only teachers can delete assignments' });
    }

    const assignment = await Assignment.findByPk(assignmentId);
    if (!assignment || assignment.classroomId !== classroom.id) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    await assignment.destroy(); // cascades submissions
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Mark assignment as completed (student)
router.post('/assignments/:id/complete', requireAuth, async (req, res) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Lesson-linked assignments can only be completed by finishing the lesson
    if (assignment.lessonId) {
      return res
        .status(400)
        .json({ message: 'Complete the lesson to verify this assignment.' });
    }

    // Ensure user is a member of the class
    const membership = await ClassMembership.findOne({
      where: { classroomId: assignment.classroomId, userId: req.user.id },
    });
    if (!membership) {
      return res.status(403).json({ message: 'You are not a member of this class' });
    }

    const [submission] = await AssignmentSubmission.findOrCreate({
      where: {
        assignmentId: assignment.id,
        studentId: req.user.id,
      },
      defaults: {
        status: 'completed',
        submittedAt: new Date(),
      },
    });

    if (submission.status !== 'completed') {
      submission.status = 'completed';
      submission.submittedAt = new Date();
      await submission.save();
    }

    res.json({
      message: 'Assignment marked as completed',
      submission: {
        id: submission.id,
        status: submission.status,
        submittedAt: submission.submittedAt,
      },
    });
  } catch (error) {
    console.error('Complete assignment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Un-mark assignment as completed (undo)
router.post('/assignments/:id/uncomplete', requireAuth, async (req, res) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Do not allow undo for lesson-linked assignments – those are controlled by lesson completion
    if (assignment.lessonId) {
      return res
        .status(400)
        .json({ message: 'Cannot undo completion for lesson-linked assignments.' });
    }

    // Ensure user is a member of the class
    const membership = await ClassMembership.findOne({
      where: { classroomId: assignment.classroomId, userId: req.user.id },
    });
    if (!membership) {
      return res.status(403).json({ message: 'You are not a member of this class' });
    }

    await AssignmentSubmission.destroy({
      where: {
        assignmentId: assignment.id,
        studentId: req.user.id,
      },
    });

    res.json({ message: 'Assignment marked as not completed' });
  } catch (error) {
    console.error('Uncomplete assignment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Auto-complete assignments linked to a lesson when a student finishes that lesson
router.post('/lessons/:lessonId/complete', requireAuth, async (req, res) => {
  try {
    const { lessonId } = req.params;

    // All classes this user is a member of
    const memberships = await ClassMembership.findAll({
      where: { userId: req.user.id },
    });
    const classroomIds = memberships.map((m) => m.classroomId);
    if (classroomIds.length === 0) {
      return res.json({ updated: [] });
    }

    const assignments = await Assignment.findAll({
      where: {
        lessonId,
        classroomId: classroomIds,
      },
    });

    const updated = [];

    for (const assignment of assignments) {
      const [submission] = await AssignmentSubmission.findOrCreate({
        where: {
          assignmentId: assignment.id,
          studentId: req.user.id,
        },
        defaults: {
          status: 'completed',
          submittedAt: new Date(),
        },
      });

      if (submission.status !== 'completed') {
        submission.status = 'completed';
        submission.submittedAt = new Date();
        await submission.save();
      }

      updated.push({
        assignmentId: assignment.id,
        submissionId: submission.id,
        status: submission.status,
        submittedAt: submission.submittedAt,
      });
    }

    res.json({ updated });
  } catch (error) {
    console.error('Auto-complete lesson assignments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Announcements

const classifyAttachment = (url) => {
  if (!url || typeof url !== 'string') return null;
  const lower = url.toLowerCase().trim();
  if (lower.match(/\.(png|jpe?g|gif|webp|svg)$/)) return 'image';
  if (
    lower.includes('youtube.com/watch') ||
    lower.includes('youtube.com/embed') ||
    lower.includes('youtu.be/')
  ) {
    return 'video';
  }
  return 'link';
};

// Create announcement (teachers only)
router.post(
  '/:id/announcements',
  requireAuth,
  [body('content').trim().isLength({ min: 1 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const classroom = await Classroom.findByPk(req.params.id);
      if (!classroom) {
        return res.status(404).json({ message: 'Class not found' });
      }

      const membership = await ClassMembership.findOne({
        where: { classroomId: classroom.id, userId: req.user.id },
      });
      if (!membership) {
        return res.status(403).json({ message: 'You are not a member of this class' });
      }
      if (membership.role !== 'teacher' || !(await hasVerifiedTeacherAccess(req))) {
        return res.status(403).json({ message: 'Only teachers can post announcements' });
      }

      const { content, attachmentUrl } = req.body;
      const attachments = [];
      if (attachmentUrl && typeof attachmentUrl === 'string' && attachmentUrl.trim()) {
        const trimmed = attachmentUrl.trim();
        let parsedUrl;
        try {
          parsedUrl = new URL(trimmed);
        } catch {
          parsedUrl = null;
        }
        if (parsedUrl && (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:')) {
          const type = classifyAttachment(trimmed);
          if (type) {
            attachments.push({ url: trimmed, type });
          }
        }
      }

      const announcement = await ClassAnnouncement.create({
        classroomId: classroom.id,
        authorId: req.user.id,
        content: content.trim(),
        attachments,
      });

      const full = await ClassAnnouncement.findByPk(announcement.id, {
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false,
          },
        ],
      });

      res.status(201).json({
        id: full.id,
        content: full.content,
        attachments: full.attachments || [],
        createdAt: full.createdAt,
        author: full.author
          ? {
            id: full.author.id,
            firstName: full.author.firstName,
            lastName: full.author.lastName,
            email: full.author.email,
          }
          : null,
      });
    } catch (error) {
      console.error('Create announcement error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

// Delete announcement (author, teacher in class, or admin)
router.delete('/:classId/announcements/:announcementId', requireAuth, async (req, res) => {
  try {
    const { classId, announcementId } = req.params;

    const classroom = await Classroom.findByPk(classId);
    if (!classroom) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const announcement = await ClassAnnouncement.findByPk(announcementId);
    if (!announcement || announcement.classroomId !== classroom.id) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Author can delete their own, teachers/admin can delete any in that class
    const isAuthor = announcement.authorId === req.user.id;
    const isTeacherInClass = await requireTeacherInClass(req, res, classroom.id);

    if (!isAuthor && !isTeacherInClass) {
      return res.status(403).json({ message: 'Not allowed to delete this announcement' });
    }

    await announcement.destroy();
    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ----- Comments on announcements (all public) -----
router.get('/:classId/announcements/:announcementId/comments', requireAuth, async (req, res) => {
  try {
    const { classId, announcementId } = req.params;
    const classroom = await Classroom.findByPk(classId);
    if (!classroom) return res.status(404).json({ message: 'Class not found' });
    const membership = await ClassMembership.findOne({ where: { classroomId: classroom.id, userId: req.user.id } });
    if (!membership && req.user.role !== 'admin') return res.status(403).json({ message: 'Not a member of this class' });
    const canViewContact = await isStaffViewer(req, membership);
    if (membership?.role === 'teacher' && !canViewContact) {
      return res.status(403).json({ message: 'A currently verified teacher profile is required', code: 'teacher_verification_required' });
    }
    const announcement = await ClassAnnouncement.findByPk(announcementId);
    if (!announcement || announcement.classroomId !== classroom.id) return res.status(404).json({ message: 'Announcement not found' });

    const comments = await Comment.findAll({
      where: { classroomId: classroom.id, commentableType: 'announcement', commentableId: announcementId },
      include: [{ model: User, as: 'author', attributes: userAttributes(canViewContact) }],
      order: [['createdAt', 'ASC']],
    });
    res.json(comments.map((c) => ({
      id: c.id,
      content: c.content,
      isPrivate: c.isPrivate,
      createdAt: c.createdAt,
      author: userDto(c.author, canViewContact),
    })));
  } catch (error) {
    console.error('Get announcement comments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post(
  '/:classId/announcements/:announcementId/comments',
  requireAuth,
  commentCreateLimiter,
  [body('content').trim().isLength({ min: 1, max: COMMENT_MAX_LENGTH })],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { classId, announcementId } = req.params;
    const classroom = await Classroom.findByPk(classId);
    if (!classroom) return res.status(404).json({ message: 'Class not found' });
    const membership = await ClassMembership.findOne({ where: { classroomId: classroom.id, userId: req.user.id } });
    if (!membership && req.user.role !== 'admin') return res.status(403).json({ message: 'Not a member of this class' });
    const canViewContact = await isStaffViewer(req, membership);
    if (membership?.role === 'teacher' && !canViewContact) {
      return res.status(403).json({ message: 'A currently verified teacher profile is required', code: 'teacher_verification_required' });
    }
    const announcement = await ClassAnnouncement.findByPk(announcementId);
    if (!announcement || announcement.classroomId !== classroom.id) return res.status(404).json({ message: 'Announcement not found' });

    const comment = await Comment.create({
      classroomId: classroom.id,
      commentableType: 'announcement',
      commentableId: announcementId,
      authorId: req.user.id,
      content: req.body.content.trim(),
      isPrivate: false,
      targetUserId: null,
    });
    const withAuthor = await Comment.findByPk(comment.id, {
      include: [{ model: User, as: 'author', attributes: userAttributes(canViewContact) }],
    });
    res.status(201).json({
      id: withAuthor.id,
      content: withAuthor.content,
      isPrivate: withAuthor.isPrivate,
      createdAt: withAuthor.createdAt,
      author: userDto(withAuthor.author, canViewContact),
    });
  } catch (error) {
    console.error('Create announcement comment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
  },
);

router.delete('/:classId/announcements/:announcementId/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const { classId, announcementId, commentId } = req.params;
    const classroom = await Classroom.findByPk(classId);
    if (!classroom) return res.status(404).json({ message: 'Class not found' });
    const membership = await ClassMembership.findOne({ where: { classroomId: classroom.id, userId: req.user.id } });
    if (!membership && req.user.role !== 'admin') return res.status(403).json({ message: 'Not a member of this class' });
    const announcement = await ClassAnnouncement.findByPk(announcementId);
    if (!announcement || announcement.classroomId !== classroom.id) return res.status(404).json({ message: 'Announcement not found' });
    const comment = await Comment.findOne({
      where: { id: commentId, classroomId: classroom.id, commentableType: 'announcement', commentableId: announcementId },
    });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (!(await isStaffViewer(req, membership)) && comment.authorId !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }
    await comment.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Delete announcement comment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ----- Comments on assignments (public class comments + private student-teacher) -----
router.get('/:classId/assignments/:assignmentId/comments', requireAuth, async (req, res) => {
  try {
    const { classId, assignmentId } = req.params;
    const classroom = await Classroom.findByPk(classId);
    if (!classroom) return res.status(404).json({ message: 'Class not found' });
    const membership = await ClassMembership.findOne({ where: { classroomId: classroom.id, userId: req.user.id } });
    if (!membership && req.user.role !== 'admin') return res.status(403).json({ message: 'Not a member of this class' });
    const assignment = await Assignment.findByPk(assignmentId);
    if (!assignment || assignment.classroomId !== classroom.id) return res.status(404).json({ message: 'Assignment not found' });

    const canViewContact = await isStaffViewer(req, membership);
    if (membership?.role === 'teacher' && !canViewContact) {
      return res.status(403).json({ message: 'A currently verified teacher profile is required', code: 'teacher_verification_required' });
    }
    const allComments = await Comment.findAll({
      where: {
        classroomId: classroom.id,
        commentableType: 'assignment',
        commentableId: assignmentId,
        ...(canViewContact ? {} : {
          [Op.or]: [
            { isPrivate: false },
            { authorId: req.user.id },
            { targetUserId: req.user.id },
          ],
        }),
      },
      include: [
        { model: User, as: 'author', attributes: userAttributes(canViewContact) },
        { model: User, as: 'targetUser', attributes: ['id', 'firstName', 'lastName'], required: false },
      ],
      order: [['createdAt', 'ASC']],
    });
    res.json(allComments.map((c) => ({
      id: c.id,
      content: c.content,
      isPrivate: c.isPrivate,
      targetUserId: c.targetUserId,
      targetUser: c.targetUser ? { id: c.targetUser.id, firstName: c.targetUser.firstName, lastName: c.targetUser.lastName } : null,
      createdAt: c.createdAt,
      author: userDto(c.author, canViewContact),
    })));
  } catch (error) {
    console.error('Get assignment comments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post(
  '/:classId/assignments/:assignmentId/comments',
  requireAuth,
  commentCreateLimiter,
  [body('content').trim().isLength({ min: 1, max: COMMENT_MAX_LENGTH })],
  async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { classId, assignmentId } = req.params;
    const { content, isPrivate, targetUserId } = req.body;
    const classroom = await Classroom.findByPk(classId);
    if (!classroom) return res.status(404).json({ message: 'Class not found' });
    const membership = await ClassMembership.findOne({ where: { classroomId: classroom.id, userId: req.user.id } });
    if (!membership && req.user.role !== 'admin') return res.status(403).json({ message: 'Not a member of this class' });
    const canViewContact = await isStaffViewer(req, membership);
    if (membership?.role === 'teacher' && !canViewContact) {
      return res.status(403).json({ message: 'A currently verified teacher profile is required', code: 'teacher_verification_required' });
    }
    const assignment = await Assignment.findByPk(assignmentId);
    if (!assignment || assignment.classroomId !== classroom.id) return res.status(404).json({ message: 'Assignment not found' });

    const privateComment = !!isPrivate;
    let targetId = null;
    if (privateComment && canViewContact && targetUserId) {
      const targetMember = await ClassMembership.findOne({ where: { classroomId: classroom.id, userId: targetUserId, role: 'student' } });
      if (!targetMember) return res.status(400).json({ message: 'Invalid target student for private comment' });
      targetId = targetUserId;
    }

    const comment = await Comment.create({
      classroomId: classroom.id,
      commentableType: 'assignment',
      commentableId: assignmentId,
      authorId: req.user.id,
      content: (content || '').trim(),
      isPrivate: privateComment,
      targetUserId: targetId,
    });
    const withAuthor = await Comment.findByPk(comment.id, {
      include: [
        { model: User, as: 'author', attributes: userAttributes(canViewContact) },
        { model: User, as: 'targetUser', attributes: ['id', 'firstName', 'lastName'], required: false },
      ],
    });
    res.status(201).json({
      id: withAuthor.id,
      content: withAuthor.content,
      isPrivate: withAuthor.isPrivate,
      targetUserId: withAuthor.targetUserId,
      targetUser: withAuthor.targetUser ? { id: withAuthor.targetUser.id, firstName: withAuthor.targetUser.firstName, lastName: withAuthor.targetUser.lastName } : null,
      createdAt: withAuthor.createdAt,
      author: userDto(withAuthor.author, canViewContact),
    });
  } catch (error) {
    console.error('Create assignment comment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
  },
);

router.delete('/:classId/assignments/:assignmentId/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const { classId, assignmentId, commentId } = req.params;
    const classroom = await Classroom.findByPk(classId);
    if (!classroom) return res.status(404).json({ message: 'Class not found' });
    const membership = await ClassMembership.findOne({ where: { classroomId: classroom.id, userId: req.user.id } });
    if (!membership && req.user.role !== 'admin') return res.status(403).json({ message: 'Not a member of this class' });
    const assignment = await Assignment.findByPk(assignmentId);
    if (!assignment || assignment.classroomId !== classroom.id) return res.status(404).json({ message: 'Assignment not found' });
    const comment = await Comment.findOne({
      where: { id: commentId, classroomId: classroom.id, commentableType: 'assignment', commentableId: assignmentId },
    });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (!(await isStaffViewer(req, membership)) && comment.authorId !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }
    await comment.destroy();
    res.status(204).send();
  } catch (error) {
    console.error('Delete assignment comment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post(
  '/:classId/comments/:commentId/reports',
  requireAuth,
  commentReportLimiter,
  [
    body('reason').isIn(COMMENT_REPORT_REASONS),
    body('details').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const classroom = await Classroom.findByPk(req.params.classId);
      if (!classroom) return res.status(404).json({ message: 'Class not found' });
      const membership = await ClassMembership.findOne({
        where: { classroomId: classroom.id, userId: req.user.id },
      });
      if (!membership && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not a member of this class' });
      }
      const comment = await Comment.findOne({
        where: { id: req.params.commentId, classroomId: classroom.id },
      });
      if (!comment) return res.status(404).json({ message: 'Comment not found' });
      const canModerate = await isStaffViewer(req, membership);
      const canSeePrivateComment = !comment.isPrivate
        || canModerate
        || comment.authorId === req.user.id
        || comment.targetUserId === req.user.id;
      if (!canSeePrivateComment) return res.status(404).json({ message: 'Comment not found' });
      if (comment.authorId === req.user.id) {
        return res.status(400).json({ message: 'You cannot report your own comment. You can delete it instead.' });
      }

      const [authorMembership, authorAccount] = await Promise.all([
        ClassMembership.findOne({
          where: { classroomId: classroom.id, userId: comment.authorId },
        }),
        User.findByPk(comment.authorId, { attributes: ['id', 'role'] }),
      ]);
      const staffAuthored = comment.authorId === classroom.createdBy
        || authorMembership?.role === 'teacher'
        || authorAccount?.role === 'instructor'
        || authorAccount?.role === 'admin';
      const independentReview = staffAuthored || INDEPENDENT_REVIEW_REASONS.has(req.body.reason);
      const reviewQueue = independentReview ? 'admin' : 'class_owner';
      const priority = INDEPENDENT_REVIEW_REASONS.has(req.body.reason) ? 'high' : 'standard';

      const [record, created] = await CommentModerationRecord.findOrCreate({
        where: { commentId: comment.id, reportedById: req.user.id },
        defaults: {
          classroomId: classroom.id,
          commentId: comment.id,
          reportedById: req.user.id,
          commentAuthorId: comment.authorId,
          reason: req.body.reason,
          details: String(req.body.details || '').trim() || null,
          contentSnapshot: String(comment.content || '').slice(0, COMMENT_MAX_LENGTH),
          status: 'pending',
          reviewQueue,
          priority,
          metadata: {
            commentableType: comment.commentableType,
            commentableId: comment.commentableId,
          },
        },
      });
      if (created) {
        Promise.resolve(notifyModerationQueue({
          record,
          reportId: record.id,
          classroomId: classroom.id,
          reviewQueue,
          priority,
          reason: req.body.reason,
        })).catch((notificationError) => {
          console.error('Moderation notification persistence error:', notificationError.message);
        });
      }

      return res.status(created ? 201 : 200).json({
        report: {
          id: record.id,
          status: record.status,
          reviewQueue: record.reviewQueue || reviewQueue,
          createdAt: record.createdAt,
        },
        duplicate: !created,
      });
    } catch (error) {
      console.error('Report class comment error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
);

router.get('/moderation/admin/reports', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    const status = String(req.query.status || 'pending');
    if (status !== 'all' && !['pending', ...MODERATION_ACTION_STATUSES].includes(status)) {
      return res.status(400).json({ message: 'Invalid moderation status' });
    }
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
    const reports = await CommentModerationRecord.findAll({
      where: {
        reviewQueue: 'admin',
        ...(status === 'all' ? {} : { status }),
      },
      include: moderationIncludes(true),
      order: [['createdAt', 'ASC']],
      limit,
    });
    return res.json({
      reports: reports.map((report) => moderationReportDto(report, { includeNotification: true })),
      guidance: moderationGuidance,
    });
  } catch (error) {
    console.error('List central moderation reports error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:classId/moderation/reports', requireAuth, async (req, res) => {
  try {
    const classroom = await Classroom.findByPk(req.params.classId);
    if (!classroom) return res.status(404).json({ message: 'Class not found' });
    if (!(await canModerateClass(req, classroom))) {
      return res.status(403).json({ message: 'Only the class owner or an administrator can review reports' });
    }
    const status = String(req.query.status || 'pending');
    if (status !== 'all' && !['pending', ...MODERATION_ACTION_STATUSES].includes(status)) {
      return res.status(400).json({ message: 'Invalid moderation status' });
    }
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
    const reports = await CommentModerationRecord.findAll({
      where: {
        classroomId: classroom.id,
        ...(status === 'all' ? {} : { status }),
        ...(req.user.role === 'admin' ? {} : {
          reviewQueue: 'class_owner',
          commentAuthorId: { [Op.ne]: req.user.id },
        }),
      },
      include: moderationIncludes(false),
      order: [['createdAt', 'ASC']],
      limit,
    });
    return res.json({
      reports: reports.map((report) => moderationReportDto(report)),
      guidance: moderationGuidance,
    });
  } catch (error) {
    console.error('List class moderation reports error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch(
  '/:classId/moderation/reports/:reportId',
  requireAuth,
  [
    body('status').isIn(MODERATION_ACTION_STATUSES),
    body('note').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const classroom = await Classroom.findByPk(req.params.classId);
      if (!classroom) return res.status(404).json({ message: 'Class not found' });
      if (!(await canModerateClass(req, classroom))) {
        return res.status(403).json({ message: 'Only the class owner or an administrator can review reports' });
      }
      const report = await CommentModerationRecord.findOne({
        where: { id: req.params.reportId, classroomId: classroom.id },
      });
      if (!report) return res.status(404).json({ message: 'Report not found' });
      if (req.user.role !== 'admin'
        && (report.reviewQueue === 'admin' || report.commentAuthorId === req.user.id)) {
        return res.status(403).json({
          message: 'This report requires independent administrator review',
          code: 'independent_review_required',
        });
      }
      if (report.status === req.body.status) {
        return res.status(409).json({ message: `Report is already ${report.status}` });
      }
      const previousStatus = report.status;
      const reviewedAt = new Date();
      await sequelize.transaction(async (transaction) => {
        await report.update({
          status: req.body.status,
          reviewedById: req.user.id,
          reviewedAt,
        }, { transaction });
        await CommentModerationAction.create({
          reportId: report.id,
          actorId: req.user.id,
          fromStatus: previousStatus,
          toStatus: req.body.status,
          note: String(req.body.note || '').trim() || null,
        }, { transaction });
      });
      return res.json({
        report: {
          id: report.id,
          status: req.body.status,
          reviewedById: req.user.id,
          reviewedAt,
        },
      });
    } catch (error) {
      console.error('Update class moderation report error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
);

module.exports = router;
