import { useMemo, useState } from 'react';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentCheckIcon,
  ExclamationCircleIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  DIFFICULTIES,
  LIFECYCLE_LABELS,
  RESPONSE_TYPES,
  questionSignature,
  reviewReadiness,
} from '../../lib/questionBank';

function Field({ id, label, hint, required = false, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-bold text-text-primary">
        {label}{required && <span className="ml-1 text-text-error" aria-hidden="true">*</span>}
      </label>
      {hint && <p id={`${id}-hint`} className="mt-1 text-xs font-medium leading-relaxed text-text-muted">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

const inputClass = 'w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-sm font-medium text-text-primary outline-none placeholder:text-text-dim focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:cursor-not-allowed disabled:opacity-55';

function Section({ title, description, children }) {
  return (
    <section className="rounded-3xl bg-surface-raised p-6 shadow-[0_20px_50px_-40px_rgba(20,20,18,0.45)] md:p-8">
      <h2 className="text-xl font-display font-extrabold tracking-tight text-text-primary">{title}</h2>
      {description && <p className="mt-1 text-sm font-medium leading-relaxed text-text-muted">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function MultipleChoiceOptions({ options, correctIndex, onChange }) {
  const updateOption = (index, value) => {
    const next = [...options];
    next[index] = value;
    onChange(next, correctIndex);
  };
  const addOption = () => onChange([...options, ''], correctIndex);
  const removeOption = (index) => {
    const next = options.filter((_, optionIndex) => optionIndex !== index);
    let nextCorrect = correctIndex;
    if (index === correctIndex) nextCorrect = 0;
    else if (index < correctIndex) nextCorrect -= 1;
    onChange(next.length ? next : [''], Math.max(0, nextCorrect));
  };

  return (
    <fieldset>
      <legend className="text-sm font-bold text-text-primary">Answer options <span className="text-text-error" aria-hidden="true">*</span></legend>
      <p className="mt-1 text-xs font-medium text-text-muted">Select the radio button beside the correct answer.</p>
      <div className="mt-3 space-y-3">
        {options.map((option, index) => (
          <div key={index} className="flex items-center gap-3 rounded-2xl bg-surface-soft p-3">
            <input
              type="radio"
              name="correct-option"
              checked={correctIndex === index}
              onChange={() => onChange(options, index)}
              aria-label={`Mark option ${index + 1} correct`}
              className="h-4 w-4 shrink-0 accent-[color:var(--accent)]"
            />
            <label htmlFor={`question-option-${index}`} className="sr-only">Option {index + 1}</label>
            <input
              id={`question-option-${index}`}
              value={option}
              onChange={(event) => updateOption(index, event.target.value)}
              placeholder={`Option ${index + 1}`}
              className="min-w-0 flex-1 border-0 bg-transparent px-1 py-1 text-sm font-semibold text-text-primary outline-none placeholder:text-text-dim"
            />
            <button type="button" onClick={() => removeOption(index)} disabled={options.length <= 2} className="rounded-xl p-2 text-text-muted hover:bg-surface-error hover:text-text-error disabled:cursor-not-allowed disabled:opacity-30" aria-label={`Remove option ${index + 1}`}>
              <TrashIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addOption} className="btn-secondary mt-3 px-4 py-2 text-xs"><PlusIcon className="h-4 w-4" aria-hidden="true" /> Add option</button>
    </fieldset>
  );
}

function OutcomeMapping({ outcomes, selectedIds, subject, onChange }) {
  const [search, setSearch] = useState('');
  const matching = useMemo(() => {
    const query = search.trim().toLowerCase();
    return outcomes.filter((outcome) => {
      if (subject && outcome.subject && outcome.subject !== subject) return false;
      if (!query) return true;
      return `${outcome.code || ''} ${outcome.title || ''} ${outcome.description || ''}`.toLowerCase().includes(query);
    });
  }, [outcomes, search, subject]);

  const toggle = (id, checked) => {
    onChange(checked
      ? [...new Set([...selectedIds, String(id)])]
      : selectedIds.filter((selected) => String(selected) !== String(id)));
  };

  return (
    <fieldset>
      <legend className="text-sm font-bold text-text-primary">Syllabus outcomes</legend>
      <p className="mt-1 text-xs font-medium text-text-muted">Map every assessable skill this question provides evidence for.</p>
      <label htmlFor="outcome-search" className="sr-only">Search syllabus outcomes</label>
      <input id="outcome-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by code or concept…" className={`${inputClass} mt-4`} />
      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-2xl bg-surface-soft p-3" role="group" aria-label="Available syllabus outcomes">
        {matching.length ? matching.map((outcome) => {
          const checked = selectedIds.some((id) => String(id) === String(outcome.id));
          return (
            <label key={outcome.id} className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-colors ${checked ? 'bg-accent-soft' : 'bg-surface-raised hover:bg-accent-soft'}`}>
              <input type="checkbox" checked={checked} onChange={(event) => toggle(outcome.id, event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--accent)]" />
              <span>
                <span className="font-mono text-xs font-bold text-accent">{outcome.code}</span>
                <span className="ml-2 text-sm font-bold text-text-primary">{outcome.title}</span>
                {outcome.yearLevel && <span className="mt-1 block text-xs font-medium text-text-muted">Year {outcome.yearLevel} · {outcome.syllabusVersion}</span>}
              </span>
            </label>
          );
        }) : <p className="p-4 text-center text-sm font-medium text-text-muted">No outcomes match this subject and search.</p>}
      </div>
      <p className="mt-2 text-xs font-bold text-text-muted">{selectedIds.length} {selectedIds.length === 1 ? 'outcome' : 'outcomes'} mapped</p>
    </fieldset>
  );
}

function LifecyclePanel({ draft, humanReviewed, setHumanReviewed, busy, onTransition, readOnly }) {
  const readiness = reviewReadiness(draft);
  const ready = readiness.every((check) => check.ok);
  const status = draft.lifecycleStatus || 'draft';

  return (
    <Section title="Review & publishing" description="Questions move through a controlled lifecycle. Published questions cannot be silently edited in place.">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold text-accent">{LIFECYCLE_LABELS[status] || status}</span>
        <span className="font-mono text-xs font-bold text-text-muted">Version {draft.version || 1}</span>
      </div>

      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {readiness.map((check) => (
          <li key={check.key} className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold ${check.ok ? 'bg-[color:var(--block-green)] text-text-primary' : 'bg-[color:var(--block-amber)] text-text-muted'}`}>
            {check.ok ? <CheckCircleIcon className="h-4 w-4 shrink-0 text-[color:var(--mark-green)]" aria-hidden="true" /> : <ExclamationCircleIcon className="h-4 w-4 shrink-0 text-[color:var(--mark-amber)]" aria-hidden="true" />}
            {check.label}
          </li>
        ))}
      </ul>

      {status === 'in_review' && !readOnly && (
        <div className="mt-5 rounded-2xl bg-surface-soft p-4">
          <p className="text-xs font-medium leading-relaxed text-text-muted">Approval is attributed to the signed-in admin or verified teacher account.</p>
          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={humanReviewed} onChange={(event) => setHumanReviewed(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[color:var(--accent)]" />
            <span><span className="block text-sm font-bold text-text-primary">I completed a human review</span><span className="mt-1 block text-xs font-medium leading-relaxed text-text-muted">I checked accuracy, rubric alignment, source provenance, answer quality, and accessibility. This is required before approval.</span></span>
          </label>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {status === 'draft' && !readOnly && <button type="button" onClick={() => onTransition('in_review')} disabled={busy || !ready || !draft.id} className="btn-primary"><DocumentCheckIcon className="h-4 w-4" aria-hidden="true" /> Submit for review</button>}
        {status === 'in_review' && !readOnly && (
          <>
            <button type="button" onClick={() => onTransition('draft')} disabled={busy} className="btn-secondary">Return to draft</button>
            <button type="button" onClick={() => onTransition('approved')} disabled={busy || !humanReviewed || !ready} className="btn-primary"><CheckCircleIcon className="h-4 w-4" aria-hidden="true" /> Approve</button>
          </>
        )}
        {status === 'approved' && !readOnly && <button type="button" onClick={() => onTransition('published')} disabled={busy} className="btn-primary"><SparklesIcon className="h-4 w-4" aria-hidden="true" /> Publish question</button>}
        {status === 'published' && !readOnly && <button type="button" onClick={() => onTransition('superseded')} disabled={busy} className="btn-secondary">Supersede version</button>}
        {(readOnly || ['superseded', 'archived'].includes(status)) && <p className="text-sm font-medium text-text-muted">This shared or historical version is read-only. Create a workspace draft to make changes.</p>}
      </div>
      {!draft.id && <p className="mt-3 text-xs font-medium text-text-muted">Save the draft before starting review.</p>}
      {!ready && status === 'draft' && <p className="mt-3 text-xs font-medium text-text-muted">Complete the quality checklist before submitting for review.</p>}
    </Section>
  );
}

function VersionHistory({ history, loading, onRefresh }) {
  return (
    <Section title="Version history" description="A traceable record of edits, reviews, and lifecycle decisions.">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-bold text-text-muted">{history.length} saved {history.length === 1 ? 'revision' : 'revisions'}</p>
        <button type="button" onClick={onRefresh} disabled={loading} className="inline-flex items-center gap-2 text-xs font-bold text-accent disabled:opacity-50"><ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh</button>
      </div>
      {loading ? <p role="status" className="mt-4 text-sm font-medium text-text-muted">Loading version history…</p> : history.length ? (
        <ol className="mt-4 space-y-2">
          {history.map((revision, index) => (
            <li key={revision.id || `${revision.version}-${index}`} className="rounded-2xl bg-surface-soft p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-text-primary">Version {revision.version || revision.snapshot?.version || history.length - index}</p>
                <span className="rounded-full bg-surface-raised px-2.5 py-1 text-[10px] font-bold text-text-muted">{LIFECYCLE_LABELS[revision.lifecycleStatus || revision.status || revision.snapshot?.lifecycleStatus] || 'Saved'}</span>
              </div>
              <p className="mt-1 text-xs font-medium text-text-muted">{revision.changeSummary || revision.summary || 'Question updated'}{revision.createdAt ? ` · ${new Date(revision.createdAt).toLocaleString('en-AU')}` : ''}</p>
            </li>
          ))}
        </ol>
      ) : <p className="mt-4 rounded-2xl bg-surface-soft p-5 text-sm font-medium text-text-muted">No saved revisions yet.</p>}
    </Section>
  );
}

export default function QuestionEditorForm({
  draft,
  setDraft,
  outcomes,
  originalSignature,
  errors,
  notice,
  saving,
  lifecycleBusy,
  humanReviewed,
  setHumanReviewed,
  history,
  historyLoading,
  onSave,
  onCancel,
  onTransition,
  onRefreshHistory,
}) {
  const dirty = questionSignature(draft) !== originalSignature;
  const readOnly = Boolean(draft.readOnly) || ['superseded', 'archived'].includes(draft.lifecycleStatus);
  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <form onSubmit={onSave} className="min-w-0">
      <header className="mb-6 flex flex-col gap-5 rounded-3xl bg-surface-raised p-6 shadow-[0_20px_50px_-40px_rgba(20,20,18,0.45)] sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button type="button" onClick={onCancel} className="inline-flex items-center gap-2 text-xs font-bold text-text-muted hover:text-text-primary"><ArrowLeftIcon className="h-4 w-4" aria-hidden="true" /> Question bank</button>
          <h1 className="mt-3 truncate text-3xl font-display font-extrabold tracking-tight text-text-primary">{draft.id ? 'Edit question' : 'New question'}</h1>
          <p className="mt-1 text-xs font-medium text-text-muted">{draft.id ? `${draft.questionKey || 'Question'} · Version ${draft.version}` : 'Build a syllabus-mapped assessment item.'}{dirty ? ' · Unsaved changes' : ''}</p>
        </div>
        <div className="flex shrink-0 gap-3">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving || readOnly || !dirty} className="btn-primary min-w-28">{saving ? 'Saving…' : dirty ? 'Save draft' : 'Saved'}</button>
        </div>
      </header>

      {errors.length > 0 && <div role="alert" className="mb-5 rounded-2xl bg-surface-error px-5 py-4 text-sm font-bold text-text-error"><p>Resolve these fields:</p><ul className="mt-2 list-disc space-y-1 pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
      {notice?.text && <div role={notice.type === 'error' ? 'alert' : 'status'} className={`mb-5 rounded-2xl px-5 py-4 text-sm font-bold ${notice.type === 'error' ? 'bg-surface-error text-text-error' : 'bg-[color:var(--block-green)] text-text-primary'}`}>{notice.text}</div>}

      <fieldset disabled={readOnly} className="space-y-5 disabled:opacity-75">
        <Section title="Question" description="Write the learner-facing prompt and define how it will be answered.">
          <div className="grid gap-5 md:grid-cols-2">
            <Field id="question-subject" label="Subject" required>
              <input id="question-subject" value={draft.subject} onChange={(event) => set('subject', event.target.value)} className={inputClass} placeholder="economics" />
            </Field>
            <Field id="question-syllabus-version" label="Syllabus version" hint="For example, NESA Economics 2025.">
              <input id="question-syllabus-version" value={draft.syllabusVersion} onChange={(event) => set('syllabusVersion', event.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="mt-5">
            <Field id="question-prompt" label="Question prompt" required>
              <textarea id="question-prompt" rows="5" value={draft.prompt} onChange={(event) => set('prompt', event.target.value)} className={inputClass} placeholder="Write the exact question students will answer…" />
            </Field>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="question-response-type" label="Response type" required>
              <select id="question-response-type" value={draft.responseType} onChange={(event) => set('responseType', event.target.value)} className={inputClass}>{RESPONSE_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            </Field>
            <Field id="question-marks" label="Marks" required>
              <input id="question-marks" type="number" min="1" value={draft.marks} onChange={(event) => set('marks', event.target.value)} className={inputClass} />
            </Field>
            <Field id="question-expected-minutes" label="Expected time (minutes)" required>
              <input id="question-expected-minutes" type="number" min="1" value={draft.expectedMinutes} onChange={(event) => set('expectedMinutes', event.target.value)} className={inputClass} />
            </Field>
            <Field id="question-difficulty" label="Difficulty">
              <select id="question-difficulty" value={draft.difficulty} onChange={(event) => set('difficulty', event.target.value)} className={inputClass}>{DIFFICULTIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            </Field>
            <Field id="question-command-verb" label="Command verb" hint="For example: Explain, Analyse, Evaluate.">
              <input id="question-command-verb" value={draft.commandVerb} onChange={(event) => set('commandVerb', event.target.value)} className={inputClass} />
            </Field>
          </div>
        </Section>

        <Section title="Answer & feedback" description="Define deterministic answers where possible and feedback that teaches after every attempt.">
          {draft.responseType === 'multiple_choice' ? (
            <MultipleChoiceOptions options={draft.options} correctIndex={draft.correctOptionIndex} onChange={(options, correctOptionIndex) => setDraft((current) => ({ ...current, options, correctOptionIndex }))} />
          ) : (
            <Field id="question-answer-key" label={draft.responseType === 'numeric' ? 'Expected numeric answer' : 'Answer key'} hint="A concise canonical answer used alongside the rubric and model response.">
              <textarea id="question-answer-key" rows="3" value={draft.answerText} onChange={(event) => set('answerText', event.target.value)} className={inputClass} />
            </Field>
          )}
          <div className="mt-5">
            <Field id="question-explanation" label="Answer explanation" hint="Explain why the answer is correct and address the central reasoning.">
              <textarea id="question-explanation" rows="4" value={draft.explanation} onChange={(event) => set('explanation', event.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field id="question-rubric" label="Rubric" hint="One marking criterion per line.">
              <textarea id="question-rubric" rows="7" value={draft.rubricText} onChange={(event) => set('rubricText', event.target.value)} className={inputClass} placeholder={'Identifies the policy stance\nExplains the transmission mechanism'} />
            </Field>
            <Field id="question-model-answer" label="Model answer" hint="A strong response at the intended mark value.">
              <textarea id="question-model-answer" rows="7" value={draft.modelAnswer} onChange={(event) => set('modelAnswer', event.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="mt-5">
            <Field id="question-misconceptions" label="Common misconceptions" hint="One misconception or diagnostic code per line.">
              <textarea id="question-misconceptions" rows="4" value={draft.misconceptionsText} onChange={(event) => set('misconceptionsText', event.target.value)} className={inputClass} />
            </Field>
          </div>
        </Section>

        <Section title="Curriculum mapping" description="Connect the question to the versioned outcomes that receive mastery evidence.">
          <OutcomeMapping outcomes={outcomes} selectedIds={draft.outcomeIds} subject={draft.subject} onChange={(value) => set('outcomeIds', value)} />
        </Section>

        <Section title="Source & provenance" description="Record where the question, evidence, or stimulus came from so reviewers can verify it.">
          <div className="grid gap-5 md:grid-cols-2">
            <Field id="question-source-title" label="Source title">
              <input id="question-source-title" value={draft.sourceTitle} onChange={(event) => set('sourceTitle', event.target.value)} className={inputClass} />
            </Field>
            <Field id="question-source-url" label="Source URL">
              <input id="question-source-url" type="url" value={draft.sourceUrl} onChange={(event) => set('sourceUrl', event.target.value)} className={inputClass} placeholder="https://…" />
            </Field>
            <Field id="question-source-author" label="Author or provider">
              <input id="question-source-author" value={draft.sourceAuthor} onChange={(event) => set('sourceAuthor', event.target.value)} className={inputClass} />
            </Field>
            <Field id="question-source-year" label="Publication year">
              <input id="question-source-year" inputMode="numeric" value={draft.sourceYear} onChange={(event) => set('sourceYear', event.target.value)} className={inputClass} />
            </Field>
            <Field id="question-source-key" label="Stable source key" hint="Optional import identifier used to prevent duplicates.">
              <input id="question-source-key" value={draft.sourceKey} onChange={(event) => set('sourceKey', event.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="mt-5">
            <Field id="question-source-notes" label="Source notes">
              <textarea id="question-source-notes" rows="3" value={draft.sourceNotes} onChange={(event) => set('sourceNotes', event.target.value)} className={inputClass} />
            </Field>
          </div>
        </Section>
      </fieldset>

      <div className="mt-5 space-y-5">
        <LifecyclePanel draft={draft} humanReviewed={humanReviewed} setHumanReviewed={setHumanReviewed} busy={lifecycleBusy} onTransition={onTransition} readOnly={readOnly} />
        {draft.id && <VersionHistory history={history} loading={historyLoading} onRefresh={onRefreshHistory} />}
      </div>

      <footer className="mt-6 flex flex-col gap-3 rounded-3xl bg-surface-raised p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs font-medium text-text-muted"><ClockIcon className="h-4 w-4" aria-hidden="true" /> {draft.updatedAt ? `Last saved ${new Date(draft.updatedAt).toLocaleString('en-AU')}` : 'Not saved yet'}</p>
        <button type="submit" disabled={saving || readOnly || !dirty} className="btn-primary">{saving ? 'Saving…' : dirty ? 'Save draft' : 'Saved'}</button>
      </footer>
    </form>
  );
}
