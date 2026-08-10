import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'caplet:assessment-log';
const CHANGED_EVENT = 'caplet:assessment-log-changed';

const readStored = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function useAssessmentLog() {
  const [entries, setEntries] = useState(readStored);

  useEffect(() => {
    const sync = () => setEntries(readStored());
    window.addEventListener('storage', sync);
    window.addEventListener(CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CHANGED_EVENT, sync);
    };
  }, []);

  const change = useCallback((updater) => {
    setEntries((current) => {
      const next = updater(current);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(new Event(CHANGED_EVENT));
      } catch { /* Keep this tab usable if storage is unavailable. */ }
      return next;
    });
  }, []);

  const saveEntry = useCallback((entry) => change((current) => {
    const now = new Date().toISOString();
    const value = { ...entry, id: entry.id || makeId(), updatedAt: now };
    const exists = current.some((item) => item.id === value.id);
    return exists ? current.map((item) => item.id === value.id ? value : item) : [value, ...current];
  }), [change]);

  const removeEntry = useCallback((id) => change((current) => current.filter((item) => item.id !== id)), [change]);

  return { entries, saveEntry, removeEntry };
}
