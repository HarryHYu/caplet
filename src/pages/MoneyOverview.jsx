import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRightIcon, BanknotesIcon, BookmarkSquareIcon, ChartBarSquareIcon, LockClosedIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';
import api from '../services/api';
import { MONEY_INTENTS, MONEY_STORAGE_KEYS, readMoneyStorage, writeMoneyStorage } from '../data/moneyPrototype';
import { useReveal } from '../lib/useReveal';

const CPI_SNAPSHOT = {
  value: 4.0,
  referencePeriod: 'May 2026',
  verified: '13 July 2026',
  sourceUrl: 'https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation/consumer-price-index-australia/may-2026',
};

function intentById(id, myMoneyAvailable) {
  const intent = MONEY_INTENTS.find((item) => item.id === id) || MONEY_INTENTS[2];
  return intent.id === 'save' && myMoneyAvailable ? {
    ...intent,
    actionTitle: 'Build a private savings scenario',
    actionDescription: 'Start with sample numbers or deliberately choose to use your own figures.',
    actionLabel: 'Open My Money',
    to: '/money/my-money',
  } : intent;
}

function formatValue(value, unit) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return 'Unavailable';
  return `${Number(value).toFixed(1)}${unit === 'percent' ? '%' : ''}`;
}

function freshnessLabel(freshness) {
  if (!freshness) return 'No freshness state';
  if (freshness.state === 'source_delayed') return 'Source delayed';
  if (freshness.state === 'stale') return 'Stale source data';
  if (freshness.state === 'unavailable') return 'Awaiting validated release';
  if (freshness.state === 'local_snapshot') return 'Dated local snapshot · not live';
  return freshness.state === 'awaiting_release' ? 'Awaiting next release' : 'Latest validated release';
}

function hasUsableObservation(indicator) {
  const value = indicator?.current?.value;
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

function IndicatorCard({ indicator }) {
  const current = indicator?.current;
  const freshness = indicator?.freshness;
  const tone = freshness?.state === 'current' || freshness?.state === 'awaiting_release' ? 'bg-surface-raised' : 'bg-[color:var(--block-cream)]';
  return (
    <article className={`rounded-3xl ${tone} p-6 shadow-[0_24px_60px_-42px_rgba(20,20,18,0.4)]`}>
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-accent">Official data</p><h2 className="mt-3 font-display text-xl font-extrabold tracking-tight text-text-primary">{indicator.displayTitle}</h2></div><span className="rounded-full bg-surface-soft px-3 py-1.5 text-[11px] font-bold text-text-muted">{indicator.nativeFrequency}</span></div>
      <p className="mt-7 font-display text-4xl font-extrabold tracking-tight text-text-primary">{formatValue(current?.value, indicator.unit)}</p>
      <p className="mt-2 text-sm font-bold text-text-muted">{current?.periodLabel || current?.observationDate || 'No observation available'}</p>
      <p className="mt-5 text-xs font-semibold leading-relaxed text-text-dim">{freshness?.message || 'The official release has not been ingested yet.'}</p>
      <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold text-text-dim"><span className="rounded-full bg-surface-soft px-2.5 py-1">{freshnessLabel(freshness)}</span>{current?.revisionState === 'revised' ? <span className="rounded-full bg-accent-soft px-2.5 py-1 text-accent">Revised</span> : null}</div>
      {(indicator.sourceUrl || indicator.source?.url) && <a href={indicator.sourceUrl || indicator.source.url} target="_blank" rel="noreferrer" className="mt-6 inline-flex text-sm font-bold text-accent underline underline-offset-4">Open source</a>}
    </article>
  );
}

export default function MoneyOverview() {
  const { user, isAuthenticated } = useAuth();
  const { loading: featureFlagsLoading, isEnabled } = useFeatureFlags();
  const location = useLocation();
  const navigate = useNavigate();
  const myMoneyAvailable = !featureFlagsLoading && isEnabled('money.private.persistence');
  const moneyNotice = location.state?.moneyNotice;
  const [returning, setReturning] = useState(() => readMoneyStorage(MONEY_STORAGE_KEYS.onboarded, false));
  const [selectedIntent, setSelectedIntent] = useState(() => readMoneyStorage(MONEY_STORAGE_KEYS.intent, 'inflation'));
  const [indicators, setIndicators] = useState([]);
  const [indicatorState, setIndicatorState] = useState('loading');
  const [savedScenario] = useState(() => readMoneyStorage(MONEY_STORAGE_KEYS.savingsScenario, null));
  const selectedIntentId = MONEY_INTENTS.some((intent) => intent.id === selectedIntent) ? selectedIntent : 'inflation';
  const selected = useMemo(
    () => intentById(selectedIntentId, myMoneyAvailable),
    [myMoneyAvailable, selectedIntentId],
  );
  useReveal(undefined, [returning, selectedIntentId, indicatorState, myMoneyAvailable]);
  const officialEconomyIndicator = indicators.find((indicator) => indicator.key === 'au.cpi.headline.yoy');
  const economyIndicator = hasUsableObservation(officialEconomyIndicator) ? officialEconomyIndicator : {
    key: 'au.cpi.headline.yoy.local',
    displayTitle: 'Inflation',
    nativeFrequency: 'dated snapshot',
    unit: 'percent',
    sourceUrl: CPI_SNAPSHOT.sourceUrl,
    current: { value: CPI_SNAPSHOT.value, periodLabel: CPI_SNAPSHOT.referencePeriod },
    freshness: { state: 'local_snapshot', message: `Verified ${CPI_SNAPSHOT.verified}. This prototype snapshot is not updated automatically.` },
  };

  useEffect(() => {
    let active = true;
    api.getMoneyIndicators().then((data) => { if (active) { setIndicators(data?.indicators || []); setIndicatorState('ready'); } }).catch(() => { if (active) setIndicatorState('unavailable'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (location.hash !== '#learn') return undefined;
    const frame = requestAnimationFrame(() => document.getElementById('learn')?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, [location.hash]);

  const chooseIntent = (intentId) => { setSelectedIntent(intentId); writeMoneyStorage(MONEY_STORAGE_KEYS.intent, intentId); };
  const finishFirstVisit = () => { writeMoneyStorage(MONEY_STORAGE_KEYS.onboarded, true); writeMoneyStorage(MONEY_STORAGE_KEYS.intent, selected.id); setReturning(true); navigate(selected.to); };

  return (
    <div className="min-h-screen bg-surface-body pb-32 pt-28 selection:bg-accent selection:text-white md:pt-32 lg:pb-20">
      <div className="container-custom">
        <header className="reveal mb-10 max-w-4xl"><span className="font-hand text-xl text-accent -rotate-2 inline-block">money skills, one useful step at a time</span><h1 className="mt-3 font-display text-5xl font-extrabold tracking-tight text-text-primary md:text-7xl">{returning ? `Welcome back${user?.firstName ? `, ${user.firstName}` : ''}.` : 'Money, made understandable.'}</h1><p className="mt-5 max-w-2xl text-lg font-medium leading-relaxed text-text-muted">Learn the ideas, make sense of Australian data and try synthetic scenarios without being told what to do.</p></header>
        {moneyNotice ? <div role="status" className="animate-slide-up mb-8 rounded-2xl bg-accent-soft px-5 py-4 text-sm font-bold leading-relaxed text-accent">{moneyNotice}</div> : null}
        {!returning ? (
          <section className="reveal mb-8 overflow-hidden rounded-3xl bg-[color:var(--mark-blue)] p-7 text-white shadow-[0_28px_58px_-38px_rgba(19,81,170,0.7)] md:p-10" aria-labelledby="money-first-visit-title">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div aria-live="polite">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/70"><SparklesIcon className="h-4 w-4" aria-hidden="true" /> First visit · {selected.label}</p>
                <h2 id="money-first-visit-title" className="mt-3 max-w-2xl font-display text-3xl font-extrabold tracking-tight text-white md:text-4xl">{selected.actionTitle}</h2>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-white/80">{selected.actionDescription}</p>
              </div>
              <button type="button" onClick={finishFirstVisit} className="group inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-accent transition-transform hover:-translate-y-0.5 active:translate-y-0">{selected.actionLabel} <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></button>
            </div>
          </section>
        ) : (
          <section className="reveal mb-8 overflow-hidden rounded-3xl bg-[color:var(--mark-blue)] p-7 text-white shadow-[0_28px_58px_-38px_rgba(19,81,170,0.7)] md:p-10" aria-labelledby="money-next-action-title">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div aria-live="polite">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/70"><SparklesIcon className="h-4 w-4" aria-hidden="true" /> Your next step · {selected.label}</p>
                <h2 id="money-next-action-title" className="mt-3 max-w-2xl font-display text-3xl font-extrabold tracking-tight text-white md:text-4xl">{selected.actionTitle}</h2>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-white/80">{selected.actionDescription}</p>
              </div>
              <Link to={selected.to} className="group inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-accent transition-transform hover:-translate-y-0.5">{selected.actionLabel} <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></Link>
            </div>
          </section>
        )}

        <section className="reveal rounded-3xl bg-surface-raised p-6 shadow-[0_24px_50px_-38px_rgba(20,20,18,0.35)] md:p-8" aria-labelledby="money-indicators-title"><div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between"><div><span className="section-kicker">Australia, with dates attached</span><h2 id="money-indicators-title" className="font-display text-2xl font-extrabold tracking-tight text-text-primary">One economy story to understand</h2></div><p className="text-sm font-medium text-text-muted">{indicatorState === 'ready' && hasUsableObservation(officialEconomyIndicator) ? 'Official source metadata travels with the value.' : 'Using a clearly labelled local snapshot.'}</p></div><div className="mt-6 max-w-xl"><IndicatorCard indicator={economyIndicator} /></div></section>

        <section id="learn" className="reveal mt-8 scroll-mt-28 rounded-3xl bg-surface-raised p-6 md:p-8" aria-labelledby="money-intents-title"><div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between"><div><span className="section-kicker">Choose your focus</span><h2 id="money-intents-title" className="font-display text-2xl font-extrabold tracking-tight text-text-primary">What do you want to understand or try?</h2></div><p className="text-sm font-medium text-text-muted">Only synthetic scenario values are used in this pilot.</p></div><div className="reveal-stagger mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{MONEY_INTENTS.map((intent) => { const active = selectedIntentId === intent.id; return <button key={intent.id} type="button" aria-pressed={active} onClick={() => chooseIntent(intent.id)} className={`min-h-32 rounded-2xl p-5 text-left transition-[background-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 ${active ? 'bg-accent text-white shadow-[0_18px_36px_-24px_rgba(19,81,170,0.75)]' : 'bg-surface-soft text-text-primary hover:bg-accent-soft'}`}><span className="block font-display text-lg font-extrabold tracking-tight">{intent.label}</span><span className={`mt-2 block text-sm font-medium leading-relaxed ${active ? 'text-white/80' : 'text-text-muted'}`}>{intent.description}</span></button>; })}</div></section>

        <div className="reveal-stagger mt-8 grid gap-6 lg:grid-cols-12">
          <Link to="/money/economy/inflation" className="group rounded-3xl bg-[color:var(--block-blue)] p-7 transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_46px_-30px_rgba(19,81,170,0.45)] lg:col-span-7 md:p-9">
            <div className="flex items-start justify-between gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-raised text-accent"><ChartBarSquareIcon className="h-6 w-6" aria-hidden="true" /></span><span className="rounded-full bg-surface-raised px-3 py-1.5 text-xs font-bold text-text-muted">{freshnessLabel(economyIndicator.freshness)}</span></div>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.14em] text-accent">Australia now</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-text-primary">Inflation was {Number(economyIndicator.current.value).toFixed(1)}% through the year to {economyIndicator.current.periodLabel}.</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-text-muted">See the reference period and source, then try a clearly separate hypothetical experiment.</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-accent">Understand this <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
          </Link>
          <section className="rounded-3xl bg-surface-raised p-7 shadow-[0_24px_50px_-38px_rgba(20,20,18,0.35)] transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_46px_-30px_rgba(20,20,18,0.45)] lg:col-span-5 md:p-9" aria-labelledby="my-money-preview-title">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent"><LockClosedIcon className="h-6 w-6" aria-hidden="true" /></span>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.14em] text-accent">My Money</p>
            <h2 id="my-money-preview-title" className="mt-2 font-display text-3xl font-extrabold tracking-tight text-text-primary">{myMoneyAvailable ? savedScenario?.label || 'A private place for goals.' : 'Private saving is coming later.'}</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-text-muted">{myMoneyAvailable ? 'Teachers, classmates and classroom features cannot see figures you choose to save here.' : 'You can still explore a savings goal with sample figures without saving private information.'}</p>
            {myMoneyAvailable ? <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-surface-soft p-4"><span className="flex items-center gap-2 text-sm font-bold text-text-primary"><BanknotesIcon className="h-5 w-5 text-accent" aria-hidden="true" /> Figures hidden</span><span aria-hidden="true" className="font-mono text-lg tracking-[0.18em] text-text-dim">••••</span></div> : null}
            {myMoneyAvailable ? (
              <Link to={isAuthenticated ? '/money/my-money' : '/login'} state={!isAuthenticated ? { from: '/money/my-money' } : undefined} className="btn-primary mt-6 w-fit">{isAuthenticated ? 'Open My Money' : 'Sign in for My Money'} <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>
            ) : (
              <Link to="/money/tools/savings-goal" className="btn-primary mt-6 w-fit">Try the savings calculator <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>
            )}
          </section>
        </div>
        <section className="reveal mt-8 flex flex-col gap-6 rounded-3xl bg-[color:var(--block-cream)] p-7 md:flex-row md:items-center md:justify-between md:p-9" aria-labelledby="money-resources-preview-title">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent"><BookmarkSquareIcon className="h-6 w-6" aria-hidden="true" /></span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-accent">Resource hub</p>
              <h2 id="money-resources-preview-title" className="mt-2 font-display text-3xl font-extrabold tracking-tight text-text-primary">A better starting point for research.</h2>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-text-muted">Browse trusted websites for data, markets, investing, tax, work and everyday money — all sorted into one growing library.</p>
            </div>
          </div>
          <Link to="/money/resources" className="btn-primary inline-flex w-fit shrink-0">Browse resources <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></Link>
        </section>
        <p className="reveal mt-8 text-center text-xs font-medium text-text-dim">General education and scenario estimates only, not personal financial advice.</p>
      </div>
    </div>
  );
}
