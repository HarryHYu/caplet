import { createContext, useContext, useState, useCallback } from 'react';
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

  const fetchCourses = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getCourses(params);
      setCourses(extractCourses(response));
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
      setHasFetched(true);
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
