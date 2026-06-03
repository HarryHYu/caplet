export const formatLevel = (level) => (level ? String(level).replace(/[-_]/g, ' ') : 'Beginner');

export const getLessonCount = (course) => (
  (course?.modules || []).reduce((sum, moduleItem) => sum + (moduleItem.lessons || []).length, 0)
);

export const formatDuration = (duration) => {
  if (duration === null || duration === undefined || duration === '') return 'Flexible pace';
  if (typeof duration === 'number') return `${duration} min`;
  const durationText = String(duration).trim();
  return /\b(min|hour|hr|day|week|month)s?\b/i.test(durationText) ? durationText : `${durationText} min`;
};
