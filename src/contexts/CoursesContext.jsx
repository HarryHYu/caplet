import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const CoursesContext = createContext();

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

  const fetchCourses = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getCourses(params);
      setCourses(response.courses);
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const value = {
    courses,
    loading,
    error,
    fetchCourses,
  };

  return (
    <CoursesContext.Provider value={value}>
      {children}
    </CoursesContext.Provider>
  );
};
