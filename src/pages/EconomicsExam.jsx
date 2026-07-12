import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, ClockIcon, SparklesIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import { economicsResourceLibrary, getExamPackMarkableQuestions } from '../data/economicsResourceLibrary';

const formatTime = (seconds) => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`;
const wordCount = (value) => value.trim() ? value.trim().split(/\s+/).length : 0;

function ExamResults({ session }) {
  const total = session.results.reduce((sum, result) => sum + result.estimatedMark, 0);
  const available = session.results.reduce((sum, result) => sum + result.markValue, 0);
  const gaps = [...new Set(session.results.flatMap((result) => result.gaps || []))].slice(0, 4);
  return (
    <main className="min-h-screen bg-surface-body py-24 text-text-primary">
      <div className="container-custom max-w-4xl">
        <Link to="/library/economics/exam-practice" className="inline-flex items-center gap-2 text-sm font-bold text-text-muted hover:text-accent"><ArrowLeftIcon className="h-4 w-4" /> Exam practice</Link>
        <header className="mt-10 rounded-3xl bg-block-blue p-7 md:p-10">
          <p className="text-xs font-extrabold uppercase tracking-wide text-blue">Timed session complete</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">{total}/{available} estimated marks</h1>
          <p className="mt-3 max-w-xl text-sm font-medium leading-relaxed text-text-muted">Practice feedback only—not an official exam result. Your individual answers are now available in CapletMark too.</p>
        </header>
        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-line-soft bg-surface-raised p-6"><p className="text-xs font-extrabold uppercase tracking-wide text-text-dim">Biggest next improvements</p><ul className="mt-4 grid gap-3">{gaps.map((gap) => <li key={gap} className="flex gap-2 text-sm leading-relaxed text-text-muted"><span className="text-accent">•</span>{gap}</li>)}</ul></div>
          <div className="rounded-2xl border border-line-soft bg-surface-raised p-6"><p className="text-xs font-extrabold uppercase tracking-wide text-text-dim">Keep the loop going</p><p className="mt-4 text-sm leading-relaxed text-text-muted">Your study plan can now use the latest marked feedback to prioritise what comes next.</p><Link to="/study-plan" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-extrabold text-white">Open my study plan <ArrowRightIcon className="h-4 w-4" /></Link></div>
        </section>
        <section className="mt-8 grid gap-4">{session.results.map((result, index) => <article key={result.questionId} className="rounded-2xl border border-line-soft bg-surface-raised p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wide text-text-dim">Question {index + 1}</p><h2 className="mt-1 text-lg font-bold leading-snug">{result.question}</h2></div><span className="rounded-lg bg-accent-soft px-3 py-2 text-sm font-extrabold text-accent">{result.estimatedMark}/{result.markValue}</span></div><p className="mt-4 text-sm font-medium text-text-muted">{result.nextRecommendation}</p></article>)}</section>
      </div>
    </main>
  );
}

export default function EconomicsExam() {
  const { packId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pack = economicsResourceLibrary.examPracticePacks.find((item) => item.id === packId);
  const questions = useMemo(() => getExamPackMarkableQuestions(pack), [pack]);
  const sessionId = searchParams.get('session');
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveState, setSaveState] = useState('');
  const [error, setError] = useState('');
  const saveTimer = useRef(null);

  useEffect(() => {
    if (!sessionId) return;
    api.getEconomicsExam(sessionId).then((data) => { setSession(data.session); setAnswers(data.session.answers || {}); }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [sessionId]);
  useEffect(() => {
    if (!session?.expiresAt || session.status !== 'in_progress') return undefined;
    const update = () => setSecondsLeft(Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000)));
    update(); const timer = setInterval(update, 1000); return () => clearInterval(timer);
  }, [session]);
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  if (!pack) return <main className="min-h-screen bg-surface-body grid place-items-center p-8"><p className="text-text-muted">Exam pack not found.</p></main>;
  if (loading) return <div className="min-h-screen bg-surface-body grid place-items-center"><CapletLoader message="Restoring your exam…" /></div>;
  if (session?.status === 'submitted') return <ExamResults session={session} />;

  const start = async () => {
    setStarting(true); setError('');
    try { const data = await api.startEconomicsExam({ packId: pack.id, packTitle: pack.title, durationMinutes: Math.min(90, Math.max(30, questions.reduce((sum, q) => sum + q.markValue * 2, 0))), questions }); navigate(`?session=${data.session.id}`, { replace: true }); }
    catch (err) { setError(err.message || 'Could not start the session.'); } finally { setStarting(false); }
  };
  if (!session) return <main className="min-h-screen bg-surface-body py-24 text-text-primary"><div className="container-custom max-w-3xl"><Link to="/library/economics/exam-practice" className="inline-flex items-center gap-2 text-sm font-bold text-text-muted hover:text-accent"><ArrowLeftIcon className="h-4 w-4" /> Exam practice</Link><section className="mt-10 rounded-3xl border border-line-soft bg-surface-raised p-7 md:p-10"><p className="text-xs font-extrabold uppercase tracking-wide text-accent">Timed written session</p><h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight">{pack.title}</h1><p className="mt-5 max-w-2xl text-base leading-relaxed text-text-muted">Work through {questions.length} written responses in one focused sitting. Your draft autosaves, and submitting sends each response to CapletMark for practice feedback.</p><div className="mt-8 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-surface-soft p-4"><ClockIcon className="h-5 w-5 text-accent" /><p className="mt-3 text-sm font-extrabold">{Math.min(90, Math.max(30, questions.reduce((sum, q) => sum + q.markValue * 2, 0)))} minutes</p></div><div className="rounded-xl bg-surface-soft p-4"><CheckCircleIcon className="h-5 w-5 text-accent" /><p className="mt-3 text-sm font-extrabold">{questions.length} responses</p></div><div className="rounded-xl bg-surface-soft p-4"><SparklesIcon className="h-5 w-5 text-accent" /><p className="mt-3 text-sm font-extrabold">AI feedback after submit</p></div></div>{error ? <p className="mt-5 text-sm font-bold text-rose-500">{error}</p> : null}<button type="button" onClick={start} disabled={starting} className="mt-8 rounded-xl bg-accent px-6 py-3 text-sm font-extrabold text-white disabled:opacity-50">{starting ? 'Starting…' : 'Start session'}</button></section></div></main>;

  const question = session.questions[index];
  const updateAnswer = (value) => {
    const next = { ...answers, [question.id]: value }; setAnswers(next); setSaveState('Saving…'); clearTimeout(saveTimer.current); saveTimer.current = setTimeout(async () => { try { await api.saveEconomicsExam(session.id, next); setSaveState('Saved'); } catch { setSaveState('Saved locally—retrying when available.'); } }, 700);
  };
  const submit = async () => { if (Object.values(answers).filter((answer) => String(answer || '').trim().length >= 15).length !== session.questions.length) return setError('Finish every written response before submitting.'); setSubmitting(true); setError(''); try { const data = await api.submitEconomicsExam(session.id); setSession(data.session); } catch (err) { setError(err.message || 'Could not submit this session.'); } finally { setSubmitting(false); } };
  return <main className="min-h-screen bg-surface-body py-10 text-text-primary"><div className="mx-auto max-w-5xl px-5 md:px-10"><header className="sticky top-3 z-10 rounded-2xl border border-line-soft bg-surface-raised/95 p-4 shadow-sm backdrop-blur"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wide text-accent">Timed session</p><p className="mt-1 text-sm font-bold">{index + 1} of {session.questions.length} responses <span className="ml-2 text-text-dim">{saveState}</span></p></div><div className={`rounded-xl px-4 py-2 font-mono text-lg font-extrabold ${secondsLeft <= 300 ? 'bg-rose-500/10 text-rose-600' : 'bg-surface-soft text-text-primary'}`}>{secondsLeft == null ? '—:—' : formatTime(secondsLeft)}</div></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-soft"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((index + 1) / session.questions.length) * 100}%` }} /></div></header><section className="mt-8 rounded-3xl border border-line-soft bg-surface-raised p-6 md:p-9"><p className="text-xs font-extrabold uppercase tracking-wide text-text-dim">{question.focusArea}</p><div className="mt-2 flex flex-wrap items-start justify-between gap-4"><h1 className="max-w-3xl font-display text-2xl font-extrabold tracking-tight md:text-3xl">{question.prompt}</h1><span className="shrink-0 rounded-lg bg-accent-soft px-3 py-2 text-sm font-extrabold text-accent">{question.markValue} marks</span></div>{question.stimulus ? <p className="mt-6 rounded-xl border border-line-soft bg-surface-soft p-4 text-sm leading-relaxed text-text-muted">{question.stimulus}</p> : null}<div className="mt-6 overflow-hidden rounded-2xl border border-line-soft bg-surface-soft focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10"><div className="flex items-center justify-between border-b border-line-soft bg-surface-raised px-4 py-2.5"><span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-text-dim">Response draft</span><span className="text-xs font-bold text-text-dim">{wordCount(answers[question.id] || '')} words</span></div><textarea value={answers[question.id] || ''} onChange={(event) => updateAnswer(event.target.value)} rows={12} placeholder="Write your response here…" className="min-h-[22rem] w-full resize-y bg-transparent p-5 text-[16px] leading-8 outline-none placeholder:text-text-dim" /></div></section>{error ? <p className="mt-4 text-sm font-bold text-rose-500">{error}</p> : null}<footer className="mt-6 flex flex-wrap items-center justify-between gap-3"><button type="button" disabled={index === 0} onClick={() => setIndex((value) => value - 1)} className="rounded-xl border border-line-soft bg-surface-raised px-5 py-3 text-sm font-extrabold disabled:opacity-40">Previous</button>{index < session.questions.length - 1 ? <button type="button" onClick={() => setIndex((value) => value + 1)} className="rounded-xl bg-accent px-5 py-3 text-sm font-extrabold text-white">Next response</button> : <button type="button" onClick={submit} disabled={submitting} className="rounded-xl bg-accent px-5 py-3 text-sm font-extrabold text-white disabled:opacity-50">{submitting ? 'Marking responses…' : 'Submit for feedback'}</button>}</footer></div></main>;
}
