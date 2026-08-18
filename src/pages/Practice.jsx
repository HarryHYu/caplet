import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  BoltIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  FireIcon,
  ListBulletIcon,
  PlayIcon,
  SparklesIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import PracticeQuestion, { FeedbackPanel } from '../components/learning/PracticeQuestion';
import { LearningEmpty, LearningError, LearningLoader } from '../components/learning/LearningStates';
import api from '../services/api';
import LearningNextAction from '../components/learning/LearningNextAction';

const PRACTICE_MODES = [
  {
    id: 'diagnostic',
    label: 'Quick diagnostic',
    description: 'Find your strongest starting point with an adaptive set of questions.',
    detail: 'About 10 min',
    icon: ClipboardDocumentCheckIcon,
    tone: 'blue',
  },
  {
    id: 'daily',
    label: 'Daily five',
    description: 'Keep momentum with five questions chosen from your recent learning.',
    detail: '5 questions',
    icon: FireIcon,
    tone: 'amber',
  },
  {
    id: 'weak-topic',
    label: 'Weak-topic practice',
    description: 'Target the outcome where another attempt will help most.',
    detail: 'Personalised',
    icon: BoltIcon,
    tone: 'coral',
  },
  {
    id: 'timed-exam',
    label: 'Timed exam practice',
    description: 'Build pace and judgement under realistic time pressure.',
    detail: 'Timed',
    icon: ClockIcon,
    tone: 'blue',
  },
  {
    id: 'due-review',
    label: 'Due revision',
    description: 'Revisit knowledge just as it is becoming harder to recall.',
    detail: 'Memory-first',
    icon: CalendarDaysIcon,
    tone: 'green',
  },
  {
    id: 'assigned',
    label: 'Teacher assigned',
    description: 'Complete the next practice activity set by your teacher.',
    detail: 'Class work',
    icon: AcademicCapIcon,
    tone: 'amber',
  },
];

const MODE_MAP = new Map(PRACTICE_MODES.map((mode) => [mode.id, mode]));
const ACTIVE_SESSION_PREFIX = 'caplet.practice.active.';

function activeSessionKey(subject) {
  return `${ACTIVE_SESSION_PREFIX}${subject}`;
}

function readSavedSession(subject) {
  try {
    const value = window.localStorage.getItem(activeSessionKey(subject));
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function saveSession(subject, session) {
  try {
    window.localStorage.setItem(activeSessionKey(subject), JSON.stringify({
      id: session.id,
      subject,
      mode: session.mode,
      savedAt: new Date().toISOString(),
    }));
  } catch {
    // Practice still works when storage is disabled.
  }
}

function clearSavedSession(subject) {
  try {
    window.localStorage.removeItem(activeSessionKey(subject));
  } catch {
    // Nothing else to clean up.
  }
}

function normalizePracticeSession(payload, fallback = {}) {
  const outer = payload || {};
  const raw = outer.session || outer.practiceSession || outer;
  const merged = { ...fallback, ...raw };
  const questions = raw.questions || fallback.questions || [];
  const currentIndex = Number(raw.currentIndex ?? raw.currentQuestionIndex ?? fallback.currentIndex ?? 0) || 0;
  const questionIds = raw.questionIds || fallback.questionIds || [];
  const totalQuestions = raw.totalQuestions ?? fallback.totalQuestions ?? (questionIds.length || questions.length);
  const hasOuterCurrent = Object.prototype.hasOwnProperty.call(outer, 'currentQuestion');
  const hasSessionCurrent = Object.prototype.hasOwnProperty.call(raw, 'currentQuestion');
  const currentQuestion = hasOuterCurrent
    ? outer.currentQuestion
    : hasSessionCurrent
      ? raw.currentQuestion
      : (questions[currentIndex] || (questions.length === 1 ? questions[0] : null) || null);

  return {
    ...merged,
    id: raw.id ?? fallback.id,
    subject: raw.subject || fallback.subject || 'economics',
    mode: raw.mode || fallback.mode || 'daily',
    status: raw.status || fallback.status || 'in_progress',
    currentIndex,
    totalQuestions: Number(totalQuestions) || questions.length,
    score: Number(raw.score ?? fallback.score ?? 0) || 0,
    maxScore: Number(raw.maxScore ?? fallback.maxScore ?? 0) || 0,
    questions,
    questionIds,
    currentQuestion,
    summary: outer.summary || raw.summary || fallback.summary || null,
  };
}

function makeIdempotencyKey(sessionId, questionId) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${sessionId}-${questionId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function modeTone(tone) {
  if (tone === 'amber') return 'bg-[color:var(--block-amber)] text-text-warning';
  if (tone === 'coral') return 'bg-[color:var(--block-coral)] text-[color:var(--mark-coral)]';
  if (tone === 'green') return 'bg-[color:var(--block-green)] text-[color:var(--mark-green)]';
  return 'bg-[color:var(--block-blue)] text-accent';
}

function formatTimer(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function accuracyPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number <= 1 ? number * 100 : number)));
}

function RecommendationCard({ recommendation, starting, onStart }) {
  if (!recommendation) return null;
  return (
    <section className="animate-rise mb-10 rounded-3xl border border-line-soft bg-surface-raised p-7 shadow-card md:p-9">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-accent">
            <SparklesIcon className="h-4 w-4" aria-hidden="true" /> Recommended
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-2xl font-extrabold tracking-tight text-text-primary md:text-3xl">
            {recommendation.outcome?.title ? `Strengthen ${recommendation.outcome.title}` : 'Take your next best step'}
          </h2>
          <p className="mt-3 inline-flex items-center rounded-full bg-surface-soft px-3 py-1.5 text-xs font-bold text-text-muted">
            {MODE_MAP.get(recommendation.mode)?.label || 'Personalised practice'}
            {recommendation.estimatedMinutes ? ` · ${recommendation.estimatedMinutes} min` : ''}
          </p>
        </div>
        <button type="button" onClick={onStart} disabled={starting} className="press focus-ring inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-7 text-base font-bold text-accent-contrast shadow-card transition-colors hover:bg-accent-strong disabled:opacity-50">
          {starting ? 'Starting…' : 'Start'} {!starting && <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </section>
  );
}

function ResumeCard({ session, onResume }) {
  const mode = MODE_MAP.get(session.mode) || MODE_MAP.get('daily');
  const progress = session.totalQuestions ? Math.min(session.currentIndex + 1, session.totalQuestions) : session.currentIndex + 1;
  return (
    <section className="animate-rise surface-card mb-6 flex flex-col gap-5 border-l-4 border-l-accent sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${modeTone(mode.tone)}`}>
          <PlayIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-text-dim">Ready to resume</p>
          <h2 className="mt-1 text-xl font-display font-extrabold text-text-primary">{mode.label}</h2>
          <p className="mt-1 text-sm font-medium text-text-muted">Continue from question {progress}{session.totalQuestions ? ` of ${session.totalQuestions}` : ''}.</p>
        </div>
      </div>
      <button type="button" onClick={onResume} className="btn-primary shrink-0">
        Continue session <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </section>
  );
}

function ModePicker({ selectedMode, startingMode, onStart }) {
  return (
    <section aria-labelledby="practice-modes-heading" className="animate-rise">
      <div className="mb-6">
        <span className="section-kicker">Choose your focus</span>
        <h2 id="practice-modes-heading" className="text-2xl font-display font-extrabold tracking-tight text-text-primary">Practice modes</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PRACTICE_MODES.map((mode) => {
          const Icon = mode.icon;
          const selected = selectedMode === mode.id;
          const starting = startingMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onStart(mode.id)}
              disabled={Boolean(startingMode)}
              aria-label={`Start ${mode.label}`}
              className={`surface-card-interactive group min-h-52 text-left disabled:cursor-wait ${selected ? 'border-accent ring-1 ring-accent' : 'hover:border-accent/50'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className={`grid h-10 w-10 place-items-center rounded-full ${modeTone(mode.tone)}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="rounded-full bg-surface-soft px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-text-muted">{mode.detail}</span>
              </div>
              <h3 className="mt-5 text-lg font-display font-extrabold text-text-primary">{mode.label}</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-text-muted">{mode.description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-accent">
                {starting ? 'Starting…' : 'Start practice'} {!starting && <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SessionHeader({ session, secondsRemaining, onExit }) {
  const mode = MODE_MAP.get(session.mode) || MODE_MAP.get('daily');
  const currentNumber = Math.min((session.currentIndex || 0) + 1, session.totalQuestions || (session.currentIndex || 0) + 1);
  const progress = session.totalQuestions ? Math.round((Math.max(0, currentNumber - 1) / session.totalQuestions) * 100) : 0;
  const completedQuestions = Math.max(0, currentNumber - 1);
  return (
    <header className="mb-8 md:mb-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface-raised ring-1 ring-line-soft">
            <img src="/logo.png" alt="" className="h-full w-full scale-105 object-cover" />
          </span>
          <div>
            <p className="text-sm font-extrabold tracking-tight text-text-primary">Caplet practice</p>
            <p className="text-xs font-medium text-text-dim">Focus mode</p>
          </div>
        </div>
        <button type="button" onClick={onExit} aria-label="Practice home" className="inline-flex min-h-11 items-center gap-2 rounded-2xl px-3 text-sm font-bold text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Back to practice</span><span className="sm:hidden">Exit</span>
        </button>
      </div>

      <div className="mt-6 rounded-3xl border border-line-soft bg-surface-raised p-5 shadow-card sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">{mode.label} · Practice session</p>
            <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
              Question {currentNumber}<span className="text-text-muted">{session.totalQuestions ? ` of ${session.totalQuestions}` : ''}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {session.mode === 'timed-exam' && secondsRemaining != null && (
              <span className={`inline-flex min-h-10 items-center gap-2 rounded-2xl px-3.5 font-mono text-sm font-bold ${secondsRemaining <= 300 ? 'bg-surface-error text-text-error' : 'bg-surface-soft text-text-primary'}`} aria-label={`${formatTimer(secondsRemaining)} remaining`}>
                <ClockIcon className="h-4 w-4" aria-hidden="true" /> {formatTimer(secondsRemaining)}
              </span>
            )}
            {session.maxScore > 0 && <span className="inline-flex min-h-10 items-center rounded-2xl bg-surface-soft px-3.5 font-mono text-sm font-bold text-text-muted">{session.score} / {session.maxScore} marks</span>}
          </div>
        </div>

        {session.totalQuestions > 0 && (
          <div className="mt-6" role="group" aria-label="Practice progress">
            <div className="mb-2 flex items-center justify-between gap-4 text-xs font-bold text-text-muted">
              <span>Session progress</span>
              <span>{completedQuestions} of {session.totalQuestions} answered</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-soft" role="progressbar" aria-label={`Session progress: ${progress}%`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
              <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function CompletionSummary({ data, session, onRestart }) {
  const summary = data?.summary || session?.summary || {};
  const completedSession = data?.session ? normalizePracticeSession(data) : session;
  const score = summary.score ?? completedSession?.score ?? 0;
  const maxScore = summary.maxScore ?? completedSession?.maxScore ?? 0;
  const accuracy = accuracyPercent(summary.accuracy ?? (maxScore ? score / maxScore : 0));
  const masteryChanges = summary.masteryChanges || [];
  const recommendation = summary.nextRecommendation;

  return (
    <div className="mx-auto max-w-4xl">
      <section className="animate-rise overflow-hidden rounded-3xl bg-[color:var(--mark-blue)] p-8 text-accent-contrast shadow-card md:p-12">
        <span className="grid h-14 w-14 animate-tada place-items-center rounded-2xl bg-accent-contrast/10">
          <TrophyIcon className="h-8 w-8" aria-hidden="true" />
        </span>
        <p className="mt-7 text-xs font-bold uppercase tracking-[0.14em] text-accent-contrast/65">Session complete</p>
        <h1 className="mt-2 text-4xl font-display font-extrabold tracking-tight text-accent-contrast md:text-6xl">Evidence earned.</h1>
        <p className="mt-4 max-w-xl text-base font-medium leading-relaxed text-accent-contrast/80">Every attempt has updated your learning profile and sharpened what Caplet recommends next.</p>
        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryMetric term="Score" value={maxScore ? `${score}/${maxScore}` : score} delayMs={80} />
          <SummaryMetric term="Accuracy" value={`${accuracy}%`} delayMs={140} />
          <SummaryMetric term="Evidence" value={summary.evidenceCreated ?? completedSession?.totalQuestions ?? 0} delayMs={200} />
          <SummaryMetric term="Outcomes moved" value={masteryChanges.length} delayMs={260} />
        </dl>
      </section>

      {masteryChanges.length > 0 && (
        <section className="mt-6 animate-rise-slow rounded-3xl bg-surface-raised p-6 md:p-8">
          <h2 className="text-2xl font-display font-extrabold text-text-primary">Mastery changes</h2>
          <ul className="mt-5 space-y-3">
            {masteryChanges.map((change, index) => {
              const label = change.outcome?.title || change.title || change.outcomeTitle || change.outcomeCode || `Outcome ${index + 1}`;
              const before = accuracyPercent(change.before ?? change.previousProbability ?? 0);
              const after = accuracyPercent(change.after ?? change.probability ?? change.newProbability ?? 0);
              return (
                <li key={change.outcome?.id || change.outcomeId || label} className="rounded-2xl bg-surface-soft p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-text-primary">{label}</p>
                      {change.reason && <p className="mt-1 text-xs font-medium text-text-muted">{change.reason}</p>}
                    </div>
                    <span className="shrink-0 font-mono text-xs font-bold text-accent">{before}% → {after}%</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-raised" role="progressbar" aria-label={`${label} mastery: ${after}%`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={after}>
                    <div
                      className="h-full origin-left animate-bar-fill rounded-full bg-[color:var(--mark-green)]"
                      style={{ width: `${after}%`, animationDelay: `${180 + index * 90}ms` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <LearningNextAction recommendation={recommendation} source="practice_completion" className="mt-6" />

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" onClick={onRestart} className="btn-secondary"><ArrowPathIcon className="h-4 w-4" aria-hidden="true" /> Choose another mode</button>
        <Link to={`/mastery?subject=${encodeURIComponent(session?.subject || 'economics')}`} className="btn-primary">View updated mastery <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
    </div>
  );
}

function SummaryMetric({ term, value, delayMs = 0 }) {
  return (
    <div className="animate-rise rounded-2xl bg-accent-contrast/10 p-4" style={{ animationDelay: `${delayMs}ms` }}>
      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-accent-contrast/60">{term}</dt>
      <dd className="mt-2 font-display text-2xl font-extrabold text-accent-contrast">{value}</dd>
    </div>
  );
}

export default function Practice() {
  const [searchParams] = useSearchParams();
  const subject = searchParams.get('subject') || 'economics';
  const requestedMode = MODE_MAP.has(searchParams.get('mode')) ? searchParams.get('mode') : '';
  const requestedOutcomeId = searchParams.get('outcomeId') || '';
  const requestedAssignmentId = searchParams.get('assignmentId') || '';
  const requestedSessionId = searchParams.get('session') || '';
  const requestedFocusId = searchParams.get('focusId') || '';
  const requestedResourceId = searchParams.get('resourceId') || '';
  const requestedSource = searchParams.get('source') || 'practice';
  const requestedReturnTo = searchParams.get('returnTo') || '';
  const [phase, setPhase] = useState('landing');
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [recommendation, setRecommendation] = useState(null);
  const [resumableSession, setResumableSession] = useState(null);
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [startingMode, setStartingMode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [retryingPrevious, setRetryingPrevious] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const draftTimer = useRef(null);
  const autoStartRef = useRef(false);

  useEffect(() => {
    document.body.classList.toggle('practice-focus-mode', phase === 'session');
    return () => document.body.classList.remove('practice-focus-mode');
  }, [phase]);

  useEffect(() => {
    if (phase !== 'session') return undefined;
    const scrollTimer = window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }), 40);
    return () => window.clearTimeout(scrollTimer);
  }, [currentQuestion?.id, phase]);

  const loadLanding = useCallback(async () => {
    setInitialLoading(true);
    setLoadError('');
    const saved = readSavedSession(subject);
    const sessionId = requestedSessionId || saved?.id;
    try {
      const [recommendationData, sessionData] = await Promise.all([
        api.getNextRecommendation(subject).catch(() => ({ recommendation: null })),
        sessionId ? api.getPracticeSession(sessionId).catch((error) => ({ error })) : Promise.resolve(null),
      ]);
      setRecommendation(recommendationData?.recommendation || null);

      if (sessionData?.error) {
        clearSavedSession(subject);
        if (requestedSessionId) throw sessionData.error;
      } else if (sessionData) {
        const restored = normalizePracticeSession(sessionData, { id: sessionId, subject });
        if (restored.status === 'completed') {
          clearSavedSession(subject);
          if (requestedSessionId) {
            setSession(restored);
            setCompletion({ session: restored, summary: restored.summary });
            setPhase('complete');
          }
        } else if (restored.status === 'in_progress' || restored.status === 'active') {
          saveSession(subject, restored);
          if (requestedSessionId) {
            setSession(restored);
            const pending = restored.config?.feedbackPending;
            setCurrentQuestion(pending?.questionId ? restored.questions?.find((question) => question.id === pending.questionId) || restored.currentQuestion : restored.currentQuestion);
            setAnswerResult(pending?.result ? { ...pending.result, session: restored } : null);
            setPhase('session');
            api.logEvent?.({ type: 'activity_resumed', idempotencyKey: `activity-resumed:${restored.id}:${Date.now()}`, feature: `learning_loop:${requestedSource}`, entityType: 'practice_session', entityId: restored.id, metadata: { source: requestedSource, mode: restored.mode, currentIndex: restored.currentIndex } });
          } else {
            setResumableSession(restored);
          }
        }
      }
    } catch (error) {
      setLoadError(error.message || 'Could not open that practice session.');
    } finally {
      setInitialLoading(false);
    }
  }, [requestedSessionId, requestedSource, subject]);

  useEffect(() => {
    loadLanding();
  }, [loadLanding]);

  useEffect(() => {
    if (!answerResult || !session?.id || !currentQuestion?.id) return;
    const attemptNumber = Number(answerResult?.session?.attemptCount || answerResult?.attemptCount || 1);
    api.logEvent?.({
      type: 'feedback_viewed',
      idempotencyKey: `practice-feedback:${session.id}:${currentQuestion.id}:${attemptNumber}`,
      feature: 'practice',
      entityType: 'practice_question',
      entityId: currentQuestion.id,
      metadata: {
        mode: session.mode || 'practice',
        markingMethod: answerResult?.feedback?.markingMethod || answerResult?.markingMethod || 'deterministic',
      },
    });
  }, [answerResult, currentQuestion?.id, session?.id, session?.mode]);

  useEffect(() => {
    if (session?.mode !== 'timed-exam' || phase !== 'session') return undefined;
    const explicitRemaining = session.remainingSeconds ?? session.timeRemainingSeconds;
    const duration = Number(
      session.config?.durationSeconds
      ?? session.metadata?.durationSeconds
      ?? ((session.config?.timeLimitMinutes ?? session.metadata?.timeLimitMinutes ?? 40) * 60),
    );
    const startedAt = session.startedAt ? new Date(session.startedAt).getTime() : Date.now();
    const elapsed = Number.isFinite(startedAt) ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0;
    const configured = explicitRemaining != null ? Number(explicitRemaining) : Math.max(0, duration - elapsed);
    setSecondsRemaining(Math.max(0, configured));
    const timer = window.setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, session?.id, session?.mode, session?.startedAt, session?.remainingSeconds, session?.timeRemainingSeconds, session?.config?.durationSeconds, session?.config?.timeLimitMinutes, session?.metadata?.durationSeconds, session?.metadata?.timeLimitMinutes]);

  const startSession = useCallback(async (mode, outcomeId = '') => {
    setStartingMode(mode);
    setActionError('');
    try {
      const data = await api.createPracticeSession({
        mode,
        subject,
        ...(outcomeId ? { outcomeId } : {}),
        ...(mode === 'assigned' && requestedAssignmentId ? { assignmentId: requestedAssignmentId } : {}),
        ...(requestedFocusId ? { focusId: requestedFocusId } : {}),
        ...(requestedResourceId ? { resourceId: requestedResourceId } : {}),
        source: requestedSource,
        ...(requestedReturnTo ? { returnTo: requestedReturnTo } : {}),
      });
      const created = normalizePracticeSession(data, { mode, subject });
      if (!created.id) throw new Error('The server did not return a practice session.');
      if (created.status === 'completed') {
        setSession(created);
        setCompletion({ session: created, summary: created.summary });
        setPhase('complete');
        return;
      }
      saveSession(subject, created);
      setSession(created);
      setResumableSession(null);
      setCurrentQuestion(created.currentQuestion);
      setAnswerResult(null);
      setCompletion(null);
      setRetryingPrevious(false);
      setPhase('session');
    } catch (error) {
      setActionError(error.message || 'Could not start this practice mode.');
    } finally {
      setStartingMode('');
    }
  }, [requestedAssignmentId, requestedFocusId, requestedResourceId, requestedReturnTo, requestedSource, subject]);

  useEffect(() => {
    if (initialLoading || phase !== 'landing' || !requestedMode || requestedSessionId || resumableSession || autoStartRef.current) return;
    autoStartRef.current = true;
    startSession(requestedMode, requestedOutcomeId);
  }, [initialLoading, phase, requestedMode, requestedOutcomeId, requestedSessionId, resumableSession, startSession]);

  const resumeSession = () => {
    if (!resumableSession) return;
    setSession(resumableSession);
    setCurrentQuestion(resumableSession.currentQuestion);
    setAnswerResult(null);
    setRetryingPrevious(false);
    setActionError('');
    setPhase('session');
    api.logEvent?.({ type: 'activity_resumed', idempotencyKey: `activity-resumed:${resumableSession.id}:${Date.now()}`, feature: `learning_loop:${requestedSource}`, entityType: 'practice_session', entityId: resumableSession.id, metadata: { source: requestedSource, mode: resumableSession.mode, currentIndex: resumableSession.currentIndex } });
  };

  const saveDraft = useCallback((answer, elapsedSeconds = 0) => {
    if (!session?.id || !currentQuestion?.id) return;
    if (draftTimer.current) window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      api.savePracticeDraft(session.id, { questionId: currentQuestion.id, answer, elapsedSeconds }).catch(() => {});
    }, 500);
  }, [currentQuestion?.id, session?.id]);

  const submitAnswer = async ({ answer, timeTakenSeconds }) => {
    if (!session?.id || !currentQuestion?.id) return;
    setSubmitting(true);
    setActionError('');
    try {
      if (draftTimer.current) window.clearTimeout(draftTimer.current);
      const result = await api.submitPracticeAnswer(session.id, {
        questionId: currentQuestion.id,
        answer,
        timeTakenSeconds,
        idempotencyKey: makeIdempotencyKey(session.id, currentQuestion.id),
        retry: retryingPrevious,
      });
      const updated = result?.session
        ? normalizePracticeSession({ session: { ...session, ...result.session } }, session)
        : session;
      setSession(updated);
      saveSession(subject, updated);
      setAnswerResult(result);
    } catch (error) {
      setActionError(error.message || 'Could not check that answer. Your response is still on this page.');
    } finally {
      setSubmitting(false);
    }
  };

  const completeSession = useCallback(async () => {
    if (!session?.id || completing) return;
    setCompleting(true);
    setActionError('');
    try {
      const data = await api.completePracticeSession(session.id);
      const completed = normalizePracticeSession(data, { ...session, status: 'completed' });
      clearSavedSession(subject);
      setSession(completed);
      setCompletion(data);
      setAnswerResult(null);
      setPhase('complete');
    } catch (error) {
      setActionError(error.message || 'Could not finish the session. Try again — your answers are saved.');
    } finally {
      setCompleting(false);
    }
  }, [completing, session, subject]);

  useEffect(() => {
    if (phase === 'session' && session?.mode === 'timed-exam' && secondsRemaining === 0 && secondsRemaining !== null && session?.id && !initialLoading) {
      completeSession();
    }
  }, [completeSession, initialLoading, phase, secondsRemaining, session?.id, session?.mode]);

  const moveNext = () => {
    if (session?.id) api.acknowledgePracticeFeedback(session.id).catch(() => {});
    const nextFromResponse = answerResult?.nextQuestion;
    const updatedSession = answerResult?.session
      ? normalizePracticeSession({ session: { ...session, ...answerResult.session } }, session)
      : session;
    const nextIndex = Number(updatedSession?.currentIndex ?? 0);
    const fallbackNext = updatedSession?.questions?.[nextIndex]
      || updatedSession?.questions?.[nextIndex + 1]
      || null;
    const next = nextFromResponse || updatedSession?.currentQuestion || fallbackNext;
    const atEnd = updatedSession?.totalQuestions > 0 && nextIndex >= updatedSession.totalQuestions;

    if (!next || atEnd || updatedSession?.status === 'completed') {
      completeSession();
      return;
    }
    setSession(updatedSession);
    setCurrentQuestion(next);
    setAnswerResult(null);
    setRetryingPrevious(false);
    setActionError('');
  };

  const retryQuestion = () => {
    const retry = answerResult?.retryQuestion || currentQuestion;
    setCurrentQuestion(retry);
    setAnswerResult(null);
    setRetryingPrevious(true);
    setActionError('');
  };

  const returnHome = () => {
    setPhase('landing');
    setResumableSession(session?.status === 'completed' ? null : session);
    setAnswerResult(null);
    setRetryingPrevious(false);
    setCompletion(null);
    setActionError('');
  };

  const nextLabel = useMemo(() => {
    if (!session) return 'Next question';
    const status = answerResult?.session?.status;
    const index = Number(answerResult?.session?.currentIndex ?? session.currentIndex ?? 0);
    if (status === 'completed' || (session.totalQuestions > 0 && index >= session.totalQuestions)) return 'Finish session';
    return answerResult?.nextQuestion ? 'Try a related question' : 'Next question';
  }, [answerResult, session]);

  if (initialLoading) {
    return <main className="min-h-screen bg-surface-body pt-24"><LearningLoader message="Preparing your practice space…" /></main>;
  }
  if (loadError) {
    return <main className="min-h-screen bg-surface-body pt-24"><LearningError title="That session could not be opened." message={loadError} onRetry={loadLanding} /></main>;
  }

  if (phase === 'complete') {
    return (
      <main className="min-h-screen bg-surface-body py-28 selection:bg-accent selection:text-accent-contrast">
        <div className="container-custom"><CompletionSummary data={completion} session={session} onRestart={returnHome} /></div>
      </main>
    );
  }

  if (phase === 'session') {
    return (
      <main className="min-h-screen bg-surface-body px-5 pb-16 pt-20 selection:bg-accent selection:text-accent-contrast sm:px-8 sm:pt-24 lg:px-12 lg:pb-20 lg:pt-12 xl:px-16">
        <div className="mx-auto w-full max-w-6xl">
          <SessionHeader session={session} secondsRemaining={secondsRemaining} onExit={returnHome} />
          {actionError && <div role="alert" className="mb-6 rounded-2xl bg-surface-error px-5 py-4 text-sm font-bold text-text-error">{actionError}</div>}
          {!currentQuestion && !answerResult && session?.totalQuestions > 0 && session.currentIndex >= session.totalQuestions ? (
            <LearningEmpty
              title="All answers are safely recorded."
              message="Finish this session to update your mastery map and receive your next recommendation."
              action={<button type="button" onClick={completeSession} disabled={completing} className="btn-primary">{completing ? 'Finishing…' : 'Finish session'}</button>}
            />
          ) : !currentQuestion && !answerResult ? (
            <LearningEmpty
              title="No questions are ready for this session."
              message="There may be no due or assigned work yet. Choose another mode and keep learning."
              action={<button type="button" onClick={returnHome} className="btn-primary">Choose another mode</button>}
            />
          ) : answerResult ? (
            <FeedbackPanel result={answerResult} question={currentQuestion} onRetry={retryQuestion} onNext={moveNext} nextLabel={nextLabel} completing={completing} />
          ) : (
            <PracticeQuestion key={currentQuestion?.id} question={currentQuestion} submitting={submitting} onSubmit={submitAnswer} initialAnswer={session?.config?.draft?.questionId === currentQuestion?.id ? session.config.draft.answer : ''} initialElapsedSeconds={session?.config?.draft?.questionId === currentQuestion?.id ? session.config.draft.elapsedSeconds : 0} onAnswerChange={saveDraft} />
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="minimal-page selection:bg-accent selection:text-accent-contrast">
      <div className="container-custom">
        <header className="minimal-page-header flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="section-kicker">Learn by doing</span>
            <h1 className="minimal-page-title">Practice</h1>
            <p className="minimal-page-description">Continue your session or choose a focused mode.</p>
          </div>
          <Link to={`/mastery?subject=${encodeURIComponent(subject)}`} className="btn-secondary w-fit">
            <ListBulletIcon className="h-4 w-4" aria-hidden="true" /> View mastery
          </Link>
        </header>

        {actionError && <div role="alert" className="mb-6 rounded-2xl bg-surface-error px-5 py-4 text-sm font-bold text-text-error">{actionError}</div>}
        {resumableSession && <ResumeCard session={resumableSession} onResume={resumeSession} />}
        <RecommendationCard
          recommendation={recommendation}
          starting={Boolean(startingMode)}
          onStart={() => startSession(recommendation.mode || 'daily', recommendation.outcome?.id || '')}
        />
        <ModePicker selectedMode={requestedMode} startingMode={startingMode} onStart={(mode) => startSession(mode, mode === 'weak-topic' ? requestedOutcomeId : '')} />

      </div>
    </main>
  );
}
