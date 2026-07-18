import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCourses } from '../contexts/CoursesContext';
import { useReveal } from '../lib/useReveal';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import ClassIcon from '../components/ClassIcon';
import LearningNextAction from '../components/learning/LearningNextAction';
import {
    BookOpenIcon,
    AcademicCapIcon,
    FireIcon,
    ArrowRightIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    BookmarkIcon,
    DocumentTextIcon,
    ClipboardDocumentCheckIcon,
    ClockIcon,
    WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';

function activePracticeId() {
    try {
        return JSON.parse(window.localStorage.getItem('caplet.practice.active.economics') || 'null')?.id || '';
    } catch {
        return '';
    }
}

function StudyMomentumPanel({ momentum, actionPath, actionLabel }) {
    const recentDays = Array.isArray(momentum.activityDays) ? momentum.activityDays.slice(-14) : [];
    const status = momentum.todayComplete
        ? `${momentum.todayCount} meaningful ${momentum.todayCount === 1 ? 'action' : 'actions'} completed today.`
        : momentum.currentStreak > 0
            ? 'One meaningful study action today keeps it alive.'
            : 'Complete one useful study action to begin.';

    return (
        <section aria-labelledby="study-momentum-heading" className="reveal mb-14 overflow-hidden rounded-3xl block-amber p-7 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] md:p-8">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-5">
                    <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${momentum.todayComplete ? 'bg-accent text-white' : 'bg-surface-raised text-accent'}`}>
                        {momentum.todayComplete
                            ? <CheckCircleIcon className="h-7 w-7" aria-hidden="true" />
                            : <FireIcon className="h-7 w-7" aria-hidden="true" />}
                    </span>
                    <div>
                        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-accent">Meaningful study streak</p>
                        <h2 id="study-momentum-heading" className="mt-1 font-display text-3xl font-extrabold tracking-tight text-text-primary">
                            {momentum.currentStreak} {momentum.currentStreak === 1 ? 'day' : 'days'}
                        </h2>
                        <p className="mt-1 text-sm font-bold text-text-muted">{status}</p>
                    </div>
                </div>

                <div className="min-w-0 flex-1 lg:max-w-md">
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-text-dim">Last 14 days</p>
                        <p className="text-xs font-bold text-text-muted">{momentum.weekActiveDays}/{momentum.weeklyGoal} days this week</p>
                    </div>
                    <div className="mt-3 flex gap-1.5" aria-label={`${momentum.weekActiveDays} active study days this week`}>
                        {recentDays.map((day) => (
                            <span
                                key={day.date}
                                title={`${day.date}: ${day.count} meaningful ${day.count === 1 ? 'action' : 'actions'}`}
                                className={`h-4 min-w-3 flex-1 rounded-[5px] ${day.count ? 'bg-accent' : 'bg-surface-raised'}`}
                                aria-hidden="true"
                            />
                        ))}
                    </div>
                </div>

                <Link to={actionPath || '/study-plan'} className="btn-primary shrink-0">
                    {actionLabel || (momentum.todayComplete ? 'View my plan' : 'Study now')} <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </Link>
            </div>
        </section>
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    const { courses, loading: coursesLoading, hasFetched, fetchCourses } = useCourses();
    const [userProgress, setUserProgress] = useState([]);
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState([]);
    const [savedSlides, setSavedSlides] = useState([]);
    const [dueCount, setDueCount] = useState(0);
    const [studyPlan, setStudyPlan] = useState(null);
    const [examSessions, setExamSessions] = useState([]);
    const [nextRecommendation, setNextRecommendation] = useState(null);
    const [studyMomentum, setStudyMomentum] = useState(null);
    const [activePractice, setActivePractice] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [retryKey, setRetryKey] = useState(0);
    const [availability, setAvailability] = useState({ progress: true, classes: true });

    useReveal(undefined, [loading, coursesLoading]);

    useEffect(() => {
        if (!hasFetched && !coursesLoading) {
            fetchCourses().catch(() => {
                // Sidebar can render without courses when unavailable.
            });
        }
    }, [coursesLoading, fetchCourses, hasFetched]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setLoadError('');
            const practiceSessionId = activePracticeId();
            const results = await Promise.allSettled([
                    api.getUserProgress(),
                    api.getClasses(),
                    api.getSavedSlides(),
                    api.getDueReviewItems(),
                    api.getStudyPlan(),
                    api.getEconomicsExamSessions(),
                    api.getNextRecommendation('economics'),
                    api.getStudyStreak(),
                    practiceSessionId ? api.getPracticeSession(practiceSessionId) : Promise.resolve(null),
                ]);
            const valueAt = (index) => results[index].status === 'fulfilled' ? results[index].value : null;
            const progressData = valueAt(0);
            const classesData = valueAt(1);
            const savedSlidesData = valueAt(2);
            const dueData = valueAt(3);
            const studyPlanData = valueAt(4);
            const examSessionsData = valueAt(5);
            const recommendationData = valueAt(6);
            const momentumData = valueAt(7);
            const practiceData = valueAt(8);

            try {
                setUserProgress(progressData?.progress || []);
                const allClasses = [
                    ...(classesData?.teaching || []),
                    ...(classesData?.student || [])
                ];
                setClasses(allClasses);
                setSavedSlides(savedSlidesData?.savedSlides || []);
                setDueCount(dueData?.items?.length || 0);
                setStudyPlan(studyPlanData?.studyPlan || null);
                setExamSessions(examSessionsData?.sessions || []);
                setNextRecommendation(recommendationData?.recommendation || null);
                setStudyMomentum(momentumData?.momentum || null);
                const practiceSession = practiceData?.session || practiceData;
                setActivePractice(practiceSession?.id && practiceSession.status === 'in_progress' ? practiceSession : null);
                const nextAvailability = { progress: Boolean(progressData), classes: Boolean(classesData) };
                setAvailability(nextAvailability);
                if (!nextAvailability.progress || !nextAvailability.classes) {
                    setLoadError('Some dashboard information could not be loaded. Available sections are shown below.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [retryKey]);

    if (loading || coursesLoading) {
        return (
            <div className="min-h-screen bg-surface-body py-32" role="status" aria-live="polite">
                <div className="container-custom">
                    <CapletLoader message="Loading your dashboard…" />
                    <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-4" aria-hidden="true">
                        {[0, 1, 2, 3].map((item) => (
                            <div key={item} className="h-40 animate-pulse rounded-3xl bg-surface-soft" />
                        ))}
                    </div>
                    <div className="mt-12 grid gap-6 lg:grid-cols-3" aria-hidden="true">
                        <div className="h-72 animate-pulse rounded-3xl bg-surface-soft lg:col-span-2" />
                        <div className="h-72 animate-pulse rounded-3xl bg-surface-soft" />
                    </div>
                </div>
            </div>
        );
    }

    const inProgressCourses = userProgress?.filter(p => p.status === 'in_progress') || [];
    const completedCourses = userProgress?.filter(p => p.status === 'completed') || [];
    const lastAccessed = [...(userProgress || [])].sort((a, b) => new Date(b.lastAccessedAt) - new Date(a.lastAccessedAt))[0];
    const lastAccessedCourse = lastAccessed ? courses.find(c => c.id === lastAccessed.courseId) : null;

    // Compute real course progress percentage from local lesson data (no extra API call needed).
    const lastCourseAllLessons = (lastAccessedCourse?.modules || []).flatMap(m => m.lessons || []);
    const lastCourseCompleted = userProgress.filter(
        p => String(p.courseId) === String(lastAccessedCourse?.id) && p.status === 'completed' && p.lessonId
    ).length;
    const lastCoursePct = lastCourseAllLessons.length > 0
        ? Math.round((lastCourseCompleted / lastCourseAllLessons.length) * 100)
        : 0;
    const lastCourseResumePath = lastAccessedCourse && lastAccessed?.lessonId
        ? `/courses/${lastAccessedCourse.id}/lessons/${lastAccessed.lessonId}${Number(lastAccessed.lastSlideIndex) > 0 ? `?slide=${lastAccessed.lastSlideIndex}` : ''}`
        : lastAccessedCourse ? `/courses/${lastAccessedCourse.id}` : '/courses';
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const nextStudyTask = [...(studyPlan?.tasks || [])]
        .filter(task => !task.completed)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] || null;
    const activeExam = examSessions.find((session) => session.status === 'in_progress') || null;
    const recentExam = examSessions.find((session) => session.status === 'submitted') || null;
    const examPath = (session) => `/library/economics/exam-practice/${session.packId}/session?session=${session.id}`;
    const recommendationPath = nextRecommendation?.resourcePath || `/practice?${new URLSearchParams({
        subject: nextRecommendation?.subject || 'economics',
        mode: nextRecommendation?.mode || 'diagnostic',
        ...(nextRecommendation?.outcome?.id ? { outcomeId: nextRecommendation.outcome.id } : {}),
    }).toString()}`;
    const quickActions = [
        { path: '/practice', label: 'Practice', description: 'Work through a focused question set.', icon: ArrowPathIcon, block: 'block-blue' },
        { path: '/mastery', label: 'Mastery', description: 'See what to strengthen next.', icon: CheckCircleIcon, block: 'block-green' },
        { path: '/courses', label: 'Learning paths', description: 'Follow structured courses and lessons.', icon: BookOpenIcon, block: 'block-cream' },
        { path: '/edutools', label: 'Education tools', description: 'Open revision, essays, and more.', icon: WrenchScrewdriverIcon, block: 'block-amber' },
    ];

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Good morning';
        if (hour >= 12 && hour < 18) return 'Good afternoon';
        return 'Good evening';
    };


    return (
        <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
            <div className="container-custom">
                {/* Header Section */}
                <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-12 reveal">
                    <div>
                        <span className="font-hand text-2xl text-blue -rotate-2 inline-block mb-2">welcome back</span>
                        <h1 className="font-display font-extrabold tracking-tight text-text-primary text-5xl md:text-7xl leading-[0.96]">
                            {getGreeting()}, {user?.firstName || 'Student'}.
                        </h1>
                        <p className="mt-7 text-xl text-text-muted font-medium max-w-xl">
                            {availability.progress
                                ? `Great to see you again. You have ${inProgressCourses.length} active ${inProgressCourses.length === 1 ? 'course' : 'courses'} in progress.`
                                : 'Great to see you again. Course progress is temporarily unavailable.'}
                        </p>
                    </div>

                </header>

                {studyMomentum && (
                    <StudyMomentumPanel
                        momentum={studyMomentum}
                        actionPath={!studyPlan || nextStudyTask ? '/study-plan' : recommendationPath}
                        actionLabel={!studyPlan ? 'Set up my plan' : null}
                    />
                )}

                {loadError && (
                    <div role="alert" className="mb-8 flex flex-col gap-4 rounded-2xl bg-surface-error p-5 text-text-error sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-bold">{loadError}</p>
                        <button type="button" onClick={() => setRetryKey((value) => value + 1)} className="min-h-11 rounded-xl border border-[color:var(--border-error)] px-4 text-sm font-bold">
                            Retry dashboard
                        </button>
                    </div>
                )}

                <LearningNextAction
                    source="dashboard"
                    resume={activePractice ? {
                        href: `/practice?subject=economics&session=${activePractice.id}&source=dashboard`,
                        title: 'Resume your Economics practice',
                        detail: `Continue from question ${Math.min(Number(activePractice.currentIndex || 0) + 1, Number(activePractice.totalQuestions || 1))} of ${activePractice.totalQuestions || 1}.`,
                        mode: activePractice.mode,
                    } : null}
                    recommendation={nextStudyTask ? null : nextRecommendation}
                    studyTask={nextStudyTask ? {
                        href: nextStudyTask.resourcePath || '/study-plan',
                        eyebrow: nextStudyTask.dueDate === today ? 'Today’s next task' : 'Next study task',
                        title: nextStudyTask.title,
                        detail: `${nextStudyTask.subjectLabel} · ${nextStudyTask.estimatedMinutes} minutes`,
                    } : !studyPlan ? {
                        href: '/study-plan',
                        eyebrow: 'Your first step',
                        title: 'Build your weekly study plan',
                        detail: 'Choose your subjects, study days and exam dates so Caplet can give you one useful next task.',
                    } : null}
                    className="reveal mb-8"
                />

                {(activeExam || recentExam) && (
                    <section className="reveal mb-8 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
                        {activeExam ? (
                            <Link to={examPath(activeExam)} className="group flex flex-col justify-between rounded-3xl border border-accent/25 bg-surface-raised p-7 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] transition-transform hover:-translate-y-1">
                                <div className="flex items-start gap-4">
                                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent"><ClockIcon className="h-6 w-6" /></span>
                                    <div>
                                        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-accent">Resume exam practice</p>
                                        <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-text-primary">{activeExam.packTitle}</h2>
                                        <p className="mt-2 text-sm font-medium text-text-muted">{activeExam.answeredCount}/{activeExam.questionCount} written responses drafted</p>
                                    </div>
                                </div>
                                <span className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-accent">Resume session <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                            </Link>
                        ) : (
                            <Link to="/library/economics/exam-practice" className="group rounded-3xl bg-block-cream p-7 transition-transform hover:-translate-y-1"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-raised text-accent"><ClipboardDocumentCheckIcon className="h-6 w-6" /></span><p className="mt-5 text-xs font-extrabold uppercase tracking-[0.14em] text-accent">Exam practice</p><h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight">Start another timed session</h2></Link>
                        )}
                        {recentExam ? (
                            <Link to={examPath(recentExam)} className="group rounded-3xl bg-block-cream p-7 transition-transform hover:-translate-y-1"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-text-dim">Latest result</p><p className="mt-3 font-display text-4xl font-extrabold tracking-tight text-text-primary">{recentExam.estimatedMark}/{recentExam.availableMarks}</p><p className="mt-2 text-sm font-bold text-text-muted truncate">{recentExam.packTitle}</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-accent">Review results <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link>
                        ) : null}
                    </section>
                )}

                {/* Due for review — the day's spaced-repetition nudge; only shown when something is actually due */}
                {dueCount > 0 && (
                    <Link
                        to="/revision"
                        className="reveal group mb-20 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between block-amber rounded-3xl p-8 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] hover:-translate-y-1 transition-transform duration-200"
                    >
                        <div className="flex items-center gap-5">
                            <span className="grid place-items-center w-14 h-14 shrink-0 rounded-2xl bg-surface-raised shadow-[0_16px_36px_-30px_rgba(20,20,18,0.3)]">
                                <ArrowPathIcon className="w-7 h-7 text-accent" />
                            </span>
                            <div>
                                <p className="font-display font-extrabold tracking-tight text-2xl md:text-3xl text-text-primary leading-tight">
                                    {dueCount} {dueCount === 1 ? 'item' : 'items'} due for review today
                                </p>
                                <p className="text-sm font-bold text-text-muted mt-1.5">
                                    A few minutes of spaced review keeps it from fading.
                                </p>
                            </div>
                        </div>
                        <span className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-accent px-6 py-3 text-sm font-bold text-white group-hover:bg-accent-strong transition-colors">
                            Review now
                            <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                    </Link>
                )}

                {/* Stats Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-20 reveal-stagger">
                    {[
                        { label: 'Modules Active', value: availability.progress ? inProgressCourses.length : null, icon: BookOpenIcon, block: 'block-blue' },
                        { label: 'Completed', value: availability.progress ? completedCourses.length : null, icon: CheckCircleIcon, block: 'block-green' },
                        { label: 'Classes', value: availability.classes ? classes.length : null, icon: AcademicCapIcon, block: 'block-amber' },
                        { label: 'Saved Slides', value: savedSlides.length, icon: BookmarkIcon, block: 'block-cream' }
                    ].map((stat) => (
                        <div key={stat.label} className={`${stat.block} rounded-3xl p-8 group shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] hover:-translate-y-1 transition-transform duration-200`}>
                            <p className="text-sm font-bold text-text-muted mb-6 flex justify-between items-center">
                                {stat.label}
                                <stat.icon className="w-5 h-5 text-accent opacity-70" />
                            </p>
                            <p className="font-display font-extrabold tracking-tight text-5xl text-text-primary">
                                {stat.value ?? '—'}
                            </p>
                        </div>
                    ))}
                </div>

                <section aria-labelledby="dashboard-quick-actions" className="mb-20 reveal">
                    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                            <span className="font-hand text-lg text-blue -rotate-2 inline-block">your workspace</span>
                            <h2 id="dashboard-quick-actions" className="mt-1 font-display text-3xl font-extrabold tracking-tight text-text-primary md:text-4xl">Jump back in.</h2>
                        </div>
                        <p className="max-w-md text-sm font-medium leading-relaxed text-text-muted">Your focused study tools live here, so the main navigation can stay calm.</p>
                    </div>
                    <div
                        data-testid="dashboard-quick-actions-scroll"
                        className="-mx-1 overflow-x-auto px-1 pb-5 [scrollbar-color:var(--accent-soft)_transparent] [scrollbar-width:thin]"
                    >
                        <div className="flex min-w-max snap-x snap-mandatory gap-4">
                            {quickActions.map((action) => (
                                <Link
                                    key={action.path}
                                    to={action.path}
                                    className={`group flex min-h-56 w-[19rem] shrink-0 snap-start flex-col justify-between rounded-3xl ${action.block} p-6 shadow-[0_22px_44px_-26px_rgba(20,20,18,0.38)] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_28px_52px_-24px_rgba(20,20,18,0.42)] sm:w-[20rem]`}
                                >
                                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-raised text-accent shadow-[0_12px_24px_-18px_rgba(20,20,18,0.35)]">
                                        <action.icon className="h-6 w-6" aria-hidden="true" />
                                    </span>
                                    <div className="mt-8 flex items-end justify-between gap-4">
                                        <div className="min-w-0">
                                            <h3 className="text-base font-extrabold leading-tight text-text-primary group-hover:text-accent">{action.label}</h3>
                                            <p className="mt-2 text-sm font-medium leading-relaxed text-text-muted">{action.description}</p>
                                        </div>
                                        <ArrowRightIcon className="h-5 w-5 shrink-0 text-text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" aria-hidden="true" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
                    {/* Main Feed */}
                    <div className="lg:col-span-8 space-y-20">
                        {/* Resume Session */}
                        {lastAccessed && lastAccessedCourse && (
                            <div className="reveal">
                                <span className="font-hand text-lg text-blue -rotate-2 inline-block mb-1">continue learning</span>
                                <div className="mt-6 group relative overflow-hidden block-blue rounded-3xl p-10 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] hover:-translate-y-1 transition-transform duration-200">
                                    <div className="flex flex-col gap-8">
                                        <div className="flex-1 w-full">
                                            <h3 className="font-display font-bold tracking-tight text-3xl md:text-4xl text-text-primary mb-6">{lastAccessedCourse.title}</h3>
                                            <div className="w-full bg-surface-raised h-2 rounded-full mb-7 overflow-hidden">
                                                <div
                                                    className="bg-accent h-full rounded-full transition-all duration-1000 ease-out"
                                                    style={{ width: `${lastCoursePct}%` }}
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-4 justify-between items-center">
                                                <span className="text-sm font-bold text-text-muted">Progress: {lastCoursePct}%</span>
                                                <Link to={lastCourseResumePath} className="btn-primary py-3 px-8 text-[15px]">
                                                    Continue learning
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Recent class enrollments */}
                        <div className="reveal">
                            <div className="flex items-end justify-between mb-6">
                                <div>
                                    <span className="font-hand text-lg text-blue -rotate-2 inline-block mb-1">classes</span>
                                    <h2 className="font-display font-bold tracking-tight text-3xl md:text-4xl text-text-primary">My Classes</h2>
                                </div>
                                <Link to="/classes" className="text-sm font-bold text-accent hover:-translate-y-0.5 transition-transform">View All Classes</Link>
                            </div>
                            <div className="reveal-stagger grid grid-cols-1 gap-4">
                                {classes.length > 0 ? (
                                    classes.slice(0, 3).map(cls => (
                                        <Link key={cls.id} to={`/classes/${cls.id}`} className="bg-surface-raised rounded-2xl p-7 flex justify-between items-center group shadow-[0_18px_40px_-32px_rgba(20,20,18,0.3)] hover:-translate-y-1 transition-transform duration-200">
                                            <div className="flex min-w-0 items-center gap-4">
                                                <ClassIcon name={cls.name} size="md" />
                                                <div className="min-w-0">
                                                <p className="text-lg font-bold text-text-primary group-hover:text-accent transition-colors">{cls.name}</p>
                                                <p className="text-xs font-bold text-text-muted mt-1">{cls.code}</p>
                                                </div>
                                            </div>
                                            <ArrowRightIcon className="w-5 h-5 text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                                        </Link>
                                    ))
                                ) : (
                                    <div className="block-cream rounded-2xl p-12 text-center shadow-[0_18px_40px_-32px_rgba(20,20,18,0.3)]">
                                        <p className="text-base font-bold text-text-primary mb-2">No classes yet</p>
                                        <p className="text-sm font-medium text-text-muted">Join or create a class to see it here.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-20">
                        <div className="reveal">
                            <span className="font-hand text-lg text-blue -rotate-2 inline-block mb-1">my courses</span>
                            <div className="mt-6 reveal-stagger space-y-4">
                                {courses.slice(0, 4).map(course => (
                                    <Link
                                        key={course.id}
                                        to={`/courses/${course.id}`}
                                        className="group flex w-full items-center justify-between gap-4 rounded-2xl bg-surface-raised px-5 py-4 shadow-[0_16px_36px_-30px_rgba(20,20,18,0.3)] hover:-translate-y-0.5 transition-transform duration-200"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-text-primary truncate group-hover:text-accent transition-colors">{course.title}</p>
                                            <p className="text-xs font-bold text-text-muted mt-1">{course.duration}m</p>
                                        </div>
                                        <ArrowRightIcon className="w-4 h-4 shrink-0 text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Education tools — its own section, mirrors "My Courses" */}
                        <div className="reveal">
                            <div className="flex items-end justify-between mb-1">
                                <span className="font-hand text-lg text-blue -rotate-2 inline-block">education tools</span>
                                <Link to="/edutools" className="text-sm font-bold text-accent hover:-translate-y-0.5 transition-transform">View all</Link>
                            </div>
                            <div className="mt-6 space-y-4">
                                <Link
                                    to="/revision"
                                    className="group flex w-full items-center justify-between gap-4 rounded-2xl block-amber px-5 py-4 shadow-[0_16px_36px_-30px_rgba(20,20,18,0.3)] hover:-translate-y-0.5 transition-transform duration-200"
                                >
                                    <div className="min-w-0 flex items-center gap-3">
                                        <BookmarkIcon className="w-5 h-5 shrink-0 text-accent" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-text-primary truncate group-hover:text-accent transition-colors">Archived slides</p>
                                            <p className="text-xs font-bold text-text-muted mt-1">
                                                {savedSlides.length} {savedSlides.length === 1 ? 'slide' : 'slides'} flagged
                                            </p>
                                        </div>
                                    </div>
                                    <ArrowRightIcon className="w-4 h-4 shrink-0 text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                                </Link>
                                <Link
                                    to="/essays"
                                    className="group flex w-full items-center justify-between gap-4 rounded-2xl block-cream px-5 py-4 shadow-[0_16px_36px_-30px_rgba(20,20,18,0.3)] hover:-translate-y-0.5 transition-transform duration-200"
                                >
                                    <div className="min-w-0 flex items-center gap-3">
                                        <DocumentTextIcon className="w-5 h-5 shrink-0 text-accent" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-text-primary truncate group-hover:text-accent transition-colors">Essay Memoriser</p>
                                            <p className="text-xs font-bold text-text-muted mt-1">Practice your essays with AI</p>
                                        </div>
                                    </div>
                                    <ArrowRightIcon className="w-4 h-4 shrink-0 text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                                </Link>
                            </div>
                        </div>

                        <div className="reveal rounded-3xl bg-[color:var(--mark-blue)] text-white p-10 relative overflow-hidden shadow-[0_30px_60px_-38px_rgba(19,81,170,0.7)]">
                            <div className="relative z-10">
                                <FireIcon className="w-10 h-10 text-white mb-7" />
                                <h4 className="font-display font-bold tracking-tight text-2xl mb-5">Daily Insight</h4>
                                <blockquote className="text-base font-medium leading-relaxed text-white/85 mb-7">
                                    "Compound interest is the eighth wonder of the world. He who understands it, earns it. He who does not, pays it."
                                </blockquote>
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/70">Albert Einstein</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
