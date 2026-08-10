const normalizeSubject = (value = '') => value
  .trim()
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/^math\b/, 'mathematics')
  .replace(/^english extension$/, 'english extension 1')
  .replace(/\s+/g, ' ');

export const assessmentMatchesSubjects = (task, selectedSubjects) => {
  if (!selectedSubjects?.length) return true;
  const selected = new Set(selectedSubjects.map(normalizeSubject));
  const rawTaskSubjects = task.subject === 'Music 1 & Music 2' ? ['Music 1', 'Music 2'] : [task.subject || ''];
  const taskSubjects = rawTaskSubjects.map(normalizeSubject);
  return taskSubjects.some((subject) => selected.has(subject));
};

export const assessmentsForSubjects = (tasks, selectedSubjects) => (
  tasks.filter((task) => assessmentMatchesSubjects(task, selectedSubjects))
);
