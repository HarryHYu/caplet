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
      <div className="min-h-screen flex items-center justify-center page-section-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent mx-auto"></div>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Loading module...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center page-section-light">
        <div className="text-center max-w-md mx-auto px-6">
          <span className="section-kicker mb-4">System Notice</span>
          <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-6">
            {error || 'Course not found'}
          </p>
          <Link to="/courses" className="btn-secondary">Return to Library</Link>
        </div>
      </div>
    );
  }

  if (!module_) {
    return (
      <div className="min-h-screen flex items-center justify-center page-section-light">
        <div className="text-center max-w-md mx-auto px-6">
          <span className="section-kicker mb-4">System Notice</span>
          <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-6">
            Module not found
          </p>
          <Link to={`/courses/${courseId}`} className="btn-secondary">Back to Course</Link>
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
    <div className="min-h-screen py-24 page-section-light">
      <div className="container-custom">
        <div className="mb-12 animate-slide-up">
          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="mb-8 inline-flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-brand transition-colors"
          >
            ← Back to Sequence
          </button>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
            <div className="flex-1">
              <span className="section-kicker mb-4">Module Analysis</span>
              <h1 className="text-4xl md:text-5xl font-extrabold text-black dark:text-white uppercase tracking-tighter mb-6">
                {module_.title}.
              </h1>
              {module_.description && (
                <p className="text-xl text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl">
                  {module_.description}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-4 min-w-[240px]">
              <div className="flex items-center justify-between text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                <span>Verification Progress</span>
                <span className="text-black dark:text-white">{completedInModule} / {totalInModule}</span>
              </div>
              <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                <div
                  className="h-full bg-brand transition-all duration-1000"
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 reveal-up" style={{ animationDelay: '100ms' }}>
          <div className="border-b border-zinc-100 dark:border-zinc-900 pb-4 mb-8">
            <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">
              Operational Sequences ({lessons.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {lessons.map((lesson) => (
              <Link
                key={lesson.id}
                to={`/courses/${courseId}/lessons/${lesson.id}`}
                className="group flex items-center justify-between p-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 hover:border-brand transition-all"
              >
                <div className="flex items-center gap-8 min-w-0">
                  <span className="text-2xl font-black text-zinc-200 dark:text-zinc-800 tabular-nums">
                    {String(lesson.order).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-black dark:text-white uppercase tracking-tight group-hover:text-brand transition-colors truncate">
                      {lesson.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">
                        {lesson.description || 'Instructional Sequence'}
                      </span>
                      {isLessonComplete(lesson) && (
                        <span className="inline-flex items-center gap-1.5 text-[8px] font-black text-brand uppercase tracking-widest">
                          <span className="w-1 h-1 bg-brand rounded-full animate-pulse" />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all">
                  Execute →
                </span>
              </Link>
            ))}
          </div>

          {lessons.length === 0 && (
            <div className="p-20 text-center border border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950">
              <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-[0.3em]">
                Zero operational sequences detected in this module.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModuleDetail;
