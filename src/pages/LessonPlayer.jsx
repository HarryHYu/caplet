import { Component, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import SlideRenderer from '../components/lesson/SlideRenderer';
import DesmosCalculator from '../components/lesson/DesmosCalculator';
import { normalizeSlide, INTERACTIVE_TYPES, slideKindLabel } from '../lib/slideSchema';

/* ──────────────────────────────────────────────────────────────────────────
   SlideErrorBoundary — catches render/effect errors inside a single slide
   so that a crash in one slide never breaks the navigation or other slides.
   ────────────────────────────────────────────────────────────────────────── */
class SlideErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err) { return { error: err }; }
  componentDidCatch(err) { console.error('SlideErrorBoundary caught:', err); }
  render() {
    if (this.state.error) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-text-muted text-sm">This slide encountered an error.</p>
          <button
            type="button"
            className="px-4 py-2 rounded-full border border-line-soft text-sm text-text-muted hover:text-text-primary transition-colors"
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────────────────────── */

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

/* ──────────────────────────────────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────────────────────────────────── */

function SlideTicker({ slides, currentIndex, quizScores, visited, onJump }) {
  return (
    <div className="flex items-center gap-1.5 w-full">
      {slides.map((s, i) => {
        const normalized = normalizeSlide(s);
        const isInteractive = normalized && INTERACTIVE_TYPES.has(normalized.type);
        const answered = quizScores[String(i)];
        const isCurrent = i === currentIndex;
        const wasVisited = i < currentIndex || visited.has(i);
        let bar = 'bg-line-soft';
        if (wasVisited) bar = 'bg-accent';
        if (isCurrent) bar = 'bg-accent';
        if (isInteractive && answered === true) bar = 'bg-emerald-500';
        if (isInteractive && answered === false) bar = 'bg-rose-400';
        return (
          <button
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => onJump(i)}
            className="group relative flex-1 py-2"
          >
            <span
              className={`block rounded-full transition-all duration-300 ${bar} ${
                isCurrent ? 'h-[5px]' : 'h-[3px] group-hover:h-[4px]'
              }`}
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
                            active ? 'text-accent font-semibold' : 'text-text-muted hover:text-text-primary'
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

/* ──────────────────────────────────────────────────────────────────────────
   Main component
   ────────────────────────────────────────────────────────────────────────── */

const LessonPlayer = () => {
  const { courseId, lessonId } = useParams();
  const [searchParams] = useSearchParams();
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
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [visited, setVisited] = useState(() => new Set([0]));
  // Floating Desmos calculator panel
  const [calcOpen, setCalcOpen] = useState(false);
  // Only mount the Desmos panel after the user has opened it at least once.
  // This prevents a 2nd Desmos instance from existing before the user needs it,
  // which was causing the slide's Desmos to flicker/crash and intercepting arrow keys.
  const [calcEverOpened, setCalcEverOpened] = useState(false);
  const [calcMode, setCalcMode] = useState('graphing'); // 'graphing' | 'scientific'
  const [calcPos, setCalcPos] = useState(null); // null = default CSS anchor (bottom-right)
  const calcPanelRef = useRef(null);
  // savedSlides: Map of slideIndex -> savedSlideId for the current lesson
  const [savedSlides, setSavedSlides] = useState(new Map());
  const [savingSlide, setSavingSlide] = useState(false);
  const autoCategorizeTimer = useRef(null);


  /* ---------- Data loading ---------- */
  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        setLoading(true);
        setCurrentSlideIndex(0);
        setCompleted(false);
        setVisited(new Set([0]));
        setSavedSlides(new Map());
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
            const savedData = await api.getSavedSlides().catch(() => null);
            if (savedData?.savedSlides) {
              const map = new Map();
              savedData.savedSlides
                .filter((s) => String(s.lessonId) === String(current.id))
                .forEach((s) => map.set(s.slideIndex, s.id));
              setSavedSlides(map);
            }
          } catch { /* non-blocking */ }
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
            const jumpTo = searchParams.get('slide');
            const startIdx = jumpTo !== null
              ? Math.min(Math.max(0, Number(jumpTo)), slides.length - 1)
              : (slides.length > 0 && lp && typeof lp.lastSlideIndex === 'number')
                ? Math.min(lp.lastSlideIndex, slides.length - 1)
                : 0;
            if (startIdx > 0) {
              setCurrentSlideIndex(startIdx);
              const seen = new Set();
              for (let i = 0; i <= startIdx; i++) seen.add(i);
              setVisited(seen);
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

  const coursePct = Math.round(progress?.courseProgress?.progressPercentage || 0);

  /* ---------- Actions ---------- */
  const goToSlide = useCallback(
    (newIndex) => {
      if (!hasSlides) return;
      if (newIndex < 0 || newIndex >= slides.length) return;
      setCurrentSlideIndex(newIndex);
      setVisited((prev) => {
        if (prev.has(newIndex)) return prev;
        const next = new Set(prev);
        next.add(newIndex);
        return next;
      });
      if (isAuthenticated && lesson?.id) {
        api.updateLessonProgress(lesson.id, { lastSlideIndex: newIndex }).catch(() => {});
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

  const toggleSaveSlide = useCallback(async () => {
    if (!isAuthenticated || !lesson?.id || !course?.id) return;
    setSavingSlide(true);
    try {
      const idx = currentSlideIndex;
      if (savedSlides.has(idx)) {
        await api.unsaveSlide(savedSlides.get(idx));
        setSavedSlides((prev) => { const next = new Map(prev); next.delete(idx); return next; });
      } else {
        const res = await api.saveSlide(lesson.id, course.id, idx);
        if (res?.savedSlide) {
          setSavedSlides((prev) => new Map(prev).set(idx, res.savedSlide.id));
          // Auto-organize into revision categories (debounced, best-effort).
          if (autoCategorizeTimer.current) clearTimeout(autoCategorizeTimer.current);
          autoCategorizeTimer.current = setTimeout(() => {
            api.categorizeSavedSlides().catch(() => {});
          }, 2000);
        }
      }
    } catch (e) {
      console.warn('Toggle save slide failed:', e?.message || e);
    } finally {
      setSavingSlide(false);
    }
  }, [isAuthenticated, lesson?.id, course?.id, currentSlideIndex, savedSlides]);

  const recordQuestionAnswer = useCallback(
    async (slideIndex, isCorrect) => {
      const key = String(slideIndex);
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
      // Don't intercept arrow keys when focus is inside a Desmos calculator — Desmos
      // uses them to pan the graph / move the expression cursor.
      if (e.target && e.target.closest?.('.dcg-calculator-api-container, .dcg-graphpaper')) return;
      if (e.key === 'Escape' && outlineOpen) {
        setOutlineOpen(false);
        return;
      }
      if (!hasSlides || outlineOpen) return;
      if (e.key === 'ArrowRight') goToSlide(currentSlideIndex + 1);
      else if (e.key === 'ArrowLeft') goToSlide(currentSlideIndex - 1);
    };
    // Use capture phase so this runs before Desmos's own bubble-phase listeners.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [hasSlides, currentSlideIndex, goToSlide, outlineOpen]);

  /* ---------- Lock body scroll when outline open ---------- */
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
      <div className="min-h-[100dvh] pt-14 md:pt-16 bg-surface-body flex items-center justify-center">
        <CapletLoader message="Loading lesson…" />
      </div>
    );
  }

  if (error || !course || !lesson) {
    return (
      <div className="min-h-[100dvh] pt-14 md:pt-16 bg-surface-body flex items-center justify-center">
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

  const isLastSlide = hasSlides && currentSlideIndex === slides.length - 1;
  const nextLesson = idx >= 0 && idx < flatLessons.length - 1 ? flatLessons[idx + 1] : null;

  /* ──────────────────────────────────────────────────────────────────────── */
  return (
    // The whole lesson view is locked to viewport height — no outer page scroll.
    // The global Navbar (h-14/h-16) sits above; we offset for it with pt-14/md:pt-16.
    <div className="h-[100dvh] pt-14 md:pt-16 bg-surface-body text-text-primary flex flex-col overflow-hidden">
      {/* ─────── Lesson sub-header (sits below the global navbar) ─────── */}
      <header className="shrink-0 bg-surface-body/95 backdrop-blur-md border-b border-line-soft">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
          <div className="h-14 md:h-16 flex items-center justify-between gap-4">
            {/* Left — exit + breadcrumbs */}
            <div className="flex items-center gap-3 md:gap-5 min-w-0">
              <Link
                to={`/courses/${course.id}${containingModule ? `/modules/${containingModule.id}` : ''}`}
                className="shrink-0 w-9 h-9 rounded-full border border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim transition-all duration-200 flex items-center justify-center group"
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
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <div className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-text-dim">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
                Lesson {idx + 1} <span className="opacity-50">/</span> {flatLessons.length}
              </div>

              <div className="hidden lg:flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-text-dim">
                <span className="opacity-50">·</span>
                Course {coursePct}%
              </div>

              {completed && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Completed
                </span>
              )}

              {/* Calculator toggle */}
              <button
                type="button"
                onClick={() => {
                  if (!calcOpen) setCalcEverOpened(true);
                  setCalcOpen((v) => !v);
                }}
                className={`inline-flex items-center gap-2 h-9 px-3 md:px-4 rounded-full border transition-colors ${
                  calcOpen
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim'
                }`}
                aria-label="Toggle calculator"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 7h6M9 11h2m4 0h-2m-2 4h2M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                </svg>
                <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.2em]">Calc</span>
              </button>

              <button
                type="button"
                onClick={() => setOutlineOpen(true)}
                className="inline-flex items-center gap-2 h-9 px-3 md:px-4 rounded-full border border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim transition-colors"
                aria-label="Open course outline"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" />
                </svg>
                <span className="hidden md:inline text-[11px] font-bold uppercase tracking-[0.2em]">Outline</span>
              </button>
            </div>
          </div>

          {/* Ticker — visited slides are solid blue */}
          {hasSlides && (
            <div className="pb-2.5">
              <SlideTicker
                slides={slides}
                currentIndex={currentSlideIndex}
                quizScores={quizScores}
                visited={visited}
                onJump={goToSlide}
              />
            </div>
          )}
        </div>
      </header>

      {/* ─────── Main canvas (flex-1, internal scroll only) ─────── */}
      <main className="flex-1 min-h-0 flex flex-col">
        {hasSlides ? (
          <div className="flex-1 min-h-0 max-w-[1400px] w-full mx-auto px-4 md:px-8 lg:px-12 py-5 md:py-7 flex flex-col gap-4 md:gap-5">
            {/* Slide kicker */}
            <div className="shrink-0 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim">
              <div className="flex items-center gap-3">
                <span className="font-mono text-accent">
                  {String(currentSlideIndex + 1).padStart(2, '0')}
                  <span className="opacity-50"> / </span>
                  {String(slides.length).padStart(2, '0')}
                </span>
                <span className="w-6 h-px bg-line-soft" />
                <span>{slideKindLabel(normalizeSlide(slides[currentSlideIndex]))}</span>
                <span className="w-6 h-px bg-line-soft hidden sm:block" />
                <span className="text-text-dim/60 hidden sm:inline">
                  {Math.round(((currentSlideIndex + 1) / slides.length) * 100)}% through
                </span>
              </div>
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={toggleSaveSlide}
                  disabled={savingSlide}
                  aria-label={savedSlides.has(currentSlideIndex) ? 'Remove saved slide' : 'Save slide'}
                  className={`shrink-0 flex items-center gap-1.5 h-7 px-3 rounded-full border transition-colors text-[10px] font-bold uppercase tracking-[0.2em] ${
                    savedSlides.has(currentSlideIndex)
                      ? 'border-accent text-accent bg-accent/10 hover:bg-accent/20'
                      : 'border-line-soft text-text-muted hover:border-text-dim hover:text-text-primary'
                  } disabled:opacity-50`}
                >
                  <svg className="w-3 h-3" fill={savedSlides.has(currentSlideIndex) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <span className="hidden sm:inline">{savedSlides.has(currentSlideIndex) ? 'Saved' : 'Save'}</span>
                </button>
              )}
            </div>

            {/* Slide canvas — fills the remaining space, scrolls internally */}
            {/* Slide canvas — pre-renders current + next 2 slides so navigation
                is instant. Hidden slides are positioned off-screen (not display:none)
                so images/diagrams/iframes fully load before the user arrives. */}
            <div className="flex-1 min-h-0 relative bg-surface-raised border border-line-soft rounded-[28px] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.12)] dark:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] overflow-hidden">
              {/* Decorative top notch */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent pointer-events-none z-10" />
              <div className="absolute inset-x-0 top-0 flex justify-center pointer-events-none z-10">
                <div className="w-32 h-px bg-accent" />
              </div>

              {/* Pre-render window: offsets -1, 0, +1, +2 relative to current.
                  The outer div uses a stable key={i} so DesmosCalculator /
                  DiagramSlide are never unmounted on navigation — they initialise
                  once (while hidden) and simply become visible when active.
                  The slide-in animation is driven by toggling the class on the
                  inner wrapper; CSS re-fires the animation each time the class
                  is (re-)added to an existing element. */}
              {[-1, 0, 1, 2].map((offset) => {
                const i = currentSlideIndex + offset;
                if (i < 0 || i >= slides.length) return null;
                const isActive = offset === 0;
                return (
                  <div
                    key={i}
                    className={isActive ? 'absolute inset-0 overflow-y-auto' : 'absolute inset-0 overflow-hidden pointer-events-none'}
                    style={isActive ? {} : { transform: 'translateX(100vw)', opacity: 0 }}
                    aria-hidden={!isActive}
                  >
                    {/* No key change here — SlideRenderer (and all its children)
                        stays mounted. Animation class is toggled to re-fire. */}
                    <div className={`${isActive ? 'animate-lesson-slide-in' : ''} min-h-full p-5 md:p-8 lg:p-12 flex flex-col`}>
                      <SlideErrorBoundary key={i}>
                        <SlideRenderer
                          slide={slides[i]}
                          alreadyAnswered={quizScores[String(i)] !== undefined}
                          alreadyCorrect={quizScores[String(i)] === true}
                          onSubmit={(isCorrect) => recordQuestionAnswer(i, isCorrect)}
                        />
                      </SlideErrorBoundary>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer controls */}
            <div className="shrink-0 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => goToSlide(currentSlideIndex - 1)}
                disabled={currentSlideIndex <= 0}
                className="group inline-flex items-center gap-3 h-11 md:h-12 px-4 md:px-5 rounded-full border border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
                  className="btn-primary h-11 md:h-12 px-6 md:px-8 rounded-full"
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
                  className="group inline-flex items-center gap-3 h-11 md:h-12 px-5 md:px-6 rounded-full bg-text-primary text-surface-body hover:opacity-90 active:opacity-100 transition-opacity"
                >
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Next</span>
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* No-slides fallback: legacy markdown content, scrollable */
          <div className="flex-1 min-h-0 overflow-y-auto">
            <article className="max-w-3xl mx-auto px-6 md:px-12 py-12">
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
          </div>
        )}
      </main>

      {/* ─────── Floating Desmos calculator panel ─────────────────────────────
          Lazy-mounted: only rendered after the user opens it the first time.
          This prevents a second Desmos instance from loading alongside a Desmos
          slide, which was causing the slide graph to flicker and arrow keys to
          stop working (Desmos global keyboard listeners were intercepting them).
          Once opened it stays mounted so state is never lost.
          Slides completely off the right edge of the screen when closed using
          translateX(calc(100vw + 100%)) — adapts to any screen size and dragged
          position so it always fully disappears.
          ───────────────────────────────────────────────────────────────────── */}
      {calcEverOpened && (
      <div
        ref={calcPanelRef}
        className="fixed z-40 flex flex-col transition-transform duration-300 ease-in-out"
        style={{
          width: 'min(480px, 100vw)',
          height: 'min(560px, calc(100dvh - 7rem))',
          ...(calcPos
            ? { left: calcPos.x, top: calcPos.y, bottom: 'auto', right: 'auto' }
            : { bottom: 0, right: 0 }),
          transform: calcOpen ? 'translateX(0)' : 'translateX(calc(100vw + 100%))',
          pointerEvents: calcOpen ? 'auto' : 'none',
        }}
      >
        {/* Header — drag handle + mode toggle + close */}
        <div
          className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 bg-surface-raised border border-b-0 border-line-soft rounded-t-2xl shadow-2xl select-none cursor-grab active:cursor-grabbing"
          onMouseDown={(e) => {
            if (e.target.closest('button')) return;
            e.preventDefault();
            const el = calcPanelRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const startMouseX = e.clientX;
            const startMouseY = e.clientY;
            const startLeft = rect.left;
            const startTop = rect.top;
            const panelW = rect.width;
            const panelH = rect.height;

            // Disable CSS transition during drag so it doesn't fight direct style updates.
            el.style.transition = 'none';
            // Switch to absolute left/top positioning immediately.
            el.style.right = 'auto';
            el.style.bottom = 'auto';
            el.style.left = startLeft + 'px';
            el.style.top = startTop + 'px';

            const onMove = (ev) => {
              const nx = Math.max(0, Math.min(window.innerWidth - panelW, startLeft + ev.clientX - startMouseX));
              const ny = Math.max(0, Math.min(window.innerHeight - panelH, startTop + ev.clientY - startMouseY));
              // Direct DOM update — zero React re-renders during drag.
              el.style.left = nx + 'px';
              el.style.top = ny + 'px';
            };

            const onUp = () => {
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mouseup', onUp);
              // Restore transition, sync final position to React state.
              el.style.transition = '';
              const final = el.getBoundingClientRect();
              setCalcPos({ x: final.left, y: final.top });
            };

            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          }}
        >
          <div className="flex items-center gap-2">
            {/* Drag grip indicator */}
            <svg className="w-3.5 h-3.5 text-text-dim/50 shrink-0" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="5" cy="4" r="1.2"/><circle cx="11" cy="4" r="1.2"/>
              <circle cx="5" cy="8" r="1.2"/><circle cx="11" cy="8" r="1.2"/>
              <circle cx="5" cy="12" r="1.2"/><circle cx="11" cy="12" r="1.2"/>
            </svg>
            {/* Mode toggle */}
            <div className="flex items-center gap-1 bg-surface-soft rounded-full p-0.5">
              {['graphing', 'scientific'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setCalcMode(m)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] transition-all ${
                    calcMode === m
                      ? 'bg-surface-raised shadow-sm text-text-primary'
                      : 'text-text-dim hover:text-text-primary'
                  }`}
                >
                  {m === 'graphing' ? 'Graphing' : 'Scientific'}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCalcOpen(false)}
            className="w-7 h-7 rounded-full border border-line-soft text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
            aria-label="Close calculator"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Calculator itself */}
        <div className="flex-1 min-h-0 border border-t-0 border-line-soft rounded-b-2xl overflow-hidden shadow-2xl">
          <DesmosCalculator mode={calcMode} className="h-full bg-white" />
        </div>
      </div>
      )}

      {/* ─────── Outline drawer ─────── */}
      {outlineOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close outline overlay"
            onClick={() => setOutlineOpen(false)}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-slide-up"
          />
          <aside className="absolute top-0 right-0 h-full w-full sm:w-[420px] bg-surface-raised border-l border-line-soft shadow-2xl animate-card-in">
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
