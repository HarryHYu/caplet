import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'caplet:subject-notes';
const CHANGED_EVENT = 'caplet:subject-notes-changed';

const emptyState = () => ({ notes: [], links: [], resources: [] });

const readStored = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      notes: Array.isArray(value?.notes) ? value.notes : [],
      links: Array.isArray(value?.links) ? value.links : [],
      resources: Array.isArray(value?.resources) ? value.resources : [],
    };
  } catch {
    return emptyState();
  }
};

const persist = (value) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event(CHANGED_EVENT));
};

const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const isGoogleDocUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'docs.google.com' && url.pathname.startsWith('/document/');
  } catch {
    return false;
  }
};

export const isResourceUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

export function useSubjectNotes() {
  const [data, setData] = useState(readStored);

  useEffect(() => {
    const sync = () => setData(readStored());
    window.addEventListener('storage', sync);
    window.addEventListener(CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(CHANGED_EVENT, sync);
    };
  }, []);

  const change = useCallback((updater) => {
    setData((current) => {
      const next = updater(current);
      try { persist(next); } catch { /* Keep this tab usable if storage is unavailable. */ }
      return next;
    });
  }, []);

  const saveNote = useCallback((note) => change((current) => {
    const now = new Date().toISOString();
    const value = { ...note, id: note.id || makeId(), updatedAt: now };
    const exists = current.notes.some((item) => item.id === value.id);
    return { ...current, notes: exists ? current.notes.map((item) => item.id === value.id ? value : item) : [value, ...current.notes] };
  }), [change]);

  const saveLink = useCallback((link) => change((current) => {
    const now = new Date().toISOString();
    const value = { ...link, id: link.id || makeId(), updatedAt: now };
    const exists = current.links.some((item) => item.id === value.id);
    return { ...current, links: exists ? current.links.map((item) => item.id === value.id ? value : item) : [value, ...current.links] };
  }), [change]);

  const saveResource = useCallback((resource) => change((current) => {
    const now = new Date().toISOString();
    const value = { ...resource, id: resource.id || makeId(), updatedAt: now };
    const exists = current.resources.some((item) => item.id === value.id);
    return { ...current, resources: exists ? current.resources.map((item) => item.id === value.id ? value : item) : [value, ...current.resources] };
  }), [change]);

  const removeNote = useCallback((id) => change((current) => ({ ...current, notes: current.notes.filter((item) => item.id !== id) })), [change]);
  const removeLink = useCallback((id) => change((current) => ({ ...current, links: current.links.filter((item) => item.id !== id) })), [change]);
  const removeResource = useCallback((id) => change((current) => ({ ...current, resources: current.resources.filter((item) => item.id !== id) })), [change]);

  return { ...data, saveNote, saveLink, saveResource, removeNote, removeLink, removeResource };
}
