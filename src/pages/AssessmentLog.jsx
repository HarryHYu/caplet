import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowTopRightOnSquareIcon,
  ChartBarIcon,
  ChevronDownIcon,
  DocumentArrowUpIcon,
  PencilSquareIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { InlineEmpty } from '../components/learning/LearningStates';
import api from '../services/api';
import useDialogFocus from '../lib/useDialogFocus';
import { useAssessmentLog } from '../lib/useAssessmentLog';
import { useMySubjects } from '../lib/useMySubjects';
import { extractSyllabusFile } from '../lib/pdfExtract';
import {
  deleteAssessmentAttachment,
  getAssessmentAttachment,
  saveAssessmentAttachment,
} from '../lib/assessmentAttachmentStore';

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const MAX_REPORT_FILE_SIZE = 10 * 1024 * 1024;
const YEAR_LEVELS = ['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12'];
const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const scorePercent = (entry) => entry.maxMarks > 0 ? Math.round((Number(entry.score) / Number(entry.maxMarks)) * 100) : null;
const formatAssessmentDate = (value, options = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!value) return 'Not supplied';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 'Not supplied' : date.toLocaleDateString('en-AU', options);
};
const normaliseYear = (value) => {
  const match = String(value || '').match(/(?:year\s*)?(7|8|9|10|11|12)/i);
  return match ? `Year ${match[1]}` : 'Year 11';
};

function EntryDialog({ entry, subjects, onCancel, onSave }) {
  const [form, setForm] = useState(entry || {
    id: makeId(), yearLevel: 'Year 11', term: 'Term 1', subject: subjects[0] || '', taskName: '', date: '',
    score: '', maxMarks: '', weighting: '', reflection: '', attachmentId: '', attachmentName: '', attachmentType: '', attachmentSize: 0,
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const dialogRef = useDialogFocus({ onDismiss: onCancel, dismissDisabled: saving });
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const chooseFile = (event) => {
    const next = event.target.files?.[0] || null;
    setError('');
    if (next && next.size > MAX_FILE_SIZE) { setFile(null); setError('Choose a PDF or image smaller than 15 MB.'); return; }
    setFile(next);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (Number(form.score) > Number(form.maxMarks)) return setError('Marks achieved cannot be higher than total marks.');
    if (!form.taskName.trim() || !form.date || !form.subject) return setError('Complete the task name, subject and date.');
    if (!form.maxMarks || Number(form.maxMarks) <= 0) return setError('Total marks must be greater than zero.');
    if (form.weighting === '' || Number(form.weighting) < 0 || Number(form.weighting) > 100) return setError('Weighting must be between 0 and 100%.');
    setSaving(true);
    try {
      const value = { ...form, taskName: form.taskName.trim(), reflection: form.reflection.trim() };
      if (file) {
        const attachmentId = form.attachmentId || makeId();
        await saveAssessmentAttachment(attachmentId, file);
        Object.assign(value, { attachmentId, attachmentName: file.name, attachmentType: file.type, attachmentSize: file.size });
      }
      await onSave(value);
    } catch (saveError) {
      setError(saveError.message || 'The attachment could not be saved.');
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" onMouseDown={(event) => !saving && event.target === event.currentTarget && onCancel()}>
      <section ref={dialogRef} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="log-entry-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-line-soft bg-surface-body p-6 shadow-pop">
        <div className="flex items-start justify-between gap-4"><div><h2 id="log-entry-title" className="font-display text-2xl font-extrabold">{entry ? 'Edit assessment result' : 'Log assessment result'}</h2><p className="mt-1 text-sm text-text-muted">Keep the result, evidence and next lesson together.</p></div><button type="button" disabled={saving} onClick={onCancel} aria-label="Close assessment result editor" className="grid h-10 w-10 place-items-center rounded-lg text-text-muted hover:bg-surface-soft"><XMarkIcon className="h-5 w-5" /></button></div>
        <form noValidate onSubmit={submit} className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold">School year<select data-initial-focus required value={normaliseYear(form.yearLevel)} onChange={update('yearLevel')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 outline-none focus:border-accent">{YEAR_LEVELS.map((year) => <option key={year}>{year}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Result term<select required value={form.term} onChange={update('term')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 outline-none focus:border-accent"><option>Term 1</option><option>Term 2</option><option>Term 3</option></select></label>
          <label className="grid gap-2 text-sm font-bold">Subject<select required value={form.subject} onChange={update('subject')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 outline-none focus:border-accent">{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-bold">Task name<input required value={form.taskName} onChange={update('taskName')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 outline-none focus:border-accent" placeholder="e.g. Macroeconomic policy essay" /></label>
          <label className="grid gap-2 text-sm font-bold">Date<input required type="date" value={form.date} onChange={update('date')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 outline-none focus:border-accent" /></label>
          <label className="grid gap-2 text-sm font-bold">Weighting (%)<input required type="number" min="0" max="100" step="0.1" value={form.weighting} onChange={update('weighting')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 outline-none focus:border-accent" placeholder="e.g. 25" /></label>
          <label className="grid gap-2 text-sm font-bold">Marks achieved<input required type="number" min="0" step="0.5" value={form.score} onChange={update('score')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 outline-none focus:border-accent" placeholder="e.g. 42" /></label>
          <label className="grid gap-2 text-sm font-bold">Total marks<input required type="number" min="0.5" step="0.5" value={form.maxMarks} onChange={update('maxMarks')} className="min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 outline-none focus:border-accent" placeholder="e.g. 50" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Reflection<textarea rows="5" value={form.reflection} onChange={update('reflection')} className="rounded-lg border border-line-soft bg-surface-raised px-3 py-3 font-medium leading-relaxed outline-none focus:border-accent" placeholder="What worked? Where did marks go? What will you do differently next time?" /></label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">Scanned task <span className="font-medium text-text-dim">Optional · PDF or image · 15 MB maximum</span><input type="file" accept="application/pdf,image/*" onChange={chooseFile} className="block min-h-11 rounded-lg border border-line-soft bg-surface-raised px-3 py-2 text-sm font-medium file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:font-bold file:text-accent" />{form.attachmentName && !file && <span className="font-medium text-text-muted">Current file: {form.attachmentName}</span>}</label>
          {error && <p role="alert" className="text-sm font-bold text-text-error sm:col-span-2">{error}</p>}
          <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" disabled={saving} onClick={onCancel} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save result'}</button></div>
        </form>
      </section>
    </div>
  );
}

function ReportImportDialog({ subjects, onCancel, onImport }) {
  const [file, setFile] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useDialogFocus({ onDismiss: onCancel, dismissDisabled: parsing });
  const analyse = async () => {
    setError('');
    if (!file) return setError('Choose a PDF, Word document or text file first.');
    if (file.size > MAX_REPORT_FILE_SIZE) return setError('Choose a report smaller than 10 MB.');
    setParsing(true);
    try {
      const extracted = await extractSyllabusFile(file);
      if (!extracted.text.trim()) throw new Error('No readable text was found. Try a text-based PDF or Word report.');
      const response = await api.parseAssessmentReport({
        text: extracted.text.slice(0, 100_000),
        fileName: file.name,
        subjects,
      });
      const next = (response.entries || []).map((entry) => ({
        ...entry,
        id: makeId(),
        yearLevel: normaliseYear(entry.yearLevel),
        term: ['Term 1', 'Term 2', 'Term 3'].includes(entry.term) ? entry.term : 'Term not supplied',
        importedFrom: file.name,
      }));
      if (!next.length) throw new Error('No assessment results were found in this report.');
      setSuggestions(next);
      setSelected(new Set(next.map((entry) => entry.id)));
    } catch (analysisError) {
      setError(analysisError.message || 'The report could not be analysed.');
    } finally {
      setParsing(false);
    }
  };
  const toggle = (id) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const importSelected = () => {
    const entries = suggestions.filter((entry) => selected.has(entry.id));
    if (!entries.length) return setError('Choose at least one result to add.');
    onImport(entries);
  };
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4" onMouseDown={(event) => !parsing && event.target === event.currentTarget && onCancel()}>
      <section ref={dialogRef} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="report-import-title" className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-line-soft bg-surface-body p-6 shadow-pop">
        <div className="flex items-start justify-between gap-4"><div><h2 id="report-import-title" className="font-display text-2xl font-extrabold">Import school report</h2><p className="mt-1 text-sm text-text-muted">AI finds assessment results and prepares them for your review.</p></div><button type="button" disabled={parsing} onClick={onCancel} aria-label="Close report importer" className="grid h-10 w-10 place-items-center rounded-lg text-text-muted hover:bg-surface-soft"><XMarkIcon className="h-5 w-5" /></button></div>
        {!suggestions.length ? <div className="mt-6">
          <label className="grid gap-2 text-sm font-bold">School report <span className="font-medium text-text-dim">PDF, DOCX or TXT · 10 MB maximum</span><input data-initial-focus type="file" accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,.pdf,.docx,.txt" onChange={(event) => { setFile(event.target.files?.[0] || null); setError(''); }} className="block min-h-12 rounded-xl border border-line-soft bg-surface-raised px-3 py-2 text-sm font-medium file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-2 file:font-bold file:text-accent" /></label>
          <p className="mt-3 text-xs leading-relaxed text-text-dim">The file stays on this device. Caplet sends extracted text to its AI service only after you choose Analyse, then asks you to review every suggested result.</p>
          {error && <p role="alert" className="mt-4 text-sm font-bold text-text-error">{error}</p>}
          <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onCancel} className="btn-secondary">Cancel</button><button type="button" disabled={parsing || !file} onClick={analyse} className="btn-primary"><SparklesIcon className="h-4 w-4" /> {parsing ? 'Analysing…' : 'Analyse report'}</button></div>
        </div> : <div className="mt-6">
          <div className="flex items-center justify-between gap-4"><p className="text-sm font-bold">Review {suggestions.length} suggested {suggestions.length === 1 ? 'result' : 'results'}</p><button type="button" onClick={() => { setSuggestions([]); setSelected(new Set()); }} className="text-sm font-bold text-accent">Choose another file</button></div>
          <div className="mt-4 divide-y divide-line-soft border-y border-line-soft">{suggestions.map((entry) => <label key={entry.id} className="flex cursor-pointer items-start gap-4 py-4"><input type="checkbox" checked={selected.has(entry.id)} onChange={() => toggle(entry.id)} className="mt-1 h-4 w-4 accent-[color:var(--accent)]" /><span className="min-w-0 flex-1"><strong className="block">{entry.taskName}</strong><span className="mt-1 block text-sm text-text-muted">{entry.subject} · {entry.yearLevel} · {entry.term} · {entry.score}/{entry.maxMarks} ({scorePercent(entry)}%)</span></span></label>)}</div>
          {error && <p role="alert" className="mt-4 text-sm font-bold text-text-error">{error}</p>}
          <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onCancel} className="btn-secondary">Cancel</button><button type="button" onClick={importSelected} className="btn-primary">Add {selected.size} {selected.size === 1 ? 'result' : 'results'}</button></div>
        </div>}
      </section>
    </div>
  );
}

export default function AssessmentLog() {
  const { mySubjects } = useMySubjects();
  const { entries, saveEntry, removeEntry } = useAssessmentLog();
  const [term, setTerm] = useState('All terms');
  const [year, setYear] = useState('All years');
  const [editing, setEditing] = useState(undefined);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState('');
  const subjects = mySubjects.length ? mySubjects : [...new Set(entries.map((entry) => entry.subject))];
  const visible = useMemo(() => entries.filter((entry) => (term === 'All terms' || entry.term === term) && (year === 'All years' || normaliseYear(entry.yearLevel) === year)).sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))), [entries, term, year]);
  const chartData = useMemo(() => [...visible].sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))).map((entry) => ({
    id: entry.id,
    label: entry.taskName.length > 18 ? `${entry.taskName.slice(0, 18)}…` : entry.taskName,
    task: entry.taskName,
    result: scorePercent(entry),
    date: entry.date ? formatAssessmentDate(entry.date, { day: 'numeric', month: 'short' }) : `${normaliseYear(entry.yearLevel).replace('Year ', 'Y')} · ${entry.term}`,
  })), [visible]);
  const average = visible.length ? Math.round(visible.reduce((sum, entry) => sum + scorePercent(entry), 0) / visible.length) : null;
  const totalWeight = visible.reduce((sum, entry) => sum + Number(entry.weighting || 0), 0);

  const openAttachment = async (entry) => {
    setNotice('');
    try {
      const file = await getAssessmentAttachment(entry.attachmentId);
      if (!file) return setNotice('That scan is no longer stored on this device.');
      const url = URL.createObjectURL(file);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) { setNotice(error.message || 'The scan could not be opened.'); }
  };
  const deleteEntry = async (entry) => {
    if (entry.attachmentId) try { await deleteAssessmentAttachment(entry.attachmentId); } catch { /* The log can still be removed. */ }
    removeEntry(entry.id);
  };

  return (
    <div className="min-h-screen bg-surface-body pb-24 pt-24 text-text-primary md:pt-28">
      <div className="container-custom max-w-6xl">
        <header className="minimal-page-header flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="minimal-page-title">Results</h1><p className="mt-3 max-w-2xl text-base text-text-muted">Treat each assessment like a project: record the result, keep the evidence and write down the next improvement.</p></div><div className="flex flex-wrap gap-3"><button type="button" onClick={() => setImporting(true)} disabled={!subjects.length} className="btn-secondary w-fit"><DocumentArrowUpIcon className="h-4 w-4" /> Import report</button><button type="button" onClick={() => setEditing(null)} disabled={!subjects.length} className="btn-primary w-fit"><PlusIcon className="h-4 w-4" /> Log result</button></div></header>

        {!subjects.length && <div className="mt-8 border-y border-line-soft py-7"><p className="font-bold">Choose a subject before logging a result.</p><Link to="/library" className="mt-3 inline-block text-sm font-bold text-accent">Choose subjects</Link></div>}

        <section className="mt-8 grid gap-px overflow-hidden rounded-xl border border-line-soft bg-line-soft sm:grid-cols-3" aria-label="Assessment result summary"><div className="bg-surface-raised p-5"><p className="text-xs font-bold text-text-muted">Results logged</p><p className="mt-2 font-display text-3xl font-extrabold">{visible.length}</p></div><div className="bg-surface-raised p-5"><p className="text-xs font-bold text-text-muted">Average result</p><p className="mt-2 font-display text-3xl font-extrabold">{average === null ? '—' : `${average}%`}</p></div><div className="bg-surface-raised p-5"><p className="text-xs font-bold text-text-muted">Weighting covered</p><p className="mt-2 font-display text-3xl font-extrabold">{totalWeight}%</p></div></section>

        <section className="mt-9" aria-labelledby="results-table-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><h2 id="results-table-heading" className="text-xl font-extrabold">Assessment history</h2><p className="mt-1 text-sm text-text-muted">Stored privately in this browser.</p></div>
            <div className="flex flex-wrap gap-3">
            <label className="grid gap-2 text-xs font-bold text-text-muted">Filter by year<span className="relative block min-w-36"><select value={year} onChange={(event) => setYear(event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-line-soft bg-surface-raised py-2 pl-4 pr-11 text-sm font-bold text-text-primary outline-none transition-[border-color,box-shadow,background-color] hover:border-text-dim focus:border-accent focus:ring-4 focus:ring-accent-soft"><option>All years</option>{YEAR_LEVELS.map((item) => <option key={item}>{item}</option>)}</select><ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" /></span></label>
            <label className="grid gap-2 text-xs font-bold text-text-muted">Filter by term<span className="relative block min-w-40">
                <select value={term} onChange={(event) => setTerm(event.target.value)} className="min-h-11 w-full appearance-none rounded-xl border border-line-soft bg-surface-raised py-2 pl-4 pr-11 text-sm font-bold text-text-primary shadow-card outline-none transition-[border-color,box-shadow,background-color] hover:border-text-dim focus:border-accent focus:ring-4 focus:ring-accent-soft">
                  <option>All terms</option><option>Term 1</option><option>Term 2</option><option>Term 3</option>
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
              </span>
            </label>
            </div>
          </div>
          <p aria-live="polite" className="mt-3 text-sm font-bold text-text-error">{notice}</p>
          {visible.length ? <div className="mt-4 overflow-x-auto border-y border-line-soft"><table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="text-xs text-text-muted"><th className="px-3 py-3">Task</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Result</th><th className="px-3 py-3">Weight</th><th className="px-3 py-3">Reflection</th><th className="px-3 py-3">Evidence</th><th className="px-3 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-line-soft">{visible.map((entry) => <tr key={entry.id} className="align-top"><td className="px-3 py-5"><strong className="block text-text-primary">{entry.taskName}</strong><span className="mt-1 block text-xs text-text-muted">{entry.subject} · {normaliseYear(entry.yearLevel)} · {entry.term}</span></td><td className="whitespace-nowrap px-3 py-5 text-text-muted">{formatAssessmentDate(entry.date)}</td><td className="px-3 py-5"><strong>{entry.score}/{entry.maxMarks}</strong><span className="mt-1 block text-xs text-accent">{scorePercent(entry)}%</span></td><td className="px-3 py-5">{entry.weighting}%</td><td className="max-w-xs px-3 py-5 text-text-muted">{entry.reflection || '—'}</td><td className="px-3 py-5">{entry.attachmentId ? <button type="button" onClick={() => openAttachment(entry)} className="inline-flex items-center gap-1.5 font-bold text-accent hover:text-accent-strong"><DocumentArrowUpIcon className="h-4 w-4" /> Open scan <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" /></button> : entry.importedFrom ? <span className="text-xs font-bold text-text-muted">Imported report</span> : <span className="text-text-dim">—</span>}</td><td className="px-3 py-4"><div className="flex gap-1"><button type="button" onClick={() => setEditing(entry)} aria-label={`Edit ${entry.taskName}`} className="grid h-10 w-10 place-items-center rounded-lg text-text-muted hover:bg-surface-soft"><PencilSquareIcon className="h-4 w-4" /></button><button type="button" onClick={() => deleteEntry(entry)} aria-label={`Remove ${entry.taskName}`} className="grid h-10 w-10 place-items-center rounded-lg text-text-muted hover:bg-surface-soft hover:text-text-error"><TrashIcon className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div> : <InlineEmpty className="mt-4" icon={ChartBarIcon} title="No results match these filters." message="Try another year or term, or add your next result." action={<button type="button" onClick={() => setEditing(null)} className="btn-secondary"><PlusIcon className="h-4 w-4" aria-hidden="true" /> Add a result</button>} />}
        </section>

        <section className="mt-12 border-t border-line-soft pt-10" aria-labelledby="results-insights-heading">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent"><ChartBarIcon className="h-5 w-5" /></span><div><h2 id="results-insights-heading" className="text-xl font-extrabold">Result trends</h2><p className="mt-1 text-sm text-text-muted">Compare assessments and track change over time.</p></div></div>
          {chartData.length ? <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <article className="rounded-xl border border-line-soft bg-surface-raised p-5"><h3 className="font-bold">Assessment comparison</h3><div className="mt-5 h-72" aria-label="Bar chart comparing assessment results"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 36 }}><CartesianGrid stroke="var(--line-soft)" vertical={false} /><XAxis dataKey="label" stroke="var(--text-dim)" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" interval={0} /><YAxis domain={[0, 100]} stroke="var(--text-dim)" tick={{ fontSize: 11 }} unit="%" /><Tooltip formatter={(value) => [`${value}%`, 'Result']} labelFormatter={(_, payload) => payload?.[0]?.payload?.task || ''} contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--line-soft)', borderRadius: 10 }} /><Bar dataKey="result" fill="var(--accent)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></article>
            <article className="rounded-xl border border-line-soft bg-surface-raised p-5"><h3 className="font-bold">Academic growth</h3><div className="mt-5 h-72" aria-label="Line chart showing assessment results over time"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 8, right: 14, left: -18, bottom: 12 }}><CartesianGrid stroke="var(--line-soft)" vertical={false} /><XAxis dataKey="date" stroke="var(--text-dim)" tick={{ fontSize: 11 }} /><YAxis domain={[0, 100]} stroke="var(--text-dim)" tick={{ fontSize: 11 }} unit="%" /><Tooltip formatter={(value) => [`${value}%`, 'Result']} labelFormatter={(_, payload) => payload?.[0]?.payload?.task || ''} contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--line-soft)', borderRadius: 10 }} /><Line type="monotone" dataKey="result" stroke="var(--accent)" strokeWidth={3} dot={{ r: 4, fill: 'var(--surface-raised)', strokeWidth: 3 }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer></div></article>
          </div> : <InlineEmpty className="mt-6" icon={ChartBarIcon} title="Your charts will appear after you log a result." message="Add marks manually or import a school report." action={<button type="button" onClick={() => setEditing(null)} className="btn-secondary"><PlusIcon className="h-4 w-4" aria-hidden="true" /> Add a result</button>} />}
        </section>
      </div>
      {editing !== undefined && <EntryDialog entry={editing} subjects={subjects} onCancel={() => setEditing(undefined)} onSave={(value) => { saveEntry(value); setEditing(undefined); }} />}
      {importing && <ReportImportDialog subjects={subjects} onCancel={() => setImporting(false)} onImport={(values) => { values.forEach((value) => saveEntry(value)); setNotice(`${values.length} ${values.length === 1 ? 'result was' : 'results were'} added from your report.`); setImporting(false); }} />}
    </div>
  );
}
