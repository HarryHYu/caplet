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
  const [showResults, setShowResults] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleAnswer = (questionId, answerIndex) => {
    setAnswers({ ...answers, [questionId]: answerIndex });
  };

  const handleSubmit = () => {
    setSubmitted(true);
    setShowResults(true);
    
    // Calculate score
    const mcqQuestions = questions.filter(q => q.type === 'multiple-choice');
    const correct = mcqQuestions.filter(q => answers[q.id] === q.correctAnswer).length;
    const score = Math.round((correct / mcqQuestions.length) * 100);
    
    if (score >= 70) {
      setTimeout(() => onComplete?.(), 1000);
    }
  };

  const mcqQuestions = questions.filter(q => q.type === 'multiple-choice');
  const shortAnswerQuestions = questions.filter(q => q.type === 'short-answer');
  const correctCount = mcqQuestions.filter(q => answers[q.id] === q.correctAnswer).length;
  const score = mcqQuestions.length > 0 ? Math.round((correctCount / mcqQuestions.length) * 100) : 0;

  return (
    <div className="mt-8 border-t pt-8">
      <h2 className="text-2xl font-bold mb-6">📝 Quiz Time!</h2>
      
      {/* Multiple Choice Questions */}
      {mcqQuestions.map((q, idx) => (
        <div key={q.id} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="font-semibold mb-3">
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
                        ? 'border-green-500 bg-green-50'
                        : 'border-red-500 bg-red-50'
                      : isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
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
                  <span>{option}</span>
                  {submitted && isCorrect && (
                    <span className="ml-auto text-green-600">✓</span>
                  )}
                  {showFeedback && !isCorrect && (
                    <span className="ml-auto text-red-600">✗</span>
                  )}
                </label>
              );
            })}
          </div>
          {submitted && q.explanation && (
            <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 text-sm">
              <strong>Explanation:</strong> {q.explanation}
            </div>
          )}
        </div>
      ))}

      {/* Short Answer Questions */}
      {shortAnswerQuestions.map((q, idx) => (
        <div key={q.id} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="font-semibold mb-3">
            Question {mcqQuestions.length + idx + 1}: {q.question}
          </p>
          <textarea
            className="w-full p-3 border rounded-lg"
            rows="4"
            placeholder="Type your answer here..."
            disabled={submitted}
          />
          {submitted && q.explanation && (
            <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 text-sm">
              <strong>Guidance:</strong> {q.explanation}
            </div>
          )}
        </div>
      ))}

      {/* Submit Button and Results */}
      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < mcqQuestions.length}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Answers
        </button>
      ) : (
        <div className={`p-6 rounded-lg ${score >= 70 ? 'bg-green-50 border-2 border-green-500' : 'bg-yellow-50 border-2 border-yellow-500'}`}>
          <h3 className="text-xl font-bold mb-2">
            {score >= 70 ? '🎉 Great job!' : '📚 Keep practicing!'}
          </h3>
          <p className="mb-2">
            You got <strong>{correctCount} out of {mcqQuestions.length}</strong> questions correct ({score}%)
          </p>
          {score >= 70 ? (
            <p className="text-green-700">You passed! Moving to the next lesson...</p>
          ) : (
            <p className="text-yellow-700">You need 70% to pass. Review the content and try again!</p>
          )}
        </div>
      )}
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (error || !course || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || 'Lesson not found'}</p>
          <Link to={`/courses/${courseId}`} className="mt-4 inline-block text-blue-600">Back to course</Link>
        </div>
      </div>
    );
  }

  const sortedLessons = (course.lessons || []).sort((a, b) => a.order - b.order);
  const idx = sortedLessons.findIndex(l => l.id === lesson.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-custom py-6">
        <div className="mb-4 flex items-center justify-between">
          <Link to={`/courses/${course.id}`} className="text-blue-600">← {course.title}</Link>
          <div className="text-sm text-gray-600">Lesson {lesson.order} of {sortedLessons.length}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-4 bg-white rounded-lg shadow p-4 h-max">
            <h3 className="font-semibold mb-3">Lessons</h3>
            <ul className="space-y-2">
              {sortedLessons.map(l => (
                <li key={l.id}>
                  <Link
                    to={`/courses/${course.id}/lessons/${l.id}`}
                    className={`block px-3 py-2 rounded ${l.id === lesson.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
                  >
                    {l.order}. {l.title}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>

          <main className="lg:col-span-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h1 className="text-2xl font-bold mb-2">{lesson.title}</h1>
              <p className="text-gray-600 mb-6">{lesson.description}</p>

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
              <article className="prose prose-lg max-w-none mb-6">
                <ReactMarkdown
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-6 mb-4" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-6 mb-3" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-xl font-semibold mt-4 mb-2" {...props} />,
                    p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
                    li: ({node, ...props}) => <li className="ml-4" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                    code: ({node, inline, ...props}) => 
                      inline 
                        ? <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono" {...props} />
                        : <code className="block bg-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4" {...props} />,
                    hr: ({node, ...props}) => <hr className="my-8 border-gray-300" {...props} />,
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


