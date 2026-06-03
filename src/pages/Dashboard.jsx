import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCourses } from '../contexts/CoursesContext';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import {
    BookOpenIcon,
    AcademicCapIcon,
    FireIcon,
    ArrowRightIcon,
    CheckCircleIcon,
    BookmarkIcon,
    CalculatorIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';

const SectionHeading = ({ kicker, title, action }) => (
    <div className="mb-8 flex items-end justify-between gap-6">
        <div>
            <span className="section-kicker">{kicker}</span>
            <h2 className="font-serif text-4xl italic">{title}</h2>
        </div>
        {action}
    </div>
);

const ProgressBar = ({ value }) => (
    <div className="h-1 w-full overflow-hidden bg-surface-soft">
        <div
            className="h-full bg-accent transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(Math.max(Number(value) || 0, 0), 100)}%` }}
        />
    </div>
);

export default function Dashboard() {
    const { user } = useAuth();
    const { courses, loading: coursesLoading, hasFetched, fetchCourses } = useCourses();
    const [userProgress, setUserProgress] = useState([]);
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState([]);
    const [savedSlides, setSavedSlides] = useState([]);
    const [dashboardError, setDashboardError] = useState(null);

    useEffect(() => {
        if (!hasFetched && !coursesLoading) {
            fetchCourses().catch(() => {
                // Sidebar can render without courses when unavailable.
            });
        }
    }, [coursesLoading, fetchCourses, hasFetched]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [progressData, classesData, savedSlidesData] = await Promise.all([
                    api.getUserProgress(),
                    api.getClasses(),
                    api.getSavedSlides().catch(() => null),
                ]);
                setUserProgress(progressData?.progress || []);
                const allClasses = [
                    ...(classesData?.teaching || []),
                    ...(classesData?.student || [])
                ];
                setClasses(allClasses);
                setSavedSlides(savedSlidesData?.savedSlides || []);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
                setDashboardError(error?.message || 'Failed to load dashboard data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading || coursesLoading) {
        return (
            <div className="min-h-screen bg-surface-body flex items-center justify-center">
                <CapletLoader message="Loading your dashboard…" />
            </div>
        );
    }

    const progressEntries = userProgress || [];
    const inProgressCourses = progressEntries.filter(p => p.status === 'in_progress');
    const completedCourses = progressEntries.filter(p => p.status === 'completed');
    const lastAccessed = [...progressEntries].sort((a, b) => new Date(b.lastAccessedAt) - new Date(a.lastAccessedAt))[0];
    const lastAccessedCourse = lastAccessed ? courses.find(c => c.id === lastAccessed.courseId) : null;
    const beginnerCourse = courses.find(course => course.level?.toLowerCase() === 'beginner') || courses[0];
    const hasProgress = progressEntries.length > 0;
    const nextCourse = lastAccessedCourse || beginnerCourse;
    const totalProgress = progressEntries.length
        ? Math.round(progressEntries.reduce((sum, item) => sum + (Number(item.progressPercentage) || 0), 0) / progressEntries.length)
        : 0;

    if (dashboardError) {
        return (
            <div className="min-h-screen bg-surface-body flex items-center justify-center p-6">
                <ErrorState
                    title="Dashboard could not be loaded."
                    message="We could not load your dashboard data right now. Please refresh the page to try again."
                    details={dashboardError}
                    action={(
                        <button type="button" onClick={() => window.location.reload()} className="btn-primary py-3 px-8">
                            Refresh Dashboard
                        </button>
                    )}
                    className="max-w-xl w-full"
                />
            </div>
        );
    }

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Good morning';
        if (hour >= 12 && hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <PageShell>
            <div className="space-y-24">
                {/* 1. Greeting */}
                <PageHeader
                    kicker="Welcome back"
                    title={`${getGreeting()}, ${user?.firstName || 'Student'}.`}
                    description={hasProgress
                        ? `You have ${inProgressCourses.length} active ${inProgressCourses.length === 1 ? 'course' : 'courses'} in progress. Pick up where you left off or review saved slides.`
                        : 'Your dashboard is ready. Start with a beginner-friendly course or try a practical calculator.'}
                    className="reveal-text"
                />

                {/* 2. Primary next action */}
                <section className="reveal-text stagger-1">
                    <SectionHeading kicker="Next action" title={hasProgress ? 'Resume your momentum.' : 'Start here.'} />
                    <Card className="relative overflow-hidden p-10 md:p-12">
                        <div className="absolute inset-0 opacity-40 grid-technical" />
                        <div className="relative z-10 grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
                            <div>
                                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white">
                                    {hasProgress ? <BookOpenIcon className="h-6 w-6" /> : <SparklesIcon className="h-6 w-6" />}
                                </div>
                                <span className="section-kicker">{hasProgress ? 'Continue learning' : 'Beginner recommendation'}</span>
                                <h2 className="text-4xl md:text-5xl">
                                    {nextCourse?.title || 'Explore the course library'}
                                </h2>
                                <p className="mt-6 max-w-2xl text-base font-medium leading-relaxed text-text-muted">
                                    {hasProgress && lastAccessed
                                        ? `You were last working through this course and are ${Math.round(lastAccessed.progressPercentage || 0)}% complete.`
                                        : 'A beginner course is the best first step before moving into calculators, revision, and class work.'}
                                </p>
                                {hasProgress && lastAccessed && <div className="mt-8 max-w-xl"><ProgressBar value={lastAccessed.progressPercentage} /></div>}
                                <div className="mt-10 flex flex-wrap gap-4">
                                    {nextCourse ? (
                                        <Button to={`/courses/${nextCourse.id}`}>{hasProgress ? 'Continue module' : 'Start beginner course'}</Button>
                                    ) : (
                                        <Button to="/courses">Browse courses</Button>
                                    )}
                                    <Button to="/revision" tone="secondary">Review saved slides</Button>
                                </div>
                            </div>
                            {!hasProgress && (
                                <Card className="bg-surface-body p-8">
                                    <span className="section-kicker">Practical tool</span>
                                    <h3 className="text-2xl">Budget Planner or Savings Goal</h3>
                                    <p className="mt-4 text-sm font-medium leading-relaxed text-text-muted">
                                        Use the Budget Planner to map money coming in and going out, or the Savings Goal calculator to plan a target.
                                    </p>
                                    <div className="mt-8 flex flex-wrap gap-4">
                                        <Button to="/tools" className="px-6 py-3">Open tools</Button>
                                        <Button to="/courses" tone="secondary" className="px-6 py-3">View all courses</Button>
                                    </div>
                                </Card>
                            )}
                        </div>
                    </Card>
                </section>

                {/* Non-personalized start panel for users with no progress */}
                {!hasProgress && (
                    <section className="reveal-text stagger-2">
                        <Card className="grid gap-px overflow-hidden bg-line-soft md:grid-cols-2">
                            <div className="bg-surface-body p-10">
                                <BookOpenIcon className="mb-8 h-8 w-8 text-accent" />
                                <span className="section-kicker">Start here</span>
                                <h3 className="text-3xl">Recommended beginner course</h3>
                                <p className="mt-5 text-sm font-medium leading-relaxed text-text-muted">
                                    {beginnerCourse?.title || 'Browse beginner lessons'} to build financial confidence from the basics.
                                </p>
                                <Button to="/courses" tone="secondary" className="mt-8 inline-flex px-6 py-3">Go to courses</Button>
                            </div>
                            <div className="bg-surface-body p-10">
                                <CalculatorIcon className="mb-8 h-8 w-8 text-accent" />
                                <span className="section-kicker">Try a calculator</span>
                                <h3 className="text-3xl">Budget Planner or Savings Goal</h3>
                                <p className="mt-5 text-sm font-medium leading-relaxed text-text-muted">
                                    Plan a weekly budget or set a savings target with practical tools before starting revision.
                                </p>
                                <Button to="/tools" tone="secondary" className="mt-8 inline-flex px-6 py-3">Go to tools</Button>
                            </div>
                        </Card>
                    </section>
                )}

                {/* 3. Progress summary */}
                <section className="reveal-text stagger-2">
                    <SectionHeading kicker="Progress" title="Your learning summary." />
                    <div className="grid grid-cols-1 gap-px border border-line-soft bg-line-soft md:grid-cols-4">
                        <StatCard label="Modules active" value={inProgressCourses.length} icon={BookOpenIcon} />
                        <StatCard label="Completed" value={completedCourses.length} icon={CheckCircleIcon} />
                        <StatCard label="Academy classes" value={classes.length} icon={AcademicCapIcon} />
                        <StatCard label="Average progress" value={`${totalProgress}%`} icon={FireIcon} />
                    </div>
                </section>

                <div className="grid grid-cols-1 gap-20 lg:grid-cols-12">
                    <div className="space-y-20 lg:col-span-8">
                        {/* 4. Continue learning */}
                        <section className="reveal-text stagger-3">
                            <SectionHeading
                                kicker="Continue learning"
                                title="Courses in motion."
                                action={<Link to="/courses" className="text-[10px] font-bold uppercase tracking-widest text-accent border-b border-accent pb-1">All Courses</Link>}
                            />
                            {inProgressCourses.length > 0 ? (
                                <div className="grid grid-cols-1 gap-px border border-line-soft bg-line-soft">
                                    {inProgressCourses.slice(0, 3).map(progress => {
                                        const course = courses.find(c => c.id === progress.courseId);
                                        if (!course) return null;

                                        return (
                                            <Link key={progress.courseId} to={`/courses/${course.id}`} className="group bg-surface-body p-8 transition-colors hover:bg-surface-raised">
                                                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                                                    <div>
                                                        <p className="text-xl font-bold uppercase tracking-tight transition-colors group-hover:text-accent">{course.title}</p>
                                                        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim">Progress: {Math.round(progress.progressPercentage || 0)}%</p>
                                                    </div>
                                                    <ArrowRightIcon className="h-5 w-5 text-text-dim transition-transform group-hover:translate-x-2" />
                                                </div>
                                                <div className="mt-6"><ProgressBar value={progress.progressPercentage} /></div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            ) : (
                                <EmptyState
                                    title="No courses in progress yet"
                                    description="Start a beginner course from the library to populate this section."
                                    actions={<Button to="/courses">Browse courses</Button>}
                                />
                            )}
                        </section>

                        {/* 5. Classes */}
                        <section className="reveal-text stagger-3">
                            <SectionHeading
                                kicker="Classes"
                                title="Academy spaces."
                                action={<Link to="/classes" className="text-[10px] font-bold uppercase tracking-widest text-accent border-b border-accent pb-1">All Classes</Link>}
                            />
                            {classes.length > 0 ? (
                                <div className="grid grid-cols-1 gap-px border border-line-soft bg-line-soft">
                                    {classes.slice(0, 3).map(cls => (
                                        <Link key={cls.id} to={`/classes/${cls.id}`} className="group flex items-center justify-between bg-surface-body p-8 transition-colors hover:bg-surface-raised">
                                            <div>
                                                <p className="text-lg font-bold uppercase tracking-tight transition-colors group-hover:text-accent">{cls.name}</p>
                                                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim">{cls.code}</p>
                                            </div>
                                            <ArrowRightIcon className="h-5 w-5 text-text-dim transition-transform group-hover:translate-x-2" />
                                        </Link>
                                    ))
                                ) : (
                                    <EmptyState
                                        eyebrow="Academy"
                                        title="No active classes yet."
                                        message="Join or create a class to see recent academy activity here."
                                        compact
                                        className="bg-surface-body"
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-20">
                        <div className="reveal-text stagger-3">
                            <span className="section-kicker">My Courses</span>
                            <div className="mt-8 space-y-6">
                                {courses.length > 0 ? (
                                    courses.slice(0, 4).map(course => (
                                        <Link
                                            key={course.id}
                                            to={`/courses/${course.id}`}
                                            className="group flex w-full items-center justify-between gap-4 border border-line-soft bg-surface-body px-5 py-4 hover:bg-surface-raised transition-colors"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-bold uppercase tracking-widest truncate group-hover:text-accent transition-colors">{course.title}</p>
                                                <p className="text-[9px] font-bold text-text-dim uppercase tracking-[0.3em] mt-1">{course.duration}m Duration</p>
                                            </div>
                                            <ArrowRightIcon className="w-4 h-4 shrink-0 text-text-dim group-hover:text-accent group-hover:translate-x-1 transition-all" />
                                        </Link>
                                    ))
                                ) : (
                                    <EmptyState
                                        eyebrow="Courses"
                                        title="No courses available."
                                        message="Published courses will appear here when available."
                                        compact
                                    />
                                )}
                            </div>
                        </section>

                        {/* 7. Revision */}
                        <section className="reveal-text stagger-3">
                            <SectionHeading kicker="Revision" title="Saved for later." />
                            <Card
                                as={Link}
                                to="/revision"
                                className="group flex w-full items-center justify-between gap-4 bg-surface-body px-5 py-4 transition-colors hover:bg-surface-raised"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <BookmarkIcon className="h-4 w-4 shrink-0 text-accent" />
                                    <div className="min-w-0">
                                        <p className="truncate text-[11px] font-bold uppercase tracking-widest transition-colors group-hover:text-accent">Archived slides</p>
                                        <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.3em] text-text-dim">
                                            {savedSlides.length} {savedSlides.length === 1 ? 'Slide' : 'Slides'} Flagged
                                        </p>
                                    </div>
                                </div>
                                <ArrowRightIcon className="h-4 w-4 shrink-0 text-text-dim transition-all group-hover:translate-x-1 group-hover:text-accent" />
                            </Card>
                        </section>

                        <Card className="relative overflow-hidden bg-surface-inverse p-12 text-surface-body">
                            <div className="absolute inset-0 opacity-10 grid-technical !bg-[size:40px_40px]" />
                            <div className="relative z-10">
                                <FireIcon className="mb-8 h-10 w-10 text-accent" />
                                <h4 className="mb-6 font-serif text-xl italic">Daily Insight</h4>
                                <blockquote className="mb-8 text-sm font-medium italic leading-relaxed text-text-dim">
                                    &quot;Compound interest is the eighth wonder of the world. He who understands it, earns it... he who doesn't... pays it.&quot;
                                </blockquote>
                                <p className="text-[9px] font-bold uppercase tracking-widest text-accent">Source: Albert Einstein</p>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </PageShell>
    );
}
