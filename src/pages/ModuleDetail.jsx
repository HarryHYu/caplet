import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';

const ModuleDetail = () => {
  const { courseId, moduleId } = useParams();
  const navigate = useNavigate();
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
        try {
          const prog = await api.getCourseProgress(courseId);
          setProgress(prog);
        } catch {
          // ignore if not logged in
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId]);

  useEffect(() => {
    if (!course?.modules) return;
    const mod = course.modules.find((m) => String(m.id) === String(moduleId));
    setModule_(mod || null);
  }, [course, moduleId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <p className="text-2xl font-bold mb-4">{error || 'Course not found'}</p>
          <p className="text-text-muted mb-8">The course you're looking for doesn't exist or may have been moved.</p>
          <Link to="/courses" className="btn-primary py-3 px-8">Back to Courses</Link>
        </div>
      </div>
    );
  }

  if (!module_) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <p className="text-2xl font-bold mb-4">Module not found</p>
          <p className="text-text-muted mb-8">This module doesn't exist or may have been moved.</p>
          <Link to={`/courses/${courseId}`} className="btn-primary py-3 px-8">Back to Course</Link>
        </div>
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
    <div className="min-h-screen bg-surface-body py-12 md:py-20">
      <div className="container-custom">
        {/* Back link */}
        <button
          onClick={() => navigate(`/courses/${courseId}`)}
          className="mb-8 inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent transition-colors"
        >
          &larr; Course Overview
        </button>

        {/* Module header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-12">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              {module_.title}
            </h1>
            {module_.description && (
              <p className="text-lg text-text-muted leading-relaxed max-w-2xl">
                {module_.description}
              </p>
            )}
          </div>

          {/* Progress summary */}
          <div className="flex flex-col gap-3 min-w-[260px] p-6 bg-surface-raised border border-line-soft rounded-xl">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Progress</span>
              <span className="font-medium text-accent">{completedInModule} of {totalInModule} completed</span>
            </div>
            <div className="h-2 w-full bg-surface-soft rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressWidth}%` }}
              />
            </div>
          </div>
        </div>

        {/* Lessons list */}
        <div>
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl font-bold">Lessons</h2>
            <p className="text-sm text-text-muted">{lessons.length} lessons</p>
          </div>

          <div className="space-y-2">
            {lessons.map((lesson, idx) => (
              <Link
                key={lesson.id}
                to={`/courses/${courseId}/lessons/${lesson.id}`}
                className="group bg-surface-raised border border-line-soft rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between transition-colors duration-200 hover:border-accent/50 block"
              >
                <div className="flex items-center gap-5 min-w-0 mb-4 md:mb-0">
                  <span className="text-2xl font-bold text-text-dim w-8 text-right shrink-0">
                    {lesson.order || idx + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-text-primary mb-1 truncate group-hover:text-accent transition-colors">
                      {lesson.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-text-muted">
                      {lesson.description && <span>{lesson.description}</span>}
                      {isLessonComplete(lesson) && (
                        <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-0.5 rounded-full">
                          Completed
                        </span>
                      )}
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
            <div className="py-20 text-center border border-line-soft rounded-xl bg-surface-soft">
              <p className="text-lg text-text-muted">
                No lessons available yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default ModuleDetail;
