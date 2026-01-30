import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCourses } from '../contexts/CoursesContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Courses = () => {
  const { courses, loading, error, fetchCourses } = useCourses();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    category: '',
    level: '',
    search: '',
  });
  const [courseProgress, setCourseProgress] = useState({});

  useEffect(() => {
    fetchCourses(filters);
  }, [filters]);

  useEffect(() => {
    // Fetch progress for all courses if authenticated
    if (isAuthenticated && courses.length > 0) {
      const fetchProgress = async () => {
        try {
          const allProgress = await api.getUserProgress();
          const progressMap = {};
          
          // Get all unique course IDs
          const courseIds = [...new Set(courses.map(c => c.id))];
          
          // Fetch progress for each course
          await Promise.all(
            courseIds.map(async (courseId) => {
              try {
                const progress = await api.getCourseProgress(courseId);
                if (progress.courseProgress) {
                  progressMap[courseId] = progress.courseProgress.progressPercentage || 0;
                }
              } catch (e) {
                // Course not started, no progress
                progressMap[courseId] = 0;
              }
            })
          );
          
          setCourseProgress(progressMap);
        } catch (error) {
          console.error('Error fetching progress:', error);
        }
      };
      fetchProgress();
    }
  }, [isAuthenticated, courses]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCourseClick = (courseId) => {
    if (!isAuthenticated) {
      alert('Please sign in to access courses');
      navigate('/login');
      return;
    }

    // Navigate directly to course
    navigate(`/courses/${courseId}`);
  };

  const getCategoryColor = (category) => {
    const colors = {
      budgeting: 'bg-green-100 text-green-800',
      superannuation: 'bg-blue-100 text-blue-800',
      tax: 'bg-purple-100 text-purple-800',
      loans: 'bg-yellow-100 text-yellow-800',
      investment: 'bg-red-100 text-red-800',
      planning: 'bg-indigo-100 text-indigo-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getLevelColor = (level) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800',
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-200 dark:border-blue-900 border-t-blue-600 dark:border-t-blue-400 mx-auto rounded-full"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold heading-gradient mb-4">
            Financial Education Courses
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Learn essential financial skills to secure your future
          </p>
        </div>

        {/* Filters */}
        <div className="card-fun p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
              >
                <option value="">All Categories</option>
                <option value="budgeting">Budgeting</option>
                <option value="superannuation">Superannuation</option>
                <option value="tax">Tax</option>
                <option value="loans">Loans & Credit</option>
                <option value="investment">Investment</option>
                <option value="planning">Financial Planning</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Level
              </label>
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
              >
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search courses..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-2 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl mb-6 font-medium shadow-lg">
            ⚠️ {error}
          </div>
        )}

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const progress = courseProgress[course.id] || 0;
            const hasProgress = progress > 0;
            
            return (
              <div 
                key={course.id} 
                onClick={() => handleCourseClick(course.id)}
                className="card-fun overflow-hidden cursor-pointer hover:scale-[1.02] hover:border-blue-400/50 dark:hover:border-blue-500/50"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <span className={`px-3 py-1 text-xs font-bold rounded-xl ${getCategoryColor(course.category)}`}>
                      {course.category.charAt(0).toUpperCase() + course.category.slice(1)}
                    </span>
                    <span className={`px-3 py-1 text-xs font-bold rounded-xl ${getLevelColor(course.level)}`}>
                      {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {course.title}
                  </h3>

                  <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                    {course.shortDescription}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <span>⏱️ {course.duration} min</span>
                    <span>📚 {course.lessons?.length || 0} lessons</span>
                  </div>

                  {/* Progress Bar */}
                  {isAuthenticated && hasProgress && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>Progress</span>
                        <span className="font-semibold">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                          className="bg-green-500 h-2.5 rounded-full transition-all duration-300" 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-gray-100 dark:border-gray-700">
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      {course.isFree ? '✨ Free' : `$${course.price}`}
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm hover:underline">
                      {hasProgress ? 'Continue →' : 'Start →'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {courses.length === 0 && !loading && (
          <div className="card-fun text-center py-16">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">No courses found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
