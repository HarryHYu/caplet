import { useEffect, useMemo, useState } from 'react';
import {
  AdjustmentsHorizontalIcon,
  CheckCircleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

const MODES = [
  ['practice', 'Practice'],
  ['adaptive', 'Adaptive practice'],
  ['remediation', 'Remediation'],
  ['diagnostic', 'Diagnostic'],
  ['revision', 'Revision'],
  ['exam', 'Exam practice'],
];

const EMPTY_FORM = {
  title: '',
  description: '',
  dueDate: '',
  mode: 'adaptive',
  outcomeIds: [],
  studentIds: [],
  strategy: 'balanced',
  questionCount: 5,
  difficulty: '',
  responseType: '',
  manualQuestionIds: '',
};

const splitIds = (value) => [...new Set(String(value || '').split(/[\s,]+/).map((item) => item.trim()).filter(Boolean))];

export default function AdaptiveAssignmentForm({
  classroomId,
  outcomes = [],
  students = [],
  initialDraft,
  onCreated,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!initialDraft) return;
    setForm((current) => ({
      ...EMPTY_FORM,
      ...current,
      title: initialDraft.title || '',
      mode: initialDraft.mode || 'remediation',
      outcomeIds: initialDraft.outcomeIds || [],
      studentIds: initialDraft.studentIds || [],
    }));
    setMessage({ type: '', text: '' });
  }, [initialDraft]);

  useEffect(() => {
    if (!students.length) return;
    setForm((current) => current.studentIds.length
      ? current
      : { ...current, studentIds: students.map((student) => student.id) });
  }, [students]);

  const allStudentsSelected = students.length > 0 && form.studentIds.length === students.length;
  const selectedOutcomeLabels = useMemo(() => new Map(outcomes.map((outcome) => [String(outcome.id), outcome])), [outcomes]);

  const toggleArrayValue = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  };

  const toggleAllStudents = () => {
    setForm((current) => ({
      ...current,
      studentIds: current.studentIds.length === students.length ? [] : students.map((student) => student.id),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage({ type: '', text: '' });
    if (!form.title.trim()) {
      setMessage({ type: 'error', text: 'Add a clear assignment title.' });
      return;
    }
    if (!form.outcomeIds.length) {
      setMessage({ type: 'error', text: 'Select at least one curriculum outcome.' });
      return;
    }
    if (!form.studentIds.length) {
      setMessage({ type: 'error', text: 'Select at least one student.' });
      return;
    }
    const questionIds = form.strategy === 'manual' ? splitIds(form.manualQuestionIds) : [];
    if (form.strategy === 'manual' && !questionIds.length) {
      setMessage({ type: 'error', text: 'Add at least one question ID for manual selection.' });
      return;
    }

    const questionSelection = {
      strategy: form.strategy,
      count: form.strategy === 'manual' ? questionIds.length : Number(form.questionCount),
      ...(form.difficulty ? { difficulties: [form.difficulty] } : {}),
      ...(form.responseType ? { responseTypes: [form.responseType] } : {}),
    };
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      dueDate: form.dueDate || null,
      mode: form.mode,
      outcomeIds: form.outcomeIds,
      questionSelection,
      ...(questionIds.length ? { questionIds } : {}),
      // Omitting studentIds means every current class student. Sending a list
      // is how remediation groups remain differentiated.
      ...(allStudentsSelected ? {} : { studentIds: form.studentIds }),
    };

    setSubmitting(true);
    try {
      const result = await api.request(`/teacher-learning/classes/${classroomId}/assignments`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setMessage({ type: 'success', text: `“${form.title.trim()}” is ready for ${form.studentIds.length} ${form.studentIds.length === 1 ? 'student' : 'students'}.` });
      setForm({ ...EMPTY_FORM, studentIds: students.map((student) => student.id) });
      onCreated?.(result);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Could not create the assignment.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-3xl bg-surface-raised p-7 shadow-[0_24px_54px_-40px_rgba(20,20,18,0.45)] md:p-9">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
          <SparklesIcon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <span className="section-kicker">Outcome-aware classwork</span>
          <h2 className="text-3xl font-display font-extrabold text-text-primary">Create adaptive assignment</h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-text-muted">
            Select the evidence you need. Caplet will choose only approved questions mapped to these outcomes.
          </p>
        </div>
      </div>

      {message.text && (
        <div
          id="adaptive-assignment-message"
          role={message.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`mt-6 rounded-2xl px-5 py-4 text-sm font-bold ${message.type === 'error' ? 'bg-surface-error text-text-error' : 'bg-[color:var(--block-green)] text-text-primary'}`}
        >
          {message.type === 'success' && <CheckCircleIcon className="mr-2 inline h-5 w-5 text-accent" aria-hidden="true" />}
          {message.text}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <label htmlFor="assignment-title" className="text-sm font-bold text-text-muted">
          Assignment title
          <input
            id="assignment-title"
            required
            value={form.title}
            maxLength={200}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            aria-invalid={message.type === 'error' && message.text.includes('title')}
            aria-describedby={message.type === 'error' ? 'adaptive-assignment-message' : undefined}
            className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label htmlFor="assignment-mode" className="text-sm font-bold text-text-muted">
            Mode
            <select
              id="assignment-mode"
              value={form.mode}
              onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {MODES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label htmlFor="assignment-due-date" className="text-sm font-bold text-text-muted">
            Due date
            <input
              id="assignment-due-date"
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            />
          </label>
        </div>
      </div>

      <label htmlFor="assignment-instructions" className="mt-6 block text-sm font-bold text-text-muted">
        Instructions <span className="font-medium text-text-dim">(optional)</span>
        <textarea
          id="assignment-instructions"
          value={form.description}
          rows={3}
          maxLength={5000}
          onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          className="mt-2 w-full resize-y rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        />
      </label>

      <fieldset className="mt-8">
        <legend className="text-sm font-display font-extrabold text-text-primary">Curriculum outcomes</legend>
        <p id="assignment-outcomes-help" className="mt-1 text-xs font-medium text-text-muted">At least one outcome is required.</p>
        <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto rounded-2xl bg-surface-soft p-3 sm:grid-cols-2">
          {outcomes.map((outcome) => (
            <label key={outcome.id} className={`flex cursor-pointer gap-3 rounded-xl p-3 transition-colors ${form.outcomeIds.includes(outcome.id) ? 'bg-accent text-white' : 'bg-surface-raised text-text-primary hover:bg-accent-soft'}`}>
              <input
                id={`assignment-outcome-${outcome.id}`}
                type="checkbox"
                checked={form.outcomeIds.includes(outcome.id)}
                onChange={() => toggleArrayValue('outcomeIds', outcome.id)}
                aria-describedby="assignment-outcomes-help"
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
              />
              <span>
                <span className={`block font-mono text-[11px] font-bold ${form.outcomeIds.includes(outcome.id) ? 'text-white/75' : 'text-accent'}`}>{outcome.code}</span>
                <span className="mt-0.5 block text-xs font-bold leading-snug">{outcome.title}</span>
              </span>
            </label>
          ))}
        </div>
        {form.outcomeIds.length > 0 && (
          <p className="mt-2 text-xs font-medium text-text-muted">
            Selected: {form.outcomeIds.map((id) => selectedOutcomeLabels.get(String(id))?.code).filter(Boolean).join(', ')}
          </p>
        )}
      </fieldset>

      <fieldset className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <legend className="text-sm font-display font-extrabold text-text-primary">Students</legend>
            <p id="assignment-students-help" className="mt-1 text-xs font-medium text-text-muted">Target the whole class or a remediation group.</p>
          </div>
          <button type="button" onClick={toggleAllStudents} className="text-xs font-bold text-accent hover:text-accent-strong">
            {allStudentsSelected ? 'Clear selection' : 'Select whole class'}
          </button>
        </div>
        <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto rounded-2xl bg-surface-soft p-3 sm:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => (
            <label key={student.id} className="flex cursor-pointer items-center gap-3 rounded-xl bg-surface-raised p-3 text-sm font-bold text-text-primary hover:bg-accent-soft">
              <input
                id={`assignment-student-${student.id}`}
                type="checkbox"
                checked={form.studentIds.includes(student.id)}
                onChange={() => toggleArrayValue('studentIds', student.id)}
                aria-describedby="assignment-students-help"
                className="h-4 w-4 accent-[var(--accent)]"
              />
              {student.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-8 rounded-2xl border border-line-soft p-5">
        <legend className="flex items-center gap-2 px-2 text-sm font-display font-extrabold text-text-primary">
          <AdjustmentsHorizontalIcon className="h-5 w-5 text-accent" aria-hidden="true" /> Question selection
        </legend>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label htmlFor="assignment-strategy" className="text-xs font-bold text-text-muted">
            Strategy
            <select id="assignment-strategy" value={form.strategy} onChange={(event) => setForm((current) => ({ ...current, strategy: event.target.value }))} className="mt-2 w-full rounded-xl border border-line-soft bg-surface-soft px-3 py-2.5 text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent">
              <option value="balanced">Balanced coverage</option>
              <option value="adaptive">Adaptive</option>
              <option value="manual">Manual IDs</option>
            </select>
          </label>
          {form.strategy !== 'manual' && (
            <label htmlFor="assignment-question-count" className="text-xs font-bold text-text-muted">
              Questions
              <input id="assignment-question-count" type="number" min="1" max="50" value={form.questionCount} onChange={(event) => setForm((current) => ({ ...current, questionCount: event.target.value }))} className="mt-2 w-full rounded-xl border border-line-soft bg-surface-soft px-3 py-2.5 text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent" />
            </label>
          )}
          <label htmlFor="assignment-difficulty" className="text-xs font-bold text-text-muted">
            Difficulty
            <select id="assignment-difficulty" value={form.difficulty} onChange={(event) => setForm((current) => ({ ...current, difficulty: event.target.value }))} className="mt-2 w-full rounded-xl border border-line-soft bg-surface-soft px-3 py-2.5 text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent">
              <option value="">Any difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="transfer">Transfer</option>
            </select>
          </label>
          <label htmlFor="assignment-response-type" className="text-xs font-bold text-text-muted">
            Response type
            <select id="assignment-response-type" value={form.responseType} onChange={(event) => setForm((current) => ({ ...current, responseType: event.target.value }))} className="mt-2 w-full rounded-xl border border-line-soft bg-surface-soft px-3 py-2.5 text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent">
              <option value="">Any response</option>
              <option value="multiple_choice">Multiple choice</option>
              <option value="short_answer">Short answer</option>
              <option value="extended_response">Extended response</option>
            </select>
          </label>
        </div>
        {form.strategy === 'manual' && (
          <label htmlFor="assignment-question-ids" className="mt-4 block text-xs font-bold text-text-muted">
            Question IDs <span className="font-medium">(comma or line separated)</span>
            <textarea id="assignment-question-ids" value={form.manualQuestionIds} onChange={(event) => setForm((current) => ({ ...current, manualQuestionIds: event.target.value }))} rows={3} aria-invalid={message.type === 'error' && message.text.includes('question ID')} aria-describedby={message.type === 'error' ? 'adaptive-assignment-message' : undefined} className="mt-2 w-full rounded-xl border border-line-soft bg-surface-soft px-3 py-2.5 font-mono text-xs text-text-primary outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent" />
          </label>
        )}
      </fieldset>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium text-text-dim">Only approved or published questions can be assigned.</p>
        <button type="submit" disabled={submitting} className="btn-primary sm:min-w-52">
          {submitting ? 'Creating assignment…' : 'Create assignment'}
        </button>
      </div>
    </form>
  );
}
