const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const UserProgress = require('../models/UserProgress');
const Course = require('../models/Course');
const ClassMembership = require('../models/ClassMembership');
const { Op } = require('sequelize');

const router = express.Router();

// JWT Secret
const { requireAuth } = require('../middleware/auth');

// Get current user's own profile (full)
router.get('/profile', requireAuth, async (req, res) => {
  try {
    res.json({ user: req.user.toJSON() });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user profile (name, email, optional password, dateOfBirth, bio, preferences).
// `role` is ignored even if sent — role changes happen via /api/admin/promote.
router.put('/profile', requireAuth, [
  body('firstName').optional().trim().isLength({ min: 1, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 1, max: 50 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('dateOfBirth').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date (use YYYY-MM-DD)')
    .custom((value) => new Date(`${value}T00:00:00Z`) <= new Date()).withMessage('Date of birth cannot be in the future'),
  body('bio').optional().trim().isLength({ max: 1000 }),
  body('preferences').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { firstName, lastName, email, password, dateOfBirth, bio, preferences } = req.body;

    if (dateOfBirth && req.user.dateOfBirth && String(dateOfBirth) !== String(req.user.dateOfBirth)) {
      return res.status(409).json({ message: 'Date of birth is locked after it is set. Contact support if it needs correcting.' });
    }

    // If changing email, ensure it's not taken by another user
    if (email && email !== req.user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        return res.status(400).json({ message: 'That email is already in use' });
      }
    }

    // NOTE: `role` is intentionally NOT read from req.body. Profile
    // updates can never change a user's role. Role changes go through
    // /api/admin/promote.
    const updates = {
      firstName: firstName !== undefined ? firstName : req.user.firstName,
      lastName: lastName !== undefined ? lastName : req.user.lastName,
      bio: bio !== undefined ? bio : req.user.bio,
      preferences: preferences || req.user.preferences
    };
    if (email !== undefined) updates.email = email;
    if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth === '' ? null : dateOfBirth;
    if (password && password.trim()) updates.password = password.trim();

    await req.user.update(updates);

    res.json({
      message: 'Profile updated successfully',
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user dashboard data (must be before /:userId)
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    const userProgress = await UserProgress.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Course,
          as: 'course'
        }
      ]
    });

    const stats = {
      totalCourses: userProgress.length,
      completedCourses: userProgress.filter(p => p.status === 'completed').length,
      inProgressCourses: userProgress.filter(p => p.status === 'in_progress').length,
      totalTimeSpent: userProgress.reduce((sum, p) => sum + (p.timeSpent || 0), 0)
    };

    res.json({
      user: req.user.toJSON(),
      stats,
      recentCourses: userProgress.slice(0, 5)
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

function isUnder18OrUnknown(dateOfBirth, now = new Date()) {
  if (!dateOfBirth) return true;
  const birth = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return true;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const birthdayPassed = now.getUTCMonth() > birth.getUTCMonth()
    || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() >= birth.getUTCDate());
  if (!birthdayPassed) age -= 1;
  return age < 18;
}

function publicProfile(profileUser, visibility) {
  const childSafe = visibility === 'peer_child' || visibility === 'teacher_child';
  const peerChild = visibility === 'peer_child';
  return {
    id: profileUser.id,
    firstName: profileUser.firstName,
    lastName: peerChild ? `${String(profileUser.lastName || '').charAt(0)}.` : profileUser.lastName,
    role: profileUser.role,
    bio: childSafe ? null : profileUser.bio,
    profilePicture: childSafe ? null : profileUser.profilePicture,
    visibility,
  };
}

// Profiles are visible only to the account owner, an administrator, or a
// person who currently shares a class. Child profiles are deliberately
// minimised for peers and never expose bios or photos.
router.get('/:userId', requireAuth, async (req, res) => {
  try {
    const profileUser = await User.findByPk(req.params.userId, {
      attributes: ['id', 'firstName', 'lastName', 'bio', 'role', 'profilePicture', 'dateOfBirth'],
    });
    if (!profileUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.set('Cache-Control', 'private, no-store');
    if (req.user.id === profileUser.id || req.user.role === 'admin') {
      return res.json({ user: publicProfile(profileUser, req.user.id === profileUser.id ? 'self' : 'admin') });
    }

    const requesterMemberships = await ClassMembership.findAll({
      where: { userId: req.user.id },
      attributes: ['classroomId', 'role'],
      raw: true,
    });
    const classIds = requesterMemberships.map((membership) => membership.classroomId);
    if (!classIds.length) return res.status(404).json({ message: 'User not found' });

    const targetMemberships = await ClassMembership.findAll({
      where: { userId: profileUser.id, classroomId: { [Op.in]: classIds } },
      attributes: ['classroomId'],
      raw: true,
    });
    if (!targetMemberships.length) return res.status(404).json({ message: 'User not found' });

    const sharedIds = new Set(targetMemberships.map((membership) => String(membership.classroomId)));
    const requesterIsTeacher = requesterMemberships.some((membership) => (
      membership.role === 'teacher' && sharedIds.has(String(membership.classroomId))
    ));
    const isChild = isUnder18OrUnknown(profileUser.dateOfBirth);
    const visibility = isChild
      ? (requesterIsTeacher ? 'teacher_child' : 'peer_child')
      : 'shared_class';
    return res.json({ user: publicProfile(profileUser, visibility) });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Complete onboarding
router.post('/complete-onboarding', requireAuth, [
  body('knowledgeLevel').optional().trim().isIn(['beginner', 'intermediate', 'advanced']),
  body('goals').optional().isArray(),
  body('incomeRange').optional().trim().isIn(['under-2k', '2k-4k', '4k-7k', '7k-10k', 'over-10k', 'prefer-not-to-say'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { knowledgeLevel, goals, incomeRange } = req.body;

    const onboardingData = {
      knowledgeLevel: knowledgeLevel || null,
      goals: goals || [],
      incomeRange: incomeRange || null,
      completedAt: new Date().toISOString()
    };

    await req.user.update({
      onboarded: true,
      onboardingData
    });

    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Complete onboarding error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
module.exports.isUnder18OrUnknown = isUnder18OrUnknown;
