const express = require('express');
const jwt = require('jsonwebtoken');
const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const EditorWorkspace = require('../models/EditorWorkspace');
const { digestEditorCode } = require('../utils/editorCode');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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

function authenticateEditor(req, res, next) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.typ !== 'editor' || !decoded.wid) {
      return res.status(401).json({ message: 'Invalid editor token' });
    }
    req.workspaceId = decoded.wid;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

async function loadWorkspaceCourse(courseId, workspaceId) {
  const course = await Course.findOne({
    where: { id: courseId, workspaceId },
    include: includeModulesWithLessons()
  });
  return course;
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
      { expiresIn: '60d' }
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

// GET /api/editor/tree — full workspace course tree
router.get('/tree', async (req, res) => {
  try {
    const courses = await Course.findAll({
      where: { workspaceId: req.workspaceId },
      order: [['createdAt', 'DESC']],
      include: includeModulesWithLessons()
    });
    const rows = courses.map((c) => sortCourseContent(c.toJSON ? c.toJSON() : c));
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
      isPublished: body.isPublished ?? false,
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

    const lesson = await Lesson.create({
      moduleId,
      title: body.title || 'Untitled lesson',
      description: body.description ?? null,
      content: body.content ?? null,
      videoUrl: body.videoUrl ?? null,
      duration: body.duration ?? 5,
      order: nextOrder,
      lessonType: body.lessonType || 'reading',
      isPublished: body.isPublished !== false,
      slides: body.slides ?? []
    });

    const full = await loadWorkspaceCourse(mod.courseId, req.workspaceId);
    res.status(201).json({ lesson: lesson.toJSON(), course: sortCourseContent(full.toJSON()) });
  } catch (e) {
    console.error('Editor create lesson error:', e);
    res.status(500).json({ message: 'Internal server error' });
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

    const allowed = [
      'title', 'description', 'content', 'videoUrl', 'duration', 'order',
      'lessonType', 'isPublished', 'resources', 'metadata', 'slides'
    ];
    const patch = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) patch[k] = req.body[k];
    });
    await lesson.update(patch);

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
    console.error('Editor update lesson error:', e);
    res.status(500).json({ message: 'Internal server error' });
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
