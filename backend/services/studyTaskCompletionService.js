function normalizePath(value) {
  if (!value || typeof value !== 'string') return '';
  try {
    const url = new URL(value, 'https://caplet.local');
    return url.pathname.replace(/\/$/, '') || '/';
  } catch {
    return value.split('?')[0].replace(/\/$/, '') || '/';
  }
}

function taskMatchesPaths(task, paths) {
  const taskPath = normalizePath(task?.resourcePath);
  if (!taskPath) return false;
  return paths.some((path) => {
    const candidate = normalizePath(path);
    return candidate && (candidate === taskPath || candidate.startsWith(`${taskPath}/`) || taskPath.startsWith(`${candidate}/`));
  });
}

async function completeMatchingStudyTask({ userId, resourcePaths = [], completedAt = new Date() }) {
  const StudyPlan = require('../models/StudyPlan');
  const plan = await StudyPlan.findOne({ where: { userId } });
  if (!plan) return { plan: null, completedTask: null };
  const paths = [...new Set(resourcePaths.map(normalizePath).filter(Boolean))];
  const task = (plan.tasks || []).find((item) => !item.completed && taskMatchesPaths(item, paths));
  if (!task) return { plan, completedTask: null };
  const tasks = plan.tasks.map((item) => item.id === task.id ? {
    ...item,
    completed: true,
    completedAt: item.completedAt || completedAt.toISOString(),
    completionSource: 'tracked_learning_activity',
  } : item);
  await plan.update({ tasks });
  return { plan, completedTask: tasks.find((item) => item.id === task.id) };
}

module.exports = { completeMatchingStudyTask, normalizePath, taskMatchesPaths };
