import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  BookOpenIcon,
  BookmarkIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  FireIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useCourses } from '../contexts/CoursesContext';
import { useReveal } from '../lib/useReveal';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import ClassIcon from '../components/ClassIcon';
import LearningToday from '../components/learning/LearningToday';

const QUICK_ACTIONS = [
  { path: '/practice', label: 'Practice', description: 'Work through a focused question set.', icon: ArrowPathIcon, block: 'block-blue' },
  { path: '/mastery', label: 'Mastery', description: 'See what to strengthen next.', icon: CheckCircleIcon, block: 'block-green' },
  { path: '/courses', label: 'Learning paths', description: 'Follow structured courses and lessons.', icon: BookOpenIcon, block: 'block-cream' },
  { path: '/edutools', label: 'Education tools', description: 'Open revision, essays, and more.', icon: WrenchScrewdriverIcon, block: 'block-amber' },
];

function MomentumSummary({ momentum }) {
  const recentDays = Array.isArray(momentum.activityDays) ? momentum.activityDays.slice(-14) : [];
  return (
    <section className="rounded-3xl block-amber p-6 md:p-7" aria-labelledby="dashboard-week-heading">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-kicker">Your week</p>
          <h2 id="dashboard-week-heading" className="mt-2 font-display text-3xl font-extrabold tracking-tight">
            {momentum.currentStreak} {momentum.currentStreak === 1 ? 'day' : 'days'}
          </h2>
          <p className="mt-1 text-sm font-bold text-text-muted">
            {momentum.todayComplete ? 'Today already counts.' : momentum.currentStreak ? 'One useful action today keeps it alive.' : 'Start with one useful action.'}
          </p>
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${momentum.todayComplete ? 'bg-accent text-white' : 'bg-surface-raised text-accent'}`}>
          {momentum.todayComplete ? <CheckCircleIcon className="h-6 w-6" /> : <FireIcon className="h-6 w-6" />}
        </span>
      </div>
      <div className="mt-6 flex gap-1.5" aria-label={`${momentum.weekActiveDays} active study days this week`}>
        {recentDays.map((day) => <span key={day.date} className={`h-3 min-w-2 flex-1 rounded-full ${day.count ? 'bg-accent' : 'bg-surface-raised'}`} aria-hidden="true" />)}
      </div>
      <p className="mt-3 text-xs font-bold text-text-muted">{momentum.weekActiveDays}/{momentum.weeklyGoal} active days this week</p>
    </section>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { courses, loading: coursesLoading, hasFetched, fetchCourses } = useCourses();
  const [data, setData] = useState({ progress: [], classes: [], savedSlides: [], momentum: null, actions: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useReveal(undefined, [loading, coursesLoading]);

  useEffect(() => {
    if (!hasFetched && !coursesLoading) fetchCourses().catch(() => {});
  }, [coursesLoading, fetchCourses, hasFetched]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    Promise.allSettled([
      api.getUserProgress(),
      api.getClasses(),
      api.getSavedSlides(),
      api.getStudyStreak(),
      api.getLearningToday(),
    ]).then((results) => {
      if (cancelled) return;
      const value = (index) => results[index].status === 'fulfilled' ? results[index].value : null;
      const classes = value(1);
      setData({
        progress: value(0)?.progress || [],
        classes: [...(classes?.teaching || []), ...(classes?.student || [])],
        savedSlides: value(2)?.savedSlides || [],
        momentum: value(3)?.momentum || null,
        actions: value(4)?.actions || [],
      });
      if (results.some((result) => result.status === 'rejected')) setLoadError('Some dashboard information is temporarily unavailable. Everything ready is shown below.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [retryKey]);

  if (loading || coursesLoading) {
    return <div className="min-h-screen bg-surface-body py-32" role="status"><div className="container-custom"><CapletLoader message="Loading your dashboard…" /></div></div>;
  }

  const activePaths = data.progress.filter((item) => item.status === 'in_progress').length;
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-surface-body pb-28 pt-24 selection:bg-accent selection:text-white md:pt-28">
      <div className="container-custom">
        <header className="reveal mb-9">
          <span className="font-hand text-xl text-accent -rotate-2 inline-block">welcome back</span>
          <h1 className="mt-2 font-display text-5xl font-extrabold leading-[0.96] tracking-tight text-text-primary md:text-6xl">
            {greeting}, {user?.firstName || 'Student'}.
          </h1>
          <p className="mt-4 max-w-2xl text-base font-medium text-text-muted">Here is the clearest next step. Everything else can wait until you need it.</p>
        </header>

        {loadError && (
          <div role="alert" className="mb-7 flex flex-col gap-3 rounded-2xl bg-surface-error p-5 text-text-error sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold">{loadError}</p>
            <button type="button" onClick={() => setRetryKey((value) => value + 1)} className="btn-secondary">Retry</button>
          </div>
        )}

        {data.actions.length ? (
          <LearningToday actions={data.actions} source="dashboard" className="reveal mb-8" />
        ) : (
          <section className="reveal mb-8 rounded-3xl block-blue p-7 md:p-9">
            <p className="section-kicker">Caplet Today</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight">Build your weekly study plan</h2>
            <p className="mt-2 max-w-2xl text-sm font-medium text-text-muted">Choose your subjects and available days so Caplet can line up one useful next step.</p>
            <Link to="/study-plan" className="btn-primary mt-6">Set up my plan <ArrowRightIcon className="h-4 w-4" /></Link>
          </section>
        )}

        <div className="reveal grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          {data.momentum && <MomentumSummary momentum={data.momentum} />}
          <section className="rounded-3xl bg-surface-raised p-6 md:p-7" aria-label="Learning summary">
            <p className="section-kicker">At a glance</p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[['Active paths', activePaths], ['Classes', data.classes.length], ['Saved work', data.savedSlides.length]].map(([label, value]) => (
                <div key={label}><p className="font-display text-3xl font-extrabold">{value}</p><p className="mt-1 text-xs font-bold text-text-muted">{label}</p></div>
              ))}
            </div>
          </section>
        </div>

        <section className="reveal mt-14" aria-labelledby="dashboard-quick-actions">
          <p className="section-kicker">Your workspace</p>
          <h2 id="dashboard-quick-actions" className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">Jump back in.</h2>
          <div data-testid="dashboard-quick-actions-scroll" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.path} to={action.path} className={`group rounded-3xl ${action.block} p-6 transition-transform hover:-translate-y-1`}>
                <action.icon className="h-6 w-6 text-accent" />
                <h3 className="mt-8 font-display text-lg font-extrabold group-hover:text-accent">{action.label}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-text-muted">{action.description}</p>
                <ArrowRightIcon className="mt-5 h-4 w-4 text-accent transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </section>

        <section className="reveal mt-14 grid gap-6 lg:grid-cols-2" aria-label="Your spaces">
          <div className="rounded-3xl bg-surface-raised p-6 md:p-8">
            <div className="flex items-end justify-between"><div><p className="section-kicker">Classes</p><h2 className="mt-1 font-display text-2xl font-extrabold">Your learning spaces</h2></div><Link to="/classes" className="text-sm font-bold text-accent">View all</Link></div>
            <div className="mt-6 space-y-3">
              {data.classes.slice(0, 3).map((item) => <Link key={item.id} to={`/classes/${item.id}`} className="flex items-center justify-between rounded-2xl bg-surface-soft p-4"><span className="flex items-center gap-3"><ClassIcon name={item.name} size="sm" /><span className="font-bold">{item.name}</span></span><ArrowRightIcon className="h-4 w-4 text-accent" /></Link>)}
              {!data.classes.length && <p className="rounded-2xl bg-surface-soft p-5 text-sm font-medium text-text-muted">Join or create a class when you are ready.</p>}
            </div>
          </div>
          <div className="rounded-3xl bg-surface-raised p-6 md:p-8">
            <p className="section-kicker">Keep learning</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold">Useful places</h2>
            <div className="mt-6 grid gap-3">
              {[
                { path: '/courses', label: 'Learning paths', detail: `${courses.length} available`, icon: AcademicCapIcon },
                { path: '/revision', label: 'Saved revision', detail: `${data.savedSlides.length} saved`, icon: BookmarkIcon },
                { path: '/essays', label: 'Essay Memoriser', detail: 'Practise recall', icon: DocumentTextIcon },
              ].map((item) => {
                const SpaceIcon = item.icon;
                return <Link key={item.path} to={item.path} className="flex items-center justify-between rounded-2xl bg-surface-soft p-4"><span className="flex items-center gap-3"><SpaceIcon className="h-5 w-5 text-accent" /><span><span className="block text-sm font-bold">{item.label}</span><span className="block text-xs font-medium text-text-muted">{item.detail}</span></span></span><ArrowRightIcon className="h-4 w-4 text-accent" /></Link>;
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
