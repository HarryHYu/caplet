import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import ReactMarkdown from 'react-markdown';

// Extract YouTube video ID from URL
const getYouTubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
  return match ? match[1] : null;
};

// Quiz Component
const Quiz = ({ questions, onComplete }) => {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleAnswer = (questionId, answerIndex) => {
    setAnswers({ ...answers, [questionId]: answerIndex });
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const mcqQuestions = questions.filter(q => q.type === 'multiple-choice');
    const correct = mcqQuestions.filter(q => answers[q.id] === q.correctAnswer).length;
    const score = mcqQuestions.length > 0 ? Math.round((correct / mcqQuestions.length) * 100) : 0;
    if (score >= 70) {
      setTimeout(() => onComplete?.(), 1500);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  const mcqQuestions = questions.filter(q => q.type === 'multiple-choice');
  const correctCount = mcqQuestions.filter(q => answers[q.id] === q.correctAnswer).length;
  const score = mcqQuestions.length > 0 ? Math.round((correctCount / mcqQuestions.length) * 100) : 0;

  return (
    <div className="mt-16 pt-16 border-t border-zinc-100 dark:border-zinc-900">
      <div className="flex items-center gap-4 mb-12">
        <div className="w-10 h-10 bg-brand/5 border border-brand/10 flex items-center justify-center text-brand">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="text-xl font-extrabold text-black dark:text-white uppercase tracking-tight">Academic Assessment</h2>
      </div>

      {mcqQuestions.map((q, idx) => (
        <div key={q.id} className="mb-10 p-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">
            Terminal Query {idx + 1}
          </p>
          <p className="text-lg font-bold mb-8 text-black dark:text-white leading-tight">
            {q.question}
          </p>
          <div className="space-y-3">
            {q.options.map((option, optIdx) => {
              const isSelected = answers[q.id] === optIdx;
              const isCorrect = q.correctAnswer === optIdx;
              const showFeedback = submitted && isSelected;

              return (
                <label
                  key={optIdx}
                  className={`flex items-center p-4 cursor-pointer transition-all duration-200 border ${showFeedback
                    ? isCorrect
                      ? 'border-brand bg-brand/5'
                      : 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900'
                    : isSelected
                      ? 'border-brand bg-brand/5'
                      : 'border-zinc-100 dark:border-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-black'
                    }`}
                >
                  <input
                    type="radio"
                    name={`question-${q.id}`}
                    checked={isSelected}
                    onChange={() => handleAnswer(q.id, optIdx)}
                    disabled={submitted}
                    className="mr-4 accent-brand"
                  />
                  <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{option}</span>
                  {submitted && isCorrect && (
                    <span className="ml-auto text-brand font-black text-[9px] uppercase tracking-widest">Verified</span>
                  )}
                  {showFeedback && !isCorrect && (
                    <span className="ml-auto text-black dark:text-white font-black text-[9px] uppercase tracking-widest">Mismatch</span>
                  )}
                </label>
              );
            })}
          </div>
          {submitted && q.explanation && (
            <div className="mt-8 p-6 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
              <span className="font-black text-[9px] uppercase tracking-[0.2em] text-brand block mb-3">Logic Rationale</span>
              <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 leading-relaxed uppercase tracking-tight">{q.explanation}</p>
            </div>
          )}
        </div>
      ))}

      <div className="mt-12">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            className="btn-primary w-full"
          >
            Submit Terminal Assessment
          </button>
        ) : (
          <div className="space-y-6">
            <div className={`p-10 text-center border ${score >= 70 ? 'bg-brand/5 border-brand' : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-900'}`}>
              <h3 className="text-xl font-extrabold mb-3 text-black dark:text-white uppercase tracking-tight">
                {score >= 70 ? 'Proficiency Validated' : 'Sequence Review Recommended'}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 font-black text-[10px] uppercase tracking-widest mb-6">
                Institutional Score: <span className="text-brand">{score}%</span>
              </p>
              {score >= 70 ? (
                <p className="text-brand font-black text-[10px] uppercase tracking-widest">Initializing next module sequence...</p>
              ) : (
                <p className="text-zinc-400 font-black text-[10px] uppercase tracking-widest">Protocol failure: Score below 70% threshold.</p>
              )}
            </div>
            {score < 70 && (
              <button
                onClick={handleReset}
                className="btn-secondary w-full"
              >
                Re-initialize Assessment
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

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
  const [slideDirection, setSlideDirection] = useState('next'); // 'next' | 'prev' for animation
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
            // Check current progress first - don't overwrite 'completed' status
            const prog = await api.getCourseProgress(courseId);
            setProgress(prog);
            const lp = prog?.lessonProgress?.find((p) => String(p.lessonId) === String(current.id));
            // Only set to 'in_progress' if not already completed
            if (!lp || lp.status !== 'completed') {
              await api.updateLessonProgress(current.id, { status: 'in_progress' });
            } else {
              // Lesson is completed - set local state
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

  const goTo = (delta) => {
    const flat = getFlatLessons(course);
    const idx = flat.findIndex(l => l.id === lesson?.id);
    const next = flat[idx + delta];
    if (next) navigate(`/courses/${course.id}/lessons/${next.id}`);
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
        goTo(1);
      }
    } catch (e) {
      alert('Failed to save progress: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center page-section-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent mx-auto"></div>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Retrieving curriculum...
          </p>
        </div>
      </div>
    );
  }

  if (error || !course || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center page-section-light">
        <div className="text-center max-w-md mx-auto px-6">
          <span className="section-kicker mb-4">System Notice</span>
          <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-4">
            {error || 'Lesson not found'}
          </p>
          <Link
            to={`/courses/${courseId}`}
            className="btn-secondary"
          >
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
      try {
        const parsed = JSON.parse(slidesRaw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  })();
  const hasSlides = slides.length > 0;

  const goToSlide = (newIndex) => {
    if (newIndex < 0 || newIndex >= slides.length) return;
    setSlideDirection(newIndex > currentSlideIndex ? 'next' : 'prev');
    setCurrentSlideIndex(newIndex);
    setQuestionAnswer(null);
    setQuestionSubmitted(false);
    api.updateLessonProgress(lesson.id, { lastSlideIndex: newIndex }).catch(() => { });
  };

  const lessonProgressRecord = progress?.lessonProgress?.find((p) => String(p.lessonId) === String(lesson?.id));
  const quizScores = lessonProgressRecord?.quizScores || {};

  const recordQuestionAnswer = async (slideIndex, isCorrect) => {
    const key = String(slideIndex);
    setQuestionSubmitted(true);
    setProgress((prev) => {
      const list = prev.lessonProgress || [];
      const existing = list.find((p) => String(p.lessonId) === String(lesson.id));
      const updated = existing
        ? { ...existing, quizScores: { ...(existing.quizScores || {}), [key]: isCorrect } }
        : { lessonId: lesson.id, quizScores: { [key]: isCorrect } };
      return {
        ...prev,
        lessonProgress: existing ? list.map((p) => (String(p.lessonId) === String(lesson.id) ? updated : p)) : [...list, updated]
      };
    });
    await api.updateLessonProgress(lesson.id, { quizScores: { [key]: isCorrect }, lastSlideIndex: slideIndex }).catch(() => { });
  };

  const flatLessons = getFlatLessons(course);
  const idx = flatLessons.findIndex(l => l.id === lesson.id);
  const sortedModules = (course.modules || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="min-h-screen pb-20 pt-16 page-section-light">
      <div className="container-custom py-10">
        <div className="mb-12 flex items-center justify-between reveal-up">
          <Link to={`/courses/${course.id}`} className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-brand group-hover:border-brand transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors">
              Return to Catalog
            </span>
          </Link>
          <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-[10px] font-extrabold uppercase tracking-widest text-zinc-400">
            Phase Protocol {idx + 1} // {flatLessons.length}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <main className="lg:col-span-8">
            <div className="bg-white dark:bg-black border border-zinc-100 dark:border-zinc-900 overflow-hidden reveal-up">
              <div className="p-10 lg:p-14">
                <div className="mb-12">
                  <span className="section-kicker mb-4">Module Analysis</span>
                  <h1 className="text-3xl lg:text-4xl font-extrabold text-black dark:text-white mb-6 leading-tight tracking-tight uppercase">
                    {lesson.title}
                  </h1>
                  <p className="text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl">
                    {lesson.description}
                  </p>
                </div>

                {hasSlides ? (
                  <>
                    <div className="mb-10">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">
                        <span>Instructional Progress</span>
                        <span className="text-brand italic font-black">{Math.round(((currentSlideIndex + 1) / slides.length) * 100)}% Complete</span>
                      </div>
                      <div className="h-1 bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                        <div
                          className="h-full bg-brand transition-all duration-700 ease-out"
                          style={{ width: `${((currentSlideIndex + 1) / slides.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="mb-10 h-[480px] flex flex-col rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900/80 relative">
                      <div
                        key={currentSlideIndex}
                        className={`flex-1 overflow-y-auto p-10 lg:p-12 ${slideDirection === 'next' ? 'slide-enter-next' : 'slide-enter-prev'}`}
                      >
                        {(() => {
                          const slide = slides[currentSlideIndex];
                          if (!slide) return <p className="text-slate-500 dark:text-slate-400">No content for this slide.</p>;

                          if (slide.type === 'question') {
                            const options = Array.isArray(slide.options) ? slide.options : [];
                            const correctIndex = typeof slide.correctIndex === 'number' ? slide.correctIndex : 0;
                            const alreadyAnswered = quizScores[String(currentSlideIndex)] !== undefined;
                            const selected = questionAnswer ?? (alreadyAnswered ? undefined : null);
                            const showFeedback = questionSubmitted || alreadyAnswered;

                            return (
                              <div className="p-2">
                                <h3 className="text-base font-semibold text-slate-400 uppercase tracking-wide mb-3">Assessment Query</h3>
                                <p className="font-bold text-xl text-slate-900 dark:text-white mb-6">{slide.question}</p>
                                <div className="space-y-3">
                                  {options.map((option, optIdx) => {
                                    const chosen = selected === optIdx;
                                    const correct = correctIndex === optIdx;
                                    const show = showFeedback && (chosen || correct);
                                    return (
                                      <label
                                        key={optIdx}
                                        className={`flex items-center p-5 border cursor-pointer transition-all duration-200 ${show
                                          ? correct
                                            ? 'border-brand bg-brand/5'
                                            : 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-900'
                                          : chosen
                                            ? 'border-brand bg-brand/5'
                                            : 'border-zinc-100 dark:border-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-black'
                                          }`}
                                      >
                                        <input
                                          type="radio"
                                          name={`slide-q-${currentSlideIndex}`}
                                          checked={chosen}
                                          onChange={() => !showFeedback && setQuestionAnswer(optIdx)}
                                          disabled={showFeedback}
                                          className="mr-5 accent-brand"
                                        />
                                        <span className="text-[11px] font-bold text-black dark:text-white uppercase tracking-tight">{option}</span>
                                        {show && correct && <span className="ml-auto text-brand font-black text-[9px] uppercase tracking-widest">Verified</span>}
                                        {show && chosen && !correct && <span className="ml-auto text-black dark:text-white font-black text-[9px] uppercase tracking-widest">Mismatch</span>}
                                      </label>
                                    );
                                  })}
                                </div>
                                {showFeedback && slide.explanation && (
                                  <div className="mt-8 p-6 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                                    <span className="font-black text-[9px] uppercase tracking-[0.2em] text-brand block mb-3">Logic Rationale</span>
                                    <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 leading-relaxed uppercase tracking-tight">{slide.explanation}</p>
                                  </div>
                                )}
                                {!showFeedback && selected !== null && (
                                  <button
                                    type="button"
                                    onClick={() => recordQuestionAnswer(currentSlideIndex, selected === correctIndex)}
                                    className="mt-8 btn-primary w-full"
                                  >
                                    Verify Response
                                  </button>
                                )}
                              </div>
                            );
                          }

                          if (slide.type === 'text') {
                            return (
                              <article className="prose prose-slate dark:prose-invert max-w-none">
                                <ReactMarkdown
                                  components={{
                                    h1: ({ ...props }) => <h1 className="text-2xl font-extrabold mt-4 mb-4 text-slate-900 dark:text-white" {...props} />,
                                    h2: ({ ...props }) => <h2 className="text-xl font-bold mt-4 mb-3 text-slate-900 dark:text-white" {...props} />,
                                    p: ({ ...props }) => <p className="mb-4 leading-relaxed text-slate-600 dark:text-slate-300 font-medium" {...props} />,
                                    ul: ({ ...props }) => <ul className="list-disc list-outside mb-4 space-y-2 text-slate-600 dark:text-slate-300 pl-4" {...props} />,
                                    li: ({ ...props }) => <li className="font-medium" {...props} />,
                                    strong: ({ ...props }) => <strong className="font-bold text-slate-900 dark:text-white" {...props} />,
                                  }}
                                >
                                  {slide.content || ''}
                                </ReactMarkdown>
                                {slide.caption && <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">{slide.caption}</p>}
                              </article>
                            );
                          }

                          if (slide.type === 'image' && slide.content) {
                            return (
                              <div className="flex flex-col gap-4">
                                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
                                  <img src={slide.content} alt={slide.caption || ''} className="w-full h-auto object-cover" />
                                </div>
                                {slide.caption && <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">{slide.caption}</p>}
                              </div>
                            );
                          }

                          if (slide.type === 'video' && slide.content) {
                            const videoId = getYouTubeId(slide.content);
                            if (videoId) {
                              return (
                                <div className="flex flex-col gap-4">
                                  <div className="relative pt-[56.25%] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black shadow-xl">
                                    <iframe
                                      src={`https://www.youtube.com/embed/${videoId}`}
                                      title={slide.caption || 'Module Media'}
                                      className="absolute inset-0 w-full h-full"
                                      frameBorder="0"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                  {slide.caption && <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center">{slide.caption}</p>}
                                </div>
                              );
                            }
                            return <a href={slide.content} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold underline">Stream External Content</a>;
                          }

                          return <p className="text-slate-400 italic">Instructional module content unavailable.</p>;
                        })()}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mt-10 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => goToSlide(currentSlideIndex - 1)}
                        disabled={currentSlideIndex <= 0}
                        className="w-full sm:w-auto px-8 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-all active:scale-[0.98]"
                      >
                        ← Previous
                      </button>

                      <div className="flex gap-2.5 px-4 py-2 bg-white dark:bg-slate-800 rounded-full border border-slate-100 dark:border-slate-700">
                        {slides.map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => goToSlide(i)}
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentSlideIndex
                              ? 'bg-indigo-600 w-6'
                              : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
                              }`}
                            aria-label={`Go to slide ${i + 1}`}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => goToSlide(currentSlideIndex + 1)}
                        disabled={currentSlideIndex >= slides.length - 1}
                        className="w-full sm:w-auto px-8 py-3 bg-black dark:bg-white text-white dark:text-black font-bold text-[10px] uppercase tracking-widest hover:bg-brand dark:hover:bg-brand dark:hover:text-white disabled:opacity-40 transition-all active:scale-[0.98]"
                      >
                        Next Sequence →
                      </button>
                    </div>

                    {currentSlideIndex === slides.length - 1 && (
                      <div className="mt-12 flex justify-center">
                        <button
                          type="button"
                          onClick={markComplete}
                          disabled={saving || completed}
                          className={`group relative overflow-hidden px-12 py-5 font-black text-[10px] uppercase tracking-[0.3em] transition-all active:scale-[0.98] border ${completed
                            ? 'bg-brand text-white border-brand'
                            : 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white hover:bg-brand dark:hover:bg-brand dark:hover:text-white'
                            }`}
                        >
                          <span className="relative z-10 flex items-center gap-3">
                            {completed ? 'Sequence Certified ✓' : saving ? 'System Processing…' : 'Finalize Module'}
                          </span>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {!lesson.content?.trim() && !lesson.videoUrl && (
                      <div className="mb-6 p-10 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-center">
                        <p className="text-lg font-bold text-slate-600 dark:text-slate-400">Curriculum Pending</p>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-2">Check back later for module updates.</p>
                      </div>
                    )}
                    {lesson.videoUrl && getYouTubeId(lesson.videoUrl) && (
                      <div className="mb-10 relative pt-[56.25%] rounded-[2rem] overflow-hidden bg-black shadow-2xl border border-slate-200 dark:border-slate-800">
                        <iframe
                          className="absolute inset-0 w-full h-full"
                          src={`https://www.youtube.com/embed/${getYouTubeId(lesson.videoUrl)}`}
                          title={lesson.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                    <article className="prose prose-indigo dark:prose-invert max-w-none mb-10">
                      <ReactMarkdown
                        components={{
                          h1: ({ ...props }) => <h1 className="text-3xl font-extrabold mt-8 mb-6 text-slate-900 dark:text-white" {...props} />,
                          h2: ({ ...props }) => <h2 className="text-2xl font-bold mt-8 mb-4 text-slate-900 dark:text-white" {...props} />,
                          p: ({ ...props }) => <p className="mb-4 leading-relaxed text-slate-600 dark:text-slate-300 font-medium" {...props} />,
                          ul: ({ ...props }) => <ul className="list-disc list-outside mb-6 space-y-2 text-slate-600 dark:text-slate-300 pl-6" {...props} />,
                          li: ({ ...props }) => <li className="font-medium" {...props} />,
                          strong: ({ ...props }) => <strong className="font-bold text-slate-900 dark:text-white" {...props} />,
                          blockquote: ({ ...props }) => <blockquote className="border-l-4 border-brand pl-6 italic my-8 text-black dark:text-white bg-zinc-50 dark:bg-zinc-900/50 p-8 font-medium" {...props} />,
                        }}
                      >
                        {lesson.content || 'Analytical content pending...'}
                      </ReactMarkdown>
                    </article>
                    {lesson.metadata?.hasQuiz && lesson.metadata?.quizQuestions && (
                      <Quiz questions={lesson.metadata.quizQuestions} onComplete={markComplete} />
                    )}
                    {!lesson.metadata?.hasQuiz && (
                      <div className="mt-12 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-10">
                        <button
                          type="button"
                          onClick={() => goTo(-1)}
                          disabled={idx <= 0}
                          className="px-8 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-40"
                        >
                          Prev
                        </button>
                        {(!lesson.content?.trim() && !lesson.videoUrl) ? (
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">Progress Locked</span>
                        ) : (
                          <button
                            type="button"
                            onClick={markComplete}
                            disabled={saving || completed}
                            className="px-12 py-4 bg-black dark:bg-white text-white dark:text-black font-black text-[10px] uppercase tracking-widest hover:bg-brand dark:hover:bg-brand dark:hover:text-white transition-all disabled:opacity-40"
                          >
                            {completed ? 'Module Certified ✓' : saving ? 'Processing…' : 'Certification Final'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => goTo(1)}
                          disabled={idx >= flatLessons.length - 1}
                          className="px-8 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-40"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </main>

          <aside className="lg:col-span-4 space-y-8 reveal-up" style={{ animationDelay: '200ms' }}>
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 p-8">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand mb-8">
                Curriculum Structure
              </h3>
              <div className="space-y-8">
                {sortedModules.map((mod) => (
                  <div key={mod.id} className="space-y-4">
                    <p className="text-[10px] font-extrabold text-black dark:text-white uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-900 pb-2">{mod.title}</p>
                    <ul className="space-y-2">
                      {(mod.lessons || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((l) => (
                        <li key={l.id}>
                          <Link
                            to={`/courses/${course.id}/lessons/${l.id}`}
                            className={`flex items-center gap-4 px-4 py-3 text-[11px] font-bold transition-all border ${l.id === lesson.id
                              ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                              : 'text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white border-transparent'
                              }`}
                          >
                            <span className={`text-[10px] ${l.id === lesson.id ? 'text-brand' : 'text-zinc-300'}`}>
                              {l.order.toString().padStart(2, '0')}
                            </span>
                            {l.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black dark:bg-white p-8 text-white dark:text-black reveal-up">
              <h4 className="text-[10px] font-extrabold mb-4 uppercase tracking-[0.2em] text-zinc-400">Institutional Certification</h4>
              <p className="text-xs leading-relaxed mb-8 font-medium opacity-80">
                Complete the specified curriculum modules to generate your verified certificate of completion.
              </p>
              <div className="h-1 bg-zinc-800 dark:bg-zinc-200 mb-4 overflow-hidden">
                <div className="h-full bg-brand w-1/3 transition-all duration-1000" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">33% Validation</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">2 / 6 Sequences</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default LessonPlayer;
