import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import ReactMarkdown from 'react-markdown';

const LessonPlayer = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        if (current) await api.updateLessonProgress(current.id, { status: 'in_progress' });
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
      await api.updateLessonProgress(lesson.id, { status: 'completed' });
      goTo(1);
    } catch (e) {
      alert('Failed to save progress: ' + e.message);
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
              <article className="prose max-w-none">
                <ReactMarkdown>{lesson.content || 'No content yet.'}</ReactMarkdown>
              </article>

              <div className="mt-6 flex items-center justify-between">
                <button onClick={() => goTo(-1)} disabled={idx <= 0} className="btn-secondary disabled:opacity-50">Prev</button>
                <button onClick={markComplete} className="btn-primary">Mark complete</button>
                <button onClick={() => goTo(1)} disabled={idx >= sortedLessons.length - 1} className="btn-secondary disabled:opacity-50">Next</button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default LessonPlayer;


