import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ courseProgress: null, lessonProgress: [] });

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        setLoading(true);
        const courseResponse = await api.getCourse(courseId);
        setCourse(courseResponse);
        if (isAuthenticated) {
          try {
            const prog = await api.getCourseProgress(courseId);
            setProgress(prog);
          } catch {
            // ignore when progress is unavailable
          }
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId, isAuthenticated]);

  if (loading) {
    return <LoadingState message="Loading course…" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center p-6">
        <ErrorState
          title="Course could not be loaded."
          message="We could not load this course right now. Please return to the course library and try again."
          details={error}
          action={<Link to="/courses" className="btn-primary py-3 px-8">Back to Courses</Link>}
          className="max-w-xl w-full"
        />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center p-6">
        <EmptyState
          eyebrow="Course not found"
          title="This course is unavailable."
          message="The course you're looking for doesn't exist or may have been moved."
          action={<Link to="/courses" className="btn-primary py-3 px-8">Back to Courses</Link>}
          className="max-w-xl w-full"
        />
      </div>
    );
  }

  const sortedModules = (course.modules || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const totalLessonCount = getLessonCount(course);
  const courseProgress = progress?.courseProgress?.progressPercentage;
  const hasProgress = Number(courseProgress) > 0;

  const startCourse = () => {
    const firstModule = sortedModules[0];
    if (firstModule) navigate(`/courses/${course.id}/modules/${firstModule.id}`);
  };

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <button
          onClick={() => navigate('/courses')}
          className="mb-10 inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent transition-colors"
        >
          &larr; All Courses
        </button>

        <PageHeader
          kicker="Course overview"
          title={course.title}
          description={course.description || course.shortDescription}
          actions={(
            <button
              onClick={startCourse}
              disabled={sortedModules.length === 0}
              className="btn-primary py-4 px-10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {hasProgress ? 'Continue Learning' : 'Start Course'}
            </button>
          )}
        />

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20" aria-label="Course summary">
          <div className="lg:col-span-8">
            <div className="bg-surface-raised border border-line-soft rounded-[2rem] p-8 md:p-10">
              <div className="flex flex-wrap gap-3 mb-8">
                <span className="inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-accent capitalize">
                  {formatLevel(course.level)}
                </span>
                {hasProgress && (
                  <span className="inline-flex items-center rounded-full border border-line-soft bg-surface-body px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    In Progress
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
                <div className="rounded-2xl bg-surface-body border border-line-soft p-5">
                  <p className="text-xs font-medium text-text-muted mb-1">Duration</p>
                  <p className="text-lg font-semibold">{formatDuration(course.duration)}</p>
                </div>
                <div className="rounded-2xl bg-surface-body border border-line-soft p-5">
                  <p className="text-xs font-medium text-text-muted mb-1">Lessons</p>
                  <p className="text-lg font-semibold">{totalLessonCount} lessons</p>
                </div>
                <div className="rounded-2xl bg-surface-body border border-line-soft p-5">
                  <p className="text-xs font-medium text-text-muted mb-1">Modules</p>
                  <p className="text-lg font-semibold">{sortedModules.length} modules</p>
                </div>
              </div>

              {hasProgress && <ProgressBar value={courseProgress} label="Your Progress" className="mb-10" />}

              <p className="text-sm text-text-muted leading-relaxed">
                {course.shortDescription || 'Build practical financial confidence one module at a time.'}
              </p>
            </div>
          </div>

          <aside className="lg:col-span-4">
            <div className="h-full bg-accent/5 border border-accent/20 rounded-[2rem] p-8">
              {course.thumbnail && (
                <div className="aspect-video rounded-2xl overflow-hidden border border-line-soft mb-8 bg-surface-soft">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <h3 className="text-sm font-semibold mb-4">What you'll learn</h3>
              {course.learningOutcomes && course.learningOutcomes.length > 0 ? (
                <ul className="space-y-3">
                  {course.learningOutcomes.map((outcome, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                      <span className="text-accent mt-0.5">&#10003;</span>
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-text-muted leading-relaxed">
                  This course is part of Caplet's free financial education program. All modules are designed for clarity and practical understanding.
                </p>
              )}
            </div>
          </aside>
        </section>

        <section aria-label="Modules">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="section-kicker mb-3">Course modules</span>
              <h2 className="text-3xl md:text-4xl font-bold">Keep moving through the pathway.</h2>
            </div>
            <p className="text-sm text-text-muted">{sortedModules.length} modules</p>
          </div>

          {sortedModules.length > 0 ? (
            <div className="space-y-4">
              {sortedModules.map((mod, index) => {
                const moduleLessons = (mod.lessons || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                const lessonCount = moduleLessons.length;
                const mp = progress?.moduleProgress?.find((m) => String(m.moduleId) === String(mod.id));
                const completedInModule = mp ? mp.completedLessons : 0;
                const totalInModule = mp ? mp.totalLessons : lessonCount;
                const percentage = totalInModule > 0 ? Math.round((completedInModule / totalInModule) * 100) : 0;

                return (
                  <Link
                    key={mod.id}
                    to={`/courses/${course.id}/modules/${mod.id}`}
                    className="group bg-surface-raised border border-line-soft rounded-[1.5rem] p-6 md:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-colors duration-200 hover:border-accent/50 block"
                  >
                    <div className="flex items-start gap-5 min-w-0">
                      <span className="text-2xl font-bold text-text-dim w-10 text-right shrink-0">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-xl font-semibold text-text-primary mb-2 group-hover:text-accent transition-colors">
                          {mod.title}
                        </h3>
                        {mod.description && (
                          <p className="text-sm text-text-muted leading-relaxed mb-3 line-clamp-2">{mod.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
                          <span>{lessonCount} lessons</span>
                          {percentage > 0 && (
                            <>
                              <span className="w-1 h-1 bg-text-dim rounded-full" />
                              <span className={percentage === 100 ? 'text-green-600 dark:text-green-400 font-medium' : ''}>{percentage}% complete</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 lg:min-w-56 lg:justify-end">
                              {percentage === 100 && (
                        <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                          Complete
                        </span>
                      )}
                      <span className="text-sm text-text-muted group-hover:text-accent transition-colors whitespace-nowrap">
                        View Module &rarr;
                      </span>
                    )}
                    <span className="text-sm text-text-muted group-hover:text-accent transition-colors">
                      View Module &rarr;
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {sortedModules.length === 0 && (
            <EmptyState
              eyebrow="Modules"
              title="No modules available yet."
              message="This course has been published, but its module list is still empty."
              compact
              className="rounded-xl"
            />
          )}
        </section>
      </div>
    </div>
  );
};

export default CourseDetail;
