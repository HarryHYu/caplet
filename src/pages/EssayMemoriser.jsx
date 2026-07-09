import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useReveal } from '../lib/useReveal';
import CapletLoader from '../components/CapletLoader';
import SlideRenderer from '../components/lesson/SlideRenderer';
import { extractPdfText } from '../lib/pdfExtract';
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
    DocumentTextIcon,
    PlusIcon,
    TrashIcon,
    ArrowLeftIcon,
    SparklesIcon,
    AcademicCapIcon,
    ArrowUpTrayIcon,
    ArrowRightIcon,
    EyeIcon,
    BookOpenIcon,
    PencilIcon,
    ChatBubbleBottomCenterTextIcon,
    ClockIcon,
    RectangleStackIcon,
    ArrowsUpDownIcon,
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

// ── Pure helpers ────────────────────────────────────────────────────────────

const normalise = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9']/g, '');

function diffWords(original, typed) {
    const origWords = String(original || '').trim().split(/\s+/).filter(Boolean);
    const typedWords = String(typed || '').trim().split(/\s+/).filter(Boolean);
    return origWords.map((word, i) => {
        const t = typedWords[i] || '';
        if (!t) return { word, status: 'missed' };
        if (normalise(t) === normalise(word)) return { word, status: 'correct' };
        return { word, status: 'wrong', typed: t };
    });
}

/** Replace every word with its first letter + dashes of matching length. */
function toLetterHint(text) {
    return String(text || '').trim().split(/(\s+)/).map((token) => {
        if (/^\s+$/.test(token)) return token;
        if (token.length <= 1) return token;
        return token[0] + '─'.repeat(token.length - 1);
    }).join('');
}

/** First letter of every word, concatenated — the hardest possible hint. */
function toAcronym(text) {
    return String(text || '').trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join('');
}

function splitSentences(text) {
    return String(text || '').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
}

function buildSpotlightSegments(structure) {
    const segs = [];
    if (structure.thesis)
        segs.push({ label: 'Thesis', text: structure.thesis, type: 'thesis' });
    (structure.bodyParagraphs || []).forEach((p, i) =>
        segs.push({ label: `Body ${i + 1}`, text: p.text, type: 'body', quotes: p.quotes, techniques: p.techniques }),
    );
    if (structure.conclusion)
        segs.push({ label: 'Conclusion', text: structure.conclusion, type: 'conclusion' });
    return segs;
}

// ── Shared UI ───────────────────────────────────────────────────────────────

/**
 * Live word-by-word check panel. Renders the target text as a scaffold and,
 * as `typed` grows, fills each position green (match) or amber (miss) — so the
 * checking surface sits *beside* the input and updates on every keystroke.
 * No submit, no scrolling back up to see how you did.
 *
 *  - currentHint  how to cue the word you're on: 'firstletter' | 'dashes' | 'none'
 *  - showRemaining faint dashes for words you haven't reached yet
 *  - prefix       a fixed lead-in shown before the scaffold (e.g. a given first word)
 */
function LiveCheck({ target, typed, currentHint = 'none', showRemaining = false, title = 'Live check', prefix = '' }) {
    const targetWords = String(target || '').trim().split(/\s+/).filter(Boolean);
    const raw = String(typed || '');
    const typedWords = raw.split(/\s+/).filter(Boolean);
    const midWord = raw.length > 0 && !/\s$/.test(raw); // last token still being typed
    const committed = midWord ? typedWords.length - 1 : typedWords.length;

    let correct = 0;
    for (let i = 0; i < committed; i++) {
        if (normalise(typedWords[i]) === normalise(targetWords[i] || '')) correct++;
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
                        const ok = normalise(typedWords[i]) === normalise(w);
                        if (ok) return <span key={i} className="text-emerald-600 dark:text-emerald-400">{w}</span>;
                        return (
                            <span key={i} className="rounded px-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                {w}<span className="line-through opacity-50 ml-1">{typedWords[i]}</span>
                            </span>
                        );
                    }
                    if (i === committed && !complete) {
                        const cue = currentHint === 'firstletter'
                            ? w[0] + '─'.repeat(Math.max(0, w.length - 1))
                            : currentHint === 'dashes'
                                ? '─'.repeat(w.length)
                                : '';
                        return (
                            <span key={i} className="font-bold text-accent border-b-2 border-accent">
                                {cue}<span className="inline-block align-middle w-0.5 h-4 bg-accent ml-0.5 animate-pulse" />
                            </span>
                        );
                    }
                    if (showRemaining) {
                        return <span key={i} className="text-text-dim select-none">{w[0]}{'─'.repeat(Math.max(0, w.length - 1))}</span>;
                    }
                    return null;
                })}
                {complete && <span className="ml-1 text-emerald-500 font-bold">✓</span>}
            </div>
        </div>
    );
}

function GradeButtons({ busy, onPass, onFail, passLabel = 'Got it' }) {
    return (
        <div className="flex items-center gap-3 mt-5">
            <button type="button" disabled={busy} onClick={onFail}
                className="text-sm font-semibold text-rose-500 border border-rose-400/60 rounded-xl px-5 py-2.5 hover:bg-rose-500 hover:text-white transition-colors disabled:opacity-40">
                Missed it
            </button>
            <button type="button" disabled={busy} onClick={onPass}
                className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/60 rounded-xl px-5 py-2.5 hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-40">
                {passLabel}
            </button>
        </div>
    );
}

/**
 * A "sneak peek" button — tap to reveal `text` in a floating card for a few
 * seconds (or tap again to dismiss early). Costs nothing, isn't scored; it's
 * just a safety net so a stuck student can check without failing the card.
 */
function SneakPeek({ text, label = 'Sneak peek', autoHideMs = 3500 }) {
    const [peeking, setPeeking] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    const toggle = () => {
        clearTimeout(timerRef.current);
        if (peeking) { setPeeking(false); return; }
        setPeeking(true);
        timerRef.current = setTimeout(() => setPeeking(false), autoHideMs);
    };

    if (!text) return null;

    return (
        <div className="relative inline-block">
            <button
                type="button"
                onClick={toggle}
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
                <div className="absolute z-20 left-0 top-full mt-2 w-72 sm:w-96 p-4 rounded-2xl bg-text-primary text-surface-body shadow-2xl font-serif text-sm leading-relaxed animate-[peekIn_0.15s_ease-out]">
                    {text}
                    <div className="absolute -top-1.5 left-5 w-3 h-3 bg-text-primary rotate-45" />
                </div>
            )}
            <style>{`@keyframes peekIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
}

/** A small pill-group toggle, used for in-mode hint-style switches. */
function HintToggle({ options, value, onChange }) {
    return (
        <div className="flex items-center gap-1 p-1 bg-surface-body rounded-full border border-line-soft">
            {options.map((opt) => (
                <button
                    key={opt.key}
                    type="button"
                    onClick={() => onChange(opt.key)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                        value === opt.key ? 'bg-accent text-white' : 'text-text-dim hover:text-text-primary'
                    }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

/** Thin progress bar tracking paragraph/step position within the current mode. */
function ProgressBar({ value, total }) {
    const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
    return (
        <div className="h-1.5 w-full bg-line-soft rounded-full overflow-hidden mb-5">
            <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
    );
}

/**
 * End-of-session screen. Optionally offers a "Continue to X" button so
 * finishing one practice mode naturally hands you off to the next stage of
 * the Read → Practice → Recall progression, instead of leaving you to hunt
 * for the next tab yourself.
 */
function SessionDone({ onRestart, nextLabel, onNext }) {
    return (
        <div className="text-center py-14">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5 animate-pop-in">
                <AcademicCapIcon className="w-7 h-7 text-emerald-500" />
            </div>
            <p className="font-display text-xl font-extrabold tracking-tight text-text-primary">Session complete</p>
            <p className="text-sm text-text-muted mt-2">Items rescheduled on the 1, 3, 7, 14 day ladder.</p>
            <div className="flex items-center justify-center gap-3 mt-6">
                <button type="button" onClick={onRestart}
                    className="btn-secondary inline-flex hover:-translate-y-0.5 transition-transform">
                    Restart
                </button>
                {onNext && (
                    <button type="button" onClick={onNext}
                        className="btn-primary inline-flex items-center gap-2 hover:-translate-y-0.5 transition-transform">
                        Continue to {nextLabel} <ArrowRightIcon className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}

// ── READ — story view, colour-annotated, or exactly as saved ────────────────

function SpotlightMode({ essay }) {
    const structure = essay.parsedStructure || {};
    const segments = buildSpotlightSegments(structure);
    const [idx, setIdx] = useState(0);

    if (!segments.length) return <p className="text-sm text-text-muted italic">Nothing to read yet.</p>;

    const seg = segments[idx];
    const bg =
        seg.type === 'thesis' ? 'block-blue' :
        seg.type === 'conclusion' ? 'block-cream' :
        'bg-surface-raised';

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-medium text-text-dim">{idx + 1} / {segments.length}</span>
                <div className="flex gap-1.5">
                    {segments.map((_, i) => (
                        <button key={i} onClick={() => setIdx(i)}
                            className={`w-2 h-2 rounded-full transition-colors ${i === idx ? 'bg-accent' : 'bg-line-soft hover:bg-text-dim'}`} />
                    ))}
                </div>
            </div>

            <div className={`${bg} rounded-3xl p-8 md:p-10 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] min-h-[180px]`}>
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent mb-4 block">{seg.label}</span>
                <p className="font-serif text-base md:text-lg leading-relaxed text-text-primary whitespace-pre-wrap">{seg.text}</p>
                {(seg.quotes || []).length > 0 && (
                    <div className="mt-6 space-y-2 border-t border-line-soft pt-5">
                        {seg.quotes.map((q, i) => (
                            <p key={i} className="text-sm font-serif text-text-muted italic">
                                &ldquo;{q.text}&rdquo;{q.highLeverage ? ' ⭐' : ''}
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
                    <ArrowLeftIcon className="w-4 h-4" /> Back
                </button>
                {idx + 1 < segments.length ? (
                    <button type="button" onClick={() => setIdx((i) => i + 1)}
                        className="btn-primary inline-flex items-center gap-2 hover:-translate-y-0.5 transition-transform">
                        Next <ArrowRightIcon className="w-4 h-4" />
                    </button>
                ) : (
                    <button type="button" onClick={() => setIdx(0)}
                        className="btn-secondary inline-flex hover:-translate-y-0.5 transition-transform">
                        Read again
                    </button>
                )}
            </div>
        </div>
    );
}

function AnnotatedLegend() {
    const items = [
        { swatch: 'bg-blue-200 dark:bg-blue-500/30', label: 'Thesis' },
        { swatch: 'bg-amber-200 dark:bg-amber-500/30', label: 'Topic sentence' },
        { swatch: 'bg-emerald-200 dark:bg-emerald-500/30', label: 'Quote' },
        { swatch: 'bg-emerald-300 dark:bg-emerald-500/50', label: 'High-leverage quote ⭐' },
        { swatch: 'bg-violet-200 dark:bg-violet-500/30', label: 'Conclusion' },
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
    return (
        <div className="relative pl-5 border-l-2 border-line-soft">
            <span className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-surface-raised border-2 border-accent flex items-center justify-center">
                <span className="text-[8px] font-bold text-accent">{index + 1}</span>
            </span>
            <p className="font-serif text-base leading-relaxed text-text-primary">
                {segments.map((seg, i) => {
                    if (seg.type === 'topic') {
                        return (
                            <span key={i} className="bg-amber-200 dark:bg-amber-500/30 rounded px-0.5">
                                {seg.text}
                            </span>
                        );
                    }
                    if (seg.type === 'quote') {
                        return (
                            <span key={i}
                                className={`rounded px-0.5 ${
                                    seg.meta?.highLeverage
                                        ? 'bg-emerald-300 dark:bg-emerald-500/50 font-medium'
                                        : 'bg-emerald-200 dark:bg-emerald-500/30'
                                }`}>
                                {seg.text}{seg.meta?.highLeverage ? ' ⭐' : ''}
                            </span>
                        );
                    }
                    return <span key={i}>{seg.text}</span>;
                })}
            </p>
            {(paragraph.techniques || []).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {paragraph.techniques.map((t, i) => (
                        <span key={i} className="text-[11px] font-semibold px-2.5 py-1 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-300 rounded-full">
                            {t}
                        </span>
                    ))}
                </div>
            )}
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
                {structure.thesis && (
                    <div className="p-5 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-2 block">Thesis</span>
                        <p className="font-serif text-base leading-relaxed text-text-primary bg-blue-200 dark:bg-blue-500/30 rounded px-0.5 inline">
                            {structure.thesis}
                        </p>
                    </div>
                )}

                {paras.length === 0 ? (
                    <p className="text-sm text-text-muted italic text-center py-8">No body paragraphs to annotate.</p>
                ) : (
                    <div className="space-y-8">
                        {paras.map((p, i) => <AnnotatedParagraphBlock key={i} paragraph={p} index={i} />)}
                    </div>
                )}

                {structure.conclusion && (
                    <div className="p-5 rounded-2xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200/60 dark:border-violet-500/20">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-violet-500 mb-2 block">Conclusion</span>
                        <p className="font-serif text-base leading-relaxed text-text-primary bg-violet-200 dark:bg-violet-500/30 rounded px-0.5 inline">
                            {structure.conclusion}
                        </p>
                    </div>
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

/**
 * "Read" — the natural first stop for any essay: skim it block-by-block
 * (Story), see its structure colour-coded (Annotated), or check exactly what
 * was saved with zero AI touch (Original). One tab, three lenses, so this
 * doesn't eat three separate slots in the practice nav.
 */
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

function RecallChunks({ essay, onScheduled, onNext, nextLabel }) {
    const structure = essay.parsedStructure || {};
    const paras = structure.bodyParagraphs || [];
    const [pIndex, setPIndex] = useState(0);
    const [graded, setGraded] = useState(false);
    const [busy, setBusy] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const [done, setDone] = useState(false);

    const reset = () => { setPIndex(0); setGraded(false); setRevealed(false); setDone(false); };

    if (!paras.length) return <p className="text-sm text-text-muted italic">No body paragraphs were found in this essay.</p>;
    if (done) return <SessionDone onRestart={reset} onNext={onNext} nextLabel={nextLabel} />;

    const current = paras[pIndex];
    const cloze = buildTopicSentenceCloze(current, pIndex);
    const cue = pIndex === 0
        ? (structure.thesis ? `Thesis: "${structure.thesis}"` : 'Recall your first body paragraph.')
        : `Previous paragraph ended: "${lastSentence(paras[pIndex - 1].text)}". What comes next?`;

    const grade = async (recall) => {
        setBusy(true);
        try {
            await api.submitReview('essayParagraph', paragraphItemId(essay.id, pIndex), recall);
            await Promise.all(
                (current.quotes || []).map((_, qIdx) =>
                    api.submitReview('quote', quoteItemId(essay.id, pIndex, qIdx), recall).catch(() => {}),
                ),
            );
            onScheduled?.();
        } catch (e) { console.warn('SRS submit failed:', e?.message || e); }
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
                <span className="text-xs font-medium text-text-dim">Paragraph {pIndex + 1} / {paras.length}</span>
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
                            className="text-sm font-medium text-accent hover:opacity-70 transition-opacity">
                            Show full paragraph
                        </button>
                    ) : (
                        <div className="p-5 rounded-2xl block-cream shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                            <p className="text-sm md:text-base text-text-primary leading-relaxed whitespace-pre-wrap font-serif">{current.text}</p>
                        </div>
                    )}
                    <button type="button" onClick={next}
                        className="btn-primary mt-5 inline-flex items-center gap-2 hover:-translate-y-0.5 transition-transform">
                        {pIndex + 1 < paras.length ? 'Next paragraph →' : 'Finish'}
                    </button>
                </div>
            )}
        </div>
    );
}

// ── WORD BY WORD — type one word at a time; next letter revealed as you go ──

function GuidedTypeMode({ essay, onScheduled, onNext, nextLabel }) {
    const structure = essay.parsedStructure || {};
    const paras = structure.bodyParagraphs || [];
    const [pIndex, setPIndex] = useState(0);
    const [wordIdx, setWordIdx] = useState(0);
    const [current, setCurrent] = useState('');
    const [history, setHistory] = useState([]); // [{target, typed, correct}]
    const [paraDone, setParaDone] = useState(false);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const inputRef = useRef(null);
    const currentRef = useRef(null);

    const reset = () => { setPIndex(0); setWordIdx(0); setCurrent(''); setHistory([]); setParaDone(false); setDone(false); };

    useEffect(() => { if (!paraDone) inputRef.current?.focus(); }, [pIndex, paraDone]);
    // Keep the word you're on visible inside its own scroll area, so a long
    // paragraph never pushes it (or the input) out of view.
    useEffect(() => { currentRef.current?.scrollIntoView({ block: 'nearest' }); }, [wordIdx, paraDone]);

    if (!paras.length) return <p className="text-sm text-text-muted italic">No body paragraphs found.</p>;
    if (done) return <SessionDone onRestart={reset} onNext={onNext} nextLabel={nextLabel} />;

    const para = paras[pIndex];
    const words = para.text.trim().split(/\s+/).filter(Boolean);
    const targetWord = words[wordIdx] || '';

    const commitWord = () => {
        const typed = current.trim();
        if (!typed || paraDone) return;
        const isCorrect = normalise(typed) === normalise(targetWord);
        const newHistory = [...history, { target: targetWord, typed, correct: isCorrect }];
        setHistory(newHistory);
        setCurrent('');
        if (wordIdx + 1 >= words.length) setParaDone(true);
        else setWordIdx((i) => i + 1);
    };

    const advance = async (recall) => {
        setBusy(true);
        try { await api.submitReview('essayParagraph', paragraphItemId(essay.id, pIndex), recall); onScheduled?.(); } catch { /* best-effort SRS scheduling — practice flow continues regardless */ }
        setBusy(false);
        if (pIndex + 1 < paras.length) {
            setPIndex((i) => i + 1); setWordIdx(0); setCurrent(''); setHistory([]); setParaDone(false);
        } else setDone(true);
    };

    const correct = history.filter((h) => h.correct).length;
    const accuracy = history.length ? Math.round((correct / history.length) * 100) : 0;

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-dim">Paragraph {pIndex + 1} / {paras.length}</span>
                <span className="text-xs font-medium text-text-dim tabular-nums">{correct}/{history.length} correct</span>
            </div>
            <ProgressBar value={pIndex} total={paras.length} />
            <p className="text-xs font-medium text-text-dim mb-4">Type each word. The next word's first letter appears as you go.</p>

            <div className="grid lg:grid-cols-2 gap-5 lg:gap-6 items-start">
                {/* Left — the word stream you're rebuilding (scrolls on its own) */}
                <div className="p-5 rounded-2xl block-cream font-serif text-sm md:text-base leading-relaxed flex flex-wrap gap-x-1.5 gap-y-1.5 content-start min-h-[220px] lg:min-h-[300px] max-h-[52vh] overflow-y-auto">
                    {words.map((w, i) => {
                        if (i < history.length) {
                            const h = history[i];
                            if (h.correct) return <span key={i} className="text-emerald-600 dark:text-emerald-400">{w}</span>;
                            return (
                                <span key={i} className="rounded px-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                    {w}<span className="line-through opacity-50 ml-1">{h.typed}</span>
                                </span>
                            );
                        }
                        if (i === wordIdx && !paraDone) {
                            return (
                                <span key={i} ref={currentRef} className="font-bold text-accent border-b-2 border-accent">
                                    {w[0]}{'─'.repeat(Math.max(0, w.length - 1))}
                                </span>
                            );
                        }
                        return (
                            <span key={i} className="text-text-dim select-none">
                                {w[0]}{'─'.repeat(Math.max(0, w.length - 1))}
                            </span>
                        );
                    })}
                </div>

                {/* Right — input + running score, pinned so it never scrolls away */}
                <div className="lg:sticky lg:top-24 self-start">
                    {!paraDone ? (
                        <div className="p-5 rounded-2xl bg-surface-body border border-line-soft">
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
                                    placeholder={targetWord ? `${targetWord[0]}…` : ''}
                                    className="flex-1 px-4 py-3 rounded-2xl bg-surface-body border border-line-soft text-text-primary placeholder:text-text-dim outline-none focus:border-accent transition-colors font-serif"
                                    autoComplete="off" autoCorrect="off" spellCheck={false}
                                />
                                <button type="button" onClick={commitWord} disabled={!current.trim()}
                                    className="btn-primary px-5 py-3 inline-flex hover:-translate-y-0.5 transition-transform disabled:opacity-40">
                                    <ArrowRightIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                                <p className="text-[10px] text-text-dim">Space or Enter to confirm</p>
                                <SneakPeek text={targetWord} label="Peek word" autoHideMs={2000} />
                            </div>
                        </div>
                    ) : (
                        <div className="p-5 rounded-2xl block-blue">
                            <div className="flex items-baseline gap-3 mb-1">
                                <span className="text-3xl font-display font-extrabold text-text-primary tabular-nums">{accuracy}%</span>
                                <span className="text-xs text-text-dim">{correct}/{history.length} words</span>
                            </div>
                            <p className="text-xs text-text-muted mb-4">Paragraph rebuilt. How did that feel?</p>
                            <GradeButtons busy={busy} onFail={() => advance('fail')} onPass={() => advance('pass')}
                                passLabel={accuracy >= 80 ? 'Got it' : 'Close enough'} />
                        </div>
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

/**
 * Merges the old "Sentences" (read → hide → type) and "Starts" (only the
 * first word is cued) flows into one tab with a hint-style toggle, since
 * they're the same underlying drill — just how much of a head start you get.
 */
function SentenceMode({ essay, onScheduled, onNext, nextLabel }) {
    const structure = essay.parsedStructure || {};
    const paras = structure.bodyParagraphs || [];
    const [hintStyle, setHintStyle] = useState('readFirst');
    const [pIndex, setPIndex] = useState(0);
    const [sIndex, setSIndex] = useState(0);
    const [phase, setPhase] = useState('read'); // 'read' | 'type'
    const [typed, setTyped] = useState('');
    const [revealed, setRevealed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const textareaRef = useRef(null);

    const reset = () => { setPIndex(0); setSIndex(0); setPhase(startingPhase(hintStyle)); setTyped(''); setRevealed(false); setDone(false); };

    useEffect(() => { if (phase === 'type') textareaRef.current?.focus(); }, [phase, sIndex, pIndex]);
    useEffect(() => { setPhase(startingPhase(hintStyle)); setTyped(''); setRevealed(false); }, [hintStyle]);

    if (!paras.length) return <p className="text-sm text-text-muted italic">No body paragraphs found.</p>;
    if (done) return <SessionDone onRestart={reset} onNext={onNext} nextLabel={nextLabel} />;

    const para = paras[pIndex];
    const sentences = splitSentences(para.text);
    const sentence = sentences[sIndex] || '';
    const total = sentences.length;
    const firstWord = sentence.split(/\s+/)[0] || '';
    const rest = sentence.slice(firstWord.length).trimStart();
    const targetText = hintStyle === 'firstWord' ? rest : sentence;

    const graded = diffWords(targetText, typed);
    const accuracy = graded.length ? Math.round((graded.filter((d) => d.status === 'correct').length / graded.length) * 100) : 0;

    const goNext = async () => {
        const recall = accuracy >= 70 ? 'pass' : 'fail';
        if (sIndex + 1 < total) { setSIndex((i) => i + 1); setPhase(startingPhase(hintStyle)); setTyped(''); setRevealed(false); }
        else {
            setBusy(true);
            try { await api.submitReview('essayParagraph', paragraphItemId(essay.id, pIndex), recall); onScheduled?.(); } catch { /* best-effort SRS scheduling — practice flow continues regardless */ }
            setBusy(false);
            if (pIndex + 1 < paras.length) { setPIndex((i) => i + 1); setSIndex(0); setPhase(startingPhase(hintStyle)); setTyped(''); setRevealed(false); }
            else setDone(true);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
                <span className="text-xs font-medium text-text-dim">Para {pIndex + 1}/{paras.length} · Sentence {sIndex + 1}/{total}</span>
                <HintToggle options={SENTENCE_HINTS} value={hintStyle} onChange={setHintStyle} />
            </div>
            <ProgressBar value={pIndex} total={paras.length} />

            {phase === 'read' ? (
                <div>
                    <p className="text-xs font-medium text-text-dim mb-3">Read this sentence, then hide it and type it from memory.</p>
                    <div className="p-6 rounded-2xl block-blue min-h-[80px] flex items-center shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                        <p className="font-serif text-base md:text-lg leading-relaxed text-text-primary">{sentence}</p>
                    </div>
                    <button type="button" onClick={() => setPhase('type')}
                        className="btn-primary mt-5 inline-flex items-center gap-2 hover:-translate-y-0.5 transition-transform">
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
                                    className="btn-primary inline-flex hover:-translate-y-0.5 transition-transform disabled:opacity-40">
                                    {sIndex + 1 < total ? 'Next sentence →' : pIndex + 1 < paras.length ? 'Next paragraph →' : 'Finish'}
                                </button>
                            </div>
                        </div>
                        <p className="text-[10px] text-text-dim mt-2">Checks live as you type · Cmd/Ctrl+Enter for next</p>
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

// ── TYPE IT — free-type a full paragraph; choose how much hint you get ──────

const TYPE_HINTS = [
    { key: 'none', label: 'No hint' },
    { key: 'letters', label: 'First letters' },
    { key: 'acronym', label: 'Acronym' },
];

/**
 * Merges the old "Type" (blank page), "Letters" (first letter of every word)
 * and "Acronym" (just the letters, hardest) tabs into one flow — they're the
 * exact same check-a-whole-paragraph mechanic, just a different hint above
 * the textarea. A toggle keeps that variety without three near-identical tabs.
 */
function TypeItMode({ essay, onScheduled, onNext, nextLabel }) {
    const structure = essay.parsedStructure || {};
    const paras = structure.bodyParagraphs || [];
    const [hint, setHint] = useState('letters');
    const [pIndex, setPIndex] = useState(0);
    const [typed, setTyped] = useState('');
    const [revealed, setRevealed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const textareaRef = useRef(null);

    const reset = () => { setPIndex(0); setTyped(''); setRevealed(false); setDone(false); };

    useEffect(() => { textareaRef.current?.focus(); }, [pIndex]);

    if (!paras.length) return <p className="text-sm text-text-muted italic">No body paragraphs found.</p>;
    if (done) return <SessionDone onRestart={reset} onNext={onNext} nextLabel={nextLabel} />;

    const current = paras[pIndex];
    const cue = pIndex === 0
        ? (structure.thesis ? `Thesis: "${structure.thesis}"` : 'First paragraph.')
        : `Previous ending: "${lastSentence(paras[pIndex - 1].text)}"`;
    const hintBlock = hint === 'letters' ? toLetterHint(current.text) : hint === 'acronym' ? toAcronym(current.text) : null;

    const diff = diffWords(current.text, typed);
    const accuracy = diff.length ? Math.round((diff.filter((d) => d.status === 'correct').length / diff.length) * 100) : 0;

    const advance = async (recall) => {
        setBusy(true);
        try { await api.submitReview('essayParagraph', paragraphItemId(essay.id, pIndex), recall); onScheduled?.(); } catch { /* best-effort SRS scheduling — practice flow continues regardless */ }
        setBusy(false);
        if (pIndex + 1 < paras.length) { setPIndex((i) => i + 1); setTyped(''); setRevealed(false); }
        else setDone(true);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
                <span className="text-xs font-medium text-text-dim">Paragraph {pIndex + 1} / {paras.length}</span>
                <HintToggle options={TYPE_HINTS} value={hint} onChange={setHint} />
            </div>
            <ProgressBar value={pIndex} total={paras.length} />
            <p className="text-sm text-text-muted italic mb-5 px-4 py-3 bg-surface-body rounded-xl border border-line-soft">{cue}</p>

            <div className="grid lg:grid-cols-2 gap-5 lg:gap-6 items-start">
                {/* Left — write the whole paragraph */}
                <div>
                    {hintBlock && (
                        <div className="p-4 rounded-2xl block-cream border border-line-soft mb-3">
                            <p className={
                                hint === 'acronym'
                                    ? 'font-mono text-sm md:text-base tracking-[0.15em] text-text-primary font-bold leading-relaxed break-all'
                                    : 'font-mono text-sm leading-relaxed tracking-wide text-text-dim select-none break-words'
                            }>
                                {hintBlock}
                            </p>
                        </div>
                    )}
                    <textarea
                        ref={textareaRef}
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        placeholder={hint === 'none' ? 'Type the paragraph from memory…' : 'Type the full paragraph using the hint…'}
                        rows={10}
                        className="w-full px-4 py-3 rounded-2xl bg-surface-body border border-line-soft text-text-primary placeholder:text-text-dim outline-none focus:border-accent transition-colors font-serif text-sm resize-none"
                    />
                    <div className="mt-3">
                        <SneakPeek text={current.text} label="Sneak peek" />
                    </div>
                </div>

                {/* Right — live check + grade, no scrolling to compare */}
                <div className="lg:sticky lg:top-24 self-start">
                    <LiveCheck
                        target={current.text}
                        typed={typed}
                        currentHint="none"
                        showRemaining={hint !== 'none'}
                        title="Live check"
                    />
                    {!revealed ? (
                        <button type="button" onClick={() => setRevealed(true)}
                            className="mt-3 text-sm font-medium text-accent hover:opacity-70 transition-opacity">
                            Reveal full paragraph
                        </button>
                    ) : (
                        <p className="mt-3 p-4 rounded-2xl block-cream font-serif text-sm leading-relaxed whitespace-pre-wrap text-text-primary">{current.text}</p>
                    )}
                    <div className="mt-5 pt-5 border-t border-line-soft">
                        <GradeButtons busy={busy || !typed.trim()} onFail={() => advance('fail')} onPass={() => advance('pass')}
                            passLabel={accuracy >= 75 ? 'Got it' : 'Close enough'} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── New essay form ──────────────────────────────────────────────────────────

function NewEssayForm({ onCreated }) {
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [pdfBusy, setPdfBusy] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const onPdf = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setError(null);
        setPdfBusy(true);
        try {
            const extracted = await extractPdfText(file);
            if (!extracted?.trim()) { setError('Could not read any text from that PDF.'); }
            else {
                setText((prev) => (prev.trim() ? `${prev}\n\n${extracted}` : extracted));
                if (!title.trim()) setTitle(file.name.replace(/\.pdf$/i, ''));
            }
        } catch { setError('Failed to read the PDF. Try pasting the text instead.'); }
        finally { setPdfBusy(false); }
    };

    const submit = async () => {
        setError(null);
        if (!title.trim()) return setError('Give your essay a title.');
        if (!text.trim()) return setError('Paste your essay or upload a PDF first.');
        setSubmitting(true);
        try {
            await onCreated(title.trim(), text);
        } catch (e) {
            setError(e?.message || 'Could not save the essay.');
            setSubmitting(false);
        }
        // Note: don't set submitting=false on success — component unmounts when essay navigates away
    };

    return (
        <div className="bg-surface-raised rounded-3xl p-6 md:p-8 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <h2 className="font-display text-lg font-extrabold tracking-tight text-text-primary mb-4">New essay</h2>
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Essay title"
                className="w-full mb-3 px-4 py-3 rounded-xl bg-surface-body border border-line-soft text-text-primary placeholder:text-text-dim outline-none focus:border-accent transition-colors font-body"
            />
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your essay here, or upload a PDF."
                rows={8}
                className="w-full px-4 py-3 rounded-xl bg-surface-body border border-line-soft text-text-primary placeholder:text-text-dim outline-none focus:border-accent transition-colors font-body resize-y"
            />
            {error && <p className="text-sm text-rose-400 mt-3 font-medium">{error}</p>}
            <div className="flex flex-wrap items-center gap-3 mt-4">
                <label className="btn-secondary inline-flex items-center gap-2 cursor-pointer hover:-translate-y-0.5 transition-transform">
                    <ArrowUpTrayIcon className="w-4 h-4" />
                    {pdfBusy ? 'Reading PDF…' : 'Upload PDF'}
                    <input type="file" accept="application/pdf" className="hidden" onChange={onPdf} disabled={pdfBusy} />
                </label>
                <button type="button" onClick={submit} disabled={submitting || pdfBusy}
                    className="btn-primary inline-flex items-center gap-2 hover:-translate-y-0.5 transition-transform disabled:opacity-40">
                    <PlusIcon className="w-4 h-4" />
                    {submitting ? 'Saving…' : 'Save and parse'}
                </button>
            </div>
        </div>
    );
}

// ── Essay detail ────────────────────────────────────────────────────────────

// Grouped so the tab bar reads as a progression — understand it, practise
// recalling it (three flavours), keep it long-term, then optional drills —
// instead of a flat wall of a dozen equally-weighted buttons.
const MODE_GROUPS = [
    {
        group: 'Understand',
        modes: [
            { key: 'read', label: 'Read', icon: BookOpenIcon, desc: 'Skim it block-by-block, see its structure colour-coded, or read exactly what you saved.' },
        ],
    },
    {
        group: 'Practice',
        modes: [
            { key: 'wordbyword', label: 'Word by word', icon: PencilIcon, next: 'sentence', desc: 'Type one word at a time — a hint for the next word appears once you confirm.' },
            { key: 'sentence', label: 'Sentence by sentence', icon: ChatBubbleBottomCenterTextIcon, next: 'typeit', desc: 'Rebuild the essay one sentence at a time, from a full read or just the first word.' },
            { key: 'typeit', label: 'Type it', icon: DocumentTextIcon, next: 'recall', desc: 'Type a whole paragraph from memory. Choose no hint, first letters, or just an acronym.' },
        ],
    },
    {
        group: 'Long-term',
        modes: [
            { key: 'recall', label: 'Recall', icon: ClockIcon, next: 'quotes', desc: 'Spaced-repetition cloze — the same 1/3/7/14-day ladder that keeps this essay in memory for exam day.' },
        ],
    },
    {
        group: 'Drills',
        modes: [
            { key: 'quotes', label: 'Quotes', icon: RectangleStackIcon, desc: 'Flashcards on every quote in the essay and the technique it demonstrates.' },
            { key: 'order', label: 'Order', icon: ArrowsUpDownIcon, desc: 'Drag your body paragraphs back into their original order.' },
        ],
    },
];
const ALL_MODES = MODE_GROUPS.flatMap((g) => g.modes);

function EssayDetail({ essay, onBack, onParsed, onDeleted, isParsing }) {
    const [parsing, setParsing] = useState(false);
    const [parseError, setParseError] = useState(null);
    const [mode, setMode] = useState('read');
    const [dueCount, setDueCount] = useState(0);

    const structure = essay.parsedStructure;

    const loadDue = useCallback(async () => {
        const data = await api.getDueReviewItems().catch(() => null);
        const items = data?.items || [];
        const prefix = `${essay.id}:`;
        setDueCount(items.filter((it) => String(it.itemId).startsWith(prefix)).length);
    }, [essay.id]);

    useEffect(() => { if (structure) loadDue(); }, [structure, loadDue]);

    const parse = async () => {
        setParsing(true);
        setParseError(null);
        try { const res = await api.parseEssay(essay.id); onParsed?.(res.essay); }
        catch (e) { setParseError(e?.message || 'Could not parse this essay right now.'); }
        finally { setParsing(false); }
    };

    const quoteCards = structure ? buildQuoteCards(structure) : null;
    const paragraphOrder = structure ? buildParagraphOrder(structure) : null;
    const activeMode = ALL_MODES.find((m) => m.key === mode);
    const activeGroup = MODE_GROUPS.find((g) => g.modes.some((m) => m.key === mode));

    return (
        <div>
            <button type="button" onClick={onBack}
                className="inline-flex items-center gap-2 text-sm font-medium text-text-dim hover:text-accent transition-colors mb-8">
                <ArrowLeftIcon className="w-4 h-4" /> All essays
            </button>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="min-w-0">
                    <span className="font-hand text-lg text-accent -rotate-2 inline-block mb-1">essay</span>
                    <h1 className="text-4xl md:text-6xl break-words">{essay.title}</h1>
                    {dueCount > 0 && (
                        <button type="button" onClick={() => setMode('recall')}
                            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent hover:opacity-75 transition-opacity">
                            <AcademicCapIcon className="w-4 h-4" /> {dueCount} item{dueCount === 1 ? '' : 's'} due for review
                        </button>
                    )}
                </div>
                <button type="button" onClick={() => onDeleted?.(essay.id)}
                    className="btn-secondary shrink-0 inline-flex items-center gap-2 hover:-translate-y-0.5 hover:text-rose-400 transition-all">
                    <TrashIcon className="w-4 h-4" /> Delete
                </button>
            </div>

            {!structure ? (
                /* ── Parse prompt / parsing banner ── */
                <div className="block-blue rounded-3xl p-10 text-center shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                    {isParsing || parsing ? (
                        <>
                            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-5" />
                            <p className="font-display text-lg font-extrabold tracking-tight text-text-primary mb-2">
                                Parsing your essay
                            </p>
                            <p className="text-sm text-text-muted">
                                <CyclingMessage messages={PARSE_MESSAGES} />
                            </p>
                        </>
                    ) : (
                        <>
                            <SparklesIcon className="w-8 h-8 text-accent mx-auto mb-5" />
                            <p className="text-base text-text-primary font-medium mb-2">
                                Segment this essay into its thesis, body paragraphs, quotes and techniques so you can drill it.
                            </p>
                            <p className="font-hand text-base text-accent mb-6">
                                Caplet only segments and annotates. It never rewrites your words.
                            </p>
                            {parseError && <p className="text-sm text-rose-400 mb-5 font-medium">{parseError}</p>}
                            <button type="button" onClick={parse} disabled={parsing}
                                className="btn-primary inline-flex items-center gap-2 hover:-translate-y-0.5 transition-transform disabled:opacity-40">
                                <SparklesIcon className="w-4 h-4" />
                                Parse with AI
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <div>
                    {/* ── Mode tab bar, grouped by stage of learning ── */}
                    <div className="flex items-stretch gap-1 mb-4 overflow-x-auto pb-px border-b border-line-soft">
                        {MODE_GROUPS.map((g, gi) => (
                            <div key={g.group} className={`flex items-center gap-1 shrink-0 ${gi > 0 ? 'pl-2 ml-1 border-l border-line-soft' : ''}`}>
                                <span className="hidden lg:inline text-[10px] font-bold uppercase tracking-widest text-text-dim mr-1 whitespace-nowrap">
                                    {g.group}
                                </span>
                                {g.modes.map((t) => (
                                    <button key={t.key} type="button" onClick={() => setMode(t.key)}
                                        className={`shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-medium -mb-px border-b-2 transition-colors whitespace-nowrap ${
                                            mode === t.key
                                                ? 'border-accent text-accent'
                                                : 'border-transparent text-text-dim hover:text-text-primary'
                                        }`}>
                                        {t.icon && <t.icon className="w-4 h-4" />}
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* ── Active mode context ── */}
                    <p className="text-xs font-medium text-text-dim mb-6">
                        <span className="text-text-dim uppercase tracking-wide mr-1.5">{activeGroup?.group}</span>
                        {activeMode?.desc}
                    </p>

                    <div className="bg-surface-raised rounded-3xl p-6 md:p-10 min-h-[320px] flex flex-col justify-center shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                        {mode === 'read' && <ReadMode essay={essay} onStartPractice={() => setMode('wordbyword')} />}
                        {mode === 'recall' && (
                            <RecallChunks essay={essay} onScheduled={loadDue}
                                onNext={() => setMode('quotes')} nextLabel="Quotes" />
                        )}
                        {mode === 'wordbyword' && (
                            <GuidedTypeMode essay={essay} onScheduled={loadDue}
                                onNext={() => setMode('sentence')} nextLabel="Sentence by sentence" />
                        )}
                        {mode === 'sentence' && (
                            <SentenceMode essay={essay} onScheduled={loadDue}
                                onNext={() => setMode('typeit')} nextLabel="Type it" />
                        )}
                        {mode === 'typeit' && (
                            <TypeItMode essay={essay} onScheduled={loadDue}
                                onNext={() => setMode('recall')} nextLabel="Recall" />
                        )}
                        {mode === 'quotes' && (
                            quoteCards
                                ? <SlideRenderer slide={quoteCards} onSubmit={() => {}} />
                                : <p className="text-sm text-text-muted italic text-center">No quotes were found in this essay.</p>
                        )}
                        {mode === 'order' && (
                            paragraphOrder
                                ? <SlideRenderer slide={paragraphOrder} onSubmit={() => {}} />
                                : <p className="text-sm text-text-muted italic text-center">Need at least two body paragraphs to practise ordering.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function EssayMemoriser() {
    const [essays, setEssays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [essay, setEssay] = useState(null);
    const [opening, setOpening] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [dueByEssay, setDueByEssay] = useState({}); // essayId -> due count
    const mountedRef = useRef(true);

    useReveal(undefined, [loading]);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const loadEssays = useCallback(async () => {
        const [essaysData, dueData] = await Promise.all([
            api.getEssays().catch(() => null),
            api.getDueReviewItems('essayParagraph').catch(() => null),
        ]);
        if (!mountedRef.current) return;
        setEssays(essaysData?.essays || []);
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

    const openEssay = async (id) => {
        setOpening(true);
        try { const res = await api.getEssay(id); setEssay(res.essay); }
        catch (e) { console.warn('Open essay failed:', e?.message || e); }
        finally { setOpening(false); }
    };

    const handleCreate = async (title, text) => {
        // Step 1: save quickly (≈1s) — NewEssayForm shows "Saving…" during this
        const res = await api.createEssay(title, text);
        const created = res.essay;

        // Step 2: navigate immediately; show parsing banner inside EssayDetail
        setEssay(created);
        setIsParsing(true);
        loadEssays();

        // Step 3: parse in background — does NOT block the form cleanup
        api.parseEssay(created.id)
            .then((parsed) => { if (mountedRef.current) setEssay(parsed.essay); })
            .catch(() => { /* essay stays un-parsed; manual retry button appears */ })
            .finally(() => {
                if (mountedRef.current) {
                    setIsParsing(false);
                    loadEssays();
                }
            });
    };

    const handleParsed = (updated) => { setEssay(updated); loadEssays(); };

    const handleDelete = async (id) => {
        try { await api.deleteEssay(id); } catch (e) { console.warn('Delete essay failed:', e?.message || e); }
        setEssay(null);
        setEssays((prev) => prev.filter((e) => e.id !== id));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-surface-body flex items-center justify-center">
                <CapletLoader message="Loading your essays…" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
            <div className="container-custom">
                {essay ? (
                    <EssayDetail
                        essay={essay}
                        onBack={() => { setEssay(null); setIsParsing(false); loadEssays(); }}
                        onParsed={handleParsed}
                        onDeleted={handleDelete}
                        isParsing={isParsing}
                    />
                ) : (
                    <>
                        <header className="mb-12 reveal">
                            <span className="font-hand text-2xl text-accent -rotate-2 inline-block mb-3">essay memoriser</span>
                            <h1 className="font-display font-extrabold tracking-tight text-5xl md:text-7xl">Learn it by heart.</h1>
                            <p className="mt-8 text-xl text-text-muted font-medium max-w-xl">
                                Caplet breaks your essay into its real structure, then walks you from a first read to
                                word-perfect, exam-ready recall.
                            </p>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 reveal-stagger">
                            <NewEssayForm onCreated={handleCreate} />

                            <div>
                                <h2 className="font-display text-lg font-extrabold tracking-tight text-text-primary mb-4">Your essays</h2>
                                {opening && <p className="text-sm text-text-dim mb-3">Opening…</p>}
                                {essays.length === 0 ? (
                                    <div className="block-cream rounded-3xl p-10 text-center shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                                        <DocumentTextIcon className="w-8 h-8 text-text-dim mx-auto mb-4" />
                                        <p className="text-text-dim text-sm font-medium">No essays yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {essays.map((e) => {
                                            const due = dueByEssay[String(e.id)] || 0;
                                            return (
                                                <button key={e.id} type="button" onClick={() => openEssay(e.id)}
                                                    className="bg-surface-raised rounded-2xl p-5 text-left flex items-center justify-between gap-4 group shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] hover:-translate-y-0.5 transition-transform">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                            e.parsed ? 'bg-emerald-500/10' : 'bg-accent-soft'
                                                        }`}>
                                                            {e.parsed
                                                                ? <BookOpenIcon className="w-4 h-4 text-emerald-500" />
                                                                : <SparklesIcon className="w-4 h-4 text-accent" />}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate">{e.title}</p>
                                                            <p className="text-xs font-medium text-text-dim mt-1">
                                                                {e.parsed ? `${e.paragraphCount} body paragraph${e.paragraphCount === 1 ? '' : 's'}` : 'Needs parsing — click to finish setting it up'}
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
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
