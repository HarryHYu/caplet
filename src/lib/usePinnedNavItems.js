import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'caplet:pinned-navigation';
const PINNED_CHANGED_EVENT = 'caplet:pinned-navigation-changed';

export const RESOURCE_SHORTCUTS = [
  { id: 'resource-library', path: '/library', label: 'Resource library', navLabel: 'Library', icon: 'book' },
  { id: 'subject-notes', path: '/notes', label: 'Subject notes', navLabel: 'Notes', icon: 'notes' },
  { id: 'essay-practice', path: '/essays', label: 'Essay practice', icon: 'document' },
  { id: 'assessment-dates', path: '/assessments', label: 'Assessment dates', icon: 'calendar' },
  { id: 'assessment-log', path: '/assessment-log', label: 'Results', icon: 'document' },
  { id: 'financial-tools', path: '/money/tools', label: 'Financial tools', icon: 'calculator' },
];

const validIds = new Set(RESOURCE_SHORTCUTS.map((item) => item.id));

const readStored = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed.filter((id) => validIds.has(id)) : [];
  } catch {
    return [];
  }
};

const persist = (ids) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(PINNED_CHANGED_EVENT));
};

export function usePinnedNavItems() {
  const [pinnedIds, setPinnedIds] = useState(readStored);

  useEffect(() => {
    const syncPinned = () => setPinnedIds(readStored());
    window.addEventListener('storage', syncPinned);
    window.addEventListener(PINNED_CHANGED_EVENT, syncPinned);
    return () => {
      window.removeEventListener('storage', syncPinned);
      window.removeEventListener(PINNED_CHANGED_EVENT, syncPinned);
    };
  }, []);

  // Returns what actually happened so callers can announce honestly:
  // 'added' | 'duplicate' | 'invalid'.
  const pin = useCallback((id) => {
    if (!validIds.has(id)) return 'invalid';
    const current = readStored();
    if (current.includes(id)) return 'duplicate';
    const next = [...current, id];
    setPinnedIds(next);
    try { persist(next); } catch { /* Keep the mounted state when storage is unavailable. */ }
    return 'added';
  }, []);

  const unpin = useCallback((id) => {
    const next = readStored().filter((itemId) => itemId !== id);
    setPinnedIds(next);
    try { persist(next); } catch { /* Keep the mounted state when storage is unavailable. */ }
  }, []);

  const pinnedItems = RESOURCE_SHORTCUTS.filter((item) => pinnedIds.includes(item.id));
  return { pinnedIds, pinnedItems, pin, unpin };
}
