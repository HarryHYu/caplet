import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'caplet:my-subjects';
const SUBJECTS_CHANGED_EVENT = 'caplet:my-subjects-changed';

const readStored = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Tracks which HSC subjects (by name) the user has marked as "mine", so the
 * Resource Library can filter down to just those. Persisted client-side —
 * same pattern as ThemeContext/LayoutContext — since /library doesn't require
 * auth and there's no per-subject account field to sync this to.
 */
export const useMySubjects = () => {
  const [mySubjects, setMySubjects] = useState(readStored);

  useEffect(() => {
    const syncSubjects = () => setMySubjects(readStored());
    window.addEventListener('storage', syncSubjects);
    window.addEventListener(SUBJECTS_CHANGED_EVENT, syncSubjects);
    return () => {
      window.removeEventListener('storage', syncSubjects);
      window.removeEventListener(SUBJECTS_CHANGED_EVENT, syncSubjects);
    };
  }, []);

  const toggleSubject = useCallback((name) => {
    const current = readStored();
    const next = current.includes(name) ? current.filter((subject) => subject !== name) : [...current, name];
    setMySubjects(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(SUBJECTS_CHANGED_EVENT));
    } catch {
      // Non-fatal: keep the current selection for this mounted view.
    }
  }, []);

  return { mySubjects, toggleSubject };
};
