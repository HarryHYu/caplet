import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../services/api';
import LearningNextAction from './LearningNextAction';

function savedPracticeId() {
  try { return JSON.parse(window.localStorage.getItem('caplet.practice.active.economics') || 'null')?.id || ''; } catch { return ''; }
}

export default function EconomicsNextAction({ source, focusId = '', resourceId = '', mode = 'diagnostic', className = '' }) {
  const { isAuthenticated = false } = useContext(AuthContext) || {};
  const [state, setState] = useState({ recommendation: null, resume: null, studyTask: null });

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) return () => { active = false; };
    const sessionId = savedPracticeId();
    Promise.all([
      api.getNextRecommendation('economics').catch(() => ({ recommendation: null })),
      api.getStudyPlan().catch(() => ({ studyPlan: null })),
      sessionId ? api.getPracticeSession(sessionId).catch(() => null) : Promise.resolve(null),
    ]).then(([recommendationData, planData, sessionData]) => {
      if (!active) return;
      const session = sessionData?.session || sessionData;
      const contextual = Boolean(focusId || resourceId);
      const sessionMatchesContext = !contextual || (
        (!focusId || session?.config?.focusId === focusId)
        && (!resourceId || session?.config?.resourceId === resourceId)
      );
      const task = (planData?.studyPlan?.tasks || []).filter((item) => !item.completed).sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0];
      setState({
        recommendation: contextual ? null : recommendationData?.recommendation || null,
        resume: session?.id && session.status === 'in_progress' && sessionMatchesContext ? { href: `/practice?subject=economics&session=${session.id}&source=${source}`, title: 'Resume your Economics practice', detail: `Continue from question ${Math.min(Number(session.currentIndex || 0) + 1, Number(session.totalQuestions || 1))} of ${session.totalQuestions || 1}.`, mode: session.mode } : null,
        studyTask: !contextual && task?.resourcePath ? { href: task.resourcePath, title: task.title, detail: task.reason } : null,
      });
    });
    return () => { active = false; };
  }, [focusId, isAuthenticated, resourceId, source]);

  const params = new URLSearchParams({ subject: 'economics', mode, source });
  if (focusId) params.set('focusId', focusId);
  if (resourceId) params.set('resourceId', resourceId);
  params.set('returnTo', focusId ? `/library/economics/focus/${focusId}` : '/library/economics');
  return <LearningNextAction {...state} source={source} fallbackHref={`/practice?${params.toString()}`} className={className} trackingEnabled={isAuthenticated} />;
}
