import { describe, expect, it } from 'vitest';
import { createLearningHubData } from '../lib/learningHubData';

const faculties = [{ name: 'Commerce', block: 'block-blue', text: 'text-accent', subjects: [
  { name: 'Economics', slug: 'economics', available: true },
  { name: 'Business Studies', slug: 'business-studies', available: false },
] }];

const course = {
  id: 'course-1',
  title: 'Economics foundations',
  shortDescription: 'A structured introduction.',
  duration: 80,
  level: 'beginner',
  modules: [{ lessons: [{ id: 'lesson-1' }, { id: 'lesson-2' }] }],
};

describe('learning hub view model', () => {
  it('returns every stable field and maps resumable course progress', () => {
    const data = createLearningHubData({
      faculties,
      courses: [course],
      courseProgress: [{ courseId: 'course-1', status: 'in_progress', progressPercentage: 50, nextLesson: { id: 'lesson-2', lastSlideIndex: 3 } }],
    });

    expect(Object.keys(data)).toEqual(['todayActions', 'nextAction', 'continueItems', 'availableSubjects', 'learningPaths', 'comingSubjects', 'partialErrors']);
    expect(data.todayActions).toEqual([]);
    expect(data.availableSubjects).toHaveLength(1);
    expect(data.comingSubjects).toHaveLength(1);
    expect(data.learningPaths[0].href).toBe('/courses/course-1/lessons/lesson-2?slide=3');
    expect(data.continueItems[0]).toMatchObject({ title: 'Economics foundations', progress: 50 });
  });

  it('builds next-action inputs in resume, task, recommendation order', () => {
    const data = createLearningHubData({
      activePractice: { id: 'practice-1', href: '/practice?session=practice-1', title: 'Resume practice' },
      studyPlan: { tasks: [{ title: 'Today task', resourcePath: '/practice?mode=daily', completed: false, dueDate: '2026-07-18' }] },
      recommendation: { resourcePath: '/practice?mode=diagnostic' },
      partialErrors: ['examSessions'],
    });

    expect(data.nextAction.resume.href).toContain('practice-1');
    expect(data.nextAction.studyTask.title).toBe('Today task');
    expect(data.nextAction.recommendation.resourcePath).toContain('diagnostic');
    expect(data.partialErrors).toEqual(['examSessions']);
  });
});
