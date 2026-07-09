import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'caplet:my-subjects';

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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mySubjects));
    } catch {
      // Non-fatal: selection just won't persist.
    }
  }, [mySubjects]);

  const toggleSubject = useCallback((name) => {
    setMySubjects((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }, []);

  return { mySubjects, toggleSubject };
};
