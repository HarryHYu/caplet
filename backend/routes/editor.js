const express = require('express');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const EditorWorkspace = require('../models/EditorWorkspace');
const { digestEditorCode } = require('../utils/editorCode');
const { JWT_SECRET } = require('../middleware/auth');
const { resolveEditorWorkspaceId, resolveReviewerUser } = require('../middleware/editorAuth');
const { validateSlides } = require('../utils/slideSchema');
const { validateLessonContent } = require('../services/contentValidation');

const router = express.Router();

/**
 * Normalize/validate the optional `slides` field on a lesson payload.
 * Returns { ok: true, slides } where slides is the normalized array (or
 * undefined if the caller didn't send any), or { ok: false, errors }.
 *
 * `null` and `[]` are both treated as "no slides" and allowed through.
 */
function processSlidesPayload(input) {
  if (input === undefined) return { ok: true, slides: undefined };
  if (input === null) return { ok: true, slides: null };
  if (Array.isArray(input) && input.length === 0) return { ok: true, slides: [] };
  const result = validateSlides(input);
  if (!result.ok) return { ok: false, errors: result.errors };
  return { ok: true, slides: result.slides };
}

const includeModulesWithLessons = () => [
  {
    model: Module,
    as: 'modules',
    required: false,
    include: [
      {
        model: Lesson,
        as: 'lessons',
        required: false
      }
    ]
  }
];

function sortCourseContent(course) {
  if (!course) return course;
  const modules = (course.modules || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  modules.forEach((m) => {
    const lessons = (m.lessons || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    lessons.forEach((l) => {
      if (l && typeof l.slides === 'string' && l.slides.trim()) {
        try {
          l.slides = JSON.parse(l.slides);
        } catch {
          l.slides = null;
        }
      }
    });
    m.lessons = lessons;
  });
  course.modules = modules;
  return course;
}

async function attachLessonOutcomes(courses) {
  const { ContentOutcome } = require('../models');
  const lessons = courses.flatMap((course) => (course.modules || []).flatMap((module) => module.lessons || []));
  const ids = lessons.map((lesson) => String(lesson.id));
  if (!ids.length) return courses;
  const rows = await ContentOutcome.findAll({
    where: { contentType: 'lesson', contentId: { [Op.in]: ids } },
    attributes: ['contentId', 'outcomeId'],
  });
  const byLesson = new Map();
  for (const row of rows) {
    const list = byLesson.get(String(row.contentId)) || [];
    list.push(row.outcomeId);
    byLesson.set(String(row.contentId), list);
  }
  lessons.forEach((lesson) => { lesson.outcomeIds = byLesson.get(String(lesson.id)) || []; });
  return courses;
}

async function authenticateEditor(req, res, next) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    req.workspaceId = await resolveEditorWorkspaceId(token);
    next();
  } catch (error) {
    res.status(error.status || 401).json({ message: error.message || 'Editor access code required' });
  }
}

async function loadWorkspaceCourse(courseId, workspaceId) {
  const course = await Course.findOne({
    where: { id: courseId, workspaceId },
    include: includeModulesWithLessons()
  });
  return course;
}

async function outcomeIdsForLesson(lesson) {
  const { ContentOutcome } = require('../models');
  const rows = await ContentOutcome.findAll({ where: { contentType: 'lesson', contentId: String(lesson.id) } });
  return rows.map((row) => row.outcomeId);
}

async function replaceLessonOutcomes(lessonId, outcomeIds = [], transaction = undefined) {
  const { ContentOutcome, CurriculumOutcome } = require('../models');
  const unique = [...new Set(outcomeIds.filter(Boolean).map(String))];
  if (unique.length) {
    const count = await CurriculumOutcome.count({ where: { id: { [Op.in]: unique }, isActive: true }, transaction });
    if (count !== unique.length) {
      const error = new Error('One or more curriculum outcomes are invalid or inactive.');
      error.status = 400;
      throw error;
    }
  }
  await ContentOutcome.destroy({ where: { contentType: 'lesson', contentId: String(lessonId) }, transaction });
  if (unique.length) {
    await ContentOutcome.bulkCreate(unique.map((outcomeId) => ({
      contentType: 'lesson', contentId: String(lessonId), outcomeId, weight: 1, metadata: {},
    })), { transaction });
  }
  return unique;
}

async function recordLessonRevision(lesson, workspaceId, changeSummary, transaction = undefined) {
  const { ContentRevision } = require('../models');
  if (!ContentRevision) return null;
  return ContentRevision.create({
    entityType: 'lesson',
    entityId: String(lesson.id),
    version: Number(lesson.contentVersion || 1),
    snapshot: lesson.toJSON ? lesson.toJSON() : lesson,
    workspaceId,
    changeSummary: changeSummary || 'Lesson updated',
  }, { transaction });
}

function sendEditorError(res, error, context, fallback = 'Internal server error') {
  const status = Number(error?.status) || 500;
  if (status >= 500) console.error(`${context}:`, error);
  return res.status(status).json({ message: status >= 500 ? fallback : error.message });
}

async function lessonValidationPayload(lesson, overrides = {}) {
  const outcomeIds = overrides.outcomeIds || await outcomeIdsForLesson(lesson);
  return {
    ...(lesson.toJSON ? lesson.toJSON() : lesson),
    ...overrides,
    outcomeIds,
  };
}

// POST /api/editor/enter — exchange code for editor JWT (no user login)
router.post('/enter', async (req, res) => {
  try {
    const code = req.body?.code;
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ message: 'code is required' });
    }
    const digest = digestEditorCode(code);
    const ws = await EditorWorkspace.findOne({ where: { codeDigest: digest } });
    if (!ws) {
      return res.status(401).json({ message: 'Invalid code' });
    }
    const token = jwt.sign(
      { typ: 'editor', wid: ws.id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({
      token,
      workspace: { id: ws.id, label: ws.label }
    });
  } catch (e) {
    console.error('Editor enter error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.use(authenticateEditor);

router.get('/curriculum-outcomes', async (req, res) => {
  try {
    const { CurriculumOutcome } = require('../models');
    const where = { isActive: true };
    if (req.query.subject) where.subject = String(req.query.subject).toLowerCase();
    if (req.query.syllabusVersion) where.syllabusVersion = String(req.query.syllabusVersion);
    const outcomes = await CurriculumOutcome.findAll({ where, order: [['sortOrder', 'ASC'], ['code', 'ASC']] });
    res.json({ outcomes });
  } catch {
    res.status(500).json({ message: 'Could not load curriculum outcomes.' });
  }
});

// GET /api/editor/tree — full workspace course tree
router.get('/tree', async (req, res) => {
  try {
    const courses = await Course.findAll({
      where: { workspaceId: req.workspaceId },
      order: [['createdAt', 'DESC']],
      include: includeModulesWithLessons()
    });
    const rows = courses.map((c) => sortCourseContent(c.toJSON ? c.toJSON() : c));
    await attachLessonOutcomes(rows);
    res.json({ courses: rows });
  } catch (e) {
    console.error('Editor tree error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/editor/courses
router.post('/courses', async (req, res) => {
  try {
    const body = req.body || {};
    const course = await Course.create({
      workspaceId: req.workspaceId,
      title: body.title || 'Untitled course',
      description: body.description ?? '',
      shortDescription: body.shortDescription || 'Draft',
      category: body.category || 'other',
      level: body.level || 'beginner',
      duration: body.duration ?? 0,
      thumbnail: body.thumbnail ?? null,
      isPublished: false,
      isFree: body.isFree !== false,
      price: body.price ?? 0
    });
    const full = await loadWorkspaceCourse(course.id, req.workspaceId);
    res.status(201).json({ course: sortCourseContent(full.toJSON()) });
  } catch (e) {
    console.error('Editor create course error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/editor/courses/:courseId
router.put('/courses/:courseId', async (req, res) => {
  try {
    const course = await Course.findOne({
      where: { id: req.params.courseId, workspaceId: req.workspaceId }
    });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const allowed = [
      'title', 'description', 'shortDescription', 'category', 'level', 'duration',
      'thumbnail', 'isPublished', 'isFree', 'price', 'tags', 'prerequisites', 'learningOutcomes', 'metadata'
    ];
    const patch = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    });
    if (patch.isPublished === true) {
      const modules = await Module.findAll({ where: { courseId: course.id }, attributes: ['id'] });
      const moduleIds = modules.map((module) => module.id);
      const lessons = moduleIds.length ? await Lesson.findAll({ where: { moduleId: { [Op.in]: moduleIds } }, attributes: ['lifecycleStatus'] }) : [];
      if (!lessons.length || lessons.some((lesson) => lesson.lifecycleStatus !== 'published')) {
        return res.status(422).json({ message: 'Publish every lesson through the quality lifecycle before publishing the course.' });
      }
    }
    await course.update(patch);
    const full = await loadWorkspaceCourse(course.id, req.workspaceId);
    res.json({ course: sortCourseContent(full.toJSON()) });
  } catch (e) {
    console.error('Editor update course error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/editor/courses/:courseId
router.delete('/courses/:courseId', async (req, res) => {
  try {
    const course = await Course.findOne({
      where: { id: req.params.courseId, workspaceId: req.workspaceId }
    });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const modules = await Module.findAll({ where: { courseId: course.id }, attributes: ['id'] });
    const protectedLessons = modules.length ? await Lesson.count({
      where: { moduleId: { [Op.in]: modules.map((module) => module.id) }, lifecycleStatus: { [Op.in]: ['published', 'superseded'] } },
    }) : 0;
    if (protectedLessons) return res.status(409).json({ message: 'Published lesson history cannot be deleted. Archive or unpublish the course instead.' });
    await course.destroy();
    res.json({ message: 'Course deleted' });
  } catch (e) {
    console.error('Editor delete course error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/editor/modules
router.post('/modules', async (req, res) => {
  try {
    const { courseId, title, description, order } = req.body || {};
    if (!courseId) return res.status(400).json({ message: 'courseId is required' });
    const course = await Course.findOne({
      where: { id: courseId, workspaceId: req.workspaceId }
    });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    let nextOrder = order;
    if (nextOrder === undefined) {
      const max = await Module.max('order', { where: { courseId } });
      nextOrder = (max ?? -1) + 1;
    }

    const mod = await Module.create({
      courseId,
      title: title || 'Untitled module',
      description: description ?? null,
      order: nextOrder,
      isPublished: true
    });
    const full = await loadWorkspaceCourse(courseId, req.workspaceId);
    res.status(201).json({ module: mod.toJSON(), course: sortCourseContent(full.toJSON()) });
  } catch (e) {
    console.error('Editor create module error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PUT /api/editor/modules/:moduleId
router.put('/modules/:moduleId', async (req, res) => {
  try {
    const mod = await Module.findByPk(req.params.moduleId, {
      include: [{ model: Course, as: 'course', required: true }]
    });
    if (!mod || !mod.course || mod.course.workspaceId !== req.workspaceId) {
      return res.status(404).json({ message: 'Module not found' });
    }
    const { title, description, order, isPublished } = req.body || {};
    const patch = {};
    if (title !== undefined) patch.title = title;
    if (description !== undefined) patch.description = description;
    if (order !== undefined) patch.order = order;
    if (isPublished !== undefined) patch.isPublished = isPublished;
    await mod.update(patch);
    const full = await loadWorkspaceCourse(mod.courseId, req.workspaceId);
    res.json({ module: mod.toJSON(), course: sortCourseContent(full.toJSON()) });
  } catch (e) {
    console.error('Editor update module error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE /api/editor/modules/:moduleId
router.delete('/modules/:moduleId', async (req, res) => {
  try {
    const mod = await Module.findByPk(req.params.moduleId, {
      include: [{ model: Course, as: 'course', required: true }]
    });
    if (!mod || !mod.course || mod.course.workspaceId !== req.workspaceId) {
      return res.status(404).json({ message: 'Module not found' });
    }
    const protectedLessons = await Lesson.count({ where: { moduleId: mod.id, lifecycleStatus: { [Op.in]: ['published', 'superseded'] } } });
    if (protectedLessons) return res.status(409).json({ message: 'Published lesson history cannot be deleted with its module.' });
    const courseId = mod.courseId;
    await mod.destroy();
    const full = await loadWorkspaceCourse(courseId, req.workspaceId);
    res.json({ message: 'Module deleted', course: sortCourseContent(full.toJSON()) });
  } catch (e) {
    console.error('Editor delete module error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST /api/editor/lessons
router.post('/lessons', async (req, res) => {
  try {
    const body = req.body || {};
    const { moduleId } = body;
    if (!moduleId) return res.status(400).json({ message: 'moduleId is required' });

    const mod = await Module.findByPk(moduleId, {
      include: [{ model: Course, as: 'course', required: true }]
    });
    if (!mod || !mod.course || mod.course.workspaceId !== req.workspaceId) {
      return res.status(404).json({ message: 'Module not found' });
    }

    let nextOrder = body.order;
    if (nextOrder === undefined) {
      const max = await Lesson.max('order', { where: { moduleId } });
      nextOrder = (max ?? -1) + 1;
    }

    const slidesResult = processSlidesPayload(body.slides ?? []);
    if (!slidesResult.ok) {
      return res.status(400).json({ message: 'Invalid slides', errors: slidesResult.errors });
    }

    const { sequelize } = require('../models');
    const lesson = await sequelize.transaction(async (transaction) => {
      const created = await Lesson.create({
        moduleId,
        title: body.title || 'Untitled lesson',
        description: body.description ?? null,
        content: body.content ?? null,
        videoUrl: body.videoUrl ?? null,
        duration: body.duration ?? 5,
        order: nextOrder,
        lessonType: body.lessonType || 'reading',
        isPublished: false,
        slides: slidesResult.slides ?? [],
        lifecycleStatus: 'draft',
        syllabusVersion: body.syllabusVersion || null,
        difficulty: body.difficulty || null,
        estimatedMinutes: body.estimatedMinutes ?? body.duration ?? 5,
        assessmentPurpose: body.assessmentPurpose || null,
        sourceInfo: body.sourceInfo || {},
        contentVersion: 1,
        metadata: { ...(body.metadata || {}), outcomeIds: Array.isArray(body.outcomeIds) ? body.outcomeIds : [] },
      }, { transaction });
      if (Array.isArray(body.outcomeIds)) await replaceLessonOutcomes(created.id, body.outcomeIds, transaction);
      await recordLessonRevision(created, req.workspaceId, 'Lesson created', transaction);
      return created;
    });

    const full = await loadWorkspaceCourse(mod.courseId, req.workspaceId);
    res.status(201).json({ lesson: lesson.toJSON(), course: sortCourseContent(full.toJSON()) });
  } catch (e) {
    sendEditorError(res, e, 'Editor create lesson error');
  }
});

// PUT /api/editor/lessons/:lessonId
router.put('/lessons/:lessonId', async (req, res) => {
  try {
    const lesson = await Lesson.findByPk(req.params.lessonId, {
      include: [{
        model: Module,
        as: 'module',
        required: true,
        include: [{ model: Course, as: 'course', required: true }]
      }]
    });
    if (!lesson || !lesson.module.course || lesson.module.course.workspaceId !== req.workspaceId) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    if (['published', 'superseded'].includes(lesson.lifecycleStatus)) {
      return res.status(409).json({ message: 'Published lesson versions are read-only. Create a new draft version to make changes.' });
    }

    const allowed = [
      'title', 'description', 'content', 'videoUrl', 'duration', 'order',
      'lessonType', 'resources', 'metadata', 'syllabusVersion', 'difficulty',
      'estimatedMinutes', 'assessmentPurpose', 'sourceInfo', 'reviewNotes', 'supersededBy'
    ];
    const patch = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    });

    if (req.body.slides !== undefined) {
      const slidesResult = processSlidesPayload(req.body.slides);
      if (!slidesResult.ok) {
        return res.status(400).json({ message: 'Invalid slides', errors: slidesResult.errors });
      }
      patch.slides = slidesResult.slides;
    }

    if (req.body.lifecycleStatus !== undefined || req.body.isPublished !== undefined) {
      return res.status(400).json({ message: 'Use the lifecycle endpoint to submit, approve, publish, or supersede content.' });
    }
    const nextVersion = Number(lesson.contentVersion || 1) + 1;
    patch.contentVersion = nextVersion;
    const { sequelize } = require('../models');
    await sequelize.transaction(async (transaction) => {
      if (Array.isArray(req.body.outcomeIds)) {
        const ids = await replaceLessonOutcomes(lesson.id, req.body.outcomeIds, transaction);
        patch.metadata = { ...(patch.metadata || lesson.metadata || {}), outcomeIds: ids };
      }
      await lesson.update(patch, { transaction });
      await recordLessonRevision(lesson, req.workspaceId, req.body.changeSummary || 'Lesson updated', transaction);
    });

    const full = await loadWorkspaceCourse(lesson.module.courseId, req.workspaceId);
    const lessonJson = lesson.toJSON();
    if (lessonJson && typeof lessonJson.slides === 'string' && lessonJson.slides.trim()) {
      try {
        lessonJson.slides = JSON.parse(lessonJson.slides);
      } catch {
        lessonJson.slides = null;
      }
    }
    res.json({ lesson: lessonJson, course: sortCourseContent(full.toJSON()) });
  } catch (e) {
    sendEditorError(res, e, 'Editor update lesson error');
  }
});

// Create an editable successor without mutating the currently published lesson.
router.post('/lessons/:lessonId/new-version', async (req, res) => {
  try {
    const original = await Lesson.findByPk(req.params.lessonId, {
      include: [{ model: Module, as: 'module', required: true, include: [{ model: Course, as: 'course', required: true }] }],
    });
    if (!original || original.module.course.workspaceId !== req.workspaceId) return res.status(404).json({ message: 'Lesson not found' });
    if (original.lifecycleStatus !== 'published') return res.status(409).json({ message: 'Only a published lesson can start a new draft version.' });
    const existingSuccessor = await Lesson.findOne({ where: { previousVersionId: original.id } });
    if (existingSuccessor) {
      return res.status(409).json({ message: 'A successor draft already exists for this published lesson.', successorId: existingSuccessor.id });
    }
    const outcomeIds = await outcomeIdsForLesson(original);
    const { sequelize } = require('../models');
    const successor = await sequelize.transaction(async (transaction) => {
      const created = await Lesson.create({
        moduleId: original.moduleId,
        title: original.title,
        description: original.description,
        content: original.content,
        videoUrl: original.videoUrl,
        duration: original.duration,
        order: original.order,
        lessonType: original.lessonType,
        resources: original.resources,
        metadata: { ...(original.metadata || {}), outcomeIds, versionOf: original.id },
        slides: original.slides,
        isPublished: false,
        lifecycleStatus: 'draft',
        syllabusVersion: original.syllabusVersion,
        difficulty: original.difficulty,
        estimatedMinutes: original.estimatedMinutes,
        assessmentPurpose: original.assessmentPurpose,
        sourceInfo: original.sourceInfo || {},
        contentVersion: Number(original.contentVersion || 1) + 1,
        reviewedBy: null,
        reviewedAt: null,
        reviewNotes: null,
        supersededBy: null,
        previousVersionId: original.id,
      }, { transaction });
      await replaceLessonOutcomes(created.id, outcomeIds, transaction);
      await original.update({ supersededBy: created.id }, { transaction });
      await recordLessonRevision(created, req.workspaceId, `Drafted from published lesson ${original.id}`, transaction);
      return created;
    });
    const full = await loadWorkspaceCourse(original.module.courseId, req.workspaceId);
    res.status(201).json({ lesson: successor, course: sortCourseContent(full.toJSON()) });
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      error.status = 409;
      error.message = 'A successor draft already exists for this published lesson.';
    }
    sendEditorError(res, error, 'Editor new lesson version error');
  }
});

router.post('/lessons/:lessonId/validate', async (req, res) => {
  try {
    const lesson = await Lesson.findByPk(req.params.lessonId, {
      include: [{ model: Module, as: 'module', required: true, include: [{ model: Course, as: 'course', required: true }] }],
    });
    if (!lesson || lesson.module.course.workspaceId !== req.workspaceId) return res.status(404).json({ message: 'Lesson not found' });
    const payload = await lessonValidationPayload(lesson, req.body || {});
    res.json({ validation: validateLessonContent(payload) });
  } catch {
    res.status(500).json({ message: 'Could not validate this lesson.' });
  }
});

const LIFECYCLE_TRANSITIONS = {
  draft: ['in_review'],
  in_review: ['draft', 'approved'],
  approved: ['draft', 'published'],
  published: ['superseded'],
  superseded: [],
};

router.post('/lessons/:lessonId/lifecycle', async (req, res) => {
  try {
    const lesson = await Lesson.findByPk(req.params.lessonId, {
      include: [{ model: Module, as: 'module', required: true, include: [{ model: Course, as: 'course', required: true }] }],
    });
    if (!lesson || lesson.module.course.workspaceId !== req.workspaceId) return res.status(404).json({ message: 'Lesson not found' });
    const next = String(req.body?.status || '');
    const current = lesson.lifecycleStatus || (lesson.isPublished ? 'published' : 'draft');
    if (!(LIFECYCLE_TRANSITIONS[current] || []).includes(next)) {
      return res.status(409).json({ message: `Cannot move content from ${current} to ${next}.` });
    }
    const outcomeIds = await outcomeIdsForLesson(lesson);
    const validation = validateLessonContent(await lessonValidationPayload(lesson, { outcomeIds, lifecycleStatus: next }));
    if (['in_review', 'approved', 'published'].includes(next) && !validation.ok) {
      return res.status(422).json({ message: 'Resolve publishing checks first.', validation });
    }
    const reviewer = next === 'approved' ? await resolveReviewerUser(req) : null;
    const reviewerName = reviewer ? [reviewer.firstName, reviewer.lastName].filter(Boolean).join(' ').slice(0, 120) : '';
    if (next === 'approved' && req.body?.humanReviewed !== true) {
      return res.status(422).json({ message: 'Confirm the signed-in reviewer completed the quality review.' });
    }
    const { sequelize } = require('../models');
    await sequelize.transaction(async (transaction) => {
      await lesson.update({
        lifecycleStatus: next,
        isPublished: next === 'published',
        reviewedAt: ['approved', 'published'].includes(next) ? new Date() : lesson.reviewedAt,
        reviewedBy: next === 'approved' ? reviewer.id : lesson.reviewedBy,
        reviewNotes: req.body?.reviewNotes ?? lesson.reviewNotes,
        metadata: next === 'approved' ? {
          ...(lesson.metadata || {}),
          reviewAttribution: { reviewerName, reviewerUserId: reviewer.id, workspaceId: req.workspaceId, reviewedAt: new Date().toISOString() },
        } : lesson.metadata,
        supersededBy: next === 'superseded' ? req.body?.supersededBy || lesson.supersededBy : lesson.supersededBy,
        contentVersion: Number(lesson.contentVersion || 1) + 1,
      }, { transaction });
      if (next === 'published' && lesson.previousVersionId) {
        const previous = await Lesson.findOne({ where: { id: lesson.previousVersionId, supersededBy: lesson.id }, transaction });
        if (previous) {
          await previous.update({
            lifecycleStatus: 'superseded',
            isPublished: false,
            contentVersion: Number(previous.contentVersion || 1) + 1,
          }, { transaction });
          await recordLessonRevision(previous, req.workspaceId, `Superseded by lesson ${lesson.id}`, transaction);
        }
      }
      await recordLessonRevision(lesson, req.workspaceId, `Lifecycle: ${current} → ${next}`, transaction);
    });
    res.json({ lesson, validation });
  } catch (error) {
    console.error('Lesson lifecycle error:', error);
    res.status(error.status || 500).json({ message: error.message || 'Could not update content lifecycle.' });
  }
});

router.get('/lessons/:lessonId/history', async (req, res) => {
  try {
    const lesson = await Lesson.findByPk(req.params.lessonId, {
      include: [{ model: Module, as: 'module', required: true, include: [{ model: Course, as: 'course', required: true }] }],
    });
    if (!lesson || lesson.module.course.workspaceId !== req.workspaceId) return res.status(404).json({ message: 'Lesson not found' });
    const { ContentRevision } = require('../models');
    const revisions = await ContentRevision.findAll({ where: { entityType: 'lesson', entityId: String(lesson.id) }, order: [['version', 'DESC']] });
    res.json({ revisions });
  } catch {
    res.status(500).json({ message: 'Could not load lesson history.' });
  }
});

// DELETE /api/editor/lessons/:lessonId
router.delete('/lessons/:lessonId', async (req, res) => {
  try {
    const lesson = await Lesson.findByPk(req.params.lessonId, {
      include: [{
        model: Module,
        as: 'module',
        required: true,
        include: [{ model: Course, as: 'course', required: true }]
      }]
    });
    if (!lesson || !lesson.module.course || lesson.module.course.workspaceId !== req.workspaceId) {
      return res.status(404).json({ message: 'Lesson not found' });
    }
    if (['published', 'superseded'].includes(lesson.lifecycleStatus)) {
      return res.status(409).json({ message: 'Published lesson history cannot be deleted.' });
    }
    const courseId = lesson.module.courseId;
    await lesson.destroy();
    const full = await loadWorkspaceCourse(courseId, req.workspaceId);
    res.json({ message: 'Lesson deleted', course: sortCourseContent(full.toJSON()) });
  } catch (e) {
    console.error('Editor delete lesson error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
