import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';

const ModuleDetail = () => {
  const { courseId, moduleId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [course, setCourse] = useState(null);
  const [module_, setModule_] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ lessonProgress: [] });

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

  useEffect(() => {
    if (!course?.modules) return;
    const mod = course.modules.find((m) => String(m.id) === String(moduleId));
    setModule_(mod || null);
  }, [course, moduleId]);

  if (loading) {
    return <LoadingState message="Loading module…" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center p-6">
        <ErrorState
          title="Module could not be loaded."
          message="We could not load this module right now. Please return to the course and try again."
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

  if (!module_) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center p-6">
        <EmptyState
          eyebrow="Module not found"
          title="This module is unavailable."
          message="This module doesn't exist or may have been moved."
          action={<Link to={`/courses/${courseId}`} className="btn-primary py-3 px-8">Back to Course</Link>}
          className="max-w-xl w-full"
        />
      </div>
    );
  }

  const lessons = (module_.lessons || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const lessonHasContent = (l) => {
    const slides = l.slides;
    if (Array.isArray(slides) && slides.length > 0) return true;
    if (typeof slides === 'string' && slides.trim()) {
      try { const p = JSON.parse(slides); if (Array.isArray(p) && p.length > 0) return true; } catch { /* noop */ }
    }
    if (l.content && String(l.content).trim()) return true;
    if (l.videoUrl && String(l.videoUrl).trim()) return true;
    return false;
  };

  const isLessonComplete = (l) => {
    if (!lessonHasContent(l)) return false;
    return progress?.lessonProgress?.some((p) => String(p.lessonId) === String(l.id) && p.status === 'completed');
  };

  const completedInModule = lessons.filter(isLessonComplete).length;
  const totalInModule = lessons.length;
  const progressWidth = totalInModule > 0 ? (completedInModule / totalInModule) * 100 : 0;

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <button
          onClick={() => navigate(`/courses/${courseId}`)}
          className="mb-10 inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent transition-colors"
        >
          &larr; Course Overview
        </button>

        <PageHeader
          kicker="Module detail"
          eyebrow={course.title}
          title={module_.title}
          description={module_.description || 'Work through each lesson in order and return anytime to review completed material.'}
          actions={(
            <div className="min-w-[280px] p-6 bg-surface-raised border border-line-soft rounded-[1.5rem]">
              <div className="flex items-center justify-between text-sm mb-4">
                <span className="text-text-muted">Progress</span>
                <span className="font-medium text-accent">{completedInModule} of {totalInModule} completed</span>
              </div>
              <ProgressBar value={progressWidth} label="Module progress" />
            </div>
          )}
        />

        <section aria-label="Lessons">
          <div className="flex items-end justify-between mb-8">
            <div>
              <span className="section-kicker mb-3">Lessons</span>
              <h2 className="text-3xl md:text-4xl font-bold">Learn at a steady pace.</h2>
            </div>
            <p className="text-sm text-text-muted">{lessons.length} lessons</p>
          </div>

          {lessons.length > 0 ? (
            <div className="space-y-4">
              {lessons.map((lesson, idx) => {
                const complete = isLessonComplete(lesson);

                return (
                  <Link
                    key={lesson.id}
                    to={`/courses/${courseId}/lessons/${lesson.id}`}
                    className="group bg-surface-raised border border-line-soft rounded-[1.5rem] p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors duration-200 hover:border-accent/50 block"
                  >
                    <div className="flex items-start gap-5 min-w-0">
                      <span className="text-2xl font-bold text-text-dim w-10 text-right shrink-0">
                        {String(lesson.order || idx + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-xl font-semibold text-text-primary mb-2 group-hover:text-accent transition-colors">
                          {lesson.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
                          {lesson.description && <span className="leading-relaxed">{lesson.description}</span>}
                          {!lesson.description && <span>Lesson {idx + 1}</span>}
                          {complete && (
                            <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-0.5 rounded-full">
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-text-muted group-hover:text-accent transition-colors">
                    {isLessonComplete(lesson) ? 'Review' : 'Start Lesson'} &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {lessons.length === 0 && (
            <EmptyState
              eyebrow="Lessons"
              title="No lessons available yet."
              message="This module is ready, but lesson content has not been added yet."
              compact
              className="rounded-xl"
            />
          )}
        </section>
      </div>
    </div>
  );
};

export default ModuleDetail;
