import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';

/* ──────────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────────── */

function getYouTubeId(url) {
  if (!url) return '';
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
  return match ? match[1] : url;
}

// Build a flat, ordered list of lessons from course.modules
function getFlatLessons(course) {
  if (!course?.modules) return [];
  return (course.modules || [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .flatMap((m) => (m.lessons || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
}

function parseSlides(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
}

function slideKindLabel(type) {
  switch (type) {
    case 'text': return 'Reading';
    case 'image': return 'Visual';
    case 'video': return 'Watch';
    case 'question': return 'Check Yourself';
    default: return 'Slide';
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────────────────────────────────── */

// Slim ticker that shows one bar per slide — clickable, with state colors.
function SlideTicker({ slides, currentIndex, quizScores, onJump }) {
  return (
    <div className="flex items-center gap-1.5 w-full">
      {slides.map((s, i) => {
        const isQuestion = s?.type === 'question';
        const answered = quizScores[String(i)];
        const isCurrent = i === currentIndex;
        const isPast = i < currentIndex;
        let bar = 'bg-line-soft';
        if (isPast) bar = 'bg-accent/70';
        if (isCurrent) bar = 'bg-accent';
        if (isQuestion && answered === true) bar = 'bg-emerald-500';
        if (isQuestion && answered === false) bar = 'bg-rose-400';
        return (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => onJump(i)}
            className="group relative flex-1 py-2"
          >
            <span
              className={`block h-[3px] rounded-full transition-all duration-300 ${bar} ${isCurrent ? 'h-[5px]' : 'group-hover:h-[4px]'}`}
            />
          </button>
        );
      })}
    </div>
  );
}

function OutlinePanel({ course, lesson, completedLessonIds, onClose }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4 border-b border-line-soft sticky top-0 bg-surface-raised z-10">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-2">Curriculum</p>
          <h3 className="text-base font-serif italic text-text-primary truncate">{course.title}</h3>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full border border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim transition-colors flex items-center justify-center"
            aria-label="Close outline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-6 space-y-8">
        {(course.modules || [])
          .slice()
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((mod, mi) => (
            <section key={mod.id}>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
                  {String(mi + 1).padStart(2, '0')}
                </span>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-text-dim">{mod.title}</p>
              </div>
              <ul className="space-y-px border-l border-line-soft pl-4">
                {(mod.lessons || [])
                  .slice()
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                  .map((l) => {
                    const active = String(l.id) === String(lesson.id);
                    const done = completedLessonIds.has(String(l.id));
                    return (
                      <li key={l.id} className="-ml-4 pl-4 relative">
                        {active && (
                          <span className="absolute -left-[5px] top-3 w-2 h-2 rounded-full bg-accent ring-4 ring-accent/20" />
                        )}
                        <Link
                          to={`/courses/${course.id}/lessons/${l.id}`}
                          onClick={onClose}
                          className={`block py-2 pr-2 text-sm leading-snug transition-colors ${
                            active
                              ? 'text-accent font-semibold'
                              : done
                                ? 'text-text-muted hover:text-text-primary'
                                : 'text-text-muted hover:text-text-primary'
                          }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            {done && (
                              <svg className="w-3.5 h-3.5 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            <span>{l.title}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            </section>
          ))}
      </div>
    </div>
  );
}

function QuestionSlide({ slide, currentSlideIndex, quizScores, questionAnswer, setQuestionAnswer, questionSubmitted, onSubmit }) {
  const options = Array.isArray(slide.options) ? slide.options : [];
  const correctIndex = typeof slide.correctIndex === 'number' ? slide.correctIndex : 0;
  const alreadyAnswered = quizScores[String(currentSlideIndex)] !== undefined;
  const selected = questionAnswer ?? (alreadyAnswered ? undefined : null);
  const showFeedback = questionSubmitted || alreadyAnswered;
  const isActuallyCorrect = alreadyAnswered ? quizScores[String(currentSlideIndex)] : (selected === correctIndex);

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-[0.25em] mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
        Check Yourself
      </div>
      <h3 className="text-2xl md:text-3xl font-display font-bold leading-[1.25] text-text-primary mb-8">
        {slide.question}
      </h3>
      <div className="space-y-3">
        {options.map((option, optIdx) => {
          const chosen = selected === optIdx;
          const isTrulyCorrect = correctIndex === optIdx;
          let classes = 'border-line-soft hover:border-accent/60 hover:bg-accent/5';
          if (showFeedback && isTrulyCorrect) {
            classes = 'border-emerald-500/60 bg-emerald-500/[0.07] text-text-primary';
          } else if (showFeedback && chosen && !isTrulyCorrect) {
            classes = 'border-rose-400/60 bg-rose-500/[0.06] text-text-primary';
          } else if (showFeedback) {
            classes = 'border-line-soft opacity-50';
          } else if (chosen) {
            classes = 'border-accent bg-accent/[0.06]';
          }
          const letter = String.fromCharCode(65 + optIdx);
          return (
            <button
              key={optIdx}
              type="button"
              disabled={showFeedback}
              onClick={() => setQuestionAnswer(optIdx)}
              className={`group w-full text-left p-4 md:p-5 border rounded-2xl transition-all duration-200 flex items-center gap-4 ${classes}`}
            >
              <span className={`w-9 h-9 shrink-0 rounded-full border flex items-center justify-center text-xs font-bold tracking-wide ${
                showFeedback && isTrulyCorrect ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' :
                showFeedback && chosen && !isTrulyCorrect ? 'border-rose-400 text-rose-500 bg-rose-500/10' :
                chosen ? 'border-accent text-accent bg-accent/10' :
                'border-line-soft text-text-dim group-hover:border-accent group-hover:text-accent'
              }`}>
                {letter}
              </span>
              <span className="text-[15px] md:text-base flex-1">{option}</span>
              {showFeedback && isTrulyCorrect && (
                <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {showFeedback && chosen && !isTrulyCorrect && (
                <svg className="w-5 h-5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {!showFeedback && selected !== null && selected !== undefined && (
        <button
          type="button"
          onClick={() => onSubmit(selected === correctIndex)}
          className="btn-primary w-full mt-6 py-3.5"
        >
          Submit Answer
        </button>
      )}

      {showFeedback && (
        <div className={`mt-8 p-5 rounded-2xl border ${
          isActuallyCorrect
            ? 'bg-emerald-500/[0.06] border-emerald-500/30'
            : 'bg-rose-500/[0.05] border-rose-400/30'
        }`}>
          <p className={`text-sm font-bold uppercase tracking-[0.2em] mb-2 ${
            isActuallyCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
          }`}>
            {isActuallyCorrect ? 'Correct' : 'Not quite'}
          </p>
          {slide.explanation && (
            <p className="text-[15px] leading-relaxed text-text-primary">{slide.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Main component
   ────────────────────────────────────────────────────────────────────────── */

const LessonPlayer = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [course, setCourse] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [progress, setProgress] = useState({ lessonProgress: [], courseProgress: null });
  const [questionAnswer, setQuestionAnswer] = useState(null);
  const [questionSubmitted, setQuestionSubmitted] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);

  const slideRef = useRef(null);

  /* ---------- Data loading ---------- */
  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        setLoading(true);
        setCurrentSlideIndex(0);
        setCompleted(false);
        const [courseData, lessonData] = await Promise.all([
          api.getCourse(courseId),
          api.getLesson(courseId, lessonId).catch(() => null),
        ]);
        const flatLessons = getFlatLessons(courseData);
        const currentFromList = flatLessons.find((l) => String(l.id) === String(lessonId)) || flatLessons[0];
        setCourse(courseData);
        setLesson(lessonData || currentFromList);
        const current = lessonData || currentFromList;
        if (current && isAuthenticated) {
          try {
            const prog = await api.getCourseProgress(courseId);
            setProgress(prog);
            const lp = prog?.lessonProgress?.find((p) => String(p.lessonId) === String(current.id));
            if (!lp || lp.status !== 'completed') {
              await api.updateLessonProgress(current.id, { status: 'in_progress' });
            } else {
              setCompleted(true);
            }
            const slides = parseSlides(current.slides);
            if (slides.length > 0 && lp && typeof lp.lastSlideIndex === 'number') {
              setCurrentSlideIndex(Math.min(lp.lastSlideIndex, slides.length - 1));
            }
          } catch (e) {
            console.warn('Progress update failed (non-blocking):', e?.message || e);
          }
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId, lessonId, isAuthenticated]);

  /* ---------- Derived ---------- */
  const slides = useMemo(() => parseSlides(lesson?.slides), [lesson]);
  const hasSlides = slides.length > 0;
  const flatLessons = useMemo(() => getFlatLessons(course), [course]);
  const idx = useMemo(
    () => (lesson ? flatLessons.findIndex((l) => l.id === lesson.id) : -1),
    [flatLessons, lesson],
  );
  const containingModule = useMemo(() => {
    if (!course?.modules || !lesson) return null;
    return course.modules.find((m) => (m.lessons || []).some((l) => String(l.id) === String(lesson.id))) || null;
  }, [course, lesson]);

  const lessonProgressRecord = progress?.lessonProgress?.find(
    (p) => String(p.lessonId) === String(lesson?.id),
  );
  const quizScores = lessonProgressRecord?.quizScores || {};

  const completedLessonIds = useMemo(() => {
    const set = new Set();
    (progress?.lessonProgress || []).forEach((p) => {
      if (p.status === 'completed') set.add(String(p.lessonId));
    });
    return set;
  }, [progress]);

  const slidePct = hasSlides ? Math.round(((currentSlideIndex + 1) / slides.length) * 100) : 0;
  const coursePct = Math.round(progress?.courseProgress?.progressPercentage || 0);

  /* ---------- Actions ---------- */
  const goToSlide = useCallback(
    (newIndex) => {
      if (!hasSlides) return;
      if (newIndex < 0 || newIndex >= slides.length) return;
      setCurrentSlideIndex(newIndex);
      setQuestionAnswer(null);
      setQuestionSubmitted(false);
      if (isAuthenticated && lesson?.id) {
        api.updateLessonProgress(lesson.id, { lastSlideIndex: newIndex }).catch(() => {});
      }
      if (slideRef.current) {
        slideRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [hasSlides, slides.length, isAuthenticated, lesson?.id],
  );

  const markComplete = useCallback(async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      setSaving(true);
      await api.updateLessonProgress(lesson.id, { status: 'completed' });
      try {
        await api.completeLessonAssignments(lesson.id);
      } catch (e) {
        console.warn('Class assignment auto-complete failed (non-blocking):', e?.message || e);
      }
      setCompleted(true);
      const flat = getFlatLessons(course);
      const idxNow = flat.findIndex((l) => l.id === lesson.id);
      if (idxNow < flat.length - 1) {
        navigate(`/courses/${course.id}/lessons/${flat[idxNow + 1].id}`);
      }
    } catch (e) {
      alert('Failed to save progress: ' + e.message);
    } finally {
      setSaving(false);
    }
  }, [isAuthenticated, lesson, course, navigate]);

  const recordQuestionAnswer = useCallback(
    async (slideIndex, isCorrect) => {
      const key = String(slideIndex);
      setQuestionSubmitted(true);
      if (isAuthenticated && lesson?.id) {
        await api
          .updateLessonProgress(lesson.id, { quizScores: { [key]: isCorrect }, lastSlideIndex: slideIndex })
          .catch(() => {});
      }
      setProgress((prev) => ({
        ...prev,
        lessonProgress: (prev.lessonProgress || []).map((p) =>
          String(p.lessonId) === String(lesson.id)
            ? { ...p, quizScores: { ...(p.quizScores || {}), [key]: isCorrect } }
            : p,
        ),
      }));
    },
    [isAuthenticated, lesson?.id],
  );

  /* ---------- Keyboard nav ---------- */
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'Escape' && outlineOpen) {
        setOutlineOpen(false);
        return;
      }
      if (!hasSlides || outlineOpen) return;
      if (e.key === 'ArrowRight') goToSlide(currentSlideIndex + 1);
      else if (e.key === 'ArrowLeft') goToSlide(currentSlideIndex - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasSlides, currentSlideIndex, goToSlide, outlineOpen]);

  /* ---------- Lock body scroll when outline is open ---------- */
  useEffect(() => {
    if (outlineOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [outlineOpen]);

  /* ---------- Loading & error states ---------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <CapletLoader message="Loading lesson…" />
      </div>
    );
  }

  if (error || !course || !lesson) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <p className="text-2xl font-bold mb-4">{error || 'Lesson not found'}</p>
          <p className="text-text-muted mb-8">
            The lesson you're looking for doesn't exist or may have been moved.
          </p>
          <Link to={`/courses/${courseId}`} className="btn-primary py-3 px-8">
            Back to Course
          </Link>
        </div>
      </div>
    );
  }

  const currentSlide = hasSlides ? slides[currentSlideIndex] : null;
  const isLastSlide = hasSlides && currentSlideIndex === slides.length - 1;
  const nextLesson = idx >= 0 && idx < flatLessons.length - 1 ? flatLessons[idx + 1] : null;
  const prevLesson = idx > 0 ? flatLessons[idx - 1] : null;

  /* ──────────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-surface-body text-text-primary flex flex-col">
      {/* ───────────────── Header (focus-mode) ───────────────── */}
      <header className="sticky top-0 z-40 bg-surface-body/85 backdrop-blur-xl border-b border-line-soft">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
          <div className="h-16 md:h-20 flex items-center justify-between gap-4">
            {/* Left — exit + breadcrumbs */}
            <div className="flex items-center gap-3 md:gap-5 min-w-0">
              <Link
                to={`/courses/${course.id}${containingModule ? `/modules/${containingModule.id}` : ''}`}
                className="shrink-0 w-10 h-10 rounded-full border border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim transition-all duration-200 flex items-center justify-center group"
                aria-label="Exit lesson"
              >
                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>

              <div className="hidden md:block min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-text-dim mb-0.5">
                  <Link to={`/courses/${course.id}`} className="hover:text-accent transition-colors truncate">
                    {course.title}
                  </Link>
                  {containingModule && (
                    <>
                      <span className="text-text-dim/50">/</span>
                      <Link
                        to={`/courses/${course.id}/modules/${containingModule.id}`}
                        className="hover:text-accent transition-colors truncate"
                      >
                        {containingModule.title}
                      </Link>
                    </>
                  )}
                </div>
                <p className="text-sm font-serif italic text-text-primary truncate max-w-md">
                  {lesson.title}
                </p>
              </div>

              <div className="md:hidden min-w-0">
                <p className="text-sm font-serif italic text-text-primary truncate max-w-[200px]">
                  {lesson.title}
                </p>
              </div>
            </div>

            {/* Right — meta + outline trigger */}
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-text-dim">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
                Lesson {idx + 1} <span className="opacity-50">/</span> {flatLessons.length}
              </div>

              {completed && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Completed
                </span>
              )}

              <button
                type="button"
                onClick={() => setOutlineOpen(true)}
                className="inline-flex items-center gap-2 h-10 px-3 md:px-4 rounded-full border border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim transition-colors"
                aria-label="Open course outline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" />
                </svg>
                <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.2em]">Outline</span>
              </button>
            </div>
          </div>

          {/* Ticker */}
          {hasSlides && (
            <div className="pb-3">
              <SlideTicker
                slides={slides}
                currentIndex={currentSlideIndex}
                quizScores={quizScores}
                onJump={goToSlide}
              />
            </div>
          )}
        </div>
      </header>

      {/* ───────────────── Main canvas ───────────────── */}
      <main className="flex-1 relative">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 py-8 md:py-12">
          {hasSlides ? (
            <article className="relative">
              {/* Slide kicker */}
              <div className="mb-5 md:mb-7 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim">
                <span className="font-mono text-accent">
                  {String(currentSlideIndex + 1).padStart(2, '0')}
                  <span className="opacity-50"> / </span>
                  {String(slides.length).padStart(2, '0')}
                </span>
                <span className="w-6 h-px bg-line-soft" />
                <span>{slideKindLabel(currentSlide?.type)}</span>
                <span className="w-6 h-px bg-line-soft" />
                <span className="text-text-dim/60">{slidePct}% through</span>
              </div>

              {/* Slide canvas */}
              <div
                ref={slideRef}
                key={currentSlideIndex}
                className="animate-lesson-slide-in relative bg-surface-raised border border-line-soft rounded-[28px] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.12)] dark:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] overflow-hidden"
              >
                {/* Decorative top notch */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
                <div className="absolute inset-x-0 top-0 flex justify-center pointer-events-none">
                  <div className="w-32 h-px bg-accent" />
                </div>

                <div className="p-6 md:p-12 lg:p-16 min-h-[400px] md:min-h-[520px]">
                  {currentSlide?.type === 'text' && (
                    <div className="max-w-3xl mx-auto">
                      <div className="prose-lesson">
                        <ReactMarkdown>{currentSlide.content || ''}</ReactMarkdown>
                      </div>
                      {currentSlide.caption && (
                        <p className="mt-10 pt-6 border-t border-line-soft text-sm text-text-muted italic font-serif">
                          {currentSlide.caption}
                        </p>
                      )}
                    </div>
                  )}

                  {currentSlide?.type === 'image' && currentSlide.content && (
                    <figure className="max-w-4xl mx-auto h-full flex flex-col justify-center gap-6">
                      <div className="rounded-2xl overflow-hidden bg-surface-soft border border-line-soft">
                        <img
                          src={api.getProxiedImageSrc(currentSlide.content)}
                          alt={currentSlide.caption || ''}
                          className="w-full h-auto"
                        />
                      </div>
                      {currentSlide.caption && (
                        <figcaption className="text-center text-sm font-serif italic text-text-muted">
                          {currentSlide.caption}
                        </figcaption>
                      )}
                    </figure>
                  )}

                  {currentSlide?.type === 'video' && currentSlide.content && (
                    <figure className="max-w-4xl mx-auto h-full flex flex-col justify-center gap-6">
                      <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-line-soft shadow-lg">
                        <iframe
                          src={`https://www.youtube.com/embed/${getYouTubeId(currentSlide.content)}`}
                          className="w-full h-full"
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          title={currentSlide.caption || 'Video'}
                        />
                      </div>
                      {currentSlide.caption && (
                        <figcaption className="text-center text-sm font-serif italic text-text-muted">
                          {currentSlide.caption}
                        </figcaption>
                      )}
                    </figure>
                  )}

                  {currentSlide?.type === 'question' && (
                    <QuestionSlide
                      slide={currentSlide}
                      currentSlideIndex={currentSlideIndex}
                      quizScores={quizScores}
                      questionAnswer={questionAnswer}
                      setQuestionAnswer={setQuestionAnswer}
                      questionSubmitted={questionSubmitted}
                      onSubmit={(isCorrect) => recordQuestionAnswer(currentSlideIndex, isCorrect)}
                    />
                  )}
                </div>
              </div>

              {/* Footer controls */}
              <div className="mt-6 md:mt-8 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => goToSlide(currentSlideIndex - 1)}
                  disabled={currentSlideIndex <= 0}
                  className="group inline-flex items-center gap-3 h-12 px-4 md:px-5 rounded-full border border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <svg className="w-4 h-4 transition-transform group-enabled:group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] hidden sm:inline">Previous</span>
                </button>

                <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-text-dim">
                  <kbd className="px-2 py-1 rounded border border-line-soft text-text-dim/80 font-mono text-[10px]">←</kbd>
                  <kbd className="px-2 py-1 rounded border border-line-soft text-text-dim/80 font-mono text-[10px]">→</kbd>
                  <span className="ml-1">to navigate</span>
                </div>

                {isLastSlide ? (
                  <button
                    type="button"
                    onClick={markComplete}
                    disabled={saving || completed}
                    className="btn-primary h-12 px-6 md:px-8 rounded-full"
                  >
                    {completed
                      ? nextLesson
                        ? 'Next Lesson →'
                        : 'Lesson Completed'
                      : saving
                        ? 'Saving…'
                        : nextLesson
                          ? 'Complete & Continue'
                          : 'Complete Lesson'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => goToSlide(currentSlideIndex + 1)}
                    className="group inline-flex items-center gap-3 h-12 px-5 md:px-6 rounded-full bg-text-primary text-surface-body hover:opacity-90 active:opacity-100 transition-opacity"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Next</span>
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Inter-lesson nav strip */}
              <div className="mt-12 md:mt-16 pt-8 border-t border-line-soft grid grid-cols-1 md:grid-cols-2 gap-4">
                {prevLesson ? (
                  <Link
                    to={`/courses/${course.id}/lessons/${prevLesson.id}`}
                    className="group p-5 md:p-6 rounded-2xl border border-line-soft hover:border-accent/40 hover:bg-surface-raised transition-all"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-2 flex items-center gap-2">
                      <span>← Previous Lesson</span>
                    </p>
                    <p className="text-base font-serif italic text-text-primary group-hover:text-accent transition-colors line-clamp-1">
                      {prevLesson.title}
                    </p>
                  </Link>
                ) : <div className="hidden md:block" />}

                {nextLesson ? (
                  <Link
                    to={`/courses/${course.id}/lessons/${nextLesson.id}`}
                    className="group p-5 md:p-6 rounded-2xl border border-line-soft hover:border-accent/40 hover:bg-surface-raised transition-all md:text-right"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-2 flex items-center md:justify-end gap-2">
                      <span>Next Lesson →</span>
                    </p>
                    <p className="text-base font-serif italic text-text-primary group-hover:text-accent transition-colors line-clamp-1">
                      {nextLesson.title}
                    </p>
                  </Link>
                ) : <div className="hidden md:block" />}
              </div>
            </article>
          ) : (
            <article className="max-w-3xl mx-auto">
              <header className="mb-12">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent mb-4">Lesson</p>
                <h1 className="text-4xl md:text-5xl font-display font-bold leading-[1.05] mb-6">{lesson.title}</h1>
                {lesson.description && (
                  <p className="text-xl text-text-muted leading-relaxed font-serif italic max-w-2xl">
                    {lesson.description}
                  </p>
                )}
              </header>

              <div className="prose-lesson">
                <ReactMarkdown>{lesson.content || 'No content available yet.'}</ReactMarkdown>
              </div>

              <div className="mt-16 pt-8 border-t border-line-soft flex justify-end">
                <button
                  type="button"
                  onClick={markComplete}
                  disabled={saving || completed}
                  className="btn-primary h-12 px-8 rounded-full"
                >
                  {completed ? 'Lesson Completed' : saving ? 'Saving…' : 'Mark as Complete'}
                </button>
              </div>
            </article>
          )}
        </div>

        {/* ───────────────── Floating progress badge (course-level) ───────────────── */}
        <div className="hidden lg:block fixed bottom-6 left-6 z-30 pointer-events-none">
          <div className="pointer-events-auto bg-surface-raised/90 backdrop-blur-md border border-line-soft rounded-2xl shadow-lg p-4 w-56">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-3">Course Progress</p>
            <div className="flex items-end justify-between mb-2">
              <span className="text-3xl font-serif italic text-text-primary leading-none">{coursePct}%</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim">complete</span>
            </div>
            <div className="h-1 bg-line-soft rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-700 ease-out"
                style={{ width: `${coursePct}%` }}
              />
            </div>
          </div>
        </div>
      </main>

      {/* ───────────────── Outline drawer ───────────────── */}
      {outlineOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close outline overlay"
            onClick={() => setOutlineOpen(false)}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-slide-up"
          />
          <aside
            className="absolute top-0 right-0 h-full w-full sm:w-[420px] bg-surface-raised border-l border-line-soft shadow-2xl animate-card-in"
          >
            <OutlinePanel
              course={course}
              lesson={lesson}
              completedLessonIds={completedLessonIds}
              onClose={() => setOutlineOpen(false)}
            />
          </aside>
        </div>
      )}
    </div>
  );
};

export default LessonPlayer;
