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
    level: '',
    search: '',
  });
  const [courseProgress, setCourseProgress] = useState({});

  useEffect(() => {
    fetchCourses(filters);
  }, [filters]);

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
    if (!isAuthenticated) {
      alert('Please sign in to access courses.');
      return;
    }
    navigate(`/courses/${courseId}`);
  };

  const getLevelColor = (level) => {
    const colors = {
      beginner: 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100',
      intermediate: 'bg-black text-white dark:bg-white dark:text-black',
      advanced: 'bg-brand text-white',
    };
    return colors[level] || 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent mx-auto"></div>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Synchronizing Academy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black py-24">
      <div className="container-custom">
        <div className="mb-20 animate-slide-up">
          <span className="section-kicker mb-6">
            Institutional Library
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold text-black dark:text-white mb-8 tracking-tighter uppercase">
            Educational <br />Catalog.
          </h1>
          <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl font-medium leading-relaxed">
            Professional learning sequences designed to build meaningful financial foundations for the next generation.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-20 reveal-up" style={{ animationDelay: '100ms' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                Academic Level
              </label>
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="input-editorial appearance-none"
              >
                <option value="">All Levels</option>
                <option value="beginner">Phase Alpha (Beginner)</option>
                <option value="intermediate">Phase Beta (Intermediate)</option>
                <option value="advanced">Phase Gamma (Advanced)</option>
              </select>
            </div>

            <div className="space-y-3 lg:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                Search Curriculum
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="IDENTIFY KEYWORDS..."
                  className="input-editorial pl-12"
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-white dark:bg-black border border-red-500 text-red-500 px-8 py-6 mb-12 font-bold text-[10px] uppercase tracking-[0.3em] text-center animate-fade-in">
            System Error: {error}
          </div>
        )}

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {courses.map((course, index) => {
            const progress = courseProgress[course.id] || 0;
            const hasProgress = progress > 0;

            return (
              <div
                key={course.id}
                onClick={() => handleCourseClick(course.id)}
                className="mesh-card p-0 group cursor-pointer reveal-up flex flex-col"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="p-8 flex flex-col h-full">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
                      {course.level}
                    </span>
                    {hasProgress && (
                      <span className="text-[9px] font-bold text-brand uppercase tracking-widest flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                        In Progress
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-extrabold text-black dark:text-white mb-3 group-hover:text-brand transition-colors uppercase tracking-tight">
                    {course.title}
                  </h3>

                  <p className="text-zinc-500 dark:text-zinc-400 mb-8 line-clamp-3 text-xs leading-relaxed font-medium">
                    {course.shortDescription}
                  </p>

                  <div className="mt-auto">
                    <div className="flex items-center gap-6 text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-6 py-4 border-y border-zinc-50 dark:border-zinc-900/50">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        {course.duration}M
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        {(course.modules || []).reduce((sum, m) => sum + (m.lessons || []).length, 0)} Units
                      </span>
                    </div>

                    {isAuthenticated && hasProgress && (
                      <div className="mb-6 pt-2">
                        <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                          <span>Sequence Logic</span>
                          <span className="text-brand">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-zinc-50 dark:bg-zinc-900 h-1 overflow-hidden">
                          <div
                            className="bg-brand h-full transition-all duration-1000 ease-out"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-brand font-bold text-[9px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                      <span>{hasProgress ? 'Resume Module' : 'Access Unit'} →</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {courses.length === 0 && !loading && (
          <div className="text-center py-32 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900">
            <p className="text-zinc-500 font-extrabold text-xs uppercase tracking-[0.3em]">No results for this query</p>
            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-4">Resetting filters may restore visibility.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
