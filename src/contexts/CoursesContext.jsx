import { createContext, useContext, useState, useCallback, useRef } from 'react';
import api from '../services/api';

const CoursesContext = createContext();

const extractCourses = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.courses)) return response.courses;
  if (Array.isArray(response?.data?.courses)) return response.data.courses;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.rows)) return response.rows;
  return [];
};

/* eslint-disable-next-line react-refresh/only-export-components */
export const useCourses = () => {
  const context = useContext(CoursesContext);
  if (!context) {
    throw new Error('useCourses must be used within a CoursesProvider');
  }
  return context;
};

export const CoursesProvider = ({ children }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  // Monotonically increasing request id: only the most recent fetch is allowed
  // to write state, so a slow earlier response can never overwrite the results
  // of a newer one (e.g. while typing in the course search).
  const requestIdRef = useRef(0);

  const fetchCourses = useCallback(async (params = {}) => {
    const requestId = ++requestIdRef.current;
    const isCurrent = () => requestId === requestIdRef.current;
    try {
      setLoading(true);
      setError(null);
      const response = await api.getCourses(params);
      if (isCurrent()) setCourses(extractCourses(response));
      return response;
    } catch (error) {
      if (isCurrent()) setError(error.message);
      throw error;
    } finally {
      if (isCurrent()) {
        setLoading(false);
        setHasFetched(true);
      }
    }
  }, []);

  const value = {
    courses,
    loading,
    error,
    hasFetched,
    fetchCourses,
  };

  return (
    <CoursesContext.Provider value={value}>
      {children}
    </CoursesContext.Provider>
  );
};
