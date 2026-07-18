const { summarizeCourseProgress } = require('../services/courseProgressService');
const { normalizePath, taskMatchesPaths } = require('../services/studyTaskCompletionService');
const { filterQuestionsByContext } = require('../services/practiceEngine');

describe('student learning loop services', () => {
  test('course progress resumes the most recently active lesson and slide', () => {
    const course = {
      id: 'course-1',
      modules: [{ id: 'module-1', order: 1, lessons: [
        { id: 'lesson-1', moduleId: 'module-1', order: 1, title: 'First', slides: [{ type: 'text' }] },
        { id: 'lesson-2', moduleId: 'module-1', order: 2, title: 'Second', slides: [{ type: 'quiz' }] },
      ] }],
    };
    const summary = summarizeCourseProgress(course, [
      { lessonId: 'lesson-1', status: 'completed', lastAccessedAt: '2026-07-17T01:00:00Z' },
      { lessonId: 'lesson-2', status: 'in_progress', lastSlideIndex: 3, lastAccessedAt: '2026-07-18T01:00:00Z' },
    ]);
    expect(summary.progressPercentage).toBe(50);
    expect(summary.nextLesson).toEqual(expect.objectContaining({ id: 'lesson-2', lastSlideIndex: 3 }));
  });

  test('study tasks match tracked child learning routes without matching unrelated subjects', () => {
    expect(normalizePath('/library/economics/focus/markets?resource=one')).toBe('/library/economics/focus/markets');
    expect(taskMatchesPaths(
      { resourcePath: '/library/economics/focus/markets?resource=one' },
      ['/library/economics/focus/markets'],
    )).toBe(true);
    expect(taskMatchesPaths(
      { resourcePath: '/library/business-studies' },
      ['/library/economics/focus/markets'],
    )).toBe(false);
  });

  test('library practice context selects the requested focus and resource', () => {
    const questions = [
      { id: 'one', source: { focusId: 'markets', externalId: 'demand-1' } },
      { id: 'two', source: { focusId: 'markets', externalId: 'supply-1' } },
      { id: 'three', source: { focusId: 'finance', externalId: 'saving-1' } },
    ];
    expect(filterQuestionsByContext(questions, { focusId: 'markets' }).map((item) => item.id)).toEqual(['one', 'two']);
    expect(filterQuestionsByContext(questions, { focusId: 'markets', resourceId: 'supply-1' }).map((item) => item.id)).toEqual(['two']);
  });
});
