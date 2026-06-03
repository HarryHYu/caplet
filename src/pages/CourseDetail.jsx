import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  RectangleStackIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import { Badge, Button, Card, EmptyState, PageHeader, PageShell, SectionHeader, StatCard } from '../components/ui';

export default function CourseDetail() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
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
            // Progress is optional for public course browsing.
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
    return <LoadingState message="Loading course…" />;
  }

  if (error) {
    return (
      <PageShell spacing="sm" className="flex items-center justify-center">
        <CapletLoader message="Loading course…" />
      </PageShell>
    );
  }

  if (!course) {
    return (
      <PageShell spacing="sm" className="flex items-center justify-center">
        <EmptyState
          icon={ExclamationTriangleIcon}
          title={error || 'Course not found'}
          action={<Button as={Link} to="/courses" variant="secondary">Back to courses</Button>}
        >
          The course you are looking for does not exist or may have been moved.
        </EmptyState>
      </PageShell>
    );
  }

  const sortedModules = (course.modules || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const totalLessonCount = sortedModules.reduce((sum, moduleItem) => sum + (moduleItem.lessons || []).length, 0);
  const courseProgress = Math.round(progress?.courseProgress?.progressPercentage || 0);

  const startCourse = () => {
    const firstModule = sortedModules[0];
    if (firstModule) navigate(`/courses/${course.id}/modules/${firstModule.id}`);
  };

  return (
    <PageShell spacing="md">
      <Button onClick={() => navigate('/courses')} variant="ghost" size="sm" className="mb-8 -ml-3">
        <ArrowLeftIcon className="h-4 w-4" /> All courses
      </Button>

      <PageHeader
        eyebrow={course.level || 'Course'}
        title={course.title}
        actions={
          <Button onClick={startCourse} disabled={sortedModules.length === 0}>
            {courseProgress > 0 ? 'Continue learning' : 'Start course'} <ArrowRightIcon className="h-4 w-4" />
          </Button>
        }
      >
        {course.description || course.shortDescription || 'A practical Caplet course designed for clear financial learning.'}
      </PageHeader>

      <div className="mb-14 grid gap-5 lg:grid-cols-3">
        <StatCard icon={ClockIcon} label="Duration" value={course.duration ? `${course.duration}m` : 'Self-paced'} footer="Short lessons that fit around busy days." />
        <StatCard icon={BookOpenIcon} label="Lessons" value={totalLessonCount} footer={`${sortedModules.length} ${sortedModules.length === 1 ? 'module' : 'modules'} in this pathway.`} />
        <StatCard icon={RectangleStackIcon} label="Level" value={course.level || 'Beginner'} footer="Built with practical explanations and examples." />
      </div>

      <div className="mb-16 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card padding="lg">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <Badge variant="accent" className="mb-3">Course overview</Badge>
              <h2 className="text-2xl font-bold tracking-tight text-text-primary">Your learning path</h2>
            </div>
            {isAuthenticated && <Badge variant={courseProgress === 100 ? 'success' : 'neutral'}>{courseProgress}% complete</Badge>}
          </div>
          {isAuthenticated ? (
            <div>
              <div className="mb-2 flex justify-between text-sm text-text-muted">
                <span>Saved progress</span>
                <span className="font-semibold text-accent">{courseProgress}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-surface-soft">
                <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${courseProgress}%` }} />
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 text-text-muted">
              You can preview the course publicly. Sign in to save your progress and continue modules from any device.
            </p>
          )}
        </Card>

        <Card padding="lg" variant="soft">
          <h2 className="text-xl font-bold tracking-tight text-text-primary">What you will learn</h2>
          {course.learningOutcomes?.length > 0 ? (
            <ul className="mt-5 space-y-3">
              {course.learningOutcomes.map((outcome) => (
                <li key={outcome} className="flex items-start gap-3 text-sm leading-6 text-text-muted">
                  <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm leading-6 text-text-muted">
              This course focuses on clear explanations, practical examples, and confidence-building steps.
            </p>
          )}
        </Card>
      </div>

      <SectionHeader
        title="Modules"
        actions={<Badge variant="neutral">{sortedModules.length} {sortedModules.length === 1 ? 'module' : 'modules'}</Badge>}
      >
        Work through the course in order, or jump into the module that matches what you need today.
      </SectionHeader>

      {sortedModules.length > 0 ? (
        <div className="space-y-3">
          {sortedModules.map((moduleItem, index) => {
            const moduleLessons = (moduleItem.lessons || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            const lessonCount = moduleLessons.length;
            const moduleProgress = progress?.moduleProgress?.find((item) => String(item.moduleId) === String(moduleItem.id));
            const completedInModule = moduleProgress ? moduleProgress.completedLessons : 0;
            const totalInModule = moduleProgress ? moduleProgress.totalLessons : lessonCount;
            const percentage = totalInModule > 0 ? Math.round((completedInModule / totalInModule) * 100) : 0;

            return (
              <Card
                key={moduleItem.id}
                as={Link}
                to={`/courses/${course.id}/modules/${moduleItem.id}`}
                interactive
                className="group grid gap-5 sm:grid-cols-[auto_1fr_auto] sm:items-center"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft font-mono text-sm font-bold text-text-muted">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold tracking-tight text-text-primary transition-colors group-hover:text-accent">{moduleItem.title}</h3>
                  <p className="mt-1 text-sm text-text-muted">{lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}</p>
                  {percentage > 0 && (
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-soft">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${percentage}%` }} />
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  {percentage === 100 && <Badge variant="success">Complete</Badge>}
                  <span className="text-sm font-semibold text-text-muted transition-colors group-hover:text-accent">View module →</span>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={RectangleStackIcon} title="No modules available yet">
          This course has been created, but its modules are not published yet. Check back soon.
        </EmptyState>
      )}
    </PageShell>
  );
}
