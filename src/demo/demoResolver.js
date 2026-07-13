/**
 * Stateful, browser-local API for the `/demo` sandbox.
 *
 * The store is recreated on a hard refresh and can also be reset from the Demo
 * shell. Every showcased write updates this store, so the real product screens
 * behave consistently without contacting the backend.
 */
import {
  AI_CHAT_GENERATE,
  DEMO_CLASSES,
  DEMO_COURSES,
  DEMO_CURRICULUM_OUTCOMES,
  DEMO_EDITOR_TREE,
  DEMO_SAVED_SLIDES,
  DEMO_TEACHER_ANALYTICS,
  DEMO_USER,
  getAnnouncementComments,
  getAssignmentComments,
  getClassDetail,
  getCourseDetail,
  getLessonById,
  getProgress,
} from './demoData.js';

const clone = (value) => (
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value))
);

const parseBody = (options) => {
  if (options?.body && typeof options.body === 'object') return options.body;
  try {
    return options?.body ? JSON.parse(options.body) : {};
  } catch {
    return {};
  }
};

const endpointPath = (endpoint) => endpoint.split('?')[0];
const now = () => new Date().toISOString();

function createSeedState() {
  const fullCourses = DEMO_COURSES.map((course) => clone(getCourseDetail(course.id)));
  return {
    courses: fullCourses,
    progress: Object.fromEntries(fullCourses.map((course) => [course.id, clone(getProgress(course.id))])),
    savedSlides: clone(DEMO_SAVED_SLIDES.savedSlides || []),
    classes: clone(DEMO_CLASSES),
    classDetails: { 'cls-commerce': clone(getClassDetail('cls-commerce')) },
    announcementComments: {
      'ann-1': clone(getAnnouncementComments('ann-1')),
      'ann-2': clone(getAnnouncementComments('ann-2')),
    },
    assignmentComments: {
      'asg-budget': clone(getAssignmentComments('asg-budget')),
      'asg-gst': clone(getAssignmentComments('asg-gst')),
    },
    moderationReports: [],
    editorTree: clone(DEMO_EDITOR_TREE),
    editorHistory: {
      l_what_is_budget: [{ id: 'revision-budget-1', version: 1, changeSummary: 'Initial classroom-ready draft', createdAt: '2026-07-08T09:00:00.000Z' }],
    },
    teacherAnalytics: clone(DEMO_TEACHER_ANALYTICS),
    adaptiveAssignments: [],
  };
}

let state = createSeedState();
let idSequence = 1000;
const nextId = (prefix = 'demo') => `${prefix}-${idSequence++}`;

export function resetDemo() {
  state = createSeedState();
  idSequence = 1000;
  return getDemoSnapshot();
}

export function getDemoSnapshot() {
  return clone(state);
}

function findCourse(courseId) {
  return state.courses.find((course) => String(course.id) === String(courseId)) || null;
}

function findCourseForLesson(lessonId) {
  return state.courses.find((course) => (
    course.modules || []
  ).some((module) => (module.lessons || []).some((lesson) => String(lesson.id) === String(lessonId)))) || null;
}

function findEditorCourse(courseId) {
  return state.editorTree.courses.find((course) => String(course.id) === String(courseId)) || null;
}

function findEditorModule(moduleId) {
  for (const course of state.editorTree.courses) {
    const module = (course.modules || []).find((entry) => String(entry.id) === String(moduleId));
    if (module) return { course, module };
  }
  return null;
}

function findEditorLesson(lessonId) {
  for (const course of state.editorTree.courses) {
    for (const module of course.modules || []) {
      const lesson = (module.lessons || []).find((entry) => String(entry.id) === String(lessonId));
      if (lesson) return { course, module, lesson };
    }
  }
  return null;
}

function updateLessonProgress(lessonId, patch) {
  const course = findCourseForLesson(lessonId);
  if (!course) return { progress: null };
  const courseProgress = state.progress[course.id] || clone(getProgress(course.id));
  let record = (courseProgress.lessonProgress || []).find((item) => String(item.lessonId) === String(lessonId));
  if (!record) {
    record = { lessonId, status: 'not_started', lastSlideIndex: 0, quizScores: {} };
    courseProgress.lessonProgress.push(record);
  }
  Object.assign(record, patch);
  const totalLessons = (course.modules || []).reduce((count, module) => count + (module.lessons || []).length, 0);
  const completedLessons = courseProgress.lessonProgress.filter((item) => item.status === 'completed').length;
  courseProgress.courseProgress = {
    ...(courseProgress.courseProgress || {}),
    totalLessons,
    completedLessons,
    progressPercentage: totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0,
    status: completedLessons === totalLessons ? 'completed' : completedLessons ? 'in_progress' : 'not_started',
  };
  state.progress[course.id] = courseProgress;
  return { progress: clone(record), courseProgress: clone(courseProgress.courseProgress) };
}

function removeComment(commentId) {
  for (const bucket of [state.announcementComments, state.assignmentComments]) {
    for (const [parentId, comments] of Object.entries(bucket)) {
      bucket[parentId] = comments.filter((comment) => String(comment.id) !== String(commentId));
    }
  }
}

function unsupported(method, endpoint) {
  const error = new Error(`This action is not available in the Demo yet (${method} ${endpointPath(endpoint)}).`);
  error.code = 'DEMO_UNSUPPORTED_REQUEST';
  if (import.meta?.env?.DEV) console.error('[demo] unsupported request', method, endpoint);
  throw error;
}

async function withDelay(value, delay = 70) {
  await new Promise((resolve) => setTimeout(resolve, delay));
  return clone(value);
}

export async function resolveDemo(method, endpoint, options = {}) {
  const requestMethod = String(method || 'GET').toUpperCase();
  const path = endpointPath(endpoint);
  const body = parseBody(options);
  let match;

  // Identity and public curriculum.
  if (requestMethod === 'GET' && path === '/auth/me') return withDelay({ user: DEMO_USER });
  if (requestMethod === 'GET' && path === '/users/profile') return withDelay({ user: DEMO_USER });
  if (requestMethod === 'GET' && path === '/courses') return withDelay({ courses: state.courses });
  if (requestMethod === 'GET' && (match = path.match(/^\/courses\/([^/]+)$/))) {
    return withDelay({ course: findCourse(match[1]) });
  }
  if (requestMethod === 'GET' && (match = path.match(/^\/courses\/([^/]+)\/lessons\/([^/]+)$/))) {
    const course = findCourse(match[1]);
    const lesson = course
      ? (course.modules || []).flatMap((module) => module.lessons || []).find((item) => String(item.id) === String(match[2]))
      : getLessonById(match[1], match[2]);
    return withDelay({ lesson: lesson || null });
  }

  // Learner progress, saved slides, and non-critical analytics.
  if (requestMethod === 'GET' && (match = path.match(/^\/progress\/course\/([^/]+)$/))) {
    return withDelay(state.progress[match[1]] || getProgress(match[1]));
  }
  if (requestMethod === 'GET' && path === '/progress') {
    return withDelay({ courses: Object.values(state.progress), lessons: [], stats: { lessonsCompleted: 3, coursesInProgress: 1 } });
  }
  if (requestMethod === 'PUT' && (match = path.match(/^\/progress\/lesson\/([^/]+)$/))) {
    return withDelay(updateLessonProgress(match[1], body));
  }
  if (requestMethod === 'POST' && /^\/progress\/[^/]+\/score$/.test(path)) return withDelay({ accepted: true });
  if (requestMethod === 'POST' && path === '/events') return withDelay({ accepted: true }, 10);
  if (requestMethod === 'GET' && path === '/saved-slides') return withDelay({ savedSlides: state.savedSlides });
  if (requestMethod === 'POST' && path === '/saved-slides') {
    const savedSlide = { id: nextId('saved'), createdAt: now(), ...body };
    state.savedSlides.push(savedSlide);
    return withDelay({ savedSlide });
  }
  if (requestMethod === 'DELETE' && (match = path.match(/^\/saved-slides\/([^/]+)$/))) {
    state.savedSlides = state.savedSlides.filter((slide) => String(slide.id) !== String(match[1]));
    return withDelay({ deleted: true });
  }
  if (requestMethod === 'POST' && path === '/saved-slides/categorize') return withDelay({ categories: [] });
  if (requestMethod === 'GET' && path === '/review/due') return withDelay({ items: [], due: [] });
  if (requestMethod === 'POST' && path === '/ai/tutor') {
    return withDelay({ answer: 'Use the worked example on this slide, then explain the idea in your own words.' }, 350);
  }

  // Classroom reads and local writes.
  if (requestMethod === 'GET' && path === '/classes') return withDelay(state.classes);
  if (requestMethod === 'POST' && path === '/classes/join') return withDelay({ classroom: state.classes.teaching[0] });
  if (requestMethod === 'POST' && path === '/classes') {
    const classroom = { id: nextId('class'), code: `CAP-${idSequence}`, role: 'teacher', createdAt: now(), ...body };
    state.classes.teaching.push(classroom);
    return withDelay({ classroom });
  }
  if (requestMethod === 'GET' && (match = path.match(/^\/classes\/([^/]+)\/moderation\/reports$/))) {
    return withDelay({ reports: state.moderationReports, guidance: { responseTargetHours: 24, escalation: 'Class owner, then platform administrator' } });
  }
  if (requestMethod === 'GET' && (match = path.match(/^\/classes\/([^/]+)$/))) {
    return withDelay(state.classDetails[match[1]] || null);
  }
  if (requestMethod === 'GET' && (match = path.match(/^\/classes\/[^/]+\/announcements\/([^/]+)\/comments$/))) {
    return withDelay(state.announcementComments[match[1]] || []);
  }
  if (requestMethod === 'GET' && (match = path.match(/^\/classes\/[^/]+\/assignments\/([^/]+)\/comments$/))) {
    return withDelay(state.assignmentComments[match[1]] || []);
  }
  if (requestMethod === 'POST' && (match = path.match(/^\/classes\/([^/]+)\/announcements$/))) {
    const detail = state.classDetails[match[1]];
    const announcement = {
      id: nextId('announcement'),
      content: body.content,
      attachments: body.attachmentUrl ? [{ type: 'link', url: body.attachmentUrl }] : [],
      createdAt: now(),
      author: DEMO_USER,
      commentCount: 0,
    };
    detail.announcements.unshift(announcement);
    return withDelay({ announcement });
  }
  if (requestMethod === 'DELETE' && (match = path.match(/^\/classes\/([^/]+)\/announcements\/([^/]+)$/))) {
    const detail = state.classDetails[match[1]];
    detail.announcements = detail.announcements.filter((item) => String(item.id) !== String(match[2]));
    delete state.announcementComments[match[2]];
    return withDelay({ deleted: true });
  }
  if (requestMethod === 'POST' && (match = path.match(/^\/classes\/[^/]+\/announcements\/([^/]+)\/comments$/))) {
    const comment = { id: nextId('comment'), content: body.content, isPrivate: false, createdAt: now(), author: DEMO_USER };
    state.announcementComments[match[1]] = [...(state.announcementComments[match[1]] || []), comment];
    return withDelay(comment);
  }
  if (requestMethod === 'POST' && (match = path.match(/^\/classes\/[^/]+\/assignments\/([^/]+)\/comments$/))) {
    const comment = { id: nextId('comment'), content: body.content, isPrivate: !!body.isPrivate, targetUserId: body.targetUserId || null, targetUser: null, createdAt: now(), author: DEMO_USER };
    state.assignmentComments[match[1]] = [...(state.assignmentComments[match[1]] || []), comment];
    return withDelay(comment);
  }
  if (requestMethod === 'DELETE' && /^\/classes\/[^/]+\/(?:announcements|assignments)\/[^/]+\/comments\/([^/]+)$/.test(path)) {
    const commentId = path.split('/').at(-1);
    removeComment(commentId);
    return withDelay({ deleted: true });
  }
  if (requestMethod === 'POST' && (match = path.match(/^\/classes\/([^/]+)\/assignments$/))) {
    const detail = state.classDetails[match[1]];
    const assignment = { id: nextId('assignment'), submissions: [], commentCount: 0, course: null, lesson: null, ...body };
    if (body.courseId) assignment.course = findCourse(body.courseId);
    if (body.lessonId) assignment.lesson = assignment.course?.modules?.flatMap((module) => module.lessons || []).find((lesson) => String(lesson.id) === String(body.lessonId)) || null;
    detail.assignments.unshift(assignment);
    return withDelay({ assignment });
  }
  if (requestMethod === 'DELETE' && (match = path.match(/^\/classes\/([^/]+)\/assignments\/([^/]+)$/))) {
    const detail = state.classDetails[match[1]];
    detail.assignments = detail.assignments.filter((assignment) => String(assignment.id) !== String(match[2]));
    return withDelay({ deleted: true });
  }
  if (requestMethod === 'POST' && /^\/classes\/assignments\/[^/]+\/(?:complete|uncomplete)$/.test(path)) return withDelay({ updated: true });
  if (requestMethod === 'POST' && /^\/classes\/lessons\/[^/]+\/complete$/.test(path)) return withDelay({ updated: true });
  if (requestMethod === 'POST' && (match = path.match(/^\/classes\/([^/]+)\/teachers$/))) {
    const member = { id: nextId('teacher'), firstName: body.email?.split('@')[0] || 'Teacher', lastName: '', email: body.email, role: 'teacher' };
    state.classDetails[match[1]].members.push(member);
    return withDelay({ member });
  }
  if (requestMethod === 'DELETE' && (match = path.match(/^\/classes\/([^/]+)\/members\/([^/]+)$/))) {
    state.classDetails[match[1]].members = state.classDetails[match[1]].members.filter((member) => String(member.id) !== String(match[2]));
    return withDelay({ deleted: true });
  }
  if (requestMethod === 'POST' && (match = path.match(/^\/classes\/([^/]+)\/comments\/([^/]+)\/reports$/))) {
    const report = { id: nextId('report'), classroomId: match[1], commentId: match[2], status: 'pending', createdAt: now(), ...body };
    state.moderationReports.push(report);
    return withDelay({ report });
  }
  if (requestMethod === 'PATCH' && (match = path.match(/^\/classes\/[^/]+\/moderation\/reports\/([^/]+)$/))) {
    const report = state.moderationReports.find((item) => String(item.id) === String(match[1]));
    if (report) Object.assign(report, body);
    return withDelay({ report });
  }

  // Lesson editor, including the governance controls exposed by the real UI.
  if (requestMethod === 'POST' && path === '/editor/enter') return withDelay({ token: 'demo-editor-session' });
  if (requestMethod === 'GET' && path === '/editor/tree') return withDelay({ courses: state.editorTree.courses });
  if (requestMethod === 'GET' && path === '/editor/curriculum-outcomes') return withDelay({ outcomes: DEMO_CURRICULUM_OUTCOMES });
  if (requestMethod === 'POST' && path === '/editor/courses') {
    const course = { id: nextId('course'), title: body.title || 'New course', modules: [], isPublished: false, ...body };
    state.editorTree.courses.push(course);
    return withDelay({ course });
  }
  if (requestMethod === 'PUT' && (match = path.match(/^\/editor\/courses\/([^/]+)$/))) {
    const course = findEditorCourse(match[1]);
    Object.assign(course, body);
    return withDelay({ course });
  }
  if (requestMethod === 'DELETE' && (match = path.match(/^\/editor\/courses\/([^/]+)$/))) {
    state.editorTree.courses = state.editorTree.courses.filter((course) => String(course.id) !== String(match[1]));
    return withDelay({ deleted: true });
  }
  if (requestMethod === 'POST' && path === '/editor/modules') {
    const course = findEditorCourse(body.courseId);
    const module = { id: nextId('module'), title: body.title || 'New module', order: course.modules.length, courseId: course.id, lessons: [], ...body };
    course.modules.push(module);
    return withDelay({ module, course: { id: course.id } });
  }
  if (requestMethod === 'PUT' && (match = path.match(/^\/editor\/modules\/([^/]+)$/))) {
    const found = findEditorModule(match[1]);
    Object.assign(found.module, body);
    return withDelay({ module: found.module, course: { id: found.course.id } });
  }
  if (requestMethod === 'DELETE' && (match = path.match(/^\/editor\/modules\/([^/]+)$/))) {
    const found = findEditorModule(match[1]);
    found.course.modules = found.course.modules.filter((module) => String(module.id) !== String(match[1]));
    return withDelay({ deleted: true });
  }
  if (requestMethod === 'POST' && path === '/editor/lessons') {
    const found = findEditorModule(body.moduleId);
    const lesson = { id: nextId('lesson'), title: body.title || 'New lesson', order: found.module.lessons.length, moduleId: found.module.id, slides: [], lifecycleStatus: 'draft', contentVersion: 1, ...body };
    found.module.lessons.push(lesson);
    state.editorHistory[lesson.id] = [];
    return withDelay({ lesson, course: { id: found.course.id } });
  }
  if (requestMethod === 'PUT' && (match = path.match(/^\/editor\/lessons\/([^/]+)$/))) {
    const found = findEditorLesson(match[1]);
    Object.assign(found.lesson, body);
    const revisions = state.editorHistory[found.lesson.id] || [];
    revisions.unshift({ id: nextId('revision'), version: revisions.length + 1, changeSummary: 'Lesson saved in the Demo', createdAt: now() });
    state.editorHistory[found.lesson.id] = revisions;
    return withDelay({ lesson: found.lesson });
  }
  if (requestMethod === 'DELETE' && (match = path.match(/^\/editor\/lessons\/([^/]+)$/))) {
    const found = findEditorLesson(match[1]);
    found.module.lessons = found.module.lessons.filter((lesson) => String(lesson.id) !== String(match[1]));
    return withDelay({ deleted: true });
  }
  if (requestMethod === 'GET' && (match = path.match(/^\/editor\/lessons\/([^/]+)\/history$/))) {
    return withDelay({ revisions: state.editorHistory[match[1]] || [] });
  }
  if (requestMethod === 'POST' && (match = path.match(/^\/editor\/lessons\/([^/]+)\/validate$/))) {
    const errors = [];
    const warnings = [];
    if (!body.title?.trim()) errors.push({ code: 'missing_title', message: 'Add a lesson title.' });
    if (!Array.isArray(body.slides) || !body.slides.length) errors.push({ code: 'missing_slides', message: 'Add at least one slide.' });
    if (!body.outcomeIds?.length) warnings.push({ code: 'outcome_mapping', message: 'Map a curriculum outcome before publishing.' });
    return withDelay({ validation: { ok: errors.length === 0, errors, warnings } });
  }
  if (requestMethod === 'POST' && (match = path.match(/^\/editor\/lessons\/([^/]+)\/lifecycle$/))) {
    const found = findEditorLesson(match[1]);
    found.lesson.lifecycleStatus = body.status;
    return withDelay({ lesson: found.lesson, validation: { ok: true, errors: [], warnings: [] } });
  }
  if (requestMethod === 'POST' && (match = path.match(/^\/editor\/lessons\/([^/]+)\/new-version$/))) {
    const found = findEditorLesson(match[1]);
    const lesson = { ...clone(found.lesson), id: nextId('lesson'), title: `${found.lesson.title} — new draft`, lifecycleStatus: 'draft', contentVersion: Number(found.lesson.contentVersion || 1) + 1 };
    found.module.lessons.push(lesson);
    state.editorHistory[lesson.id] = [];
    return withDelay({ lesson });
  }
  if (requestMethod === 'POST' && ['/ai/lesson-chat', '/ai/generate-lesson'].includes(path)) {
    return withDelay(AI_CHAT_GENERATE, 650);
  }
  if (requestMethod === 'POST' && path === '/uploads/presign') {
    const assetId = nextId('asset');
    return withDelay({ assetId, uploadUrl: 'demo://local-upload', fields: {}, publicUrl: '/logo.png', maxBytes: 5_000_000 });
  }
  if (requestMethod === 'POST' && /^\/uploads\/[^/]+\/complete$/.test(path)) return withDelay({ publicUrl: '/logo.png' });

  // Evidence-led teacher action.
  if (requestMethod === 'GET' && /^\/teacher-learning\/classes\/[^/]+\/analytics$/.test(path)) {
    return withDelay(state.teacherAnalytics);
  }
  if (requestMethod === 'POST' && (match = path.match(/^\/teacher-learning\/classes\/([^/]+)\/assignments$/))) {
    const assignment = { id: nextId('adaptive'), classroomId: match[1], createdAt: now(), ...body };
    state.adaptiveAssignments.push(assignment);
    return withDelay({ assignment, learningConfig: { outcomeIds: body.outcomeIds || [], targetStudentIds: body.studentIds || [] } });
  }

  if (requestMethod === 'POST' && path === '/live/sessions') return withDelay({ session: { id: 'demo-live', code: 'DEMO42' } });

  return unsupported(requestMethod, endpoint);
}
