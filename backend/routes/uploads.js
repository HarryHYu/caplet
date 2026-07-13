const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const {
  Classroom,
  ClassMembership,
  Lesson,
  Course,
  Module,
  UploadedAsset,
  Assignment,
  TeacherProfile,
} = require('../models');
const {
  presignPost,
  publicObjectUrl,
  SIZE_LIMITS,
  completeQuarantinedUpload,
  deleteOwnedObject,
} = require('../services/s3Presign');
const { JWT_SECRET } = require('../middleware/auth');
const { resolveEditorWorkspaceId } = require('../middleware/editorAuth');

const router = express.Router();

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

/** Uploads require either a regular user JWT or a valid editor-workspace JWT. */
const authenticateUserOrEditor = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Authentication required for uploads' });
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.typ === 'editor') {
      req.editorWorkspaceId = await resolveEditorWorkspaceId(token);
      return next();
    }
    const user = await User.findByPk(decoded.userId);
    if (!user) return res.status(401).json({ message: 'Authentication required for uploads' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: 'Authentication expired or invalid' });
  }
};

async function isTeacherInClass(userId, classroomId) {
  const membership = await ClassMembership.findOne({
    where: { classroomId, userId }
  });
  return !!membership && membership.role === 'teacher';
}

async function canManageCourseContent(user, { courseId, lessonId }) {
  if (user.role === 'admin') return true;
  if (user.role !== 'instructor') return false;
  const verified = await TeacherProfile.findOne({ where: { userId: user.id, status: 'verified' } });
  if (!verified) return false;
  const memberships = await ClassMembership.findAll({
    where: { userId: user.id, role: 'teacher' },
    attributes: ['classroomId'],
  });
  const classroomIds = memberships.map((membership) => membership.classroomId);
  if (!classroomIds.length) return false;
  const contentAlternatives = [
    lessonId ? { lessonId } : null,
    courseId ? { courseId } : null,
  ].filter(Boolean);
  if (!contentAlternatives.length) return false;
  const contentScope = contentAlternatives.length === 1
    ? contentAlternatives[0]
    : { [Op.or]: contentAlternatives };
  return Boolean(await Assignment.findOne({
    where: {
      classroomId: { [Op.in]: classroomIds },
      ...contentScope,
    },
    attributes: ['id'],
  }));
}

function ownsAssetRequest(req, asset) {
  if (req.user && asset.userId && String(req.user.id) === String(asset.userId)) return true;
  return Boolean(req.editorWorkspaceId && asset.workspaceId
    && String(req.editorWorkspaceId) === String(asset.workspaceId));
}

async function canCompleteAsset(req, asset) {
  if (!ownsAssetRequest(req, asset)) return false;
  if (req.editorWorkspaceId) return true;
  if (!req.user) return false;
  if (asset.purpose === 'avatar') return true;
  if (asset.purpose === 'classLogo' || asset.purpose === 'classBanner') {
    return req.user.role === 'admin' || isTeacherInClass(req.user.id, asset.classroomId);
  }
  if (asset.purpose === 'lessonImage') {
    return canManageCourseContent(req.user, { lessonId: asset.lessonId, courseId: asset.courseId });
  }
  if (asset.purpose === 'courseCover') {
    return canManageCourseContent(req.user, { courseId: asset.courseId });
  }
  return false;
}

/**
 * POST /api/uploads/presign
 * Body: { purpose, mimeType, classId?, lessonId?, courseId? }
 * Returns: { uploadUrl, key, publicUrl, expiresIn, headers: { Content-Type } }
 */
router.post(
  '/presign',
  authenticateUserOrEditor,
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
      const uid = req.user?.id;
      let assetCourseId = courseId || null;

      let finalKey;

      if (purpose === 'avatar') {
        if (!req.user) {
          return res.status(401).json({ message: 'Login required for avatar uploads' });
        }
        finalKey = `uploads/users/${uid}/avatar-${id}.${ext}`;
      } else if (purpose === 'classLogo' || purpose === 'classBanner') {
        if (!req.user) {
          return res.status(401).json({ message: 'Login required for class uploads' });
        }
        if (!classId) {
          return res.status(400).json({ message: 'classId is required for class logo/banner' });
        }
        if (req.user.role !== 'admin' && !(await isTeacherInClass(uid, classId))) {
          return res.status(403).json({ message: 'You must be a teacher in this class to upload assets' });
        }
        const sub = purpose === 'classLogo' ? 'logo' : 'banner';
        finalKey = `uploads/classes/${classId}/${sub}-${id}.${ext}`;
      } else if (purpose === 'lessonImage') {
        if (!lessonId) {
          return res.status(400).json({ message: 'lessonId is required for lesson images' });
        }
        const lesson = await Lesson.findByPk(lessonId, {
          include: [
            {
              model: Module,
              as: 'module',
              required: true,
              include: [{ model: Course, as: 'course', required: true }]
            }
          ]
        });
        if (!lesson) {
          return res.status(404).json({ message: 'Lesson not found' });
        }
        const wsId = lesson.module?.course?.workspaceId;
        assetCourseId = lesson.module.course.id;
        if (req.editorWorkspaceId) {
          if (!wsId || wsId !== req.editorWorkspaceId) {
            return res.status(403).json({ message: 'Access denied' });
          }
        } else if (req.user) {
          if (!(await canManageCourseContent(req.user, { lessonId, courseId: lesson.module.course.id }))) {
            return res.status(403).json({ message: 'You must manage a verified class assignment using this lesson' });
          }
        } else {
          return res.status(401).json({ message: 'Invalid token' });
        }
        finalKey = `uploads/lessons/${lessonId}/inline-${id}.${ext}`;
      } else if (purpose === 'courseCover') {
        if (!courseId) {
          return res.status(400).json({ message: 'courseId is required for course cover' });
        }
        const course = await Course.findByPk(courseId);
        if (!course) {
          return res.status(404).json({ message: 'Course not found' });
        }
        if (req.editorWorkspaceId) {
          if (!course.workspaceId || course.workspaceId !== req.editorWorkspaceId) {
            return res.status(403).json({ message: 'Access denied' });
          }
        } else if (req.user) {
          if (!(await canManageCourseContent(req.user, { courseId }))) {
            return res.status(403).json({ message: 'You must manage a verified class assignment using this course' });
          }
        } else {
          return res.status(401).json({ message: 'Invalid token' });
        }
        finalKey = `uploads/courses/${courseId}/cover-${id}.${ext}`;
      } else {
        return res.status(400).json({ message: 'Invalid purpose' });
      }

      const key = `quarantine/${finalKey}`;
      const { uploadUrl, fields, expiresIn, maxBytes } = await presignPost(key, mimeType, purpose);
      const asset = await UploadedAsset.create({
        key,
        finalKey,
        userId: req.user?.id || null,
        workspaceId: req.editorWorkspaceId || null,
        purpose,
        mimeType,
        classroomId: classId || null,
        lessonId: lessonId || null,
        courseId: assetCourseId,
        status: 'presigned',
      });

      return res.json({
        assetId: asset.id,
        uploadUrl,
        fields,
        key,
        publicUrl: null,
        status: 'presigned',
        visibility: 'quarantined',
        completionUrl: `/api/uploads/${asset.id}/complete`,
        expiresIn,
        maxBytes,
      });
    } catch (e) {
      console.error('Presign error:', e);
      return res.status(500).json({ message: e.message || 'Failed to create upload URL' });
    }
  }
);

/**
 * POST /api/uploads/:assetId/complete
 *
 * Validate the object S3 received, promote it out of the non-public quarantine
 * prefix, and only then return a browser-usable public URL.
 */
router.post('/:assetId/complete', authenticateUserOrEditor, async (req, res) => {
  try {
    const asset = await UploadedAsset.findByPk(req.params.assetId);
    if (!asset || !(await canCompleteAsset(req, asset))) {
      return res.status(404).json({ message: 'Upload not found' });
    }
    if (asset.status === 'ready') {
      return res.json({
        assetId: asset.id,
        status: 'ready',
        publicUrl: publicObjectUrl(asset.key),
      });
    }
    if (asset.status !== 'presigned') {
      return res.status(409).json({ message: 'Upload is not awaiting completion' });
    }
    const maxBytes = SIZE_LIMITS[asset.purpose];
    const quarantineKey = asset.key;
    const completed = await completeQuarantinedUpload({
      quarantineKey,
      finalKey: asset.finalKey,
      mimeType: asset.mimeType,
      maxBytes,
    });
    await asset.update({ key: completed.key, status: 'ready' });
    try {
      await deleteOwnedObject(quarantineKey);
    } catch (cleanupError) {
      // The validated public copy and registry are already durable. A stale
      // private quarantine copy is safe and remains derivable for erasure.
      console.error('Quarantine cleanup error:', cleanupError);
    }
    return res.json({
      assetId: asset.id,
      status: 'ready',
      publicUrl: publicObjectUrl(completed.key),
      sizeBytes: completed.sizeBytes,
    });
  } catch (error) {
    console.error('Upload completion error:', error);
    return res.status(error.status || 500).json({
      message: error.status ? error.message : 'Could not validate the uploaded file',
    });
  }
});

module.exports = router;
