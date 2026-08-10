import { useCallback, useEffect, useMemo, useState } from 'react';
import { OFFICIAL_ASSESSMENT_TASKS, formatAssessmentDate } from '../data/assessmentTasks';

const STORAGE_KEY = 'caplet:assessment-customisations';
const CHANGED_EVENT = 'caplet:assessment-customisations-changed';
const EMPTY_STATE = { customTasks: [], overrides: {}, hiddenIds: [] };

const readStored = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      customTasks: Array.isArray(parsed?.customTasks) ? parsed.customTasks : [],
      overrides: parsed?.overrides && typeof parsed.overrides === 'object' ? parsed.overrides : {},
      hiddenIds: Array.isArray(parsed?.hiddenIds) ? parsed.hiddenIds : [],
    };
  } catch {
    return EMPTY_STATE;
  }
};

const persist = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(CHANGED_EVENT));
};

const normalizeTask = (task, existing = {}) => ({
  ...existing,
  ...task,
  dateLabel: formatAssessmentDate(task.date, { weekday: false }),
  source: task.source || 'Personalised',
});

export function useAssessmentTasks() {
  const [customisations, setCustomisations] = useState(readStored);

  useEffect(() => {
    const sync = () => setCustomisations(readStored());
    window.addEventListener('storage', sync);
    window.addEventListener(CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CHANGED_EVENT, sync);
    };
  }, []);

  const updateState = useCallback((updater) => {
    const next = updater(readStored());
    setCustomisations(next);
    try { persist(next); } catch { /* Keep changes mounted if storage is unavailable. */ }
  }, []);

  const addTask = useCallback((task) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `custom-${Date.now()}`;
    const customTask = normalizeTask({ ...task, id, custom: true, source: 'Personalised' });
    updateState((state) => ({ ...state, customTasks: [...state.customTasks, customTask] }));
    return id;
  }, [updateState]);

  const updateTask = useCallback((id, task) => {
    updateState((state) => {
      const customIndex = state.customTasks.findIndex((item) => item.id === id);
      if (customIndex >= 0) {
        const customTasks = [...state.customTasks];
        customTasks[customIndex] = normalizeTask({ ...task, id, custom: true, source: 'Personalised' }, customTasks[customIndex]);
        return { ...state, customTasks };
      }
      const official = OFFICIAL_ASSESSMENT_TASKS.find((item) => item.id === id);
      if (!official) return state;
      return {
        ...state,
        overrides: {
          ...state.overrides,
          [id]: normalizeTask({ ...task, id, customized: true, source: 'Personalised' }, official),
        },
      };
    });
  }, [updateState]);

  const removeTask = useCallback((id) => {
    updateState((state) => {
      if (state.customTasks.some((item) => item.id === id)) {
        return { ...state, customTasks: state.customTasks.filter((item) => item.id !== id) };
      }
      return { ...state, hiddenIds: [...new Set([...state.hiddenIds, id])] };
    });
  }, [updateState]);

  const tasks = useMemo(() => [
    ...OFFICIAL_ASSESSMENT_TASKS
      .filter((task) => !customisations.hiddenIds.includes(task.id))
      .map((task) => customisations.overrides[task.id] || task),
    ...customisations.customTasks,
  ].sort((a, b) => a.date.localeCompare(b.date) || a.subject.localeCompare(b.subject)), [customisations]);

  return { tasks, addTask, updateTask, removeTask };
}
