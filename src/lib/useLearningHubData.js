import { useEffect, useState } from 'react';
import api from '../services/api';
import { faculties } from '../data/hscSubjects';
import { createLearningHubData } from './learningHubData';

const initialData = createLearningHubData({ faculties });

export function useLearningHubData(isAuthenticated) {
  const [state, setState] = useState({ data: initialData, loading: true });

  useEffect(() => {
    let active = true;
    const requests = [
      ['courses', api.getCourses()],
      ...(isAuthenticated ? [
        ['courseProgress', api.getCourseProgressSummaries()],
        ['today', api.getLearningToday()],
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
      setState({
        loading: false,
        data: createLearningHubData({
          faculties,
          courses: values.courses?.courses || values.courses?.data?.courses || [],
          courseProgress: values.courseProgress?.courses || [],
          todayActions: values.today?.actions || [],
          partialErrors,
        }),
      });
    });
    return () => { active = false; };
  }, [isAuthenticated]);

  return state;
}
