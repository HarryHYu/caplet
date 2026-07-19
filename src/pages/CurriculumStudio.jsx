import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowPathIcon,
  ArrowRightIcon,
  AcademicCapIcon,
  ArchiveBoxIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentCheckIcon,
  DocumentTextIcon,
  LockClosedIcon,
  PencilSquareIcon,
  PlusIcon,
  QueueListIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { extractSyllabusFile } from '../lib/pdfExtract';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import QuestionEditorForm from '../components/editor/QuestionEditorForm';
import {
  emptyQuestion,
  normalizeQuestion,
  questionPayload,
  questionSignature,
  validateQuestionDraft,
} from '../lib/questionBank';

const REVIEW_LABELS = {
  outcome_boundary: 'Outcome structure',
  duplicate_statement: 'Possible duplicate',
  source_evidence: 'Source alignment',
  rubric_review: 'Rubric quality',
  source_verification: 'Source verification',
};

const PACK_STATUS = {
  in_review: { label: 'In review', className: 'bg-[color:var(--block-amber)] text-[color:var(--mark-amber)]' },
  ready: { label: 'Ready to publish', className: 'bg-[color:var(--block-green)] text-[color:var(--mark-green)]' },
  published: { label: 'Published', className: 'bg-accent-soft text-accent' },
  archived: { label: 'Archived', className: 'bg-surface-soft text-text-muted' },
};

function SubjectPackCard({ pack }) {
  const status = PACK_STATUS[pack.lifecycleStatus] || { label: pack.lifecycleStatus || 'Draft', className: 'bg-surface-soft text-text-muted' };
  const readiness = pack.readiness || {};
  const openDecisionCount = readiness.decisions?.open || 0;
  const blockerCount = readiness.blockers?.length || 0;
  const coverageReady = readiness.coverage?.ready || 0;
  const coverageTotal = readiness.coverage?.total || 0;
  const questionCount = readiness.questions?.ready || 0;
  const nextAction = pack.lifecycleStatus === 'published'
    ? 'Live for student practice'
    : pack.lifecycleStatus === 'archived'
      ? 'Preserved as read-only history'
      : readiness.canPublish
        ? 'Every readiness gate has passed'
        : `${blockerCount || openDecisionCount} ${blockerCount === 1 || (!blockerCount && openDecisionCount === 1) ? 'check' : 'checks'} to finish`;

  return (
    <Link to={`/curriculum-studio/${pack.id}`} className="group flex min-h-56 flex-col rounded-3xl border border-line-soft bg-surface-raised p-7 shadow-[0_24px_50px_-38px_rgba(20,20,18,0.28)] transition-all hover:-translate-y-1 hover:border-accent/30 hover:shadow-[0_30px_60px_-36px_rgba(19,81,170,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-surface-body">
      <div className="flex items-start justify-between gap-4">
        <span className={`rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] ${status.className}`}>{status.label}</span>
        <span className="font-mono text-xs font-bold text-text-dim">v{pack.version || 1}</span>
      </div>
      <h2 className="mt-5 font-display text-2xl font-extrabold text-text-primary transition-colors group-hover:text-accent">{pack.title}</h2>
      <p className="mt-2 text-sm font-semibold text-text-muted">{nextAction}</p>
      <div className="mt-auto flex flex-wrap gap-2 pt-6">
        <span className="rounded-full bg-surface-soft px-3 py-1.5 text-xs font-bold text-text-muted">{coverageReady}/{coverageTotal} outcomes covered</span>
        <span className="rounded-full bg-surface-soft px-3 py-1.5 text-xs font-bold text-text-muted">{questionCount} approved questions</span>
      </div>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-extrabold text-accent">Open workspace <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
    </Link>
  );
}

function Metric(props) {
  const { label, ready, total, detail, tone = 'blue' } = props;
  const Icon = props.icon;
  const toneClass = tone === 'amber'
    ? 'bg-[color:var(--block-amber)] text-[color:var(--mark-amber)]'
    : tone === 'green'
      ? 'bg-[color:var(--block-green)] text-[color:var(--mark-green)]'
      : 'bg-accent-soft text-accent';
  return (
    <div className="flex items-center gap-4 border-b border-line-soft py-6 last:border-b-0">
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${toneClass}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-text-muted">{label}</p>
        <p className="mt-1 font-display text-3xl font-extrabold tracking-tight text-text-primary">
          {ready}{total !== '' && <span className="text-lg text-text-dim"> / {total}</span>}
        </p>
        {detail && <p className={`mt-1 text-xs font-bold ${tone === 'amber' ? 'text-[color:var(--mark-amber)]' : 'text-text-muted'}`}>{detail}</p>}
      </div>
    </div>
  );
}

function ReviewDecision({ item, index, expanded, selectedOption, busy, locked, onToggle, onSelect, onResolve, onReopen }) {
  const resolved = item.status === 'resolved';
  const blocked = item.status === 'blocked';
  const options = Array.isArray(item.decisionOptions) ? item.decisionOptions : [];
  const chosen = resolved || blocked ? item.selectedOption : selectedOption;
  return (
    <article className="border-b border-line-soft last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-6 py-5 text-left transition-colors hover:bg-surface-soft/55 md:px-8"
        aria-expanded={expanded}
      >
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-extrabold ${resolved ? 'bg-[color:var(--block-green)] text-[color:var(--mark-green)]' : 'bg-[color:var(--block-amber)] text-[color:var(--mark-amber)]'}`}>
          {resolved ? <CheckCircleIcon className="h-5 w-5" aria-hidden="true" /> : index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-lg font-extrabold text-text-primary">{item.title}</span>
          <span className="mt-0.5 block text-sm font-medium text-text-muted">{item.summary}</span>
        </span>
        <span className={`hidden rounded-full px-3 py-1 text-xs font-bold sm:inline-flex ${resolved ? 'bg-[color:var(--block-green)] text-[color:var(--mark-green)]' : 'bg-[color:var(--block-amber)] text-[color:var(--mark-amber)]'}`}>
          {resolved ? 'Resolved' : blocked ? 'Changes required' : 'Decision needed'}
        </span>
        {expanded ? <ChevronDownIcon className="h-5 w-5 shrink-0" /> : <ChevronRightIcon className="h-5 w-5 shrink-0" />}
      </button>

      {expanded && (
        <div className="bg-surface-raised px-6 pb-8 md:px-8">
          <div className="border-t border-line-soft pt-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-accent">{REVIEW_LABELS[item.itemType] || 'Teacher decision'}</p>
                <p className="mt-2 text-sm font-semibold text-text-muted">Choose the interpretation that best preserves the syllabus intent.</p>
              </div>
              {item.sourceCitation?.url && (
                <a href={item.sourceCitation.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-accent hover:bg-accent-soft">
                  View syllabus context <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
            </div>

            <fieldset className="mt-6 grid gap-4 lg:grid-cols-2" disabled={resolved || blocked || busy}>
              <legend className="sr-only">Choose a review decision</legend>
              {options.map((option) => {
                const active = String(chosen || '') === String(option.id);
                return (
                  <label key={option.id} className={`cursor-pointer rounded-2xl border p-5 transition-colors ${active ? 'border-accent bg-accent-soft shadow-[0_0_0_1px_var(--accent)]' : 'border-line-soft bg-surface-body hover:border-accent/50'}`}>
                    <span className="flex items-start gap-3">
                      <input type="radio" name={`decision-${item.id}`} value={option.id} checked={active} onChange={() => onSelect(option.id)} className="mt-1 h-4 w-4 accent-[color:var(--accent)]" />
                      <span>
                        <span className="block text-sm font-extrabold text-text-primary">{option.label}</span>
                        <span className="mt-1 block text-sm font-medium leading-relaxed text-text-muted">{option.description}</span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            <div className="mt-6 flex flex-col gap-4 border-t border-line-soft pt-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-bold text-text-primary">{item.sourceCitation?.label || 'Uploaded syllabus'}</p>
                <p className="mt-1 text-xs font-medium text-text-muted">{item.sourceCitation?.section || 'Source location captured during import'}</p>
              </div>
              {resolved || blocked ? (
                <div className="flex flex-col items-end gap-2"><span className="text-xs font-bold text-text-muted">{locked ? 'This decision is locked with the published version.' : blocked ? 'Update the related content, then reopen this check.' : 'This decision is included in readiness.'}</span>{!locked && <button type="button" onClick={onReopen} disabled={busy} className="btn-secondary shrink-0">Reopen decision</button>}</div>
              ) : (
                <button type="button" onClick={onResolve} disabled={!chosen || busy} className="btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-50">
                  {busy ? <ArrowPathIcon className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  Accept decision <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

const workflowSteps = [
  { id: 'structure', label: '1. Structure', icon: QueueListIcon },
  { id: 'questions', label: '2. Questions', icon: AcademicCapIcon },
  { id: 'review', label: '3. Review & publish', icon: ShieldCheckIcon },
];

function WorkflowNav({ active, onChange, pack }) {
  const readiness = pack.readiness || {};
  const remainingChecks = readiness.blockers?.length || 0;
  const details = {
    structure: `${(pack.outcomes || []).filter((outcome) => outcome.isActive !== false && outcome.isAssessable !== false).length} assessable outcomes`,
    questions: `${readiness.questions?.ready || 0} approved`,
    review: pack.lifecycleStatus === 'published' ? 'Published and locked' : pack.lifecycleStatus === 'archived' ? 'Archived history' : readiness.canPublish ? 'Ready to publish' : `${remainingChecks} ${remainingChecks === 1 ? 'check' : 'checks'} left`,
  };
  return (
    <nav aria-label="Subject pack workflow" className="mt-8 grid gap-3 rounded-3xl border border-line-soft bg-surface-raised p-3 md:grid-cols-3">
      {workflowSteps.map((step) => {
        const Icon = step.icon;
        const selected = active === step.id;
        return (
          <button key={step.id} type="button" onClick={() => onChange(step.id)} aria-current={selected ? 'step' : undefined} className={`flex min-h-16 items-center gap-3 rounded-2xl px-4 text-left transition-colors ${selected ? 'bg-accent text-white shadow-sm' : 'text-text-muted hover:bg-surface-soft hover:text-text-primary'}`}>
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span><span className="block text-sm font-extrabold">{step.label}</span><span className={`mt-0.5 block text-xs font-semibold ${selected ? 'text-white/75' : 'text-text-dim'}`}>{details[step.id]}</span></span>
          </button>
        );
      })}
    </nav>
  );
}

const outcomeInputClass = 'w-full rounded-xl border border-line-soft bg-surface-soft px-3 py-2.5 text-sm font-semibold text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft';

function OutcomeWorkspace({ pack, onPack, onNotice, onError, onNext }) {
  const activeOutcomes = (pack.outcomes || []).filter((outcome) => outcome.isActive !== false);
  const [editingId, setEditingId] = useState('');
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const locked = ['published', 'archived'].includes(pack.lifecycleStatus);

  const begin = (outcome = null) => {
    setEditingId(outcome?.id || 'new');
    setDraft(outcome ? {
      code: outcome.code || '', title: outcome.title || '', description: outcome.description || '',
      yearLevel: outcome.yearLevel || '', isAssessable: outcome.isAssessable !== false,
    } : { code: '', title: '', description: '', yearLevel: '', isAssessable: true });
  };

  const save = async (event) => {
    event.preventDefault();
    setBusy(true); onError('');
    try {
      const data = editingId === 'new'
        ? await api.createSubjectPackOutcome(pack.id, draft)
        : await api.updateSubjectPackOutcome(pack.id, editingId, draft);
      onPack(data.subjectPack);
      onNotice(editingId === 'new' ? 'Outcome added to this curriculum version.' : 'Outcome updated. Coverage has been recalculated.');
      setEditingId(''); setDraft(null);
    } catch (error) { onError(error.message || 'Could not save this outcome.'); }
    finally { setBusy(false); }
  };

  const archive = async (outcome) => {
    setBusy(true); onError('');
    try {
      const data = await api.updateSubjectPackOutcome(pack.id, outcome.id, { isActive: false });
      onPack(data.subjectPack); onNotice(`${outcome.code} was removed from this draft version.`);
    } catch (error) { onError(error.message || 'Could not remove this outcome.'); }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-3xl border border-line-soft bg-surface-raised p-6 shadow-[0_24px_50px_-38px_rgba(20,20,18,0.28)] md:p-8" aria-labelledby="structure-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-extrabold uppercase tracking-[0.13em] text-accent">Syllabus structure</p><h2 id="structure-heading" className="mt-2 font-display text-3xl font-extrabold text-text-primary">Check what students will master.</h2><p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-text-muted">Correct extraction mistakes here. Every assessable outcome must eventually have at least one approved question.</p></div>
        {!locked && <button type="button" onClick={() => begin()} className="btn-primary shrink-0"><PlusIcon className="h-4 w-4" /> Add outcome</button>}
      </div>

      {editingId && draft && (
        <form onSubmit={save} className="mt-6 rounded-2xl border border-accent bg-accent-soft p-5">
          <div className="grid gap-4 sm:grid-cols-[160px_1fr_160px]">
            <label className="text-xs font-bold text-text-primary">Code<input required value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} className={`${outcomeInputClass} mt-2`} /></label>
            <label className="text-xs font-bold text-text-primary">Outcome title<input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={`${outcomeInputClass} mt-2`} /></label>
            <label className="text-xs font-bold text-text-primary">Stage / year<input value={draft.yearLevel} onChange={(event) => setDraft({ ...draft, yearLevel: event.target.value })} className={`${outcomeInputClass} mt-2`} placeholder="Year 12" /></label>
          </div>
          <label className="mt-4 block text-xs font-bold text-text-primary">Description<textarea rows="3" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={`${outcomeInputClass} mt-2`} /></label>
          <label className="mt-4 flex items-start gap-3 text-sm font-semibold text-text-primary"><input type="checkbox" checked={draft.isAssessable} onChange={(event) => setDraft({ ...draft, isAssessable: event.target.checked })} className="mt-1 h-4 w-4 accent-[color:var(--accent)]" />Students should build mastery evidence against this outcome.</label>
          <div className="mt-5 flex gap-3"><button type="button" onClick={() => { setEditingId(''); setDraft(null); }} className="btn-secondary">Cancel</button><button type="submit" disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save outcome'}</button></div>
        </form>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-line-soft">
        {activeOutcomes.length ? activeOutcomes.map((outcome) => {
          const coverage = pack.readiness?.coverage?.outcomes?.find((item) => String(item.outcomeId) === String(outcome.id));
          return (
            <article key={outcome.id} className="flex flex-col gap-3 border-b border-line-soft bg-surface-body px-5 py-4 last:border-b-0 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-extrabold text-accent">{outcome.code}</span>{outcome.yearLevel && <span className="rounded-full bg-surface-soft px-2 py-1 text-[10px] font-bold text-text-muted">{outcome.yearLevel}</span>}{outcome.isAssessable === false && <span className="rounded-full bg-surface-soft px-2 py-1 text-[10px] font-bold text-text-muted">Grouping only</span>}</div><h3 className="mt-1 text-sm font-extrabold text-text-primary">{outcome.title}</h3><p className="mt-1 line-clamp-2 text-xs font-medium text-text-muted">{outcome.description}</p></div>
              {outcome.isAssessable !== false && <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${coverage?.ready ? 'bg-[color:var(--block-green)] text-[color:var(--mark-green)]' : 'bg-[color:var(--block-amber)] text-[color:var(--mark-amber)]'}`}>{coverage?.questionCount || 0} approved {coverage?.questionCount === 1 ? 'question' : 'questions'}</span>}
              {!locked && <div className="flex gap-1"><button type="button" onClick={() => begin(outcome)} className="rounded-xl p-2.5 text-text-muted hover:bg-surface-soft hover:text-accent" aria-label={`Edit ${outcome.code}`}><PencilSquareIcon className="h-4 w-4" /></button><button type="button" onClick={() => archive(outcome)} disabled={busy} className="rounded-xl p-2.5 text-text-muted hover:bg-surface-error hover:text-text-error" aria-label={`Remove ${outcome.code}`}><ArchiveBoxIcon className="h-4 w-4" /></button></div>}
            </article>
          );
        }) : <p className="p-8 text-center text-sm font-medium text-text-muted">No outcomes yet. Add the first assessable outcome to begin.</p>}
      </div>
      <div className="mt-6 flex justify-end"><button type="button" onClick={onNext} className="btn-primary">Continue to questions <ArrowRightIcon className="h-4 w-4" /></button></div>
    </section>
  );
}

function QuestionWorkspace({ pack, onPack, onNotice, onError, onNext }) {
  const [draft, setDraft] = useState(null);
  const [originalSignature, setOriginalSignature] = useState('');
  const [formErrors, setFormErrors] = useState([]);
  const [formNotice, setFormNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [humanReviewed, setHumanReviewed] = useState(false);
  const locked = ['published', 'archived'].includes(pack.lifecycleStatus);
  const questions = (pack.questions || []).filter((question) => question.lifecycleStatus !== 'archived');

  const open = (question) => {
    const next = { ...normalizeQuestion(question, pack.subject), readOnly: locked };
    setDraft(next); setOriginalSignature(questionSignature(next)); setFormErrors([]); setFormNotice(null); setHumanReviewed(false);
  };
  const create = (outcomeId = '') => {
    const source = pack.sourceDocuments?.[0] || {};
    const next = {
      ...emptyQuestion(pack.subject),
      syllabusVersion: pack.syllabusVersion,
      outcomeIds: outcomeId ? [String(outcomeId)] : [],
      sourceTitle: source.name || pack.title,
      sourceUrl: source.url || '',
      sourceNotes: `Original Caplet assessment item aligned to ${pack.title}.`,
    };
    setDraft(next); setOriginalSignature(questionSignature(next)); setFormErrors([]); setFormNotice(null); setHumanReviewed(false);
  };

  const syncSavedDraft = (subjectPack, questionId) => {
    onPack(subjectPack);
    const saved = subjectPack.questions?.find((question) => String(question.id) === String(questionId));
    if (saved) {
      const next = normalizeQuestion(saved, pack.subject);
      setDraft(next); setOriginalSignature(questionSignature(next));
    }
  };

  const save = async (event) => {
    event?.preventDefault();
    const errors = validateQuestionDraft(draft);
    if (errors.length) { setFormErrors(errors); return; }
    setSaving(true); setFormErrors([]); setFormNotice(null); onError('');
    try {
      const data = draft.id
        ? await api.updateSubjectPackQuestion(pack.id, draft.id, questionPayload(draft))
        : await api.createSubjectPackQuestion(pack.id, questionPayload(draft));
      syncSavedDraft(data.subjectPack, data.question.id);
      setFormNotice({ type: 'success', text: draft.id ? 'Question saved. Any previous approval was reset for a fresh review.' : 'Question draft created.' });
      onNotice('Question bank and curriculum coverage updated.');
    } catch (error) {
      const validationErrors = error.data?.validation?.errors?.map((item) => item.message) || [];
      if (validationErrors.length) setFormErrors(validationErrors);
      else setFormNotice({ type: 'error', text: error.message || 'Could not save this question.' });
    } finally { setSaving(false); }
  };

  const transition = async (status) => {
    if (!draft?.id) return;
    if (questionSignature(draft) !== originalSignature) { setFormNotice({ type: 'error', text: 'Save the question before changing its review status.' }); return; }
    setLifecycleBusy(true); setFormNotice(null); onError('');
    try {
      const data = await api.transitionSubjectPackQuestion(pack.id, draft.id, status, status === 'approved' ? humanReviewed : false);
      syncSavedDraft(data.subjectPack, draft.id);
      setHumanReviewed(false);
      setFormNotice({ type: 'success', text: status === 'approved' ? 'Human review recorded. This question now counts toward coverage.' : status === 'in_review' ? 'Question submitted for human review.' : 'Question returned to draft.' });
    } catch (error) {
      const validationErrors = error.data?.validation?.errors?.map((item) => item.message) || [];
      if (validationErrors.length) setFormErrors(validationErrors);
      else setFormNotice({ type: 'error', text: error.message || 'Could not update the review status.' });
    } finally { setLifecycleBusy(false); }
  };

  const archiveQuestion = async () => {
    if (!draft?.id || !window.confirm('Archive this question and remove it from coverage and new practice sessions?')) return;
    setLifecycleBusy(true); setFormNotice(null); onError('');
    try {
      const data = await api.transitionSubjectPackQuestion(pack.id, draft.id, 'archived', false);
      onPack(data.subjectPack); setDraft(null);
      onNotice('Question archived. Coverage and readiness have been recalculated.');
    } catch (error) {
      setFormNotice({ type: 'error', text: error.message || 'Could not archive this question.' });
    } finally { setLifecycleBusy(false); }
  };

  if (draft) {
    return <QuestionEditorForm draft={draft} setDraft={setDraft} outcomes={(pack.outcomes || []).filter((outcome) => outcome.isActive !== false && outcome.isAssessable !== false)} originalSignature={originalSignature} errors={formErrors} notice={formNotice} saving={saving} lifecycleBusy={lifecycleBusy} humanReviewed={humanReviewed} setHumanReviewed={setHumanReviewed} history={[]} historyLoading={false} onSave={save} onCancel={() => setDraft(null)} onArchive={archiveQuestion} onTransition={transition} onRefreshHistory={() => {}} publishManagedByPack />;
  }

  return (
    <section className="rounded-3xl border border-line-soft bg-surface-raised p-6 shadow-[0_24px_50px_-38px_rgba(20,20,18,0.28)] md:p-8" aria-labelledby="questions-heading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.13em] text-accent">Assessment coverage</p><h2 id="questions-heading" className="mt-2 font-display text-3xl font-extrabold text-text-primary">Build trustworthy evidence.</h2><p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-text-muted">Draft, map and human-review questions here. Approved questions count only when their required answer, feedback, source and marking checks pass.</p></div>{!locked && <button type="button" onClick={() => create()} className="btn-primary shrink-0"><PlusIcon className="h-4 w-4" /> New question</button>}</div>

      {pack.readiness?.coverage?.gaps?.length > 0 && (
        <div className="mt-6 rounded-2xl bg-[color:var(--block-amber)] p-5"><p className="text-sm font-extrabold text-text-primary">{pack.readiness.coverage.gaps.length} outcomes still need evidence</p><div className="mt-3 flex flex-wrap gap-2">{pack.readiness.coverage.gaps.map((gap) => <button key={gap.outcomeId} type="button" onClick={() => !locked && create(gap.outcomeId)} disabled={locked} className="rounded-full bg-surface-raised px-3 py-1.5 font-mono text-xs font-bold text-[color:var(--mark-amber)] disabled:cursor-default">{gap.code} + question</button>)}</div></div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {questions.length ? questions.map((question) => {
          const statusTone = ['approved', 'published'].includes(question.lifecycleStatus) ? 'bg-[color:var(--block-green)] text-[color:var(--mark-green)]' : question.lifecycleStatus === 'in_review' ? 'bg-[color:var(--block-amber)] text-[color:var(--mark-amber)]' : 'bg-surface-soft text-text-muted';
          return (
            <button key={question.id} type="button" onClick={() => open(question)} className="rounded-2xl border border-line-soft bg-surface-body p-5 text-left transition-colors hover:border-accent hover:bg-accent-soft/30">
              <div className="flex items-start justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${statusTone}`}>{question.lifecycleStatus}</span><span className="text-xs font-bold text-text-dim">{question.marks || 1} {Number(question.marks || 1) === 1 ? 'mark' : 'marks'}</span></div>
              <h3 className="mt-3 line-clamp-3 text-sm font-extrabold leading-relaxed text-text-primary">{question.prompt}</h3>
              <div className="mt-4 flex flex-wrap gap-1.5">{(question.outcomes || []).map((outcome) => <span key={outcome.id} className="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[10px] font-bold text-accent">{outcome.code}</span>)}</div>
            </button>
          );
        }) : <div className="rounded-2xl bg-surface-soft p-8 text-center lg:col-span-2"><AcademicCapIcon className="mx-auto h-8 w-8 text-accent" /><p className="mt-3 text-sm font-bold text-text-primary">No questions yet.</p><p className="mt-1 text-xs font-medium text-text-muted">Start with one outcome and build the first reviewed assessment item.</p></div>}
      </div>
      <div className="mt-6 flex justify-end"><button type="button" onClick={onNext} className="btn-primary">Review readiness <ArrowRightIcon className="h-4 w-4" /></button></div>
    </section>
  );
}

function ImportSubjectPack({ onCreated, onCancel }) {
  const [mode, setMode] = useState('template');
  const [file, setFile] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [form, setForm] = useState({ title: '', subject: '', syllabusVersion: '', sourceUrl: '', jurisdiction: 'NSW' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const createTemplate = async () => {
    setBusy(true); setError('');
    try {
      const data = await api.createBusinessStudiesSubjectPack();
      onCreated(data.subjectPack);
    } catch (err) {
      setError(err.message || 'Could not create the Business Studies subject pack.');
    } finally { setBusy(false); }
  };

  const importFile = async (event) => {
    event.preventDefault();
    if (!file && !pastedText.trim()) return setError('Choose a syllabus file or paste the syllabus outcome text.');
    setBusy(true); setError('');
    try {
      const extraction = file
        ? await extractSyllabusFile(file)
        : { text: pastedText.trim(), pageCount: null };
      const extractedText = extraction.text;
      const sourceName = file?.name || `${form.title} pasted syllabus text`;
      const sourceType = file?.type || 'text/plain';
      const data = await api.importSubjectPack({
        ...form,
        extractedText,
        sourceName,
        sourceType,
        sourceDocuments: [{
          id: `upload-${Date.now()}`,
          name: sourceName,
          type: sourceType,
          url: form.sourceUrl || null,
          verified: false,
          pageCount: extraction.pageCount,
          extractedCharacters: extractedText.length,
        }],
      });
      onCreated(data.subjectPack);
    } catch (err) {
      setError(err.message || 'Could not import this syllabus.');
    } finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen bg-surface-body py-28 selection:bg-accent selection:text-white">
      <div className="container-custom max-w-6xl">
        <header className="max-w-4xl">
          {onCancel && <button type="button" onClick={onCancel} className="btn-secondary mb-8"><ArrowRightIcon className="h-4 w-4 rotate-180" /> Back to subject packs</button>}
          <span className="font-hand text-2xl text-accent">turn a syllabus into learning</span>
          <h1 className="mt-3 font-display text-5xl font-extrabold tracking-tight text-text-primary md:text-7xl">Build a subject pack.</h1>
          <p className="mt-5 max-w-2xl text-lg font-medium leading-relaxed text-text-muted">Import a trusted syllabus, review only the decisions that need human judgement, then publish adaptive practice and mastery tracking.</p>
        </header>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <button type="button" onClick={() => setMode('template')} className={`rounded-3xl border p-7 text-left transition-colors ${mode === 'template' ? 'border-accent bg-accent-soft' : 'border-line-soft bg-surface-raised'}`}>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-raised text-accent"><SparklesIcon className="h-6 w-6" /></span>
            <span className="mt-5 block font-display text-2xl font-extrabold text-text-primary">HSC Business Studies</span>
            <span className="mt-2 block text-sm font-medium leading-relaxed text-text-muted">Start with the verified NESA 2010 syllabus, mapped outcomes, original questions and five review decisions.</span>
          </button>
          <button type="button" onClick={() => setMode('upload')} className={`rounded-3xl border p-7 text-left transition-colors ${mode === 'upload' ? 'border-accent bg-accent-soft' : 'border-line-soft bg-surface-raised'}`}>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-soft text-accent"><DocumentTextIcon className="h-6 w-6" /></span>
            <span className="mt-5 block font-display text-2xl font-extrabold text-text-primary">Import another syllabus</span>
            <span className="mt-2 block text-sm font-medium leading-relaxed text-text-muted">Upload a text-based PDF, DOCX or TXT syllabus. Caplet detects coded outcome statements for review.</span>
          </button>
        </div>

        {error && <div role="alert" className="mt-6 rounded-2xl bg-surface-error p-5 text-sm font-bold text-text-error">{error}</div>}

        {mode === 'template' ? (
          <section className="mt-8 flex flex-col gap-6 rounded-3xl bg-[color:var(--mark-blue)] p-8 text-white shadow-[0_28px_58px_-38px_rgba(19,81,170,0.7)] md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.13em] text-white/65">Production-ready vertical slice</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold">Build Business Studies from the official source.</h2>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-white/75">Creates the versioned pack in review. Nothing reaches students until every decision is resolved and the pack is published.</p>
            </div>
            <button type="button" onClick={createTemplate} disabled={busy} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-extrabold text-accent disabled:opacity-60">
              {busy ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <SparklesIcon className="h-5 w-5" />}
              Create subject pack
            </button>
          </section>
        ) : (
          <form onSubmit={importFile} className="mt-8 rounded-3xl bg-surface-raised p-7 shadow-[0_24px_50px_-38px_rgba(20,20,18,0.28)] md:p-9">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="text-sm font-bold text-text-primary">Pack title<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-[color:var(--input-line)] bg-[color:var(--surface-input)] px-4 text-sm font-semibold outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent-soft" placeholder="HSC Legal Studies" /></label>
              <label className="text-sm font-bold text-text-primary">Subject key<input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-[color:var(--input-line)] bg-[color:var(--surface-input)] px-4 text-sm font-semibold outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent-soft" placeholder="legal-studies" /></label>
              <label className="text-sm font-bold text-text-primary">Syllabus version<input required value={form.syllabusVersion} onChange={(e) => setForm({ ...form, syllabusVersion: e.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-[color:var(--input-line)] bg-[color:var(--surface-input)] px-4 text-sm font-semibold outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent-soft" placeholder="NSW-2025" /></label>
              <label className="text-sm font-bold text-text-primary">Official source URL<input type="url" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-[color:var(--input-line)] bg-[color:var(--surface-input)] px-4 text-sm font-semibold outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent-soft" placeholder="https://curriculum.nsw.edu.au/..." /></label>
            </div>
            <label className="mt-6 block rounded-2xl border border-dashed border-line-strong bg-surface-body p-8 text-center">
              <DocumentTextIcon className="mx-auto h-8 w-8 text-accent" />
              <span className="mt-3 block text-sm font-extrabold text-text-primary">{file?.name || 'Choose a syllabus PDF, DOCX or TXT file'}</span>
              <span className="mt-1 block text-xs font-medium text-text-muted">PDF, DOCX and TXT extraction happens in your browser. The original file is never uploaded.</span>
              <input type="file" accept=".pdf,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setFile(e.target.files?.[0] || null)} className="sr-only" />
            </label>
            <div className="my-5 flex items-center gap-3" aria-hidden="true"><span className="h-px flex-1 bg-line-soft" /><span className="text-xs font-extrabold uppercase tracking-[0.12em] text-text-dim">or paste text</span><span className="h-px flex-1 bg-line-soft" /></div>
            <label className="block text-sm font-bold text-text-primary">Syllabus outcome text<textarea rows="7" value={pastedText} onChange={(event) => setPastedText(event.target.value)} className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 font-mono text-sm font-medium leading-relaxed text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft" placeholder={'[Page 12]\nLS11-1 examines the role of…\nLS11-2 explains the relationship between…'} /></label>
            <p className="mt-2 text-xs font-medium text-text-muted">Use one coded outcome per line. Page markers such as [Page 12] preserve source provenance.</p>
            <button type="submit" disabled={busy} className="btn-primary mt-6">
              {busy ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <DocumentCheckIcon className="h-4 w-4" />}
              Extract outcomes
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function CurriculumStudio() {
  const { packId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState({ loading: true, error: '', pack: null, packs: [] });
  const [expandedId, setExpandedId] = useState(null);
  const [selections, setSelections] = useState({});
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  const [workspaceTab, setWorkspaceTab] = useState('review');
  const [showImporter, setShowImporter] = useState(false);
  const canAuthor = ['instructor', 'admin'].includes(user?.role);

  const firstIncompleteStep = useCallback((subjectPack) => {
    if (subjectPack.lifecycleStatus === 'published' || subjectPack.lifecycleStatus === 'archived') return 'review';
    if ((subjectPack.reviewItems || []).some((item) => item.itemType === 'source_verification' && item.status !== 'resolved')) return 'structure';
    if ((subjectPack.readiness?.coverage?.gaps || []).length || (subjectPack.readiness?.questions?.ready || 0) < 5) return 'questions';
    return 'review';
  }, []);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      if (packId) {
        const data = await api.getSubjectPack(packId);
        setState({ loading: false, error: '', pack: data.subjectPack, packs: [] });
        setWorkspaceTab(firstIncompleteStep(data.subjectPack));
      } else {
        const data = await api.getSubjectPacks();
        const packs = data.subjectPacks || [];
        setState({ loading: false, error: '', pack: null, packs });
      }
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message || 'Could not load Curriculum Studio.' }));
    }
  }, [firstIncompleteStep, packId]);

  useEffect(() => { load(); }, [load]);

  const pack = state.pack;
  const reviewItems = useMemo(() => pack?.reviewItems || [], [pack]);
  const openItems = useMemo(() => reviewItems.filter((item) => item.status !== 'resolved'), [reviewItems]);

  useEffect(() => {
    if (!reviewItems.length) return;
    if (!expandedId || !reviewItems.some((item) => item.id === expandedId)) {
      setExpandedId((openItems[0] || reviewItems[0]).id);
    }
  }, [expandedId, openItems, reviewItems]);

  const updatePack = (nextPack) => {
    setState((current) => ({ ...current, pack: nextPack, error: '' }));
    const nextOpen = nextPack.reviewItems?.find((item) => item.status !== 'resolved');
    if (nextOpen) setExpandedId(nextOpen.id);
  };

  const setError = (error) => setState((current) => ({ ...current, error }));

  const resolve = async (item) => {
    const optionId = selections[item.id];
    if (!optionId) return;
    setBusyId(item.id); setNotice('');
    try {
      const data = await api.resolveSubjectPackReviewItem(pack.id, item.id, optionId);
      updatePack(data.subjectPack);
      setNotice('Decision recorded. Readiness has been recalculated.');
    } catch (error) {
      setState((current) => ({ ...current, error: error.message || 'Could not record that decision.' }));
    } finally { setBusyId(''); }
  };

  const reopen = async (item) => {
    setBusyId(item.id); setNotice('');
    try {
      const data = await api.reopenSubjectPackReviewItem(pack.id, item.id);
      updatePack(data.subjectPack);
    } catch (error) {
      setState((current) => ({ ...current, error: error.message || 'Could not reopen that decision.' }));
    } finally { setBusyId(''); }
  };

  const publish = async () => {
    setBusyId('publish'); setNotice('');
    try {
      const data = await api.publishSubjectPack(pack.id);
      updatePack(data.subjectPack);
      setNotice('Subject pack published. Diagnostic practice and mastery tracking are now live.');
    } catch (error) {
      setState((current) => ({ ...current, error: error.message || 'Could not publish this subject pack.' }));
    } finally { setBusyId(''); }
  };

  const createVersion = async () => {
    setBusyId('version'); setNotice('');
    try {
      const data = await api.createSubjectPackVersion(pack.id);
      navigate(`/curriculum-studio/${data.subjectPack.id}`);
    } catch (error) { setError(error.message || 'Could not create the next subject-pack version.'); }
    finally { setBusyId(''); }
  };

  const archivePack = async () => {
    if (!window.confirm('Archive this published pack and remove its questions from new practice sessions? Existing learning evidence will be preserved.')) return;
    setBusyId('archive'); setNotice('');
    try {
      const data = await api.archiveSubjectPack(pack.id);
      updatePack(data.subjectPack);
      setNotice('Subject pack archived. Existing learning evidence remains available, and its questions will not start new sessions.');
    } catch (error) { setError(error.message || 'Could not archive this subject pack.'); }
    finally { setBusyId(''); }
  };

  if (state.loading) return <main className="min-h-screen bg-surface-body py-32"><CapletLoader message="Reading subject-pack readiness…" /></main>;
  if (!packId && canAuthor && (state.packs.length === 0 || showImporter)) return <ImportSubjectPack onCreated={(created) => navigate(`/curriculum-studio/${created.id}`)} onCancel={state.packs.length ? () => setShowImporter(false) : undefined} />;
  if (!packId && !canAuthor && state.packs.length === 0) {
    return <main className="min-h-screen bg-surface-body py-32"><div className="container-custom rounded-3xl bg-surface-raised p-8"><h1 className="font-display text-3xl font-extrabold text-text-primary">No published subject packs yet.</h1><p className="mt-3 font-medium text-text-muted">Your teacher will publish a pack here when it is ready for practice.</p></div></main>;
  }
  if (!packId && state.packs.length) {
    return (
      <main className="min-h-screen bg-surface-body py-28"><div className="container-custom">
        <span className="font-hand text-2xl text-accent">curriculum studio</span>
        <div className="mt-2 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl">Subject packs.</h1><p className="mt-3 max-w-2xl text-base font-medium text-text-muted">Manage every curriculum version from import through student practice.</p></div>{canAuthor && <button type="button" onClick={() => setShowImporter(true)} className="btn-primary shrink-0"><PlusIcon className="h-4 w-4" /> New subject pack</button>}</div>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">{state.packs.map((item) => <SubjectPackCard key={item.id} pack={item} />)}</div>
      </div></main>
    );
  }
  if (!pack) return <main className="min-h-screen bg-surface-body py-32"><div className="container-custom rounded-2xl bg-surface-error p-6 font-bold text-text-error">{state.error || 'Subject pack not found.'}</div></main>;

  const readiness = pack.readiness || {};
  const published = pack.lifecycleStatus === 'published';
  const archived = pack.lifecycleStatus === 'archived';
  const readyToPublish = !published && !archived && Boolean(readiness.canPublish);
  const displayTitle = pack.title.replace(/^HSC\s+/i, '');
  return (
    <main className="min-h-screen bg-surface-body py-24 selection:bg-accent selection:text-white">
      <div className="container-custom max-w-[1380px]">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="font-hand text-xl text-accent">human judgement, where it matters</span>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-text-primary md:text-5xl">
              {published ? `${displayTitle} is live` : archived ? `${displayTitle} is archived` : readyToPublish ? `${displayTitle} is ready to publish` : `${displayTitle} is in review`}
            </h1>
            <p className="mt-4 max-w-3xl text-lg font-medium text-text-muted">
              {published ? 'Students can now build evidence against this versioned curriculum.' : archived ? 'This historical version is locked. Existing evidence remains intact, but no new practice sessions will use it.' : readyToPublish ? 'Every readiness gate has passed. Publish this version when you are ready to make it available to students.' : 'Work through the structure, question and source checks that still need your judgement.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/curriculum-studio" className="btn-secondary">All subject packs</Link>
            {published && canAuthor && <button type="button" onClick={createVersion} disabled={busyId === 'version'} className="btn-secondary">{busyId === 'version' ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PlusIcon className="h-4 w-4" />} Create next version</button>}
            {published && canAuthor && <button type="button" onClick={archivePack} disabled={busyId === 'archive'} className="btn-secondary text-text-error">{busyId === 'archive' ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ArchiveBoxIcon className="h-4 w-4" />} Archive</button>}
            {published && <Link to={pack.studentLinks?.diagnostic} className="btn-primary">Open student diagnostic <ArrowRightIcon className="h-4 w-4" /></Link>}
          </div>
        </header>

        {state.error && <div role="alert" className="mt-6 rounded-2xl bg-surface-error p-5 text-sm font-bold text-text-error">{state.error}</div>}
        {notice && <div role="status" aria-live="polite" className="mt-6 rounded-2xl bg-[color:var(--block-green)] p-5 text-sm font-bold text-[color:var(--mark-green)]">{notice}</div>}

        {canAuthor && <WorkflowNav active={workspaceTab} onChange={setWorkspaceTab} pack={pack} />}

        <div className="mt-9 grid gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
          {workspaceTab === 'structure' && canAuthor ? <OutcomeWorkspace pack={pack} onPack={updatePack} onNotice={setNotice} onError={setError} onNext={() => setWorkspaceTab('questions')} /> : null}
          {workspaceTab === 'questions' && canAuthor ? <QuestionWorkspace pack={pack} onPack={updatePack} onNotice={setNotice} onError={setError} onNext={() => setWorkspaceTab('review')} /> : null}
          {(workspaceTab === 'review' || !canAuthor) && <section aria-labelledby="review-heading" className="overflow-hidden rounded-3xl border border-line-soft bg-surface-raised shadow-[0_24px_50px_-38px_rgba(20,20,18,0.28)]">
            <div className={`flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8 ${openItems.length ? 'bg-[color:var(--block-amber)]' : 'bg-[color:var(--block-green)]'}`}>
              <div>
                <h2 id="review-heading" className="font-display text-2xl font-extrabold text-text-primary">{openItems.length ? `${openItems.length} ${openItems.length === 1 ? 'decision' : 'decisions'} before publishing` : 'Review complete'}</h2>
                <p className="mt-1 text-sm font-medium text-text-muted">Teacher decisions are one part of readiness. Coverage, question quality and source checks must also pass.</p>
              </div>
              <span className="w-fit rounded-full bg-surface-raised px-3 py-1.5 text-xs font-extrabold text-accent">{readiness.decisions?.resolved || 0} of {readiness.decisions?.total || 0} resolved</span>
            </div>
            {reviewItems.length ? reviewItems.map((item, index) => (
              <ReviewDecision
                key={item.id}
                item={item}
                index={index}
                expanded={expandedId === item.id}
                selectedOption={selections[item.id] || ''}
                busy={busyId === item.id}
                locked={published || archived}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                onSelect={(optionId) => setSelections((current) => ({ ...current, [item.id]: optionId }))}
                onResolve={() => resolve(item)}
                onReopen={() => reopen(item)}
              />
            )) : <div className="p-8"><CheckCircleIcon className="h-8 w-8 text-[color:var(--mark-green)]" /><h3 className="mt-3 font-display text-xl font-extrabold text-text-primary">No exception decisions remain.</h3><p className="mt-2 text-sm font-medium text-text-muted">Use the readiness panel to finish any remaining content or source checks.</p></div>}
          </section>}

          <aside aria-labelledby="readiness-heading" className="h-fit rounded-3xl border border-line-soft bg-surface-raised p-6 shadow-[0_24px_50px_-38px_rgba(20,20,18,0.28)] xl:sticky xl:top-24">
            <h2 id="readiness-heading" className="font-display text-2xl font-extrabold text-accent">Readiness</h2>
            <div className="mt-3">
              <Metric icon={CheckCircleIcon} label="Outcomes" ready={readiness.outcomes?.ready || 0} total={readiness.outcomes?.total || 0} detail={readiness.outcomes?.ready === readiness.outcomes?.total ? 'All outcomes ready' : `${(readiness.outcomes?.total || 0) - (readiness.outcomes?.ready || 0)} outcomes need evidence`} tone={readiness.outcomes?.ready === readiness.outcomes?.total ? 'green' : 'amber'} />
              <Metric icon={DocumentTextIcon} label="Questions" ready={readiness.questions?.ready || 0} total={readiness.questions?.total || 0} detail={(readiness.questions?.total || 0) === 0 ? 'No questions approved yet' : readiness.questions?.ready === readiness.questions?.total ? 'Question bank ready' : `${(readiness.questions?.total || 0) - (readiness.questions?.ready || 0)} questions need review`} tone={(readiness.questions?.total || 0) > 0 && readiness.questions?.ready === readiness.questions?.total ? 'green' : 'amber'} />
              <Metric icon={QueueListIcon} label="Coverage" ready={readiness.coverage?.ready || 0} total={readiness.coverage?.total || 0} detail={readiness.coverage?.ready === readiness.coverage?.total ? 'Every outcome covered' : `${readiness.coverage?.gaps?.length || 0} outcomes need questions`} tone={readiness.coverage?.ready === readiness.coverage?.total ? 'green' : 'amber'} />
              <Metric icon={AcademicCapIcon} label="Diagnostic" ready={readiness.diagnostic?.ready || 0} total={readiness.diagnostic?.total || 5} detail={`${readiness.diagnostic?.available || 0} approved multiple-choice available`} tone={(readiness.diagnostic?.ready || 0) >= (readiness.diagnostic?.total || 5) ? 'green' : 'amber'} />
              <Metric icon={SparklesIcon} label="Rubrics" ready={readiness.rubrics?.ready || 0} total={readiness.rubrics?.total || 0} detail={readiness.rubrics?.ready === readiness.rubrics?.total ? 'Rubrics ready' : 'Teacher review pending'} tone={readiness.rubrics?.ready === readiness.rubrics?.total ? 'green' : 'amber'} />
              <Metric icon={ShieldCheckIcon} label="Sources verified" ready={`${readiness.sources?.percent || 0}%`} total="" detail={`${readiness.sources?.verified || 0} of ${readiness.sources?.total || 0} sources`} tone={readiness.sources?.percent === 100 ? 'green' : 'amber'} />
            </div>
            <div className="mt-5 rounded-2xl bg-accent-soft p-4 text-sm font-semibold leading-relaxed text-accent">
              {published ? 'This subject pack is published and locked. Create a new version to make future changes.' : archived ? 'This version is archived and preserved as read-only history.' : readiness.canPublish ? 'Every decision is resolved. This version is ready for students.' : 'Complete the remaining readiness checks to unlock publishing.'}
            </div>
            {published ? (
              <div className="mt-5 grid gap-3">
                <Link to={pack.studentLinks?.diagnostic} className="btn-primary w-full justify-center">Start diagnostic <ArrowRightIcon className="h-4 w-4" /></Link>
                <Link to={pack.studentLinks?.mastery} className="btn-secondary w-full justify-center">View mastery</Link>
              </div>
            ) : archived ? null : (
              <button type="button" onClick={publish} disabled={!readiness.canPublish || busyId === 'publish'} className="btn-primary mt-5 w-full justify-center disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-text-dim">
                {busyId === 'publish' ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : readiness.canPublish ? <BookOpenIcon className="h-4 w-4" /> : <LockClosedIcon className="h-4 w-4" />}
                Publish subject pack
              </button>
            )}
            {!published && !archived && !readiness.canPublish && <p className="mt-3 text-center text-xs font-semibold text-text-muted">Work through the checklist above to unlock publishing.</p>}
            {!published && !archived && readiness.blockers?.length > 0 && <ol className="mt-5 space-y-2 border-t border-line-soft pt-5">{readiness.blockers.map((blocker, index) => <li key={blocker} className="flex gap-2 text-xs font-semibold leading-relaxed text-text-muted"><span className="font-mono text-[color:var(--mark-amber)]">{index + 1}.</span>{blocker}</li>)}</ol>}
          </aside>
        </div>
      </div>
    </main>
  );
}
