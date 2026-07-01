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

function DiffDisplay({ original, typed, className = '' }) {
    const diff = diffWords(original, typed);
    const correct = diff.filter((d) => d.status === 'correct').length;
    const pct = Math.round((correct / diff.length) * 100);
    return (
        <div className={className}>
            <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl font-display font-extrabold text-text-primary">{pct}%</span>
                <span className="text-xs font-medium text-text-dim">{correct}/{diff.length} words correct</span>
            </div>
            <div className="p-5 rounded-2xl bg-surface-body border border-line-soft font-serif text-sm md:text-base leading-relaxed flex flex-wrap gap-x-1 gap-y-1.5">
                {diff.map((d, i) => (
                    <span
                        key={i}
                        title={d.typed ? `You wrote: "${d.typed}"` : undefined}
                        className={
                            d.status === 'correct'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : d.status === 'missed'
                                    ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-500 px-0.5 rounded italic'
                                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-0.5 rounded line-through'
                        }
                    >
                        {d.word}
                    </span>
                ))}
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
                        ? 'border-accent text-accent bg-accent/10'
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

function SessionDone({ onRestart }) {
    return (
        <div className="text-center py-14">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
                <AcademicCapIcon className="w-7 h-7 text-emerald-500" />
            </div>
            <p className="font-display text-xl font-extrabold tracking-tight text-text-primary">Session complete</p>
            <p className="text-sm text-text-muted mt-2">Items rescheduled on the 1, 3, 7, 14 day ladder.</p>
            <button type="button" onClick={onRestart}
                className="btn-secondary mt-6 inline-flex hover:-translate-y-0.5 transition-transform">
                Restart
            </button>
        </div>
    );
}

// ── MODE 1 — SPOTLIGHT (narrative reader, one block at a time) ──────────────

function SpotlightMode({ essay }) {
    const structure = essay.parsedStructure || {};
    const segments = buildSpotlightSegments(structure);
    const [idx, setIdx] = useState(0);

    if (!segments.length) return <p className="text-sm text-text-muted italic">Nothing to spotlight.</p>;

    const seg = segments[idx];
    const bg =
        seg.type === 'thesis' ? 'bg-block-blue' :
        seg.type === 'conclusion' ? 'bg-block-cream' :
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
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent/80 mb-4 block">{seg.label}</span>
                <p className="font-serif text-base md:text-lg leading-relaxed text-text-primary whitespace-pre-wrap">{seg.text}</p>
                {(seg.quotes || []).length > 0 && (
                    <div className="mt-6 space-y-2 border-t border-line-soft/50 pt-5">
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
                            <span key={i} className="text-xs font-semibold px-2.5 py-1 bg-accent/10 text-accent rounded-full">{t}</span>
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

// ── MODE 2 — RECALL (existing SRS chunk mode) ───────────────────────────────

function RecallChunks({ essay, onScheduled }) {
    const structure = essay.parsedStructure || {};
    const paras = structure.bodyParagraphs || [];
    const [pIndex, setPIndex] = useState(0);
    const [graded, setGraded] = useState(false);
    const [busy, setBusy] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const [done, setDone] = useState(false);

    const reset = () => { setPIndex(0); setGraded(false); setRevealed(false); setDone(false); };

    if (!paras.length) return <p className="text-sm text-text-muted italic">No body paragraphs were found in this essay.</p>;
    if (done) return <SessionDone onRestart={reset} />;

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
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-text-dim">Paragraph {pIndex + 1} / {paras.length}</span>
            </div>
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
                        <div className="p-5 rounded-2xl bg-block-cream shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
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

// ── MODE 3 — GUIDED TYPE (word-by-word; first letter of next word is hint) ───

function GuidedTypeMode({ essay, onScheduled }) {
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

    const reset = () => { setPIndex(0); setWordIdx(0); setCurrent(''); setHistory([]); setParaDone(false); setDone(false); };

    useEffect(() => { if (!paraDone) inputRef.current?.focus(); }, [pIndex, paraDone]);

    if (!paras.length) return <p className="text-sm text-text-muted italic">No body paragraphs found.</p>;
    if (done) return <SessionDone onRestart={reset} />;

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
        try { await api.submitReview('essayParagraph', paragraphItemId(essay.id, pIndex), recall); onScheduled?.(); } catch {}
        setBusy(false);
        if (pIndex + 1 < paras.length) {
            setPIndex((i) => i + 1); setWordIdx(0); setCurrent(''); setHistory([]); setParaDone(false);
        } else setDone(true);
    };

    const correct = history.filter((h) => h.correct).length;
    const accuracy = history.length ? Math.round((correct / history.length) * 100) : 0;

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-text-dim">Paragraph {pIndex + 1} / {paras.length}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim/60 px-2 py-1 border border-line-soft rounded-lg">Guided</span>
            </div>
            <p className="text-xs font-medium text-text-dim mb-4">Type each word. The first letter of the next word appears after you type.</p>

            {/* Word stream display */}
            <div className="p-5 rounded-2xl bg-surface-body border border-line-soft font-serif text-sm md:text-base leading-relaxed flex flex-wrap gap-x-1.5 gap-y-1.5 mb-5 min-h-[100px]">
                {words.map((w, i) => {
                    if (i < history.length) {
                        const h = history[i];
                        return (
                            <span key={i} title={!h.correct ? `You wrote: "${h.typed}"` : undefined}
                                className={h.correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 line-through'}>
                                {w}
                            </span>
                        );
                    }
                    if (i === wordIdx && !paraDone) {
                        return (
                            <span key={i} className="font-bold text-accent border-b-2 border-accent">
                                {w[0]}{'_'.repeat(Math.max(0, w.length - 1))}
                            </span>
                        );
                    }
                    return (
                        <span key={i} className="text-text-dim/25 select-none">
                            {w[0]}{'─'.repeat(Math.max(0, w.length - 1))}
                        </span>
                    );
                })}
            </div>

            {!paraDone ? (
                <div>
                    <div className="flex items-center gap-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={current}
                            onChange={(e) => setCurrent(e.target.value)}
                            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); commitWord(); } }}
                            placeholder={targetWord ? `${targetWord[0]}___` : ''}
                            className="flex-1 px-4 py-3 rounded-2xl bg-surface-body border border-line-soft text-text-primary placeholder:text-text-dim/60 outline-none focus:border-accent transition-colors font-serif"
                            autoComplete="off" autoCorrect="off" spellCheck={false}
                        />
                        <button type="button" onClick={commitWord} disabled={!current.trim()}
                            className="btn-primary px-5 py-3 inline-flex hover:-translate-y-0.5 transition-transform disabled:opacity-40">
                            <ArrowRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                        <p className="text-[10px] text-text-dim/50">Space or Enter to confirm each word</p>
                        <SneakPeek text={targetWord} label="Peek this word" autoHideMs={2000} />
                    </div>
                </div>
            ) : (
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl font-display font-extrabold text-text-primary">{accuracy}%</span>
                        <span className="text-xs text-text-dim">{correct}/{history.length} words</span>
                    </div>
                    <GradeButtons busy={busy} onFail={() => advance('fail')} onPass={() => advance('pass')}
                        passLabel={accuracy >= 80 ? 'Got it' : 'Close enough'} />
                </div>
            )}
        </div>
    );
}

// ── MODE 4 — TYPE (free-type full paragraph, word diff) ─────────────────────

function TypeMode({ essay, onScheduled }) {
    const structure = essay.parsedStructure || {};
    const paras = structure.bodyParagraphs || [];
    const [pIndex, setPIndex] = useState(0);
    const [typed, setTyped] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    const reset = () => { setPIndex(0); setTyped(''); setSubmitted(false); setDone(false); };

    if (!paras.length) return <p className="text-sm text-text-muted italic">No body paragraphs found.</p>;
    if (done) return <SessionDone onRestart={reset} />;

    const current = paras[pIndex];
    const cue = pIndex === 0
        ? (structure.thesis ? `Thesis: "${structure.thesis}"` : 'Recall paragraph 1.')
        : `Previous ending: "${lastSentence(paras[pIndex - 1].text)}"`;

    const diff = submitted ? diffWords(current.text, typed) : null;
    const accuracy = diff ? Math.round((diff.filter((d) => d.status === 'correct').length / diff.length) * 100) : 0;

    const advance = async (recall) => {
        setBusy(true);
        try { await api.submitReview('essayParagraph', paragraphItemId(essay.id, pIndex), recall); onScheduled?.(); } catch {}
        setBusy(false);
        if (pIndex + 1 < paras.length) { setPIndex((i) => i + 1); setTyped(''); setSubmitted(false); }
        else setDone(true);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-text-dim">Paragraph {pIndex + 1} / {paras.length}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim/60 px-2 py-1 border border-line-soft rounded-lg">Free type</span>
            </div>
            <p className="text-sm text-text-muted italic mb-5 px-4 py-3 bg-surface-body rounded-xl border border-line-soft">{cue}</p>

            {!submitted ? (
                <>
                    <textarea value={typed} onChange={(e) => setTyped(e.target.value)}
                        placeholder="Type the paragraph from memory…"
                        rows={7}
                        className="w-full px-4 py-3 rounded-2xl bg-surface-body border border-line-soft text-text-primary placeholder:text-text-dim outline-none focus:border-accent transition-colors font-serif text-base resize-none"
                    />
                    <div className="flex items-center justify-between mt-3">
                        <SneakPeek text={current.text} label="Sneak peek" />
                        <button type="button" onClick={() => setSubmitted(true)} disabled={!typed.trim()}
                            className="btn-primary inline-flex hover:-translate-y-0.5 transition-transform disabled:opacity-40">
                            Check →
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <DiffDisplay original={current.text} typed={typed} className="mb-5" />
                    <details className="mb-3">
                        <summary className="text-sm font-medium text-accent cursor-pointer hover:opacity-70">Show original</summary>
                        <p className="mt-3 p-4 rounded-2xl bg-block-cream font-serif text-sm leading-relaxed whitespace-pre-wrap">{current.text}</p>
                    </details>
                    <GradeButtons busy={busy} onFail={() => advance('fail')} onPass={() => advance('pass')}
                        passLabel={accuracy >= 75 ? 'Got it' : 'Good enough'} />
                </>
            )}
        </div>
    );
}

// ── MODE 5 — SENTENCE STARTS (first word of each sentence shown) ─────────────

function SentenceStartsMode({ essay, onScheduled }) {
    const structure = essay.parsedStructure || {};
    const paras = structure.bodyParagraphs || [];
    const [pIndex, setPIndex] = useState(0);
    const [sIndex, setSIndex] = useState(0);
    const [typed, setTyped] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    const reset = () => { setPIndex(0); setSIndex(0); setTyped(''); setSubmitted(false); setDone(false); };

    if (!paras.length) return <p className="text-sm text-text-muted italic">No body paragraphs found.</p>;
    if (done) return <SessionDone onRestart={reset} />;

    const para = paras[pIndex];
    const sentences = splitSentences(para.text);
    const sentence = sentences[sIndex] || '';
    const firstWord = sentence.split(/\s+/)[0] || '';
    const rest = sentence.slice(firstWord.length).trimStart();

    const diff = submitted ? diffWords(rest, typed) : null;
    const accuracy = diff ? Math.round((diff.filter((d) => d.status === 'correct').length / diff.length) * 100) : 0;

    const goNext = async (recall) => {
        if (sIndex + 1 < sentences.length) {
            setSIndex((i) => i + 1); setTyped(''); setSubmitted(false);
        } else {
            setBusy(true);
            try { await api.submitReview('essayParagraph', paragraphItemId(essay.id, pIndex), recall); onScheduled?.(); } catch {}
            setBusy(false);
            if (pIndex + 1 < paras.length) { setPIndex((i) => i + 1); setSIndex(0); setTyped(''); setSubmitted(false); }
            else setDone(true);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-text-dim">
                    Para {pIndex + 1}/{paras.length} · Sentence {sIndex + 1}/{sentences.length}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim/60 px-2 py-1 border border-line-soft rounded-lg">Sentence starts</span>
            </div>

            <div className="flex items-baseline gap-2 mb-5 p-4 bg-surface-body rounded-2xl border border-line-soft">
                <span className="text-lg font-bold font-serif text-accent">{firstWord}</span>
                <span className="text-text-dim/60 text-sm">… type the rest of this sentence</span>
            </div>

            {!submitted ? (
                <>
                    <textarea value={typed} onChange={(e) => setTyped(e.target.value)}
                        placeholder="Complete the sentence…"
                        rows={3}
                        className="w-full px-4 py-3 rounded-2xl bg-surface-body border border-line-soft text-text-primary placeholder:text-text-dim outline-none focus:border-accent transition-colors font-serif text-base resize-none"
                    />
                    <div className="flex items-center justify-between mt-3">
                        <SneakPeek text={rest} label="Sneak peek" />
                        <button type="button" onClick={() => setSubmitted(true)} disabled={!typed.trim()}
                            className="btn-primary inline-flex hover:-translate-y-0.5 transition-transform disabled:opacity-40">
                            Check →
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex flex-wrap gap-x-1.5 gap-y-1.5 p-4 rounded-2xl bg-surface-body border border-line-soft font-serif text-base mb-4">
                        <span className="text-accent font-bold">{firstWord}</span>
                        {diff?.map((d, i) => (
                            <span key={i} title={d.typed ? `You wrote: "${d.typed}"` : undefined}
                                className={
                                    d.status === 'correct' ? 'text-emerald-600 dark:text-emerald-400' :
                                    d.status === 'missed' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-500 px-0.5 rounded italic' :
                                    'bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-0.5 rounded line-through'
                                }>{d.word}</span>
                        ))}
                    </div>
                    <p className="text-sm text-text-dim mb-4 p-3 rounded-xl bg-block-cream font-serif leading-relaxed">{sentence}</p>
                    <GradeButtons busy={busy}
                        onFail={() => { setTyped(''); setSubmitted(false); }}
                        onPass={() => goNext(accuracy >= 70 ? 'pass' : 'fail')}
                        passLabel={sIndex + 1 < sentences.length ? 'Next sentence →' : pIndex + 1 < paras.length ? 'Next paragraph →' : 'Finish'} />
                </>
            )}
        </div>
    );
}

// ── MODE 6 — LETTERS (first letter of every word as hint) ───────────────────

function LettersMode({ essay, onScheduled }) {
    const structure = essay.parsedStructure || {};
    const paras = structure.bodyParagraphs || [];
    const [pIndex, setPIndex] = useState(0);
    const [typed, setTyped] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    const reset = () => { setPIndex(0); setTyped(''); setSubmitted(false); setRevealed(false); setDone(false); };

    if (!paras.length) return <p className="text-sm text-text-muted italic">No body paragraphs found.</p>;
    if (done) return <SessionDone onRestart={reset} />;

    const current = paras[pIndex];
    const hint = toLetterHint(current.text);
    const cue = pIndex === 0
        ? (structure.thesis ? `Thesis: "${structure.thesis}"` : 'First paragraph')
        : `After: "${lastSentence(paras[pIndex - 1].text)}"`;

    const diff = submitted ? diffWords(current.text, typed) : null;
    const accuracy = diff ? Math.round((diff.filter((d) => d.status === 'correct').length / diff.length) * 100) : 0;

    const advance = async (recall) => {
        setBusy(true);
        try { await api.submitReview('essayParagraph', paragraphItemId(essay.id, pIndex), recall); onScheduled?.(); } catch {}
        setBusy(false);
        if (pIndex + 1 < paras.length) { setPIndex((i) => i + 1); setTyped(''); setSubmitted(false); setRevealed(false); }
        else setDone(true);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-text-dim">Paragraph {pIndex + 1} / {paras.length}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-dim/60 px-2 py-1 border border-line-soft rounded-lg">First letters</span>
            </div>
            <p className="text-sm text-text-muted italic mb-4 px-4 py-3 bg-surface-body rounded-xl border border-line-soft">{cue}</p>
            <div className="p-4 rounded-2xl bg-block-cream border border-line-soft font-mono text-sm leading-relaxed tracking-wide text-text-dim select-none mb-5 break-words">
                {hint}
            </div>

            {!submitted ? (
                <>
                    <textarea value={typed} onChange={(e) => setTyped(e.target.value)}
                        placeholder="Type the full paragraph using the first-letter hints above…"
                        rows={6}
                        className="w-full px-4 py-3 rounded-2xl bg-surface-body border border-line-soft text-text-primary placeholder:text-text-dim outline-none focus:border-accent transition-colors font-serif text-sm resize-none"
                    />
                    <div className="flex items-center justify-between mt-3">
                        <SneakPeek text={current.text} label="Sneak peek" />
                        <button type="button" onClick={() => setSubmitted(true)} disabled={!typed.trim()}
                            className="btn-primary inline-flex hover:-translate-y-0.5 transition-transform disabled:opacity-40">
                            Check →
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <DiffDisplay original={current.text} typed={typed} className="mb-4" />
                    {!revealed ? (
                        <button type="button" onClick={() => setRevealed(true)}
                            className="text-sm font-medium text-accent hover:opacity-70 transition-opacity mb-4 block">
                            Show full paragraph
                        </button>
                    ) : (
                        <p className="mb-4 p-4 rounded-2xl bg-block-cream font-serif text-sm leading-relaxed whitespace-pre-wrap">{current.text}</p>
                    )}
                    <GradeButtons busy={busy} onFail={() => advance('fail')} onPass={() => advance('pass')}
                        passLabel={accuracy >= 75 ? 'Got it' : 'Close enough'} />
                </>
            )}
        </div>
    );
}

// ── MODE 7 — SENTENCES (read → hide → type each sentence) ──────────────────

function SentencesMode({ essay, onScheduled }) {
    const structure = essay.parsedStructure || {};
    const paras = structure.bodyParagraphs || [];
    const [pIndex, setPIndex] = useState(0);
    const [sIndex, setSIndex] = useState(0);
    const [phase, setPhase] = useState('read'); // 'read' | 'type' | 'diff'
    const [typed, setTyped] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const textareaRef = useRef(null);

    const reset = () => { setPIndex(0); setSIndex(0); setPhase('read'); setTyped(''); setDone(false); };

    useEffect(() => { if (phase === 'type') textareaRef.current?.focus(); }, [phase]);

    if (!paras.length) return <p className="text-sm text-text-muted italic">No body paragraphs found.</p>;
    if (done) return <SessionDone onRestart={reset} />;

    const para = paras[pIndex];
    const sentences = splitSentences(para.text);
    const sentence = sentences[sIndex] || '';
    const total = sentences.length;

    const diff = phase === 'diff' ? diffWords(sentence, typed) : null;
    const accuracy = diff ? Math.round((diff.filter((d) => d.status === 'correct').length / diff.length) * 100) : 0;

    const goNext = async () => {
        const recall = accuracy >= 70 ? 'pass' : 'fail';
        if (sIndex + 1 < total) { setSIndex((i) => i + 1); setPhase('read'); setTyped(''); }
        else {
            setBusy(true);
            try { await api.submitReview('essayParagraph', paragraphItemId(essay.id, pIndex), recall); onScheduled?.(); } catch {}
            setBusy(false);
            if (pIndex + 1 < paras.length) { setPIndex((i) => i + 1); setSIndex(0); setPhase('read'); setTyped(''); }
            else setDone(true);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-text-dim">Para {pIndex + 1}/{paras.length} · Sentence {sIndex + 1}/{total}</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 border rounded-lg ${
                    phase === 'read' ? 'text-blue-500 border-blue-400/50' :
                    phase === 'type' ? 'text-accent border-accent/50' :
                    'text-emerald-600 border-emerald-500/50'
                }`}>
                    {phase === 'read' ? 'Read it' : phase === 'type' ? 'Type it' : 'Result'}
                </span>
            </div>

            {phase === 'read' && (
                <div>
                    <p className="text-xs font-medium text-text-dim mb-3">Read this sentence. Then hide it and type it from memory.</p>
                    <div className="p-6 rounded-2xl bg-block-blue min-h-[80px] flex items-center shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                        <p className="font-serif text-base md:text-lg leading-relaxed text-text-primary">{sentence}</p>
                    </div>
                    <button type="button" onClick={() => setPhase('type')}
                        className="btn-primary mt-5 inline-flex items-center gap-2 hover:-translate-y-0.5 transition-transform">
                        Hide &amp; type
                    </button>
                </div>
            )}

            {phase === 'type' && (
                <div>
                    <div className="p-4 rounded-2xl bg-surface-body border-2 border-dashed border-line-soft text-text-dim/40 italic text-sm mb-4 min-h-[56px] font-serif flex items-center">
                        — hidden —
                    </div>
                    <textarea
                        ref={textareaRef}
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        placeholder="Type the sentence from memory…"
                        rows={3}
                        className="w-full px-4 py-3 rounded-2xl bg-surface-body border border-line-soft text-text-primary placeholder:text-text-dim outline-none focus:border-accent transition-colors font-serif text-base resize-none"
                        onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && typed.trim()) setPhase('diff'); }}
                    />
                    <div className="flex items-center gap-3 mt-3">
                        <button type="button" onClick={() => setPhase('read')}
                            className="text-sm font-medium text-text-dim hover:text-accent transition-colors">
                            Peek again
                        </button>
                        <button type="button" onClick={() => setPhase('diff')} disabled={!typed.trim()}
                            className="btn-primary inline-flex hover:-translate-y-0.5 transition-transform disabled:opacity-40">
                            Check →
                        </button>
                    </div>
                    <p className="text-[10px] text-text-dim/50 mt-2">Cmd/Ctrl+Enter to check</p>
                </div>
            )}

            {phase === 'diff' && diff && (
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl font-display font-extrabold text-text-primary">{accuracy}%</span>
                        <span className="text-xs text-text-dim">{diff.filter((d) => d.status === 'correct').length}/{diff.length} words</span>
                    </div>
                    <div className="p-5 rounded-2xl bg-surface-body border border-line-soft font-serif text-base leading-relaxed flex flex-wrap gap-x-1.5 gap-y-1 mb-4">
                        {diff.map((d, i) => (
                            <span key={i} title={d.typed ? `You wrote: "${d.typed}"` : undefined}
                                className={
                                    d.status === 'correct' ? 'text-emerald-600 dark:text-emerald-400' :
                                    d.status === 'missed' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-500 px-0.5 rounded italic' :
                                    'bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-0.5 rounded line-through'
                                }>{d.word}</span>
                        ))}
                    </div>
                    <p className="text-sm font-serif text-text-muted leading-relaxed mb-5 p-4 rounded-2xl bg-block-cream">{sentence}</p>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => { setPhase('read'); setTyped(''); }}
                            className="text-sm font-semibold text-text-dim border border-line-soft rounded-xl px-5 py-2.5 hover:border-text-dim transition-colors">
                            Retry sentence
                        </button>
                        <button type="button" disabled={busy} onClick={goNext}
                            className="btn-primary inline-flex hover:-translate-y-0.5 transition-transform disabled:opacity-40">
                            {sIndex + 1 < total ? 'Next sentence →' : pIndex + 1 < paras.length ? 'Next paragraph →' : 'Finish'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── MODE 8 — ACRONYM (just the first letter of each word, hardest) ──────────

function AcronymMode({ essay, onScheduled }) {
    const structure = essay.parsedStructure || {};
    const paras = structure.bodyParagraphs || [];
    const [pIndex, setPIndex] = useState(0);
    const [typed, setTyped] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    const reset = () => { setPIndex(0); setTyped(''); setSubmitted(false); setDone(false); };

    if (!paras.length) return <p className="text-sm text-text-muted italic">No body paragraphs found.</p>;
    if (done) return <SessionDone onRestart={reset} />;

    const current = paras[pIndex];
    const acronym = current.text.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join('');

    const diff = submitted ? diffWords(current.text, typed) : null;
    const accuracy = diff ? Math.round((diff.filter((d) => d.status === 'correct').length / diff.length) * 100) : 0;

    const advance = async (recall) => {
        setBusy(true);
        try { await api.submitReview('essayParagraph', paragraphItemId(essay.id, pIndex), recall); onScheduled?.(); } catch {}
        setBusy(false);
        if (pIndex + 1 < paras.length) { setPIndex((i) => i + 1); setTyped(''); setSubmitted(false); }
        else setDone(true);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-text-dim">Paragraph {pIndex + 1} / {paras.length}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-rose-500/70 px-2 py-1 border border-rose-400/40 rounded-lg">Hardest</span>
            </div>
            <p className="text-xs font-medium text-text-dim mb-3">Just the first letter of every word. Reconstruct the full paragraph.</p>

            <div className="p-5 rounded-2xl bg-block-cream border border-line-soft mb-5">
                <p className="font-mono text-sm md:text-base tracking-[0.15em] text-text-primary font-bold leading-relaxed break-all">
                    {acronym}
                </p>
            </div>

            {!submitted ? (
                <>
                    <textarea value={typed} onChange={(e) => setTyped(e.target.value)}
                        placeholder="Type the full paragraph from the first letters above…"
                        rows={7}
                        className="w-full px-4 py-3 rounded-2xl bg-surface-body border border-line-soft text-text-primary placeholder:text-text-dim outline-none focus:border-accent transition-colors font-serif text-sm resize-none"
                    />
                    <div className="flex items-center justify-between mt-3">
                        <SneakPeek text={current.text} label="Sneak peek" />
                        <button type="button" onClick={() => setSubmitted(true)} disabled={!typed.trim()}
                            className="btn-primary inline-flex hover:-translate-y-0.5 transition-transform disabled:opacity-40">
                            Check →
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <DiffDisplay original={current.text} typed={typed} className="mb-4" />
                    <p className="mb-4 p-4 rounded-2xl bg-block-cream font-serif text-sm leading-relaxed whitespace-pre-wrap">{current.text}</p>
                    <GradeButtons busy={busy} onFail={() => advance('fail')} onPass={() => advance('pass')} />
                </>
            )}
        </div>
    );
}

// ── MODE — ORIGINAL (raw, unannotated, exactly as saved) ────────────────────

function OriginalEssayMode({ essay }) {
    const text = essay.originalText || '';
    if (!text.trim()) return <p className="text-sm text-text-muted italic">No essay text saved.</p>;
    const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

    return (
        <div>
            <p className="text-xs font-medium text-text-dim/70 mb-6">
                Exactly what you saved — no segmentation, no highlighting.
            </p>
            <div className="max-w-2xl mx-auto space-y-6">
                {paragraphs.map((p, i) => (
                    <p key={i} className="font-serif text-base md:text-lg leading-relaxed text-text-primary whitespace-pre-wrap">
                        {p}
                    </p>
                ))}
            </div>
        </div>
    );
}

// ── MODE — ANNOTATED (colour-coded thesis / topic sentences / quotes) ───────

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

const MODES = [
    { key: 'spotlight',  label: 'Spotlight',  desc: 'Read through' },
    { key: 'annotated',  label: 'Annotated',  desc: 'Thesis, topic sentences & quotes highlighted' },
    { key: 'original',   label: 'Original',   desc: 'Exactly what you saved — no highlighting' },
    { key: 'recall',     label: 'Recall',     desc: 'SRS cloze' },
    { key: 'guided',     label: 'Guided',     desc: 'Word-by-word' },
    { key: 'type',       label: 'Type',       desc: 'Free type' },
    { key: 'sentences',  label: 'Sentences',  desc: 'Read → type' },
    { key: 'starts',     label: 'Starts',     desc: 'First word cue' },
    { key: 'letters',    label: 'Letters',    desc: 'First letters' },
    { key: 'acronym',    label: 'Acronym',    desc: 'Hardest' },
    { key: 'quotes',     label: 'Quotes',     desc: 'Quote cards' },
    { key: 'order',      label: 'Order',      desc: 'Para order' },
];

function EssayDetail({ essay, onBack, onParsed, onDeleted, isParsing }) {
    const [parsing, setParsing] = useState(false);
    const [parseError, setParseError] = useState(null);
    const [mode, setMode] = useState('spotlight');
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

    return (
        <div>
            <button type="button" onClick={onBack}
                className="inline-flex items-center gap-2 text-sm font-medium text-text-dim hover:text-accent transition-colors mb-8">
                <ArrowLeftIcon className="w-4 h-4" /> All essays
            </button>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="min-w-0">
                    <span className="section-kicker">Essay</span>
                    <h1 className="text-4xl md:text-6xl break-words">{essay.title}</h1>
                    {dueCount > 0 && (
                        <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent">
                            <AcademicCapIcon className="w-4 h-4" /> {dueCount} item{dueCount === 1 ? '' : 's'} due for review
                        </p>
                    )}
                </div>
                <button type="button" onClick={() => onDeleted?.(essay.id)}
                    className="btn-secondary shrink-0 inline-flex items-center gap-2 hover:-translate-y-0.5 hover:text-rose-400 transition-all">
                    <TrashIcon className="w-4 h-4" /> Delete
                </button>
            </div>

            {!structure ? (
                /* ── Parse prompt / parsing banner ── */
                <div className="bg-block-blue rounded-3xl p-10 text-center shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
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
                    {/* ── Mode tab bar (scrollable) ── */}
                    <div className="flex gap-1 mb-8 overflow-x-auto pb-px border-b border-line-soft">
                        {MODES.map((t) => (
                            <button key={t.key} type="button" onClick={() => setMode(t.key)}
                                className={`shrink-0 px-4 py-3 text-sm font-medium -mb-px border-b-2 transition-colors whitespace-nowrap ${
                                    mode === t.key
                                        ? 'border-accent text-accent'
                                        : 'border-transparent text-text-dim hover:text-text-primary'
                                }`}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Mode description ── */}
                    <p className="text-xs font-medium text-text-dim/60 mb-6">
                        {MODES.find((m) => m.key === mode)?.desc}
                    </p>

                    <div className="bg-surface-raised rounded-3xl p-6 md:p-10 min-h-[320px] flex flex-col justify-center shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                        {mode === 'spotlight' && <SpotlightMode essay={essay} />}
                        {mode === 'annotated' && <AnnotatedEssayMode essay={essay} />}
                        {mode === 'original' && <OriginalEssayMode essay={essay} />}
                        {mode === 'recall' && <RecallChunks essay={essay} onScheduled={loadDue} />}
                        {mode === 'guided' && <GuidedTypeMode essay={essay} onScheduled={loadDue} />}
                        {mode === 'type' && <TypeMode essay={essay} onScheduled={loadDue} />}
                        {mode === 'sentences' && <SentencesMode essay={essay} onScheduled={loadDue} />}
                        {mode === 'starts' && <SentenceStartsMode essay={essay} onScheduled={loadDue} />}
                        {mode === 'letters' && <LettersMode essay={essay} onScheduled={loadDue} />}
                        {mode === 'acronym' && <AcronymMode essay={essay} onScheduled={loadDue} />}
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
    const mountedRef = useRef(true);

    useReveal();

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    const loadEssays = useCallback(async () => {
        const data = await api.getEssays().catch(() => null);
        if (mountedRef.current) setEssays(data?.essays || []);
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
                        onBack={() => { setEssay(null); setIsParsing(false); }}
                        onParsed={handleParsed}
                        onDeleted={handleDelete}
                        isParsing={isParsing}
                    />
                ) : (
                    <>
                        <header className="mb-12 reveal-text">
                            <span className="section-kicker">Essay memoriser</span>
                            <h1 className="text-5xl md:text-7xl">Learn it by heart.</h1>
                            <p className="mt-8 text-xl text-text-muted font-medium max-w-xl">
                                Caplet breaks your essay into its real structure, then drills you on it eight different ways.
                            </p>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 reveal-stagger">
                            <NewEssayForm onCreated={handleCreate} />

                            <div>
                                <h2 className="font-display text-lg font-extrabold tracking-tight text-text-primary mb-4">Your essays</h2>
                                {opening && <p className="text-sm text-text-dim mb-3">Opening…</p>}
                                {essays.length === 0 ? (
                                    <div className="bg-block-cream rounded-3xl p-10 text-center shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                                        <DocumentTextIcon className="w-8 h-8 text-text-dim mx-auto mb-4" />
                                        <p className="text-text-dim text-sm font-medium">No essays yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {essays.map((e) => (
                                            <button key={e.id} type="button" onClick={() => openEssay(e.id)}
                                                className="bg-surface-raised rounded-2xl p-5 text-left flex items-center justify-between gap-4 group shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] hover:-translate-y-0.5 transition-transform">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate">{e.title}</p>
                                                    <p className="text-xs font-medium text-text-dim mt-1">
                                                        {e.parsed ? `${e.paragraphCount} body paragraph${e.paragraphCount === 1 ? '' : 's'}` : 'Not parsed yet'}
                                                    </p>
                                                </div>
                                                <ArrowRightIcon className="w-4 h-4 text-text-dim shrink-0 group-hover:text-accent transition-colors" />
                                            </button>
                                        ))}
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
