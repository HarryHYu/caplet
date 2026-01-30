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

const LessonPlayer = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        setLoading(true);
        const data = await api.getCourse(courseId);
        const sorted = ((data && data.lessons) || []).sort((a, b) => a.order - b.order);
        const current = sorted.find(l => l.id === lessonId) || sorted[0];
        setCourse(data);
        setLesson(current);
        // Best-effort progress update; do not block rendering
        if (current) {
          try {
            await api.updateLessonProgress(current.id, { status: 'in_progress' });
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
    const sorted = (course?.lessons || []).sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(l => l.id === lesson?.id);
    const next = sorted[idx + delta];
    if (next) navigate(`/courses/${course.id}/lessons/${next.id}`);
  };

  const markComplete = async () => {
    try {
      setSaving(true);
      await api.updateLessonProgress(lesson.id, { status: 'completed' });
      // Best-effort: auto-complete any class assignments linked to this lesson
      try {
        await api.completeLessonAssignments(lesson.id);
      } catch (e) {
        console.warn('Class assignment auto-complete failed (non-blocking):', e?.message || e);
      }
      setCompleted(true);
      // If not last lesson, advance
      const sorted = (course?.lessons || []).sort((a, b) => a.order - b.order);
      const idxNow = sorted.findIndex(l => l.id === lesson.id);
      if (idxNow < sorted.length - 1) {
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
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (error || !course || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error || 'Lesson not found'}</p>
          <Link to={`/courses/${courseId}`} className="mt-4 inline-block text-blue-600 dark:text-blue-400">Back to course</Link>
        </div>
      </div>
    );
  }

  const sortedLessons = (course.lessons || []).sort((a, b) => a.order - b.order);
  const idx = sortedLessons.findIndex(l => l.id === lesson.id);

  return (
    <div className="min-h-screen">
      <div className="container-custom py-6">
        <div className="mb-4 flex items-center justify-between">
          <Link to={`/courses/${course.id}`} className="text-blue-600 dark:text-blue-400">← {course.title}</Link>
          <div className="text-sm text-gray-600 dark:text-gray-400">Lesson {lesson.order} of {sortedLessons.length}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-4 card-fun p-4 h-max">
            <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Lessons</h3>
            <ul className="space-y-2">
              {sortedLessons.map(l => (
                <li key={l.id}>
                  <Link
                    to={`/courses/${course.id}/lessons/${l.id}`}
                    className={`block px-3 py-2 rounded ${l.id === lesson.id ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-300'}`}
                  >
                    {l.order}. {l.title}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>

          <main className="lg:col-span-8">
            <div className="card-fun p-6">
              <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">{lesson.title}</h1>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{lesson.description}</p>

              {/* YouTube Video Embed */}
              {lesson.videoUrl && getYouTubeId(lesson.videoUrl) && (
                <div className="mb-6 relative" style={{ paddingBottom: '56.25%', height: 0 }}>
                  <iframe
                    className="absolute top-0 left-0 w-full h-full rounded-lg"
                    src={`https://www.youtube.com/embed/${getYouTubeId(lesson.videoUrl)}`}
                    title={lesson.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              )}

              {/* Lesson Content with Enhanced Markdown Styling */}
              <article className="prose prose-lg dark:prose-invert max-w-none mb-6">
                <ReactMarkdown
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-6 mb-4 text-gray-900 dark:text-white" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-6 mb-3 text-gray-900 dark:text-white" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-900 dark:text-white" {...props} />,
                    p: ({node, ...props}) => <p className="mb-4 leading-relaxed text-gray-700 dark:text-gray-300" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props} />,
                    li: ({node, ...props}) => <li className="ml-4" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-gray-900 dark:text-white" {...props} />,
                    code: ({node, inline, ...props}) => 
                      inline 
                        ? <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm font-mono text-gray-900 dark:text-gray-100" {...props} />
                        : <code className="block bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-sm font-mono overflow-x-auto text-gray-900 dark:text-gray-100" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 italic my-4 text-gray-700 dark:text-gray-300" {...props} />,
                    hr: ({node, ...props}) => <hr className="my-8 border-gray-300 dark:border-gray-700" {...props} />,
                  }}
                >
                  {lesson.content || 'No content yet.'}
                </ReactMarkdown>
              </article>

              {/* Quiz Section */}
              {lesson.metadata?.hasQuiz && lesson.metadata?.quizQuestions && (
                <Quiz 
                  questions={lesson.metadata.quizQuestions} 
                  onComplete={markComplete}
                />
              )}

              {/* Navigation - Only show Mark Complete if no quiz */}
              {!lesson.metadata?.hasQuiz && (
                <div className="mt-6 flex items-center justify-between">
                  <button onClick={() => goTo(-1)} disabled={idx <= 0} className="btn-secondary disabled:opacity-50">Prev</button>
                  <button onClick={markComplete} disabled={saving || completed} className="btn-primary disabled:opacity-50">
                    {completed ? 'Completed ✓' : saving ? 'Saving…' : 'Mark complete'}
                  </button>
                  <button onClick={() => goTo(1)} disabled={idx >= sortedLessons.length - 1} className="btn-secondary disabled:opacity-50">Next</button>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default LessonPlayer;


