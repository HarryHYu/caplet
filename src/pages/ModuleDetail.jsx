import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import { useReveal } from '../lib/useReveal';
import { LearningCard, LearningPageHeader, LearningSection } from '../components/learning/LearningChrome';
import LearningProgressSummary from '../components/learning/LearningProgressSummary';
import { BookOpenIcon } from '@heroicons/react/24/outline';

const ModuleDetail = () => {
  const { courseId, moduleId } = useParams();
  const { isAuthenticated } = useAuth();
  useReveal();
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
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <CapletLoader message="Loading module…" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <p className="font-display text-2xl font-extrabold tracking-tight mb-4">{error || 'Course not found'}</p>
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
          <p className="font-display text-2xl font-extrabold tracking-tight mb-4">Module not found</p>
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
  return (
    <div className="min-h-screen bg-surface-body pb-28 pt-24 selection:bg-accent selection:text-white md:pt-28">
      <div className="container-custom">
        <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-2 text-sm font-bold text-text-muted">
          <Link to="/library" className="min-h-11 content-center transition-colors hover:text-accent">Learn</Link><span aria-hidden="true">/</span><Link to="/courses" className="min-h-11 content-center transition-colors hover:text-accent">Learning paths</Link><span aria-hidden="true">/</span><Link to={`/courses/${courseId}`} className="min-h-11 content-center transition-colors hover:text-accent">{course.title}</Link>
        </nav>

        <div className="reveal mb-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <LearningPageHeader eyebrow="Course module" title={module_.title} description={module_.description} />
          <LearningProgressSummary label="Module progress" completed={completedInModule} total={totalInModule} detail={completedInModule === totalInModule && totalInModule > 0 ? 'Ready to review.' : 'Your completed lessons are saved.'} />
        </div>

        <LearningSection eyebrow="Ordered steps" title="Lessons" description={`${lessons.length} lessons in this module. Work through them in order or reopen completed material.`}>
          <div className="reveal-stagger grid gap-4 md:grid-cols-2">
            {lessons.map((lesson, idx) => {
              const complete = isLessonComplete(lesson);
              return <LearningCard key={lesson.id} title={`${lesson.order || idx + 1}. ${lesson.title}`} description={lesson.description} href={`/courses/${courseId}/lessons/${lesson.id}`} kind="Lesson" status={complete ? 'Complete' : 'Not started'} icon={BookOpenIcon} actionLabel={complete ? 'Review lesson' : 'Start lesson'} />;
            })}
          </div>

          {lessons.length === 0 && (
            <div className="py-20 text-center rounded-3xl block-cream shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
              <p className="text-lg text-text-muted">
                No lessons available yet.
              </p>
            </div>
          )}
        </LearningSection>
      </div>
    </div>
  );
};


export default ModuleDetail;
