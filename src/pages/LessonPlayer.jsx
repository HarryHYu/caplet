import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import api from '../services/api';

function getYouTubeId(url) {
  if (!url) return '';
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/);
  return match ? match[1] : url;
}

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
    <div className="mt-24 pt-24 border-t border-line-soft">
      <div className="flex items-center gap-6 mb-16 reveal-text">
        <div className="w-12 h-12 bg-accent/5 border border-accent/20 flex items-center justify-center text-accent">
          <span className="text-xl font-serif italic">Q</span>
        </div>
        <div>
          <span className="section-kicker">Assessment Protocol</span>
          <h2 className="text-3xl font-serif italic">Technical Validation.</h2>
        </div>
      </div>

      <div className="space-y-12">
        {mcqQuestions.map((q, idx) => (
          <div key={q.id} className="p-12 bg-surface-raised border border-line-soft reveal-text">
            <div className="flex justify-between items-start mb-10">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim">Inquiry {String(idx + 1).padStart(2, '0')}</span>
              {submitted && (
                <span className={`text-[9px] font-black uppercase tracking-widest ${answers[q.id] === q.correctAnswer ? 'text-accent' : 'text-text-dim'}`}>
                  {answers[q.id] === q.correctAnswer ? 'Validated' : 'Discrepancy'}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold mb-12 text-text-primary leading-snug">
              {q.question}
            </p>
            <div className="space-y-4">
              {q.options.map((option, optIdx) => {
                const isSelected = answers[q.id] === optIdx;
                const isCorrect = q.correctAnswer === optIdx;
                const showFeedback = submitted;

                return (
                  <label
                    key={optIdx}
                    className={`flex items-center p-6 cursor-pointer transition-all duration-500 border relative overflow-hidden ${showFeedback
                      ? isCorrect
                        ? 'border-accent bg-accent/5'
                        : isSelected
                          ? 'border-line-soft opacity-60'
                          : 'border-line-soft opacity-40 grayscale'
                      : isSelected
                        ? 'border-accent bg-accent/5'
                        : 'border-line-soft hover:border-text-dim bg-surface-body'
                      }`}
                  >
                    <input
                      type="radio"
                      name={`question-${q.id}`}
                      checked={isSelected}
                      onChange={() => handleAnswer(q.id, optIdx)}
                      disabled={submitted}
                      className="hidden"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 mr-6 flex items-center justify-center transition-colors ${isSelected ? 'border-accent bg-accent' : 'border-line-soft'}`}>
                      {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <span className="text-sm font-bold uppercase tracking-tight text-text-primary">{option}</span>
                  </label>
                );
              })}
            </div>
            {submitted && q.explanation && (
              <div className="mt-12 p-8 bg-surface-soft border-l-2 border-accent">
                <span className="font-black text-[9px] uppercase tracking-[0.4em] text-accent block mb-4 italic">Rationale</span>
                <p className="text-sm font-serif italic text-text-muted leading-relaxed">{q.explanation}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-16 reveal-text">
        {!submitted ? (
          <button
            onClick={handleSubmit}
            className="btn-primary w-full py-6 text-[11px]"
          >
            Finalize Assessment
          </button>
        ) : (
          <div className="space-y-8">
            <div className={`p-16 text-center border relative overflow-hidden ${score >= 70 ? 'bg-accent/5 border-accent' : 'bg-surface-raised border-line-soft'}`}>
              <div className="absolute inset-0 opacity-5 grid-technical !bg-[size:20px_20px]" />
              <div className="relative z-10">
                <span className="section-kicker">Terminal Result</span>
                <h3 className="text-4xl font-serif italic mb-6">
                  {score >= 70 ? 'Integrity Verified.' : 'Analysis Required.'}
                </h3>
                <div className="flex items-center justify-center gap-4 mb-8">
                  <span className="text-5xl font-black tabular-nums">{score}%</span>
                  <span className="text-[10px] font-bold text-text-dim uppercase tracking-[0.3em] text-left">Accuracy<br />Rating</span>
                </div>
                {score >= 70 ? (
                  <p className="text-accent font-black text-[10px] uppercase tracking-widest animate-pulse">Syncing mastery status to registry...</p>
                ) : (
                  <p className="text-text-dim font-black text-[10px] uppercase tracking-widest italic">Conceptual alignment below required threshold (70%).</p>
                )}
              </div>
            </div>
            {score < 70 && (
              <button
                onClick={handleReset}
                className="btn-secondary w-full py-6 text-[11px]"
              >
                Re-initialize Evaluation
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
  const [slideDirection, setSlideDirection] = useState('next');
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
    setSlideDirection(newIndex > currentSlideIndex ? 'next' : 'prev');
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
        <div className="w-12 h-12 border-2 border-accent border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (error || !course || !lesson) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6 reveal-text">
          <span className="section-kicker">Status Error</span>
          <p className="text-3xl font-serif italic mb-12">{error || 'Terminal node not found.'}</p>
          <Link to={`/courses/${courseId}`} className="btn-primary py-4 px-12 text-[10px]">Back to Course</Link>
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
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <div className="mb-20 flex items-center justify-between reveal-text">
          <Link to={`/courses/${course.id}`} className="inline-flex items-center gap-4 group">
            <div className="w-10 h-10 bg-surface-raised border border-line-soft flex items-center justify-center text-text-dim group-hover:text-accent group-hover:border-accent transition-all">
              ←
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim group-hover:text-text-primary transition-colors">
              Unit Overview
            </span>
          </Link>
          <div className="px-6 py-3 bg-surface-raised border border-line-soft text-[10px] font-black uppercase tracking-[0.4em] text-accent tabular-nums">
            Node {idx + 1} / {flatLessons.length}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
          <main className="lg:col-span-8">
            <div className="reveal-text">
              <div className="mb-20">
                <span className="section-kicker">Theoretical Perspective</span>
                <h1 className="text-5xl lg:text-7xl mb-8">
                  {lesson.title}
                </h1>
                <p className="text-xl text-text-muted font-serif italic max-w-2xl leading-relaxed">
                  {lesson.description}
                </p>
              </div>

              {hasSlides ? (
                <>
                  <div className="mb-12">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.4em] text-accent mb-4 italic">
                      <span>Transmission Status</span>
                      <span>{Math.round(((currentSlideIndex + 1) / slides.length) * 100)}% Complete</span>
                    </div>
                    <div className="h-1 bg-surface-soft overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-1000 ease-out"
                        style={{ width: `${((currentSlideIndex + 1) / slides.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-surface-raised border border-line-soft p-1.5 relative mb-12">
                    <div className="absolute inset-0 opacity-5 grid-technical !bg-[size:25px_25px]" />
                    <div className="relative z-10 bg-surface-body border border-line-soft min-h-[500px] flex flex-col p-12 lg:p-16">
                      <div key={currentSlideIndex} className="flex-1 animate-fade-in">
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
                              <div className="max-w-xl mx-auto py-8">
                                <span className="section-kicker mb-8">Conceptual Inquiry</span>
                                <h3 className="text-3xl font-bold text-text-primary mb-12 leading-tight">{slide.question}</h3>
                                <div className="space-y-4">
                                  {options.map((option, optIdx) => {
                                    const chosen = selected === optIdx;
                                    const isTrulyCorrect = correctIndex === optIdx;
                                    return (
                                      <button
                                        key={optIdx}
                                        disabled={showFeedback}
                                        onClick={() => setQuestionAnswer(optIdx)}
                                        className={`w-full text-left p-6 border transition-all duration-500 font-bold uppercase tracking-tight text-xs flex justify-between items-center ${showFeedback
                                          ? isTrulyCorrect
                                            ? 'border-accent bg-accent/5'
                                            : chosen ? 'border-line-soft opacity-60' : 'border-line-soft opacity-30'
                                          : chosen
                                            ? 'border-accent bg-accent/5 translate-x-2'
                                            : 'border-line-soft hover:border-text-dim'
                                          }`}
                                      >
                                        {option}
                                        {showFeedback && isTrulyCorrect && <span className="text-accent text-[9px] tracking-widest">Verified</span>}
                                      </button>
                                    );
                                  })}
                                </div>
                                {!showFeedback && selected !== null && (
                                  <button
                                    onClick={() => recordQuestionAnswer(currentSlideIndex, selected === correctIndex)}
                                    className="btn-primary w-full mt-12 py-5 text-[10px]"
                                  >
                                    Confirm Resolution
                                  </button>
                                )}
                                {showFeedback && slide.explanation && (
                                  <div className="mt-12 p-8 bg-surface-soft border-l-2 border-accent">
                                    <p className="text-sm font-serif italic text-text-muted leading-relaxed">{slide.explanation}</p>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          if (slide.type === 'text') {
                            return (
                              <article className="prose-editorial">
                                <ReactMarkdown>{slide.content || ''}</ReactMarkdown>
                                {slide.caption && <p className="mt-12 pt-8 border-t border-line-soft text-[10px] font-black uppercase tracking-[0.4em] text-text-dim">{slide.caption}</p>}
                              </article>
                            );
                          }

                          if (slide.type === 'image' && slide.content) {
                            return (
                              <div className="h-full flex flex-col justify-center gap-8">
                                <div className="p-1 bg-surface-soft border border-line-soft">
                                  <img src={api.getProxiedImageSrc(slide.content)} alt="" className="w-full grayscale opacity-90" />
                                </div>
                                {slide.caption && <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim text-center">{slide.caption}</p>}
                              </div>
                            );
                          }

                          if (slide.type === 'video' && slide.content) {
                            const videoId = getYouTubeId(slide.content);
                            return (
                              <div className="h-full flex flex-col justify-center gap-8">
                                <div className="aspect-video bg-black border border-line-soft">
                                  <iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full h-full" frameBorder="0" allowFullScreen />
                                </div>
                                {slide.caption && <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim text-center">{slide.caption}</p>}
                              </div>
                            );
                          }

                          return null;
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-8 pt-8 border-t border-line-soft">
                    <button
                      onClick={() => goToSlide(currentSlideIndex - 1)}
                      disabled={currentSlideIndex <= 0}
                      className="text-[10px] font-black uppercase tracking-[0.4em] text-text-dim hover:text-accent disabled:opacity-20 transition-colors"
                    >
                      ← Previous Node
                    </button>

                    <div className="text-[11px] font-serif italic text-text-dim">
                      Section {currentSlideIndex + 1} of {slides.length}
                    </div>

                    <button
                      onClick={() => goToSlide(currentSlideIndex + 1)}
                      disabled={currentSlideIndex >= slides.length - 1}
                      className="text-[10px] font-black uppercase tracking-[0.4em] text-text-primary hover:text-accent disabled:opacity-20 transition-colors"
                    >
                      Next Node →
                    </button>
                  </div>

                  {currentSlideIndex === slides.length - 1 && (
                    <div className="mt-24 pt-12 border-t border-line-soft text-center reveal-text">
                      <button
                        onClick={markComplete}
                        disabled={saving || completed}
                        className="btn-primary px-20 py-6 text-[11px]"
                      >
                        {completed ? 'Registry Synchronized ✓' : saving ? 'Transmitting…' : 'Finalize Technical Unit'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="prose-editorial py-20">
                  <ReactMarkdown>{lesson.content || 'Generating technical content sequence...'}</ReactMarkdown>
                </div>
              )}
            </div>
          </main>

          <aside className="lg:col-span-4 reveal-text stagger-1">
            <div className="sticky top-32 space-y-12">
              <div className="p-10 bg-surface-raised border border-line-soft">
                <span className="section-kicker mb-8">Curriculum Trajectory</span>
                <div className="space-y-10">
                  {(course.modules || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map((mod) => (
                    <div key={mod.id}>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-4 border-b border-line-soft pb-2">{mod.title}</p>
                      <ul className="space-y-3">
                        {(mod.lessons || []).sort((a, b) => (a.order || 0) - (b.order || 0)).map((l) => (
                          <li key={l.id}>
                            <Link
                              to={`/courses/${course.id}/lessons/${l.id}`}
                              className={`flex items-start gap-4 text-[11px] font-bold transition-all group ${l.id === lesson.id ? 'text-accent' : 'text-text-dim hover:text-text-primary'
                                }`}
                            >
                              <span className="tabular-nums opacity-40">{String(l.order).padStart(2, '0')}</span>
                              <span className="leading-tight uppercase tracking-tight">{l.title}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-10 bg-surface-inverse text-surface-body relative overflow-hidden">
                <div className="absolute inset-0 opacity-5 grid-technical !bg-[size:30px_30px]" />
                <div className="relative z-10">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent mb-6 block">Mastery Index</span>
                  <div className="flex items-end justify-between mb-4">
                    <span className="text-4xl font-serif italic">33%</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Curriculum Sync</span>
                  </div>
                  <div className="h-1 bg-surface-body/20 overflow-hidden">
                    <div className="h-full bg-accent w-1/3" />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default LessonPlayer;

