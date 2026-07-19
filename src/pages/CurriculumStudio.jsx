import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowPathIcon,
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentCheckIcon,
  DocumentTextIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { extractPdfText } from '../lib/pdfExtract';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';

const REVIEW_LABELS = {
  outcome_boundary: 'Outcome structure',
  duplicate_statement: 'Possible duplicate',
  source_evidence: 'Source alignment',
  rubric_review: 'Rubric quality',
  source_verification: 'Source verification',
};

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

function ReviewDecision({ item, index, expanded, selectedOption, busy, onToggle, onSelect, onResolve, onReopen }) {
  const resolved = item.status === 'resolved';
  const options = Array.isArray(item.decisionOptions) ? item.decisionOptions : [];
  const chosen = resolved ? item.selectedOption : selectedOption;
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
          {resolved ? 'Resolved' : 'Decision needed'}
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

            <fieldset className="mt-6 grid gap-4 lg:grid-cols-2" disabled={resolved || busy}>
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
              {resolved ? (
                <button type="button" onClick={onReopen} disabled={busy} className="btn-secondary shrink-0">Reopen decision</button>
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

function ImportSubjectPack({ onCreated }) {
  const [mode, setMode] = useState('template');
  const [file, setFile] = useState(null);
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
    if (!file) return setError('Choose a syllabus PDF or text file.');
    setBusy(true); setError('');
    try {
      const extractedText = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
        ? await extractPdfText(file)
        : await file.text();
      const data = await api.importSubjectPack({
        ...form,
        extractedText,
        sourceName: file.name,
        sourceType: file.type || 'text/plain',
        sourceDocuments: [{
          id: `upload-${Date.now()}`,
          name: file.name,
          type: file.type || 'text/plain',
          url: form.sourceUrl || null,
          verified: Boolean(form.sourceUrl),
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
            <span className="mt-2 block text-sm font-medium leading-relaxed text-text-muted">Upload a text-based PDF or plain-text syllabus. Caplet detects coded outcome statements for review.</span>
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
              <span className="mt-3 block text-sm font-extrabold text-text-primary">{file?.name || 'Choose a syllabus PDF or TXT file'}</span>
              <span className="mt-1 block text-xs font-medium text-text-muted">PDF text extraction happens in your browser.</span>
              <input type="file" accept=".pdf,.txt,text/plain,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="sr-only" />
            </label>
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
  const canAuthor = ['instructor', 'admin'].includes(user?.role);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      if (packId) {
        const data = await api.getSubjectPack(packId);
        setState({ loading: false, error: '', pack: data.subjectPack, packs: [] });
      } else {
        const data = await api.getSubjectPacks();
        const packs = data.subjectPacks || [];
        if (packs.length === 1 && canAuthor) {
          navigate(`/curriculum-studio/${packs[0].id}`, { replace: true });
          return;
        }
        setState({ loading: false, error: '', pack: null, packs });
      }
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error.message || 'Could not load Curriculum Studio.' }));
    }
  }, [canAuthor, navigate, packId]);

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

  if (state.loading) return <main className="min-h-screen bg-surface-body py-32"><CapletLoader message="Reading subject-pack readiness…" /></main>;
  if (!packId && canAuthor && state.packs.length === 0) return <ImportSubjectPack onCreated={(created) => navigate(`/curriculum-studio/${created.id}`)} />;
  if (!packId && !canAuthor && state.packs.length === 0) {
    return <main className="min-h-screen bg-surface-body py-32"><div className="container-custom rounded-3xl bg-surface-raised p-8"><h1 className="font-display text-3xl font-extrabold text-text-primary">No published subject packs yet.</h1><p className="mt-3 font-medium text-text-muted">Your teacher will publish a pack here when it is ready for practice.</p></div></main>;
  }
  if (!packId && state.packs.length) {
    return (
      <main className="min-h-screen bg-surface-body py-28"><div className="container-custom">
        <span className="font-hand text-2xl text-accent">curriculum studio</span>
        <h1 className="mt-2 font-display text-6xl font-extrabold tracking-tight">Subject packs.</h1>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">{state.packs.map((item) => <Link key={item.id} to={`/curriculum-studio/${item.id}`} className="rounded-3xl bg-surface-raised p-7 shadow-[0_24px_50px_-38px_rgba(20,20,18,0.28)]"><p className="text-xs font-bold uppercase tracking-[0.13em] text-accent">{item.lifecycleStatus}</p><h2 className="mt-2 font-display text-2xl font-extrabold">{item.title}</h2><p className="mt-3 text-sm font-medium text-text-muted">{item.readiness?.decisions?.open || 0} decisions remaining</p></Link>)}</div>
      </div></main>
    );
  }
  if (!pack) return <main className="min-h-screen bg-surface-body py-32"><div className="container-custom rounded-2xl bg-surface-error p-6 font-bold text-text-error">{state.error || 'Subject pack not found.'}</div></main>;

  const readiness = pack.readiness || {};
  const published = pack.lifecycleStatus === 'published';
  const displayTitle = pack.title.replace(/^HSC\s+/i, '');
  return (
    <main className="min-h-screen bg-surface-body py-24 selection:bg-accent selection:text-white">
      <div className="container-custom max-w-[1380px]">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="font-hand text-xl text-accent">human judgement, where it matters</span>
            <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-text-primary md:text-5xl">
              {published ? `${displayTitle} is live` : `${displayTitle} is almost ready`}
            </h1>
            <p className="mt-4 max-w-3xl text-lg font-medium text-text-muted">
              {published ? 'Students can now build evidence against this versioned curriculum.' : 'Review and resolve the final items that need your judgement before publishing.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/curriculum-studio" className="btn-secondary">All subject packs</Link>
            {published && <Link to={pack.studentLinks?.diagnostic} className="btn-primary">Open student diagnostic <ArrowRightIcon className="h-4 w-4" /></Link>}
          </div>
        </header>

        {state.error && <div role="alert" className="mt-6 rounded-2xl bg-surface-error p-5 text-sm font-bold text-text-error">{state.error}</div>}
        {notice && <div role="status" aria-live="polite" className="mt-6 rounded-2xl bg-[color:var(--block-green)] p-5 text-sm font-bold text-[color:var(--mark-green)]">{notice}</div>}

        <div className="mt-9 grid gap-7 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section aria-labelledby="review-heading" className="overflow-hidden rounded-3xl border border-line-soft bg-surface-raised shadow-[0_24px_50px_-38px_rgba(20,20,18,0.28)]">
            <div className="flex flex-col gap-3 bg-[color:var(--block-amber)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
              <div>
                <h2 id="review-heading" className="font-display text-2xl font-extrabold text-text-primary">{openItems.length || 'No'} {openItems.length === 1 ? 'decision' : 'decisions'} before publishing</h2>
                <p className="mt-1 text-sm font-medium text-text-muted">Caplet has structured the pack. Your review is focused on these exceptions.</p>
              </div>
              <span className="w-fit rounded-full bg-surface-raised px-3 py-1.5 text-xs font-extrabold text-accent">{readiness.decisions?.resolved || 0} of {readiness.decisions?.total || 0} resolved</span>
            </div>
            {reviewItems.map((item, index) => (
              <ReviewDecision
                key={item.id}
                item={item}
                index={index}
                expanded={expandedId === item.id}
                selectedOption={selections[item.id] || ''}
                busy={busyId === item.id}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                onSelect={(optionId) => setSelections((current) => ({ ...current, [item.id]: optionId }))}
                onResolve={() => resolve(item)}
                onReopen={() => reopen(item)}
              />
            ))}
          </section>

          <aside aria-labelledby="readiness-heading" className="h-fit rounded-3xl border border-line-soft bg-surface-raised p-6 shadow-[0_24px_50px_-38px_rgba(20,20,18,0.28)] xl:sticky xl:top-24">
            <h2 id="readiness-heading" className="font-display text-2xl font-extrabold text-accent">Readiness</h2>
            <div className="mt-3">
              <Metric icon={CheckCircleIcon} label="Outcomes" ready={readiness.outcomes?.ready || 0} total={readiness.outcomes?.total || 0} detail={readiness.outcomes?.ready === readiness.outcomes?.total ? 'All outcomes ready' : `${(readiness.outcomes?.total || 0) - (readiness.outcomes?.ready || 0)} decisions pending`} tone={readiness.outcomes?.ready === readiness.outcomes?.total ? 'green' : 'amber'} />
              <Metric icon={DocumentTextIcon} label="Questions" ready={readiness.questions?.ready || 0} total={readiness.questions?.total || 0} detail={readiness.questions?.ready === readiness.questions?.total ? 'Question bank ready' : 'Source review pending'} tone={readiness.questions?.ready === readiness.questions?.total ? 'green' : 'amber'} />
              <Metric icon={SparklesIcon} label="Rubrics" ready={readiness.rubrics?.ready || 0} total={readiness.rubrics?.total || 0} detail={readiness.rubrics?.ready === readiness.rubrics?.total ? 'Rubrics ready' : 'Teacher review pending'} tone={readiness.rubrics?.ready === readiness.rubrics?.total ? 'green' : 'amber'} />
              <Metric icon={ShieldCheckIcon} label="Sources verified" ready={`${readiness.sources?.percent || 0}%`} total="" detail={`${readiness.sources?.verified || 0} of ${readiness.sources?.total || 0} sources`} tone={readiness.sources?.percent === 100 ? 'green' : 'amber'} />
            </div>
            <div className="mt-5 rounded-2xl bg-accent-soft p-4 text-sm font-semibold leading-relaxed text-accent">
              {published ? 'This subject pack is published and locked. Create a new version to make future changes.' : readiness.canPublish ? 'Every decision is resolved. This version is ready for students.' : 'Resolve the review queue to unlock publishing.'}
            </div>
            {published ? (
              <div className="mt-5 grid gap-3">
                <Link to={pack.studentLinks?.diagnostic} className="btn-primary w-full justify-center">Start diagnostic <ArrowRightIcon className="h-4 w-4" /></Link>
                <Link to={pack.studentLinks?.mastery} className="btn-secondary w-full justify-center">View mastery</Link>
              </div>
            ) : (
              <button type="button" onClick={publish} disabled={!readiness.canPublish || busyId === 'publish'} className="btn-primary mt-5 w-full justify-center disabled:cursor-not-allowed disabled:bg-surface-soft disabled:text-text-dim">
                {busyId === 'publish' ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : readiness.canPublish ? <BookOpenIcon className="h-4 w-4" /> : <LockClosedIcon className="h-4 w-4" />}
                Publish subject pack
              </button>
            )}
            {!published && !readiness.canPublish && <p className="mt-3 text-center text-xs font-semibold text-text-muted">Resolve all decisions to unlock publishing.</p>}
          </aside>
        </div>
      </div>
    </main>
  );
}
