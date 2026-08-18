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

const STEPS = ['Subjects', 'Schedule', 'Diagnostic'];

const supportsYear = (subject, yearLevel) => (
  !['11', '12'].includes(yearLevel) || subject.yearLevels?.includes(yearLevel)
);

const EMPTY_FORM = {
  yearLevel: '11',
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
  const [recommendation, setRecommendation] = useState(null);
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  // { text } for plain notices, { streak } when a completed task extended the
  // learner's study streak (the day count gets its own celebratory pop).
  const [taskNotice, setTaskNotice] = useState(null);

  useReveal(undefined, [loading, plan, editing, step, recommendation]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getStudyPlan(),
      api.getNextRecommendation('economics').catch(() => null),
    ])
      .then(([data, recommendationData]) => {
        if (cancelled) return;
        setPlan(data?.studyPlan || null);
        setOptions(data?.options || { yearLevels: [], subjects: [] });
        setRecommendation(recommendationData?.recommendation || null);
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not load your study plan.'); })
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
    if (step === 2 && selectedSubjects.some((subject) => subject.diagnostic && !Number.isInteger(form.diagnosticAnswers[subject.value]))) {
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
    if (updatingTaskId || saving) return;
    const completed = !task.completed;
    setUpdatingTaskId(task.id);
    setError('');
    setTaskNotice(null);
    setPlan((current) => ({
      ...current,
      tasks: current.tasks.map((item) => item.id === task.id ? { ...item, completed } : item),
    }));
    try {
      const data = await api.updateStudyTask(task.id, completed);
      setPlan(data.studyPlan);
      setTaskNotice(completed
        ? data.momentum?.currentStreak
          ? { streak: Number(data.momentum.currentStreak) }
          : { text: 'Nice work — task marked complete.' }
        : { text: 'Task reopened for this week.' });
    } catch (err) {
      setPlan((current) => ({
        ...current,
        tasks: current.tasks.map((item) => item.id === task.id ? { ...item, completed: task.completed } : item),
      }));
      setError(err.message || 'Could not update that task.');
      setTaskNotice(null);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const regenerate = async () => {
    if (saving || updatingTaskId) return;
    setSaving(true);
    setError('');
    setTaskNotice(null);
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

  const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
  const completed = tasks.filter((task) => task.completed).length;
  const completion = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
  const nextTask = findNextTask(tasks);
  const today = todayIso();
  const overdue = tasks.filter((task) => !task.completed && task.dueDate < today).length;
  const groupedTasks = groupTasks(tasks);
  const taskGroups = Object.entries(groupedTasks);
  const weakTopics = Array.isArray(plan.weakTopics) ? plan.weakTopics : [];

  return (
    <div className="minimal-page selection:bg-accent selection:text-accent-contrast">
      <div className="container-custom">
        <header className="minimal-page-header reveal flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="section-kicker">This week</span>
            <h1 className="minimal-page-title">Study plan</h1>
            <p className="minimal-page-description">{plan.signalSummary}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={beginEdit} disabled={saving || Boolean(updatingTaskId)} className="btn-secondary disabled:opacity-50">Change settings</button>
            <button type="button" onClick={regenerate} disabled={saving || Boolean(updatingTaskId)} aria-busy={saving} className="btn-primary disabled:opacity-50">
              <ArrowPathIcon className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} aria-hidden="true" /> {saving ? 'Refreshing week…' : 'Refresh week'}
            </button>
          </div>
        </header>

        {error && <div role="alert" className="animate-shake-x mb-8 rounded-2xl bg-surface-error px-5 py-4 text-sm font-bold text-text-error">{error}</div>}
        {taskNotice && (
          <div role="status" className="animate-slide-up mb-8 flex items-center gap-2 rounded-2xl bg-[color:var(--block-green)] px-5 py-4 text-sm font-bold text-text-primary">
            <CheckCircleIcon className="h-5 w-5 text-[color:var(--mark-green)]" aria-hidden="true" />
            {taskNotice.streak ? (
              <span>
                Nice work — today counts. Your meaningful study streak is{' '}
                <span className="inline-block animate-streak-pop font-extrabold text-[color:var(--mark-green)]">
                  {taskNotice.streak} {taskNotice.streak === 1 ? 'day' : 'days'}
                </span>.
              </span>
            ) : taskNotice.text}
          </div>
        )}

        {recommendation?.outcome?.id && Array.isArray(plan.subjects) && plan.subjects.includes(recommendation.subject || 'economics') && (
          <section className="reveal mb-8 flex flex-col gap-6 rounded-3xl bg-[color:var(--block-green)] p-7 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[color:var(--mark-green)]">Live evidence update</p>
              <h2 className="mt-2 text-2xl font-display font-extrabold text-text-primary">
                {recommendation.outcome?.title || 'Add a diagnostic signal'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-text-muted">{recommendation.reason}</p>
            </div>
            <Link to={recommendationHref(recommendation)} className="btn-primary shrink-0">
              Start recommended task <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>
        )}

        <div className="reveal-stagger mb-14 grid gap-4 sm:grid-cols-3">
          <Stat label="Weekly progress" value={`${completion}%`} detail={`${completed} of ${tasks.length} tasks`} />
          <Stat label="Study rhythm" value={`${plan.minutesPerDay}m`} detail={`${Array.isArray(plan.availableDays) ? plan.availableDays.length : 0} days each week`} />
          <Stat label="Overdue" value={overdue} detail={overdue ? 'Move these first' : 'You are on track'} />
        </div>

        {nextTask && (
          <section className="reveal mb-14 overflow-hidden rounded-3xl bg-[color:var(--mark-blue)] p-8 md:p-10 text-accent-contrast shadow-card">
            <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-contrast/65">{taskStatusLabel(nextTask, today)}</p>
                <h2 className="mt-3 text-3xl md:text-4xl font-display font-extrabold tracking-tight">{nextTask.title}</h2>
                <p className="mt-3 text-accent-contrast/80">{nextTask.subjectLabel} · {nextTask.estimatedMinutes} minutes · {nextTask.priority} priority</p>
              </div>
              <Link to={nextTask.resourcePath} className="focus-ring card-lift group inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-accent-contrast px-6 py-3 text-sm font-bold text-accent">
                {taskActionLabel(nextTask.resourceLabel)} <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </section>
        )}

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="reveal">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <span className="font-hand text-lg text-accent -rotate-2 inline-block">your next seven days</span>
                <h2 className="mt-1 text-3xl font-display font-extrabold tracking-tight">Weekly plan</h2>
              </div>
            </div>
            <div className="space-y-4">
              {taskGroups.length ? taskGroups.map(([date, tasks]) => (
                <div key={date} className="rounded-3xl bg-surface-raised p-5 md:p-6 shadow-card">
                  <p className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-text-dim">{date === today ? `Today · ${formatDate(date)}` : formatDate(date)}</p>
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div key={task.id} className={`flex gap-4 rounded-2xl p-4 transition-[background-color,transform,box-shadow] ${task.completed ? 'bg-[color:var(--block-green)]' : 'bg-surface-soft'} ${updatingTaskId === task.id ? 'opacity-70' : ''}`}>
                        <button type="button" onClick={() => toggleTask(task)} aria-label={`${task.completed ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`} aria-pressed={task.completed} aria-busy={updatingTaskId === task.id} disabled={Boolean(updatingTaskId || saving)} className="mt-0.5 shrink-0 rounded-xl transition-transform hover:scale-105 press disabled:cursor-wait disabled:opacity-70">
                          <CheckCircleIcon className={`h-7 w-7 ${task.completed ? 'animate-pop-in text-accent' : 'text-text-dim'}`} aria-hidden="true" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className={`text-base font-display font-bold ${task.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>{task.title}</h3>
                            {task.priority === 'high' && <span className="rounded-full bg-surface-error px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-text-error">High</span>}
                          </div>
                          <p className="mt-1 text-sm font-medium text-text-muted">{task.subjectLabel} · {task.estimatedMinutes} min</p>
                          <Link to={task.resourcePath} className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:text-accent-strong">
                            {task.resourceLabel} <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )) : <div className="rounded-3xl bg-surface-raised p-7 text-sm font-medium leading-relaxed text-text-muted">Your plan is ready, but there are no scheduled tasks yet. Refresh the week or adjust your settings to generate the next set of study actions.</div>}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="reveal rounded-3xl block-amber p-7">
              <h2 className="text-xl font-display font-extrabold tracking-tight">Priority topics</h2>
              <div className="mt-5 space-y-4">
                {weakTopics.length ? weakTopics.map((topic) => (
                  <div key={`${topic.subject}:${topic.topic}`}>
                    <p className="text-sm font-bold text-text-primary">{topic.topic}</p>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-text-muted">{topic.subjectLabel} · {topic.reason}</p>
                  </div>
                )) : <p className="text-sm font-medium leading-relaxed text-text-muted">Marked work will add priority topics here as your evidence grows.</p>}
              </div>
            </section>
            <section className="reveal rounded-3xl block-blue p-7">
              <CalendarDaysIcon className="h-7 w-7 text-accent" aria-hidden="true" />
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
  const [subjectQuery, setSubjectQuery] = useState('');
  const subjectsForYear = options.subjects.filter((subject) => supportsYear(subject, form.yearLevel));
  const visibleSubjects = subjectsForYear.filter((subject) => subject.label.toLowerCase().includes(subjectQuery.trim().toLowerCase()));
  const diagnosticSubjects = selectedSubjects.filter((subject) => subject.diagnostic);
  const placeholderSubjects = selectedSubjects.filter((subject) => !subject.diagnostic);
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
    <div className="minimal-page selection:bg-accent selection:text-accent-contrast">
      <div className="container-custom max-w-5xl">
        <header className="reveal minimal-page-header">
          <span className="section-kicker">Three steps</span>
          <h1 className="minimal-page-title">Plan the week</h1>
          <p className="minimal-page-description">Choose your subjects, time and priorities.</p>
        </header>

        <div className="reveal mx-auto mb-8 flex max-w-xl items-center gap-3">
          {STEPS.map((label, index) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <button type="button" onClick={() => index < step && setStep(index)} disabled={index >= step} aria-label={`${index === step ? 'Current' : index < step ? 'Go back to' : 'Upcoming'} ${label} step`} aria-current={index === step ? 'step' : undefined} className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold transition-transform press disabled:cursor-default ${index <= step ? 'bg-accent text-accent-contrast' : 'bg-surface-soft text-text-dim'}`}>{index + 1}</button>
              <span className={`hidden text-xs font-bold sm:block ${index <= step ? 'text-text-primary' : 'text-text-dim'}`}>{label}</span>
              {index < 2 && <span className="h-px flex-1 bg-line-soft" />}
            </div>
          ))}
        </div>
        <p className="reveal -mt-4 mb-6 text-xs font-bold uppercase tracking-[0.14em] text-text-dim" aria-live="polite">Step {step + 1} of {STEPS.length} · {STEPS[step]}</p>

        <div className="reveal surface-card rounded-3xl p-7 md:p-9">
          <div key={step} className="animate-slide-up">
          {step === 0 && (
            <div>
              <h2 className="text-2xl font-display font-extrabold tracking-tight">What are you studying?</h2>
              <label htmlFor="study-year-level" className="mt-8 block text-sm font-bold text-text-muted">Year level</label>
              <select id="study-year-level" value={form.yearLevel} onChange={(event) => setForm((current) => ({ ...current, yearLevel: event.target.value, subjects: [], examDates: {}, diagnosticAnswers: {} }))} className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none transition-[background-color,border-color,box-shadow] duration-200 focus:border-accent focus:ring-4 focus:ring-accent-soft">
                {options.yearLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
              </select>
              <fieldset className="mt-8">
                <legend className="text-sm font-bold text-text-muted">Subjects <span className="font-medium text-text-dim">({form.subjects.length} selected · {subjectsForYear.length} available)</span></legend>
                <label htmlFor="study-subject-search" className="sr-only">Search subjects</label>
                <input id="study-subject-search" type="search" value={subjectQuery} onChange={(event) => setSubjectQuery(event.target.value)} placeholder={['11', '12'].includes(form.yearLevel) ? `Search Year ${form.yearLevel} subjects` : 'Search all subjects'} className="mt-3 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-sm font-medium text-text-primary outline-none transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-text-dim focus:border-accent focus:ring-4 focus:ring-accent-soft" />
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {visibleSubjects.map((subject) => {
                    const selected = form.subjects.includes(subject.value);
                    return <button key={subject.value} type="button" aria-label={`${subject.label}${subject.placeholder ? ', library coming soon' : ''}`} aria-pressed={selected} onClick={() => toggleSubject(subject.value)} className={`press focus-ring flex items-center justify-between gap-3 rounded-xl border p-4 text-left text-sm font-bold transition-colors duration-150 ${selected ? 'border-accent bg-accent text-accent-contrast' : 'border-line-soft bg-surface-soft text-text-primary hover:border-accent hover:text-accent'}`}><span>{subject.label}</span></button>;
                  })}
                </div>
                {!visibleSubjects.length && <p className="mt-3 rounded-2xl bg-surface-soft px-4 py-3 text-sm font-medium text-text-muted">No subjects match “{subjectQuery}”. Try a different search.</p>}
              </fieldset>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-2xl font-display font-extrabold tracking-tight">When can you study?</h2>
              <label htmlFor="study-goal" className="mt-8 block text-sm font-bold text-text-muted">Main goal</label>
              <input id="study-goal" value={form.goal} maxLength={200} onChange={(event) => setForm((current) => ({ ...current, goal: event.target.value }))} className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none transition-[background-color,border-color,box-shadow] duration-200 focus:border-accent focus:ring-4 focus:ring-accent-soft" />
              <fieldset className="mt-8">
                <legend className="text-sm font-bold text-text-muted">Available days</legend>
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {DAY_OPTIONS.map((day) => <button key={day.value} type="button" aria-pressed={form.availableDays.includes(day.value)} onClick={() => toggleDay(day.value)} className={`rounded-xl px-3 py-3 text-xs font-bold transition-[background-color,transform] duration-200 press ${form.availableDays.includes(day.value) ? 'bg-accent text-accent-contrast' : 'bg-surface-soft text-text-muted'}`}>{day.label}</button>)}
                </div>
              </fieldset>
              <label htmlFor="minutes-per-study-day" className="mt-8 block text-sm font-bold text-text-muted">Minutes per study day</label>
              <input id="minutes-per-study-day" type="range" min="15" max="120" step="5" value={form.minutesPerDay} aria-valuetext={`${form.minutesPerDay} minutes per study day`} onChange={(event) => setForm((current) => ({ ...current, minutesPerDay: Number(event.target.value) }))} className="mt-4 w-full accent-[var(--accent)]" />
              <p className="mt-2 text-sm font-bold text-accent">{form.minutesPerDay} minutes</p>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {selectedSubjects.map((subject) => (
                  <label key={subject.value} htmlFor={`exam-date-${subject.value}`} className="text-sm font-bold text-text-muted">
                    {subject.label} exam date
                    <input id={`exam-date-${subject.value}`} type="date" value={form.examDates[subject.value] || ''} onChange={(event) => setForm((current) => ({ ...current, examDates: { ...current.examDates, [subject.value]: event.target.value } }))} className="mt-2 block w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none transition-[background-color,border-color,box-shadow] duration-200 focus:border-accent focus:ring-4 focus:ring-accent-soft" />
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-2xl font-display font-extrabold tracking-tight">Quick diagnostic</h2>
              <p className="mt-3 text-sm font-medium text-text-muted">Answer any available subject questions to improve your first plan.</p>
              {placeholderSubjects.length > 0 && <p className="mt-5 border-l-2 border-accent pl-4 text-sm font-medium text-text-muted">No diagnostic is needed for {placeholderSubjects.map((subject) => subject.label).join(', ')}.</p>}
              <div className="mt-8 space-y-8">
                {diagnosticSubjects.map((subject) => (
                  <fieldset key={subject.value}>
                    <legend className="text-base font-display font-bold text-text-primary"><span className="text-accent">{subject.label}:</span> {subject.diagnostic.question}</legend>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {subject.diagnostic.options.map((answer, index) => (
                        <button key={answer} type="button" aria-pressed={form.diagnosticAnswers[subject.value] === index} onClick={() => setForm((current) => ({ ...current, diagnosticAnswers: { ...current.diagnosticAnswers, [subject.value]: index } }))} className={`rounded-2xl p-4 text-left text-sm font-semibold transition-[background-color,box-shadow,transform] duration-200 press ${form.diagnosticAnswers[subject.value] === index ? 'bg-accent text-accent-contrast shadow-pop' : 'bg-surface-soft text-text-primary hover:bg-accent-soft'}`}>{answer}</button>
                      ))}
                    </div>
                  </fieldset>
                ))}
                {diagnosticSubjects.length === 0 && <p className="rounded-2xl bg-surface-soft px-5 py-4 text-sm font-medium text-text-muted">You can build this plan without a diagnostic while these subject libraries are being prepared.</p>}
              </div>
            </div>
          )}
          </div>

          {error && <div role="alert" className="animate-shake-x mt-7 flex items-center gap-3 rounded-2xl bg-surface-error px-5 py-4 text-sm font-bold text-text-error"><ExclamationTriangleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />{error}</div>}

          <div className="mt-9 flex items-center justify-between gap-3 border-t border-line-soft pt-6">
            <div>
              {step > 0 && <button type="button" onClick={() => setStep((value) => value - 1)} className="btn-secondary">Back</button>}
              {step === 0 && cancel && <button type="button" onClick={cancel} className="btn-secondary">Cancel</button>}
            </div>
            {step < 2 ? (
              <button type="button" onClick={next} className="btn-primary">Continue <ArrowRightIcon className="h-4 w-4" aria-hidden="true" /></button>
            ) : (
              <button type="button" onClick={generate} disabled={saving} aria-busy={saving} className="btn-primary disabled:opacity-50"><SparklesIcon className="h-4 w-4" aria-hidden="true" />{saving ? 'Building plan…' : 'Build my plan'}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, detail }) {
  return <div className="rounded-3xl bg-surface-raised p-7 shadow-card"><p className="text-xs font-bold uppercase tracking-[0.12em] text-text-dim">{label}</p><p className="mt-3 text-4xl font-display font-extrabold tracking-tight text-text-primary">{value}</p><p className="mt-2 text-sm font-medium text-text-muted">{detail}</p></div>;
}

function findNextTask(tasks) {
  return [...tasks].filter((task) => !task.completed).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] || null;
}

function taskStatusLabel(task, today) {
  if (task.dueDate < today) return `Overdue · ${formatDate(task.dueDate)}`;
  if (task.dueDate === today) return 'Today’s next task';
  return `Next up · ${formatDate(task.dueDate)}`;
}

function taskActionLabel(label) {
  const clean = String(label || '').trim();
  if (!clean) return 'Open task';
  return /^(start|open|review|continue|browse)\b/i.test(clean) ? clean : `Start ${clean}`;
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

function recommendationHref(recommendation) {
  if (recommendation?.type !== 'practice' && recommendation?.resourcePath) return recommendation.resourcePath;
  const query = new URLSearchParams({
    subject: recommendation?.subject || 'economics',
    mode: recommendation?.mode || 'diagnostic',
  });
  if (recommendation?.outcome?.id) query.set('outcomeId', recommendation.outcome.id);
  return `/practice?${query.toString()}`;
}
