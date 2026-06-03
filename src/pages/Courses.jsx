import { useState, useEffect } from 'react';
import { useCourses } from '../contexts/CoursesContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import CapletLoader from '../components/CapletLoader';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';

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

  const clearFilters = () => setFilters({ level: '', search: '' });

  if (loading) {
    return <LoadingState message="Loading curriculum…" />;
  }

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        {error && (
          <ErrorState
            title="Course library could not be loaded."
            message="We could not refresh the course list. Please try again or adjust your filters."
            details={error}
            action={(
              <button
                type="button"
                onClick={() => fetchCourses(filters)}
                className="btn-primary py-3 px-8"
              >
                Retry
              </button>
            )}
            className="mb-20 reveal-text"
          />
        )}

        <PageHeader
          kicker="Course library"
          title="Curriculum."
          description="Browse our course library designed for Australian learners. Filter by level, track your progress, and jump straight into the next lesson."
        />

        <section className="mb-14 rounded-[2rem] border border-line-soft bg-surface-raised p-6 md:p-8 reveal-text stagger-1" aria-label="Course filters">
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="sm:w-56">
              <label className="text-sm font-semibold text-text-dim mb-3 block">Level</label>
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
                className="w-full bg-surface-body border border-line-soft px-5 py-4 rounded-xl text-sm font-medium outline-none focus:border-accent transition-colors"
              >
                <option value="">All Levels</option>
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
                placeholder="Search by title..."
                className="w-full bg-surface-body border border-line-soft px-5 py-4 rounded-xl text-sm font-medium outline-none focus:border-accent transition-colors placeholder:text-text-dim/40"
              />
            </div>
          </div>
        </section>

        {courses.length > 0 ? (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 reveal-text stagger-2" aria-label="Courses">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                progress={courseProgress[course.id]}
                to={`/courses/${course.id}`}
                actionLabel={(courseProgress[course.id] || 0) > 0 ? 'Continue course' : 'View course'}
              />
            ))}
          </section>
        ) : (
          <EmptyState
            kicker="No courses found"
            title="Try a broader search."
            description="No courses match the current filters. Clear your search and level selection to return to the full curriculum."
            action={(
              <button
                onClick={clearFilters}
                className="btn-primary py-3 px-8"
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

                <div className="aspect-[16/9] w-full mb-12 overflow-hidden bg-surface-soft border border-line-soft rounded-[2rem]">
                  <CourseCover title={course.title} id={course.id} />
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
          <EmptyState
            eyebrow="Registry query null"
            title="No courses match this view."
            message="Try clearing your filters or searching for another topic."
            action={(
              <button
                type="button"
                onClick={() => setFilters({ level: '', search: '' })}
                className="text-[10px] font-bold uppercase tracking-widest text-accent hover:text-accent-strong transition-colors"
              >
                Clear Filters
              </button>
            )}
            className="reveal-text"
          />
        )}
      </div>
    </div>
  );
};

export default Courses;
