import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookmarkIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { LearningEmpty, LearningError, LearningLoader } from '../components/learning/LearningStates';
import api from '../services/api';

const GROUP_ICONS = {
  outcomes: ChartBarIcon,
  savedSlides: BookmarkIcon,
  essays: DocumentTextIcon,
};

function optionParts(option, index) {
  if (typeof option === 'string' || typeof option === 'number') {
    return { value: String(option), label: String(option), key: String(option) };
  }
  return {
    value: String(option?.value ?? option?.id ?? option?.key ?? index),
    label: String(option?.label ?? option?.text ?? option?.value ?? `Option ${index + 1}`),
    key: String(option?.id ?? option?.key ?? option?.value ?? index),
  };
}

function isMultipleChoice(item, repair = false) {
  const type = String(repair ? item?.repairResponseType : item?.responseType)
    .toLowerCase()
    .replaceAll('_', '-');
  return ['multiple-choice', 'mcq', 'choice'].includes(type);
}

function ResponseField({ item, value, onChange, repair = false, inputRef }) {
  const options = (repair ? item.repairOptions : item.options) || [];
  if (isMultipleChoice(item, repair) && options.length) {
    return (
      <fieldset>
        <legend className="mb-3 text-sm font-bold text-text-muted">Choose one answer</legend>
        <div className={repair ? 'space-y-1.5' : 'space-y-3'}>
          {options.map((option, index) => {
            const normalized = optionParts(option, index);
            return (
              <label
                key={normalized.key}
                className={`flex cursor-pointer items-start gap-4 rounded-2xl ${repair ? 'px-3 py-2.5' : 'p-4'} transition-colors focus-within:ring-2 focus-within:ring-accent ${
                  value === normalized.value ? 'bg-accent-soft' : 'bg-surface-soft hover:bg-accent-soft'
                }`}
              >
                <input
                  ref={index === 0 ? inputRef : undefined}
                  type="radio"
                  name={repair ? `repair-${item.id}` : `review-${item.id}`}
                  value={normalized.value}
                  checked={value === normalized.value}
                  onChange={(event) => onChange(event.target.value)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--accent)]"
                />
                <span className="text-sm font-semibold leading-relaxed text-text-primary">{normalized.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  const extended = String(repair ? item?.repairResponseType : item?.responseType)
    .toLowerCase()
    .includes('extended');
  return (
    <div>
      <label htmlFor={`${repair ? 'repair' : 'review'}-${item.id}`} className="mb-2 block text-sm font-bold text-text-muted">
        {extended ? 'Write your response' : 'Your answer'}
      </label>
      <textarea
        ref={inputRef}
        id={`${repair ? 'repair' : 'review'}-${item.id}`}
        rows={extended ? 7 : 5}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={extended ? 'Rebuild the idea in your own words…' : 'Explain what you can recall…'}
        className="w-full resize-y rounded-2xl border border-line-soft bg-surface-soft px-5 py-4 text-base font-medium leading-relaxed text-text-primary outline-none placeholder:text-text-dim focus:border-accent focus:ring-2 focus:ring-accent-soft"
      />
    </div>
  );
}

function QueueScreen({ queue, onStart }) {
  const activeGroups = queue.groups.filter((group) => group.count > 0);
  if (!queue.items.length) {
    return (
      <div className="mx-auto max-w-5xl">
        <header className="minimal-page-header">
          <span className="section-kicker">ready when memory is</span>
          <h1 className="minimal-page-title">Review.</h1>
          <p className="minimal-page-description">
            Caplet has combined what is most likely to fade, so your time is focused where it matters.
          </p>
        </header>
        <div className="animate-rise grid min-h-[42vh] content-center">
          <LearningEmpty
            title="Nothing is due right now."
            message="Caplet will line up outcomes, saved slides, and essay material here when they are ready to retrieve."
            action={<Link to="/practice?mode=daily&source=review" className="btn-primary">Keep learning <ArrowRightIcon className="h-4 w-4" /></Link>}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="minimal-page-header">
        <span className="section-kicker">ready when memory is</span>
        <h1 className="minimal-page-title">Your review is lined up.</h1>
        <p className="minimal-page-description">
          Caplet has combined what is most likely to fade, so your time is focused where it matters.
        </p>
      </header>

      <section aria-labelledby="review-queue-heading" className="animate-rise surface-card rounded-3xl p-7 md:p-8">
        <p id="review-queue-heading" className="card-section-title mb-4">Your review queue</p>
        <div className="divide-y divide-line-soft">
          {activeGroups.map((group) => {
            const Icon = GROUP_ICONS[group.id] || SparklesIcon;
            return (
              <div key={group.id} className="grid gap-4 py-5 first:pt-0 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-display font-extrabold text-text-primary">{group.label}</h2>
                  <p className="mt-1 text-sm font-medium text-text-muted">{group.rationale}</p>
                </div>
                <p className="rounded-full bg-surface-soft px-3 py-1.5 text-sm font-bold text-text-muted">{group.count} due</p>
                <p className="inline-flex items-center gap-2 text-sm font-bold text-text-muted">
                  <ClockIcon className="h-5 w-5" aria-hidden="true" /> {group.estimatedMinutes} min
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-sm font-medium text-text-muted">This queue is ordered by recent mistakes and due date.</p>
        <button type="button" onClick={onStart} className="btn-primary mt-6 w-full justify-center rounded-xl py-4 text-base shadow-card">
          Start {queue.estimatedMinutes}-minute review <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        <Link to="/revision" className="press focus-ring mx-auto mt-4 flex w-fit items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-accent hover:bg-accent-soft">
          Adjust this session <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}

function ProgressHeader({ currentIndex, total, estimatedMinutes, onExit }) {
  const progress = total ? Math.round((currentIndex / total) * 100) : 0;
  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button type="button" onClick={onExit} className="inline-flex items-center gap-2 text-sm font-bold text-text-muted hover:text-text-primary">
          <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" /> Back to Review
        </button>
        <div className="flex items-center gap-5">
          <span className="font-mono text-sm font-bold text-text-muted">{Math.min(currentIndex + 1, total)} of {total}</span>
          <span className="inline-flex items-center gap-2 text-sm font-bold text-text-muted">
            <ClockIcon className="h-5 w-5" aria-hidden="true" /> about {estimatedMinutes} min left
          </span>
        </div>
      </div>
      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-surface-soft" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${progress}%` }} />
      </div>
    </header>
  );
}

function RecallScreen({ item, answer, setAnswer, revealed, setRevealed, busy, onGrade }) {
  const inputRef = useRef(null);
  useEffect(() => { window.setTimeout(() => inputRef.current?.focus(), 0); }, [item.id]);

  return (
    <section className="animate-rise rounded-3xl border border-line-soft bg-surface-raised p-6 shadow-card md:p-10">
      <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
        <span className="text-[color:var(--mark-coral)]">{item.recentMiss ? 'Recent miss' : 'Due review'}</span>
        <span className="text-text-dim">·</span>
        <span className="text-text-muted">{item.sourceLabel}</span>
      </div>
      <h1 className="mt-7 max-w-4xl font-display text-3xl font-extrabold leading-tight text-text-primary md:text-5xl">{item.prompt}</h1>

      {!revealed ? (
        <>
          <div className="mt-8">
            <ResponseField item={item} value={answer} onChange={setAnswer} inputRef={inputRef} />
          </div>
          <div className="mt-8 flex justify-end">
            <button type="button" onClick={() => setRevealed(true)} disabled={!String(answer).trim()} className="btn-primary min-w-44">
              Reveal answer <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </>
      ) : (
        <div className="mt-8" aria-live="polite">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-surface-soft p-5">
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-text-dim">Your answer</p>
              <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-text-primary">{answer}</p>
            </div>
            <div className="rounded-2xl bg-[color:var(--block-green)] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-[color:var(--mark-green)]">Source answer</p>
              <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-relaxed text-text-primary">{item.answer}</p>
            </div>
          </div>
          {item.explanation && item.explanation !== item.answer && (
            <p className="mt-4 text-sm font-medium leading-relaxed text-text-muted">{item.explanation}</p>
          )}
          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" disabled={busy} onClick={() => onGrade('fail')} className="btn-secondary">
              <ExclamationCircleIcon className="h-4 w-4" aria-hidden="true" /> Missed it
            </button>
            <button type="button" disabled={busy} onClick={() => onGrade('pass')} className="btn-primary">
              <CheckCircleIcon className="h-4 w-4" aria-hidden="true" /> {busy ? 'Saving…' : 'Got it'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function RepairScreen({ item, previousAnswer, value, setValue, submitted, onSubmit, onContinue, busy }) {
  const inputRef = useRef(null);
  useEffect(() => { window.setTimeout(() => inputRef.current?.focus(), 0); }, [item.id]);
  return (
    <div>
      <header className="minimal-page-header">
        <span className="section-kicker">mistake-led replay</span>
        <h1 className="minimal-page-title">Fix what slipped.</h1>
        <p className="minimal-page-description">Let’s repair this idea and make it stick.</p>
      </header>

      <section className="mt-6 border-y border-line-soft py-4" aria-labelledby="recent-mistake-heading">
        <h2 id="recent-mistake-heading" className="text-lg font-display font-extrabold text-text-primary">Your recent mistake</h2>
        <p className="mt-1 text-sm font-medium text-text-muted">Your first attempt did not come back cleanly.</p>
        <div className="mt-4 rounded-2xl bg-surface-soft p-4">
          <p className="text-sm font-bold text-text-primary">{item.prompt}</p>
          <p className="mt-2 text-sm font-medium text-[color:var(--mark-coral)]">You wrote: {previousAnswer}</p>
        </div>
      </section>

      <section className="py-4" aria-labelledby="misconception-heading">
        <h2 id="misconception-heading" className="flex items-center gap-3 text-lg font-display font-extrabold text-text-primary">
          <ExclamationCircleIcon className="h-6 w-6 text-[color:var(--mark-amber)]" aria-hidden="true" /> Why this was a misconception
        </h2>
        <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-text-muted">
          {item.misconception || item.explanation || 'Compare the idea with the source answer, then retrieve it again in a new context.'}
        </p>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-text-primary">{item.answer}</p>
      </section>

      <section className="border-t border-line-soft pt-4" aria-labelledby="repair-question-heading">
        <h2 id="repair-question-heading" className="text-xl font-display font-extrabold text-text-primary">Try it in a new context</h2>
        <p className="mt-1 text-sm font-medium text-text-muted">Answer once more to show you’ve got it.</p>
        <p className="mt-5 text-lg font-bold leading-relaxed text-text-primary">{item.repairPrompt}</p>
        <div className="mt-5">
          <ResponseField item={item} value={value} onChange={setValue} repair inputRef={inputRef} />
        </div>

        {submitted && (
          <div className="mt-5 rounded-2xl bg-[color:var(--block-green)] p-5" aria-live="polite">
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-[color:var(--mark-green)]">Repair complete</p>
            <p className="mt-2 text-sm font-medium leading-relaxed text-text-primary">{item.repairAnswer}</p>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          {!submitted ? (
            <button type="button" onClick={onSubmit} disabled={!String(value).trim() || busy} className="btn-primary min-w-52">
              {busy ? 'Saving…' : 'Try the new question'} <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button type="button" onClick={onContinue} className="btn-primary">
              Continue review <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function CompletionScreen({ reviewed, repaired, onRestart }) {
  return (
    <div className="mx-auto max-w-4xl text-center">
      <span className="mx-auto grid h-16 w-16 animate-pop place-items-center rounded-2xl bg-[color:var(--block-green)] text-[color:var(--mark-green)]">
        <CheckCircleIcon className="h-9 w-9" aria-hidden="true" />
      </span>
      <p className="mt-7 animate-rise text-xs font-bold uppercase tracking-[0.14em] text-accent">Review complete</p>
      <h1 className="mt-2 animate-rise font-display text-5xl font-extrabold tracking-tight text-text-primary md:text-7xl" style={{ animationDelay: '80ms' }}>Memory strengthened.</h1>
      <p className="mx-auto mt-5 max-w-2xl text-lg font-medium leading-relaxed text-text-muted">
        You retrieved {reviewed} {reviewed === 1 ? 'item' : 'items'} and repaired {repaired} {repaired === 1 ? 'miss' : 'misses'}. Caplet has scheduled each idea for the right next interval.
      </p>
      <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
        <button type="button" onClick={onRestart} className="btn-secondary">Review the queue</button>
        <Link to="/library" className="btn-primary">Back to Learn <ArrowRightIcon className="h-4 w-4" /></Link>
      </div>
    </div>
  );
}

export default function Review() {
  const [searchParams] = useSearchParams();
  const autoStart = searchParams.get('start') === '1';
  const [state, setState] = useState({ loading: true, error: '', queue: null });
  const [phase, setPhase] = useState('queue');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [repairAnswer, setRepairAnswer] = useState('');
  const [repairSubmitted, setRepairSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [repaired, setRepaired] = useState(0);

  const loadQueue = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await api.getReviewQueue();
      const queue = result?.queue || result;
      setState({ loading: false, error: '', queue });
      setPhase(autoStart && queue?.items?.length ? 'recall' : 'queue');
      setCurrentIndex(0);
      setAnswer('');
      setRevealed(false);
      setRepairAnswer('');
      setRepairSubmitted(false);
      setRepaired(0);
    } catch (error) {
      setState({ loading: false, error: error.message || 'Could not build your review queue.', queue: null });
    }
  }, [autoStart]);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const items = state.queue?.items || [];
  const currentItem = items[currentIndex];
  const minutesLeft = useMemo(
    () => Math.max(1, Math.ceil((items.length - currentIndex) * 1.25)),
    [currentIndex, items.length],
  );

  const resetItemState = () => {
    setAnswer('');
    setRevealed(false);
    setRepairAnswer('');
    setRepairSubmitted(false);
  };

  const moveNext = () => {
    if (currentIndex + 1 >= items.length) {
      setPhase('complete');
      return;
    }
    setCurrentIndex((index) => index + 1);
    resetItemState();
    setPhase('recall');
  };

  const grade = async (recall) => {
    if (!currentItem || busy) return;
    setBusy(true);
    try {
      await api.submitReview(currentItem.itemType, currentItem.itemId, recall);
      if (recall === 'fail') {
        setRepaired((count) => count + 1);
        setPhase('repair');
      } else {
        moveNext();
      }
    } catch (error) {
      setState((current) => ({ ...current, error: error.message || 'Could not save that review result.' }));
    } finally {
      setBusy(false);
    }
  };

  if (state.loading) {
    return <main className="min-h-screen bg-surface-body pt-28"><LearningLoader message="Lining up what is due…" /></main>;
  }
  if (state.error && !state.queue) {
    return <main className="min-h-screen bg-surface-body pt-28"><LearningError message={state.error} onRetry={loadQueue} /></main>;
  }

  return (
    <main className={`min-h-screen bg-surface-body ${phase === 'queue' || phase === 'complete' ? 'py-28' : 'py-4'} selection:bg-accent selection:text-accent-contrast`}>
      <div className="container-custom">
        {state.error && (
          <p role="alert" className="mb-6 rounded-2xl bg-surface-error px-5 py-4 text-sm font-bold text-text-error">{state.error}</p>
        )}
        {phase === 'queue' && <QueueScreen queue={state.queue} onStart={() => setPhase('recall')} />}
        {phase === 'recall' && currentItem && (
          <div className="mx-auto max-w-6xl">
            <ProgressHeader currentIndex={currentIndex} total={items.length} estimatedMinutes={minutesLeft} onExit={() => setPhase('queue')} />
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.14em] text-accent">Review sprint</p>
            <RecallScreen
              item={currentItem}
              answer={answer}
              setAnswer={setAnswer}
              revealed={revealed}
              setRevealed={setRevealed}
              busy={busy}
              onGrade={grade}
            />
          </div>
        )}
        {phase === 'repair' && currentItem && (
          <div className="mx-auto max-w-5xl">
            <ProgressHeader currentIndex={currentIndex} total={items.length} estimatedMinutes={minutesLeft} onExit={() => setPhase('queue')} />
            <RepairScreen
              item={currentItem}
              previousAnswer={answer}
              value={repairAnswer}
              setValue={setRepairAnswer}
              submitted={repairSubmitted}
              onSubmit={() => setRepairSubmitted(true)}
              onContinue={moveNext}
              busy={busy}
            />
          </div>
        )}
        {phase === 'complete' && <CompletionScreen reviewed={items.length} repaired={repaired} onRestart={loadQueue} />}
      </div>
    </main>
  );
}
