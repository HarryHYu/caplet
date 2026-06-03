import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, ExclamationTriangleIcon, PlayCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import { Badge, Button, Card, EmptyState, PageHeader, PageShell, SectionHeader } from '../components/ui';

export default function ModuleDetail() {
  const { courseId, moduleId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
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
        if (isAuthenticated) {
          try {
            const prog = await api.getCourseProgress(courseId);
            setProgress(prog);
          } catch {
            // Progress is optional for public module browsing.
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

  useEffect(() => {
    if (!course?.modules) return;
    const mod = course.modules.find((moduleItem) => String(moduleItem.id) === String(moduleId));
    setModule_(mod || null);
  }, [course, moduleId]);

  if (loading) {
    return (
      <PageShell spacing="sm" className="flex items-center justify-center">
        <CapletLoader message="Loading module…" />
      </PageShell>
    );
  }

  if (error || !course) {
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

  if (!module_) {
    return (
      <PageShell spacing="sm" className="flex items-center justify-center">
        <EmptyState
          icon={ExclamationTriangleIcon}
          title="Module not found"
          action={<Button as={Link} to={`/courses/${courseId}`} variant="secondary">Back to course</Button>}
        >
          This module does not exist or may have been moved.
        </EmptyState>
      </PageShell>
    );
  }

  const lessons = (module_.lessons || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const lessonHasContent = (lesson) => {
    const { slides } = lesson;
    if (Array.isArray(slides) && slides.length > 0) return true;
    if (typeof slides === 'string' && slides.trim()) {
      try {
        const parsed = JSON.parse(slides);
        if (Array.isArray(parsed) && parsed.length > 0) return true;
      } catch {
        // Ignore malformed slide JSON; fall back to other content fields.
      }
    }
    if (lesson.content && String(lesson.content).trim()) return true;
    if (lesson.videoUrl && String(lesson.videoUrl).trim()) return true;
    return false;
  };

  const isLessonComplete = (lesson) => {
    if (!lessonHasContent(lesson)) return false;
    return progress?.lessonProgress?.some((item) => String(item.lessonId) === String(lesson.id) && item.status === 'completed');
  };

  const completedInModule = lessons.filter(isLessonComplete).length;
  const totalInModule = lessons.length;
  const progressWidth = totalInModule > 0 ? (completedInModule / totalInModule) * 100 : 0;
  const firstLesson = lessons[0];

  return (
    <PageShell spacing="md">
      <Button onClick={() => navigate(`/courses/${courseId}`)} variant="ghost" size="sm" className="mb-8 -ml-3">
        <ArrowLeftIcon className="h-4 w-4" /> Course overview
      </Button>

      <PageHeader
        eyebrow={course.title}
        title={module_.title}
        actions={
          <Button as={firstLesson ? Link : 'button'} to={firstLesson ? `/courses/${courseId}/lessons/${firstLesson.id}` : undefined} disabled={!firstLesson}>
            Start lessons <ArrowRightIcon className="h-4 w-4" />
          </Button>
        }
      >
        {module_.description || 'A focused module with short lessons and practical explanations.'}
      </PageHeader>

      <Card padding="lg" className="mb-14">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm text-text-muted">
              <span>Module progress</span>
              <span className="font-semibold text-accent">{completedInModule} of {totalInModule} completed</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-soft">
              <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${progressWidth}%` }} />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge variant="neutral">{lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}</Badge>
            {progressWidth === 100 && <Badge variant="success">Complete</Badge>}
          </div>
        </div>
      </Card>

      <SectionHeader title="Lessons" actions={<Badge variant="neutral">{lessons.length} total</Badge>}>
        Open each lesson to review content, complete activities, and build your progress through the module.
      </SectionHeader>

      {lessons.length > 0 ? (
        <div className="space-y-3">
          {lessons.map((lesson, index) => {
            const complete = isLessonComplete(lesson);
            const hasContent = lessonHasContent(lesson);

            return (
              <Card
                key={lesson.id}
                as={Link}
                to={`/courses/${courseId}/lessons/${lesson.id}`}
                interactive
                className="group grid gap-5 sm:grid-cols-[auto_1fr_auto] sm:items-center"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-soft font-mono text-sm font-bold text-text-muted">
                  {String(lesson.order || index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="truncate text-lg font-bold tracking-tight text-text-primary transition-colors group-hover:text-accent">{lesson.title}</h3>
                    {complete && <Badge variant="success">Completed</Badge>}
                    {!hasContent && <Badge variant="warning">Preview</Badge>}
                  </div>
                  {lesson.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-muted">{lesson.description}</p>}
                </div>
                <div className="flex items-center gap-3 text-sm font-semibold text-text-muted transition-colors group-hover:text-accent">
                  <PlayCircleIcon className="h-5 w-5" />
                  <span>{complete ? 'Review' : 'Start lesson'}</span>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={CheckCircleIcon} title="No lessons available yet">
          This module has been created, but lessons are not published yet. Check back soon.
        </EmptyState>
      )}
    </PageShell>
  );
}
