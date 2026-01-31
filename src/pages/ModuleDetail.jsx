import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';

const ModuleDetail = () => {
  const { courseId, moduleId } = useParams();
  const [course, setCourse] = useState(null);
  const [module_, setModule_] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ lessonProgress: [] });

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

  useEffect(() => {
    if (!course?.modules) return;
    const mod = course.modules.find((m) => m.id === moduleId);
    setModule_(mod || null);
  }, [course, moduleId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
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

  if (!module_) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">Module not found</p>
          <Link to={`/courses/${courseId}`} className="mt-4 inline-block text-blue-600 dark:text-blue-400">Back to course</Link>
        </div>
      </div>
    );
  }

  const lessons = (module_.lessons || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const mp = progress?.moduleProgress?.find((m) => String(m.moduleId) === String(moduleId));

  const lessonHasContent = (l) => {
    const slides = l.slides;
    if (Array.isArray(slides) && slides.length > 0) return true;
    if (typeof slides === 'string' && slides.trim()) {
      try { const p = JSON.parse(slides); if (Array.isArray(p) && p.length > 0) return true; } catch { /* noop */ }
    }
    if (l.content && String(l.content).trim()) return true;
    if (l.videoUrl && String(l.videoUrl).trim()) return true;
    return false;
  };
  const isLessonComplete = (l) => {
    if (!lessonHasContent(l)) return false;
    return progress?.lessonProgress?.some((p) => String(p.lessonId) === String(l.id) && p.status === 'completed');
  };
  const completedInModule = lessons.filter(isLessonComplete).length;
  const totalInModule = lessons.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="container-custom">
        <div className="mb-6">
          <Link to={`/courses/${courseId}`} className="text-blue-600 dark:text-blue-400">← Back to {course.title}</Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{module_.title}</h1>
          {module_.description && (
            <p className="text-gray-600 dark:text-gray-300">{module_.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">{lessons.length} lessons</p>
            {totalInModule > 0 && (
              <>
                <span className="text-gray-400">•</span>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {completedInModule} / {totalInModule} complete
                </p>
                <div className="flex-1 max-w-[200px] h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 dark:bg-green-400 rounded-full transition-all"
                    style={{ width: `${(completedInModule / totalInModule) * 100}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="border-b dark:border-gray-700 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Lessons</h2>
          </div>
          <ul className="divide-y dark:divide-gray-700">
            {lessons.map((lesson) => (
              <li key={lesson.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{lesson.order}. {lesson.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {lesson.description}
                    {isLessonComplete(lesson.id) && (
                      <span className="ml-2 text-green-600 dark:text-green-400 font-medium">✓ Completed</span>
                    )}
                  </p>
                </div>
                <Link
                  to={`/courses/${courseId}/lessons/${lesson.id}`}
                  className="text-blue-600 dark:text-blue-400 font-medium"
                >
                  Open →
                </Link>
              </li>
            ))}
          </ul>
          {lessons.length === 0 && (
            <p className="px-6 py-8 text-gray-500 dark:text-gray-400">No lessons in this module yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModuleDetail;
