import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import { useReveal } from '../lib/useReveal';
import EconomicsNextAction from '../components/learning/EconomicsNextAction';
import LearningProgressSummary from '../components/learning/LearningProgressSummary';
import { LearningCard, LearningPageHeader, LearningSection } from '../components/learning/LearningChrome';
import { BookOpenIcon } from '@heroicons/react/24/outline';

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  useReveal();
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
        if (isAuthenticated) {
          try {
            const prog = await api.getCourseProgress(courseId);
            setProgress(prog);
          } catch {
            // ignore when progress is unavailable
          }
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [courseId, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <CapletLoader message="Loading course…" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center px-6">
        <div className="text-center max-w-md mx-auto bg-surface-raised rounded-3xl p-10 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
          <h2 className="font-display text-3xl font-extrabold tracking-tight mb-4">
            {error || 'Course not found'}
          </h2>
          <p className="text-text-muted mb-8">The course you're looking for doesn't exist or may have been moved.</p>
          <Link to="/courses" className="btn-primary py-3 px-8">
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  const sortedModules = (course.modules || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const totalLessonCount = sortedModules.reduce((sum, m) => sum + (m.lessons || []).length, 0);
  const isEconomicsPath = String(course.metadata?.subject || '').toLowerCase() === 'economics'
    || (course.tags || []).some((tag) => String(tag).toLowerCase() === 'economics');

  const startCourse = () => {
    const resume = progress?.courseProgress?.nextLesson;
    if (resume?.id) {
      const suffix = Number(resume.lastSlideIndex) > 0 ? `?slide=${resume.lastSlideIndex}` : '';
      navigate(`/courses/${course.id}/lessons/${resume.id}${suffix}`);
      return;
    }
    const firstModule = sortedModules[0];
    if (firstModule) navigate(`/courses/${course.id}/modules/${firstModule.id}`);
  };

  return (
    <div className="min-h-screen bg-surface-body pb-28 pt-24 selection:bg-accent selection:text-white md:pt-28">
      <div className="container-custom">
        <nav aria-label="Breadcrumb" className="mb-7 flex flex-wrap items-center gap-2 text-sm font-bold text-text-muted">
          <Link to="/library" className="min-h-11 content-center transition-colors hover:text-accent">Learn</Link><span aria-hidden="true">/</span><Link to="/courses" className="min-h-11 content-center transition-colors hover:text-accent">Learning paths</Link>
        </nav>

        <div className="mb-12 reveal">
          <LearningPageHeader eyebrow="Learning path" title={course.title} description={course.description || course.shortDescription} />
          <div className="mt-8">
            {course.thumbnail && (
              <div className="aspect-[21/8] w-full max-w-4xl overflow-hidden rounded-3xl bg-surface-soft shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {/* Course info card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16 reveal-stagger">
          <div className="lg:col-span-8">
            <div className="bg-surface-raised rounded-3xl p-8 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="rounded-2xl block-cream p-5">
                  <p className="text-xs font-bold text-text-muted mb-1">Duration</p>
                  <p className="font-display text-xl font-bold tracking-tight">{course.duration} minutes</p>
                </div>
                <div className="rounded-2xl block-cream p-5">
                  <p className="text-xs font-bold text-text-muted mb-1">Lessons</p>
                  <p className="font-display text-xl font-bold tracking-tight">{totalLessonCount} lessons</p>
                </div>
                <div className="rounded-2xl block-cream p-5">
                  <p className="text-xs font-bold text-text-muted mb-1">Level</p>
                  <p className="font-display text-xl font-bold tracking-tight capitalize">{course.level}</p>
                </div>
              </div>

              {progress?.courseProgress && <LearningProgressSummary className="mb-8 bg-surface-soft shadow-none" label="Your learning-path progress" completed={progress.courseProgress.completedLessons} total={progress.courseProgress.totalLessons} detail={progress.courseProgress.nextLesson?.title ? `Next: ${progress.courseProgress.nextLesson.title}` : 'Every completed lesson is saved.'} />}

              <button
                onClick={startCourse}
                className="btn-primary py-3 px-10 hover:-translate-y-0.5 transition-transform"
              >
                {progress?.courseProgress?.status === 'in_progress' ? `Continue ${progress.courseProgress.nextLesson?.title || 'learning'}` : 'Start learning path'}
              </button>
            </div>
          </div>

          {/* Learning outcomes or metadata sidebar */}
          {course.learningOutcomes && course.learningOutcomes.length > 0 ? (
            <aside className="lg:col-span-4 block-blue rounded-3xl p-8 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
              <h3 className="font-display text-lg font-bold tracking-tight mb-4">What You'll Learn</h3>
              <ul className="space-y-3">
                {course.learningOutcomes.map((outcome, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                    <span className="text-accent mt-0.5">&#10003;</span>
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </aside>
          ) : (
            <aside className="lg:col-span-4 block-blue rounded-3xl p-8 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] flex flex-col justify-center">
              <h3 className="font-display text-lg font-bold tracking-tight mb-2">About This Course</h3>
              <p className="text-sm text-text-primary leading-relaxed">
                This course is part of Caplet's free financial education program. Every module is built for clarity and practical understanding.
              </p>
            </aside>
          )}
        </div>

        {isEconomicsPath && <EconomicsNextAction source="course" className="mb-16" />}

        <LearningSection eyebrow="Your route" title="Modules" description={`${sortedModules.length} ordered modules. Completed work stays available for review.`} className="reveal">
          <div className="grid gap-4 md:grid-cols-2 reveal-stagger">
            {sortedModules.map((mod, index) => {
              const moduleLessons = (mod.lessons || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
              const lessonCount = moduleLessons.length;
              const mp = progress?.moduleProgress?.find((m) => String(m.moduleId) === String(mod.id));
              const completedInModule = mp ? mp.completedLessons : 0;
              const totalInModule = mp ? mp.totalLessons : lessonCount;
              const percentage = totalInModule > 0 ? Math.round((completedInModule / totalInModule) * 100) : 0;

              return <LearningCard key={mod.id} title={`${index + 1}. ${mod.title}`} description={mod.description} href={`/courses/${course.id}/modules/${mod.id}`} kind="Course module" metadata={[`${lessonCount} lessons`]} status={percentage === 100 ? 'Complete' : percentage > 0 ? 'In progress' : 'Not started'} progress={percentage > 0 ? percentage : undefined} icon={BookOpenIcon} actionLabel={percentage > 0 && percentage < 100 ? 'Continue module' : percentage === 100 ? 'Review module' : 'Open module'} />;
            })}
          </div>

          {sortedModules.length === 0 && (
            <div className="py-20 text-center rounded-3xl block-cream shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
              <p className="text-lg text-text-muted">
                No modules available yet.
              </p>
            </div>
          )}
        </LearningSection>
      </div>
    </div>
  );
};


export default CourseDetail;
