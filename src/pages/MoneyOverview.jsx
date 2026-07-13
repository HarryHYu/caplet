import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRightIcon,
  BanknotesIcon,
  ChartBarSquareIcon,
  LockClosedIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import {
  CPI_SNAPSHOT,
  MONEY_INTENTS,
  MONEY_STORAGE_KEYS,
  readMoneyStorage,
  writeMoneyStorage,
} from '../data/moneyPrototype';

function intentById(id) {
  return MONEY_INTENTS.find((intent) => intent.id === id) || MONEY_INTENTS[2];
}

export default function MoneyOverview() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [returning, setReturning] = useState(() => readMoneyStorage(MONEY_STORAGE_KEYS.onboarded, false));
  const [selectedIntent, setSelectedIntent] = useState(() => readMoneyStorage(MONEY_STORAGE_KEYS.intent, 'inflation'));
  const [savedScenario] = useState(() => readMoneyStorage(MONEY_STORAGE_KEYS.savingsScenario, null));
  const selected = intentById(selectedIntent);

  useEffect(() => {
    if (location.hash !== '#learn') return;
    const frame = requestAnimationFrame(() => document.getElementById('learn')?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, [location.hash]);

  const chooseIntent = (intentId) => {
    setSelectedIntent(intentId);
    writeMoneyStorage(MONEY_STORAGE_KEYS.intent, intentId);
  };

  const finishFirstVisit = () => {
    writeMoneyStorage(MONEY_STORAGE_KEYS.onboarded, true);
    writeMoneyStorage(MONEY_STORAGE_KEYS.intent, selectedIntent);
    setReturning(true);
    navigate(selected.to);
  };

  return (
    <div className="min-h-screen bg-surface-body pb-32 pt-28 selection:bg-accent selection:text-white md:pt-32 lg:pb-20">
      <div className="container-custom">
        <header className="mb-10 max-w-4xl reveal">
          <span className="font-hand text-xl text-accent -rotate-2 inline-block">money skills, one useful step at a time</span>
          <h1 className="mt-3 font-display text-5xl font-extrabold tracking-tight text-text-primary md:text-7xl">
            {returning ? `Welcome back${user?.firstName ? `, ${user.firstName}` : ''}.` : 'Money, made understandable.'}
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-medium leading-relaxed text-text-muted">
            Learn the ideas, make sense of Australian data and try scenarios without being told what to do.
          </p>
        </header>

        {!returning ? (
          <section className="mb-8 overflow-hidden rounded-3xl bg-[color:var(--mark-blue)] p-7 text-white shadow-[0_28px_58px_-38px_rgba(19,81,170,0.7)] md:p-10" aria-labelledby="money-first-visit-title">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/70">
                  <SparklesIcon className="h-4 w-4" aria-hidden="true" /> First visit
                </p>
                <h2 id="money-first-visit-title" className="mt-3 max-w-2xl font-display text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                  What would be useful right now?
                </h2>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-white/80">
                  Choose a starting point. No income, savings or debt figures are needed.
                </p>
              </div>
              <button type="button" onClick={finishFirstVisit} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-accent">
                Start with this <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </section>
        ) : (
          <section className="mb-8 overflow-hidden rounded-3xl bg-[color:var(--mark-blue)] p-7 text-white shadow-[0_28px_58px_-38px_rgba(19,81,170,0.7)] md:p-10" aria-labelledby="money-next-action-title">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/70">
                  <SparklesIcon className="h-4 w-4" aria-hidden="true" /> Your next step
                </p>
                <h2 id="money-next-action-title" className="mt-3 max-w-2xl font-display text-3xl font-extrabold tracking-tight text-white md:text-4xl">{selected.actionTitle}</h2>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-white/80">{selected.actionDescription}</p>
              </div>
              <Link to={selected.to} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-accent">
                {selected.actionLabel} <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </section>
        )}

        <section id="learn" className="scroll-mt-28 rounded-3xl bg-surface-raised p-6 shadow-[0_24px_50px_-38px_rgba(20,20,18,0.35)] md:p-8" aria-labelledby="money-intents-title">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="section-kicker">Choose your focus</span>
              <h2 id="money-intents-title" className="font-display text-2xl font-extrabold tracking-tight text-text-primary">What do you want to understand or try?</h2>
            </div>
            <p className="text-sm font-medium text-text-muted">You can change this at any time.</p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MONEY_INTENTS.map((intent) => {
              const active = selectedIntent === intent.id;
              return (
                <button
                  key={intent.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => chooseIntent(intent.id)}
                  className={`min-h-32 rounded-2xl p-5 text-left transition-colors ${active ? 'bg-accent text-white' : 'bg-surface-soft text-text-primary hover:bg-accent-soft'}`}
                >
                  <span className="block font-display text-lg font-extrabold tracking-tight">{intent.label}</span>
                  <span className={`mt-2 block text-sm font-medium leading-relaxed ${active ? 'text-white/80' : 'text-text-muted'}`}>{intent.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-12">
          <Link to="/money/economy/inflation" className="group rounded-3xl bg-[color:var(--block-blue)] p-7 transition-transform hover:-translate-y-0.5 lg:col-span-7 md:p-9">
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-raised text-accent"><ChartBarSquareIcon className="h-6 w-6" aria-hidden="true" /></span>
              <span className="rounded-full bg-surface-raised px-3 py-1.5 text-xs font-bold text-text-muted">Dated local snapshot · not live</span>
            </div>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.14em] text-accent">Australia now</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-text-primary">Inflation was {CPI_SNAPSHOT.value.toFixed(1)}% through the year to {CPI_SNAPSHOT.referencePeriod}.</h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-text-muted">See what that measure means, when it was released and how it differs from a hypothetical inflation experiment.</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-accent">Understand this <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
          </Link>

          <section className="rounded-3xl bg-surface-raised p-7 shadow-[0_24px_50px_-38px_rgba(20,20,18,0.35)] lg:col-span-5 md:p-9" aria-labelledby="my-money-preview-title">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent"><LockClosedIcon className="h-6 w-6" aria-hidden="true" /></span>
            <p className="mt-6 text-xs font-extrabold uppercase tracking-[0.14em] text-accent">My Money</p>
            <h2 id="my-money-preview-title" className="mt-2 font-display text-3xl font-extrabold tracking-tight text-text-primary">{savedScenario?.label || 'A private place for goals.'}</h2>
            <p className="mt-3 text-sm font-medium leading-relaxed text-text-muted">
              {savedScenario ? 'Figures hidden on your overview. Open My Money to choose whether to reveal them.' : 'Teachers and classmates cannot see figures you choose to save here.'}
            </p>
            <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl bg-surface-soft p-4">
              <span className="flex items-center gap-2 text-sm font-bold text-text-primary"><BanknotesIcon className="h-5 w-5 text-accent" aria-hidden="true" /> Figures hidden</span>
              <span aria-hidden="true" className="font-mono text-lg tracking-[0.18em] text-text-dim">••••</span>
            </div>
            <Link to={isAuthenticated ? '/money/my-money' : '/login'} className="btn-primary mt-6 w-fit">
              {isAuthenticated ? 'Open My Money' : 'Sign in for My Money'} <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>
        </div>

        <p className="mt-8 text-center text-xs font-medium text-text-dim">General education and scenario estimates only, not personal financial advice.</p>
      </div>
    </div>
  );
}
