import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ courseProgress: null, lessonProgress: [] });

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        setLoading(true);
        const courseResponse = await api.getCourse(courseId);
        setCourse(courseResponse);
        try {
          const prog = await api.getCourseProgress(courseId);
          setProgress(prog);
        } catch {
          // ignore if not logged in
        }
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
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading course...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error || 'Course not found'}</p>
          <Link to="/courses" className="mt-4 inline-block text-blue-600 dark:text-blue-400">Back to courses</Link>
        </div>
      </div>
    );
  }

  const sortedModules = (course.modules || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const totalLessonCount = sortedModules.reduce((sum, m) => sum + (m.lessons || []).length, 0);

  const startCourse = () => {
    const firstModule = sortedModules[0];
    if (firstModule) navigate(`/courses/${course.id}/modules/${firstModule.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="container-custom">
        <div className="mb-6">
          <Link to="/courses" className="text-blue-600 dark:text-blue-400">← Back to courses</Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">{course.title}</h1>
              <p className="text-gray-700 dark:text-gray-300 mb-4">{course.description}</p>
              <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <span>⏱️ {course.duration} min</span>
                <span>📚 {totalLessonCount} lessons</span>
                <span className="capitalize">Level: {course.level}</span>
              </div>
              {progress?.courseProgress && (
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded h-2">
                    <div className="bg-blue-600 h-2 rounded" style={{ width: `${progress.courseProgress.progressPercentage}%` }}></div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {Math.round(progress.courseProgress.progressPercentage)}% complete
                  </div>
                </div>
              )}
              <button onClick={startCourse} className="btn-primary">Start course</button>
            </div>
            {course.thumbnail && (
              <img src={course.thumbnail} alt={course.title} className="w-64 h-40 object-cover rounded" />
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="border-b dark:border-gray-700 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Modules</h2>
          </div>
          <ul className="divide-y dark:divide-gray-700">
            {sortedModules.map((mod) => {
              const lessonCount = (mod.lessons || []).length;
              return (
                <li key={mod.id}>
                  <Link
                    to={`/courses/${course.id}/modules/${mod.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{mod.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{lessonCount} lesson{lessonCount !== 1 ? 's' : ''}</p>
                    </div>
                    <span className="text-blue-600 dark:text-blue-400">View lessons →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;


