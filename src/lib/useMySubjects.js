import { useState, useEffect, useCallback } from 'react';
import { canonicalSubjectLabelForYear, subjectsForYear } from '../data/nswSubjectCatalog';

const STORAGE_KEY = 'caplet:my-subjects';
const YEAR_STORAGE_KEY = 'caplet:subject-year';

const initialYear = () => {
  const stored = Number(localStorage.getItem(YEAR_STORAGE_KEY));
  return stored >= 7 && stored <= 12 ? stored : 11;
};

const readStored = (year) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed)
      ? [...new Set(parsed.map((subject) => canonicalSubjectLabelForYear(subject, year)).filter(Boolean))]
      : [];
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
  const [subjectYear, setSubjectYearState] = useState(initialYear);
  const [mySubjects, setMySubjects] = useState(() => readStored(subjectYear));
  const [selectionNotice, setSelectionNotice] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mySubjects));
    } catch {
      // Non-fatal: selection just won't persist.
    }
  }, [mySubjects]);

  useEffect(() => {
    try {
      localStorage.setItem(YEAR_STORAGE_KEY, String(subjectYear));
    } catch {
      // Non-fatal: the picker still works for this session.
    }
  }, [subjectYear]);

  const setSubjectYear = useCallback((nextYear) => {
    const year = Number(nextYear);
    const valid = new Set(subjectsForYear(year).map((subject) => subject.label));
    const removed = mySubjects.filter((subject) => !valid.has(subject));
    setSelectionNotice(removed.length
      ? `${removed.join(', ')} ${removed.length === 1 ? 'is not' : 'are not'} offered for Year ${year}, so ${removed.length === 1 ? 'it was' : 'they were'} removed from My subjects.`
      : '');
    setMySubjects((current) => current.filter((subject) => valid.has(subject)));
    setSubjectYearState(year);
  }, [mySubjects]);

  const toggleSubject = useCallback((name) => {
    setMySubjects((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }, []);

  return { mySubjects, toggleSubject, subjectYear, setSubjectYear, selectionNotice };
};
