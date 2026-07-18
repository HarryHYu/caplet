function appendSource(href, source) {
  if (!href || !href.startsWith('/practice')) return href;
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}source=${encodeURIComponent(source)}`;
}

export function actionDetails({ resume, studyTask, recommendation, fallbackHref, fallbackTitle, source }) {
  if (resume?.href) return { type: 'resume', href: resume.href, eyebrow: 'Continue learning', title: resume.title || 'Resume your saved activity', detail: resume.detail || 'Your latest answer and position are saved.', mode: resume.mode };
  if (studyTask?.href) return { type: 'study_task', href: studyTask.href, eyebrow: studyTask.eyebrow || 'Your next study task', title: studyTask.title, detail: studyTask.detail || 'Complete this task to keep your weekly plan moving.' };
  if (recommendation) return { type: 'recommendation', href: appendSource(recommendation.resourcePath || `/practice?subject=${recommendation.subject || 'economics'}&mode=${recommendation.mode || 'diagnostic'}`, source), eyebrow: 'Recommended for you', title: recommendation.outcome?.title ? `Strengthen ${recommendation.outcome.title}` : 'Build your first mastery signal', detail: recommendation.reason, mode: recommendation.mode };
  return { type: 'diagnostic', href: fallbackHref || `/practice?subject=economics&mode=diagnostic&source=${source}`, eyebrow: 'Best place to start', title: fallbackTitle || 'Take the quick Economics diagnostic', detail: 'Five questions give Caplet the evidence it needs to choose your next useful activity.', mode: 'diagnostic' };
}
