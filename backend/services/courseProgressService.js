function parseSlides(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function lessonHasContent(lesson) {
  const plain = lesson?.toJSON ? lesson.toJSON() : lesson || {};
  return parseSlides(plain.slides).length > 0
    || Boolean(String(plain.content || '').trim())
    || Boolean(String(plain.videoUrl || '').trim());
}

function orderedLessons(course) {
  const plain = course?.toJSON ? course.toJSON() : course || {};
  return (plain.modules || [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .flatMap((module) => (module.lessons || [])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .filter(lessonHasContent)
      .map((lesson) => ({ ...lesson, moduleId: lesson.moduleId || module.id })));
}

function summarizeCourseProgress(course, progressRows = []) {
  const lessons = orderedLessons(course);
  const byLesson = new Map(
    progressRows
      .filter((row) => row.lessonId)
      .map((row) => [String(row.lessonId), row?.toJSON ? row.toJSON() : row]),
  );
  const completed = lessons.filter((lesson) => byLesson.get(String(lesson.id))?.status === 'completed');
  const active = lessons
    .map((lesson) => ({ lesson, progress: byLesson.get(String(lesson.id)) }))
    .filter(({ progress }) => progress && progress.status !== 'completed')
    .sort((a, b) => new Date(b.progress.lastAccessedAt || b.progress.updatedAt || 0) - new Date(a.progress.lastAccessedAt || a.progress.updatedAt || 0))[0];
  const nextIncomplete = lessons.find((lesson) => byLesson.get(String(lesson.id))?.status !== 'completed') || null;
  const resumeLesson = active?.lesson || nextIncomplete;
  const resumeProgress = resumeLesson ? byLesson.get(String(resumeLesson.id)) : null;
  const lastActivityAt = progressRows.reduce((latest, row) => {
    const plain = row?.toJSON ? row.toJSON() : row;
    const value = plain.lastAccessedAt || plain.updatedAt || null;
    return value && (!latest || new Date(value) > new Date(latest)) ? value : latest;
  }, null);
  const percentage = lessons.length ? Math.round((completed.length / lessons.length) * 10000) / 100 : 0;

  return {
    courseId: course.id,
    status: percentage === 100 && lessons.length ? 'completed' : percentage > 0 || active ? 'in_progress' : 'not_started',
    totalLessons: lessons.length,
    completedLessons: completed.length,
    progressPercentage: percentage,
    nextLesson: resumeLesson ? {
      id: resumeLesson.id,
      moduleId: resumeLesson.moduleId,
      title: resumeLesson.title,
      lastSlideIndex: Math.max(0, Number(resumeProgress?.lastSlideIndex || 0)),
    } : null,
    lastActivityAt,
  };
}

module.exports = { lessonHasContent, orderedLessons, summarizeCourseProgress };
