import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useReveal } from '../lib/useReveal';
import CapletLoader from '../components/CapletLoader';
import {
  SparklesIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ClockIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const RESPONSE_TYPES = [
  { key: 'short_answer', label: 'Short answer' },
  { key: 'stimulus_response', label: 'Stimulus response' },
  { key: 'extended_response', label: 'Extended response' },
];

const MARKING_MESSAGES = [
  'Reading your answer…',
  'Checking terminology and structure…',
  'Weighing it against HSC marking criteria…',
  'Writing a stronger model answer…',
  'Almost there…',
];

function CyclingMessage({ messages, intervalMs = 2200 }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % messages.length), intervalMs);
    return () => clearInterval(id);
  }, [messages.length, intervalMs]);
  return <span>{messages[idx]}</span>;
}

function MarkRing({ mark, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((mark / total) * 100)) : 0;
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-20 h-20 shrink-0">
        <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
          <path className="stroke-line-soft" strokeWidth="3" fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          <path className="stroke-accent" strokeWidth="3" fill="none" strokeLinecap="round"
            strokeDasharray={`${pct}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-display font-extrabold text-text-primary leading-none">{mark}</span>
          <span className="text-[10px] text-text-dim leading-none mt-0.5">/ {total}</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-accent">Estimated mark</p>
        <p className="text-sm text-text-muted mt-1">Practice feedback — not an official mark.</p>
      </div>
    </div>
  );
}

function FeedbackResult({ attempt, onNew }) {
  return (
    <div className="bg-surface-raised rounded-3xl p-6 md:p-10 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-8 border-b border-line-soft">
        <MarkRing mark={attempt.estimatedMark} total={attempt.markValue} />
        <span className="shrink-0 text-sm font-bold px-4 py-2 rounded-full bg-block-blue text-blue self-start md:self-center">
          {attempt.band}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-3">
            <CheckCircleIcon className="w-4 h-4 text-emerald-500" /> What you did well
          </h3>
          {attempt.strengths?.length ? (
            <ul className="space-y-2">
              {attempt.strengths.map((s, i) => (
                <li key={i} className="text-sm text-text-muted leading-relaxed flex gap-2">
                  <span className="text-emerald-500 mt-0.5">&bull;</span><span>{s}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-text-dim italic">Nothing specific flagged.</p>}
        </div>
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-3">
            <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" /> What was missing
          </h3>
          {attempt.gaps?.length ? (
            <ul className="space-y-2">
              {attempt.gaps.map((g, i) => (
                <li key={i} className="text-sm text-text-muted leading-relaxed flex gap-2">
                  <span className="text-amber-500 mt-0.5">&bull;</span><span>{g}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-text-dim italic">No major gaps flagged.</p>}
        </div>
      </div>

      {attempt.terminology?.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-text-primary mb-3">Terminology to add</h3>
          <div className="flex flex-wrap gap-2">
            {attempt.terminology.map((t, i) => (
              <span key={i} className="text-xs font-semibold px-3 py-1.5 bg-accent/10 text-accent rounded-full">{t}</span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-sm font-bold text-text-primary mb-3">Stronger model answer</h3>
        <p className="p-5 rounded-2xl bg-block-cream font-serif text-sm md:text-base leading-relaxed whitespace-pre-wrap text-text-primary">
          {attempt.modelAnswer}
        </p>
      </div>

      {attempt.nextRecommendation && (
        <div className="p-5 rounded-2xl bg-block-blue mb-8">
          <p className="text-xs font-bold uppercase tracking-wide text-blue mb-1.5">Next practice</p>
          <p className="text-sm text-text-primary leading-relaxed">{attempt.nextRecommendation}</p>
        </div>
      )}

      <button type="button" onClick={onNew}
        className="btn-primary inline-flex items-center gap-2 hover:-translate-y-0.5 transition-transform">
        <SparklesIcon className="w-4 h-4" /> Mark another answer
      </button>
    </div>
  );
}

function MarkingForm({ onMarked }) {
  const [question, setQuestion] = useState('');
  const [markValue, setMarkValue] = useState(6);
  const [responseType, setResponseType] = useState('short_answer');
  const [focusArea, setFocusArea] = useState('');
  const [studentAnswer, setStudentAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!question.trim()) return setError('Enter the question you were answering.');
    if (!studentAnswer.trim() || studentAnswer.trim().length < 15) {
      return setError('Write a bit more — at least a couple of sentences — so there is something to mark.');
    }
    setBusy(true);
    try {
      const res = await api.markEconomicsAnswer({
        question: question.trim(),
        markValue: Number(markValue) || 1,
        responseType,
        studentAnswer,
        focusArea: focusArea.trim(),
      });
      onMarked(res.attempt);
    } catch (e2) {
      setError(e2?.message || 'Could not mark this answer right now.');
    } finally {
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <div className="bg-surface-raised rounded-3xl p-10 text-center shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-5" />
        <p className="font-display text-lg font-extrabold tracking-tight text-text-primary mb-2">Marking your answer</p>
        <p className="text-sm text-text-muted"><CyclingMessage messages={MARKING_MESSAGES} /></p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-surface-raised rounded-3xl p-6 md:p-8 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
      <label className="block text-xs font-bold uppercase tracking-wide text-text-dim mb-2">Question</label>
      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="e.g. Explain how an increase in the cash rate affects aggregate demand."
        rows={2}
        className="w-full mb-4 px-4 py-3 rounded-xl bg-surface-body border border-line-soft text-text-primary placeholder:text-text-dim outline-none focus:border-accent transition-colors font-body resize-y"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide text-text-dim mb-2">Marks</label>
          <input
            type="number" min={1} max={25} value={markValue}
            onChange={(e) => setMarkValue(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-surface-body border border-line-soft text-text-primary outline-none focus:border-accent transition-colors font-body"
          />
        </div>
        <div className="col-span-2 md:col-span-1">
          <label className="block text-xs font-bold uppercase tracking-wide text-text-dim mb-2">Type</label>
          <select
            value={responseType} onChange={(e) => setResponseType(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-surface-body border border-line-soft text-text-primary outline-none focus:border-accent transition-colors font-body"
          >
            {RESPONSE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        <div className="col-span-2 md:col-span-1">
          <label className="block text-xs font-bold uppercase tracking-wide text-text-dim mb-2">Focus area <span className="normal-case font-medium text-text-dim/60">(optional)</span></label>
          <input
            type="text" value={focusArea} onChange={(e) => setFocusArea(e.target.value)}
            placeholder="e.g. Monetary policy"
            className="w-full px-4 py-3 rounded-xl bg-surface-body border border-line-soft text-text-primary placeholder:text-text-dim outline-none focus:border-accent transition-colors font-body"
          />
        </div>
      </div>

      <label className="block text-xs font-bold uppercase tracking-wide text-text-dim mb-2">Your answer</label>
      <textarea
        value={studentAnswer}
        onChange={(e) => setStudentAnswer(e.target.value)}
        placeholder="Write or paste your answer here…"
        rows={9}
        className="w-full px-4 py-3 rounded-xl bg-surface-body border border-line-soft text-text-primary placeholder:text-text-dim outline-none focus:border-accent transition-colors font-body resize-y"
      />

      {error && <p className="text-sm text-rose-400 mt-3 font-medium">{error}</p>}

      <div className="flex items-center justify-between mt-5">
        <p className="text-[11px] text-text-dim/60 max-w-xs">Estimated mark and feedback are AI-generated practice guidance, not an official result.</p>
        <button type="submit" disabled={busy}
          className="btn-primary shrink-0 inline-flex items-center gap-2 hover:-translate-y-0.5 transition-transform disabled:opacity-40">
          <SparklesIcon className="w-4 h-4" /> Mark my answer
        </button>
      </div>
    </form>
  );
}

function HistoryList({ attempts, onOpen, onDelete }) {
  if (!attempts.length) {
    return (
      <div className="bg-block-cream rounded-3xl p-10 text-center shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
        <ClockIcon className="w-8 h-8 text-text-dim mx-auto mb-4" />
        <p className="text-text-dim text-sm font-medium">No attempts yet — mark your first answer to see it here.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3">
      {attempts.map((a) => (
        <div key={a.id}
          className="bg-surface-raised rounded-2xl p-5 flex items-center justify-between gap-4 group shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
          <button type="button" onClick={() => onOpen(a.id)} className="min-w-0 text-left flex-1 flex items-center gap-4">
            <div className="w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-display font-extrabold text-accent">{a.estimatedMark}/{a.markValue}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate">{a.question}</p>
              <p className="text-xs font-medium text-text-dim mt-1">{a.band}{a.focusArea ? ` · ${a.focusArea}` : ''}</p>
            </div>
          </button>
          <button type="button" onClick={() => onDelete(a.id)}
            className="shrink-0 p-2 text-text-dim hover:text-rose-400 transition-colors" aria-label="Delete attempt">
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function EconomicsMarker() {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null); // full attempt currently shown as feedback
  const [opening, setOpening] = useState(false);
  const mountedRef = useRef(true);

  useReveal(undefined, [loading]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadAttempts = useCallback(async () => {
    const data = await api.getEconomicsAttempts().catch(() => null);
    if (!mountedRef.current) return;
    setAttempts(data?.attempts || []);
  }, []);

  useEffect(() => {
    (async () => {
      await loadAttempts();
      if (mountedRef.current) setLoading(false);
    })();
  }, [loadAttempts]);

  const handleMarked = (attempt) => {
    setActive(attempt);
    loadAttempts();
  };

  const openAttempt = async (id) => {
    setOpening(true);
    try {
      const res = await api.getEconomicsAttempt(id);
      setActive(res.attempt);
    } catch (e) { console.warn('Open attempt failed:', e?.message || e); }
    finally { setOpening(false); }
  };

  const handleDelete = async (id) => {
    try { await api.deleteEconomicsAttempt(id); } catch (e) { console.warn('Delete attempt failed:', e?.message || e); }
    setAttempts((prev) => prev.filter((a) => a.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-body flex items-center justify-center">
        <CapletLoader message="Loading CapletMark…" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom max-w-4xl">
        {active ? (
          <div>
            <button type="button" onClick={() => { setActive(null); loadAttempts(); }}
              className="inline-flex items-center gap-2 text-sm font-medium text-text-dim hover:text-accent transition-colors mb-8">
              <ArrowLeftIcon className="w-4 h-4" /> Back
            </button>
            <p className="text-xs font-bold uppercase tracking-wide text-text-dim mb-2">{RESPONSE_TYPES.find((t) => t.key === active.responseType)?.label || 'Answer'}</p>
            <h1 className="font-display font-extrabold tracking-tight text-2xl md:text-3xl mb-8">{active.question}</h1>
            <FeedbackResult attempt={active} onNew={() => setActive(null)} />
          </div>
        ) : (
          <>
            <header className="mb-12 reveal">
              <span className="font-hand text-2xl text-accent -rotate-2 inline-block mb-3">capletmark</span>
              <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl">
                Mark my HSC <br />Economics answer.
              </h1>
              <p className="mt-8 text-xl text-text-muted font-medium max-w-xl">
                Paste an answer, get an estimated mark, what it did well, what was missing, and a stronger model answer — instantly.
              </p>
            </header>

            <div className="reveal-stagger space-y-10">
              <MarkingForm onMarked={handleMarked} />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-extrabold tracking-tight text-text-primary">Your attempts</h2>
                  {opening && <span className="text-sm text-text-dim inline-flex items-center gap-2">Opening <ArrowRightIcon className="w-3.5 h-3.5" /></span>}
                </div>
                <HistoryList attempts={attempts} onOpen={openAttempt} onDelete={handleDelete} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
