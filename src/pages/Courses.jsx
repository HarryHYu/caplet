import { useState, useEffect } from 'react';
import { useCourses } from '../contexts/CoursesContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { CourseCard, EmptyState, LoadingState, PageHeader } from '../components/course/CourseUI';

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
          <div className="mb-12 p-6 bg-red-50 border-l-4 border-red-500 rounded-r-xl text-red-800 text-sm font-medium flex items-center gap-4 reveal-text">
            {error}
          </div>
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
                Clear Filters
              </button>
            )}
          />
        )}
      </div>
    </div>
  );
};

export default Courses;
