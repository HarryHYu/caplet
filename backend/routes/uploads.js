const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { Classroom, ClassMembership, Lesson, Course } = require('../models');
const { presignPut, publicObjectUrl } = require('../services/s3Presign');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

const authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    if (!user) return res.status(401).json({ message: 'Invalid token' });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

async function isTeacherInClass(userId, classroomId) {
  const membership = await ClassMembership.findOne({
    where: { classroomId, userId }
  });
  return !!membership && membership.role === 'teacher';
}

/**
 * POST /api/uploads/presign
 * Body: { purpose, mimeType, classId?, lessonId?, courseId? }
 * Returns: { uploadUrl, key, publicUrl, expiresIn, headers: { Content-Type } }
 */
router.post(
  '/presign',
  authenticateToken,
  [
    body('purpose').isIn(['avatar', 'classLogo', 'classBanner', 'lessonImage', 'courseCover']),
    body('mimeType').isIn(Object.keys(MIME_TO_EXT)),
    body('classId').optional().isUUID(),
    body('lessonId').optional().isUUID(),
    body('courseId').optional().isUUID()
  ],
  async (req, res) => {
    try {
      if (!process.env.AWS_S3_BUCKET || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        return res.status(503).json({
          message: 'File uploads are not configured. Set AWS_S3_BUCKET and credentials on the server.'
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { purpose, mimeType, classId, lessonId, courseId } = req.body;
      const ext = MIME_TO_EXT[mimeType];
      const id = crypto.randomUUID();
      const uid = req.user.id;

      let key;

      if (purpose === 'avatar') {
        key = `uploads/users/${uid}/avatar-${id}.${ext}`;
      } else if (purpose === 'classLogo' || purpose === 'classBanner') {
        if (!classId) {
          return res.status(400).json({ message: 'classId is required for class logo/banner' });
        }
        if (req.user.role !== 'admin' && !(await isTeacherInClass(uid, classId))) {
          return res.status(403).json({ message: 'You must be a teacher in this class to upload assets' });
        }
        const sub = purpose === 'classLogo' ? 'logo' : 'banner';
        key = `uploads/classes/${classId}/${sub}-${id}.${ext}`;
      } else if (purpose === 'lessonImage') {
        if (!lessonId) {
          return res.status(400).json({ message: 'lessonId is required for lesson images' });
        }
        const lesson = await Lesson.findByPk(lessonId);
        if (!lesson) {
          return res.status(404).json({ message: 'Lesson not found' });
        }
        if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
          return res.status(403).json({ message: 'Teacher or admin access required' });
        }
        key = `uploads/lessons/${lessonId}/inline-${id}.${ext}`;
      } else if (purpose === 'courseCover') {
        if (!courseId) {
          return res.status(400).json({ message: 'courseId is required for course cover' });
        }
        const course = await Course.findByPk(courseId);
        if (!course) {
          return res.status(404).json({ message: 'Course not found' });
        }
        if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
          return res.status(403).json({ message: 'Teacher or admin access required' });
        }
        key = `uploads/courses/${courseId}/cover-${id}.${ext}`;
      } else {
        return res.status(400).json({ message: 'Invalid purpose' });
      }

      const { uploadUrl, expiresIn } = await presignPut(key, mimeType);
      const publicUrl = publicObjectUrl(key);

      return res.json({
        uploadUrl,
        key,
        publicUrl,
        expiresIn,
        headers: {
          'Content-Type': mimeType
        }
      });
    } catch (e) {
      console.error('Presign error:', e);
      return res.status(500).json({ message: e.message || 'Failed to create upload URL' });
    }
  }
);

module.exports = router;
