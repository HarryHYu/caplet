import { createElement, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowPathIcon,
    ArrowRightIcon,
    BookOpenIcon,
    CalculatorIcon,
    CalendarDaysIcon,
    ChevronRightIcon,
    DocumentTextIcon,
    BookmarkIcon,
    PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { actionDetails } from '../components/learning/learningNextActionUtils';
import { InlineEmpty } from '../components/learning/LearningStates';
import CapletLoader from '../components/CapletLoader';
import { useMySubjects } from '../lib/useMySubjects';
import { RESOURCE_SHORTCUTS, usePinnedNavItems } from '../lib/usePinnedNavItems';
import { useAssessmentTasks } from '../lib/useAssessmentTasks';
import { assessmentsForSubjects } from '../lib/assessmentSubjects';
import { calendarDaysUntil, countdownLabel, formatAssessmentDate, isExamTask } from '../data/assessmentTasks';
import { useReveal } from '../lib/useReveal';
import api from '../services/api';

function activePracticeId() {
    try {
        return JSON.parse(window.localStorage.getItem('caplet.practice.active.economics') || 'null')?.id || '';
    } catch {
        return '';
    }
}

function localDayKey(date) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}

function startOfWeek(date) {
    const monday = new Date(date);
    monday.setHours(12, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return monday;
}

function dashboardWeek(momentum) {
    const activityByDate = new Map((momentum?.activityDays || []).map((day) => [day.date, Number(day.count || 0)]));
    const monday = startOfWeek(new Date());
    const today = localDayKey(new Date());

    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        const key = localDayKey(date);
        return {
            key,
            label: new Intl.DateTimeFormat('en-AU', { weekday: 'short' }).format(date).slice(0, 2),
            count: activityByDate.get(key) || 0,
            today: key === today,
            future: key > today,
        };
    });
}

function subjectPath(subject) {
    return subject.toLowerCase() === 'economics' ? '/library/economics' : '/library';
}

function TodayRow({ href, icon, title, detail }) {
    return (
        <Link to={href} className="focus-ring group -mx-2 flex min-h-16 items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-surface-soft">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                {createElement(icon, { className: 'h-5 w-5', 'aria-hidden': true })}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-text-primary group-hover:text-accent">{title}</span>
                <span className="mt-1 block truncate text-sm text-text-muted">{detail}</span>
            </span>
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-text-dim transition-transform group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true" />
        </Link>
    );
}

function ResourceLink({ id, path, icon, title, detail, pinned, onToggle }) {
    const handleDragStart = (event) => {
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('application/x-caplet-shortcut', id);
        event.dataTransfer.setData('text/plain', id);
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className="surface-card card-lift group flex items-start gap-3 p-5"
        >
            <Link to={path} className="focus-ring flex min-w-0 flex-1 items-start gap-4 rounded-xl" aria-label={`${title}. ${detail}`}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    {createElement(icon, { className: 'h-5 w-5', 'aria-hidden': true })}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-text-primary group-hover:text-accent">{title}</span>
                    <span className="mt-1 block text-sm leading-snug text-text-muted">{detail}</span>
                </span>
            </Link>
            <button
                type="button"
                onClick={() => onToggle(id, pinned)}
                aria-pressed={pinned}
                aria-label={pinned ? `Remove ${title} from sidebar` : `Add ${title} to sidebar`}
                title={pinned ? 'Remove from sidebar' : 'Add to sidebar'}
                className={`focus-ring press grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors hover:bg-surface-soft hover:text-accent ${pinned ? 'text-accent' : 'text-text-dim'}`}
            >
                <BookmarkIcon className={`h-4 w-4 ${pinned ? 'fill-current' : ''}`} aria-hidden="true" />
            </button>
        </div>
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    const { mySubjects } = useMySubjects();
    const { pinnedIds, pin, unpin } = usePinnedNavItems();
    const { tasks: assessmentTasks } = useAssessmentTasks();
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState([]);
    const [dueCount, setDueCount] = useState(0);
    const [studyPlan, setStudyPlan] = useState(null);
    const [nextRecommendation, setNextRecommendation] = useState(null);
    const [studyMomentum, setStudyMomentum] = useState(null);
    const [activePractice, setActivePractice] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [retryKey, setRetryKey] = useState(0);

    useReveal(undefined, [loading]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setLoadError('');
            const practiceSessionId = activePracticeId();
            const results = await Promise.allSettled([
                api.getClasses(),
                api.getDueReviewItems(),
                api.getStudyPlan(),
                api.getNextRecommendation('economics'),
                api.getStudyStreak(),
                practiceSessionId ? api.getPracticeSession(practiceSessionId) : Promise.resolve(null),
            ]);
            const valueAt = (index) => results[index].status === 'fulfilled' ? results[index].value : null;

            const classesData = valueAt(0);
            const dueData = valueAt(1);
            const studyPlanData = valueAt(2);
            const recommendationData = valueAt(3);
            const momentumData = valueAt(4);
            const practiceData = valueAt(5);

            setClasses([...(classesData?.teaching || []), ...(classesData?.student || [])]);
            setDueCount(dueData?.items?.length || 0);
            setStudyPlan(studyPlanData?.studyPlan || null);
            setNextRecommendation(recommendationData?.recommendation || null);
            setStudyMomentum(momentumData?.momentum || null);
            const practiceSession = practiceData?.session || practiceData;
            setActivePractice(practiceSession?.id && practiceSession.status === 'in_progress' ? practiceSession : null);

            if (results.some((result) => result.status === 'rejected')) {
                setLoadError('Some saved study information is unavailable. The rest of your dashboard is ready.');
            }
            setLoading(false);
        };

        fetchData();
    }, [retryKey]);

    const dashboardSubjects = useMemo(() => {
        return mySubjects;
    }, [mySubjects]);

    const upcomingAssessments = useMemo(() => assessmentsForSubjects(assessmentTasks, mySubjects)
        .filter((task) => calendarDaysUntil(task.date) >= 0)
        .sort((a, b) => a.date.localeCompare(b.date)), [assessmentTasks, mySubjects]);
    const nextExam = useMemo(() => upcomingAssessments.find(isExamTask) || null, [upcomingAssessments]);

    if (loading) {
        return (
            <div className="min-h-screen bg-surface-body px-6 py-28" role="status" aria-live="polite">
                <div className="mx-auto max-w-6xl">
                    <CapletLoader message="Loading today…" />
                    {/* Skeleton mirrors the loaded layout: header, then the
                        next-action card beside the subjects / week rail, then
                        the assessments card. */}
                    <div className="mt-12 space-y-6" aria-hidden="true">
                        <div className="space-y-3">
                            <div className="skeleton h-10 w-48" />
                            <div className="skeleton h-4 w-64" />
                        </div>
                        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
                            <div className="skeleton h-80 rounded-3xl" />
                            <div className="grid content-start gap-6">
                                <div className="skeleton h-36 rounded-2xl" />
                                <div className="skeleton h-56 rounded-2xl" />
                            </div>
                        </div>
                        <div className="skeleton h-64 rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    const now = new Date();
    const todayKey = localDayKey(now);
    const nextStudyTask = [...(studyPlan?.tasks || [])]
        .filter((task) => !task.completed)
        .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))[0] || null;
    const recommendationPath = nextRecommendation?.resourcePath || `/practice?${new URLSearchParams({
        subject: nextRecommendation?.subject || 'economics',
        mode: nextRecommendation?.mode || 'diagnostic',
        ...(nextRecommendation?.outcome?.id ? { outcomeId: nextRecommendation.outcome.id } : {}),
    }).toString()}`;
    const dashboardAction = actionDetails({
        resume: activePractice ? {
            href: `/practice?subject=economics&session=${activePractice.id}&source=dashboard`,
            title: 'Resume your Economics practice',
            detail: `Question ${Math.min(Number(activePractice.currentIndex || 0) + 1, Number(activePractice.totalQuestions || 1))} of ${activePractice.totalQuestions || 1}`,
            mode: activePractice.mode,
        } : null,
        recommendation: nextStudyTask ? null : nextRecommendation,
        studyTask: nextStudyTask ? {
            href: nextStudyTask.resourcePath || '/study-plan',
            eyebrow: nextStudyTask.dueDate === todayKey ? 'Today’s next task' : 'Next study task',
            title: nextStudyTask.title,
            detail: `${nextStudyTask.subjectLabel} · ${nextStudyTask.estimatedMinutes} minutes`,
        } : !studyPlan ? {
            href: '/study-plan',
            eyebrow: 'Your first step',
            title: 'Set up your study plan',
            detail: 'Choose your subjects and available days.',
        } : null,
        fallbackHref: recommendationPath,
        source: 'dashboard',
    });
    const primaryTitle = dashboardAction.type === 'resume'
        ? 'Continue practice'
        : dashboardAction.type === 'recommendation' || dashboardAction.type === 'diagnostic'
            ? 'Start practice'
            : dashboardAction.title;
    const primaryLabel = dashboardAction.type === 'resume' ? 'Continue' : 'Start';
    const activeSubject = nextStudyTask?.subjectLabel || 'Economics';
    const week = dashboardWeek(studyMomentum);
    const weekActiveDays = week.filter((day) => day.count > 0).length;
    const dateLabel = new Intl.DateTimeFormat('en-AU', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }).format(now);
    const planDetail = nextStudyTask
        ? `${nextStudyTask.dueDate === todayKey ? 'Today' : nextStudyTask.dueDate ? new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${nextStudyTask.dueDate}T12:00:00`)) : 'Next up'} · ${nextStudyTask.estimatedMinutes} min`
        : 'Choose subjects and study days';
    const practiceDetail = activePractice
        ? `Question ${Math.min(Number(activePractice.currentIndex || 0) + 1, Number(activePractice.totalQuestions || 1))} of ${activePractice.totalQuestions || 1}`
        : dueCount > 0
            ? `${dueCount} ${dueCount === 1 ? 'item' : 'items'} ready to review`
            : 'Start a focused question set';

    return (
        <div className="min-h-screen bg-surface-body pb-28 pt-24 selection:bg-accent selection:text-accent-contrast md:pt-28 lg:pt-24">
            <div className="mx-auto w-full max-w-[1220px] px-6 md:px-10 lg:px-12">
                <header className="minimal-page-header reveal">
                    <h1 className="minimal-page-title">Today</h1>
                    <p className="minimal-page-description">{dateLabel}</p>
                    <span className="sr-only">{`Welcome, ${user?.firstName || 'Student'}.`}</span>
                </header>

                {loadError && (
                    <div role="alert" className="mb-6 flex flex-col gap-3 rounded-2xl border border-[color:var(--border-error)] bg-surface-error px-5 py-4 text-sm font-bold text-text-error sm:flex-row sm:items-center sm:justify-between">
                        <p>{loadError}</p>
                        <button type="button" onClick={() => setRetryKey((value) => value + 1)} className="min-h-10 shrink-0 px-3 text-sm font-bold">Retry</button>
                    </div>
                )}

                <section aria-label="Today’s study overview" className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
                    <div className="animate-rise surface-card flex flex-col rounded-3xl p-7 md:p-9">
                        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-accent">{activeSubject}</p>
                        <h2 className="mt-4 max-w-md font-display text-3xl font-extrabold tracking-[-0.025em] text-text-primary md:text-4xl">{primaryTitle}</h2>
                        <p className="mt-3 max-w-lg text-lg font-medium text-text-muted">{dashboardAction.detail}</p>
                        <div className="mt-7 flex flex-wrap items-center gap-4">
                        <Link
                            to={dashboardAction.href}
                            aria-label={`${dashboardAction.title}. ${primaryLabel}`}
                            onClick={() => api.logEvent?.({
                                type: 'next_action_started',
                                idempotencyKey: `next-action-started:dashboard:${dashboardAction.type}:${Date.now()}`,
                                feature: 'learning_loop:dashboard',
                                entityType: 'learning_action',
                                entityId: dashboardAction.type,
                                metadata: { source: 'dashboard', actionType: dashboardAction.type, mode: dashboardAction.mode || '' },
                            })}
                            className="press focus-ring inline-flex min-h-12 min-w-48 items-center justify-center rounded-xl bg-accent px-7 text-base font-bold text-accent-contrast shadow-card transition-colors hover:bg-accent-strong"
                        >
                            {primaryLabel}
                        </Link>
                        <Link to="/library/economics" className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-bold text-accent hover:text-accent-strong">
                            Open Economics <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        </div>

                        <div className="mt-9 rounded-2xl bg-surface-soft p-5 pt-4">
                            <h3 className="card-section-title mb-3">After that</h3>
                            <Link to="/review" className="focus-ring group -mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm font-semibold text-text-primary hover:text-accent">
                                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line-soft bg-surface-raised text-xs font-bold">1</span>
                                <span className="flex-1">{dueCount > 0 ? `Review ${dueCount} ${dueCount === 1 ? 'item' : 'items'}` : 'Review one item'}</span>
                                <ChevronRightIcon className="h-4 w-4 text-text-dim group-hover:text-accent" aria-hidden="true" />
                            </Link>
                            <Link to="/study-plan" className="focus-ring group -mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm font-semibold text-text-primary hover:text-accent">
                                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line-soft bg-surface-raised text-xs font-bold">2</span>
                                <span className="flex-1">Update study plan</span>
                                <ChevronRightIcon className="h-4 w-4 text-text-dim group-hover:text-accent" aria-hidden="true" />
                            </Link>
                        </div>
                    </div>

                    <div className="grid content-start gap-6">
                        <div className="animate-rise surface-card" style={{ animationDelay: '70ms' }}>
                            <div className="flex items-center justify-between gap-4">
                                <h2 id="my-subjects-heading" className="card-section-title mb-0">My subjects</h2>
                                <Link to="/library" className="text-sm font-bold text-accent hover:text-accent-strong">Edit</Link>
                            </div>
                            {dashboardSubjects.length > 0 ? (
                                <nav aria-labelledby="my-subjects-heading" className="mt-4 flex flex-wrap gap-2">
                                    {dashboardSubjects.map((subject) => (
                                        <Link
                                            key={subject}
                                            to={subjectPath(subject)}
                                            className="focus-ring press inline-flex min-h-10 items-center rounded-full border border-line-soft bg-surface-soft px-4 text-sm font-bold text-text-primary transition-colors hover:border-accent hover:text-accent"
                                        >
                                            {subject}
                                        </Link>
                                    ))}
                                </nav>
                            ) : (
                                <div className="mt-4 flex items-center gap-4 rounded-2xl border border-dashed border-line-soft bg-surface-soft p-4">
                                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                                        <BookOpenIcon className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-bold text-text-primary">No subjects yet</p>
                                        <p className="mt-1 text-sm font-medium leading-snug text-text-muted">Pick your subjects and the rest of Today follows them.</p>
                                    </div>
                                    <Link to="/library" className="press focus-ring inline-flex min-h-10 shrink-0 items-center rounded-xl bg-accent px-4 text-sm font-bold text-accent-contrast transition-colors hover:bg-accent-strong">Choose</Link>
                                </div>
                            )}
                        </div>

                        <div className="animate-rise surface-card" style={{ animationDelay: '140ms' }}>
                            <div className="flex items-center justify-between gap-4">
                                <h2 className="card-section-title mb-0">This week</h2>
                                {Number(studyMomentum?.currentStreak) > 0 && (
                                    <span className="inline-flex animate-streak-pop items-center gap-1 rounded-full bg-[color:var(--block-green)] px-2.5 py-1 text-xs font-bold text-[color:var(--mark-green)]">
                                        🔥 {studyMomentum.currentStreak}-day streak
                                    </span>
                                )}
                            </div>
                            <div className="mt-3 divide-y divide-line-soft">
                                <TodayRow href="/study-plan" icon={CalendarDaysIcon} title={nextStudyTask?.title || 'Study plan review'} detail={planDetail} />
                                <TodayRow href={activePractice ? dashboardAction.href : '/practice'} icon={PencilSquareIcon} title={activePractice ? 'Continue practice' : 'Practice quiz'} detail={practiceDetail} />
                            </div>

                            <div className="mt-6 rounded-2xl bg-surface-soft p-5 pt-4">
                                <h3 className="card-section-title mb-0">Weekly activity</h3>
                                <div className="mt-4 grid grid-cols-7 gap-2" aria-label={`${weekActiveDays} active study days this week`}>
                                    {week.map((day) => (
                                        <div key={day.key} className="text-center">
                                            <span className="block text-[11px] font-medium text-text-muted">{day.label}</span>
                                            <span
                                                title={`${day.key}: ${day.count} study ${day.count === 1 ? 'action' : 'actions'}`}
                                                className={`mx-auto mt-3 block h-5 w-5 rounded-full border-2 ${day.count > 0 ? 'border-accent bg-accent' : day.today ? 'border-accent bg-transparent' : 'border-line-soft bg-transparent'} ${day.future ? 'opacity-60' : ''}`}
                                                aria-hidden="true"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p className="mt-4 text-sm text-text-muted">{studyMomentum?.weekActiveDays || weekActiveDays} of {studyMomentum?.weeklyGoal || 3} planned days completed.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section aria-labelledby="upcoming-assessments-heading" className="animate-rise surface-card mt-6" style={{ animationDelay: '200ms' }}>
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 id="upcoming-assessments-heading" className="font-display text-2xl font-extrabold tracking-tight text-text-primary">Upcoming assessments</h2>
                            <p className="mt-2 text-sm text-text-muted">Only assessments for your chosen subjects.</p>
                        </div>
                        {nextExam ? (
                            <Link to="/assessments" className="focus-ring shrink-0 rounded-2xl bg-surface-soft px-5 py-3 text-center transition-colors hover:bg-accent-soft sm:text-right">
                                <span className="block font-display text-3xl font-extrabold leading-none text-text-primary">{countdownLabel(calendarDaysUntil(nextExam.date))}</span>
                                <span className="mt-2 block text-sm font-bold text-accent">until {nextExam.subject}</span>
                            </Link>
                        ) : <Link to="/assessments" className="shrink-0 text-sm font-bold text-accent hover:text-accent-strong">View schedule</Link>}
                    </div>
                    {upcomingAssessments.length > 0 ? (
                        <div className="mt-4 grid gap-x-8 border-t border-line-soft pt-2 md:grid-cols-2">
                            {upcomingAssessments.slice(0, 6).map((task) => (
                                <TodayRow
                                    key={task.id}
                                    href="/assessments"
                                    icon={CalendarDaysIcon}
                                    title={task.subject}
                                    detail={`${countdownLabel(calendarDaysUntil(task.date))} · ${formatAssessmentDate(task.date)}${task.time ? ` at ${task.time}` : ` · ${task.type}`}`}
                                />
                            ))}
                        </div>
                    ) : (
                        <InlineEmpty
                            className="mt-5"
                            icon={CalendarDaysIcon}
                            title={mySubjects.length > 0 ? 'Nothing scheduled yet' : 'No subjects chosen yet'}
                            message={mySubjects.length > 0 ? 'No upcoming assessments are listed for your subjects.' : 'Choose your subjects to see relevant assessments.'}
                            action={<Link to={mySubjects.length > 0 ? '/assessments' : '/library'} className="btn-primary">{mySubjects.length > 0 ? 'View schedule' : 'Choose subjects'}</Link>}
                        />
                    )}
                </section>

                <section aria-labelledby="resources-tools-heading" className="mt-10">
                    <h2 id="resources-tools-heading" className="font-display text-2xl font-extrabold tracking-tight text-text-primary">Resources &amp; tools</h2>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {RESOURCE_SHORTCUTS.map((shortcut) => {
                            const details = {
                                'resource-library': { icon: BookOpenIcon, detail: 'Notes, guides and past papers' },
                                'subject-notes': { icon: DocumentTextIcon, detail: 'Google Docs and your own notes' },
                                'essay-practice': { icon: DocumentTextIcon, detail: 'Plan, write and improve essays' },
                                'assessment-dates': { icon: CalendarDaysIcon, detail: 'See key dates and exam information' },
                                'assessment-log': { icon: BookmarkIcon, detail: 'Results, reflections and scanned tasks' },
                                'financial-tools': { icon: CalculatorIcon, detail: 'Budgeting, interest and more' },
                            }[shortcut.id];
                            return <ResourceLink key={shortcut.id} {...shortcut} {...details} title={shortcut.label} pinned={pinnedIds.includes(shortcut.id)} onToggle={(id, pinned) => pinned ? unpin(id) : pin(id)} />;
                        })}
                    </div>
                </section>

                {classes.length > 0 && (
                    <section aria-labelledby="classes-heading" className="surface-card mt-10">
                        <div className="flex items-center justify-between gap-4">
                            <h2 id="classes-heading" className="card-section-title mb-0">Classes</h2>
                            <Link to="/classes" className="text-sm font-bold text-accent hover:text-accent-strong">View all</Link>
                        </div>
                        <div className="mt-3 divide-y divide-line-soft">
                            {classes.slice(0, 2).map((classroom) => (
                                <Link key={classroom.id} to={`/classes/${classroom.id}`} className="group flex min-h-16 items-center gap-4 py-4">
                                    <ArrowPathIcon className="h-5 w-5 text-text-dim group-hover:text-accent" aria-hidden="true" />
                                    <span className="flex-1 text-sm font-bold text-text-primary group-hover:text-accent">{classroom.name}</span>
                                    <span className="text-xs font-medium text-text-muted">{classroom.code}</span>
                                    <ChevronRightIcon className="h-4 w-4 text-text-dim" aria-hidden="true" />
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
