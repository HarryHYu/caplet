import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
    ChatBubbleLeftEllipsisIcon,
    PencilSquareIcon,
    PlusIcon,
    SparklesIcon,
    TrashIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { findQuoteSpans } from '../../lib/essaySlides';

/**
 * The reading surface: the essay exactly as written, with a Google-Docs-style
 * annotation layer. Quotes are highlighted, the topic sentence is tinted, and
 * every note lives in the margin beside the paragraph it belongs to.
 *
 * Notes attach at two levels:
 *   - selection level — highlight any words, then "Add note"
 *   - paragraph level — the ✚ beside a paragraph, or an AI explanation
 * The essay text itself is never editable here (that is the Edit tab); this
 * view only ever adds a layer on top of it.
 */

const noteAccent = (annotation) => (annotation.kind === 'explanation'
    ? 'border-l-violet-400 dark:border-l-violet-500/70'
    : annotation.source === 'ai'
        ? 'border-l-accent'
        : 'border-l-amber-400');

function NoteCard({ annotation, active, onSelect, onDelete, onEdit }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(annotation.note);

    useEffect(() => { setDraft(annotation.note); }, [annotation.note]);

    const label = annotation.kind === 'explanation'
        ? 'Explanation'
        : annotation.source === 'ai' ? 'From the assistant' : 'Your note';

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onSelect?.(annotation.id)}
            onKeyDown={(e) => { if (e.key === 'Enter') onSelect?.(annotation.id); }}
            className={`w-full rounded-xl border border-line-soft border-l-[3px] bg-surface-raised p-3 text-left transition-shadow ${noteAccent(annotation)} ${
                active ? 'shadow-[0_10px_28px_-18px_rgba(20,20,18,0.5)] ring-1 ring-accent/40' : 'hover:shadow-[0_10px_28px_-22px_rgba(20,20,18,0.4)]'
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">{label}</span>
                <div className="flex items-center gap-1 shrink-0">
                    <button type="button" aria-label="Edit note" onClick={(e) => { e.stopPropagation(); setEditing((v) => !v); }}
                        className="rounded p-1 text-text-dim hover:bg-surface-soft hover:text-text-primary transition-colors">
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" aria-label="Delete note" onClick={(e) => { e.stopPropagation(); onDelete?.(annotation.id); }}
                        className="rounded p-1 text-text-dim hover:bg-surface-soft hover:text-rose-500 transition-colors">
                        <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
            {annotation.anchor && (
                <p className="mt-1.5 border-l-2 border-line-strong pl-2 font-serif text-[11px] italic leading-snug text-text-dim line-clamp-2">
                    “{annotation.anchor}”
                </p>
            )}
            {editing ? (
                <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={4}
                        aria-label="Edit note text"
                        className="mt-2 w-full rounded-lg border border-line-soft bg-surface-body px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
                    />
                    <div className="mt-1.5 flex items-center gap-2">
                        <button type="button" onClick={() => { onEdit?.(annotation.id, draft); setEditing(false); }}
                            className="rounded-lg bg-accent px-2.5 py-1 text-[11px] font-bold text-white">Save</button>
                        <button type="button" onClick={() => { setDraft(annotation.note); setEditing(false); }}
                            className="text-[11px] font-semibold text-text-dim hover:text-text-primary">Cancel</button>
                    </div>
                </div>
            ) : annotation.source === 'ai' ? (
                /* The assistant writes markdown — render it rather than show
                   raw asterisks. Hand-written notes keep their exact breaks. */
                <div className="prose-chat mt-1.5 !text-xs">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{annotation.note}</ReactMarkdown>
                </div>
            ) : (
                <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-text-primary">{annotation.note}</p>
            )}
        </div>
    );
}

function NoteComposer({ anchor, onCancel, onSave, onAskAI, onFix, initialKind = 'note' }) {
    const [note, setNote] = useState('');
    // Paragraph-level jottings can be saved either as a note or as THIS
    // paragraph's explanation — the same slot the assistant writes into, so a
    // hand-written explanation is a first-class alternative to generating one.
    // A SELECTION composer instead toggles between a note and "Fix with AI":
    // complain about the selected words and the assistant drafts a drop-in
    // replacement (applied only after an explicit Accept).
    const [kind, setKind] = useState(anchor ? 'note' : initialKind);
    const [busy, setBusy] = useState(false);
    const ref = useRef(null);
    useEffect(() => { ref.current?.focus(); }, []);

    const isExplanation = kind === 'explanation';
    const isFix = kind === 'fix';

    const submit = async () => {
        const trimmed = note.trim();
        if (!trimmed || busy) return;
        if (isFix) {
            setBusy(true);
            try {
                await onFix(trimmed);
            } finally {
                setBusy(false);
            }
            return;
        }
        onSave(trimmed, kind);
    };

    return (
        <div className="rounded-xl border border-accent/50 bg-surface-raised p-3 shadow-[0_10px_28px_-18px_rgba(20,20,18,0.5)]">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
                    {isFix ? 'Fix with AI' : isExplanation ? 'Your explanation' : 'New note'}
                </span>
                <button type="button" aria-label="Cancel note" onClick={onCancel}
                    className="rounded p-1 text-text-dim hover:text-text-primary">
                    <XMarkIcon className="h-3.5 w-3.5" />
                </button>
            </div>
            {!anchor && (
                <div role="group" aria-label="Note type" className="mt-2 flex items-center gap-1 rounded-lg border border-line-soft p-0.5">
                    {[
                        { key: 'note', label: 'Note' },
                        { key: 'explanation', label: 'Explanation' },
                    ].map((opt) => (
                        <button
                            key={opt.key}
                            type="button"
                            aria-pressed={kind === opt.key}
                            onClick={() => setKind(opt.key)}
                            className={`flex-1 rounded-md px-2 py-1 text-[10px] font-bold transition-colors ${
                                kind === opt.key ? 'bg-accent text-white' : 'text-text-dim hover:text-text-primary'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
            {anchor && onFix && (
                <div role="group" aria-label="Selection action" className="mt-2 flex items-center gap-1 rounded-lg border border-line-soft p-0.5">
                    {[
                        { key: 'note', label: 'Note' },
                        { key: 'fix', label: 'Fix with AI' },
                    ].map((opt) => (
                        <button
                            key={opt.key}
                            type="button"
                            aria-pressed={kind === opt.key}
                            onClick={() => setKind(opt.key)}
                            className={`flex-1 rounded-md px-2 py-1 text-[10px] font-bold transition-colors ${
                                kind === opt.key ? 'bg-accent text-white' : 'text-text-dim hover:text-text-primary'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
            {anchor && (
                <p className="mt-1.5 border-l-2 border-accent/60 pl-2 font-serif text-[11px] italic leading-snug text-text-dim line-clamp-3">
                    “{anchor}”
                </p>
            )}
            <textarea
                ref={ref}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder={anchor
                    ? isFix
                        ? 'What bothers you about it? e.g. I don’t want this word — find a better one.'
                        : 'What matters about this bit?'
                    : isExplanation
                        ? 'In your own words: what does this paragraph argue, and how?'
                        : 'A note for this paragraph…'}
                aria-label={isFix ? 'Fix instruction' : isExplanation ? 'Explanation text' : 'Note text'}
                className="mt-2 w-full rounded-lg border border-line-soft bg-surface-body px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
                onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(); }}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" disabled={!note.trim() || busy} onClick={submit}
                    className="rounded-lg bg-accent px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-40">
                    {isFix ? (busy ? 'Drafting…' : 'Draft a fix') : isExplanation ? 'Save explanation' : 'Save note'}
                </button>
                {onAskAI && !isFix && (
                    <button type="button" onClick={onAskAI}
                        className="inline-flex items-center gap-1 rounded-lg border border-line-soft px-2.5 py-1 text-[11px] font-bold text-text-dim hover:border-accent hover:text-accent transition-colors">
                        <SparklesIcon className="h-3 w-3" /> Ask the assistant
                    </button>
                )}
            </div>
        </div>
    );
}

/**
 * A drafted fix waiting on the student's verdict: the selected words struck
 * out, the drop-in replacement beneath them, and an explicit Accept/Discard —
 * nothing touches the essay until Accept.
 */
function ProposalCard({ proposal, applying, onAccept, onDiscard }) {
    return (
        <div className="rounded-xl border border-emerald-400/60 bg-surface-raised p-3 shadow-[0_10px_28px_-18px_rgba(20,20,18,0.5)]">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Proposed fix</span>
                <button type="button" aria-label="Discard fix" onClick={onDiscard} disabled={applying}
                    className="rounded p-1 text-text-dim hover:text-text-primary disabled:opacity-40">
                    <XMarkIcon className="h-3.5 w-3.5" />
                </button>
            </div>
            <p className="mt-1.5 font-serif text-xs leading-snug text-text-dim line-through decoration-rose-400/70">
                {proposal.anchor}
            </p>
            <p className="mt-1 rounded-lg bg-emerald-100/70 px-2 py-1.5 font-serif text-xs leading-snug text-text-primary dark:bg-emerald-500/15">
                {proposal.replacement}
            </p>
            {proposal.rationale && (
                <p className="mt-1.5 text-[11px] italic leading-snug text-text-dim">{proposal.rationale}</p>
            )}
            <div className="mt-2 flex items-center gap-2">
                <button type="button" onClick={onAccept} disabled={applying}
                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white disabled:opacity-40">
                    {applying ? 'Applying…' : 'Accept'}
                </button>
                <button type="button" onClick={onDiscard} disabled={applying}
                    className="text-[11px] font-semibold text-text-dim hover:text-text-primary disabled:opacity-40">
                    Discard
                </button>
            </div>
        </div>
    );
}

/** Renders one paragraph with quote/topic tinting and selection-note support. */
function ParagraphBlock({
    paragraph, index, annotations, activeId, onSelectNote,
    onStartNote, onSaveNote, onDeleteNote, onEditNote, composer, onCancelComposer, onAskAI, onFix,
    onExplainOne, explainingIndex, proposal, applyingFix, onAcceptFix, onDiscardFix,
}) {
    const textRef = useRef(null);
    const text = String(paragraph.text || '');

    const segments = useMemo(() => {
        const quoteSpans = findQuoteSpans(text);
        const topic = String(paragraph.topicSentence || '');
        const topicStart = topic ? text.indexOf(topic) : -1;
        const topicEnd = topicStart >= 0 ? topicStart + topic.length : -1;
        // Anchored notes tint their span so a marginal note is traceable to the
        // exact words it is about.
        const anchors = annotations
            .filter((a) => a.anchor)
            .map((a) => {
                const start = text.indexOf(a.anchor);
                return start >= 0 ? { start, end: start + a.anchor.length, id: a.id } : null;
            })
            .filter(Boolean);
        // A pending fix strikes through exactly the words it would replace.
        const fixStart = proposal ? text.indexOf(proposal.anchor) : -1;
        const fixEnd = fixStart >= 0 ? fixStart + proposal.anchor.length : -1;

        const typeAt = (i) => {
            if (fixStart >= 0 && i >= fixStart && i < fixEnd) return 'fix';
            const anchor = anchors.find((a) => i >= a.start && i < a.end);
            if (anchor) return `anchor:${anchor.id}`;
            if (quoteSpans.some((s) => i >= s.start && i < s.end)) return 'quote';
            if (topicStart >= 0 && i >= topicStart && i < topicEnd) return 'topic';
            return 'plain';
        };

        const out = [];
        if (!text) return out;
        let runStart = 0;
        let runType = typeAt(0);
        for (let i = 1; i <= text.length; i += 1) {
            const type = i < text.length ? typeAt(i) : null;
            if (type !== runType) {
                out.push({ text: text.slice(runStart, i), type: runType });
                runStart = i;
                runType = type;
            }
        }
        return out;
    }, [text, paragraph.topicSentence, annotations, proposal]);

    const captureSelection = () => {
        const selection = typeof window !== 'undefined' ? window.getSelection() : null;
        if (!selection || selection.isCollapsed) return;
        const raw = selection.toString().trim();
        if (raw.length < 2) return;
        if (!textRef.current || !textRef.current.contains(selection.anchorNode)) return;
        // Anchors must be verbatim substrings — that is what lets the note be
        // re-attached on every later render.
        if (!text.includes(raw)) return;
        onStartNote(index, raw);
    };

    const hasExplanation = annotations.some((a) => a.kind === 'explanation');

    return (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
            <div className="group relative">
                <div className="absolute -left-9 top-1 hidden lg:flex flex-col items-center gap-1">
                    <span className="grid h-6 w-6 place-items-center rounded-full border border-line-soft bg-surface-raised text-[10px] font-bold text-text-dim">
                        {index + 1}
                    </span>
                    <button
                        type="button"
                        aria-label={`Add a note to paragraph ${index + 1}`}
                        title="Add a paragraph note"
                        onClick={() => onStartNote(index, '', 'note')}
                        className="grid h-6 w-6 place-items-center rounded-full border border-line-soft bg-surface-raised text-text-dim opacity-0 transition-opacity hover:border-accent hover:text-accent focus:opacity-100 group-hover:opacity-100"
                    >
                        <PlusIcon className="h-3.5 w-3.5" />
                    </button>
                </div>

                <p
                    ref={textRef}
                    onMouseUp={captureSelection}
                    onTouchEnd={captureSelection}
                    className="font-serif text-base leading-relaxed text-text-primary lg:text-[17px]"
                >
                    {segments.map((seg, i) => {
                        if (seg.type === 'fix') {
                            return <span key={i} className="rounded-sm bg-rose-200/70 px-0.5 line-through decoration-rose-500/60 dark:bg-rose-500/25">{seg.text}</span>;
                        }
                        if (seg.type === 'quote') {
                            return <span key={i} className="rounded-sm bg-emerald-200 px-0.5 dark:bg-emerald-500/30">{seg.text}</span>;
                        }
                        if (seg.type === 'topic') {
                            return <span key={i} className="rounded-sm bg-amber-200/70 px-0.5 dark:bg-amber-500/25">{seg.text}</span>;
                        }
                        if (typeof seg.type === 'string' && seg.type.startsWith('anchor:')) {
                            const id = seg.type.slice(7);
                            return (
                                <span key={i}
                                    onClick={() => onSelectNote(id)}
                                    className={`cursor-pointer rounded-sm px-0.5 underline decoration-dotted underline-offset-2 transition-colors ${
                                        activeId === id ? 'bg-accent/30' : 'bg-accent/10 hover:bg-accent/20'
                                    }`}>
                                    {seg.text}
                                </span>
                            );
                        }
                        return <span key={i}>{seg.text}</span>;
                    })}
                </p>

                <div className="mt-2 flex items-center gap-3 lg:hidden">
                    <button type="button" onClick={() => onStartNote(index, '', 'note')}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-text-dim hover:text-accent">
                        <PlusIcon className="h-3 w-3" /> Note
                    </button>
                    <button type="button" onClick={() => onStartNote(index, '', 'explanation')}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-text-dim hover:text-violet-500">
                        <PlusIcon className="h-3 w-3" /> Explain
                    </button>
                    <span className="text-[11px] text-text-dim">Select text to note a phrase</span>
                </div>
            </div>

            {/* Margin — every note for this paragraph, beside its opening. */}
            <div className="space-y-2 lg:pt-1">
                {(paragraph.heading || (paragraph.notes || []).length > 0) && (
                    <div className="rounded-xl border border-dashed border-line-strong p-3" title="Your note — not part of the exam prose">
                        {paragraph.heading && (
                            <p className="text-[11px] font-bold text-text-dim">{paragraph.heading}</p>
                        )}
                        {(paragraph.notes || []).map((n, i) => (
                            <p key={i} className="mt-1 text-[11px] italic leading-snug text-text-dim">✎ {n}</p>
                        ))}
                    </div>
                )}
                {composer && (
                    <NoteComposer
                        anchor={composer.anchor}
                        onCancel={onCancelComposer}
                        initialKind={composer.kind || 'note'}
                        onSave={(note, kind) => onSaveNote(index, composer.anchor, note, kind)}
                        onAskAI={onAskAI ? () => onAskAI(index, composer.anchor) : undefined}
                        onFix={onFix && composer.anchor ? (instruction) => onFix(index, composer.anchor, instruction) : undefined}
                    />
                )}
                {proposal && (
                    <ProposalCard
                        proposal={proposal}
                        applying={applyingFix}
                        onAccept={onAcceptFix}
                        onDiscard={onDiscardFix}
                    />
                )}
                {annotations.map((a) => (
                    <NoteCard
                        key={a.id}
                        annotation={a}
                        active={activeId === a.id}
                        onSelect={onSelectNote}
                        onDelete={onDeleteNote}
                        onEdit={onEditNote}
                    />
                ))}
                {!composer && (
                    <div className="hidden gap-2 lg:flex">
                        <button type="button" onClick={() => onStartNote(index, '', 'note')}
                            className="flex-1 rounded-xl border border-dashed border-line-soft px-2.5 py-2 text-left text-[11px] font-medium text-text-dim transition-colors hover:border-accent hover:text-accent">
                            + Note
                        </button>
                        {!hasExplanation && (
                            <button type="button" onClick={() => onStartNote(index, '', 'explanation')}
                                className="flex-1 rounded-xl border border-dashed border-line-soft px-2.5 py-2 text-left text-[11px] font-medium text-text-dim transition-colors hover:border-violet-400 hover:text-violet-500">
                                + Explain
                            </button>
                        )}
                        {onExplainOne && (
                            <button type="button" onClick={() => onExplainOne(index)} disabled={explainingIndex === index}
                                aria-label={`Explain paragraph ${index + 1} with AI`}
                                title="Let the assistant explain this paragraph"
                                className="grid h-[34px] w-9 shrink-0 place-items-center rounded-xl border border-dashed border-line-soft text-text-dim transition-colors hover:border-accent hover:text-accent disabled:opacity-40">
                                <SparklesIcon className={`h-3.5 w-3.5 ${explainingIndex === index ? 'animate-pulse' : ''}`} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AnnotatedDocument({
    essay,
    annotations,
    onAdd,
    onUpdate,
    onDelete,
    onExplain,
    explaining,
    onAskAI,
    onExplainOne,
    explainingIndex,
    onRequestFix,
    proposal,
    applyingFix,
    onAcceptFix,
    onDiscardFix,
}) {
    const structure = essay?.parsedStructure || {};
    const paragraphs = structure.bodyParagraphs || [];
    const [activeId, setActiveId] = useState(null);
    const [composer, setComposer] = useState(null); // { paragraphIndex, anchor }

    const byParagraph = useMemo(() => {
        const map = new Map();
        (annotations || []).forEach((a) => {
            const list = map.get(a.paragraphIndex) || [];
            list.push(a);
            map.set(a.paragraphIndex, list);
        });
        return map;
    }, [annotations]);

    const startNote = useCallback((paragraphIndex, anchor, kind = 'note') => {
        setComposer({ paragraphIndex, anchor, kind });
        setActiveId(null);
    }, []);

    const saveNote = useCallback(async (paragraphIndex, anchor, note, kind = 'note') => {
        // A hand-written explanation replaces whatever explanation the
        // paragraph had, exactly like re-running the assistant on it.
        await onAdd({ paragraphIndex, anchor, note, kind: kind === 'explanation' ? 'explanation' : 'note' });
        setComposer(null);
    }, [onAdd]);

    // Fix-with-AI: the composer stays open while the fix drafts and closes
    // only on success (a failure keeps the complaint so it can be retried).
    const requestFix = useCallback(async (paragraphIndex, anchor, instruction) => {
        try {
            await onRequestFix({ paragraphIndex, anchor, instruction });
            setComposer(null);
        } catch {
            // the workspace surfaces the error banner
        }
    }, [onRequestFix]);

    const explanationCount = (annotations || []).filter((a) => a.kind === 'explanation').length;

    if (!paragraphs.length) {
        return <p className="text-sm italic text-text-muted">Set up practice to see your essay mapped out here.</p>;
    }

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line-soft pb-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium text-text-dim">
                    <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-200 dark:bg-amber-500/30" /> Topic sentence</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-200 dark:bg-emerald-500/30" /> Quote</span>
                    <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent/20" /> Has a note</span>
                </div>
                {onExplain && (
                    <button type="button" onClick={onExplain} disabled={explaining}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-line-soft px-3 py-1.5 text-xs font-bold text-text-dim transition-colors hover:border-accent hover:text-accent disabled:opacity-40">
                        <SparklesIcon className="h-3.5 w-3.5" />
                        {explaining ? 'Explaining…' : explanationCount ? 'Refresh explanations' : 'Explain every paragraph'}
                    </button>
                )}
            </div>

            {structure.introduction && (
                <div className="mb-8 rounded-2xl border border-blue-200/60 bg-blue-50 p-5 dark:border-blue-500/20 dark:bg-blue-500/10 lg:mr-[19rem]">
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-blue-500">Introduction</span>
                    <p className="whitespace-pre-wrap font-serif text-base leading-relaxed text-text-primary">{structure.introduction}</p>
                </div>
            )}

            <div className="space-y-8">
                {paragraphs.map((p, i) => (
                    <ParagraphBlock
                        key={i}
                        paragraph={p}
                        index={i}
                        annotations={byParagraph.get(i) || []}
                        activeId={activeId}
                        onSelectNote={setActiveId}
                        onStartNote={startNote}
                        onSaveNote={saveNote}
                        onDeleteNote={onDelete}
                        onEditNote={onUpdate}
                        composer={composer?.paragraphIndex === i ? composer : null}
                        onCancelComposer={() => setComposer(null)}
                        onAskAI={onAskAI}
                        onFix={onRequestFix ? requestFix : undefined}
                        onExplainOne={onExplainOne}
                        explainingIndex={explainingIndex}
                        proposal={proposal?.paragraphIndex === i ? proposal : null}
                        applyingFix={applyingFix}
                        onAcceptFix={onAcceptFix}
                        onDiscardFix={onDiscardFix}
                    />
                ))}
            </div>

            {structure.conclusion && (
                <div className="mt-8 rounded-2xl border border-violet-200/60 bg-violet-50 p-5 dark:border-violet-500/20 dark:bg-violet-500/10 lg:mr-[19rem]">
                    <span className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-violet-500">Conclusion</span>
                    <p className="whitespace-pre-wrap font-serif text-base leading-relaxed text-text-primary">{structure.conclusion}</p>
                </div>
            )}

            <p className="mt-8 flex items-center gap-2 border-t border-line-soft pt-4 text-[11px] text-text-dim">
                <ChatBubbleLeftEllipsisIcon className="h-3.5 w-3.5" />
                Select any words to note a phrase — or hit “Fix with AI”, say what bugs you, and accept or discard the drafted fix. Use ✚ for a whole paragraph; bigger edits live in the Edit tab.
            </p>
        </div>
    );
}
