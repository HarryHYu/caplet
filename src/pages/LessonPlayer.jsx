import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '../contexts/ThemeContext';

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
    
    // Calculate score
    const mcqQuestions = questions.filter(q => q.type === 'multiple-choice');
    const correct = mcqQuestions.filter(q => answers[q.id] === q.correctAnswer).length;
    const score = Math.round((correct / mcqQuestions.length) * 100);
    
    if (score >= 70) {
      setTimeout(() => onComplete?.(), 1500);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  const mcqQuestions = questions.filter(q => q.type === 'multiple-choice');
  const shortAnswerQuestions = questions.filter(q => q.type === 'short-answer');
  const correctCount = mcqQuestions.filter(q => answers[q.id] === q.correctAnswer).length;
  const score = mcqQuestions.length > 0 ? Math.round((correctCount / mcqQuestions.length) * 100) : 0;

  return (
    <div className="mt-8 border-t dark:border-gray-700 pt-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">📝 Quiz Time!</h2>
      
      {/* Multiple Choice Questions */}
      {mcqQuestions.map((q, idx) => (
        <div key={q.id} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="font-semibold mb-3 text-gray-900 dark:text-white">
            Question {idx + 1}: {q.question}
          </p>
          <div className="space-y-2">
            {q.options.map((option, optIdx) => {
              const isSelected = answers[q.id] === optIdx;
              const isCorrect = q.correctAnswer === optIdx;
              const showFeedback = submitted && isSelected;
              
              return (
                <label
                  key={optIdx}
                  className={`flex items-center p-3 rounded border-2 cursor-pointer transition ${
                    showFeedback
                      ? isCorrect
                        ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20'
                        : 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20'
                      : isSelected
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${q.id}`}
                    checked={isSelected}
                    onChange={() => handleAnswer(q.id, optIdx)}
                    disabled={submitted}
                    className="mr-3"
                  />
                  <span className="text-gray-900 dark:text-white">{option}</span>
                  {submitted && isCorrect && (
                    <span className="ml-auto text-green-600 dark:text-green-400">✓</span>
                  )}
                  {showFeedback && !isCorrect && (
                    <span className="ml-auto text-red-600 dark:text-red-400">✗</span>
                  )}
                </label>
              );
            })}
          </div>
          {submitted && q.explanation && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 text-sm text-gray-900 dark:text-gray-200">
              <strong>Explanation:</strong> {q.explanation}
            </div>
          )}
        </div>
      ))}

      {/* Short Answer Questions */}
      {shortAnswerQuestions.map((q, idx) => (
        <div key={q.id} className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="font-semibold mb-3 text-gray-900 dark:text-white">
            Question {mcqQuestions.length + idx + 1}: {q.question}
          </p>
          <textarea
            className="w-full p-3 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            rows="4"
            placeholder="Type your answer here..."
            disabled={submitted}
          />
          {submitted && q.explanation && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 text-sm text-gray-900 dark:text-gray-200">
              <strong>Guidance:</strong> {q.explanation}
            </div>
          )}
        </div>
      ))}

      {/* Submit Button and Results */}
      <div className="space-y-4">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            className="btn-primary w-full"
          >
            Submit Answers
          </button>
        ) : (
          <>
            <div className={`p-6 rounded-lg ${score >= 70 ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-400' : 'bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-500 dark:border-yellow-400'}`}>
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                {score >= 70 ? '🎉 Great job!' : '📚 Keep practicing!'}
              </h3>
              <p className="mb-2 text-gray-900 dark:text-gray-200">
                You got <strong>{correctCount} out of {mcqQuestions.length}</strong> questions correct ({score}%)
              </p>
              {score >= 70 ? (
                <p className="text-green-700 dark:text-green-400">You passed! Advancing to next lesson...</p>
              ) : (
                <p className="text-yellow-700 dark:text-yellow-400">You need 70% to pass. Review the content and try again!</p>
              )}
            </div>
            {score < 70 && (
              <button
                onClick={handleReset}
                className="btn-secondary w-full"
              >
                Try Again
              </button>
            )}
          </>
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
  const { isDark } = useTheme();
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
        const currentFromList = flatLessons.find((l) => l.id === lessonId) || flatLessons[0];
        setCourse(courseData);
        setLesson(lessonData || currentFromList);
        const current = lessonData || currentFromList;
        if (current) {
          try {
            await api.updateLessonProgress(current.id, { status: 'in_progress' });
          } catch (e) {
            console.warn('Progress update failed (non-blocking):', e?.message || e);
          }
          try {
            const prog = await api.getCourseProgress(courseId);
            setProgress(prog);
            const slides = Array.isArray(current.slides) ? current.slides : [];
            const lp = prog?.lessonProgress?.find((p) => String(p.lessonId) === String(current.id));
            if (lp) {
              // Check if lesson is already completed
              if (lp.status === 'completed') {
                setCompleted(true);
              }
              // Restore slide position
              if (slides.length > 0 && typeof lp.lastSlideIndex === 'number') {
                setCurrentSlideIndex(Math.min(lp.lastSlideIndex, slides.length - 1));
              }
            }
          } catch {
            // ignore
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
      // Refresh progress to get updated completion status
      try {
        const prog = await api.getCourseProgress(courseId);
        setProgress(prog);
      } catch {
        // ignore - we'll still mark as complete locally
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

  const pageBg = isDark ? '#1e3a5f' : '#ffffff';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ minHeight: '100vh', backgroundColor: pageBg }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (error || !course || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ minHeight: '100vh', backgroundColor: pageBg }}>
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error || 'Lesson not found'}</p>
          <Link to={`/courses/${courseId}`} className="mt-4 inline-block text-blue-600 dark:text-blue-400">Back to course</Link>
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
    api.updateLessonProgress(lesson.id, { lastSlideIndex: newIndex }).catch(() => {});
  };

  const lessonProgressRecord = progress?.lessonProgress?.find((p) => p.lessonId === lesson?.id);
  const quizScores = lessonProgressRecord?.quizScores || {};

  const recordQuestionAnswer = async (slideIndex, isCorrect) => {
    const key = String(slideIndex);
    setQuestionSubmitted(true);
    setProgress((prev) => {
      const list = prev.lessonProgress || [];
      const existing = list.find((p) => p.lessonId === lesson.id);
      const updated = existing
        ? { ...existing, quizScores: { ...(existing.quizScores || {}), [key]: isCorrect } }
        : { lessonId: lesson.id, quizScores: { [key]: isCorrect } };
      return {
        ...prev,
        lessonProgress: existing ? list.map((p) => (p.lessonId === lesson.id ? updated : p)) : [...list, updated]
      };
    });
    await api.updateLessonProgress(lesson.id, { quizScores: { [key]: isCorrect }, lastSlideIndex: slideIndex }).catch(() => {});
  };

  const cardBg = isDark ? '#334155' : '#f1f5f9';
  const slideAreaBg = isDark ? '#475569' : '#ffffff';
  const flatLessons = getFlatLessons(course);
  const idx = flatLessons.findIndex(l => l.id === lesson.id);
  const sortedModules = (course.modules || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div
      className="min-h-screen"
      style={{ minHeight: '100vh', backgroundColor: pageBg }}
    >
      <div className="container-custom py-6">
        <div className="mb-4 flex items-center justify-between">
          <Link to={`/courses/${course.id}`} className="text-blue-600 dark:text-blue-400">← {course.title}</Link>
          <div className="text-sm text-gray-600 dark:text-gray-400">Lesson {idx + 1} of {flatLessons.length}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside
            className="lg:col-span-4 rounded-lg shadow p-4 h-max"
            style={{ backgroundColor: cardBg }}
          >
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Modules & lessons</h3>
            <div className="space-y-4">
              {sortedModules.map((mod) => (
                <div key={mod.id}>
                  <p className="font-medium text-gray-800 dark:text-gray-200 mb-2">{mod.title}</p>
                  <ul className="space-y-1 pl-2">
                    {(mod.lessons || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((l) => (
                      <li key={l.id}>
                        <Link
                          to={`/courses/${course.id}/lessons/${l.id}`}
                          className={`block px-3 py-2 rounded text-sm ${l.id === lesson.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-300'}`}
                        >
                          {l.order}. {l.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </aside>

          <main className="lg:col-span-8">
            <div className="rounded-lg shadow p-6" style={{ backgroundColor: cardBg }}>
              <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{lesson.title}</h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{lesson.description}</p>

              {hasSlides ? (
                <>
                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                      <span>Slide {currentSlideIndex + 1} of {slides.length}</span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${((currentSlideIndex + 1) / slides.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Slide-based content: fixed height so nav doesn't jump */}
                  <div
                    className="mb-6 h-[420px] flex flex-col rounded-2xl border-2 overflow-hidden"
                    style={{
                      backgroundColor: slideAreaBg,
                      borderColor: isDark ? '#64748b' : '#e2e8f0',
                      boxShadow: isDark ? '0 4px 14px rgba(0,0,0,0.2)' : '0 4px 14px rgba(0,0,0,0.06)'
                    }}
                  >
                    <div
                      key={currentSlideIndex}
                      className={`flex-1 overflow-y-auto p-6 ${slideDirection === 'next' ? 'slide-enter-next' : 'slide-enter-prev'}`}
                    >
                    {(() => {
                      const slide = slides[currentSlideIndex];
                      if (!slide) {
                        return (
                          <p className="text-gray-500 dark:text-gray-400">No content for this slide.</p>
                        );
                      }
                      if (slide.type === 'question') {
                        const options = Array.isArray(slide.options) ? slide.options : [];
                        const correctIndex = typeof slide.correctIndex === 'number' ? slide.correctIndex : 0;
                        const alreadyAnswered = quizScores[String(currentSlideIndex)] !== undefined;
                        const isCorrect = quizScores[String(currentSlideIndex)] === true;
                        const selected = questionAnswer ?? (alreadyAnswered ? undefined : null);
                        const showFeedback = questionSubmitted || alreadyAnswered;
                        return (
                          <div className="p-2">
                            <h3 className="text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Question</h3>
                            <p className="font-medium text-lg text-gray-900 dark:text-white mb-5">{slide.question}</p>
                            <div className="space-y-3">
                              {options.map((option, optIdx) => {
                                const chosen = selected === optIdx;
                                const correct = correctIndex === optIdx;
                                const show = showFeedback && (chosen || correct);
                                return (
                                  <label
                                    key={optIdx}
                                    className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                                      show
                                        ? correct
                                          ? 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20 shadow-sm'
                                          : chosen
                                            ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20 shadow-sm'
                                            : 'border-gray-200 dark:border-gray-600'
                                        : chosen
                                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-md ring-2 ring-blue-200 dark:ring-blue-800'
                                          : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`slide-q-${currentSlideIndex}`}
                                      checked={chosen}
                                      onChange={() => !showFeedback && setQuestionAnswer(optIdx)}
                                      disabled={showFeedback}
                                      className="mr-3"
                                    />
                                    <span className="text-gray-900 dark:text-white">{option}</span>
                                    {show && correct && <span className="ml-auto text-green-600 dark:text-green-400">✓</span>}
                                    {show && chosen && !correct && <span className="ml-auto text-red-600 dark:text-red-400">✗</span>}
                                  </label>
                                );
                              })}
                            </div>
                            {showFeedback && slide.explanation && (
                              <div className="mt-5 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 text-sm text-gray-900 dark:text-gray-200">
                                <strong className="text-blue-700 dark:text-blue-300">Explanation:</strong> {slide.explanation}
                              </div>
                            )}
                            {!showFeedback && selected !== null && (
                              <button
                                type="button"
                                onClick={() => recordQuestionAnswer(currentSlideIndex, selected === correctIndex)}
                                className="mt-5 px-6 py-2.5 rounded-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                              >
                                Check answer
                              </button>
                            )}
                          </div>
                        );
                      }
                      if (slide.type === 'text') {
                        return (
                          <article className="prose prose-lg dark:prose-invert max-w-none">
                            <ReactMarkdown
                              components={{
                                h1: ({ ...props }) => <h1 className="text-2xl font-bold mt-4 mb-3 text-gray-900 dark:text-white" {...props} />,
                                h2: ({ ...props }) => <h2 className="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-white" {...props} />,
                                p: ({ ...props }) => <p className="mb-3 leading-relaxed text-gray-700 dark:text-gray-300" {...props} />,
                                ul: ({ ...props }) => <ul className="list-disc list-inside mb-3 space-y-1 text-gray-700 dark:text-gray-300" {...props} />,
                                li: ({ ...props }) => <li className="ml-2" {...props} />,
                                strong: ({ ...props }) => <strong className="font-bold text-gray-900 dark:text-white" {...props} />,
                              }}
                            >
                              {slide.content || ''}
                            </ReactMarkdown>
                            {slide.caption && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{slide.caption}</p>}
                          </article>
                        );
                      }
                      if (slide.type === 'image' && slide.content) {
                        return (
                          <div>
                            <img src={slide.content} alt={slide.caption || ''} className="max-w-full h-auto rounded-lg border border-gray-200 dark:border-gray-600" onError={(e) => { e.target.style.display = 'none'; }} />
                            {slide.caption && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{slide.caption}</p>}
                          </div>
                        );
                      }
                      if (slide.type === 'video' && slide.content) {
                        const videoId = getYouTubeId(slide.content);
                        if (videoId) {
                          return (
                            <div>
                              <div className="relative pt-[56.25%] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-black">
                                <iframe
                                  src={`https://www.youtube.com/embed/${videoId}`}
                                  title={slide.caption || 'Video'}
                                  className="absolute inset-0 w-full h-full"
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                              {slide.caption && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{slide.caption}</p>}
                            </div>
                          );
                        }
                        return <a href={slide.content} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400">Watch video</a>;
                      }
                      return (
                        <p className="text-gray-500 dark:text-gray-400">Unknown slide type: {slide.type || 'missing'}.</p>
                      );
                    })()}
                    </div>
                  </div>

                  {/* Slide dots + nav */}
                  <div className="flex items-center justify-between gap-4 mt-6">
                    <button
                      type="button"
                      onClick={() => goToSlide(currentSlideIndex - 1)}
                      disabled={currentSlideIndex <= 0}
                      className="lesson-nav-btn bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none"
                    >
                      ← Previous
                    </button>
                    <div className="flex gap-1.5">
                      {slides.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => goToSlide(i)}
                          className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                            i === currentSlideIndex
                              ? 'bg-blue-500 dark:bg-blue-400 scale-125'
                              : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                          }`}
                          aria-label={`Go to slide ${i + 1}`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => goToSlide(currentSlideIndex + 1)}
                      disabled={currentSlideIndex >= slides.length - 1}
                      className="lesson-nav-btn bg-blue-500 dark:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none"
                    >
                      Next →
                    </button>
                  </div>

                  {/* Mark complete after last slide */}
                  {currentSlideIndex === slides.length - 1 && (
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => goToSlide(currentSlideIndex - 1)}
                        disabled={currentSlideIndex <= 0}
                        className="lesson-nav-btn bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:opacity-40"
                      >
                        ← Previous
                      </button>
                      <button
                        type="button"
                        onClick={markComplete}
                        disabled={saving || completed}
                        className="lesson-nav-btn bg-green-500 hover:bg-green-600 dark:bg-green-500 dark:hover:bg-green-600 text-white"
                      >
                        {completed ? 'Completed ✓' : saving ? 'Saving…' : 'Mark complete'}
                      </button>
                      <span />
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Legacy: single content blob + optional video */}
                  {!lesson.content?.trim() && !lesson.videoUrl && (
                    <div className="mb-6 p-8 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-center">
                      <p className="text-lg font-medium text-gray-700 dark:text-gray-300">This lesson has no content yet.</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Check back later—empty lessons cannot be marked complete.</p>
                    </div>
                  )}
                  {lesson.videoUrl && getYouTubeId(lesson.videoUrl) && (
                    <div className="mb-6 relative" style={{ paddingBottom: '56.25%', height: 0 }}>
                      <iframe
                        className="absolute top-0 left-0 w-full h-full rounded-lg"
                        src={`https://www.youtube.com/embed/${getYouTubeId(lesson.videoUrl)}`}
                        title={lesson.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}
                  <article className="prose prose-lg dark:prose-invert max-w-none mb-6">
                    <ReactMarkdown
                      components={{
                        h1: ({ ...props }) => <h1 className="text-3xl font-bold mt-6 mb-4 text-gray-900 dark:text-white" {...props} />,
                        h2: ({ ...props }) => <h2 className="text-2xl font-bold mt-6 mb-3 text-gray-900 dark:text-white" {...props} />,
                        h3: ({ ...props }) => <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-900 dark:text-white" {...props} />,
                        p: ({ ...props }) => <p className="mb-4 leading-relaxed text-gray-700 dark:text-gray-300" {...props} />,
                        ul: ({ ...props }) => <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props} />,
                        ol: ({ ...props }) => <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props} />,
                        li: ({ ...props }) => <li className="ml-4" {...props} />,
                        strong: ({ ...props }) => <strong className="font-bold text-gray-900 dark:text-white" {...props} />,
                        code: ({ inline, ...props }) =>
                          inline
                            ? <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm font-mono text-gray-900 dark:text-gray-100" {...props} />
                            : <code className="block bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-sm font-mono overflow-x-auto text-gray-900 dark:text-gray-100" {...props} />,
                        blockquote: ({ ...props }) => <blockquote className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 italic my-4 text-gray-700 dark:text-gray-300" {...props} />,
                        hr: ({ ...props }) => <hr className="my-8 border-gray-300 dark:border-gray-700" {...props} />,
                      }}
                    >
                      {lesson.content || 'No content yet.'}
                    </ReactMarkdown>
                  </article>
                  {lesson.metadata?.hasQuiz && lesson.metadata?.quizQuestions && (
                    <Quiz questions={lesson.metadata.quizQuestions} onComplete={markComplete} />
                  )}
                  {!lesson.metadata?.hasQuiz && (
                    <div className="mt-6 flex items-center justify-between">
                      <button type="button" onClick={() => goTo(-1)} disabled={idx <= 0} className="btn-secondary disabled:opacity-50">Prev</button>
                      {(!lesson.content?.trim() && !lesson.videoUrl) ? (
                        <span className="text-sm text-gray-500 dark:text-gray-400">Empty lesson—add content to complete</span>
                      ) : (
                        <button type="button" onClick={markComplete} disabled={saving || completed} className="btn-primary disabled:opacity-50">
                          {completed ? 'Completed ✓' : saving ? 'Saving…' : 'Mark complete'}
                        </button>
                      )}
                      <button type="button" onClick={() => goTo(1)} disabled={idx >= flatLessons.length - 1} className="btn-secondary disabled:opacity-50">Next</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default LessonPlayer;


