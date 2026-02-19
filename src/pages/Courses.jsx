import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
        {/* Header Section */}
        <header className="mb-32 reveal-text">
          <span className="section-kicker">Academic Repository</span>
          <h1 className="text-6xl md:text-8xl mb-12">
            The Curriculum.
          </h1>
          <p className="text-2xl text-text-muted font-serif italic max-w-2xl leading-relaxed">
            A structured sequence of financial intelligence, designed for precision learning and academic excellence.
          </p>
        </header>

        {/* Global Controls */}
        <div className="mb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-end reveal-text stagger-1">
          <div className="lg:col-span-3">
            <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-text-dim mb-4 block">Filter: Sophistication</label>
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="w-full bg-surface-soft border border-line-soft px-6 py-4 text-[11px] font-bold uppercase tracking-widest outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
            >
              <option value="">All Tiers</option>
              <option value="beginner">Foundational</option>
              <option value="intermediate">Strategic</option>
              <option value="advanced">Expert</option>
            </select>
          </div>
          <div className="lg:col-span-9">
            <label className="text-[10px] font-bold uppercase tracking-[0.4em] text-text-dim mb-4 block">Search: Catalog Registry</label>
            <div className="relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Enter keywords..."
                className="w-full bg-surface-soft border border-line-soft px-8 py-4 text-[11px] font-bold uppercase tracking-widest outline-none focus:border-accent transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Courses Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-line-soft border border-line-soft reveal-text stagger-2">
          {courses.map((course, index) => {
            const progress = courseProgress[course.id] || 0;
            const hasProgress = progress > 0;

            return (
              <div
                key={course.id}
                onClick={() => handleCourseClick(course.id)}
                className="bg-surface-body group cursor-pointer transition-all duration-700 hover:bg-surface-raised flex flex-col p-12 overflow-hidden relative"
              >
                {/* Decorative index */}
                <div className="absolute top-0 right-0 p-8 text-[40px] font-serif italic text-text-dim opacity-5 group-hover:opacity-10 transition-opacity">
                  {(index + 1).toString().padStart(2, '0')}
                </div>

                <div className="flex justify-between items-start mb-12">
                  <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-accent px-3 py-1 bg-accent/5 border border-accent/20">
                    {course.level || 'L1'}
                  </span>
                  {hasProgress && (
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-accent">Active Session</span>
                    </div>
                  )}
                </div>

                <h3 className="text-3xl font-serif italic mb-6 group-hover:translate-x-2 transition-transform duration-700">
                  {course.title}
                </h3>

                <p className="text-sm font-medium text-text-muted leading-relaxed mb-12 line-clamp-3">
                  {course.shortDescription}
                </p>

                <div className="mt-auto">
                  <div className="grid grid-cols-2 gap-px bg-line-soft border border-line-soft mb-12">
                    <div className="bg-surface-soft p-4 text-center">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-text-dim mb-1">Duration</p>
                      <p className="text-xs font-bold">{course.duration}m</p>
                    </div>
                    <div className="bg-surface-soft p-4 text-center">
                      <p className="text-[8px] font-bold uppercase tracking-widest text-text-dim mb-1">Index</p>
                      <p className="text-xs font-bold">{(course.modules || []).reduce((sum, m) => sum + (m.lessons || []).length, 0)} Units</p>
                    </div>
                  </div>

                  {isAuthenticated && hasProgress && (
                    <div className="mb-8">
                      <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest text-text-dim mb-2">
                        <span>Integration</span>
                        <span className="text-accent">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-surface-soft h-1 overflow-hidden">
                        <div className="bg-accent h-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-primary group-hover:text-accent transition-colors">
                      {hasProgress ? 'Resume Terminal' : 'Initialize Module'}
                    </span>
                    <ArrowRightIcon className="w-4 h-4 text-text-dim group-hover:translate-x-2 transition-transform duration-500" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {courses.length === 0 && !loading && (
          <div className="py-40 text-center border border-line-soft reveal-text">
            <p className="text-xl font-serif italic text-text-dim">No matching curriculum signals found.</p>
            <button
              onClick={() => setFilters({ level: '', search: '' })}
              className="mt-8 text-[10px] font-bold uppercase tracking-[0.4em] text-accent"
            >
              Reset Catalog Registry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


export default Courses;
