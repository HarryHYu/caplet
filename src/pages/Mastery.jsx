import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRightIcon,
  BoltIcon,
  CalendarDaysIcon,
  ChartBarSquareIcon,
  CheckBadgeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import MasteryOutcomeTree from '../components/learning/MasteryOutcomeTree';
import { LearningEmpty, LearningError, LearningLoader } from '../components/learning/LearningStates';
import { probabilityPercent } from '../lib/learning';
import api from '../services/api';

const SUBJECT_LABELS = {
  economics: 'Economics',
};

function normalizeOutcome(outcome, subject) {
  const mastery = outcome?.mastery || {};
  return {
    ...outcome,
    subject,
    probability: outcome?.probability ?? mastery.probability ?? 0,
    confidence: outcome?.confidence ?? mastery.confidence ?? 0,
    evidenceCount: outcome?.evidenceCount ?? mastery.evidenceCount ?? 0,
    lastDemonstratedAt: outcome?.lastDemonstratedAt ?? mastery.lastDemonstratedAt ?? null,
    retentionStrength: outcome?.retentionStrength ?? mastery.retentionStrength ?? null,
    nextReviewAt: outcome?.nextReviewAt ?? mastery.nextReviewAt ?? null,
    misconceptions: outcome?.misconceptions ?? mastery.misconceptions ?? [],
    children: (outcome?.children || []).map((child) => normalizeOutcome(child, subject)),
  };
}

function buildOutcomeHierarchy(outcomes = [], subject = 'economics') {
  const normalized = outcomes.filter(Boolean).map((outcome) => normalizeOutcome(outcome, subject));
  if (normalized.some((outcome) => outcome.children.length)) return normalized;

  const byId = new Map(normalized.map((outcome) => [String(outcome.id), outcome]));
  const roots = [];
  normalized.forEach((outcome) => {
    const parent = outcome.parentId != null ? byId.get(String(outcome.parentId)) : null;
    if (parent && parent !== outcome) parent.children.push(outcome);
    else roots.push(outcome);
  });
  return roots;
}

function recommendationHref(recommendation, subject) {
  if (!recommendation) return `/practice?subject=${encodeURIComponent(subject)}&mode=diagnostic`;
  if (recommendation.type !== 'practice' && recommendation.resourcePath) return recommendation.resourcePath;
  const params = new URLSearchParams({
    subject: recommendation.subject || subject,
    mode: recommendation.mode || 'daily',
  });
  if (recommendation.outcome?.id) params.set('outcomeId', recommendation.outcome.id);
  return `/practice?${params.toString()}`;
}

function Stat(props) {
  const { label, value, detail } = props;
  const Icon = props.icon;
  return (
    <div className="rounded-3xl bg-surface-raised p-5 shadow-[0_18px_42px_-34px_rgba(20,20,18,0.4)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-text-dim">{label}</p>
          <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-text-primary">{value}</p>
          <p className="mt-1 text-xs font-semibold text-text-muted">{detail}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}

function NextAction({ recommendation, subject }) {
  const href = recommendationHref(recommendation, subject);
  if (!recommendation) {
    return (
      <section className="rounded-3xl bg-[color:var(--block-blue)] p-7 md:p-8">
        <span className="section-kicker">Your next action</span>
        <h2 className="text-2xl font-display font-extrabold text-text-primary">Give Caplet one useful signal.</h2>
        <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-text-muted">
          A short diagnostic gives you an evidence-based starting point and unlocks personalised practice.
        </p>
        <Link to={href} className="btn-primary mt-6 w-fit">
          Start diagnostic <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl bg-[color:var(--mark-blue)] p-7 text-white shadow-[0_28px_58px_-38px_rgba(19,81,170,0.7)] md:p-9">
      <div className="flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.13em] text-white/70">
            <SparklesIcon className="h-4 w-4" aria-hidden="true" /> Next best action
            {recommendation.estimatedMinutes && <span>· {recommendation.estimatedMinutes} min</span>}
          </div>
          <h2 className="mt-3 text-3xl font-display font-extrabold tracking-tight text-white">
            {recommendation.outcome?.title ? `Strengthen ${recommendation.outcome.title}` : 'Continue your recommended practice'}
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-white/80">
            {recommendation.reason || 'This activity is the strongest next step from your recent learning evidence.'}
          </p>
          {recommendation.outcome?.code && (
            <span className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1.5 font-mono text-xs font-bold text-white">
              {recommendation.outcome.code}
            </span>
          )}
        </div>
        <Link to={href} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-accent transition-transform hover:-translate-y-0.5">
          Start now <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

export default function Mastery() {
  const [searchParams] = useSearchParams();
  const subject = searchParams.get('subject') || 'economics';
  const [state, setState] = useState({ loading: true, error: '', data: null, recommendation: null });

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const [masteryData, recommendationData] = await Promise.all([
        api.getMastery(subject),
        api.getNextRecommendation(subject).catch(() => ({ recommendation: null })),
      ]);
      setState({
        loading: false,
        error: '',
        data: masteryData?.mastery || masteryData,
        recommendation: recommendationData?.recommendation || null,
      });
    } catch (error) {
      setState({ loading: false, error: error.message || 'Could not load your mastery map.', data: null, recommendation: null });
    }
  }, [subject]);

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: '' }));
    Promise.all([
      api.getMastery(subject),
      api.getNextRecommendation(subject).catch(() => ({ recommendation: null })),
    ]).then(([masteryData, recommendationData]) => {
      if (!active) return;
      setState({
        loading: false,
        error: '',
        data: masteryData?.mastery || masteryData,
        recommendation: recommendationData?.recommendation || null,
      });
    }).catch((error) => {
      if (!active) return;
      setState({ loading: false, error: error.message || 'Could not load your mastery map.', data: null, recommendation: null });
    });
    return () => { active = false; };
  }, [subject]);

  const hierarchy = useMemo(
    () => buildOutcomeHierarchy(state.data?.outcomes || [], subject),
    [state.data?.outcomes, subject],
  );

  if (state.loading) {
    return <main className="min-h-screen bg-surface-body pt-24"><LearningLoader message="Building your mastery map…" /></main>;
  }
  if (state.error) {
    return <main className="min-h-screen bg-surface-body pt-24"><LearningError message={state.error} onRetry={load} /></main>;
  }

  const summary = state.data?.summary || {};
  const flatOutcomes = (state.data?.outcomes || []).filter(Boolean);
  const totalOutcomes = summary.totalOutcomes != null ? Number(summary.totalOutcomes) : flatOutcomes.length;
  const mastered = summary.mastered != null
    ? Number(summary.mastered)
    : flatOutcomes.filter((outcome) => probabilityPercent(outcome.probability ?? outcome.mastery?.probability) >= 80).length;
  const dueForReview = summary.dueForReview != null
    ? Number(summary.dueForReview)
    : flatOutcomes.filter((outcome) => outcome.nextReviewAt && new Date(outcome.nextReviewAt) <= new Date()).length;
  const averageProbability = summary.averageProbability ?? (flatOutcomes.length
    ? flatOutcomes.reduce((sum, outcome) => sum + probabilityPercent(outcome.probability ?? outcome.mastery?.probability), 0) / flatOutcomes.length
    : 0);
  const averagePercent = probabilityPercent(averageProbability);

  return (
    <main className="min-h-screen bg-surface-body py-28 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="mb-12 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="font-hand text-xl text-accent -rotate-2 inline-block">evidence, not guesswork</span>
            <h1 className="mt-2 font-display text-5xl font-extrabold tracking-tight text-text-primary md:text-7xl">My mastery.</h1>
            <p className="mt-5 max-w-2xl text-lg font-medium leading-relaxed text-text-muted">
              See what you can demonstrate, what may be fading, and the clearest next step in {SUBJECT_LABELS[subject] || subject}.
            </p>
          </div>
          <Link to={`/practice?subject=${encodeURIComponent(subject)}`} className="btn-secondary w-fit">
            Open practice <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Mastery summary">
          <Stat icon={ChartBarSquareIcon} label="Overall mastery" value={`${averagePercent}%`} detail="Across mapped outcomes" />
          <Stat icon={CheckBadgeIcon} label="Mastered" value={mastered} detail={`of ${totalOutcomes} outcomes`} />
          <Stat icon={CalendarDaysIcon} label="Due for review" value={dueForReview} detail={dueForReview ? 'Ready to strengthen' : 'Nothing overdue'} />
          <Stat icon={BoltIcon} label="Learning evidence" value={flatOutcomes.reduce((sum, outcome) => sum + (Number(outcome.evidenceCount ?? outcome.mastery?.evidenceCount) || 0), 0)} detail="Recorded attempts" />
        </section>

        <NextAction recommendation={state.recommendation} subject={subject} />

        <section className="mt-12" aria-labelledby="outcome-map-heading">
          <div className="mb-6">
            <span className="section-kicker">Curriculum map</span>
            <h2 id="outcome-map-heading" className="text-3xl font-display font-extrabold tracking-tight text-text-primary">Outcome-by-outcome evidence</h2>
            <p className="mt-2 text-sm font-medium text-text-muted">Mastery changes as you diagnose, practise, and revisit ideas over time.</p>
          </div>
          {hierarchy.length ? (
            <MasteryOutcomeTree outcomes={hierarchy} />
          ) : (
            <LearningEmpty
              title="Your mastery map is ready to begin."
              message="Complete a quick diagnostic and your first evidence-backed outcome estimates will appear here."
              action={<Link to={`/practice?subject=${encodeURIComponent(subject)}&mode=diagnostic`} className="btn-primary">Start diagnostic <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>}
            />
          )}
        </section>
      </div>
    </main>
  );
}
