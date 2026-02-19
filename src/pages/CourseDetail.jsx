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
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-accent border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6 reveal-text">
          <span className="section-kicker">Status Error</span>
          <p className="text-3xl font-serif italic mb-12">
            {error || 'The requested curriculum entity could not be located.'}
          </p>
          <Link to="/courses" className="btn-primary py-4 px-12 text-[10px]">
            Return to Registry
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
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <div className="mb-24 reveal-text">
          <button
            onClick={() => navigate('/courses')}
            className="mb-12 inline-flex items-center gap-4 text-[10px] font-black text-text-dim uppercase tracking-[0.4em] hover:text-accent transition-colors"
          >
            ← Library Registry
          </button>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
            <div className="flex-1">
              <span className="section-kicker">Detailed Curriculum Spectrum</span>
              <h1 className="text-6xl md:text-8xl mb-12 max-w-4xl">
                {course.title}
              </h1>
              <p className="text-2xl text-text-muted font-serif italic max-w-2xl leading-relaxed">
                {course.description || course.shortDescription}
              </p>
            </div>
            {course.thumbnail && (
              <div className="w-full md:w-80 aspect-video md:aspect-square bg-surface-soft border border-line-soft p-1 overflow-hidden shrink-0">
                <img
                  src={course.thumbnail}
                  alt=""
                  className="w-full h-full object-cover grayscale opacity-80"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 mb-32 reveal-text stagger-1">
          <div className="lg:col-span-8">
            <div className="bg-surface-raised border border-line-soft p-12 relative overflow-hidden">
              <div className="absolute inset-0 opacity-5 grid-technical !bg-[size:30px_30px]" />
              <div className="relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim">Temporal Commitment</p>
                    <p className="text-xl font-bold">{course.duration} Minutes</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim">Structural Units</p>
                    <p className="text-xl font-bold">{totalLessonCount} Modules</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim">Sophistication Level</p>
                    <p className="text-xl font-bold capitalize">{course.level}</p>
                  </div>
                </div>

                {progress?.courseProgress && (
                  <div className="mb-16">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.4em] text-accent mb-4">
                      <span>Integration Status</span>
                      <span>{Math.round(progress.courseProgress.progressPercentage)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-soft overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-1000 ease-out"
                        style={{ width: `${progress.courseProgress.progressPercentage}%` }}
                      />
                    </div>
                    <p className="mt-4 text-[9px] font-bold uppercase tracking-widest text-text-dim italic">System authenticated. Syncing progression data across academy nodes.</p>
                  </div>
                )}

                <button
                  onClick={startCourse}
                  className="btn-primary py-5 px-16 text-[11px] w-full md:w-auto"
                >
                  {progress?.courseProgress ? 'Resume Terminal' : 'Initialize Curriculum'}
                </button>
              </div>
            </div>
          </div>

          <aside className="lg:col-span-4 bg-surface-inverse p-12 text-surface-body relative overflow-hidden flex flex-col justify-end min-h-[300px]">
            <div className="absolute inset-0 opacity-5 grid-technical !bg-[size:40px_40px]" />
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-accent mb-8 block">Protocol Note</span>
              <p className="text-lg font-serif italic leading-[1.6]">
                "This curriculum is part of the Caplet Intelligence Registry. All modules are peer-reviewed for academic precision and financial relevance."
              </p>
            </div>
          </aside>
        </div>

        <div className="reveal-text stagger-2">
          <div className="flex items-end justify-between mb-12 border-b border-line-soft pb-8">
            <div>
              <span className="section-kicker">Sequence</span>
              <h2 className="text-4xl font-serif italic">The Syllabus.</h2>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Section Count: {sortedModules.length}</p>
          </div>

          <div className="grid grid-cols-1 gap-px bg-line-soft border border-line-soft overflow-hidden">
            {sortedModules.map((mod, index) => {
              const moduleLessons = (mod.lessons || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
              const lessonCount = moduleLessons.length;
              const mp = progress?.moduleProgress?.find((m) => String(m.moduleId) === String(mod.id));
              const completedInModule = mp ? mp.completedLessons : 0;
              const totalInModule = mp ? mp.totalLessons : lessonCount;
              const percentage = totalInModule > 0 ? Math.round((completedInModule / totalInModule) * 100) : 0;

              return (
                <Link
                  key={mod.id}
                  to={`/courses/${course.id}/modules/${mod.id}`}
                  className="group bg-surface-body p-12 flex flex-col md:flex-row md:items-center justify-between transition-all duration-700 hover:bg-surface-raised relative overflow-hidden"
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-accent transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />

                  <div className="flex items-center gap-12 min-w-0 mb-8 md:mb-0">
                    <span className="text-5xl font-serif italic text-text-dim opacity-20 group-hover:opacity-40 transition-opacity tabular-nums">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-2xl font-bold text-text-primary uppercase tracking-tight mb-2 truncate group-hover:text-accent transition-colors">
                        {mod.title}
                      </h3>
                      <div className="flex items-center gap-4 text-[9px] font-bold uppercase tracking-[0.2em] text-text-dim">
                        <span>{lessonCount} Technical Units</span>
                        <span className="w-1 h-1 bg-line-soft rounded-full" />
                        <span className={percentage === 100 ? 'text-accent' : ''}>{percentage}% Integrity</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    {percentage === 100 && (
                      <div className="px-3 py-1 bg-accent/10 border border-accent/30 text-[9px] font-black uppercase text-accent tracking-widest">
                        Verified
                      </div>
                    )}
                    <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em] group-hover:text-accent group-hover:translate-x-2 transition-all">
                      View Unit Registry →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {sortedModules.length === 0 && (
            <div className="p-40 text-center border border-line-soft bg-surface-soft">
              <p className="text-xl font-serif italic text-text-dim">
                No technical modules found in this spectrum.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default CourseDetail;
