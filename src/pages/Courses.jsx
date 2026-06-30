import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourses } from '../contexts/CoursesContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import CapletLoader from '../components/CapletLoader';
import { useReveal } from '../lib/useReveal';

const CourseCover = ({ title }) => {
  // Generate a semi-stable pseudo-random gradient based on title
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hue1 + 40) % 360;
  const hue3 = (hue1 + 180) % 360;
  
  return (
    <div className="relative w-full h-full overflow-hidden group-hover:scale-105 transition-transform duration-700">
      <div 
        className="absolute inset-0 opacity-80"
        style={{
          background: `linear-gradient(${hue1}deg, hsl(${hue1}, 70%, 85%) 0%, hsl(${hue2}, 70%, 90%) 50%, hsl(${hue3}, 70%, 95%) 100%)`
        }}
      />
      
      {/* Abstract shapes */}
      <div 
        className="absolute top-[-20%] left-[-20%] w-[100%] h-[100%] rounded-full blur-[80px] mix-blend-multiply opacity-60"
        style={{ background: `hsl(${hue2}, 80%, 75%)` }}
      />
      <div 
        className="absolute bottom-[-30%] right-[-10%] w-[120%] h-[120%] rounded-full blur-[100px] mix-blend-screen opacity-40 animate-float"
        style={{ background: `hsl(${hue3}, 60%, 85%)` }}
      />
      
      {/* Decorative center element */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <span className="text-[12rem] font-serif italic select-none">{title.charAt(0)}</span>
      </div>
      
    </div>
  );
};

const Courses = () => {
  const { courses, loading, error, fetchCourses } = useCourses();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    level: '',
    search: '',
  });
  const [courseProgress, setCourseProgress] = useState({});

  useReveal(undefined, [courses, loading]);

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
        <CapletLoader message="Loading the curriculum" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        {error && (
          <div className="reveal mb-16 p-6 rounded-2xl bg-red-50 text-red-800 text-sm font-semibold flex items-center gap-4 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            {error}
          </div>
        )}

        {/* Header */}
        <header className="reveal mb-20">
          <p className="font-hand text-2xl text-accent mb-3 -rotate-2">Pick something to learn</p>
          <h1 className="font-display font-extrabold tracking-tight text-text-primary text-6xl md:text-8xl mb-8">
            Curriculum
          </h1>
          <p className="text-xl md:text-2xl text-text-muted max-w-xl leading-relaxed">
            Browse the full course library and start wherever you like.
          </p>
        </header>

        {/* Filters */}
        <div className="reveal mb-16 flex flex-col sm:flex-row gap-6">
          <div className="sm:w-48">
            <label className="text-sm font-semibold text-text-dim mb-3 block">Level</label>
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="w-full bg-surface-raised border border-line-soft px-5 py-4 rounded-xl text-sm font-semibold outline-none focus:border-accent transition-colors"
            >
              <option value="">All levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-semibold text-text-dim mb-3 block">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search courses by title"
              className="w-full bg-surface-raised border border-line-soft px-5 py-4 rounded-xl text-sm font-semibold outline-none focus:border-accent transition-colors placeholder:text-text-dim/40"
            />
          </div>
        </div>

        {/* Course grid */}
        <div data-tour-id="courses-grid" className="reveal-stagger grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const progress = courseProgress[course.id] || 0;
            const hasProgress = progress > 0;

            return (
              <div
                key={course.id}
                onClick={() => handleCourseClick(course.id)}
                className="group cursor-pointer flex flex-col bg-surface-raised rounded-3xl p-7 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] hover:-translate-y-1 transition-transform duration-200"
              >
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-accent text-white">
                    {course.level || 'Beginner'}
                  </span>
                  {hasProgress && (
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full block-green text-green">
                      In progress
                    </span>
                  )}
                </div>

                <div className="aspect-[16/9] w-full mb-7 overflow-hidden bg-surface-soft rounded-2xl">
                  <CourseCover title={course.title} id={course.id} />
                </div>

                <h3 className="font-display font-bold tracking-tight text-2xl text-text-primary mb-3 group-hover:text-accent transition-colors duration-300">
                  {course.title}
                </h3>

                <p className="text-sm font-medium text-text-muted leading-relaxed mb-7 line-clamp-3">
                  {course.shortDescription}
                </p>

                <div className="mt-auto">
                  <div className="flex items-center gap-3 text-sm font-semibold text-text-dim mb-6">
                    <span>{course.duration}m</span>
                    <span className="w-1 h-1 rounded-full bg-text-dim" />
                    <span>{(course.modules || []).reduce((sum, m) => sum + (m.lessons || []).length, 0)} lessons</span>
                  </div>

                  {isAuthenticated && hasProgress && (
                    <div className="mb-6">
                      <div className="flex justify-between text-sm font-semibold text-text-dim mb-2">
                        <span>Progress</span>
                        <span className="text-accent">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-surface-soft h-1.5 rounded-full overflow-hidden">
                        <div className="bg-accent h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-accent">
                      {hasProgress ? 'Continue module' : 'Open lesson'}
                    </span>
                    <ArrowRightIcon className="w-4 h-4 text-accent group-hover:translate-x-1.5 transition-transform duration-300" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {courses.length === 0 && !loading && (
          <div className="reveal py-24 px-8 text-center block-cream rounded-3xl shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h3 className="font-display font-bold tracking-tight text-2xl text-text-primary mb-3">
              No courses match those filters
            </h3>
            <p className="text-text-muted font-medium text-sm mb-8 max-w-md mx-auto">
              Try a different level or search term, or clear everything to see the full library.
            </p>
            <button
              onClick={() => setFilters({ level: '', search: '' })}
              className="btn-primary"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
