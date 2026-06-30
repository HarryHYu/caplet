import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import { useReveal } from '../lib/useReveal';

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  useReveal();
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
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <CapletLoader message="Loading course…" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center px-6">
        <div className="text-center max-w-md mx-auto bg-surface-raised rounded-3xl p-10 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
          <h2 className="font-display text-3xl font-extrabold tracking-tight mb-4">
            {error || 'Course not found'}
          </h2>
          <p className="text-text-muted mb-8">The course you're looking for doesn't exist or may have been moved.</p>
          <Link to="/courses" className="btn-primary py-3 px-8">
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  const sortedModules = (course.modules || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const totalLessonCount = sortedModules.reduce((sum, m) => sum + (m.lessons || []).length, 0);

  const startCourse = () => {
    const firstModule = sortedModules[0];
    if (firstModule) navigate(`/courses/${course.id}/modules/${firstModule.id}`);
  };

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        {/* Back link */}
        <button
          onClick={() => navigate('/courses')}
          className="mb-8 inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent transition-colors"
        >
          &larr; All Courses
        </button>

        {/* Course header */}
        <div className="mb-12 reveal">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
            <div className="flex-1">
              <p className="font-hand text-2xl text-blue mb-3 -rotate-1">Let's dig in</p>
              <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
                {course.title}
              </h1>
              <p className="text-lg text-text-muted leading-relaxed max-w-2xl">
                {course.description || course.shortDescription}
              </p>
            </div>
            {course.thumbnail && (
              <div className="w-full md:w-72 aspect-video rounded-2xl overflow-hidden shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] shrink-0">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {/* Course info card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 reveal-stagger">
          <div className="lg:col-span-8">
            <div className="bg-surface-raised rounded-3xl p-8 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="rounded-2xl block-cream p-5">
                  <p className="text-xs font-bold text-text-muted mb-1">Duration</p>
                  <p className="font-display text-xl font-bold tracking-tight">{course.duration} minutes</p>
                </div>
                <div className="rounded-2xl block-cream p-5">
                  <p className="text-xs font-bold text-text-muted mb-1">Lessons</p>
                  <p className="font-display text-xl font-bold tracking-tight">{totalLessonCount} lessons</p>
                </div>
                <div className="rounded-2xl block-cream p-5">
                  <p className="text-xs font-bold text-text-muted mb-1">Level</p>
                  <p className="font-display text-xl font-bold tracking-tight capitalize">{course.level}</p>
                </div>
              </div>

              {progress?.courseProgress && (
                <div className="mb-8">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-text-muted">Your progress</span>
                    <span className="font-bold text-accent">{Math.round(progress.courseProgress.progressPercentage)}%</span>
                  </div>
                  <div className="h-3 w-full bg-surface-soft rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress.courseProgress.progressPercentage}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={startCourse}
                className="btn-primary py-3 px-10 hover:-translate-y-0.5 transition-transform"
              >
                {progress?.courseProgress ? 'Continue Learning' : 'Start Course'}
              </button>
            </div>
          </div>

          {/* Learning outcomes or metadata sidebar */}
          {course.learningOutcomes && course.learningOutcomes.length > 0 ? (
            <aside className="lg:col-span-4 block-blue rounded-3xl p-8 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
              <h3 className="font-display text-lg font-bold tracking-tight mb-4">What You'll Learn</h3>
              <ul className="space-y-3">
                {course.learningOutcomes.map((outcome, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                    <span className="text-accent mt-0.5">&#10003;</span>
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </aside>
          ) : (
            <aside className="lg:col-span-4 block-blue rounded-3xl p-8 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] flex flex-col justify-center">
              <h3 className="font-display text-lg font-bold tracking-tight mb-2">About This Course</h3>
              <p className="text-sm text-text-primary leading-relaxed">
                This course is part of Caplet's free financial education program. Every module is built for clarity and practical understanding.
              </p>
            </aside>
          )}
        </div>

        {/* Modules list */}
        <div className="reveal">
          <div className="flex items-end justify-between mb-6">
            <h2 className="font-display text-3xl font-extrabold tracking-tight">Modules</h2>
            <p className="text-sm text-text-muted">{sortedModules.length} modules</p>
          </div>

          <div className="space-y-3 reveal-stagger">
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
                  className="group bg-surface-raised rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] hover:-translate-y-0.5 transition-transform duration-200 block"
                >
                  <div className="flex items-center gap-5 min-w-0 mb-4 md:mb-0">
                    <span className="font-display text-2xl font-extrabold tracking-tight text-blue w-8 text-right shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-bold tracking-tight text-text-primary mb-1 truncate group-hover:text-accent transition-colors">
                        {mod.title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-text-muted">
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

                  <div className="flex items-center gap-4">
                    {percentage === 100 && (
                      <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                        Complete
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
            <div className="py-20 text-center rounded-3xl block-cream shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
              <p className="text-lg text-text-muted">
                No modules available yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default CourseDetail;
