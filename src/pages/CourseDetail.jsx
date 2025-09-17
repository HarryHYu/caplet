import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        setLoading(true);
        const courseResponse = await api.getCourse(courseId);
        setCourse(courseResponse);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || 'Course not found'}</p>
          <Link to="/courses" className="mt-4 inline-block text-blue-600">Back to courses</Link>
        </div>
      </div>
    );
  }

  const startLesson = () => {
    const first = (course.lessons || []).sort((a, b) => a.order - b.order)[0];
    if (first) navigate(`/courses/${course.id}/lessons/${first.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="container-custom">
        <div className="mb-6">
          <Link to="/courses" className="text-blue-600">← Back to courses</Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">{course.title}</h1>
              <p className="text-gray-700 mb-4">{course.description}</p>
              <div className="flex gap-4 text-sm text-gray-600 mb-4">
                <span>⏱️ {course.duration} min</span>
                <span>📚 {(course.lessons || []).length} lessons</span>
                <span className="capitalize">Level: {course.level}</span>
              </div>
              {/* Simple progress bar placeholder (compute server-side later) */}
              <div className="w-full bg-gray-200 rounded h-2 mb-4">
                <div className="bg-blue-600 h-2 rounded" style={{ width: '0%' }}></div>
              </div>
              <button onClick={startLesson} className="btn-primary">Start course</button>
            </div>
            {course.thumbnail && (
              <img src={course.thumbnail} alt={course.title} className="w-64 h-40 object-cover rounded" />
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="border-b px-6 py-4">
            <h2 className="text-xl font-semibold">Lessons</h2>
          </div>
          <ul className="divide-y">
            {(course.lessons || [])
              .sort((a, b) => a.order - b.order)
              .map((lesson) => (
                <li key={lesson.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{lesson.order}. {lesson.title}</p>
                    <p className="text-sm text-gray-600">{lesson.description}</p>
                  </div>
                  <Link to={`/courses/${course.id}/lessons/${lesson.id}`} className="text-blue-600">Open</Link>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;


