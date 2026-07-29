import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useAuth } from '../contexts/AuthContext';
import { useReveal } from '../lib/useReveal';
import { probabilityPercent } from '../lib/learning';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import RecommendedLessons from '../components/study/RecommendedLessons';
import SyllabusProgress from '../components/study/SyllabusProgress';
import {
  SparklesIcon,
  FireIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ChartBarSquareIcon,
  PaperAirplaneIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

/* ──────────────────────────────────────────────────────────────────────────
   StudyCoach — the dedicated study-coach tab (route: /study).

   Rebuilt in the current design language and wired entirely to main's existing
   study backend: momentum/streak, next-best-action, outcome mastery, due
   review, and the weekly plan. The AI coach chat is powered by the existing
   /ai/tutor endpoint (api.askTutor), which degrades gracefully, so nothing
   here throws if the AI is unavailable.
   ────────────────────────────────────────────────────────────────────────── */

const STARTERS = [
  'How should I study today?',
  'Explain a concept I find tricky.',
  'Quiz me on my weakest topic.',
  'Give me a plan for this week.',
];

// A compact transcript of the recent exchange, fed to the tutor as context so
// the coach has short-term memory. The backend trims to 600 chars, so keep the
// most recent turns and let older ones fall away.
function conversationContext(messages) {
  if (!messages.length) return undefined;
  const recent = messages.slice(-4)
    .map((m) => `${m.role === 'user' ? 'Student' : 'Coach'}: ${m.content}`)
    .join('\n');
  return { type: 'conversation', title: 'Study coach session', content: recent };
}

function greeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}

// ─── AI coach chat ──────────────────────────────────────────────────────────

function CoachChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const threadRef = useRef(null);

  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    // scrollTo isn't implemented in jsdom; fall back to assigning scrollTop.
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, sending]);

  const send = useCallback(async (raw) => {
    const question = (raw ?? '').trim();
    if (!question || sending) return;
    setInput('');
    setSending(true);
    // Snapshot the history BEFORE adding the new question so the context we
    // send is the prior exchange, not a copy of the question itself.
    const prior = messages;
    setMessages((m) => [...m, { role: 'user', content: question }]);
    try {
      const res = await api.askTutor({ question, slide: conversationContext(prior) });
      if (res && !res.unavailable && res.answer) {
        setMessages((m) => [...m, { role: 'coach', content: res.answer }]);
      } else {
        // Consent/age gating is actionable — point the student to the right setting.
        const settingsPath = res?.consentRequired
          ? (res.code === 'age_confirmation_required' ? '/settings/profile' : '/settings/privacy')
          : null;
        setMessages((m) => [...m, {
          role: 'coach',
          content: res?.message || 'The coach is unavailable right now. Please try again in a moment.',
          error: true,
          settingsPath,
        }]);
      }
    } catch {
      setMessages((m) => [...m, { role: 'coach', content: 'The coach is unavailable right now. Please try again in a moment.', error: true }]);
    } finally {
      setSending(false);
    }
  }, [messages, sending]);

  return (
    <section className="reveal flex h-[min(640px,calc(100vh-12rem))] flex-col overflow-hidden rounded-3xl bg-surface-raised shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
      <div className="flex items-center gap-3 border-b border-line-soft px-6 py-5">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
          <SparklesIcon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-tight text-text-primary">AI Study Coach</h2>
          <p className="text-xs font-bold text-text-muted">Ask anything about your subjects, or how to study.</p>
        </div>
      </div>

      <div ref={threadRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-start gap-4">
            <p className="text-sm font-medium leading-relaxed text-text-muted">
              I can explain tricky ideas, quiz you, or help you plan. Try one of these:
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-line-soft px-4 py-2 text-[13px] font-bold text-text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={
                m.role === 'user'
                  ? 'max-w-[85%] rounded-3xl rounded-br-lg bg-accent px-4 py-3 text-sm font-medium leading-relaxed text-white'
                  : `max-w-[90%] rounded-3xl rounded-bl-lg px-4 py-3 ${m.error ? 'bg-surface-error text-text-error' : 'bg-surface-soft text-text-primary'}`
              }
            >
              {m.role === 'user' ? (
                m.content
              ) : (
                <div className="prose-coach text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{m.content}</ReactMarkdown>
                  {m.settingsPath && (
                    <Link to={m.settingsPath} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-accent underline underline-offset-2">
                      Open settings <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-3xl rounded-bl-lg bg-surface-soft px-4 py-3.5">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-accent" />
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex items-end gap-3 border-t border-line-soft px-6 py-4"
      >
        <textarea
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
          placeholder="Ask your study coach…"
          className="max-h-32 flex-1 resize-none rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-sm text-text-primary placeholder:text-text-dim transition-colors focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          aria-label="Send"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-white transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PaperAirplaneIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </form>
      <p className="px-6 pb-4 text-[11px] leading-relaxed text-text-dim">
        Educational help only — answers can be imperfect, so check anything important.
      </p>
    </section>
  );
}

// ─── Momentum strip ─────────────────────────────────────────────────────────

function MomentumStrip({ momentum }) {
  const recentDays = Array.isArray(momentum.activityDays) ? momentum.activityDays.slice(-14) : [];
  const status = momentum.todayComplete
    ? `${momentum.todayCount} meaningful ${momentum.todayCount === 1 ? 'action' : 'actions'} completed today.`
    : momentum.currentStreak > 0
      ? 'One meaningful study action today keeps it alive.'
      : 'Complete one useful study action to begin.';

  return (
    <section className="reveal mb-8 overflow-hidden rounded-3xl block-amber p-7 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-5">
          <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${momentum.todayComplete ? 'bg-accent text-white' : 'bg-surface-raised text-accent'}`}>
            {momentum.todayComplete ? <CheckCircleIcon className="h-7 w-7" aria-hidden="true" /> : <FireIcon className="h-7 w-7" aria-hidden="true" />}
          </span>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-accent">Meaningful study streak</p>
            <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-text-primary">
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
          <div className="mt-3 flex gap-1.5" aria-hidden="true">
            {recentDays.map((day) => (
              <span
                key={day.date}
                title={`${day.date}: ${day.count} meaningful ${day.count === 1 ? 'action' : 'actions'}`}
                className={`h-4 min-w-3 flex-1 rounded-[5px] ${day.count ? 'bg-accent' : 'bg-surface-raised'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Sidebar panels ─────────────────────────────────────────────────────────

function StrengthenNext({ outcomes }) {
  const weakest = [...outcomes]
    .filter((o) => o.title)
    .sort((a, b) => a.probability - b.probability)
    .slice(0, 4);
  if (!weakest.length) return null;

  return (
    <section className="reveal rounded-3xl bg-surface-raised p-6 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
      <div className="mb-5 flex items-center gap-3">
        <ChartBarSquareIcon className="h-5 w-5 text-accent" aria-hidden="true" />
        <h3 className="font-display text-lg font-extrabold tracking-tight text-text-primary">Strengthen next</h3>
      </div>
      <ul className="space-y-4">
        {weakest.map((o) => {
          const pct = probabilityPercent(o.probability);
          const href = `/practice?${new URLSearchParams({ subject: 'economics', mode: 'diagnostic', outcomeId: o.id }).toString()}`;
          return (
            <li key={o.id}>
              <Link to={href} className="group block">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-bold text-text-primary group-hover:text-accent">{o.title}</span>
                  <span className="shrink-0 font-mono text-xs font-bold text-text-muted">{pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-soft">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <Link to="/mastery" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:-translate-y-0.5 transition-transform">
        View full mastery <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

function MiniCard({ to, block, icon, kicker, title, sub }) {
  const Icon = icon;
  return (
    <Link to={to} className={`reveal group flex items-center justify-between gap-4 rounded-3xl ${block} p-6 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] transition-transform duration-200 hover:-translate-y-1`}>
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-raised text-accent">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-accent">{kicker}</p>
          <p className="mt-1 font-display text-lg font-extrabold leading-tight tracking-tight text-text-primary">{title}</p>
          {sub && <p className="mt-0.5 text-sm font-bold text-text-muted">{sub}</p>}
        </div>
      </div>
      <ArrowRightIcon className="h-5 w-5 shrink-0 text-text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" aria-hidden="true" />
    </Link>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function StudyCoach() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [momentum, setMomentum] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [mastery, setMastery] = useState(null);
  const [dueCount, setDueCount] = useState(0);
  const [studyPlan, setStudyPlan] = useState(null);

  useReveal(undefined, [loading]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        api.getStudyStreak(),
        api.getNextRecommendation('economics'),
        api.getMastery('economics'),
        api.getDueReviewItems(),
        api.getStudyPlan(),
      ]);
      if (cancelled) return;
      const at = (i) => (results[i].status === 'fulfilled' ? results[i].value : null);
      setMomentum(at(0)?.momentum || null);
      setRecommendation(at(1)?.recommendation || null);
      setMastery(at(2) || null);
      setDueCount(at(3)?.items?.length || 0);
      setStudyPlan(at(4)?.studyPlan || null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-body py-32" role="status" aria-live="polite">
        <div className="container-custom">
          <CapletLoader message="Waking up your study coach…" />
        </div>
      </div>
    );
  }

  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const nextTask = [...(studyPlan?.tasks || [])]
    .filter((t) => !t.completed)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] || null;
  const recPath = recommendation?.resourcePath || `/practice?${new URLSearchParams({
    subject: recommendation?.subject || 'economics',
    mode: recommendation?.mode || 'diagnostic',
    ...(recommendation?.outcome?.id ? { outcomeId: recommendation.outcome.id } : {}),
  }).toString()}`;

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="reveal mb-10">
          <span className="font-hand text-2xl text-blue -rotate-2 mb-2 inline-block">your study coach</span>
          <h1 className="font-display text-5xl font-extrabold leading-[0.96] tracking-tight text-text-primary md:text-6xl">
            {greeting()}, {user?.firstName || 'Student'}.
          </h1>
          <p className="mt-6 max-w-xl text-xl font-medium text-text-muted">
            Ask me anything, and I’ll point you to the one thing worth doing next.
          </p>
        </header>

        {momentum && <MomentumStrip momentum={momentum} />}

        {recommendation && (
          <Link
            to={recPath}
            onClick={() => api.logEvent({
              type: 'recommendation_accepted',
              entityType: 'curriculum_outcome',
              entityId: recommendation.outcome?.id,
              outcomeId: recommendation.outcome?.id,
              feature: 'study_coach_next_action',
              metadata: { reasonCode: recommendation.reasonCode, mode: recommendation.mode },
            })}
            className="reveal group mb-8 flex flex-col gap-6 rounded-3xl bg-[color:var(--mark-blue)] p-8 text-white shadow-[0_28px_58px_-38px_rgba(19,81,170,0.7)] transition-transform hover:-translate-y-1 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-5">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10">
                <SparklesIcon className="h-7 w-7" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/65">Your next best action</p>
                <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white">
                  {recommendation.outcome?.title ? `Strengthen ${recommendation.outcome.title}` : 'Build your first mastery signal'}
                </h2>
                {recommendation.reason && <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-white/80">{recommendation.reason}</p>}
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-accent">
              Start now <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        )}

        {/* Ported recommendation engine — content-matched lesson feed. */}
        <RecommendedLessons />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <CoachChat />
          </div>
          <div className="space-y-6 lg:col-span-5">
            {mastery?.outcomes?.length ? <StrengthenNext outcomes={mastery.outcomes} /> : null}
            {dueCount > 0 && (
              <MiniCard
                to="/revision"
                block="block-green"
                icon={ArrowPathIcon}
                kicker="Spaced review"
                title={`${dueCount} ${dueCount === 1 ? 'item' : 'items'} due today`}
                sub="A few minutes keeps it from fading."
              />
            )}
            {nextTask ? (
              <MiniCard
                to="/study-plan"
                block="block-blue"
                icon={CalendarDaysIcon}
                kicker={nextTask.dueDate === today ? 'Today’s task' : 'Next task'}
                title={nextTask.title}
                sub={`${nextTask.subjectLabel} · ${nextTask.estimatedMinutes} min`}
              />
            ) : (
              <MiniCard
                to="/study-plan"
                block="block-cream"
                icon={AcademicCapIcon}
                kicker="Weekly plan"
                title="Build your study plan"
                sub="Set subjects and exam dates."
              />
            )}
          </div>
        </div>

        {/* Ported HSC syllabus-point coverage across all subjects. */}
        <div className="mt-16">
          <SyllabusProgress />
        </div>
      </div>
    </div>
  );
}
