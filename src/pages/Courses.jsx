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
        <div className="w-12 h-12 border-2 border-accent border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        {error && (
          <div className="mb-20 p-10 bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-300 text-[10px] font-bold uppercase tracking-widest border border-red-100 dark:border-red-800 flex items-center gap-4 reveal-text">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            Signal Error: {error}
          </div>
        )}

        {/* Header */}
        <header className="mb-32 reveal-text">
          <span className="section-kicker">Knowledge Registry</span>
          <h1 className="text-6xl md:text-8xl mb-12">
            Curriculum.
          </h1>
          <p className="text-2xl text-text-muted font-serif italic max-w-xl leading-relaxed">
            Browse our free financial education courses designed for Australian learners.
          </p>
        </header>

        {/* Filters */}
        <div className="mb-24 flex flex-col sm:flex-row gap-8 reveal-text stagger-1">
          <div className="sm:w-48">
            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block">Level</label>
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="w-full bg-surface-raised border border-line-soft px-6 py-4 text-[11px] font-bold uppercase tracking-widest outline-none focus:border-accent transition-colors"
            >
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim mb-4 block">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="BY IDENTIFIER OR TITLE"
              className="w-full bg-surface-raised border border-line-soft px-6 py-4 text-[11px] font-bold uppercase tracking-widest outline-none focus:border-accent transition-colors placeholder:text-text-dim/30"
            />
          </div>
        </div>

        {/* Course grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-line-soft border border-line-soft reveal-text stagger-2">
          {courses.map((course) => {
            const progress = courseProgress[course.id] || 0;
            const hasProgress = progress > 0;

            return (
              <div
                key={course.id}
                onClick={() => handleCourseClick(course.id)}
                className="bg-surface-body p-12 group cursor-pointer transition-all duration-700 hover:bg-surface-raised flex flex-col"
              >
                <div className="flex justify-between items-start mb-12">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-accent border-b border-accent pb-1">
                    {course.level || 'Beginner'}
                  </span>
                  {hasProgress && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
                      In Progress
                    </span>
                  )}
                </div>

                <div className="aspect-[16/9] w-full mb-12 overflow-hidden bg-surface-soft border border-line-soft">
                  <img
                    src={course.thumbnail || `https://placehold.co/600x400?text=${encodeURIComponent(course.title)}`}
                    alt={course.title}
                    className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                  />
                </div>

                <h3 className="text-2xl font-bold uppercase tracking-tighter mb-8 group-hover:text-accent transition-colors duration-500">
                  {course.title}
                </h3>

                <p className="text-sm font-medium text-text-muted leading-relaxed mb-12 line-clamp-3">
                  {course.shortDescription}
                </p>

                <div className="mt-auto">
                  <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-text-dim mb-8">
                    <span>{course.duration}m</span>
                    <span className="w-1 h-1 bg-text-dim" />
                    <span>{(course.modules || []).reduce((sum, m) => sum + (m.lessons || []).length, 0)} lessons</span>
                  </div>

                  {isAuthenticated && hasProgress && (
                    <div className="mb-8">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-text-dim mb-3">
                        <span>Progress</span>
                        <span className="text-accent">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-surface-soft h-1 overflow-hidden">
                        <div className="bg-accent h-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-8 border-t border-line-soft">
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] group-hover:text-accent transition-colors duration-500">
                      {hasProgress ? 'Continue Module' : 'Enter Lesson'} &rarr;
                    </span>
                    <ArrowRightIcon className="w-4 h-4 text-text-dim group-hover:text-accent group-hover:translate-x-2 transition-all duration-500" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {courses.length === 0 && !loading && (
          <div className="py-40 text-center border border-line-soft bg-surface-soft reveal-text">
            <p className="text-text-dim font-bold uppercase tracking-[0.4em] text-[10px] animate-pulse mb-8">
              Registry Query Null
            </p>
            <button
              onClick={() => setFilters({ level: '', search: '' })}
              className="text-[10px] font-bold uppercase tracking-widest text-accent hover:text-accent-strong transition-colors"
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
