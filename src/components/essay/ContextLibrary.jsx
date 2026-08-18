import { useEffect, useRef, useState } from 'react';
import {
    ArrowUpTrayIcon,
    DocumentTextIcon,
    PaperClipIcon,
    PlusIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { extractPdfText } from '../../lib/pdfExtract';
import { MAX_CONTEXT_DOCS, MAX_DOC_CHARS, cleanExtractedText, wordsIn } from '../../lib/essayContext';

/**
 * The essay's source material: marker notes, quote banks, historical context,
 * class analysis, annotated PDFs. These are never mixed into the essay text —
 * they are what the assistant reads from when answering, and what the student
 * keeps beside the essay while working.
 */

export function ContextDocRow({ doc, onDelete, busy }) {
    return (
        <li className="flex items-start justify-between gap-3 rounded-xl border border-line-soft bg-surface-body p-3">
            <div className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                    {doc.kind === 'pdf' ? <PaperClipIcon className="h-3.5 w-3.5" /> : <DocumentTextIcon className="h-3.5 w-3.5" />}
                </span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-text-primary">{doc.title}</p>
                    {doc.preview && <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-text-dim">{doc.preview}</p>}
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-text-dim">
                        {doc.kind === 'pdf' ? 'PDF' : 'Notes'} · {Number(doc.chars || 0).toLocaleString()} characters
                    </p>
                </div>
            </div>
            {onDelete && (
                <button type="button" aria-label={`Remove ${doc.title}`} disabled={busy} onClick={() => onDelete(doc.id)}
                    className="shrink-0 rounded-lg p-1.5 text-text-dim transition-colors hover:bg-surface-soft hover:text-text-error disabled:opacity-40">
                    <TrashIcon className="h-4 w-4" />
                </button>
            )}
        </li>
    );
}

/**
 * Add-source form. PDFs are attached as named documents — their text is read
 * in the browser and kept behind the file's name, never pasted as a wall of
 * raw text for the student to clean up.
 */
export function AddContextForm({ onAdd, busy, disabled, disabledReason }) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [kind, setKind] = useState('text');
    const [fileName, setFileName] = useState('');
    const [pdfBusy, setPdfBusy] = useState(false);
    const [error, setError] = useState(null);
    const titleRef = useRef(null);

    useEffect(() => { if (open) titleRef.current?.focus(); }, [open]);

    const reset = () => {
        setTitle(''); setContent(''); setKind('text'); setFileName(''); setError(null);
    };

    const onPdf = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setError(null);
        setPdfBusy(true);
        try {
            const extracted = cleanExtractedText(await extractPdfText(file));
            if (!extracted) { setError('No readable text in that PDF — try pasting instead.'); return; }
            if (extracted.length > MAX_DOC_CHARS) {
                setError(`That PDF is ${extracted.length.toLocaleString()} characters — the limit is ${MAX_DOC_CHARS.toLocaleString()}.`);
                return;
            }
            setContent(extracted);
            setKind('pdf');
            setFileName(file.name);
            if (!title.trim()) setTitle(file.name.replace(/\.pdf$/i, ''));
        } catch {
            setError('Could not read that PDF. Try pasting the text instead.');
        } finally {
            setPdfBusy(false);
        }
    };

    const submit = async () => {
        setError(null);
        if (!title.trim()) return setError('Give this source a name.');
        if (!content.trim()) return setError('Attach a PDF or paste some text.');
        try {
            await onAdd({ title: title.trim(), kind, content });
            reset();
            setOpen(false);
        } catch (e) {
            setError(e?.message || 'Could not save that source.');
        }
    };

    if (!open) {
        return (
            <div>
                <button type="button" disabled={disabled} onClick={() => setOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-dashed border-line-strong px-4 py-2.5 text-sm font-bold text-text-dim transition-colors hover:border-accent hover:text-accent disabled:opacity-40">
                    <PlusIcon className="h-4 w-4" /> Add source
                </button>
                {disabled && disabledReason && <p className="mt-2 text-xs text-text-dim">{disabledReason}</p>}
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-line-soft bg-surface-body p-4">
            <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Source name — e.g. Marker feedback, Quote bank, Context notes"
                aria-label="Source name"
                className="mb-3 w-full rounded-xl border border-line-soft bg-surface-raised px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent"
            />
            {kind === 'pdf' && fileName ? (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-line-soft bg-surface-raised px-3 py-2.5">
                    <span className="inline-flex min-w-0 items-center gap-2 text-sm">
                        <PaperClipIcon className="h-4 w-4 shrink-0 text-accent" />
                        <span className="truncate font-medium text-text-primary">{fileName}</span>
                        <span className="shrink-0 text-xs text-text-dim">{wordsIn(content).toLocaleString()} words read</span>
                    </span>
                    <button type="button" onClick={() => { setContent(''); setKind('text'); setFileName(''); }}
                        className="shrink-0 text-xs font-bold text-text-dim hover:text-text-primary">Remove</button>
                </div>
            ) : (
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    placeholder="Paste analysis, marker notes, quotes, historical context…"
                    aria-label="Source text"
                    className="mb-3 w-full resize-y rounded-xl border border-line-soft bg-surface-raised px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-accent"
                />
            )}
            {error && <p role="alert" className="mb-3 text-sm font-medium text-text-error">{error}</p>}
            <div className="flex flex-wrap items-center gap-3">
                {kind !== 'pdf' && (
                    <label className="btn-secondary inline-flex cursor-pointer items-center gap-2">
                        <ArrowUpTrayIcon className="h-4 w-4" />
                        {pdfBusy ? 'Reading PDF…' : 'Attach PDF'}
                        <input type="file" accept="application/pdf" className="hidden" onChange={onPdf} disabled={pdfBusy} />
                    </label>
                )}
                <button type="button" onClick={submit} disabled={busy || pdfBusy}
                    className="btn-primary inline-flex items-center gap-2 disabled:opacity-40">
                    {busy ? 'Saving…' : 'Add to context'}
                </button>
                <button type="button" onClick={() => { reset(); setOpen(false); }}
                    className="text-sm font-semibold text-text-dim transition-colors hover:text-text-primary">Cancel</button>
            </div>
        </div>
    );
}

export default function ContextLibrary({ docs, onAdd, onDelete, busy, loading }) {
    const totalChars = (docs || []).reduce((sum, d) => sum + Number(d.chars || 0), 0);
    const full = (docs || []).length >= MAX_CONTEXT_DOCS;

    return (
        <div>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="font-display text-xl font-extrabold tracking-tight text-text-primary">Context library</h2>
                    <p className="mt-1 max-w-xl text-sm text-text-muted">
                        Everything the assistant reads from: marker feedback, quote banks, historical context, class analysis.
                        Kept beside your essay — never mixed into it.
                    </p>
                </div>
                <span className="text-xs font-bold text-text-dim">
                    {(docs || []).length}/{MAX_CONTEXT_DOCS} sources · {totalChars.toLocaleString()} characters
                </span>
            </div>

            {loading ? (
                <p className="text-sm text-text-dim">Loading sources…</p>
            ) : (docs || []).length === 0 ? (
                <div className="mb-5 rounded-2xl border border-dashed border-line-strong p-8 text-center">
                    <DocumentTextIcon className="mx-auto mb-3 h-7 w-7 text-text-dim" />
                    <p className="text-sm font-bold text-text-primary">No sources yet.</p>
                    <p className="mx-auto mt-1 max-w-md text-sm text-text-dim">
                        Add your marker&apos;s feedback, the quotes you might use, background on the text — anything you want the
                        assistant to reason from.
                    </p>
                </div>
            ) : (
                <ul className="mb-5 space-y-2">
                    {docs.map((doc) => <ContextDocRow key={doc.id} doc={doc} onDelete={onDelete} busy={busy} />)}
                </ul>
            )}

            <AddContextForm
                onAdd={onAdd}
                busy={busy}
                disabled={full}
                disabledReason={full ? `You have reached ${MAX_CONTEXT_DOCS} sources — remove one to add another.` : null}
            />
        </div>
    );
}
