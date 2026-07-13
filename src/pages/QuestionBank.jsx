import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import QuestionEditorForm from '../components/editor/QuestionEditorForm';
import CapletLoader from '../components/CapletLoader';
import {
  LIFECYCLE_LABELS,
  emptyQuestion,
  normalizeQuestion,
  questionPayload,
  questionSignature,
  validateQuestionDraft,
} from '../lib/questionBank';
import api from '../services/api';
import useDialogFocus from '../lib/useDialogFocus';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In review' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'superseded', label: 'Superseded' },
  { value: 'archived', label: 'Archived' },
];

const selectClass = 'w-full rounded-2xl border border-line-soft bg-surface-raised px-3 py-2.5 text-xs font-bold text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft';

function editorRequest(endpoint, options = {}) {
  return api.request(`/editor${endpoint}`, { ...options, auth: 'editor' });
}

function EditorAccessGate({ onEntered }) {
  const [code, setCode] = useState('');
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    setEntering(true);
    setError('');
    try {
      await api.editorEnter(code.trim());
      onEntered();
    } catch (caught) {
      setError(caught.message || 'That workspace code was not recognised.');
    } finally {
      setEntering(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface-body px-6 py-28 selection:bg-accent selection:text-text-contrast">
      <div className="mx-auto max-w-lg rounded-3xl bg-surface-raised p-8 shadow-[0_30px_70px_-42px_rgba(20,20,18,0.5)] md:p-10">
        <p className="font-hand text-xl text-accent -rotate-2 inline-block">curriculum workspace</p>
        <h1 className="mt-3 text-4xl font-display font-extrabold tracking-tight text-text-primary">Enter the question bank.</h1>
        <p className="mt-4 text-sm font-medium leading-relaxed text-text-muted">Use your private editor code. Question authoring sessions stay on this device and expire automatically.</p>
        <form onSubmit={submit} className="mt-8">
          <label htmlFor="question-bank-code" className="text-sm font-bold text-text-primary">Workspace code</label>
          <input id="question-bank-code" type="password" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} className="mt-2 w-full rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 font-mono text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft" />
          {error && <p role="alert" className="mt-4 rounded-2xl bg-surface-error px-4 py-3 text-sm font-bold text-text-error">{error}</p>}
          <button type="submit" disabled={entering || !code.trim()} className="btn-primary mt-6 w-full disabled:opacity-50">{entering ? 'Checking…' : 'Open question bank'}</button>
        </form>
      </div>
    </main>
  );
}

function statusTone(status) {
  if (status === 'published') return 'bg-[color:var(--block-green)] text-[color:var(--mark-green)]';
  if (status === 'approved') return 'bg-accent-soft text-accent';
  if (status === 'in_review') return 'bg-[color:var(--block-amber)] text-[color:var(--mark-amber)]';
  if (['superseded', 'archived'].includes(status)) return 'bg-surface-soft text-text-dim';
  return 'bg-surface-soft text-text-muted';
}

function questionOutcomeLabels(question) {
  if (Array.isArray(question.outcomes)) return question.outcomes;
  if (Array.isArray(question.CurriculumOutcomes)) return question.CurriculumOutcomes;
  return [];
}

function FilterPanel({ filters, searchDraft, setSearchDraft, outcomes, subjects, onFilter, onSearch }) {
  return (
    <form onSubmit={onSearch} className="border-b border-line-soft p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-text-dim"><FunnelIcon className="h-4 w-4" aria-hidden="true" /> Filter bank</div>
      <div className="relative mt-3">
        <label htmlFor="question-search" className="sr-only">Search question bank</label>
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-dim" aria-hidden="true" />
        <input id="question-search" type="search" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Search prompts or source…" className="w-full rounded-2xl border border-line-soft bg-surface-raised py-2.5 pl-9 pr-3 text-xs font-semibold text-text-primary outline-none placeholder:text-text-dim focus:border-accent focus:ring-2 focus:ring-accent-soft" />
      </div>
      <button type="submit" className="sr-only">Apply search</button>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="question-subject-filter" className="sr-only">Filter by subject</label>
          <select id="question-subject-filter" value={filters.subject} onChange={(event) => onFilter('subject', event.target.value)} className={selectClass}>
            {subjects.map((subject) => <option key={subject} value={subject}>{subject === 'economics' ? 'Economics' : subject}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="question-status-filter" className="sr-only">Filter by lifecycle status</label>
          <select id="question-status-filter" value={filters.status} onChange={(event) => onFilter('status', event.target.value)} className={selectClass}>{STATUS_OPTIONS.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select>
        </div>
      </div>
      <div className="mt-2">
        <label htmlFor="question-outcome-filter" className="sr-only">Filter by syllabus outcome</label>
        <select id="question-outcome-filter" value={filters.outcomeId} onChange={(event) => onFilter('outcomeId', event.target.value)} className={selectClass}>
          <option value="">All syllabus outcomes</option>
          {outcomes.filter((outcome) => !filters.subject || outcome.subject === filters.subject).map((outcome) => <option key={outcome.id} value={outcome.id}>{outcome.code} · {outcome.title}</option>)}
        </select>
      </div>
    </form>
  );
}

function QuestionList({ questions, loading, error, selectedId, onSelect, onRetry }) {
  if (loading) return <div className="grid min-h-80 place-items-center" role="status"><CapletLoader message="Loading questions…" /></div>;
  if (error) {
    return <div className="p-6 text-center"><ExclamationTriangleIcon className="mx-auto h-7 w-7 text-text-error" aria-hidden="true" /><p role="alert" className="mt-3 text-sm font-bold text-text-error">{error}</p><button type="button" onClick={onRetry} className="btn-secondary mx-auto mt-4 px-4 py-2 text-xs"><ArrowPathIcon className="h-4 w-4" aria-hidden="true" /> Try again</button></div>;
  }
  if (!questions.length) {
    return <div className="p-8 text-center"><DocumentTextIcon className="mx-auto h-8 w-8 text-text-dim" aria-hidden="true" /><h2 className="mt-3 text-lg font-display font-extrabold text-text-primary">No matching questions</h2><p className="mt-1 text-xs font-medium text-text-muted">Adjust the filters or create a new draft.</p></div>;
  }

  return (
    <ul className="divide-y divide-line-soft" aria-label="Question bank results">
      {questions.map((question) => {
        const status = question.lifecycleStatus || question.status || 'draft';
        const mapped = questionOutcomeLabels(question);
        return (
          <li key={question.id}>
            <button type="button" onClick={() => onSelect(question)} aria-current={String(selectedId) === String(question.id) ? 'true' : undefined} className={`w-full p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${String(selectedId) === String(question.id) ? 'bg-accent-soft' : 'hover:bg-surface-soft'}`}>
              <div className="flex items-start justify-between gap-3">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusTone(status)}`}>{LIFECYCLE_LABELS[status] || status}</span>
                <span className="font-mono text-[10px] font-bold text-text-dim">v{question.version || 1}</span>
              </div>
              <p className="mt-3 line-clamp-3 text-sm font-bold leading-snug text-text-primary">{question.prompt || 'Untitled question'}</p>
              <p className="mt-2 text-[11px] font-medium text-text-muted">{String(question.responseType || 'question').replaceAll('_', ' ')} · {question.marks || 1} {(question.marks || 1) === 1 ? 'mark' : 'marks'}{question.difficulty ? ` · ${question.difficulty}` : ''}</p>
              {mapped.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{mapped.slice(0, 3).map((outcome) => <span key={outcome.id || outcome.code} className="rounded-full bg-surface-raised px-2 py-1 font-mono text-[9px] font-bold text-accent">{outcome.code || outcome.title}</span>)}</div>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ConfirmDialog({ status, busy, onCancel, onConfirm }) {
  const label = LIFECYCLE_LABELS[status] || status;
  const dialogRef = useDialogFocus({ onDismiss: onCancel, dismissDisabled: busy });
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-surface-inverse/50 p-4" role="presentation">
      <section ref={dialogRef} tabIndex="-1" role="alertdialog" aria-modal="true" aria-labelledby="question-lifecycle-dialog-title" className="w-full max-w-md rounded-3xl bg-surface-raised p-7 shadow-2xl">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[color:var(--block-amber)] text-[color:var(--mark-amber)]"><ShieldCheckIcon className="h-6 w-6" aria-hidden="true" /></span>
        <h2 id="question-lifecycle-dialog-title" className="mt-5 text-2xl font-display font-extrabold text-text-primary">Move this question to {label}?</h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-text-muted">{status === 'published' ? 'Publishing makes this version available to learner practice. Confirm its outcomes, rubric, answers, source, and human review are correct.' : 'This closes the current published version. Historical evidence remains linked to it.'}</p>
        <div className="mt-7 flex justify-end gap-3"><button type="button" data-initial-focus onClick={onCancel} disabled={busy} className="btn-secondary">Cancel</button><button type="button" onClick={onConfirm} disabled={busy} className="btn-primary">{busy ? 'Updating…' : `Confirm ${label.toLowerCase()}`}</button></div>
      </section>
    </div>
  );
}

function DiscardDialog({ onCancel, onDiscard }) {
  const dialogRef = useDialogFocus({ onDismiss: onCancel });
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-surface-inverse/50 p-4" role="presentation">
      <section ref={dialogRef} tabIndex="-1" role="alertdialog" aria-modal="true" aria-labelledby="discard-question-title" className="w-full max-w-md rounded-3xl bg-surface-raised p-7 shadow-2xl">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-error text-text-error"><ExclamationTriangleIcon className="h-6 w-6" aria-hidden="true" /></span>
        <h2 id="discard-question-title" className="mt-5 text-2xl font-display font-extrabold text-text-primary">Discard unsaved changes?</h2>
        <p className="mt-2 text-sm font-medium text-text-muted">The latest edits to this question have not been saved.</p>
        <div className="mt-7 flex justify-end gap-3"><button type="button" data-initial-focus onClick={onCancel} className="btn-secondary">Keep editing</button><button type="button" onClick={onDiscard} className="inline-flex items-center justify-center rounded-2xl bg-text-error px-6 py-3 text-sm font-bold text-text-contrast">Discard changes</button></div>
      </section>
    </div>
  );
}

export default function QuestionBank() {
  const [authorised, setAuthorised] = useState(() => typeof sessionStorage !== 'undefined' && Boolean(sessionStorage.getItem('editorToken')));
  const revokeAccess = useCallback(() => { api.clearEditorToken(); setAuthorised(false); }, []);
  if (!authorised) return <EditorAccessGate onEntered={() => setAuthorised(true)} />;
  return <QuestionBankWorkspace onUnauthorized={revokeAccess} />;
}

function QuestionBankWorkspace({ onUnauthorized }) {
  const [outcomes, setOutcomes] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [filters, setFilters] = useState({ subject: 'economics', status: '', search: '', outcomeId: '' });
  const [searchDraft, setSearchDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [draft, setDraft] = useState(null);
  const [originalSignature, setOriginalSignature] = useState('');
  const [formErrors, setFormErrors] = useState([]);
  const [notice, setNotice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [humanReviewed, setHumanReviewed] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pendingLifecycle, setPendingLifecycle] = useState('');
  const [pendingNavigation, setPendingNavigation] = useState(null);

  const loadOutcomes = useCallback(async () => {
    try {
      const data = await editorRequest('/curriculum-outcomes');
      setOutcomes(data?.outcomes || []);
    } catch (error) {
      if (error.status === 401) onUnauthorized();
      else setNotice({ type: 'error', text: error.message || 'Could not load curriculum outcomes.' });
    }
  }, [onUnauthorized]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    setListError('');
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
    try {
      const data = await editorRequest(`/questions?${query.toString()}`);
      setQuestions(data?.questions || data?.items || []);
    } catch (error) {
      if (error.status === 401) onUnauthorized();
      else setListError(error.message || 'Could not load the question bank.');
    } finally {
      setLoading(false);
    }
  }, [filters, onUnauthorized]);

  useEffect(() => { loadOutcomes(); }, [loadOutcomes]);
  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const loadHistory = useCallback(async (questionId) => {
    if (!questionId) return;
    setHistoryLoading(true);
    try {
      const data = await editorRequest(`/questions/${encodeURIComponent(questionId)}/history`);
      setHistory(data?.revisions || data?.questions || data?.history || []);
    } catch (error) {
      if (error.status === 401) onUnauthorized();
      else setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [onUnauthorized]);

  const openQuestion = (question) => {
    const next = normalizeQuestion(question, filters.subject);
    setDraft(next);
    setOriginalSignature(questionSignature(next));
    setFormErrors([]);
    setNotice(null);
    setHumanReviewed(false);
    setHistory([]);
    loadHistory(next.id);
  };

  const createQuestion = () => {
    const next = emptyQuestion(filters.subject);
    setDraft(next);
    setOriginalSignature(questionSignature(next));
    setFormErrors([]);
    setNotice(null);
    setHumanReviewed(false);
    setHistory([]);
  };

  const isDirty = draft && questionSignature(draft) !== originalSignature;
  const navigateWithGuard = (target) => {
    if (isDirty) setPendingNavigation(target);
    else if (target.type === 'open') openQuestion(target.question);
    else if (target.type === 'new') createQuestion();
    else setDraft(null);
  };

  const completePendingNavigation = () => {
    const target = pendingNavigation;
    setPendingNavigation(null);
    if (target?.type === 'open') openQuestion(target.question);
    else if (target?.type === 'new') createQuestion();
    else setDraft(null);
  };

  const saveDraft = async (event) => {
    event?.preventDefault();
    const errors = validateQuestionDraft(draft);
    if (errors.length) { setFormErrors(errors); return null; }
    setSaving(true);
    setFormErrors([]);
    setNotice(null);
    try {
      const endpoint = draft.id ? `/questions/${encodeURIComponent(draft.id)}` : '/questions';
      const data = await editorRequest(endpoint, { method: draft.id ? 'PUT' : 'POST', body: JSON.stringify(questionPayload(draft)) });
      const saved = normalizeQuestion(data?.question || data, draft.subject);
      setDraft(saved);
      setOriginalSignature(questionSignature(saved));
      setNotice({ type: 'success', text: draft.id ? `Saved version ${saved.version}.` : 'Question draft created.' });
      await loadQuestions();
      await loadHistory(saved.id);
      return saved;
    } catch (error) {
      if (error.status === 401) onUnauthorized();
      else setNotice({ type: 'error', text: error.message || 'Could not save this question.' });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const requestLifecycle = (status) => {
    if (isDirty) { setNotice({ type: 'error', text: 'Save the draft before changing its lifecycle.' }); return; }
    if (status === 'approved' && !humanReviewed) { setNotice({ type: 'error', text: 'Confirm human review before approving.' }); return; }
    if (['published', 'superseded'].includes(status)) setPendingLifecycle(status);
    else performLifecycle(status);
  };

  const performLifecycle = async (status) => {
    if (!draft?.id) return;
    setLifecycleBusy(true);
    setNotice(null);
    try {
      const data = await editorRequest(`/questions/${encodeURIComponent(draft.id)}/lifecycle`, {
        method: 'POST',
        body: JSON.stringify({ status, humanReviewed: status === 'approved' ? humanReviewed : false }),
      });
      const updated = normalizeQuestion(data?.question || { ...draft, lifecycleStatus: status }, draft.subject);
      setDraft(updated);
      setOriginalSignature(questionSignature(updated));
      setHumanReviewed(false);
      setPendingLifecycle('');
      setNotice({ type: 'success', text: `Question moved to ${LIFECYCLE_LABELS[status] || status}.` });
      await loadQuestions();
      await loadHistory(updated.id);
    } catch (error) {
      if (error.status === 401) onUnauthorized();
      else setNotice({ type: 'error', text: error.message || 'Could not update the lifecycle.' });
      setPendingLifecycle('');
    } finally {
      setLifecycleBusy(false);
    }
  };

  const subjects = useMemo(() => [...new Set(['economics', ...outcomes.map((outcome) => outcome.subject).filter(Boolean), ...questions.map((question) => question.subject).filter(Boolean)])], [outcomes, questions]);
  const currentId = draft?.id;

  return (
    <main className="min-h-screen bg-surface-body pb-20 pt-20 selection:bg-accent selection:text-text-contrast">
      <header className="border-b border-line-soft bg-surface-body/95 px-5 py-5 backdrop-blur-md md:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link to="/editor" className="inline-flex items-center gap-2 text-xs font-bold text-text-muted hover:text-text-primary"><ArrowLeftIcon className="h-4 w-4" aria-hidden="true" /> Lesson editor</Link>
            <p className="mt-4 font-hand text-lg text-accent -rotate-2 inline-block">assessment workspace</p>
            <h1 className="mt-1 text-4xl font-display font-extrabold tracking-tight text-text-primary md:text-5xl">Question bank.</h1>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => navigateWithGuard({ type: 'new' })} className="btn-primary"><PlusIcon className="h-4 w-4" aria-hidden="true" /> New question</button>
            <button type="button" onClick={onUnauthorized} className="btn-secondary">Lock workspace</button>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-6 grid max-w-[1600px] gap-6 px-5 md:px-8 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className={`${draft ? 'hidden lg:block' : 'block'} overflow-hidden rounded-3xl bg-surface-raised shadow-[0_24px_60px_-44px_rgba(20,20,18,0.45)]`} aria-label="Question bank navigation">
          <FilterPanel filters={filters} searchDraft={searchDraft} setSearchDraft={setSearchDraft} outcomes={outcomes} subjects={subjects} onFilter={(key, value) => setFilters((current) => ({ ...current, [key]: value, ...(key === 'subject' ? { outcomeId: '' } : {}) }))} onSearch={(event) => { event.preventDefault(); setFilters((current) => ({ ...current, search: searchDraft.trim() })); }} />
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-3"><p className="text-xs font-bold text-text-muted">{questions.length} {questions.length === 1 ? 'question' : 'questions'}</p><button type="button" onClick={loadQuestions} disabled={loading} className="rounded-xl p-2 text-accent hover:bg-accent-soft disabled:opacity-40" aria-label="Refresh question bank"><ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /></button></div>
          <div className="max-h-[calc(100vh-25rem)] min-h-80 overflow-y-auto"><QuestionList questions={questions} loading={loading} error={listError} selectedId={currentId} onSelect={(question) => navigateWithGuard({ type: 'open', question })} onRetry={loadQuestions} /></div>
        </aside>

        <section className="min-w-0">
          {draft ? (
            <QuestionEditorForm draft={draft} setDraft={setDraft} outcomes={outcomes} originalSignature={originalSignature} errors={formErrors} notice={notice} saving={saving} lifecycleBusy={lifecycleBusy} humanReviewed={humanReviewed} setHumanReviewed={setHumanReviewed} history={history} historyLoading={historyLoading} onSave={saveDraft} onCancel={() => navigateWithGuard({ type: 'close' })} onTransition={requestLifecycle} onRefreshHistory={() => loadHistory(draft.id)} />
          ) : (
            <div className="grid min-h-[36rem] place-items-center rounded-3xl bg-surface-raised p-8 text-center shadow-[0_24px_60px_-44px_rgba(20,20,18,0.45)]">
              <div className="max-w-lg"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent"><AcademicCapIcon className="h-7 w-7" aria-hidden="true" /></span><h2 className="mt-5 text-3xl font-display font-extrabold text-text-primary">Build evidence students can trust.</h2><p className="mt-3 text-sm font-medium leading-relaxed text-text-muted">Choose a question to edit, or create a syllabus-mapped draft with a rubric, model answer, misconceptions, and source provenance.</p><button type="button" onClick={createQuestion} className="btn-primary mx-auto mt-6"><PlusIcon className="h-4 w-4" aria-hidden="true" /> Create question</button></div>
            </div>
          )}
        </section>
      </div>

      {pendingLifecycle && <ConfirmDialog status={pendingLifecycle} busy={lifecycleBusy} onCancel={() => setPendingLifecycle('')} onConfirm={() => performLifecycle(pendingLifecycle)} />}
      {pendingNavigation && <DiscardDialog onCancel={() => setPendingNavigation(null)} onDiscard={completePendingNavigation} />}
    </main>
  );
}
