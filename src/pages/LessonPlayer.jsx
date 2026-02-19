import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';

function getYouTubeId(url) {
  if (!url) return '';
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
  return match ? match[1] : url;
}

// Build flat ordered list of lessons from course.modules (course → modules → lessons)
function getFlatLessons(course) {
  if (!course?.modules) return [];
  return (course.modules || [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .flatMap((m) => (m.lessons || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
}

const LessonPlayer = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [progress, setProgress] = useState({ lessonProgress: [] });
  const [questionAnswer, setQuestionAnswer] = useState(null);
  const [questionSubmitted, setQuestionSubmitted] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        setLoading(true);
        setCurrentSlideIndex(0);
        const [courseData, lessonData] = await Promise.all([
          api.getCourse(courseId),
          api.getLesson(courseId, lessonId).catch(() => null)
        ]);
        const flatLessons = getFlatLessons(courseData);
        const currentFromList = flatLessons.find((l) => String(l.id) === String(lessonId)) || flatLessons[0];
        setCourse(courseData);
        setLesson(lessonData || currentFromList);
        const current = lessonData || currentFromList;
        if (current) {
          try {
            const prog = await api.getCourseProgress(courseId);
            setProgress(prog);
            const lp = prog?.lessonProgress?.find((p) => String(p.lessonId) === String(current.id));
            if (!lp || lp.status !== 'completed') {
              await api.updateLessonProgress(current.id, { status: 'in_progress' });
            } else {
              setCompleted(true);
            }
            const slides = Array.isArray(current.slides) ? current.slides : [];
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
  }, [courseId, lessonId]);

  const goToSlide = (newIndex) => {
    const slides = Array.isArray(lesson.slides) ? lesson.slides : [];
    if (newIndex < 0 || newIndex >= slides.length) return;
    setCurrentSlideIndex(newIndex);
    setQuestionAnswer(null);
    setQuestionSubmitted(false);
    api.updateLessonProgress(lesson.id, { lastSlideIndex: newIndex }).catch(() => { });
  };

  const markComplete = async () => {
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
      const idxNow = flat.findIndex(l => l.id === lesson.id);
      if (idxNow < flat.length - 1) {
        navigate(`/courses/${course.id}/lessons/${flat[idxNow + 1].id}`);
      }
    } catch (e) {
      alert('Failed to save progress: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !course || !lesson) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <p className="text-2xl font-bold mb-4">{error || 'Lesson not found'}</p>
          <p className="text-text-muted mb-8">The lesson you're looking for doesn't exist or may have been moved.</p>
          <Link to={`/courses/${courseId}`} className="btn-primary py-3 px-8">
            Back to Course
          </Link>
        </div>
      </div>
    );
  }

  const slidesRaw = lesson.slides;
  const slides = (() => {
    if (Array.isArray(slidesRaw)) return slidesRaw;
    if (typeof slidesRaw === 'string' && slidesRaw.trim()) {
      try { return JSON.parse(slidesRaw); } catch { return []; }
    }
    return [];
  })();
  const hasSlides = slides.length > 0;

  const flatLessons = getFlatLessons(course);
  const idx = flatLessons.findIndex(l => l.id === lesson.id);
  const lessonProgressRecord = progress?.lessonProgress?.find((p) => String(p.lessonId) === String(lesson?.id));
  const quizScores = lessonProgressRecord?.quizScores || {};

  const recordQuestionAnswer = async (slideIndex, isCorrect) => {
    const key = String(slideIndex);
    setQuestionSubmitted(true);
    await api.updateLessonProgress(lesson.id, { quizScores: { [key]: isCorrect }, lastSlideIndex: slideIndex }).catch(() => { });
    setProgress(prev => ({
      ...prev,
      lessonProgress: (prev.lessonProgress || []).map(p =>
        String(p.lessonId) === String(lesson.id)
          ? { ...p, quizScores: { ...(p.quizScores || {}), [key]: isCorrect } }
          : p
      )
    }));
  };

  return (
    <div className="min-h-screen bg-surface-body py-12 md:py-20">
      <div className="container-custom">
        {/* Top nav */}
        <div className="mb-10 flex items-center justify-between">
          <Link to={`/courses/${course.id}`} className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent transition-colors">
            <span>&larr;</span>
            <span>Back to Course</span>
          </Link>
          <div className="text-sm text-text-muted">
            Lesson {idx + 1} of {flatLessons.length}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <main className="lg:col-span-8">
            {/* Lesson header */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                {lesson.title}
              </h1>
              {lesson.description && (
                <p className="text-lg text-text-muted leading-relaxed max-w-2xl">
                  {lesson.description}
                </p>
              )}
            </div>

            {hasSlides ? (
              <>
                {/* Progress bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between text-sm text-text-muted mb-2">
                    <span>Progress</span>
                    <span>{Math.round(((currentSlideIndex + 1) / slides.length) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-surface-soft rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${((currentSlideIndex + 1) / slides.length) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Slide viewer */}
                <div className="bg-surface-raised border border-line-soft rounded-xl min-h-[450px] flex flex-col p-8 md:p-12 mb-6">
                  <div key={currentSlideIndex} className="flex-1">
                    {(() => {
                      const slide = slides[currentSlideIndex];
                      if (!slide) return null;

                      if (slide.type === 'question') {
                        const options = Array.isArray(slide.options) ? slide.options : [];
                        const correctIndex = typeof slide.correctIndex === 'number' ? slide.correctIndex : 0;
                        const alreadyAnswered = quizScores[String(currentSlideIndex)] !== undefined;
                        const selected = questionAnswer ?? (alreadyAnswered ? undefined : null);
                        const showFeedback = questionSubmitted || alreadyAnswered;
                        const isActuallyCorrect = alreadyAnswered ? quizScores[String(currentSlideIndex)] : (selected === correctIndex);

                        return (
                          <div className="max-w-xl mx-auto py-4">
                            <div className="flex items-center gap-2 mb-6">
                              <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                                <span className="text-accent text-sm font-bold">Q</span>
                              </div>
                              <span className="text-sm font-medium text-accent">Question</span>
                            </div>
                            <h3 className="text-xl font-semibold text-text-primary mb-6 leading-relaxed">{slide.question}</h3>
                            <div className="space-y-3">
                              {options.map((option, optIdx) => {
                                const chosen = selected === optIdx;
                                const isTrulyCorrect = correctIndex === optIdx;
                                return (
                                  <button
                                    key={optIdx}
                                    disabled={showFeedback}
                                    onClick={() => setQuestionAnswer(optIdx)}
                                    className={`w-full text-left p-4 border rounded-lg transition-colors duration-200 text-sm flex justify-between items-center ${showFeedback
                                      ? isTrulyCorrect
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                                        : chosen ? 'border-red-300 bg-red-50 dark:bg-red-900/20 opacity-75' : 'border-line-soft opacity-50'
                                      : chosen
                                        ? 'border-accent bg-accent/5'
                                        : 'border-line-soft hover:border-accent/50 hover:bg-surface-soft'
                                      }`}
                                  >
                                    <span>{option}</span>
                                    {showFeedback && isTrulyCorrect && <span className="text-green-600 dark:text-green-400 text-xs font-semibold">Correct</span>}
                                    {showFeedback && chosen && !isTrulyCorrect && <span className="text-red-500 text-xs font-semibold">Incorrect</span>}
                                  </button>
                                );
                              })}
                            </div>
                            {!showFeedback && selected !== null && (
                              <button
                                onClick={() => recordQuestionAnswer(currentSlideIndex, selected === correctIndex)}
                                className="btn-primary w-full mt-6 py-3"
                              >
                                Submit Answer
                              </button>
                            )}
                            {showFeedback && (
                              <div className={`mt-6 p-4 rounded-lg border-l-4 ${isActuallyCorrect
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-400'
                                }`}>
                                <p className={`text-sm font-semibold mb-1 ${isActuallyCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}>
                                  {isActuallyCorrect ? 'Correct!' : 'Not quite right'}
                                </p>
                                {slide.explanation && (
                                  <p className="text-sm text-text-muted leading-relaxed">{slide.explanation}</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }

                      if (slide.type === 'text') {
                        return (
                          <article className="prose-editorial">
                            <ReactMarkdown>{slide.content || ''}</ReactMarkdown>
                            {slide.caption && <p className="mt-6 pt-4 border-t border-line-soft text-sm text-text-muted">{slide.caption}</p>}
                          </article>
                        );
                      }

                      if (slide.type === 'image' && slide.content) {
                        return (
                          <div className="h-full flex flex-col justify-center gap-4">
                            <div className="rounded-lg overflow-hidden border border-line-soft">
                              <img src={api.getProxiedImageSrc(slide.content)} alt={slide.caption || ''} className="w-full" />
                            </div>
                            {slide.caption && <p className="text-sm text-text-muted text-center">{slide.caption}</p>}
                          </div>
                        );
                      }

                      if (slide.type === 'video' && slide.content) {
                        const videoId = getYouTubeId(slide.content);
                        return (
                          <div className="h-full flex flex-col justify-center gap-4">
                            <div className="aspect-video bg-black rounded-lg overflow-hidden border border-line-soft">
                              <iframe
                                src={`https://www.youtube.com/embed/${videoId}`}
                                className="w-full h-full"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title={slide.caption || 'Video'}
                              />
                            </div>
                            {slide.caption && <p className="text-sm text-text-muted text-center">{slide.caption}</p>}
                          </div>
                        );
                      }

                      return null;
                    })()}
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between gap-4 py-4">
                  <button
                    onClick={() => goToSlide(currentSlideIndex - 1)}
                    disabled={currentSlideIndex <= 0}
                    className="text-sm font-medium text-text-muted hover:text-accent disabled:opacity-30 transition-colors"
                  >
                    &larr; Previous
                  </button>

                  <div className="text-sm text-text-muted">
                    {currentSlideIndex + 1} of {slides.length}
                  </div>

                  <button
                    onClick={() => goToSlide(currentSlideIndex + 1)}
                    disabled={currentSlideIndex >= slides.length - 1}
                    className="text-sm font-medium text-text-primary hover:text-accent disabled:opacity-30 transition-colors"
                  >
                    Next &rarr;
                  </button>
                </div>

                {/* Complete button on last slide */}
                {currentSlideIndex === slides.length - 1 && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={markComplete}
                      disabled={saving || completed}
                      className="btn-primary px-12 py-3"
                    >
                      {completed ? 'Lesson Completed' : saving ? 'Saving...' : 'Complete Lesson'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="prose-editorial py-8">
                <ReactMarkdown>{lesson.content || 'No content available yet.'}</ReactMarkdown>
              </div>
            )}
          </main>

          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-8 space-y-6">
              {/* Course outline */}
              <div className="p-6 bg-surface-raised border border-line-soft rounded-xl">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Course Outline</h3>
                <div className="space-y-6">
                  {(course.modules || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map((mod) => (
                    <div key={mod.id}>
                      <p className="text-xs font-semibold text-text-muted mb-2 uppercase tracking-wide">{mod.title}</p>
                      <ul className="space-y-1.5">
                        {(mod.lessons || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map((l) => (
                          <li key={l.id}>
                            <Link
                              to={`/courses/${course.id}/lessons/${l.id}`}
                              className={`flex items-start gap-2 text-sm transition-colors ${l.id === lesson.id ? 'text-accent font-medium' : 'text-text-muted hover:text-text-primary'
                                }`}
                            >
                              <span className="text-text-dim">{String(l.order).padStart(2, '0')}.</span>
                              <span className="leading-snug">{l.title}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress */}
              <div className="p-6 bg-accent/5 border border-accent/20 rounded-xl">
                <h3 className="text-sm font-semibold text-text-primary mb-3">Your Progress</h3>
                {(() => {
                  const pct = Math.round(progress?.courseProgress?.progressPercentage || 0);
                  return (
                    <>
                      <div className="flex items-end justify-between mb-2">
                        <span className="text-3xl font-bold">{pct}%</span>
                        <span className="text-xs text-text-muted">course complete</span>
                      </div>
                      <div className="h-2 bg-surface-body rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default LessonPlayer;
