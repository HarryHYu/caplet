function coursePath(course, progress) {
  if (!progress?.nextLesson?.id) return `/courses/${course.id}`;
  const slide = Number(progress.nextLesson.lastSlideIndex || 0);
  return `/courses/${course.id}/lessons/${progress.nextLesson.id}${slide > 0 ? `?slide=${slide}` : ''}`;
}

/**
 * Build the frontend-only view model for the unified Learn hub.
 * All fields are present even when one upstream request fails.
 */
export function createLearningHubData({ faculties = [], courses = [], courseProgress = [], examSessions = [], studyPlan = null, recommendation = null, activePractice = null, partialErrors = [] } = {}) {
  const subjects = faculties.flatMap((faculty) => faculty.subjects.map((subject) => ({ ...subject, faculty: faculty.name, block: faculty.block, text: faculty.text })));
  const progressByCourse = Object.fromEntries(courseProgress.map((item) => [String(item.courseId), item]));
  const learningPaths = courses.map((course) => {
    const progress = progressByCourse[String(course.id)];
    const lessonCount = (course.modules || []).reduce((sum, module) => sum + (module.lessons || []).length, 0);
    return {
      id: course.id,
      title: course.title,
      description: course.shortDescription || course.description,
      href: coursePath(course, progress),
      kind: course.metadata?.subject || course.category || 'Learning path',
      metadata: [`${course.duration || 0} min`, `${lessonCount} lessons`, course.level],
      status: progress?.status,
      progress: Number(progress?.progressPercentage || 0),
    };
  });

  const courseResumeItems = learningPaths.filter((path) => progressByCourse[String(path.id)]?.status === 'in_progress').map((path) => ({ ...path, detail: path.metadata.filter(Boolean).join(' · ') }));
  const activeExam = examSessions.find((session) => session.status === 'in_progress');
  const examResumeItems = activeExam ? [{
    id: `exam-${activeExam.id}`,
    title: activeExam.packTitle || 'Economics exam practice',
    detail: 'Your timed session is saved.',
    href: `/library/economics/exam-practice/${activeExam.packId}/session?session=${activeExam.id}`,
  }] : [];
  const practiceResumeItems = activePractice?.href ? [{ id: `practice-${activePractice.id || 'active'}`, ...activePractice }] : [];
  const nextTask = (studyPlan?.tasks || []).filter((task) => !task.completed).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0];

  return {
    nextAction: {
      resume: activePractice?.href ? activePractice : null,
      studyTask: nextTask?.resourcePath ? { href: nextTask.resourcePath, title: nextTask.title, detail: nextTask.reason, eyebrow: 'Your next study task' } : null,
      recommendation,
      fallbackHref: '/practice?subject=economics&mode=diagnostic&source=learn_hub',
      fallbackTitle: 'Take the quick Economics diagnostic',
    },
    continueItems: [...practiceResumeItems, ...examResumeItems, ...courseResumeItems],
    availableSubjects: subjects.filter((subject) => subject.available),
    learningPaths,
    comingSubjects: subjects.filter((subject) => !subject.available),
    partialErrors,
  };
}
