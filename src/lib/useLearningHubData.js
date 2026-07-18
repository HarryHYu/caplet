import { useEffect, useState } from 'react';
import api from '../services/api';
import { faculties } from '../data/hscSubjects';
import { createLearningHubData } from './learningHubData';

function activePracticeId() {
  try { return JSON.parse(window.localStorage.getItem('caplet.practice.active.economics') || 'null')?.id || ''; } catch { return ''; }
}

const initialData = createLearningHubData({ faculties });

export function useLearningHubData(isAuthenticated) {
  const [state, setState] = useState({ data: initialData, loading: true });

  useEffect(() => {
    let active = true;
    const sessionId = isAuthenticated ? activePracticeId() : '';
    const requests = [
      ['courses', api.getCourses()],
      ...(isAuthenticated ? [
        ['courseProgress', api.getCourseProgressSummaries()],
        ['examSessions', api.getEconomicsExamSessions()],
        ['studyPlan', api.getStudyPlan()],
        ['recommendation', api.getNextRecommendation('economics')],
        ...(sessionId ? [['practice', api.getPracticeSession(sessionId)]] : []),
      ] : []),
    ];

    Promise.allSettled(requests.map(([, request]) => request)).then((results) => {
      if (!active) return;
      const values = {};
      const partialErrors = [];
      results.forEach((result, index) => {
        const key = requests[index][0];
        if (result.status === 'fulfilled') values[key] = result.value;
        else partialErrors.push(key);
      });
      const practice = values.practice?.session || values.practice;
      const activePractice = practice?.id && practice.status === 'in_progress' ? {
        id: practice.id,
        href: `/practice?subject=economics&session=${practice.id}&source=learn_hub`,
        title: 'Resume your Economics practice',
        detail: `Continue from question ${Math.min(Number(practice.currentIndex || 0) + 1, Number(practice.totalQuestions || 1))} of ${practice.totalQuestions || 1}.`,
        mode: practice.mode,
      } : null;
      setState({
        loading: false,
        data: createLearningHubData({
          faculties,
          courses: values.courses?.courses || values.courses?.data?.courses || [],
          courseProgress: values.courseProgress?.courses || [],
          examSessions: values.examSessions?.sessions || [],
          studyPlan: values.studyPlan?.studyPlan || null,
          recommendation: values.recommendation?.recommendation || null,
          activePractice,
          partialErrors,
        }),
      });
    });
    return () => { active = false; };
  }, [isAuthenticated]);

  return state;
}
