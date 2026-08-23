import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useReveal } from '../lib/useReveal';
import CapletLoader from '../components/CapletLoader';
import SlideRenderer from '../components/lesson/SlideRenderer';
import { extractPdfText } from '../lib/pdfExtract';
import AnnotatedDocument from '../components/essay/AnnotatedDocument';
import SpeedTypeMode from '../components/essay/SpeedTypeMode';
import AccuracyRing from '../components/essay/AccuracyRing';
import { foldAccents, foldGerman, alignWords, splitSentences, VERDICT_CLASS, accuracyVerdict } from '../lib/speedType';
import EssayChat from '../components/essay/EssayChat';
import ContextLibrary, { AddContextForm, ContextDocRow } from '../components/essay/ContextLibrary';
import { MAX_CONTEXT_DOCS } from '../lib/essayContext';
import {
    buildTopicSentenceCloze,
    buildQuoteCards,
    buildParagraphOrder,
    buildAnnotatedParagraph,
    lastSentence,
    paragraphItemId,
    quoteItemId,
} from '../lib/essaySlides';
import {
    AdjustmentsHorizontalIcon,
    DocumentTextIcon,
    PaperClipIcon,
    ChatBubbleLeftRightIcon,
    RectangleGroupIcon,
    PlusIcon,
    TrashIcon,
    ArrowLeftIcon,
    SparklesIcon,
    AcademicCapIcon,
    ArrowUpTrayIcon,
    ArrowRightIcon,
    BoltIcon,
    CheckIcon,
    ChevronDownIcon,
    EyeIcon,
    BookOpenIcon,
    PencilIcon,
    PencilSquareIcon,
    ClockIcon,
    RectangleStackIcon,
    ArrowsUpDownIcon,
    RocketLaunchIcon,
    Squares2X2Icon,
} from '@heroicons/react/24/outline';

// ── Cycling messages during AI parsing ─────────────────────────────────────

const PARSE_MESSAGES = [
    'Reading your essay structure…',
    'Identifying key quotes and evidence…',
    'Mapping techniques to paragraphs…',
    'Building your practice plan…',
    'Almost there…',
];

function CyclingMessage({ messages, intervalMs = 2800 }) {
    const [idx, setIdx] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setIdx((i) => (i + 1) % messages.length), intervalMs);
        return () => clearInterval(id);
    }, [messages.length, intervalMs]);
    return <span>{messages[idx]}</span>;
}

// ── AI model selection (same set as the lesson generator) ───────────────────

const MODEL_OPTIONS = [
    { id: 'gpt-5.4-nano', short: 'GPT-5.4 Nano', desc: 'Fastest & cheapest' },
    { id: 'gpt-5.4-mini', short: 'GPT-5.4 Mini', desc: 'Recommended default' },
    { id: 'gpt-5.4', short: 'GPT-5.4', desc: 'Higher quality' },
    { id: 'gpt-5.5', short: 'GPT-5.5', desc: 'Most powerful' },
];
const DEFAULT_MODEL = 'gpt-5.4-mini';
const modelShort = (id) => MODEL_OPTIONS.find((m) => m.id === id)?.short || id;

function EssayModelPicker({ model, onChange, disabled = false }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div ref={ref} className="relative inline-block">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-haspopup="listbox"
                className="inline-flex items-center gap-1.5 rounded-xl border border-line-soft px-3 py-2 text-xs font-bold text-text-dim hover:border-text-dim hover:text-text-primary transition-colors disabled:opacity-40"
            >
                <SparklesIcon className="w-3.5 h-3.5" />
                {modelShort(model)}
                <ChevronDownIcon className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div role="listbox" aria-label="AI model" className="absolute top-full left-0 mt-1.5 w-52 bg-surface-raised border border-line-soft rounded-xl overflow-hidden z-30 shadow-pop">
                    <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-text-dim">AI model</p>
                    {MODEL_OPTIONS.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            role="option"
                            aria-selected={opt.id === model}
                            onClick={() => { onChange(opt.id); setOpen(false); }}
                            className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors ${
                                opt.id === model ? 'bg-accent/[0.06]' : 'hover:bg-surface-soft/60'
                            }`}
                        >
                            <span>
                                <span className="block text-xs font-bold text-text-primary">{opt.short}</span>
                                <span className="block text-xs font-medium text-text-dim">{opt.desc}</span>
                            </span>
                            {opt.id === model && <CheckIcon className="w-3.5 h-3.5 text-accent shrink-0" />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Pure helpers ────────────────────────────────────────────────────────────

// Smart quotes/apostrophes are unified before stripping so a PDF-sourced
// "it’s" and a typed "it's" compare equal, and accents are FOLDED, not
// deleted: the old [^a-z0-9'] strip turned "café" into "caf" while the typed
// "cafe" stayed "cafe", so an accented word could never be typed correctly
// in any drill. The strip is Unicode-aware — the old ASCII-only pattern
// normalised every non-Latin word (Cyrillic, Greek…) to '' so ANY typed word
// "matched" it.
const canonWord = (s, fold) => fold(String(s || '').replace(/[‘’‚‛′]/g, "'"))
    .toLowerCase()
    .replace(/[^\p{L}\p{N}']/gu, '');
const normalise = (s) => canonWord(s, foldAccents);

// Equal under accent folding (für→fur) OR German transliteration (für→fuer),
// so both typing styles count everywhere words are checked.
const wordsEqual = (a, b) => normalise(a) === normalise(b)
    || canonWord(a, foldGerman) === canonWord(b, foldGerman);

/**
 * LCS-aligned word diff (see alignWords): one dropped or extra word no longer
 * cascades every later word to wrong. Returns one entry per TARGET word plus
 * a count of extra typed words, which count as errors in `diffAccuracy`.
 */
function diffWords(original, typed) {
    const origWords = String(original || '').trim().split(/\s+/).filter(Boolean);
    const typedWords = String(typed || '').trim().split(/\s+/).filter(Boolean);
    return alignWords(origWords, typedWords, wordsEqual);
}

/** Percentage accuracy of an aligned diff — extras count against you. */
function diffAccuracy(diff) {
    const total = diff.entries.length + diff.extras;
    if (!total) return 0;
    const correct = diff.entries.filter((d) => d.status === 'correct').length;
    return Math.round((correct / total) * 100);
}

function buildSpotlightSegments(structure) {
    const segs = [];
    if (structure.introduction) {
        segs.push({ label: 'Introduction', text: structure.introduction, type: 'thesis' });
    } else if (structure.thesis) {
        segs.push({ label: 'Thesis', text: structure.thesis, type: 'thesis' });
    }
    (structure.bodyParagraphs || []).forEach((p, i) =>
        segs.push({ label: `Body ${i + 1}`, text: p.text, type: 'body', quotes: p.quotes, techniques: p.techniques, heading: p.heading, notes: p.notes }),
    );
    if (structure.conclusion)
        segs.push({ label: 'Conclusion', text: structure.conclusion, type: 'conclusion' });
    return segs;
}

const wordCountOf = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;

/**
 * Every practisable section of the essay, in reading order: the introduction,
 * each body paragraph, then the conclusion.
 *
 * The intro and conclusion used to be missing here, which meant they were
 * missing from EVERY drill — Rebuild it, First letters, Exam run and Review all
 * take their list from this function, so the two paragraphs students most need
 * word-perfect were the only two they could not practise.
 *
 * `sourceIndex` is the section's stable identity: body paragraphs keep their
 * numeric index and the intro/conclusion get the string ids 'intro' and
 * 'conclusion'. Numbering them 0..n+1 instead would have been tidier but would
 * have shifted every body paragraph's spaced-repetition key by one
 * (`${essayId}:${sourceIndex}`), silently re-pointing saved review history at
 * the wrong paragraph. String ids cannot collide with the existing numbers.
 */
const allParagraphsOf = (essay) => {
    const s = essay?.parsedStructure || {};
    const sections = [];
    const intro = String(s.introduction || '').trim();
    if (intro) {
        sections.push({
            text: s.introduction,
            topicSentence: splitSentences(intro)[0] || intro,
            quotes: [],
            techniques: [],
            sourceIndex: 'intro',
            label: 'Introduction',
        });
    }
    (Array.isArray(s.bodyParagraphs) ? s.bodyParagraphs : []).forEach((p, i) => {
        sections.push({ ...p, sourceIndex: i, label: `Body ¶${i + 1}` });
    });
    const conclusion = String(s.conclusion || '').trim();
    if (conclusion) {
        sections.push({
            text: s.conclusion,
            topicSentence: splitSentences(conclusion)[0] || conclusion,
            quotes: [],
            techniques: [],
            sourceIndex: 'conclusion',
            label: 'Conclusion',
        });
    }
    return sections;
};

/**
 * The section immediately before `sourceIndex` in reading order, or null for
 * the first one. Cues are drawn from the essay's REAL neighbour so a scoped
 * session still shows the true transition — and so the first body paragraph
 * now cues off the introduction instead of jumping straight to the thesis.
 */
const previousSectionOf = (essay, sourceIndex) => {
    const all = allParagraphsOf(essay);
    const at = all.findIndex((p) => p.sourceIndex === sourceIndex);
    return at > 0 ? all[at - 1] : null;
};

/**
 * Parses a "intro,0,2" scope param into valid section ids in reading order, or
 * null for "all". Ids are matched against the essay's own section list, so a
 * stale link naming a paragraph that no longer exists degrades to a smaller
 * selection rather than an empty drill.
 */
function parseScope(param, sections) {
    if (!param) return null;
    const wanted = new Set(String(param).split(',').map((s) => s.trim()).filter(Boolean));
    const ids = sections.map((p) => p.sourceIndex).filter((id) => wanted.has(String(id)));
    if (!ids.length || ids.length === sections.length) return null;
    return ids;
}

/** The sentence containing word number `wordIdx` of `text`. */
function sentenceAtWord(text, wordIdx) {
    const sentences = splitSentences(text);
    let seen = 0;
    for (const s of sentences) {
        seen += s.trim().split(/\s+/).filter(Boolean).length;
        if (wordIdx < seen) return s;
    }
    return sentences[sentences.length - 1] || '';
}

/**
 * A word chip whose width NEVER changes. The real word is always rendered —
 * invisibly while masked — so it reserves its exact final width; the mask
 * (cue letters, dot, caret) is an overlay clipped to that box. Revealing a
 * word therefore never re-wraps the line or makes the text jump.
 */
function MaskedWord({ word, hidden = false, overlay = null, className = '', overlayClassName = '', animate = false, refEl, ariaLabel, title }) {
    return (
        <span
            ref={refEl}
            aria-label={ariaLabel}
            title={title}
            className={`relative inline-block whitespace-pre align-baseline ${animate ? 'animate-pop' : ''} ${className}`}
        >
            <span className={hidden ? 'invisible' : undefined} aria-hidden={hidden || undefined}>{word}</span>
            {hidden && (
                <span aria-hidden="true" className={`absolute inset-0 flex items-baseline overflow-hidden ${overlayClassName}`}>
                    {overlay}
                </span>
            )}
        </span>
    );
}

const Caret = () => <span className="inline-block align-middle w-0.5 h-4 bg-accent ml-0.5 animate-pulse shrink-0" />;

/** PDF page markers are extraction artifacts, not the student's essay. */
const stripPdfArtifacts = (text) => String(text || '')
    .replace(/^\s*\[Page \d+\]\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// ── Shared UI ───────────────────────────────────────────────────────────────

function LiveCheck({ target, typed, currentHint = 'none', showRemaining = false, title = 'Live check', prefix = '' }) {
    const targetWords = String(target || '').trim().split(/\s+/).filter(Boolean);
    const raw = String(typed || '');
    const typedWords = raw.split(/\s+/).filter(Boolean);
    const midWord = raw.length > 0 && !/\s$/.test(raw); // last token still being typed
    const committed = midWord ? typedWords.length - 1 : typedWords.length;

    let correct = 0;
    for (let i = 0; i < committed; i++) {
        if (wordsEqual(typedWords[i], targetWords[i] || '')) correct++;
    }
    const pct = committed ? Math.round((correct / committed) * 100) : 0;
    const complete = targetWords.length > 0 && committed >= targetWords.length;

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-text-dim">{title}</span>
                <div className="flex items-baseline gap-2">
                    <span className="text-lg font-display font-extrabold text-text-primary tabular-nums">{pct}%</span>
                    <span className="text-[11px] font-medium text-text-dim tabular-nums">{committed}/{targetWords.length}</span>
                </div>
            </div>
            <div className="p-5 rounded-2xl block-cream font-serif text-sm md:text-base leading-relaxed flex flex-wrap gap-x-1.5 gap-y-1.5 content-start min-h-[140px]">
                {prefix && <span className="text-accent font-bold">{prefix}</span>}
                {targetWords.length === 0 && <span className="text-text-dim italic text-sm">Nothing to check yet.</span>}
                {targetWords.map((w, i) => {
                    if (i < committed) {
                        const ok = wordsEqual(typedWords[i], w);
                        if (ok) return <MaskedWord key={i} word={w} animate className="text-[color:var(--mark-green)]" />;
                        return (
                            <MaskedWord key={i} word={w} animate
                                title={`You typed “${typedWords[i]}”`}
                                ariaLabel={`${w} — you typed ${typedWords[i]}`}
                                className="rounded-sm bg-surface-warning text-text-warning underline decoration-wavy decoration-[color:var(--mark-amber)]" />
                        );
                    }
                    if (i === committed && !complete) {
                        return (
                            <MaskedWord key={i} word={w} hidden
                                className="border-b-2 border-accent"
                                overlayClassName="text-accent"
                                overlay={<>{currentHint === 'firstletter' ? w[0] : ''}<Caret /></>} />
                        );
                    }
                    if (showRemaining) {
                        return (
                            <MaskedWord key={i} word={w} hidden
                                className="border-b border-line-strong select-none"
                                overlayClassName="text-text-dim"
                                overlay={w[0]} />
                        );
                    }
                    return null;
                })}
                {complete && <span className="ml-1 text-[color:var(--mark-green)] font-bold">✓</span>}
            </div>
        </div>
    );
}

function GradeButtons({ busy, onPass, onFail, passLabel = 'Got it', passDisabled = false }) {
    // Pass/fail semantics: rose and emerald are the recall-grade colours (like a
    // mark scheme), not theme accents. Their filled hover state is always a dark
    // saturated fill, so the ink stays literal white rather than text-accent-contrast.
    return (
        <div className="flex items-center gap-3 mt-5">
            <button type="button" disabled={busy} onClick={onFail}
                className="text-sm font-semibold text-text-error border border-line-error rounded-xl px-5 py-2.5 hover:bg-[color:var(--text-error)] hover:text-white transition-colors disabled:opacity-40">
                Missed it
            </button>
            <button type="button" disabled={busy || passDisabled} onClick={onPass}
                className="text-sm font-semibold text-[color:var(--mark-green)] border border-[color:var(--mark-green)] rounded-xl px-5 py-2.5 hover:bg-[color:var(--mark-green)] hover:text-white transition-colors disabled:opacity-40">
                {passLabel}
            </button>
        </div>
    );
}

function SneakPeek({ text, label = 'Sneak peek', autoHideMs = 3500, onReveal }) {
    const [peeking, setPeeking] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => () => clearTimeout(timerRef.current), []);
    useEffect(() => {
        clearTimeout(timerRef.current);
        setPeeking(false);
    }, [text]);

    const toggle = () => {
        clearTimeout(timerRef.current);
        if (peeking) { setPeeking(false); return; }
        onReveal?.();
        setPeeking(true);
        timerRef.current = setTimeout(() => setPeeking(false), autoHideMs);
    };

    if (!text) return null;

    return (
        <div className="relative inline-block">
            <button
                type="button"
                onClick={toggle}
                aria-expanded={peeking}
                aria-label={`${label}${peeking ? `: ${text}` : ''}`}
                className={`text-xs font-semibold rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 border transition-colors ${
                    peeking
                        ? 'border-accent text-accent bg-accent-soft'
                        : 'border-line-soft text-text-dim hover:border-accent hover:text-accent'
                }`}
            >
                <EyeIcon className="w-3.5 h-3.5" />
                {label}
            </button>
            {peeking && (
                <div role="tooltip" className="absolute z-20 left-0 top-full mt-2 w-72 sm:w-96 p-4 rounded-2xl bg-text-primary text-surface-body shadow-pop font-serif text-sm leading-relaxed animate-rise">
                    {text}
                    <div className="absolute -top-1.5 left-5 w-3 h-3 bg-text-primary rotate-45" />
                </div>
            )}
        </div>
    );
}

function HintToggle({ options, value, onChange }) {
    return (
        <div className="flex items-center gap-1 p-1 bg-surface-body rounded-full border border-line-soft">
            {options.map((opt) => (
                <button
                    key={opt.key}
                    type="button"
                    onClick={() => onChange(opt.key)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                        value === opt.key ? 'bg-accent text-accent-contrast' : 'text-text-dim hover:text-text-primary'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

/** Thin progress bar; `value` counts COMPLETED units so it starts empty. */
function ProgressBar({ value, total }) {
    const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
    return (
        <div
            className="h-1.5 w-full bg-line-soft rounded-full overflow-hidden mb-5"
            role="progressbar"
            aria-label="Essay practice progress"
            aria-valuemin="0"
            aria-valuemax={total}
            aria-valuenow={Math.min(value, total)}
        >
            <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
    );
}

/**
 * End-of-session screen. `saveOk=false` is shown honestly instead of claiming
 * the review ladder was updated when every submit actually failed.
 */
function SessionDone({ onRestart, nextLabel, onNext, saveOk = true }) {
    return (
        <div className="text-center py-14">
            <div className="w-14 h-14 rounded-full block-green flex items-center justify-center mx-auto mb-5 animate-pop-in">
                <AcademicCapIcon className="w-7 h-7 text-[color:var(--mark-green)]" />
            </div>
            <p className="font-display text-xl font-extrabold tracking-tight text-text-primary">Session complete</p>
            {saveOk ? (
                <p className="text-sm text-text-muted mt-2">Items rescheduled on the 1, 3, 7, 14 day ladder.</p>
            ) : (
                <p className="text-sm text-text-warning mt-2">Progress could not be saved this time — your review schedule is unchanged.</p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                <button type="button" onClick={onRestart}
                    className="btn-secondary inline-flex press">
                    Restart
                </button>
                {onNext && (
                    <button type="button" onClick={onNext}
                        className="btn-primary inline-flex items-center gap-2 press">
                        Continue to {nextLabel} <ArrowRightIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

/** Empty-mode fallback with a way forward instead of dead text. */
function EmptyModeNote({ children, onEdit }) {
    return (
        <div className="text-center py-10">
            <p className="text-sm text-text-muted italic">{children}</p>
            {onEdit && (
                <button type="button" onClick={onEdit} className="mt-4 text-sm font-semibold text-accent hover:opacity-70 transition-opacity">
                    Edit the essay text →
                </button>
            )}
        </div>
    );
}

// ── READ — story view, colour-annotated, or exactly as saved ────────────────

function SpotlightMode({ essay }) {
    const structure = essay.parsedStructure || {};
    const segments = buildSpotlightSegments(structure);
    const [idx, setIdx] = useState(0);

    if (!segments.length) return <p className="text-sm text-text-muted italic">Nothing to read yet.</p>;

    const seg = segments[Math.min(idx, segments.length - 1)];
    const bg =
        seg.type === 'thesis' ? 'block-blue' :
        seg.type === 'conclusion' ? 'block-cream' :
        'bg-surface-raised';

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-medium text-text-dim">{idx + 1} / {segments.length}</span>
                <div className="flex gap-1.5">
                    {segments.map((segment, i) => (
                        <button key={i} type="button" onClick={() => setIdx(i)}
                            aria-label={`Read ${segment.label}`}
                            aria-current={i === idx ? 'step' : undefined}
                            className={`w-2 h-2 rounded-full transition-colors ${i === idx ? 'bg-accent' : 'bg-line-soft hover:bg-text-dim'}`} />
                    ))}
                </div>
            </div>

            <div className={`${bg} rounded-2xl border border-line-soft p-6 md:p-8 shadow-card min-h-[180px]`}>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent">{seg.label}</span>
                    {seg.heading && (
                        <span className="rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-[10px] font-bold text-text-dim" title="Your note — not part of the exam prose">
                            {seg.heading}
                        </span>
                    )}
                </div>
                {(seg.notes || []).length > 0 && (
                    <div className="mb-4 space-y-1">
                        {seg.notes.map((n, i) => (
                            <p key={i} className="text-xs italic text-text-dim">✎ {n}</p>
                        ))}
                    </div>
                )}
                <p className="font-serif text-base md:text-lg leading-relaxed text-text-primary whitespace-pre-wrap">{seg.text}</p>
                {(seg.quotes || []).length > 0 && (
                    <div className="mt-6 space-y-2 border-t border-line-soft pt-5">
                        {seg.quotes.map((q, i) => (
                            <p key={i} className="text-sm font-serif text-text-muted italic">
                                &ldquo;{q.text}&rdquo;
                            </p>
                        ))}
                    </div>
                )}
                {(seg.techniques || []).length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {seg.techniques.map((t, i) => (
                            <span key={i} className="text-xs font-semibold px-2.5 py-1 bg-accent-soft text-accent rounded-full">{t}</span>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between mt-6">
                <button type="button" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}
                    className="inline-flex items-center gap-2 text-sm font-medium text-text-dim hover:text-accent disabled:opacity-30 transition-colors">
                    <ArrowLeftIcon className="w-4 h-4" /> Previous section
                </button>
                {idx + 1 < segments.length ? (
                    <button type="button" onClick={() => setIdx((i) => i + 1)}
                        className="btn-primary inline-flex items-center gap-2 press">
                        Next <ArrowRightIcon className="w-4 h-4" />
                    </button>
                ) : (
                    <button type="button" onClick={() => setIdx(0)}
                        className="btn-secondary inline-flex press">
                        Read again
                    </button>
                )}
            </div>
        </div>
    );
}

function AnnotatedLegend() {
    // Essay-annotation series palette. Blue/amber/emerald/violet are literal on
    // purpose: they encode a fixed set of structural roles (thesis, topic
    // sentence, quote, conclusion), the way a chart legend does, so they must
    // stay stable across every theme rather than follow the accent token.
    const items = [
        { swatch: 'bg-[color:var(--block-blue)]', label: 'Thesis' },
        { swatch: 'bg-surface-warning', label: 'Topic sentence' },
        { swatch: 'bg-[color:var(--mark-green)]', label: 'Quote' },
        { swatch: 'bg-[color:var(--block-coral)]', label: 'Conclusion' },
    ];
    return (
        <div className="flex flex-wrap gap-x-5 gap-y-2 mb-8 p-4 rounded-2xl bg-surface-body border border-line-soft">
            {items.map((it, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-sm ${it.swatch}`} />
                    <span className="text-xs font-medium text-text-dim">{it.label}</span>
                </div>
            ))}
        </div>
    );
}

function AnnotatedParagraphBlock({ paragraph, index }) {
    const segments = buildAnnotatedParagraph(paragraph);
    const annotations = [paragraph.heading, ...(paragraph.notes || [])].filter(Boolean);
    return (
        <div className="relative pl-5 border-l-2 border-line-soft">
            <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-surface-raised border-2 border-accent flex items-center justify-center">
                <span className="text-[8px] font-bold text-accent">{index + 1}</span>
            </span>
            {annotations.length > 0 && (
                /* Margin annotations: the student's own labels/notes, kept beside
                   the prose — never inside it. Sits in the right gutter on lg. */
                <div className="mb-2 lg:mb-0 lg:absolute lg:left-full lg:top-0 lg:ml-8 lg:w-44">
                    {annotations.map((a, i) => (
                        <p key={i} className={`text-[11px] leading-snug text-text-dim ${i === 0 ? 'font-bold' : 'italic mt-1'}`} title="Your note — not part of the exam prose">
                            {i === 0 ? a : `✎ ${a}`}
                        </p>
                    ))}
                </div>
            )}
            <p className="font-serif text-base leading-relaxed text-text-primary">
                {segments.map((seg, i) => {
                    if (seg.type === 'topic') {
                        return (
                            <span key={i} className="bg-surface-warning rounded px-0.5">
                                {seg.text}
                            </span>
                        );
                    }
                    if (seg.type === 'quote') {
                        return (
                            <span key={i} className="rounded px-0.5 bg-[color:var(--mark-green)]">
                                {seg.text}
                            </span>
                        );
                    }
                    return <span key={i}>{seg.text}</span>;
                })}
            </p>
            {(paragraph.techniques || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {paragraph.techniques.map((t, i) => (
                        <span key={i} className="text-[11px] font-semibold px-2.5 py-1 block-coral text-[color:var(--mark-coral)] rounded-full">
                            {t}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

/** Renders an intro/conclusion block, highlighting the thesis inside the intro. */
function FramingParagraphBlock({ label, text, thesis, tone }) {
    // Same annotation series as AnnotatedLegend — blue marks the intro, violet
    // the conclusion. Literal by design, not a missing token.
    const palette = tone === 'violet'
        ? { box: 'block-coral border-line-soft', tag: 'text-[color:var(--mark-coral)]', mark: 'bg-[color:var(--block-coral)]' }
        : { box: 'block-blue border-line-soft', tag: 'text-[color:var(--mark-blue)]', mark: 'bg-[color:var(--block-blue)]' };
    let content = <span>{text}</span>;
    if (thesis) {
        const at = text.indexOf(thesis);
        if (at >= 0) {
            content = (
                <>
                    {text.slice(0, at)}
                    <span className={`${palette.mark} rounded px-0.5`}>{thesis}</span>
                    {text.slice(at + thesis.length)}
                </>
            );
        }
    }
    return (
        <div className={`p-5 rounded-2xl border ${palette.box}`}>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${palette.tag} mb-2 block`}>{label}</span>
            <p className="font-serif text-base leading-relaxed text-text-primary whitespace-pre-wrap">{content}</p>
        </div>
    );
}

function AnnotatedEssayMode({ essay }) {
    const structure = essay.parsedStructure || {};
    const paras = structure.bodyParagraphs || [];

    return (
        <div>
            <AnnotatedLegend />
            <div className="max-w-2xl mx-auto space-y-8">
                {structure.introduction ? (
                    <FramingParagraphBlock label="Introduction" text={structure.introduction} thesis={structure.thesis} tone="blue" />
                ) : structure.thesis ? (
                    <FramingParagraphBlock label="Thesis" text={structure.thesis} tone="blue" />
                ) : null}

                {paras.length === 0 ? (
                    <p className="text-sm text-text-muted italic text-center py-8">No body paragraphs to annotate.</p>
                ) : (
                    <div className="space-y-8">
                        {paras.map((p, i) => <AnnotatedParagraphBlock key={i} paragraph={p} index={i} />)}
                    </div>
                )}

                {structure.conclusion && (
                    <FramingParagraphBlock label="Conclusion" text={structure.conclusion} tone="violet" />
                )}
            </div>
        </div>
    );
}

function OriginalEssayMode({ essay }) {
    const text = essay.originalText || '';
    if (!text.trim()) return <p className="text-sm text-text-muted italic">No essay text saved.</p>;
    const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {paragraphs.map((p, i) => (
                <p key={i} className="font-serif text-base md:text-lg leading-relaxed text-text-primary whitespace-pre-wrap">
                    {p}
                </p>
            ))}
        </div>
    );
}

const READ_VIEWS = [
    { key: 'story', label: 'Story' },
    { key: 'annotated', label: 'Annotated' },
    { key: 'original', label: 'Original' },
];

function ReadMode({ essay, onStartPractice }) {
    const [view, setView] = useState('story');
    return (
        <div>
            <div className="flex justify-center mb-6">
                <HintToggle options={READ_VIEWS} value={view} onChange={setView} />
            </div>
            {view === 'story' && <SpotlightMode essay={essay} />}
            {view === 'annotated' && <AnnotatedEssayMode essay={essay} />}
            {view === 'original' && <OriginalEssayMode essay={essay} />}

            {onStartPractice && (
                <div className="flex justify-center mt-10 pt-8 border-t border-line-soft">
                    <button type="button" onClick={onStartPractice}
                        className="text-sm font-semibold text-accent hover:opacity-70 transition-opacity inline-flex items-center gap-2">
                        Know it well enough to try recalling it? <span className="underline">Start practising</span>
                        <ArrowRightIcon className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}

// ── RECALL — spaced-repetition cloze on topic sentences ─────────────────────

function RecallChunks({ essay, paragraphs, onScheduled, onNext, nextLabel, onEdit }) {
    const structure = essay.parsedStructure || {};
    const paras = paragraphs || allParagraphsOf(essay);
    const [pIndex, setPIndex] = useState(0);
    const [graded, setGraded] = useState(false);
    const [busy, setBusy] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const [done, setDone] = useState(false);
    const [saveOk, setSaveOk] = useState(true);

    const reset = () => { setPIndex(0); setGraded(false); setRevealed(false); setDone(false); setSaveOk(true); };

    if (!paras.length) return <EmptyModeNote onEdit={onEdit}>This essay has no paragraphs to practise yet.</EmptyModeNote>;
    if (done) return <SessionDone onRestart={reset} onNext={onNext} nextLabel={nextLabel} saveOk={saveOk} />;

    const current = paras[pIndex];
    const sourceIdx = current.sourceIndex ?? pIndex;
    const cloze = buildTopicSentenceCloze(current, current.label);
    const prevInEssay = previousSectionOf(essay, sourceIdx);
    const cue = !prevInEssay
        ? (structure.thesis ? `Thesis: "${structure.thesis}"` : 'Recall your opening.')
        : `${prevInEssay.label} ended: "${lastSentence(prevInEssay.text)}". What comes next?`;

    const grade = async (recall) => {
        setBusy(true);
        try {
            await api.submitReview('essayParagraph', paragraphItemId(essay.id, sourceIdx), recall);
            await Promise.all(
                (current.quotes || []).map((_, qIdx) =>
                    api.submitReview('quote', quoteItemId(essay.id, sourceIdx, qIdx), recall).catch(() => {}),
                ),
            );
            onScheduled?.();
        } catch (e) { console.warn('SRS submit failed:', e?.message || e); setSaveOk(false); }
        setBusy(false);
        setGraded(true);
    };

    const next = () => {
        if (pIndex + 1 < paras.length) { setPIndex((i) => i + 1); setGraded(false); setRevealed(false); }
        else setDone(true);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-dim">{current.label} · {pIndex + 1} of {paras.length}{current.heading ? ` · ${current.heading}` : ''}</span>
            </div>
            <ProgressBar value={pIndex} total={paras.length} />
            <p className="text-sm text-text-muted italic mb-6 px-4 py-3 bg-surface-body rounded-xl border border-line-soft">{cue}</p>

            {cloze ? (
                <SlideRenderer key={`p-${pIndex}`} slide={cloze} onSubmit={(correct) => grade(correct ? 'pass' : 'fail')} />
            ) : (
                <div>
                    <p className="text-base text-text-primary font-serif mb-4">
                        Recall the opening: <strong>{current.topicSentence || '(no topic sentence)'}</strong>
                    </p>
                    {!graded && (
                        <GradeButtons busy={busy} onFail={() => grade('fail')} onPass={() => grade('pass')} passLabel="Got it" />
                    )}
                </div>
            )}

            {graded && (
                <div className="mt-6">
                    {!revealed ? (
                        <button type="button" onClick={() => setRevealed(true)}
                            className="block w-fit text-sm font-medium text-accent hover:opacity-70 transition-opacity">
                            Show full paragraph
                        </button>
                    ) : (
                        <div className="p-5 rounded-2xl block-cream shadow-card">
                            <p className="text-sm md:text-base text-text-primary leading-relaxed whitespace-pre-wrap font-serif">{current.text}</p>
                        </div>
                    )}
                    <button type="button" onClick={next}
                        className="btn-primary mt-5 inline-flex items-center gap-2 press">
                        {pIndex + 1 < paras.length ? 'Next paragraph →' : 'Finish'}
                    </button>
                </div>
            )}
        </div>
    );
}

// ── WORD BY WORD — type one word at a time; next letter revealed as you go ──

const NEXT_WORD_HINTS = [
    { key: 'first', label: '1 letter' },
    { key: 'three', label: '3 letters' },
    { key: 'word', label: 'Full word' },
];

// Cue letters only — the chip's underline already conveys the word's length,
// so no dash-padding (which never matched the real width anyway).
const wordCue = (w, style) => {
    if (style === 'word') return w;
    return w.slice(0, style === 'three' ? Math.min(3, w.length) : 1);
};

export function GuidedTypeMode({ essay, paragraphs, onScheduled, onNext, nextLabel, onEdit }) {
    const paras = paragraphs || allParagraphsOf(essay);
    const [hintStyle, setHintStyle] = useState('first');
    const [pIndex, setPIndex] = useState(0);
    const [wordIdx, setWordIdx] = useState(0);
    const [current, setCurrent] = useState('');
    const [history, setHistory] = useState([]); // [{target, typed, correct}]
    const [peekedWords, setPeekedWords] = useState(new Set());
    const [paraDone, setParaDone] = useState(false);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [saveOk, setSaveOk] = useState(true);
    const [shake, setShake] = useState(false);
    const [streak, setStreak] = useState(0);
    const inputRef = useRef(null);
    const currentRef = useRef(null);
    const shakeTimer = useRef(null);

    const reset = () => { setPIndex(0); setWordIdx(0); setCurrent(''); setHistory([]); setPeekedWords(new Set()); setParaDone(false); setDone(false); setSaveOk(true); setStreak(0); };

    useEffect(() => { if (!paraDone) inputRef.current?.focus(); }, [pIndex, paraDone]);
    useEffect(() => () => clearTimeout(shakeTimer.current), []);
    // Keep the word you're on visible inside its own scroll area, so a long
    // paragraph never pushes it (or the input) out of view.
    useEffect(() => {
        if (typeof currentRef.current?.scrollIntoView === 'function') {
            currentRef.current.scrollIntoView({ block: 'nearest' });
        }
    }, [wordIdx, paraDone]);

    if (!paras.length) return <EmptyModeNote onEdit={onEdit}>This essay has no paragraphs to practise yet.</EmptyModeNote>;
    if (done) return <SessionDone onRestart={reset} onNext={onNext} nextLabel={nextLabel} saveOk={saveOk} />;

    const para = paras[pIndex];
    const sourceIdx = para.sourceIndex ?? pIndex;
    const words = String(para.text || '').trim().split(/\s+/).filter(Boolean);
    const targetWord = words[wordIdx] || '';
    const currentSentence = sentenceAtWord(para.text, wordIdx);

    const commitWord = () => {
        const typed = current.trim();
        if (!typed || paraDone) return;
        const isCorrect = wordsEqual(typed, targetWord);
        setHistory((prev) => [...prev, { target: targetWord, typed, correct: isCorrect }]);
        setCurrent('');
        if (isCorrect) {
            setStreak((s) => s + 1);
        } else {
            setStreak(0);
            setShake(true);
            clearTimeout(shakeTimer.current);
            shakeTimer.current = setTimeout(() => setShake(false), 320);
        }
        if (wordIdx + 1 >= words.length) setParaDone(true);
        else setWordIdx((i) => i + 1);
    };

    const advance = async (recall) => {
        setBusy(true);
        try {
            await api.submitReview('essayParagraph', paragraphItemId(essay.id, sourceIdx), recall, {
                mode: 'word_by_word',
                accuracy,
                hintCount: peekedWords.size,
            });
            onScheduled?.();
        } catch { setSaveOk(false); }
        setBusy(false);
        if (pIndex + 1 < paras.length) {
            setPIndex((i) => i + 1); setWordIdx(0); setCurrent(''); setHistory([]); setPeekedWords(new Set()); setParaDone(false); setStreak(0);
        } else setDone(true);
    };

    const correct = history.filter((h) => h.correct).length;
    const rawAccuracy = history.length ? Math.round((correct / history.length) * 100) : 0;
    const accuracy = Math.max(0, Math.min(100, rawAccuracy - (peekedWords.size * 3)));
    const revealCurrentWord = () => {
        setPeekedWords((currentPeeked) => {
            if (currentPeeked.has(wordIdx)) return currentPeeked;
            return new Set([...currentPeeked, wordIdx]);
        });
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
                <span className="text-xs font-medium text-text-dim">
                    {para.label} · {pIndex + 1} of {paras.length}{para.heading ? ` · ${para.heading}` : ''}
                </span>
                <div className="flex items-center gap-3">
                    {streak >= 3 && (
                        <span key={streak} className="text-xs font-bold text-accent animate-streak-pop tabular-nums">⚡ {streak} in a row</span>
                    )}
                    <HintToggle options={NEXT_WORD_HINTS} value={hintStyle} onChange={setHintStyle} />
                </div>
            </div>
            <ProgressBar value={pIndex} total={paras.length} />
            <p className="text-xs font-medium text-text-dim mb-4">Type each word — the cue shows as much of the next word as you choose.</p>

            <div className="grid lg:grid-cols-2 gap-5 lg:gap-6 items-start">
                {/* Left — the word stream you're rebuilding (scrolls on its own) */}
                <div className="p-5 rounded-2xl block-cream font-serif text-sm md:text-base leading-relaxed flex flex-wrap gap-x-1.5 gap-y-1.5 content-start min-h-[220px] lg:min-h-[300px] max-h-[52vh] overflow-y-auto">
                    {words.map((w, i) => {
                        if (i < history.length) {
                            const h = history[i];
                            if (h.correct) return (
                                <MaskedWord key={i} word={w} animate
                                    ariaLabel={peekedWords.has(i) ? `${w}, revealed with a hint` : undefined}
                                    title={peekedWords.has(i) ? 'Revealed with a hint' : undefined}
                                    className={peekedWords.has(i) ? 'rounded-sm block-amber text-amber' : 'text-[color:var(--mark-green)]'} />
                            );
                            return (
                                <MaskedWord key={i} word={w} animate
                                    title={`You typed “${h.typed}”`}
                                    ariaLabel={`${w} — you typed ${h.typed}`}
                                    className="rounded-sm bg-surface-warning text-text-warning underline decoration-wavy decoration-[color:var(--mark-amber)]" />
                            );
                        }
                        if (i === wordIdx && !paraDone) {
                            return (
                                <MaskedWord key={i} word={w} hidden refEl={currentRef}
                                    ariaLabel={peekedWords.has(i) ? `${w}, revealed with a hint` : undefined}
                                    title={peekedWords.has(i) ? 'Revealed with a hint' : undefined}
                                    className={`border-b-2 transition-colors duration-200 ${peekedWords.has(i) ? 'rounded-sm block-amber border-[color:var(--mark-amber)]' : 'border-accent'}`}
                                    overlayClassName={peekedWords.has(i) ? 'text-amber' : hintStyle === 'word' ? 'text-text-muted italic' : 'text-accent'}
                                    overlay={<>{wordCue(w, hintStyle)}<Caret /></>} />
                            );
                        }
                        return (
                            <MaskedWord key={i} word={w} hidden
                                className="border-b border-line-strong select-none"
                                overlayClassName="text-text-dim"
                                overlay={w[0]} />
                        );
                    })}
                </div>

                {/* Right — input + running score, pinned so it never scrolls away */}
                <div className="lg:sticky lg:top-24 self-start">
                    {!paraDone ? (
                        <div className={`p-5 rounded-2xl bg-surface-body border transition-colors ${shake ? 'animate-shake-x border-line-error' : 'border-line-soft'}`}>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[11px] font-bold uppercase tracking-widest text-text-dim">Next word</span>
                                <span className="text-lg font-display font-extrabold text-text-primary tabular-nums">{accuracy}%</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={current}
                                    onChange={(e) => setCurrent(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); commitWord(); } }}
                                    placeholder={targetWord ? `${wordCue(targetWord, hintStyle === 'word' ? 'first' : hintStyle).slice(0, 6)}…` : ''}
                                    className="flex-1 px-4 py-3 rounded-2xl bg-surface-body border border-line-soft text-text-primary placeholder:text-text-dim outline-none focus:border-accent transition-colors font-serif"
                                    autoComplete="off" autoCorrect="off" spellCheck={false}
                                />
                                <button type="button" onClick={commitWord} disabled={!current.trim()} aria-label="Confirm word"
                                    className="btn-primary px-5 py-3 inline-flex press disabled:opacity-40">
                                    <ArrowRightIcon className="w-4 h-4" aria-hidden="true" />
                                </button>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                                <p className="text-xs text-text-dim">Space or Enter to confirm</p>
                                <div className="flex items-center gap-2">
                                    <SneakPeek text={targetWord} label="Peek word" autoHideMs={2000} onReveal={revealCurrentWord} />
                                    <SneakPeek text={currentSentence} label="Peek sentence" autoHideMs={3500} onReveal={revealCurrentWord} />
                                </div>
                                {peekedWords.size > 0 && <span className="sr-only" role="status">{peekedWords.size} revealed {peekedWords.size === 1 ? 'word' : 'words'}; accuracy reduced by {peekedWords.size * 3} percentage points.</span>}
                            </div>
                        </div>
                    ) : (
                        <div className="p-5 rounded-2xl block-blue animate-pop">
                            <div className="flex items-baseline gap-3 mb-1">
                                <span className="text-3xl font-display font-extrabold text-text-primary tabular-nums">{accuracy}%</span>
                                <span className="text-xs text-text-dim">{correct}/{history.length} words</span>
                            </div>
                            <p className="text-xs text-text-muted mb-4">Paragraph rebuilt. How did that feel?</p>
                            <GradeButtons busy={busy} onFail={() => advance('fail')} onPass={() => advance('pass')} passLabel="Got it" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── FIRST LETTERS — sprint the paragraph typing only each word's first letter ─

const firstLetterOf = (word) => {
    const match = String(word || '').match(/[a-z0-9]/i);
    return match ? match[0].toLowerCase() : null;
};

function FirstLettersMode({ essay, paragraphs, onScheduled, onNext, nextLabel, onEdit }) {
    const paras = paragraphs || allParagraphsOf(essay);
    const [pIndex, setPIndex] = useState(0);
    const [wordIdx, setWordIdx] = useState(0);
    const [results, setResults] = useState([]); // 'hit' | 'hinted' per word
    const [missCount, setMissCount] = useState(0); // consecutive misses on current word
    const [paraDone, setParaDone] = useState(false);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [saveOk, setSaveOk] = useState(true);
    const [shake, setShake] = useState(false);
    const [streak, setStreak] = useState(0);
    const inputRef = useRef(null);
    const currentRef = useRef(null);
    const shakeTimer = useRef(null);

    const reset = () => { setPIndex(0); setWordIdx(0); setResults([]); setMissCount(0); setParaDone(false); setDone(false); setSaveOk(true); setStreak(0); };

    useEffect(() => { if (!paraDone) inputRef.current?.focus(); }, [pIndex, paraDone]);
    useEffect(() => () => clearTimeout(shakeTimer.current), []);
    useEffect(() => {
        if (typeof currentRef.current?.scrollIntoView === 'function') {
            currentRef.current.scrollIntoView({ block: 'nearest' });
        }
    }, [wordIdx, paraDone]);

    if (!paras.length) return <EmptyModeNote onEdit={onEdit}>This essay has no paragraphs to practise yet.</EmptyModeNote>;
    if (done) return <SessionDone onRestart={reset} onNext={onNext} nextLabel={nextLabel} saveOk={saveOk} />;

    const para = paras[pIndex];
    const sourceIdx = para.sourceIndex ?? pIndex;
    const words = String(para.text || '').trim().split(/\s+/).filter(Boolean);
    const hits = results.filter((r) => r === 'hit').length;
    const accuracy = results.length ? Math.round((hits / results.length) * 100) : 100;

    const advanceWord = (result) => {
        setResults((prev) => [...prev, result]);
        setMissCount(0);
        if (wordIdx + 1 >= words.length) setParaDone(true);
        else setWordIdx((i) => i + 1);
    };

    const onKey = (e) => {
        if (paraDone) return;
        const key = String(e.key || '').toLowerCase();
        if (key.length !== 1) return;
        e.preventDefault();
        const expected = firstLetterOf(words[wordIdx]);
        if (!expected) { advanceWord('hit'); return; }
        if (!/[a-z0-9]/.test(key)) return;
        if (key === expected) {
            setStreak((s) => s + 1);
            advanceWord(missCount > 0 ? 'hinted' : 'hit');
        } else {
            setStreak(0);
            setShake(true);
            clearTimeout(shakeTimer.current);
            shakeTimer.current = setTimeout(() => setShake(false), 320);
            // Two misses reveal the word and move on — momentum beats stalling.
            if (missCount + 1 >= 2) advanceWord('hinted');
            else setMissCount((m) => m + 1);
        }
    };

    const finishParagraph = async (recall) => {
        setBusy(true);
        try {
            await api.submitReview('essayParagraph', paragraphItemId(essay.id, sourceIdx), recall, {
                mode: 'first_letters',
                accuracy,
                hintCount: results.filter((r) => r === 'hinted').length,
            });
            onScheduled?.();
        } catch { setSaveOk(false); }
        setBusy(false);
        if (pIndex + 1 < paras.length) {
            setPIndex((i) => i + 1); setWordIdx(0); setResults([]); setMissCount(0); setParaDone(false); setStreak(0);
        } else setDone(true);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
                <span className="text-xs font-medium text-text-dim">
                    {para.label} · {pIndex + 1} of {paras.length}{para.heading ? ` · ${para.heading}` : ''}
                </span>
                {streak >= 5 && (
                    <span key={streak} className="text-xs font-bold text-accent animate-streak-pop tabular-nums">⚡ {streak} in a row</span>
                )}
            </div>
            <ProgressBar value={pIndex} total={paras.length} />
            <p className="text-xs font-medium text-text-dim mb-4">
                Recall at speed: press the <strong>first letter</strong> of each next word. Two misses reveal it and move on.
            </p>

            {!paraDone ? (
                <div
                    role="application"
                    aria-label="First letters sprint"
                    onClick={() => inputRef.current?.focus()}
                    className={`p-5 rounded-2xl block-cream font-serif text-sm md:text-base leading-relaxed flex flex-wrap gap-x-1.5 gap-y-1.5 content-start min-h-[220px] max-h-[56vh] overflow-y-auto cursor-text ${shake ? 'animate-shake-x' : ''}`}
                >
                    {/* Hidden input keeps mobile keyboards working. */}
                    <input
                        ref={inputRef}
                        onKeyDown={onKey}
                        value=""
                        onChange={() => {}}
                        aria-label="Type the first letter of the next word"
                        className="absolute h-px w-px opacity-0"
                        autoComplete="off" autoCorrect="off" spellCheck={false}
                    />
                    {words.map((w, i) => {
                        if (i < results.length) {
                            return (
                                <MaskedWord key={i} word={w} animate
                                    className={results[i] === 'hit' ? 'text-text-primary' : 'rounded-sm bg-surface-warning text-text-warning'} />
                            );
                        }
                        if (i === wordIdx) {
                            return (
                                <MaskedWord key={i} word={w} hidden refEl={currentRef}
                                    className={`border-b-2 ${missCount > 0 ? 'border-line-error' : 'border-accent'}`}
                                    overlayClassName={missCount > 0 ? 'text-text-error' : 'text-accent'}
                                    overlay={<>{missCount > 0 ? w[0] : '?'}<Caret /></>} />
                            );
                        }
                        return (
                            <MaskedWord key={i} word={w} hidden
                                className="select-none"
                                overlayClassName="justify-center text-text-dim/60"
                                overlay="·" />
                        );
                    })}
                </div>
            ) : (
                <div className="p-5 rounded-2xl block-blue animate-pop max-w-md">
                    <div className="flex items-baseline gap-3 mb-1">
                        <span className="text-3xl font-display font-extrabold text-text-primary tabular-nums">{accuracy}%</span>
                        <span className="text-xs text-text-dim">{hits}/{results.length} first try</span>
                    </div>
                    <p className="text-xs text-text-muted mb-4">Sprint finished. How solid did it feel?</p>
                    <GradeButtons busy={busy} onFail={() => finishParagraph('fail')} onPass={() => finishParagraph('pass')} passLabel="Got it" />
                </div>
            )}
        </div>
    );
}

// ── OPENINGS — drill each paragraph's opening from its transition cue ────────

function OpeningsMode({ essay, paragraphs, onScheduled, onNext, nextLabel, onEdit }) {
    const structure = essay.parsedStructure || {};
    const paras = paragraphs || allParagraphsOf(essay);
    const [pIndex, setPIndex] = useState(0);
    const [typed, setTyped] = useState('');
    const [revealed, setRevealed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [saveOk, setSaveOk] = useState(true);
    const textareaRef = useRef(null);

    const reset = () => { setPIndex(0); setTyped(''); setRevealed(false); setDone(false); setSaveOk(true); };

    useEffect(() => { textareaRef.current?.focus(); }, [pIndex]);

    if (!paras.length) return <EmptyModeNote onEdit={onEdit}>This essay has no paragraphs to practise yet.</EmptyModeNote>;
    if (done) return <SessionDone onRestart={reset} onNext={onNext} nextLabel={nextLabel} saveOk={saveOk} />;

    const para = paras[pIndex];
    const sourceIdx = para.sourceIndex ?? pIndex;
    const target = para.topicSentence || splitSentences(para.text)[0] || '';
    const prevInEssay = previousSectionOf(essay, sourceIdx);
    const cue = !prevInEssay
        ? (structure.thesis ? `Your thesis: "${structure.thesis}" — write your opening.` : 'Write your opening.')
        : `${prevInEssay.label} ended: "${lastSentence(prevInEssay.text)}" — write the next opening.`;

    const diff = diffWords(target, typed);
    const accuracy = diffAccuracy(diff);

    const goNext = async () => {
        setBusy(true);
        try {
            await api.submitReview('essayParagraph', paragraphItemId(essay.id, sourceIdx), accuracy >= 70 ? 'pass' : 'fail', {
                mode: 'openings',
                accuracy,
            });
            onScheduled?.();
        } catch { setSaveOk(false); }
        setBusy(false);
        if (pIndex + 1 < paras.length) { setPIndex((i) => i + 1); setTyped(''); setRevealed(false); }
        else setDone(true);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-dim">
                    Opening of {para.label} · {pIndex + 1} of {paras.length}
                </span>
            </div>
            <ProgressBar value={pIndex} total={paras.length} />
            <p className="text-sm text-text-muted italic mb-5 px-4 py-3 bg-surface-body rounded-xl border border-line-soft">{cue}</p>

            <div className="grid lg:grid-cols-2 gap-5 lg:gap-6 items-start">
                <div>
                    <textarea
                        ref={textareaRef}
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        placeholder="Type this paragraph's opening sentence from memory…"
                        rows={4}
                        className="w-full px-4 py-3 rounded-2xl bg-surface-body border border-line-soft text-text-primary placeholder:text-text-dim outline-none focus:border-accent transition-colors font-serif text-base resize-none"
                        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && typed.trim()) goNext(); }}
                    />
                    <div className="flex items-center justify-between gap-3 mt-3">
                        <SneakPeek text={target} label="Sneak peek" />
                        <button type="button" disabled={busy || !typed.trim()} onClick={goNext}
                            className="btn-primary inline-flex press disabled:opacity-40">
                            {pIndex + 1 < paras.length ? 'Next opening →' : 'Finish'}
                        </button>
                    </div>
                    <p className="text-xs text-text-dim mt-2">Transitions win marks: cue → opening, again and again.</p>
                </div>
                <div className="lg:sticky lg:top-24 self-start">
                    <LiveCheck target={target} typed={typed} currentHint="dashes" showRemaining title="Live check" />
                    {!revealed ? (
                        <button type="button" onClick={() => setRevealed(true)}
                            className="mt-3 text-sm font-medium text-accent hover:opacity-70 transition-opacity">
                            Reveal the opening
                        </button>
                    ) : (
                        <p className="mt-3 p-4 rounded-2xl block-cream font-serif text-sm leading-relaxed text-text-primary">{target}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── SENTENCE BY SENTENCE — rebuild the essay one sentence at a time ─────────

const SENTENCE_HINTS = [
    { key: 'readFirst', label: 'Read first' },
    { key: 'firstWord', label: 'First word only' },
];

const startingPhase = (hintStyle) => (hintStyle === 'firstWord' ? 'type' : 'read');

function SentenceMode({ essay, paragraphs, onScheduled, onNext, nextLabel, onEdit }) {
    const paras = paragraphs || allParagraphsOf(essay);
    const [hintStyle, setHintStyle] = useState('readFirst');
    const [pIndex, setPIndex] = useState(0);
    const [sIndex, setSIndex] = useState(0);
    const [phase, setPhase] = useState('read'); // 'read' | 'type'
    const [typed, setTyped] = useState('');
    const [revealed, setRevealed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [saveOk, setSaveOk] = useState(true);
    const textareaRef = useRef(null);

    const reset = () => { setPIndex(0); setSIndex(0); setPhase(startingPhase(hintStyle)); setTyped(''); setRevealed(false); setDone(false); setSaveOk(true); };

    useEffect(() => { if (phase === 'type') textareaRef.current?.focus(); }, [phase, sIndex, pIndex]);
    useEffect(() => { setPhase(startingPhase(hintStyle)); setTyped(''); setRevealed(false); }, [hintStyle]);

    if (!paras.length) return <EmptyModeNote onEdit={onEdit}>This essay has no paragraphs to practise yet.</EmptyModeNote>;
    if (done) return <SessionDone onRestart={reset} onNext={onNext} nextLabel={nextLabel} saveOk={saveOk} />;

    const para = paras[pIndex];
    const sourceIdx = para.sourceIndex ?? pIndex;
    const sentences = splitSentences(para.text);
    const sentence = sentences[sIndex] || '';
    const total = sentences.length;
    const firstWord = sentence.split(/\s+/)[0] || '';
    const rest = sentence.slice(firstWord.length).trimStart();
    const targetText = hintStyle === 'firstWord' ? rest : sentence;

    const graded = diffWords(targetText, typed);
    const accuracy = diffAccuracy(graded);

    const goNext = async () => {
        const recall = accuracy >= 70 ? 'pass' : 'fail';
        if (sIndex + 1 < total) { setSIndex((i) => i + 1); setPhase(startingPhase(hintStyle)); setTyped(''); setRevealed(false); }
        else {
            setBusy(true);
            try { await api.submitReview('essayParagraph', paragraphItemId(essay.id, sourceIdx), recall); onScheduled?.(); } catch { setSaveOk(false); }
            setBusy(false);
            if (pIndex + 1 < paras.length) { setPIndex((i) => i + 1); setSIndex(0); setPhase(startingPhase(hintStyle)); setTyped(''); setRevealed(false); }
            else setDone(true);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
                <span className="text-xs font-medium text-text-dim">{para.label} · Sentence {sIndex + 1}/{total}{para.heading ? ` · ${para.heading}` : ''}</span>
                <HintToggle options={SENTENCE_HINTS} value={hintStyle} onChange={setHintStyle} />
            </div>
            <ProgressBar value={pIndex} total={paras.length} />

            {phase === 'read' ? (
                <div>
                    <p className="text-xs font-medium text-text-dim mb-3">Read this sentence, then hide it and type it from memory.</p>
                    <div className="p-6 rounded-2xl block-blue min-h-[80px] flex items-center shadow-card">
                        <p className="font-serif text-base md:text-lg leading-relaxed text-text-primary">{sentence}</p>
                    </div>
                    <button type="button" onClick={() => setPhase('type')}
                        className="btn-primary mt-5 inline-flex items-center gap-2 press">
                        Hide &amp; type
                    </button>
                </div>
            ) : (
                <div className="grid lg:grid-cols-2 gap-5 lg:gap-6 items-start">
                    {/* Left — write it */}
                    <div>
                        {hintStyle === 'firstWord' ? (
                            <div className="flex items-baseline gap-2 mb-3 p-4 bg-surface-body rounded-2xl border border-line-soft">
                                <span className="text-lg font-bold font-serif text-accent">{firstWord}</span>
                                <span className="text-text-dim text-sm">… finish the sentence</span>
                            </div>
                        ) : (
                            <div className="p-3 rounded-2xl bg-surface-body border-2 border-dashed border-line-soft text-text-dim italic text-xs mb-3 font-serif">
                                Sentence hidden — type it from memory.
                            </div>
                        )}
                        <textarea
                            ref={textareaRef}
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                            placeholder={hintStyle === 'firstWord' ? 'Complete the sentence…' : 'Type the sentence from memory…'}
                            rows={5}
                            className="w-full px-4 py-3 rounded-2xl bg-surface-body border border-line-soft text-text-primary placeholder:text-text-dim outline-none focus:border-accent transition-colors font-serif text-base resize-none"
                            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && typed.trim()) goNext(); }}
                        />
                        <div className="flex items-center justify-between gap-3 mt-3">
                            <SneakPeek text={sentence} label="Sneak peek" />
                            <div className="flex items-center gap-2">
                                {typed.trim() && (
                                    <button type="button" onClick={() => { setTyped(''); setRevealed(false); textareaRef.current?.focus(); }}
                                        className="text-sm font-semibold text-text-dim border border-line-soft rounded-xl px-4 py-2.5 hover:border-text-dim transition-colors">
                                        Clear
                                    </button>
                                )}
                                <button type="button" disabled={busy || !typed.trim()} onClick={goNext}
                                    className="btn-primary inline-flex press disabled:opacity-40">
                                    {sIndex + 1 < total ? 'Next sentence →' : pIndex + 1 < paras.length ? 'Next paragraph →' : 'Finish'}
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-text-dim mt-2">Checks live as you type · Cmd/Ctrl+Enter for next</p>
                    </div>

                    {/* Right — live check, always beside your typing */}
                    <div className="lg:sticky lg:top-24 self-start">
                        <LiveCheck
                            target={targetText}
                            typed={typed}
                            prefix={hintStyle === 'firstWord' ? `${firstWord} ` : ''}
                            currentHint="dashes"
                            showRemaining
                            title="Live check"
                        />
                        {!revealed ? (
                            <button type="button" onClick={() => setRevealed(true)}
                                className="mt-3 text-sm font-medium text-accent hover:opacity-70 transition-opacity">
                                Reveal full sentence
                            </button>
                        ) : (
                            <p className="mt-3 p-4 rounded-2xl block-cream font-serif text-sm leading-relaxed text-text-primary">{sentence}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── EXAM RUN — write the whole selection from memory, no hints, timed ────────

const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
};

function ExamRunMode({ essay, paragraphs, onScheduled, onNext, nextLabel, onEdit }) {
    const structure = essay.parsedStructure || {};
    const paras = paragraphs || allParagraphsOf(essay);
    const [typed, setTyped] = useState('');
    const [phase, setPhase] = useState('write'); // 'write' | 'report' | 'done'
    const [showLive, setShowLive] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [startedAt, setStartedAt] = useState(null);
    const [busy, setBusy] = useState(false);
    const [saveOk, setSaveOk] = useState(true);
    const [saved, setSaved] = useState(false);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (!startedAt || phase !== 'write') return undefined;
        const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
        return () => clearInterval(id);
    }, [startedAt, phase]);

    const reset = () => { setTyped(''); setPhase('write'); setElapsed(0); setStartedAt(null); setSaveOk(true); setSaved(false); };

    if (!paras.length) return <EmptyModeNote onEdit={onEdit}>This essay has no paragraphs to practise yet.</EmptyModeNote>;
    if (phase === 'done') return <SessionDone onRestart={reset} onNext={onNext} nextLabel={nextLabel} saveOk={saveOk} />;

    const targetJoined = paras.map((p) => p.text).join('\n\n');
    const targetWords = wordCountOf(targetJoined);
    const typedWords = wordCountOf(typed);

    // Per-paragraph report: align typed paragraphs with the selection when the
    // student separated them with blank lines; otherwise score the whole run.
    const typedParas = typed.split(/\n\s*\n+/).map((t) => t.trim()).filter(Boolean);
    const aligned = typedParas.length === paras.length;
    const paraResults = paras.map((p, i) => {
        const target = p.text;
        const attempt = aligned ? typedParas[i] : typed;
        const diff = diffWords(target, attempt);
        return { para: p, accuracy: diffAccuracy(diff) };
    });
    const overall = aligned
        ? Math.round(paraResults.reduce((sum, r) => sum + r.accuracy * wordCountOf(r.para.text), 0) / Math.max(1, targetWords))
        : diffAccuracy(diffWords(targetJoined, typed));

    const saveResults = async () => {
        setBusy(true);
        let ok = true;
        for (const r of paraResults) {
            const sourceIdx = r.para.sourceIndex ?? 0;
            const accuracy = aligned ? r.accuracy : overall;
            try {
                await api.submitReview('essayParagraph', paragraphItemId(essay.id, sourceIdx), accuracy >= 75 ? 'pass' : 'fail', {
                    mode: 'exam_run',
                    accuracy,
                });
            } catch { ok = false; }
        }
        setSaveOk(ok);
        setSaved(true);
        setBusy(false);
        onScheduled?.();
        setPhase('done');
    };

    if (phase === 'report') {
        return (
            <div>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div className="flex items-center gap-5">
                        <AccuracyRing value={overall} size={80} label={`Overall accuracy ${overall} percent`} />
                        <p className="text-[11px] font-bold uppercase tracking-widest text-text-dim">Exam run complete</p>
                    </div>
                    <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                        <div><dt className="inline text-text-dim">Written </dt><dd className="inline font-bold text-text-primary tabular-nums">{typedWords}/{targetWords} words</dd></div>
                        <div><dt className="inline text-text-dim">Time </dt><dd className="inline font-bold text-text-primary tabular-nums">{formatDuration(elapsed)}</dd></div>
                    </dl>
                </div>
                {!aligned && paras.length > 1 && (
                    <p className="text-xs text-text-dim mb-4">Tip: separate paragraphs with a blank line next time for a per-paragraph report.</p>
                )}
                {aligned && (
                    <div className="space-y-2 mb-6">
                        {paraResults.map((r, i) => {
                            const verdict = accuracyVerdict(r.accuracy);
                            return (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="w-24 shrink-0 truncate text-xs font-bold text-text-dim">{r.para.label || `¶${i + 1}`}</span>
                                    <div className="h-2 flex-1 bg-line-soft rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-500 ${VERDICT_CLASS[`${verdict}Fill`]}`} style={{ width: `${r.accuracy}%` }} />
                                    </div>
                                    <span className={`text-xs font-bold tabular-nums w-10 text-right ${VERDICT_CLASS[verdict]}`}>{r.accuracy}%</span>
                                </div>
                            );
                        })}
                    </div>
                )}
                <details className="mb-6">
                    <summary className="cursor-pointer text-sm font-semibold text-accent">Compare with the original</summary>
                    <div className="mt-3 grid md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-surface-body border border-line-soft">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim mb-2">You wrote</p>
                            <p className="font-serif text-sm leading-relaxed whitespace-pre-wrap text-text-primary">{typed || '(nothing)'}</p>
                        </div>
                        <div className="p-4 rounded-2xl block-cream">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim mb-2">Original</p>
                            <p className="font-serif text-sm leading-relaxed whitespace-pre-wrap text-text-primary">{targetJoined}</p>
                        </div>
                    </div>
                </details>
                <div className="flex flex-wrap items-center gap-3">
                    <button type="button" disabled={busy || saved} onClick={saveResults}
                        className="btn-primary inline-flex press disabled:opacity-40">
                        {busy ? 'Saving…' : 'Save results'}
                    </button>
                    <button type="button" disabled={busy} onClick={() => setPhase('write')}
                        className="btn-secondary inline-flex press">
                        Keep writing
                    </button>
                    <button type="button" disabled={busy} onClick={() => setPhase('done')}
                        className="text-sm font-semibold text-text-dim hover:text-text-primary transition-colors">
                        Skip saving
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
                <span className="text-xs font-medium text-text-dim">
                    Exam conditions — {paras.length} paragraph{paras.length === 1 ? '' : 's'}, {targetWords} words
                </span>
                <span className="text-xs font-bold text-text-primary tabular-nums" aria-live="off">{startedAt ? formatDuration(elapsed) : 'Timer starts when you type'}</span>
            </div>
            <p className="text-sm text-text-muted italic mb-5 px-4 py-3 bg-surface-body rounded-xl border border-line-soft">
                {structure.thesis ? `Your thesis: "${structure.thesis}"` : 'Write your selection from memory, start to finish.'}
            </p>

            <textarea
                ref={textareaRef}
                value={typed}
                onChange={(e) => { if (!startedAt) setStartedAt(Date.now()); setTyped(e.target.value); }}
                placeholder="No hints, no peeking — write the whole selection from memory. Separate paragraphs with a blank line."
                rows={14}
                className="w-full px-4 py-3 rounded-2xl bg-surface-body border border-line-soft text-text-primary placeholder:text-text-dim outline-none focus:border-accent transition-colors font-serif text-sm leading-relaxed resize-y"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-text-dim tabular-nums">{typedWords}/{targetWords} words</span>
                    <button type="button" onClick={() => setShowLive((v) => !v)}
                        className="text-xs font-semibold text-text-dim hover:text-text-primary transition-colors underline decoration-dotted">
                        {showLive ? 'Hide live check' : 'Show live check (practice mode)'}
                    </button>
                </div>
                <button type="button" disabled={!typed.trim()} onClick={() => setPhase('report')}
                    className="btn-primary inline-flex press disabled:opacity-40">
                    Finish &amp; mark
                </button>
            </div>
            {showLive && (
                <div className="mt-5">
                    <LiveCheck target={targetJoined} typed={typed} currentHint="none" title="Live check" />
                </div>
            )}
        </div>
    );
}

// ── Consolidated tools: one Rebuild (unit toggle), one Review (style toggle) ─

const REBUILD_UNITS = [
    { key: 'words', label: 'Word by word' },
    { key: 'sentences', label: 'Sentence by sentence' },
];

function RebuildMode({ initialUnit = 'words', ...props }) {
    const [unit, setUnit] = useState(initialUnit);
    return (
        <div>
            <div className="flex items-center justify-end gap-2 mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Unit</span>
                <HintToggle options={REBUILD_UNITS} value={unit} onChange={setUnit} />
            </div>
            {unit === 'words'
                ? <GuidedTypeMode key="words" {...props} />
                : <SentenceMode key="sentences" {...props} />}
        </div>
    );
}

const REVIEW_STYLES = [
    { key: 'cloze', label: 'Cloze cards' },
    { key: 'write', label: 'Write the openings' },
];

function ReviewMode({ initialStyle = 'cloze', ...props }) {
    const [style, setStyle] = useState(initialStyle);
    return (
        <div>
            <div className="flex items-center justify-end gap-2 mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Style</span>
                <HintToggle options={REVIEW_STYLES} value={style} onChange={setStyle} />
            </div>
            {style === 'cloze'
                ? <RecallChunks key="cloze" {...props} />
                : <OpeningsMode key="write" {...props} />}
        </div>
    );
}

// ── QUOTES + ORDER — extra drills with real completion states ───────────────

function QuoteDrill({ slide, onNext, nextLabel }) {
    const [done, setDone] = useState(false);
    const [session, setSession] = useState(0);
    if (done) return <SessionDone onRestart={() => { setDone(false); setSession((s) => s + 1); }} onNext={onNext} nextLabel={nextLabel} />;
    return (
        <div>
            <SlideRenderer key={session} slide={slide} onSubmit={() => {}} />
            <div className="flex justify-center mt-8 pt-6 border-t border-line-soft">
                <button type="button" onClick={() => setDone(true)} className="btn-secondary inline-flex press">
                    Finish this drill
                </button>
            </div>
        </div>
    );
}

// ── New essay form ──────────────────────────────────────────────────────────

function NewEssayForm({ onCreated }) {
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [sourceFile, setSourceFile] = useState('');
    const [model, setModel] = useState(DEFAULT_MODEL);
    const [pdfBusy, setPdfBusy] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    // Context sources collected up front, saved once the essay exists.
    const [pendingContext, setPendingContext] = useState([]);

    const onPdf = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setError(null);
        setPdfBusy(true);
        try {
            const extracted = stripPdfArtifacts(await extractPdfText(file));
            if (!extracted) { setError('No readable text in that PDF — try pasting instead.'); }
            else {
                // The extracted text is held behind the file's name rather than
                // dumped into the textarea for the student to tidy up.
                setText(extracted);
                setSourceFile(file.name);
                if (!title.trim()) setTitle(file.name.replace(/\.pdf$/i, ''));
            }
        } catch { setError('Could not read that PDF. Try pasting the text instead.'); }
        finally { setPdfBusy(false); }
    };

    const submit = async () => {
        setError(null);
        if (!title.trim()) return setError('Give your essay a title.');
        if (!text.trim()) return setError('Paste your essay or attach a PDF first.');
        setSubmitting(true);
        try {
            await onCreated({ title: title.trim(), text, model, context: pendingContext });
        } catch (e) {
            setError(e?.message || 'Could not save the essay.');
            setSubmitting(false);
        }
        // Note: don't set submitting=false on success — component unmounts when the route changes
    };

    return (
        <div className="pt-5">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-text-dim" htmlFor="new-essay-title">
                Essay
            </label>
            <input
                id="new-essay-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Essay title"
                className="w-full mb-3 px-4 py-3 rounded-xl bg-surface-body border border-line-soft text-text-primary placeholder:text-text-dim outline-none focus:border-accent transition-colors font-body"
            />
            {sourceFile ? (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-line-soft bg-surface-body px-4 py-3">
                    <span className="inline-flex min-w-0 items-center gap-2 text-sm">
                        <PaperClipIcon className="h-4 w-4 shrink-0 text-accent" />
                        <span className="truncate font-medium text-text-primary">{sourceFile}</span>
                        <span className="shrink-0 text-xs text-text-dim">{wordCountOf(text).toLocaleString()} words read</span>
                    </span>
                    <button type="button" onClick={() => { setText(''); setSourceFile(''); }}
                        className="shrink-0 text-xs font-bold text-text-dim hover:text-text-primary">Remove</button>
                </div>
            ) : (
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste your essay here, or attach it as a PDF."
                    rows={8}
                    aria-label="Essay text"
                    className="w-full px-4 py-3 rounded-xl bg-surface-body border border-line-soft text-text-primary placeholder:text-text-dim outline-none focus:border-accent transition-colors font-body resize-y"
                />
            )}

            <div className="mt-6 border-t border-line-soft pt-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-text-dim">Context <span className="font-medium normal-case tracking-normal text-text-dim">(optional)</span></p>
                <p className="mt-1 mb-3 text-sm text-text-muted">
                    Marker feedback, quote banks, background reading — what the assistant will reason from. Kept separate from your essay.
                </p>
                {pendingContext.length > 0 && (
                    <ul className="mb-3 space-y-2">
                        {pendingContext.map((doc, i) => (
                            <ContextDocRow
                                key={i}
                                doc={{ ...doc, id: i, chars: doc.content.length, preview: doc.content.slice(0, 160) }}
                                onDelete={() => setPendingContext((prev) => prev.filter((_, idx) => idx !== i))}
                            />
                        ))}
                    </ul>
                )}
                <AddContextForm
                    onAdd={async (doc) => { setPendingContext((prev) => [...prev, doc]); }}
                    disabled={pendingContext.length >= MAX_CONTEXT_DOCS}
                    disabledReason={`That is the ${MAX_CONTEXT_DOCS}-source limit — you can manage sources inside the essay too.`}
                />
            </div>

            {error && <p role="alert" className="text-sm text-text-error mt-4 font-medium">{error}</p>}
            <div className="flex flex-wrap items-center gap-3 mt-5 border-t border-line-soft pt-5">
                {!sourceFile && (
                    <label className="btn-secondary inline-flex items-center gap-2 cursor-pointer press">
                        <ArrowUpTrayIcon className="w-4 h-4" />
                        {pdfBusy ? 'Reading PDF…' : 'Attach essay PDF'}
                        <input type="file" accept="application/pdf" className="hidden" onChange={onPdf} disabled={pdfBusy} />
                    </label>
                )}
                <EssayModelPicker model={model} onChange={setModel} disabled={submitting || pdfBusy} />
                <button type="button" onClick={submit} disabled={submitting || pdfBusy}
                    className="btn-primary inline-flex items-center gap-2 press disabled:opacity-40">
                    <PlusIcon className="w-4 h-4" />
                    {submitting ? 'Setting up…' : 'Create workspace'}
                </button>
            </div>
            <p className="mt-3 text-xs font-medium leading-relaxed text-text-dim">
                Caplet uses AI to map the essay’s structure for practice. Your original wording is kept unchanged.
            </p>
        </div>
    );
}

function NewEssayComposer({ onCreated }) {
    const [open, setOpen] = useState(false);

    if (open) {
        return (
            <section className="surface-card md:p-8">
                <div className="flex items-start justify-between gap-4 mb-1">
                    <div>
                        <p className="card-section-title mb-2">New material</p>
                        <h2 className="font-display text-xl font-extrabold tracking-tight text-text-primary">Add an essay</h2>
                    </div>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="text-sm font-semibold text-text-dim hover:text-text-primary transition-colors"
                    >
                        Cancel
                    </button>
                </div>
                <NewEssayForm onCreated={onCreated} />
            </section>
        );
    }

    return (
        <section className="surface-card block-blue md:p-8">
            <div className="w-10 h-10 rounded-xl bg-surface-raised flex items-center justify-center mb-5">
                <PlusIcon className="w-5 h-5 text-accent" />
            </div>
            <h2 className="font-display text-xl font-extrabold tracking-tight text-text-primary">Start a new essay</h2>
            <p className="text-sm leading-relaxed text-text-muted mt-2 mb-5">Paste your draft or bring in a PDF. We’ll map the structure before you practise.</p>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="btn-primary inline-flex items-center gap-2 press"
            >
                <PlusIcon className="w-4 h-4" /> Add essay
            </button>
        </section>
    );
}

// ── Practice hub — every activity visible, guided chain intact ──────────────

const PRACTICE_STEPS = [
    { key: 'wordbyword', step: '1', label: 'Rebuild it', icon: PencilIcon, desc: 'Type it back — word by word or sentence by sentence.' },
    { key: 'letters', step: '2', label: 'First letters', icon: BoltIcon, desc: 'Sprint it from first letters only.' },
    { key: 'typeit', step: '3', label: 'Exam run', icon: DocumentTextIcon, desc: 'Write the whole selection, no hints, timed.' },
    { key: 'recall', step: '4', label: 'Review', icon: ClockIcon, desc: 'Cloze cards or written openings, on the schedule.' },
];

const DRILL_MODES = [
    { key: 'speed', label: 'Speed run', icon: RocketLaunchIcon },
    { key: 'quotes', label: 'Quote cards', icon: RectangleStackIcon },
    { key: 'order', label: 'Paragraph order', icon: ArrowsUpDownIcon },
];

// Old bookmarks may still carry the pre-consolidation mode keys — they open
// the merged tool with the matching option preselected.
const MODE_ALIASES = { sentence: 'wordbyword', openings: 'recall' };

const PRACTICE_MODE_KEYS = new Set([...PRACTICE_STEPS, ...DRILL_MODES].map((m) => m.key));

const modeLabel = (key) => [...PRACTICE_STEPS, ...DRILL_MODES].find((m) => m.key === key)?.label || key;

/** Pick exactly which paragraphs a practice session covers. */
function ScopePicker({ allParagraphs, scope, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const selected = scope || allParagraphs.map((p) => p.sourceIndex);

    useEffect(() => {
        if (!open) return undefined;
        const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    if (allParagraphs.length < 2) return null;

    // Reading order, not numeric order: the list mixes 'intro' and 'conclusion'
    // with numeric body indices, so sorting by value would throw them together
    // at one end. Ordering by position in the section list is always right.
    const order = allParagraphs.map((p) => p.sourceIndex);
    const toggle = (id) => {
        const nextSet = selected.includes(id) ? selected.filter((i) => i !== id) : [...selected, id];
        const next = order.filter((i) => nextSet.includes(i));
        if (!next.length) return; // never allow an empty selection
        onChange(next.length === allParagraphs.length ? null : next);
    };

    const label = !scope
        ? `All ${allParagraphs.length} sections`
        : `${scope.length} of ${allParagraphs.length} sections`;

    return (
        <div ref={ref} className="relative inline-block">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                    scope ? 'border-accent text-accent bg-accent-soft' : 'border-line-soft text-text-dim hover:border-text-dim hover:text-text-primary'
                }`}
            >
                <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
                Practising: {label}
                <ChevronDownIcon className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute top-full left-0 mt-1.5 w-80 max-w-[85vw] bg-surface-raised border border-line-soft rounded-xl overflow-hidden z-30 shadow-pop">
                    <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim">Choose sections</p>
                        <button type="button" onClick={() => onChange(null)} className="text-[10px] font-bold text-accent hover:opacity-70 transition-opacity">
                            Select all
                        </button>
                    </div>
                    <div className="max-h-72 overflow-y-auto pb-1">
                        {allParagraphs.map((p) => {
                            const checked = selected.includes(p.sourceIndex);
                            const snippet = (p.topicSentence || p.text || '').slice(0, 70);
                            return (
                                <label key={p.sourceIndex} className="flex items-start gap-2.5 px-3 py-2 cursor-pointer hover:bg-surface-soft/60 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggle(p.sourceIndex)}
                                        className="mt-0.5 h-4 w-4 rounded border-line-soft accent-[color:var(--accent,currentColor)]"
                                    />
                                    <span className="min-w-0">
                                        <span className="block text-xs font-bold text-text-primary">{p.label}</span>
                                        <span className="block text-[11px] font-medium text-text-dim truncate">{snippet}</span>
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function PracticeHub({ mode, onChange, dueCount, drills }) {
    const availableDrills = DRILL_MODES.filter((d) => drills[d.key]);
    const active = [...PRACTICE_STEPS, ...DRILL_MODES].find((m) => m.key === mode);

    if (mode && active) {
        // Compact bar while inside an activity — one tap back to the hub.
        const step = PRACTICE_STEPS.find((m) => m.key === mode);
        return (
            <section aria-label="Current essay practice" className="mb-6 rounded-2xl border border-line-soft bg-surface-raised px-4 py-3 shadow-card-hover">
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-dim">
                            {step ? `Step ${step.step} of ${PRACTICE_STEPS.length}` : 'Extra drill'}
                        </p>
                        <p className="font-display text-base font-extrabold tracking-tight text-text-primary truncate mt-0.5">{active.label}</p>
                    </div>
                    <button type="button" onClick={() => onChange(null)}
                        className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-line-soft px-3 py-2 text-xs font-bold text-text-dim hover:text-text-primary hover:border-text-dim transition-colors">
                        <Squares2X2Icon className="w-3.5 h-3.5" /> All activities
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section aria-label="Essay learning path" className="mb-6 rounded-2xl border border-line-soft bg-surface-raised p-3 md:p-4 shadow-card">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-2 mb-3">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-text-dim">Your learning path</p>
                    <p className="text-sm text-text-muted mt-1">Move from understanding to independent recall.</p>
                </div>
                {dueCount > 0 && (
                    <button type="button" onClick={() => onChange('recall')} className="text-xs font-bold text-accent hover:opacity-75 transition-opacity">
                        {dueCount} due now →
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
                {PRACTICE_STEPS.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => onChange(item.key)}
                            className="text-left rounded-2xl px-4 py-3.5 bg-surface-body text-text-primary hover:bg-accent-soft transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                        >
                            <span className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-text-dim">
                                Step {item.step}<Icon className="w-4 h-4" />
                            </span>
                            <span className="block font-display font-extrabold text-sm mt-3">{item.label}</span>
                            <span className="block text-xs leading-relaxed mt-1.5 text-text-muted">{item.desc}</span>
                        </button>
                    );
                })}
            </div>
            {availableDrills.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-2 pt-3">
                    <span className="text-xs font-bold text-text-dim">Extra drills:</span>
                    {availableDrills.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button key={item.key} type="button" onClick={() => onChange(item.key)}
                                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold bg-surface-body text-text-dim hover:text-text-primary transition-colors">
                                <Icon className="w-3.5 h-3.5" /> {item.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

// ── Workspace sections ──────────────────────────────────────────────────────

/**
 * Context sources chosen in the composer, handed to the workspace once the
 * essay row exists. Module-level (not state) so the hand-off survives the
 * route change from the library to /essays/:id.
 */
const pendingContextStore = {
    _byEssay: new Map(),
    put(essayId, docs) { if (docs?.length) this._byEssay.set(essayId, docs); },
    take(essayId) {
        const docs = this._byEssay.get(essayId);
        this._byEssay.delete(essayId);
        return docs;
    },
};

const WORKSPACE_TABS = [
    { key: 'overview', label: 'Document', icon: BookOpenIcon },
    { key: 'context', label: 'Context', icon: RectangleGroupIcon },
    { key: 'practice', label: 'Practice', icon: AcademicCapIcon },
    { key: 'edit', label: 'Edit', icon: PencilSquareIcon },
];

function EditPanel({ essay, onSaved, saving, parsing = false, error }) {
    const [title, setTitle] = useState(essay.title || '');
    const [text, setText] = useState(essay.originalText || '');
    const [model, setModel] = useState(DEFAULT_MODEL);
    const [localError, setLocalError] = useState(null);

    // Resync only when a DIFFERENT essay loads — resyncing on every server
    // refresh would wipe keystrokes typed while a save was in flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { setTitle(essay.title || ''); setText(essay.originalText || ''); }, [essay.id]);

    const textChanged = text !== (essay.originalText || '');
    const titleChanged = title.trim() !== (essay.title || '');
    const dirty = textChanged || titleChanged;

    const save = () => {
        setLocalError(null);
        if (!title.trim()) return setLocalError('Give your essay a title.');
        if (!text.trim()) return setLocalError('The essay text cannot be empty.');
        onSaved({ title: title.trim(), text, model, textChanged });
    };

    return (
        <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-text-dim mb-2" htmlFor="essay-edit-title">Title</label>
            <input
                id="essay-edit-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full mb-4 px-4 py-3 rounded-xl bg-surface-body border border-line-soft text-text-primary outline-none focus:border-accent transition-colors font-body"
            />
            <label className="block text-[11px] font-bold uppercase tracking-widest text-text-dim mb-2" htmlFor="essay-edit-text">Essay text</label>
            <textarea
                id="essay-edit-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={16}
                className="w-full px-4 py-3 rounded-xl bg-surface-body border border-line-soft text-text-primary outline-none focus:border-accent transition-colors font-serif text-sm leading-relaxed resize-y"
            />
            {(localError || error) && <p role="alert" className="text-sm text-text-error mt-3 font-medium">{localError || error}</p>}
            <div className="flex flex-wrap items-center gap-3 mt-4">
                {textChanged && <EssayModelPicker model={model} onChange={setModel} disabled={saving || parsing} />}
                <button type="button" onClick={save} disabled={saving || parsing || !dirty}
                    className="btn-primary inline-flex items-center gap-2 press disabled:opacity-40">
                    {saving ? 'Saving…' : parsing ? 'AI mapping in progress…' : textChanged ? 'Save & rescan' : 'Save changes'}
                </button>
                {!dirty && !saving && !parsing && <span className="text-xs font-medium text-text-dim">No changes yet.</span>}
            </div>
            <p className="mt-3 text-xs font-medium leading-relaxed text-text-dim">
                Changing the text rebuilds the practice structure with AI — your wording itself is never altered.
                Review items keep their schedule where paragraphs still match.
            </p>
        </div>
    );
}

function DeleteConfirm({ title, busy, error, onConfirm, onCancel }) {
    return (
        <div role="alertdialog" aria-label="Delete essay" className="rounded-2xl border border-line-error bg-surface-error p-5 mb-8">
            <p className="text-sm font-bold text-text-primary">Delete “{title}”?</p>
            <p className="text-sm text-text-muted mt-1">This removes the essay and its review schedule. There is no undo.</p>
            {error && <p role="alert" className="text-sm text-text-error mt-2 font-medium">{error}</p>}
            <div className="flex items-center gap-3 mt-4">
                {/* Destructive confirm — rose is a semantic danger fill that stays
                    dark in both themes, so the ink is literal white. */}
                <button type="button" disabled={busy} onClick={onConfirm}
                    className="text-sm font-semibold text-white bg-[color:var(--text-error)] rounded-xl px-5 py-2.5 hover:bg-[color:var(--text-error)] transition-colors disabled:opacity-40">
                    {busy ? 'Deleting…' : 'Delete essay'}
                </button>
                <button type="button" disabled={busy} onClick={onCancel}
                    className="text-sm font-semibold text-text-dim hover:text-text-primary transition-colors">
                    Keep it
                </button>
            </div>
        </div>
    );
}

// ── Workspace (one essay = one project) ─────────────────────────────────────

function EssayWorkspace({ essayId }) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [essay, setEssay] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [parseError, setParseError] = useState(null);
    const [parseModel, setParseModel] = useState(() => {
        const fromUrl = searchParams.get('model');
        return MODEL_OPTIONS.some((m) => m.id === fromUrl) ? fromUrl : DEFAULT_MODEL;
    });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [deleteError, setDeleteError] = useState(null);
    const [dueCount, setDueCount] = useState(0);
    // Workspace layer: sources the assistant reads from, margin notes, chat.
    const [contextDocs, setContextDocs] = useState([]);
    const [contextLoading, setContextLoading] = useState(true);
    const [contextBusy, setContextBusy] = useState(false);
    const [annotations, setAnnotations] = useState([]);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatSeed, setChatSeed] = useState(null);
    const [explaining, setExplaining] = useState(false);
    const [explainingIndex, setExplainingIndex] = useState(null);
    // Select-and-fix: one pending AI proposal at a time; nothing touches the
    // essay text until the student explicitly accepts it.
    // True while a speed run is live — collapses the workspace chrome so the
    // word stream owns the screen (MonkeyType-style focus mode).
    const [speedRunning, setSpeedRunning] = useState(false);
    const [proposal, setProposal] = useState(null);
    const [applyingFix, setApplyingFix] = useState(false);
    const [workspaceError, setWorkspaceError] = useState(null);
    // Guards async continuations against a workspace that switched essays.
    const essayIdRef = useRef(essayId);
    essayIdRef.current = essayId;

    const structure = essay?.parsedStructure || null;
    const tabParam = searchParams.get('tab');
    const tab = WORKSPACE_TABS.some((t) => t.key === tabParam) ? tabParam : 'overview';
    const modeParam = searchParams.get('mode');
    const mode = PRACTICE_MODE_KEYS.has(modeParam) ? modeParam : (MODE_ALIASES[modeParam] || null);
    const allParas = allParagraphsOf(essay);
    const scope = parseScope(searchParams.get('scope'), allParas);
    const scoped = scope ? allParas.filter((p) => scope.includes(p.sourceIndex)) : allParas;
    const setScope = (ids) => {
        const next = new URLSearchParams(searchParams);
        if (ids && ids.length && ids.length < allParas.length) next.set('scope', ids.join(','));
        else next.delete('scope');
        setSearchParams(next, { replace: true });
    };

    const setTab = (key) => {
        const next = new URLSearchParams(searchParams);
        if (key === 'overview') next.delete('tab'); else next.set('tab', key);
        next.delete('mode');
        setSearchParams(next);
    };
    const setMode = useCallback((key) => {
        const next = new URLSearchParams(searchParams);
        next.set('tab', 'practice');
        if (key) next.set('mode', key); else next.delete('mode');
        setSearchParams(next);
    }, [searchParams, setSearchParams]);
    const goEdit = useCallback(() => {
        const next = new URLSearchParams(searchParams);
        next.set('tab', 'edit');
        next.delete('mode');
        setSearchParams(next);
    }, [searchParams, setSearchParams]);

    const loadDue = useCallback(async () => {
        const data = await api.getDueReviewItems().catch(() => null);
        if (essayIdRef.current !== essayId) return;
        const items = data?.items || [];
        const prefix = `${essayId}:`;
        setDueCount(items.filter((it) => String(it.itemId).startsWith(prefix)).length);
    }, [essayId]);

    const parsingRef = useRef(false);
    const parse = useCallback(async ({ model, force = false } = {}) => {
        // One structural operation at a time: a parse racing a save could
        // persist a structure computed from superseded text (also guarded
        // server-side with a conditional write).
        if (parsingRef.current) return;
        parsingRef.current = true;
        setParsing(true);
        setParseError(null);
        try {
            const res = await api.parseEssay(essayId, { model: model || parseModel, force });
            if (essayIdRef.current === essayId) setEssay(res.essay);
        } catch (e) {
            if (essayIdRef.current === essayId) setParseError(e?.message || 'Could not map this essay right now.');
        } finally {
            parsingRef.current = false;
            if (essayIdRef.current === essayId) setParsing(false);
        }
    }, [essayId, parseModel]);

    // Load the essay; kick off the first parse automatically when arriving
    // from the composer (?setup=1) so creation flows straight into practice.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setLoadError(null);
            setProposal(null);
            try {
                const res = await api.getEssay(essayId);
                if (cancelled) return;
                setEssay(res.essay);
                if (!res.essay.parsedStructure && searchParams.get('setup') === '1') {
                    const next = new URLSearchParams(searchParams);
                    next.delete('setup');
                    next.delete('model');
                    setSearchParams(next, { replace: true });
                    parse({ model: parseModel });
                }
            } catch (e) {
                if (!cancelled) setLoadError(e?.status === 404 ? 'This essay does not exist (it may have been deleted).' : e?.message || 'Could not load this essay.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [essayId]);

    useEffect(() => { if (structure) loadDue(); }, [structure, loadDue]);

    // ── Context library + annotations ──────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setContextLoading(true);
            // Clear the previous essay's layer up front so a switch never
            // shows stale docs/notes while the new ones load.
            setContextDocs([]);
            setAnnotations([]);
            const [ctx, notes] = await Promise.all([
                api.getEssayContext(essayId).catch(() => null),
                api.getEssayAnnotations(essayId).catch(() => null),
            ]);
            if (cancelled) return;
            setContextDocs(ctx?.docs || []);
            // Merge, never clobber: a note added while this load was in
            // flight must survive it.
            setAnnotations((prev) => {
                const loaded = notes?.annotations || [];
                if (!prev.length) return loaded;
                const have = new Set(prev.map((a) => a.id));
                return [...loaded.filter((a) => !have.has(a.id)), ...prev];
            });
            setContextLoading(false);
            // Sources staged in the composer are saved once the essay exists.
            const staged = pendingContextStore.take(essayId);
            if (staged?.length) {
                for (const doc of staged) {
                    const res = await api.addEssayContext(essayId, doc).catch(() => null);
                    if (cancelled) return;
                    if (res?.doc) setContextDocs((prev) => [...prev, res.doc]);
                }
            }
        })();
        return () => { cancelled = true; };
    }, [essayId]);

    const addContext = useCallback(async (doc) => {
        setContextBusy(true);
        try {
            const res = await api.addEssayContext(essayId, doc);
            if (essayIdRef.current === essayId && res?.doc) setContextDocs((prev) => [...prev, res.doc]);
        } finally {
            if (essayIdRef.current === essayId) setContextBusy(false);
        }
    }, [essayId]);

    const removeContext = useCallback(async (docId) => {
        setContextBusy(true);
        try {
            await api.deleteEssayContext(essayId, docId);
            if (essayIdRef.current === essayId) setContextDocs((prev) => prev.filter((d) => d.id !== docId));
        } catch (e) {
            if (essayIdRef.current === essayId) setWorkspaceError(e?.message || 'Could not remove that source.');
        } finally {
            if (essayIdRef.current === essayId) setContextBusy(false);
        }
    }, [essayId]);

    const addAnnotation = useCallback(async (payload) => {
        setWorkspaceError(null);
        try {
            const res = await api.addEssayAnnotation(essayId, payload);
            if (essayIdRef.current === essayId && res?.annotation) {
                setAnnotations((prev) => [...prev, res.annotation]);
            }
            return res?.annotation;
        } catch (e) {
            if (essayIdRef.current === essayId) setWorkspaceError(e?.message || 'Could not save that note.');
            throw e;
        }
    }, [essayId]);

    const updateAnnotation = useCallback(async (annotationId, note) => {
        const trimmed = String(note || '').trim();
        if (!trimmed) return;
        setAnnotations((prev) => prev.map((a) => (a.id === annotationId ? { ...a, note: trimmed } : a)));
        await api.updateEssayAnnotation(essayId, annotationId, { note: trimmed }).catch((e) => {
            if (essayIdRef.current === essayId) setWorkspaceError(e?.message || 'Could not update that note.');
        });
    }, [essayId]);

    const deleteAnnotation = useCallback(async (annotationId) => {
        const previous = annotations;
        setAnnotations((prev) => prev.filter((a) => a.id !== annotationId));
        await api.deleteEssayAnnotation(essayId, annotationId).catch((e) => {
            if (essayIdRef.current !== essayId) return;
            setAnnotations(previous); // restore — the note is still on the server
            setWorkspaceError(e?.message || 'Could not delete that note.');
        });
    }, [essayId, annotations]);

    // paragraphIndex === null explains the whole essay; a number explains just
    // that paragraph (same endpoint, same replace-in-place semantics).
    const runExplain = useCallback(async (paragraphIndex = null) => {
        if (paragraphIndex === null) setExplaining(true);
        else setExplainingIndex(paragraphIndex);
        setWorkspaceError(null);
        try {
            const res = await api.explainEssay(essayId, { model: parseModel, paragraphIndex });
            if (essayIdRef.current !== essayId) return;
            const created = res?.annotations || [];
            setAnnotations((prev) => {
                const replaced = new Set(created.map((a) => `${a.paragraphIndex}`));
                const kept = prev.filter((a) => !(a.kind === 'explanation' && replaced.has(`${a.paragraphIndex}`)));
                return [...kept, ...created];
            });
        } catch (e) {
            if (essayIdRef.current === essayId) setWorkspaceError(e?.message || 'Could not explain the paragraphs right now.');
        } finally {
            if (essayIdRef.current === essayId) {
                if (paragraphIndex === null) setExplaining(false);
                else setExplainingIndex(null);
            }
        }
    }, [essayId, parseModel]);

    const explainParagraphs = useCallback(() => runExplain(null), [runExplain]);
    const explainOneParagraph = useCallback((index) => runExplain(index), [runExplain]);

    const sendChat = useCallback(async (messages) => {
        const res = await api.essayChat(essayId, { messages, model: parseModel });
        return res;
    }, [essayId, parseModel]);

    // ── Select-and-fix ──────────────────────────────────────────────────────
    // Draft: the AI reads everything (essay + context library + annotations)
    // and proposes a drop-in replacement for the selection. Rethrows so the
    // composer stays open with the complaint intact on failure.
    const requestFix = useCallback(async ({ paragraphIndex, anchor, instruction }) => {
        setWorkspaceError(null);
        try {
            const res = await api.rewriteEssay(essayId, {
                anchor, paragraphIndex, instruction, model: parseModel,
            });
            if (essayIdRef.current !== essayId) return;
            setProposal(res);
        } catch (e) {
            if (essayIdRef.current === essayId) setWorkspaceError(e?.message || 'Could not draft that fix right now.');
            throw e;
        }
    }, [essayId, parseModel]);

    // Accept: apply server-side (no AI call). The server patches the parsed
    // structure in place; if it could not, the structure comes back null and
    // a rescan starts automatically so the workspace never strands.
    const acceptFix = useCallback(async () => {
        if (!proposal) return;
        setApplyingFix(true);
        setWorkspaceError(null);
        try {
            const res = await api.applyEssayRewrite(essayId, {
                anchor: proposal.anchor,
                replacement: proposal.replacement,
                paragraphIndex: proposal.paragraphIndex,
            });
            if (essayIdRef.current !== essayId) return;
            setEssay(res.essay);
            setProposal(null);
            if (!res.essay.parsedStructure) parse({ model: parseModel });
        } catch (e) {
            if (essayIdRef.current === essayId) {
                setWorkspaceError(e?.message || 'Could not apply the fix.');
                if (e?.status === 409) setProposal(null); // stale — the text moved on
            }
        } finally {
            if (essayIdRef.current === essayId) setApplyingFix(false);
        }
    }, [essayId, proposal, parse, parseModel]);

    const discardFix = useCallback(() => setProposal(null), []);

    const askAboutSelection = useCallback((paragraphIndex, anchor) => {
        setChatSeed(anchor
            ? `In paragraph ${paragraphIndex + 1}, what should I understand about "${anchor}"?`
            : `Explain what paragraph ${paragraphIndex + 1} is doing and how it could be stronger.`);
        setChatOpen(true);
    }, []);

    const handleSaved = async ({ title, text, model, textChanged }) => {
        if (parsingRef.current) {
            setSaveError('AI mapping is in progress — wait for it to finish before saving.');
            return;
        }
        setSaving(true);
        setSaveError(null);
        try {
            const res = await api.updateEssay(essayId, { title, text });
            if (essayIdRef.current !== essayId) return;
            setEssay(res.essay);
            if (textChanged) {
                setProposal(null); // a pending fix was drafted against the old text
                setParseModel(model);
                setTab('overview');
                parse({ model });
            }
        } catch (e) {
            if (essayIdRef.current === essayId) setSaveError(e?.message || 'Could not save your changes.');
        } finally {
            if (essayIdRef.current === essayId) setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleteBusy(true);
        setDeleteError(null);
        try {
            await api.deleteEssay(essayId);
            navigate('/essays');
        } catch (e) {
            setDeleteError(e?.message || 'Could not delete the essay. Try again.');
            setDeleteBusy(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-surface-body flex items-center justify-center">
                <CapletLoader message="Opening your essay…" />
            </div>
        );
    }

    if (loadError || !essay) {
        return (
            <div className="min-h-screen bg-surface-body py-32">
                <div className="container-custom text-center">
                    <p className="text-text-primary font-bold">{loadError || 'Could not load this essay.'}</p>
                    <Link to="/essays" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:opacity-70 transition-opacity">
                        <ArrowLeftIcon className="w-4 h-4" /> All essays
                    </Link>
                </div>
            </div>
        );
    }

    const quoteCards = structure ? buildQuoteCards(structure) : null;
    const paragraphOrder = structure ? buildParagraphOrder(structure) : null;
    const drills = { speed: !!structure, quotes: !!quoteCards, order: !!paragraphOrder };
    const paragraphCount = structure?.bodyParagraphs?.length || 0;

    return (
        <div className={`selection:bg-accent selection:text-accent-contrast ${speedRunning ? 'min-h-screen bg-surface-body py-10' : 'minimal-page'}`}>
            <div className="container-custom">
                {!speedRunning && (
                    <Link to="/essays"
                        className="inline-flex items-center gap-2 text-sm font-medium text-text-dim hover:text-accent transition-colors mb-8">
                        <ArrowLeftIcon className="w-4 h-4" /> All essays
                    </Link>
                )}

                <div className={`flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6 ${speedRunning ? 'hidden' : 'flex'}`}>
                    <div className="min-w-0">
                        <span className="section-kicker">essay</span>
                        <h1 className="minimal-page-title break-words">{essay.title}</h1>
                        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-text-dim">
                            <span>{wordCountOf(essay.originalText)} words</span>
                            {structure && <span>{paragraphCount} body paragraph{paragraphCount === 1 ? '' : 's'}</span>}
                            {dueCount > 0 && (
                                <button type="button" onClick={() => setMode('recall')}
                                    className="inline-flex items-center gap-1.5 font-bold text-accent hover:opacity-75 transition-opacity">
                                    <ClockIcon className="w-3.5 h-3.5" /> {dueCount} due for review
                                </button>
                            )}
                        </div>
                    </div>
                    <button type="button" onClick={() => { setConfirmingDelete(true); setDeleteError(null); }}
                        className="btn-secondary shrink-0 inline-flex items-center gap-2 press hover:text-text-error">
                        <TrashIcon className="w-4 h-4" /> Delete
                    </button>
                </div>

                {confirmingDelete && (
                    <DeleteConfirm
                        title={essay.title}
                        busy={deleteBusy}
                        error={deleteError}
                        onConfirm={handleDelete}
                        onCancel={() => setConfirmingDelete(false)}
                    />
                )}

                {/* ── Workspace section tabs — hidden only while a speed run owns the screen ── */}
                <nav aria-label="Essay workspace sections" className={`mb-6 items-center gap-1 border-b border-line-soft ${speedRunning ? 'hidden' : 'flex'}`}>
                    {WORKSPACE_TABS.map((t) => {
                        const Icon = t.icon;
                        const active = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                type="button"
                                aria-current={active ? 'page' : undefined}
                                onClick={() => setTab(t.key)}
                                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 -mb-px transition-colors ${
                                    active
                                        ? 'border-accent text-accent'
                                        : 'border-transparent text-text-dim hover:text-text-primary'
                                }`}
                            >
                                <Icon className="w-4 h-4" /> {t.label}
                            </button>
                        );
                    })}
                </nav>

                {tab !== 'edit' && !structure && (
                    /* ── Setup: choose a model and map the structure ── */
                    <div className="surface-card block-blue px-8 py-12 text-center md:p-12">
                        {parsing ? (
                            <>
                                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-5" />
                                <p className="font-display text-lg font-extrabold tracking-tight text-text-primary mb-2">
                                    Preparing your essay
                                </p>
                                <p className="text-sm text-text-muted">
                                    Mapping the structure with {modelShort(parseModel)}. <CyclingMessage messages={PARSE_MESSAGES} />
                                </p>
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-8 h-8 text-accent mx-auto mb-5" />
                                <p className="text-base text-text-primary font-medium mb-2">
                                    Use AI to map this essay into its structure — introduction, thesis, body paragraphs, quotes and techniques — before you practise it.
                                </p>
                                <p className="mb-6 font-hand text-base text-accent -rotate-2 inline-block">
                                    Your original wording stays exactly as you wrote it.
                                </p>
                                {parseError && (
                                    <div role="alert" className="text-sm text-text-error mb-5 font-medium">
                                        <p className="mb-1">Your essay is saved, but AI mapping did not finish.</p>
                                        <p>{parseError}</p>
                                    </div>
                                )}
                                <div className="flex flex-wrap items-center justify-center gap-3">
                                    <EssayModelPicker model={parseModel} onChange={setParseModel} disabled={parsing || saving} />
                                    <button type="button" onClick={() => parse()} disabled={parsing || saving}
                                        className="btn-primary inline-flex items-center gap-2 press disabled:opacity-40">
                                        <SparklesIcon className="w-4 h-4" />
                                        {parseError ? 'Try setup again' : 'Set up practice'}
                                    </button>
                                </div>
                                <div className="mt-6">
                                    <button type="button" onClick={goEdit} className="text-sm font-semibold text-accent hover:opacity-70 transition-opacity">
                                        Edit the essay text first →
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {workspaceError && (
                    <p role="alert" className="mb-4 rounded-xl border border-line-error bg-surface-error px-4 py-2.5 text-sm font-medium text-text-error">
                        {workspaceError}
                    </p>
                )}

                {tab === 'overview' && structure && (
                    <div className="space-y-6">
                        <div className="surface-card md:p-8">
                            <AnnotatedDocument
                                essay={essay}
                                annotations={annotations}
                                onAdd={addAnnotation}
                                onUpdate={updateAnnotation}
                                onDelete={deleteAnnotation}
                                onExplain={explainParagraphs}
                                explaining={explaining}
                                onExplainOne={explainOneParagraph}
                                explainingIndex={explainingIndex}
                                onAskAI={askAboutSelection}
                                onRequestFix={requestFix}
                                proposal={proposal}
                                applyingFix={applyingFix}
                                onAcceptFix={acceptFix}
                                onDiscardFix={discardFix}
                            />
                        </div>
                        <div className="surface-card md:p-8">
                            <p className="mb-5 text-[11px] font-bold uppercase tracking-widest text-text-dim">Read it through</p>
                            <ReadMode essay={essay} onStartPractice={() => setMode('wordbyword')} />
                        </div>
                    </div>
                )}

                {tab === 'context' && (
                    <div className="surface-card md:p-8">
                        <ContextLibrary
                            docs={contextDocs}
                            loading={contextLoading}
                            busy={contextBusy}
                            onAdd={addContext}
                            onDelete={removeContext}
                        />
                    </div>
                )}

                {tab === 'practice' && structure && (
                    <div>
                        {!speedRunning && (
                            <>
                                <div className="mb-4 flex flex-wrap items-center gap-3">
                                    <ScopePicker allParagraphs={allParas} scope={scope} onChange={setScope} />
                                    {scope && (
                                        <span className="text-xs font-medium text-text-dim">
                                            Every activity below runs on just your selection.
                                        </span>
                                    )}
                                </div>
                                <PracticeHub mode={mode} onChange={setMode} dueCount={dueCount} drills={drills} />
                            </>
                        )}
                        {mode && (
                            <div
                                key={`${mode}-${scope ? scope.join('-') : 'all'}`}
                                /* A live speed run drops the card entirely and takes the
                                   viewport: no border, no fill, the words centred on the
                                   page ground. Every other drill keeps the card. */
                                className={speedRunning
                                    ? 'flex min-h-[calc(100vh-9rem)] flex-col justify-center'
                                    : 'surface-card min-h-[320px] flex flex-col justify-center md:p-8'}
                            >
                                {mode === 'wordbyword' && (
                                    <RebuildMode initialUnit={modeParam === 'sentence' ? 'sentences' : 'words'}
                                        essay={essay} paragraphs={scoped} onScheduled={loadDue} onEdit={goEdit}
                                        onNext={() => setMode('letters')} nextLabel={modeLabel('letters')} />
                                )}
                                {mode === 'letters' && (
                                    <FirstLettersMode essay={essay} paragraphs={scoped} onScheduled={loadDue} onEdit={goEdit}
                                        onNext={() => setMode('typeit')} nextLabel={modeLabel('typeit')} />
                                )}
                                {mode === 'typeit' && (
                                    <ExamRunMode essay={essay} paragraphs={scoped} onScheduled={loadDue} onEdit={goEdit}
                                        onNext={() => setMode('recall')} nextLabel={modeLabel('recall')} />
                                )}
                                {mode === 'recall' && (
                                    <ReviewMode initialStyle={modeParam === 'openings' ? 'write' : 'cloze'}
                                        essay={essay} paragraphs={scoped} onScheduled={loadDue} onEdit={goEdit}
                                        onNext={drills.quotes ? () => setMode('quotes') : () => setMode(null)}
                                        nextLabel={drills.quotes ? modeLabel('quotes') : 'all activities'} />
                                )}
                                {/* The speed run types the WHOLE essay — intro and conclusion
                                    included — unless the scope was actually narrowed. Passing
                                    the (always non-null) scoped list unconditionally would drop
                                    intro/conclusion from every run, since scoping is expressed
                                    in body-paragraph indices only. */}
                                {mode === 'speed' && <SpeedTypeMode essay={essay} paragraphs={scope ? scoped : null} onRunningChange={setSpeedRunning} />}
                                {mode === 'quotes' && (
                                    quoteCards
                                        ? <QuoteDrill slide={quoteCards}
                                            onNext={drills.order ? () => setMode('order') : () => setMode(null)}
                                            nextLabel={drills.order ? modeLabel('order') : 'all activities'} />
                                        : <EmptyModeNote>No quotes were found in this essay.</EmptyModeNote>
                                )}
                                {mode === 'order' && (
                                    paragraphOrder
                                        ? <QuoteDrill slide={paragraphOrder} onNext={() => setMode(null)} nextLabel="all activities" />
                                        : <EmptyModeNote>Need at least two body paragraphs to practise ordering.</EmptyModeNote>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'edit' && (
                    <div className="surface-card md:p-8">
                        <EditPanel essay={essay} onSaved={handleSaved} saving={saving} parsing={parsing} error={saveError} />
                    </div>
                )}
            </div>

            {/* Assistant — available from every tab, never in the way. */}
            {!chatOpen && !speedRunning && (
                <button
                    type="button"
                    onClick={() => setChatOpen(true)}
                    className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-bold text-accent-contrast shadow-card-hover press"
                >
                    <ChatBubbleLeftRightIcon className="h-4 w-4" /> Ask about this essay
                </button>
            )}
            <EssayChat
                open={chatOpen}
                onClose={() => setChatOpen(false)}
                onSend={sendChat}
                onAddAnnotation={(proposal) => addAnnotation({
                    paragraphIndex: proposal.paragraphIndex,
                    anchor: proposal.anchor || '',
                    note: proposal.note,
                    kind: 'note',
                })}
                contextCount={contextDocs.length}
                seed={chatSeed}
                onSeedConsumed={() => setChatSeed(null)}
            />
        </div>
    );
}

// ── Library (project gallery) ───────────────────────────────────────────────

function EssayLibrary() {
    const navigate = useNavigate();
    const [essays, setEssays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [dueByEssay, setDueByEssay] = useState({});
    const mountedRef = useRef(true);

    useReveal(undefined, [loading]);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const loadEssays = useCallback(async () => {
        setLoadError(false);
        const [essaysData, dueData] = await Promise.all([
            api.getEssays().catch(() => null),
            api.getDueReviewItems().catch(() => null),
        ]);
        if (!mountedRef.current) return;
        if (!essaysData) { setLoadError(true); return; }
        setEssays(essaysData.essays || []);
        const counts = {};
        (dueData?.items || []).forEach((it) => {
            const essayId = String(it.itemId).split(':')[0];
            counts[essayId] = (counts[essayId] || 0) + 1;
        });
        setDueByEssay(counts);
    }, []);

    useEffect(() => {
        (async () => {
            await loadEssays();
            if (mountedRef.current) setLoading(false);
        })();
    }, [loadEssays]);

    const handleCreate = async ({ title, text, model, context }) => {
        const res = await api.createEssay(title, text);
        pendingContextStore.put(res.essay.id, context);
        navigate(`/essays/${res.essay.id}?setup=1&model=${encodeURIComponent(model)}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-surface-body flex items-center justify-center">
                <CapletLoader message="Loading your essays…" />
            </div>
        );
    }

    return (
        <div className="minimal-page pb-16 selection:bg-accent selection:text-accent-contrast">
            <div className="container-custom">
                <header className="minimal-page-header reveal">
                    <span className="section-kicker">essay memoriser</span>
                    <h1 className="minimal-page-title">Learn it by heart.</h1>
                    <p className="minimal-page-description">
                        Every essay is its own workspace: read it, edit it, and practise it until it is word-perfect and exam-ready.
                    </p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-6 items-start reveal-stagger">
                    <section className="surface-card md:p-8">
                        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
                            <div>
                                <p className="card-section-title mb-1">Your library</p>
                                <h2 className="font-display text-2xl font-extrabold tracking-tight text-text-primary">Your essays</h2>
                            </div>
                            {essays.length > 0 && <span className="text-xs font-bold text-text-dim">{essays.length} saved</span>}
                        </div>
                        {loadError ? (
                            <div className="rounded-2xl border border-line-soft block-cream p-10 text-center">
                                <p className="text-text-primary text-sm font-bold">Could not load your essays.</p>
                                <button type="button" onClick={loadEssays} className="mt-3 text-sm font-semibold text-accent hover:opacity-70 transition-opacity">
                                    Try again
                                </button>
                            </div>
                        ) : essays.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-line-strong block-cream px-8 py-14 text-center">
                                <DocumentTextIcon className="w-8 h-8 text-text-dim mx-auto mb-4" />
                                <p className="text-text-primary text-sm font-bold">No essays yet.</p>
                                <p className="text-text-dim text-sm mt-1">Add one when you’re ready to start practising.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {essays.map((e) => {
                                    const due = dueByEssay[String(e.id)] || 0;
                                    return (
                                        <Link key={e.id} to={`/essays/${e.id}`}
                                            className="rounded-2xl border border-line-soft bg-surface-raised p-5 flex items-center justify-between gap-4 group card-lift focus-ring press">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                    e.parsed ? 'block-green' : 'bg-accent-soft'
                                                }`}>
                                                    {e.parsed
                                                        ? <BookOpenIcon className="w-4 h-4 text-[color:var(--mark-green)]" />
                                                        : <SparklesIcon className="w-4 h-4 text-accent" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate">{e.title}</p>
                                                    {e.excerpt && <p className="text-xs font-medium text-text-dim mt-1 truncate font-serif">{e.excerpt}</p>}
                                                    <p className="text-xs font-medium text-text-dim mt-1">
                                                        {typeof e.wordCount === 'number' ? `${e.wordCount} words · ` : ''}
                                                        {e.parsed ? `${e.paragraphCount} body paragraph${e.paragraphCount === 1 ? '' : 's'}` : 'Set-up needed — open to continue'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                {due > 0 && (
                                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-accent-soft text-accent">
                                                        {due} due
                                                    </span>
                                                )}
                                                <ArrowRightIcon className="w-4 h-4 text-text-dim group-hover:text-accent transition-colors" />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <aside>
                        <NewEssayComposer onCreated={handleCreate} />
                    </aside>
                </div>
            </div>
        </div>
    );
}

// ── Page — routes /essays (library) and /essays/:essayId (workspace) ────────

export default function EssayMemoriser() {
    const { essayId } = useParams();
    if (essayId) return <EssayWorkspace key={essayId} essayId={essayId} />;
    return <EssayLibrary />;
}
