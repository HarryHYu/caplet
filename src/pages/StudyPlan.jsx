import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import { useReveal } from '../lib/useReveal';

const DAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

const EMPTY_FORM = {
  yearLevel: '12',
  subjects: [],
  goal: 'Build a consistent weekly study routine',
  examDates: {},
  availableDays: [1, 3, 5],
  minutesPerDay: 45,
  diagnosticAnswers: {},
};

export default function StudyPlan() {
  const [plan, setPlan] = useState(null);
  const [options, setOptions] = useState({ yearLevels: [], subjects: [] });
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');

  useReveal(undefined, [loading, plan, editing, step]);

  useEffect(() => {
    let cancelled = false;
    api.getStudyPlan()
      .then((data) => {
        if (cancelled) return;
        setPlan(data?.studyPlan || null);
        setOptions(data?.options || { yearLevels: [], subjects: [] });
      })
      .catch((err) => setError(err.message || 'Could not load your study plan.'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const selectedSubjects = useMemo(
    () => options.subjects.filter((subject) => form.subjects.includes(subject.value)),
    [form.subjects, options.subjects],
  );

  const beginEdit = () => {
    setForm(plan ? {
      yearLevel: plan.yearLevel,
      subjects: plan.subjects,
      goal: plan.goal,
      examDates: plan.examDates,
      availableDays: plan.availableDays,
      minutesPerDay: plan.minutesPerDay,
      diagnosticAnswers: plan.diagnosticAnswers,
    } : EMPTY_FORM);
    setStep(0);
    setError('');
    setEditing(true);
  };

  const validateStep = () => {
    if (step === 0 && !form.subjects.length) return 'Choose at least one subject.';
    if (step === 1) {
      if (!form.goal.trim()) return 'Add a study goal.';
      if (!form.availableDays.length) return 'Choose at least one study day.';
      if (selectedSubjects.some((subject) => !form.examDates[subject.value])) return 'Add an exam date for every subject.';
    }
    if (step === 2 && selectedSubjects.some((subject) => !Number.isInteger(form.diagnosticAnswers[subject.value]))) {
      return 'Answer each quick diagnostic question.';
    }
    return '';
  };

  const next = () => {
    const message = validateStep();
    if (message) return setError(message);
    setError('');
    setStep((value) => Math.min(2, value + 1));
  };

  const generate = async () => {
    const message = validateStep();
    if (message) return setError(message);
    setSaving(true);
    setError('');
    try {
      const data = await api.generateStudyPlan(form);
      setPlan(data.studyPlan);
      setOptions(data.options || options);
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Could not generate your plan.');
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (task) => {
    const completed = !task.completed;
    setPlan((current) => ({
      ...current,
      tasks: current.tasks.map((item) => item.id === task.id ? { ...item, completed } : item),
    }));
    try {
      const data = await api.updateStudyTask(task.id, completed);
      setPlan(data.studyPlan);
    } catch (err) {
      setPlan((current) => ({
        ...current,
        tasks: current.tasks.map((item) => item.id === task.id ? { ...item, completed: task.completed } : item),
      }));
      setError(err.message || 'Could not update that task.');
    }
  };

  const regenerate = async () => {
    setSaving(true);
    setError('');
    try {
      const data = await api.regenerateStudyPlan();
      setPlan(data.studyPlan);
    } catch (err) {
      setError(err.message || 'Could not refresh your plan.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-surface-body grid place-items-center"><CapletLoader message="Building your study space…" /></div>;
  }

  if (!plan || editing) {
    return (
      <StudyPlanOnboarding
        form={form}
        setForm={setForm}
        options={options}
        selectedSubjects={selectedSubjects}
        step={step}
        setStep={setStep}
        error={error}
        saving={saving}
        next={next}
        generate={generate}
        cancel={plan ? () => setEditing(false) : null}
      />
    );
  }

  const completed = plan.tasks.filter((task) => task.completed).length;
  const completion = plan.tasks.length ? Math.round((completed / plan.tasks.length) * 100) : 0;
  const nextTask = findNextTask(plan.tasks);
  const overdue = plan.tasks.filter((task) => !task.completed && task.dueDate < todayIso()).length;
  const groupedTasks = groupTasks(plan.tasks);

  return (
    <div className="min-h-screen bg-surface-body py-28 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <header className="reveal mb-14 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="font-hand text-accent text-xl -rotate-2 inline-block mb-3">one useful task at a time</span>
            <h1 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight text-text-primary">My study plan.</h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-text-muted">{plan.signalSummary}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={beginEdit} className="btn-secondary">Change settings</button>
            <button type="button" onClick={regenerate} disabled={saving} className="btn-primary">
              <ArrowPathIcon className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} /> Refresh week
            </button>
          </div>
        </header>

        {error && <div role="alert" className="mb-8 rounded-2xl bg-surface-error px-5 py-4 text-sm font-bold text-text-error">{error}</div>}

        <div className="reveal-stagger mb-14 grid gap-4 sm:grid-cols-3">
          <Stat label="Weekly progress" value={`${completion}%`} detail={`${completed} of ${plan.tasks.length} tasks`} />
          <Stat label="Study rhythm" value={`${plan.minutesPerDay}m`} detail={`${plan.availableDays.length} days each week`} />
          <Stat label="Overdue" value={overdue} detail={overdue ? 'Move these first' : 'You are on track'} />
        </div>

        {nextTask && (
          <section className="reveal mb-14 overflow-hidden rounded-3xl bg-[color:var(--mark-blue)] p-8 md:p-10 text-white shadow-[0_30px_60px_-38px_rgba(19,81,170,0.7)]">
            <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/65">{nextTask.dueDate === todayIso() ? 'Today’s next task' : `Next up · ${formatDate(nextTask.dueDate)}`}</p>
                <h2 className="mt-3 text-3xl md:text-4xl font-display font-extrabold tracking-tight">{nextTask.title}</h2>
                <p className="mt-3 text-white/80">{nextTask.subjectLabel} · {nextTask.estimatedMinutes} minutes · {nextTask.priority} priority</p>
              </div>
              <Link to={nextTask.resourcePath} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-accent hover:-translate-y-0.5 transition-transform">
                Start {nextTask.resourceLabel} <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </section>
        )}

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="reveal">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <span className="font-hand text-accent text-lg -rotate-2 inline-block">your next seven days</span>
                <h2 className="mt-1 text-3xl font-display font-extrabold tracking-tight">Weekly plan</h2>
              </div>
            </div>
            <div className="space-y-4">
              {Object.entries(groupedTasks).map(([date, tasks]) => (
                <div key={date} className="rounded-3xl bg-surface-raised p-5 md:p-6 shadow-[0_18px_40px_-32px_rgba(20,20,18,0.3)]">
                  <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-text-dim">{date === todayIso() ? `Today · ${formatDate(date)}` : formatDate(date)}</p>
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div key={task.id} className={`flex gap-4 rounded-2xl p-4 transition-colors ${task.completed ? 'bg-block-green' : 'bg-surface-soft'}`}>
                        <button type="button" onClick={() => toggleTask(task)} aria-label={`${task.completed ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`} className="mt-0.5 shrink-0">
                          <CheckCircleIcon className={`h-7 w-7 ${task.completed ? 'text-accent' : 'text-text-dim'}`} />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`text-base font-display font-bold ${task.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>{task.title}</h3>
                            {task.priority === 'high' && <span className="rounded-full bg-surface-error px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-text-error">High</span>}
                          </div>
                          <p className="mt-1 text-sm font-medium text-text-muted">{task.subjectLabel} · {task.estimatedMinutes} min</p>
                          <Link to={task.resourcePath} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:text-accent-strong">
                            {task.resourceLabel} <ArrowRightIcon className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="reveal rounded-3xl block-amber p-7">
              <h2 className="text-xl font-display font-extrabold tracking-tight">Priority topics</h2>
              <div className="mt-5 space-y-4">
                {plan.weakTopics.map((topic) => (
                  <div key={`${topic.subject}:${topic.topic}`}>
                    <p className="text-sm font-bold text-text-primary">{topic.topic}</p>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-text-muted">{topic.subjectLabel} · {topic.reason}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="reveal rounded-3xl block-blue p-7">
              <CalendarDaysIcon className="h-7 w-7 text-accent" />
              <h2 className="mt-4 text-xl font-display font-extrabold tracking-tight">Your goal</h2>
              <p className="mt-3 text-sm font-medium leading-relaxed text-text-muted">{plan.goal}</p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function StudyPlanOnboarding({ form, setForm, options, selectedSubjects, step, setStep, error, saving, next, generate, cancel }) {
  const toggleSubject = (subject) => setForm((current) => ({
    ...current,
    subjects: current.subjects.includes(subject)
      ? current.subjects.filter((value) => value !== subject)
      : [...current.subjects, subject],
  }));
  const toggleDay = (day) => setForm((current) => ({
    ...current,
    availableDays: current.availableDays.includes(day)
      ? current.availableDays.filter((value) => value !== day)
      : [...current.availableDays, day],
  }));

  return (
    <div className="min-h-screen bg-surface-body py-28 selection:bg-accent selection:text-white">
      <div className="container-custom max-w-5xl">
        <header className="reveal mb-10 text-center">
          <span className="font-hand text-accent text-xl -rotate-2 inline-block mb-3">ready in under five minutes</span>
          <h1 className="font-display text-5xl md:text-7xl font-extrabold tracking-tight">Plan the week.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg font-medium text-text-muted">Tell Caplet what matters, when you can study, and what needs attention. You&apos;ll get a concrete seven-day plan using resources already in Caplet.</p>
        </header>

        <div className="reveal mx-auto mb-8 flex max-w-xl items-center gap-3">
          {['Subjects', 'Schedule', 'Diagnostic'].map((label, index) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <button type="button" onClick={() => index < step && setStep(index)} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${index <= step ? 'bg-accent text-white' : 'bg-surface-soft text-text-dim'}`}>{index + 1}</button>
              <span className={`hidden text-xs font-bold sm:block ${index <= step ? 'text-text-primary' : 'text-text-dim'}`}>{label}</span>
              {index < 2 && <span className="h-px flex-1 bg-line-soft" />}
            </div>
          ))}
        </div>

        <div className="reveal rounded-3xl bg-surface-raised p-7 md:p-10 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
          {step === 0 && (
            <div>
              <h2 className="text-3xl font-display font-extrabold tracking-tight">What are you studying?</h2>
              <label className="mt-8 block text-sm font-bold text-text-muted">Year level</label>
              <select value={form.yearLevel} onChange={(event) => setForm((current) => ({ ...current, yearLevel: event.target.value }))} className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus:border-accent">
                {options.yearLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
              </select>
              <fieldset className="mt-8">
                <legend className="text-sm font-bold text-text-muted">Subjects</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {options.subjects.map((subject) => {
                    const selected = form.subjects.includes(subject.value);
                    return <button key={subject.value} type="button" onClick={() => toggleSubject(subject.value)} className={`rounded-2xl p-4 text-left text-sm font-bold transition-colors ${selected ? 'bg-accent text-white' : 'bg-surface-soft text-text-primary hover:bg-accent-soft'}`}>{subject.label}</button>;
                  })}
                </div>
              </fieldset>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-3xl font-display font-extrabold tracking-tight">When can you study?</h2>
              <label className="mt-8 block text-sm font-bold text-text-muted">Main goal</label>
              <input value={form.goal} maxLength={200} onChange={(event) => setForm((current) => ({ ...current, goal: event.target.value }))} className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus:border-accent" />
              <fieldset className="mt-8">
                <legend className="text-sm font-bold text-text-muted">Available days</legend>
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {DAY_OPTIONS.map((day) => <button key={day.value} type="button" onClick={() => toggleDay(day.value)} className={`rounded-xl px-3 py-3 text-xs font-bold ${form.availableDays.includes(day.value) ? 'bg-accent text-white' : 'bg-surface-soft text-text-muted'}`}>{day.label}</button>)}
                </div>
              </fieldset>
              <label className="mt-8 block text-sm font-bold text-text-muted">Minutes per study day</label>
              <input type="range" min="15" max="120" step="5" value={form.minutesPerDay} onChange={(event) => setForm((current) => ({ ...current, minutesPerDay: Number(event.target.value) }))} className="mt-4 w-full accent-[var(--accent)]" />
              <p className="mt-2 text-sm font-bold text-accent">{form.minutesPerDay} minutes</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {selectedSubjects.map((subject) => (
                  <label key={subject.value} className="text-sm font-bold text-text-muted">
                    {subject.label} exam date
                    <input type="date" value={form.examDates[subject.value] || ''} onChange={(event) => setForm((current) => ({ ...current, examDates: { ...current.examDates, [subject.value]: event.target.value } }))} className="mt-2 block w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus:border-accent" />
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-3xl font-display font-extrabold tracking-tight">Quick diagnostic</h2>
              <p className="mt-3 text-sm font-medium text-text-muted">One question per subject gives the first priority signal. Future marked work will update the plan automatically.</p>
              <div className="mt-8 space-y-8">
                {selectedSubjects.map((subject) => (
                  <fieldset key={subject.value}>
                    <legend className="text-base font-display font-bold text-text-primary"><span className="text-accent">{subject.label}:</span> {subject.diagnostic.question}</legend>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {subject.diagnostic.options.map((answer, index) => (
                        <button key={answer} type="button" onClick={() => setForm((current) => ({ ...current, diagnosticAnswers: { ...current.diagnosticAnswers, [subject.value]: index } }))} className={`rounded-2xl p-4 text-left text-sm font-semibold ${form.diagnosticAnswers[subject.value] === index ? 'bg-accent text-white' : 'bg-surface-soft text-text-primary hover:bg-accent-soft'}`}>{answer}</button>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            </div>
          )}

          {error && <div role="alert" className="mt-7 flex items-center gap-3 rounded-2xl bg-surface-error px-5 py-4 text-sm font-bold text-text-error"><ExclamationTriangleIcon className="h-5 w-5" />{error}</div>}

          <div className="mt-9 flex items-center justify-between gap-3 border-t border-line-soft pt-6">
            <div>
              {step > 0 && <button type="button" onClick={() => setStep((value) => value - 1)} className="btn-secondary">Back</button>}
              {step === 0 && cancel && <button type="button" onClick={cancel} className="btn-secondary">Cancel</button>}
            </div>
            {step < 2 ? (
              <button type="button" onClick={next} className="btn-primary">Continue <ArrowRightIcon className="h-4 w-4" /></button>
            ) : (
              <button type="button" onClick={generate} disabled={saving} className="btn-primary"><SparklesIcon className="h-4 w-4" />{saving ? 'Building plan…' : 'Build my plan'}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, detail }) {
  return <div className="rounded-3xl bg-surface-raised p-7 shadow-[0_18px_40px_-32px_rgba(20,20,18,0.3)]"><p className="text-xs font-bold uppercase tracking-[0.12em] text-text-dim">{label}</p><p className="mt-3 text-4xl font-display font-extrabold tracking-tight text-text-primary">{value}</p><p className="mt-2 text-sm font-medium text-text-muted">{detail}</p></div>;
}

function findNextTask(tasks) {
  return [...tasks].filter((task) => !task.completed).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] || null;
}

function groupTasks(tasks) {
  return [...tasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).reduce((groups, task) => {
    groups[task.dueDate] = [...(groups[task.dueDate] || []), task];
    return groups;
  }, {});
}

function todayIso() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-AU', { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`));
}
