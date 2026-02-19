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
        <div className="w-12 h-12 border-2 border-accent border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6 reveal-text">
          <span className="section-kicker">Status Error</span>
          <p className="text-3xl font-serif italic mb-12">
            {error || 'The requested curriculum entity could not be located.'}
          </p>
          <Link to="/courses" className="btn-primary py-4 px-12 text-[10px]">Return to Registry</Link>
        </div>
      </div>
    );
  }

  if (!module_) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6 reveal-text">
          <span className="section-kicker">Status Error</span>
          <p className="text-3xl font-serif italic mb-12">Unit registry not found.</p>
          <Link to={`/courses/${courseId}`} className="btn-primary py-4 px-12 text-[10px]">Back to Course</Link>
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
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <div className="mb-24 reveal-text">
          <button
            onClick={() => navigate(`/courses/${courseId}`)}
            className="mb-12 inline-flex items-center gap-4 text-[10px] font-black text-text-dim uppercase tracking-[0.4em] hover:text-accent transition-colors"
          >
            ← Course Overview
          </button>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-12">
            <div className="flex-1">
              <span className="section-kicker">Unit Focus</span>
              <h1 className="text-6xl md:text-8xl mb-8">
                {module_.title}.
              </h1>
              <p className="text-2xl text-text-muted font-serif italic max-w-2xl leading-relaxed">
                {module_.description || 'Detailed technical analysis and conceptual overview of this structural curriculum unit.'}
              </p>
            </div>

            <div className="flex flex-col gap-6 min-w-[300px] p-8 bg-surface-raised border border-line-soft">
              <div className="flex items-center justify-between text-[10px] font-black text-text-dim uppercase tracking-[0.4em]">
                <span>Unit Mastery</span>
                <span className="text-accent">{completedInModule} / {totalInModule} Verified</span>
              </div>
              <div className="h-1 w-full bg-surface-soft overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-1000 ease-out"
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="reveal-text stagger-1">
          <div className="flex items-end justify-between mb-12 border-b border-line-soft pb-8">
            <div>
              <span className="section-kicker">Inventory</span>
              <h2 className="text-4xl font-serif italic">Technical Lessons.</h2>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Module Node: {moduleId}</p>
          </div>

          <div className="grid grid-cols-1 gap-px bg-line-soft border border-line-soft overflow-hidden">
            {lessons.map((lesson, idx) => (
              <Link
                key={lesson.id}
                to={`/courses/${courseId}/lessons/${lesson.id}`}
                className="group bg-surface-body p-12 flex flex-col md:flex-row md:items-center justify-between transition-all duration-700 hover:bg-surface-raised relative overflow-hidden"
              >
                <div className="flex items-center gap-12 min-w-0 mb-8 md:mb-0">
                  <span className="text-5xl font-serif italic text-text-dim opacity-20 group-hover:opacity-40 transition-opacity tabular-nums">
                    {String(lesson.order || idx + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-2xl font-bold text-text-primary uppercase tracking-tight mb-2 truncate group-hover:text-accent transition-colors">
                      {lesson.title}
                    </h3>
                    <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-[0.2em] text-text-dim">
                      <span>{lesson.description || 'General Technical Unit'}</span>
                      {isLessonComplete(lesson) && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-accent/10 border border-accent/20 rounded-full">
                          <span className="w-1 h-1 bg-accent rounded-full animate-pulse" />
                          <span className="text-accent font-black tracking-widest">Verified Mastery</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] group-hover:text-accent group-hover:translate-x-2 transition-all">
                    Initialize Unit →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {lessons.length === 0 && (
            <div className="p-40 text-center border border-line-soft bg-surface-soft">
              <p className="text-xl font-serif italic text-text-dim">
                No technical units found in this inventory.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default ModuleDetail;
