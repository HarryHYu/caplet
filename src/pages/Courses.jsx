import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourses } from '../contexts/CoursesContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

const Courses = () => {
  const { courses, loading, error, fetchCourses } = useCourses();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    level: '',
    search: '',
  });
  const [courseProgress, setCourseProgress] = useState({});

  useEffect(() => {
    fetchCourses(filters);
  }, [fetchCourses, filters]);

  useEffect(() => {
    if (isAuthenticated && courses.length > 0) {
      const fetchProgress = async () => {
        try {
          const progressMap = {};
          const courseIds = [...new Set(courses.map(c => c.id))];
          await Promise.all(
            courseIds.map(async (courseId) => {
              try {
                const progress = await api.getCourseProgress(courseId);
                if (progress.courseProgress) {
                  progressMap[courseId] = progress.courseProgress.progressPercentage || 0;
                }
              } catch {
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
    navigate(`/courses/${courseId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-body py-12 md:py-20">
      <div className="container-custom">
        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm rounded-lg border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {/* Header */}
        <header className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Courses
          </h1>
          <p className="text-lg text-text-muted max-w-2xl leading-relaxed">
            Browse our free financial education courses designed for Australian learners.
          </p>
        </header>

        {/* Filters */}
        <div className="mb-10 flex flex-col sm:flex-row gap-4">
          <div className="sm:w-48">
            <label className="text-xs font-medium text-text-muted mb-1.5 block">Level</label>
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="w-full bg-surface-raised border border-line-soft px-4 py-2.5 text-sm rounded-lg outline-none focus:border-accent transition-colors"
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-text-muted mb-1.5 block">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search courses..."
              className="w-full bg-surface-raised border border-line-soft px-4 py-2.5 text-sm rounded-lg outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Course grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const progress = courseProgress[course.id] || 0;
            const hasProgress = progress > 0;

            return (
              <div
                key={course.id}
                onClick={() => handleCourseClick(course.id)}
                className="bg-surface-raised border border-line-soft rounded-xl group cursor-pointer transition-all duration-200 hover:border-accent/50 hover:shadow-lg flex flex-col p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-medium text-accent bg-accent/5 px-2.5 py-1 rounded-md capitalize">
                    {course.level || 'Beginner'}
                  </span>
                  {hasProgress && (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      In Progress
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-semibold mb-2 group-hover:text-accent transition-colors">
                  {course.title}
                </h3>

                <p className="text-sm text-text-muted leading-relaxed mb-6 line-clamp-3">
                  {course.shortDescription}
                </p>

                <div className="mt-auto">
                  <div className="flex items-center gap-4 text-sm text-text-muted mb-4">
                    <span>{course.duration} min</span>
                    <span className="w-1 h-1 bg-text-dim rounded-full" />
                    <span>{(course.modules || []).reduce((sum, m) => sum + (m.lessons || []).length, 0)} lessons</span>
                  </div>

                  {isAuthenticated && hasProgress && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-text-muted mb-1.5">
                        <span>Progress</span>
                        <span className="font-medium text-accent">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-surface-soft h-2 rounded-full overflow-hidden">
                        <div className="bg-accent h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary group-hover:text-accent transition-colors">
                      {hasProgress ? 'Continue' : 'Start Course'}
                    </span>
                    <ArrowRightIcon className="w-4 h-4 text-text-dim group-hover:text-accent transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {courses.length === 0 && !loading && (
          <div className="py-20 text-center border border-line-soft rounded-xl bg-surface-soft">
            <p className="text-lg text-text-muted mb-4">No courses found.</p>
            <button
              onClick={() => setFilters({ level: '', search: '' })}
              className="text-sm font-medium text-accent hover:underline"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
