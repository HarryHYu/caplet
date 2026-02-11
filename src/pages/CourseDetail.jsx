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
      <div className="min-h-screen flex items-center justify-center page-section-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand border-t-transparent mx-auto"></div>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            Loading course blueprint...
          </p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center page-section-light">
        <div className="text-center max-w-md mx-auto px-6">
          <span className="section-kicker mb-4">System Notice</span>
          <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-6">
            {error || 'Course not found'}
          </p>
          <Link
            to="/courses"
            className="btn-secondary"
          >
            Return to Library
          </Link>
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
    <div className="min-h-screen py-24 page-section-light">
      <div className="container-custom">
        <div className="mb-10 animate-slide-up">
          <button
            onClick={() => navigate('/courses')}
            className="mb-6 inline-flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest hover:text-brand transition-colors"
          >
            ← Back to Library
          </button>
          <span className="section-kicker mb-4">Course Blueprint</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-black dark:text-white uppercase tracking-tighter mb-4">
            {course.title}
          </h1>
          {course.description && (
            <p className="text-lg text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed max-w-2xl">
              {course.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16 reveal-up" style={{ animationDelay: '120ms' }}>
          <div className="lg:col-span-8">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 p-10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8 mb-8">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                    <span>Duration: {course.duration} Minutes</span>
                    <span>Units: {totalLessonCount}</span>
                    <span className="capitalize">Level: {course.level}</span>
                  </div>
                  {progress?.courseProgress && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        <span>Sequence Completion</span>
                        <span className="text-black dark:text-white">
                          {Math.round(progress.courseProgress.progressPercentage)}%
                        </span>
                      </div>
                      <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                        <div
                          className="h-full bg-brand transition-all duration-1000"
                          style={{ width: `${progress.courseProgress.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={startCourse}
                  className="btn-primary px-10 py-4 text-[10px] tracking-[0.25em]"
                >
                  Initialize Course
                </button>
              </div>
              {course.thumbnail && (
                <div className="mt-4">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full max-w-xl aspect-video object-cover border border-zinc-100 dark:border-zinc-900"
                  />
                </div>
              )}
            </div>
          </div>

          <aside className="lg:col-span-4 space-y-6">
            <div className="p-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900">
              <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-5">
                Course Summary
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                This course is part of the institutional CapletEdu curriculum and is structured into modules and
                lessons that can be mapped directly into classroom sequences.
              </p>
            </div>
          </aside>
        </div>

        <div className="reveal-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">
              Module Sequence ({sortedModules.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {sortedModules.map((mod, index) => {
              const moduleLessons = (mod.lessons || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
              const lessonCount = moduleLessons.length;
              const mp = progress?.moduleProgress?.find((m) => String(m.moduleId) === String(mod.id));
              const completedInModule = mp ? mp.completedLessons : 0;
              const totalInModule = mp ? mp.totalLessons : lessonCount;
              const percentage =
                totalInModule > 0 ? Math.round((completedInModule / totalInModule) * 100) : 0;

              return (
                <Link
                  key={mod.id}
                  to={`/courses/${course.id}/modules/${mod.id}`}
                  className="group bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 px-8 py-6 flex items-center justify-between hover:border-brand transition-all"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="flex items-center gap-6 min-w-0">
                    <span className="text-2xl font-black text-zinc-200 dark:text-zinc-800 tabular-nums">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-black dark:text-white uppercase tracking-tight mb-1 truncate">
                        {mod.title}
                      </p>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
                        {lessonCount} lesson{lessonCount !== 1 ? 's' : ''} · {percentage}% complete
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest group-hover:text-brand group-hover:translate-x-1 transition-all">
                    Open Module →
                  </span>
                </Link>
              );
            })}
          </div>

          {sortedModules.length === 0 && (
            <div className="mt-10 p-16 text-center border border-zinc-100 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950">
              <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-[0.3em]">
                Zero modules detected for this course.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
