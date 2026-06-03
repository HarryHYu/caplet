import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowPathIcon, ArrowRightIcon, BookOpenIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useCourses } from '../contexts/CoursesContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import { Badge, Button, Card, EmptyState, Input, PageHeader, PageShell, SectionHeader } from '../components/ui';

const levelOptions = [
  { value: '', label: 'All levels' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const CourseCover = ({ title }) => {
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hue1 + 42) % 360;
  const hue3 = (hue1 + 180) % 360;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-surface-soft">
      <div
        className="absolute inset-0 opacity-90 transition-transform duration-700 group-hover:scale-105"
        style={{
          background: `linear-gradient(135deg, hsl(${hue1}, 72%, 82%) 0%, hsl(${hue2}, 72%, 90%) 52%, hsl(${hue3}, 68%, 94%) 100%)`,
        }}
      />
      <div className="absolute -left-16 -top-16 h-48 w-48 rounded-full bg-white/40 blur-3xl" />
      <div className="absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
      <span className="absolute bottom-5 right-6 select-none font-serif text-7xl italic text-white/45 dark:text-surface-inverse/35">
        {title.charAt(0)}
      </span>
    </div>
  );
};

export default function Courses() {
  const { courses, loading, error, fetchCourses } = useCourses();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ level: '', search: '' });
  const [courseProgress, setCourseProgress] = useState({});

  useEffect(() => {
    fetchCourses(filters);
  }, [fetchCourses, filters]);

  useEffect(() => {
    if (!isAuthenticated || courses.length === 0) {
      setCourseProgress({});
      return;
    }

    const fetchProgress = async () => {
      try {
        const progressMap = {};
        const courseIds = [...new Set(courses.map((course) => course.id))];
        await Promise.all(
          courseIds.map(async (courseId) => {
            try {
              const progress = await api.getCourseProgress(courseId);
              progressMap[courseId] = progress.courseProgress?.progressPercentage || 0;
            } catch {
              progressMap[courseId] = 0;
            }
          }),
        );
        setCourseProgress(progressMap);
      } catch (progressError) {
        console.error('Error fetching progress:', progressError);
      }
    };

    fetchProgress();
  }, [isAuthenticated, courses]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => setFilters({ level: '', search: '' });

  if (loading) {
    return (
      <PageShell spacing="sm" className="flex items-center justify-center">
        <CapletLoader message="Loading curriculum…" />
      </PageShell>
    );
  }

  return (
    <PageShell spacing="md">
      <PageHeader
        eyebrow="Course library"
        title="Curriculum built for clarity."
        actions={<Button onClick={resetFilters} variant="secondary" size="sm"><ArrowPathIcon className="h-4 w-4" /> Reset</Button>}
      >
        Browse short, practical courses designed around Australian money decisions.
      </PageHeader>

      {error && (
        <EmptyState
          icon={BookOpenIcon}
          title="We could not load courses"
          className="mb-10 border-red-500/30 bg-red-500/5"
          action={<Button onClick={() => fetchCourses(filters)} variant="secondary">Try again</Button>}
        >
          {error}
        </EmptyState>
      )}

      <Card padding="lg" className="mb-12">
        <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
          <div>
            <label htmlFor="course-level" className="mb-2 block text-sm font-semibold text-text-primary">Level</label>
            <select
              id="course-level"
              value={filters.level}
              onChange={(event) => handleFilterChange('level', event.target.value)}
              className="min-h-12 w-full rounded-lg border border-line-soft bg-surface-raised px-4 py-3 text-text-primary shadow-minimal outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent"
            >
              {levelOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <Input
            id="course-search"
            label="Search"
            value={filters.search}
            onChange={(event) => handleFilterChange('search', event.target.value)}
            placeholder="Search by title, topic, or description…"
            leading={<MagnifyingGlassIcon className="h-5 w-5" />}
          />
        </div>
      </Card>

      <SectionHeader
        title="Available courses"
        actions={<Badge variant="neutral">{courses.length} {courses.length === 1 ? 'course' : 'courses'}</Badge>}
      />

      {courses.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const progress = courseProgress[course.id] || 0;
            const hasProgress = progress > 0;
            const lessonCount = (course.modules || []).reduce((sum, moduleItem) => sum + (moduleItem.lessons || []).length, 0);

            return (
              <Card
                key={course.id}
                as="button"
                type="button"
                onClick={() => navigate(`/courses/${course.id}`)}
                padding="none"
                interactive
                className="group flex h-full flex-col overflow-hidden text-left"
              >
                <div className="aspect-[16/9] border-b border-line-soft">
                  <CourseCover title={course.title} />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <Badge variant="accent">{course.level || 'Beginner'}</Badge>
                    {hasProgress && <Badge variant="success">In progress</Badge>}
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight text-text-primary transition-colors group-hover:text-accent">
                    {course.title}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-text-muted">
                    {course.shortDescription || course.description || 'A focused Caplet course for building practical money confidence.'}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-text-dim">
                    {course.duration && <span>{course.duration}m</span>}
                    {course.duration && <span className="h-1 w-1 rounded-full bg-text-dim" />}
                    <span>{lessonCount} lessons</span>
                  </div>
                  {isAuthenticated && hasProgress && (
                    <div className="mt-6">
                      <div className="mb-2 flex justify-between text-xs font-semibold text-text-muted">
                        <span>Progress</span>
                        <span className="text-accent">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
                        <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="mt-auto flex items-center justify-between border-t border-line-soft pt-5 text-sm font-semibold text-text-primary">
                    <span>{hasProgress ? 'Continue course' : 'View course'}</span>
                    <ArrowRightIcon className="h-4 w-4 text-text-dim transition-all group-hover:translate-x-1 group-hover:text-accent" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={BookOpenIcon}
          title="No courses match those filters"
          action={<Button onClick={resetFilters} variant="secondary">Clear filters</Button>}
        >
          Try a broader search or reset the level filter to see the full curriculum.
        </EmptyState>
      )}
    </PageShell>
  );
}
