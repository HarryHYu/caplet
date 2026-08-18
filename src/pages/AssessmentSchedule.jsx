import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDaysIcon,
  ClockIcon,
  FunnelIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import useDialogFocus from '../lib/useDialogFocus';
import { useAssessmentTasks } from '../lib/useAssessmentTasks';
import { useMySubjects } from '../lib/useMySubjects';
import { assessmentsForSubjects } from '../lib/assessmentSubjects';
import {
  calendarDaysUntil,
  countdownLabel,
  formatAssessmentDate,
  isExamTask,
} from '../data/assessmentTasks';

const EMPTY_TASK = {
  subject: '',
  date: '',
  group: 'Yearly exams',
  type: 'Exam',
  status: 'Preparing',
  detail: '',
  weight: '',
};

function TaskEditorDialog({ task, onCancel, onSave }) {
  const [form, setForm] = useState(task ? {
    subject: task.subject,
    date: task.date,
    group: task.group,
    type: task.type,
    status: task.status,
    detail: task.detail,
    weight: task.weight || '',
  } : EMPTY_TASK);
  const dialogRef = useDialogFocus({ onDismiss: onCancel });
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const submit = (event) => {
    event.preventDefault();
    onSave({
      ...form,
      subject: form.subject.trim(),
      type: form.type.trim(),
      detail: form.detail.trim() || 'Personal assessment task.',
      weight: form.weight.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section ref={dialogRef} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="assessment-editor-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-line-soft bg-surface-body p-6 shadow-pop">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="assessment-editor-title" className="font-display text-2xl font-extrabold text-text-primary">{task ? 'Edit assessment' : 'Add assessment'}</h2>
            <p className="mt-1 text-sm text-text-muted">Changes apply to your personal schedule.</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close assessment editor" className="grid h-10 w-10 place-items-center rounded-lg text-text-muted hover:bg-surface-soft hover:text-text-primary">
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-text-primary sm:col-span-2">
            Subject or task name
            <input data-initial-focus required value={form.subject} onChange={update('subject')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 font-medium outline-none focus:border-accent" placeholder="e.g. Economics" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-text-primary">
            Date
            <input required type="date" value={form.date} onChange={update('date')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 font-medium outline-none focus:border-accent" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-text-primary">
            Group
            <select value={form.group} onChange={update('group')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 font-medium outline-none focus:border-accent">
              <option>Yearly exams</option>
              <option>Term 3</option>
              <option>Other</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-text-primary">
            Task type
            <input required value={form.type} onChange={update('type')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 font-medium outline-none focus:border-accent" placeholder="e.g. Trial exam" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-text-primary">
            Status
            <select value={form.status} onChange={update('status')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 font-medium outline-none focus:border-accent">
              <option>Preparing</option>
              <option>Scheduled</option>
              <option>Time TBC</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-text-primary sm:col-span-2">
            Notes
            <textarea rows="3" value={form.detail} onChange={update('detail')} className="rounded-lg border border-line-soft bg-surface-raised px-3 py-2 font-medium outline-none focus:border-accent" placeholder="What should you remember about this task?" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-text-primary">
            Weighting <span className="font-medium text-text-dim">Optional</span>
            <input value={form.weight} onChange={update('weight')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 font-medium outline-none focus:border-accent" placeholder="e.g. 40%" />
          </label>
          <div className="flex items-end justify-end gap-3 sm:col-span-2">
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save assessment</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function DeleteTaskDialog({ task, onCancel, onConfirm }) {
  const dialogRef = useDialogFocus({ onDismiss: onCancel });
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4">
      <section ref={dialogRef} tabIndex="-1" role="alertdialog" aria-modal="true" aria-labelledby="remove-assessment-title" aria-describedby="remove-assessment-description" className="w-full max-w-md rounded-xl border border-line-soft bg-surface-body p-6 shadow-pop">
        <h2 id="remove-assessment-title" className="font-display text-2xl font-extrabold text-text-primary">Remove {task.subject}?</h2>
        <p id="remove-assessment-description" className="mt-3 text-sm leading-relaxed text-text-muted">
          {task.custom ? 'This removes the personal task.' : 'This hides the official task from your personal schedule. The source schedule is not changed.'}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          {/* Destructive confirm — semantic danger fill, dark in both themes, so the ink is literal white. */}
          <button data-initial-focus type="button" onClick={onConfirm} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-text-error px-5 text-sm font-bold text-text-contrast hover:opacity-90">Remove</button>
        </div>
      </section>
    </div>
  );
}

function TimelineTask({ task, onEdit, onRemove }) {
  const days = calendarDaysUntil(task.date);
  return (
    <li className="relative grid grid-cols-[4.4rem_1.25rem_minmax(0,1fr)] items-start gap-3 sm:grid-cols-[5.5rem_1.25rem_minmax(0,1fr)] sm:gap-4">
      <time dateTime={task.date} className="pt-1 text-right text-xs font-extrabold leading-tight text-text-muted">
        <span className="block text-text-dim">{formatAssessmentDate(task.date).split(', ')[0]}</span>
        <span className="mt-1 block text-sm text-text-primary">{task.dateLabel}</span>
      </time>

      <div className="relative flex h-full min-h-[8.75rem] justify-center" aria-hidden="true">
        <span className="relative z-10 mt-2 h-3 w-3 rounded-full border-[3px] border-accent bg-surface-body" />
      </div>

      <article className="rounded-xl border border-line-soft bg-surface-raised p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold text-accent">
              <span>{task.group}</span>
              <span className="text-text-dim">·</span>
              <span className="text-text-muted">{task.type}</span>
              {(task.custom || task.customized) && <span className="rounded-full bg-accent-soft px-2 py-1 text-accent">Personalised</span>}
            </div>
            <h3 className="mt-2 font-display text-xl font-extrabold tracking-tight text-text-primary">{task.subject}</h3>
          </div>

          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${task.status === 'Time TBC' ? 'bg-accent-soft text-accent' : 'bg-surface-soft text-text-muted'}`}>
            <ClockIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {task.status}
          </span>
        </div>

        <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-text-muted">{task.detail}</p>

        <div className="mt-4 flex flex-col gap-4 border-t border-line-soft pt-3 sm:flex-row sm:items-end sm:justify-between">
          <dl className="grid flex-1 gap-3 text-xs sm:grid-cols-3">
            <div><dt className="font-extrabold text-text-dim">Date</dt><dd className="mt-1 font-bold text-text-primary">{formatAssessmentDate(task.date)}</dd></div>
            <div><dt className="font-extrabold text-text-dim">Source</dt><dd className="mt-1 font-bold text-text-primary">{task.source}</dd></div>
            {task.weight && <div><dt className="font-extrabold text-text-dim">Weight</dt><dd className="mt-1 font-bold text-text-primary">{task.weight}</dd></div>}
          </dl>
          <div className="flex items-center gap-1">
            {isExamTask(task) && days >= 0 && <span className="mr-2 text-xs font-bold text-accent">{countdownLabel(days)}</span>}
            <button type="button" onClick={() => onEdit(task)} aria-label={`Edit ${task.subject}`} className="grid h-10 w-10 place-items-center rounded-lg text-text-muted hover:bg-surface-soft hover:text-accent"><PencilSquareIcon className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" onClick={() => onRemove(task)} aria-label={`Remove ${task.subject}`} className="grid h-10 w-10 place-items-center rounded-lg text-text-muted hover:bg-surface-soft hover:text-text-error"><TrashIcon className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </div>
      </article>
    </li>
  );
}

export default function AssessmentSchedule() {
  const { tasks, addTask, updateTask, removeTask } = useAssessmentTasks();
  const { mySubjects } = useMySubjects();
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [editorTask, setEditorTask] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteTask, setDeleteTask] = useState(null);

  const subjectTasks = useMemo(() => assessmentsForSubjects(tasks, mySubjects), [mySubjects, tasks]);
  const subjects = useMemo(() => [...new Set(subjectTasks.map((task) => task.subject))].sort(), [subjectTasks]);
  const filteredTasks = useMemo(() => subjectTasks.filter((task) => (
    (subjectFilter === 'all' || task.subject === subjectFilter)
    && (groupFilter === 'all' || task.group === groupFilter)
  )), [groupFilter, subjectFilter, subjectTasks]);
  const nextExam = useMemo(() => subjectTasks
    .filter((task) => isExamTask(task) && calendarDaysUntil(task.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))[0] || null, [subjectTasks]);
  const nextExamDays = nextExam ? calendarDaysUntil(nextExam.date) : null;

  const openAdd = () => { setEditorTask(null); setEditorOpen(true); };
  const openEdit = (task) => { setEditorTask(task); setEditorOpen(true); };
  const saveTask = (task) => {
    if (editorTask) updateTask(editorTask.id, task);
    else addTask(task);
    setEditorOpen(false);
  };

  return (
    <div className="min-h-screen bg-surface-body pb-24 pt-24 text-text-primary selection:bg-accent selection:text-accent-contrast md:pt-28">
      <div className="container-custom max-w-5xl">
        <header className="minimal-page-header flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-extrabold text-accent">Year 11 · 2026</p>
            <h1 className="minimal-page-title mt-2">Upcoming assessment tasks</h1>
            <p className="minimal-page-description">See upcoming tasks for your chosen subjects, then adjust your personal schedule.</p>
          </div>
          <div className="flex flex-wrap gap-3"><Link to="/assessment-log" className="btn-secondary w-fit">Results</Link><button type="button" onClick={openAdd} className="btn-primary w-fit"><PlusIcon className="h-4 w-4" aria-hidden="true" /> Add assessment</button></div>
        </header>

        {nextExam && (
          <section className="mt-8 flex flex-col gap-5 border-y border-line-soft py-6 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="exam-countdown-heading">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><CalendarDaysIcon className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <p className="text-sm font-bold text-accent">Next exam</p>
                <h2 id="exam-countdown-heading" className="mt-1 font-display text-2xl font-extrabold text-text-primary">{nextExam.subject}</h2>
                <p className="mt-1 text-sm text-text-muted">{formatAssessmentDate(nextExam.date)}{nextExam.time ? ` at ${nextExam.time}` : ` · ${nextExam.type}`}</p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="font-display text-4xl font-extrabold text-text-primary">{countdownLabel(nextExamDays)}</p>
              <p className="mt-1 text-xs font-bold text-text-muted">until the exam</p>
            </div>
          </section>
        )}

        <section className="mt-8 grid gap-3 sm:grid-cols-3" aria-label="Assessment schedule summary">
          <div className="rounded-xl border border-line-soft bg-surface-raised p-4"><p className="text-xs font-extrabold text-text-dim">Upcoming tasks</p><p className="mt-1 font-display text-3xl font-extrabold">{subjectTasks.length}</p></div>
          <div className="rounded-xl border border-line-soft bg-surface-raised p-4"><p className="text-xs font-extrabold text-text-dim">Term 3 tasks</p><p className="mt-1 font-display text-3xl font-extrabold">{subjectTasks.filter((task) => task.group === 'Term 3').length}</p></div>
          <div className="rounded-xl border border-line-soft bg-surface-raised p-4"><p className="text-xs font-extrabold text-text-dim">Yearly assessments</p><p className="mt-1 font-display text-3xl font-extrabold">{subjectTasks.filter((task) => task.group === 'Yearly exams').length}</p></div>
        </section>

        <section className="mt-10" aria-labelledby="timeline-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-xs font-extrabold text-text-dim">Date order</p><h2 id="timeline-heading" className="mt-1 font-display text-2xl font-extrabold tracking-tight">Assessment timeline</h2><p className="mt-2 text-sm font-medium text-text-muted">Showing {filteredTasks.length} of {subjectTasks.length} tasks.</p></div>
            <div className="flex w-full flex-col gap-3 rounded-xl border border-line-soft bg-surface-soft p-3 sm:w-auto sm:flex-row sm:items-end" aria-label="Timeline filters">
              <div className="flex items-center gap-2 text-xs font-extrabold text-text-dim sm:pb-2"><FunnelIcon className="h-4 w-4" aria-hidden="true" /> Filter</div>
              <label className="grid gap-1 text-xs font-bold text-text-muted"><span>Subject</span><select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className="min-h-10 rounded-lg border border-line-soft bg-surface-raised px-3 text-sm font-bold text-text-primary outline-none focus:border-accent"><option value="all">{mySubjects.length ? 'All my subjects' : 'All subjects'}</option>{subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
              <label className="grid gap-1 text-xs font-bold text-text-muted"><span>View</span><select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)} className="min-h-10 rounded-lg border border-line-soft bg-surface-raised px-3 text-sm font-bold text-text-primary outline-none focus:border-accent"><option value="all">All tasks</option><option value="Term 3">Term 3</option><option value="Yearly exams">Yearly exams</option><option value="Other">Other</option></select></label>
            </div>
          </div>

          {filteredTasks.length > 0 ? (
            <div className="relative mt-7"><div className="absolute bottom-0 left-[5rem] top-0 w-px bg-line-soft sm:left-[6.15rem]" aria-hidden="true" /><ol className="space-y-5" aria-label="Upcoming assessment tasks">{filteredTasks.map((task) => <TimelineTask key={task.id} task={task} onEdit={openEdit} onRemove={setDeleteTask} />)}</ol></div>
          ) : (
            <div className="mt-7 rounded-xl border border-dashed border-line-soft bg-surface-soft p-8 text-center"><p className="font-display text-xl font-extrabold">No tasks match those filters.</p><p className="mt-2 text-sm font-medium text-text-muted">Try viewing all subjects or all tasks.</p></div>
          )}
        </section>
      </div>

      {editorOpen && <TaskEditorDialog key={editorTask?.id || 'new'} task={editorTask} onCancel={() => setEditorOpen(false)} onSave={saveTask} />}
      {deleteTask && <DeleteTaskDialog task={deleteTask} onCancel={() => setDeleteTask(null)} onConfirm={() => { removeTask(deleteTask.id); setDeleteTask(null); }} />}
    </div>
  );
}
