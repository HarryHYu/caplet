import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const CoursesContext = createContext();

export const useCourses = () => {
  const context = useContext(CoursesContext);
  if (!context) {
    throw new Error('useCourses must be used within a CoursesProvider');
  }
  return context;
};

export const CoursesProvider = ({ children }) => {
  const [courses, setCourses] = useState([]);
  const [featuredCourses, setFeaturedCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  const fetchCourses = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getCourses(params);
      setCourses(response.courses);
      setPagination(response.pagination);
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const fetchFeaturedCourses = async () => {
    try {
      setError(null);
      const response = await api.getFeaturedCourses();
      setFeaturedCourses(response.courses);
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const fetchCategories = async () => {
    try {
      setError(null);
      const response = await api.getCourseCategories();
      setCategories(response.categories);
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const getCourse = async (id) => {
    try {
      setError(null);
      const response = await api.getCourse(id);
      return response.course;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };


  useEffect(() => {
    fetchCourses();
    fetchFeaturedCourses();
    fetchCategories();
  }, []);

  const value = {
    courses,
    featuredCourses,
    categories,
    loading,
    error,
    pagination,
    fetchCourses,
    fetchFeaturedCourses,
    fetchCategories,
    getCourse,
  };

  return (
    <CoursesContext.Provider value={value}>
      {children}
    </CoursesContext.Provider>
  );
};
