import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCourses } from '../contexts/CoursesContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { ArrowRightIcon, AcademicCapIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import CapletLoader from '../components/CapletLoader';
import { LearningCard, LearningPageHeader, LearningSection } from '../components/learning/LearningChrome';
import { useReveal } from '../lib/useReveal';

const Courses = () => {
  const { courses, loading, error, fetchCourses } = useCourses();
  const { isAuthenticated } = useAuth();
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
          const response = await api.getCourseProgressSummaries();
          const progressMap = Object.fromEntries((response?.courses || []).map((item) => [String(item.courseId), item]));
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

  const courseHref = (course) => {
    const progress = courseProgress[String(course.id)];
    if (!progress?.nextLesson?.id) return `/courses/${course.id}`;
    const params = progress.nextLesson.lastSlideIndex > 0 ? `?slide=${progress.nextLesson.lastSlideIndex}` : '';
    return `/courses/${course.id}/lessons/${progress.nextLesson.id}${params}`;
  };

  const inProgressCourses = courses.filter((course) => courseProgress[String(course.id)]?.status === 'in_progress');
  const groupedCourses = courses.reduce((groups, course) => {
    const metadata = course.metadata || {};
    const subject = metadata.subject || (course.tags || []).find((tag) => String(tag).toLowerCase() === 'economics') || course.category || 'Learning paths';
    const year = metadata.yearLevel ? ` · Year ${metadata.yearLevel}` : '';
    const label = `${String(subject).replaceAll('-', ' ')}${year}`;
    groups[label] = [...(groups[label] || []), course];
    return groups;
  }, {});

  const renderCourseCard = (course) => {
    const progress = courseProgress[String(course.id)];
    const percentage = Number(progress?.progressPercentage || 0);
    const hasProgress = progress?.status === 'in_progress';
    const lessonCount = (course.modules || []).reduce((sum, module) => sum + (module.lessons || []).length, 0);
    return <LearningCard key={course.id} title={course.title} description={course.shortDescription} href={courseHref(course)} kind={course.metadata?.subject || course.category || 'Learning path'} metadata={[`${course.duration || 0} min`, `${lessonCount} lessons`, course.level]} status={hasProgress ? 'In progress' : progress?.status === 'completed' ? 'Complete' : undefined} progress={hasProgress || progress?.status === 'completed' ? percentage : undefined} icon={AcademicCapIcon} actionLabel={hasProgress ? `Continue ${progress.nextLesson?.title || 'learning'}` : 'Open learning path'} />;
  };

  const hasActiveFilters = Boolean(filters.level || filters.search.trim());
  const showNoMatches = courses.length === 0 && !loading && !error && hasActiveFilters;
  const showCatalogEmpty = courses.length === 0 && !loading && !error && !hasActiveFilters;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <CapletLoader message="Loading the curriculum" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-body pb-28 pt-24 selection:bg-accent selection:text-white md:pt-28">
      <div className="container-custom">
        {error && (
          <div role="alert" className="reveal mb-10 rounded-2xl bg-surface-error p-5 text-sm font-semibold text-text-error">
            Learning paths could not be loaded. Economics study and diagnostic practice are still available below.
          </div>
        )}

        <Link to="/library" className="mb-7 inline-flex min-h-11 items-center text-sm font-bold text-text-muted transition-colors hover:text-accent">← Learn</Link>
        <LearningPageHeader eyebrow="Structured study" title="Learning paths" description="Follow lessons in order, resume exactly where you stopped, or begin with a quick Economics diagnostic." className="reveal mb-12" />

        {/* Filters */}
        <div className="reveal mb-12 flex flex-col gap-5 rounded-3xl bg-surface-soft p-5 sm:flex-row sm:p-6">
          <div className="sm:w-48">
            <label htmlFor="learning-path-level" className="text-sm font-semibold text-text-dim mb-3 block">Level</label>
            <select
              id="learning-path-level"
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
            <label htmlFor="learning-path-search" className="text-sm font-semibold text-text-dim mb-3 block">Search</label>
            <input
              id="learning-path-search"
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Search courses by title"
              className="w-full bg-surface-raised border border-line-soft px-5 py-4 rounded-xl text-sm font-semibold outline-none focus:border-accent transition-colors placeholder:text-text-dim/40"
            />
          </div>
        </div>

        {inProgressCourses.length > 0 && <LearningSection eyebrow="Saved progress" title="Continue learning" description="Pick up at the exact lesson and slide you last reached." className="reveal mb-16"><div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{inProgressCourses.map(renderCourseCard)}</div></LearningSection>}

        <div data-tour-id="courses-grid" className="space-y-14">
          {Object.entries(groupedCourses).map(([label, group]) => <LearningSection key={label} title={label} className="capitalize"><div className="reveal-stagger grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{group.map(renderCourseCard)}</div></LearningSection>)}
        </div>

        {showNoMatches && (
          <div className="reveal rounded-3xl border border-dashed border-line-soft bg-surface-soft px-8 py-12 text-center">
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-text-primary">No learning paths match those filters.</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm font-medium text-text-muted">Clear the level or search filters to see every published path.</p>
            <button type="button" onClick={() => setFilters({ level: '', search: '' })} className="btn-primary mx-auto mt-6">Clear filters</button>
          </div>
        )}

        {(showCatalogEmpty || error) && (
          <div className="reveal rounded-3xl block-blue px-8 py-14 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] md:px-12">
            <AcademicCapIcon className="h-10 w-10 text-accent" />
            <h3 className="mt-6 font-display text-3xl font-bold tracking-tight text-text-primary">Start with Economics while new paths are being prepared.</h3>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-text-muted">The Economics library already includes Year 11 and Year 12 topics, saved adaptive practice, feedback, and a mastery map.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link to="/library/economics" className="btn-primary">Open Economics <ArrowRightIcon className="h-4 w-4" /></Link><Link to="/practice?subject=economics&mode=diagnostic&source=course" className="btn-secondary"><ClipboardDocumentCheckIcon className="h-4 w-4" /> Take the diagnostic</Link></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;
