import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowPathIcon,
    ArrowRightIcon,
    Cog6ToothIcon,
    RocketLaunchIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import {
    typeable,
    compareWord,
    charStatuses,
    buildSpeedSections,
    presetIds,
    buildRun,
    computeStats,
    runSignature,
    speedBestKey,
    VERDICT_CLASS,
} from '../../lib/speedType';
import useCountUp from '../../lib/useCountUp';
import AccuracyRing from './AccuracyRing';

/**
 * Speed run — MonkeyType, but the text is YOUR essay. Type against the clock
 * while the drill checks every word; everything about the run is toggleable:
 *
 *   Checking   live (colour every character as you type)
 *              word (verdict only after you finish each word)
 *              blind (no feedback at all — the review at the end tells all)
 *   Flow       whole passage in one stream, or one sentence at a time
 *   Forgiveness ignore capitalisation / ignore punctuation
 *   Strict stop the space bar refuses to advance past a wrong word
 *
 * What you type is equally flexible: toggle whole sections (intro, each body
 * paragraph, conclusion), hit a preset (whole essay, body ¶s only, last BP +
 * conclusion…), or just highlight any passage in the preview and type exactly
 * that. When the practice scope is narrowed, only the selected paragraphs are
 * offered. The essay text is never altered — this is a pure typing drill.
 *
 * During a run the surrounding page chrome collapses (via onRunningChange):
 * a hidden input drives a MonkeyType-style word stream with a gliding caret,
 * a 3-line rolling window, Esc to quit and Tab to restart.
 */

// ── Small UI atoms ──────────────────────────────────────────────────────────

function TogglePill({ active, onClick, children, disabled, title }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-pressed={active}
            className={`press focus-ring rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors disabled:opacity-35 ${
                active ? 'bg-accent text-accent-contrast' : 'bg-surface-body text-text-dim hover:text-text-primary'
            }`}
        >
            {children}
        </button>
    );
}

function OptionRow({ label, children }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="w-24 shrink-0 text-[11px] font-bold uppercase tracking-widest text-text-dim">{label}</span>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>{children}</div>
        </div>
    );
}

/**
 * One word of the stream. Memoised so a keystroke re-renders only the current
 * word and the caret, never the whole passage.
 * status: 'pending' | 'correct' | 'wrong' | 'done' (blind — committed, no verdict)
 */
const StreamWord = memo(function StreamWord({ word, status }) {
    const cls = status === 'correct'
        ? VERDICT_CLASS.correct
        : status === 'wrong'
            ? `rounded-sm px-0.5 ${VERDICT_CLASS.wrongBg}`
            : VERDICT_CLASS.pending;
    return <span className={`transition-colors duration-75 ${cls}`}>{word}{' '}</span>;
});

/** Big WPM figure that counts up from 0 when the results screen lands. */
function BigWpm({ value }) {
    const [target, setTarget] = useState(0);
    useEffect(() => { setTarget(value); }, [value]);
    const shown = useCountUp(target, 700);
    return <span className="tabular-nums">{shown}</span>;
}

/** wpm-over-time sparkline from per-word commit timestamps (10 buckets). */
function WpmSparkline({ records, startedAt, endedAt }) {
    const points = useMemo(() => {
        const recs = (records || []).filter((r) => typeof r.t === 'number');
        const span = (endedAt || 0) - (startedAt || 0);
        if (recs.length < 2 || span <= 0) return null;
        const BUCKETS = 10;
        const chars = new Array(BUCKETS).fill(0);
        recs.forEach((r) => {
            const b = Math.min(BUCKETS - 1, Math.max(0, Math.floor(((r.t - startedAt) / span) * BUCKETS)));
            chars[b] += String(r.typed || '').length + 1;
        });
        const bucketMinutes = (span / BUCKETS) / 60000;
        const wpms = chars.map((c) => (c / 5) / Math.max(bucketMinutes, 1 / 60000));
        const max = Math.max(...wpms, 1);
        return wpms.map((w, i) => `${(i / (BUCKETS - 1)) * 100},${28 - (w / max) * 24}`).join(' ');
    }, [records, startedAt, endedAt]);
    if (!points) return null;
    return (
        <div className="mt-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-text-dim">wpm over the run</p>
            <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-12 w-full" aria-hidden="true">
                <polyline points={points} fill="none" strokeWidth="1.5" stroke="var(--accent)" vectorEffect="non-scaling-stroke" />
            </svg>
        </div>
    );
}

// ── The drill ───────────────────────────────────────────────────────────────

export default function SpeedTypeMode({ essay, paragraphs = null, onRunningChange }) {
    const allSections = useMemo(() => buildSpeedSections(essay), [essay]);
    // A narrowed practice scope narrows the drill too: only the selected body
    // paragraphs are offered (intro/conclusion sit outside the selection).
    const sections = useMemo(() => {
        if (!paragraphs) return allSections;
        const keep = new Set(paragraphs.map((p, i) => `bp${p.sourceIndex ?? i}`));
        return allSections.filter((s) => keep.has(s.id));
    }, [allSections, paragraphs]);

    // Setup — scope + toggles.
    const [selectedIds, setSelectedIds] = useState(() => sections.map((s) => s.id));
    const [custom, setCustom] = useState(null); // { label, text } from a manual highlight
    const [feedback, setFeedback] = useState('live'); // live | word | blind
    const [flow, setFlow] = useState('full'); // full | sentence
    const [ignoreCase, setIgnoreCase] = useState(false);
    const [ignorePunct, setIgnorePunct] = useState(false);
    // Accents default to forgiven — most keyboards can't type é, ç or œ, and
    // an accented essay is otherwise untypeable at speed.
    const [ignoreAccents, setIgnoreAccents] = useState(true);
    const [strictStop, setStrictStop] = useState(false);

    // Run state.
    const [phase, setPhase] = useState('setup'); // setup | run | done
    const [run, setRun] = useState(null); // { words, sentenceCount }
    const [idx, setIdx] = useState(0);
    const [typed, setTyped] = useState('');
    const [records, setRecords] = useState([]);
    const [startedAt, setStartedAt] = useState(null);
    const [endedAt, setEndedAt] = useState(null);
    const [now, setNow] = useState(0);
    const [focused, setFocused] = useState(false);
    const [shake, setShake] = useState(false);
    const [strictMsg, setStrictMsg] = useState('');
    const [wasNewBest, setWasNewBest] = useState(false);
    const [caretIdle, setCaretIdle] = useState(true);
    const [lineOffset, setLineOffset] = useState(0);
    const [bestVersion, setBestVersion] = useState(0);
    const inputRef = useRef(null);
    const streamRef = useRef(null);
    const innerRef = useRef(null);
    const caretRef = useRef(null);
    const currentWordRef = useRef(null);
    const caretCharRef = useRef(null);
    const caretEndRef = useRef(null);
    const idleTimer = useRef(null);
    const shakeTimer = useRef(null);

    const opts = useMemo(
        () => ({ ignoreCase, ignorePunct, ignoreAccents }),
        [ignoreCase, ignorePunct, ignoreAccents],
    );
    // Blind means blind: with no verdicts there is nothing for strict stop to
    // stop on, so it switches itself off.
    const effectiveStrict = strictStop && feedback !== 'blind';

    // Per-character stream for the CURRENT word only (memoised — a keystroke
    // recomputes just this word, never the passage). Live mode grades each
    // character; word/blind modes render neutral progress so the caret still
    // glides without leaking verdicts.
    const currentTarget = phase === 'run' && run ? run.words[idx]?.w ?? '' : '';
    const chars = useMemo(() => {
        if (!currentTarget) return [];
        if (feedback === 'live') return charStatuses(currentTarget, typed, opts);
        return [
            ...currentTarget.split('').map((ch, i) => ({ ch, status: i < typed.length ? 'typedneutral' : 'pending' })),
            ...typed.slice(currentTarget.length).split('').map((ch) => ({ ch, status: 'typedneutral' })),
        ];
    }, [currentTarget, typed, opts, feedback]);

    const selectedSections = sections.filter((s) => selectedIds.includes(s.id));
    const passage = custom ? custom.text : selectedSections.map((s) => s.text).join('\n\n');
    const passageWordCount = useMemo(
        () => typeable(passage).trim().split(/\s+/).filter(Boolean).length,
        [passage],
    );

    // Personal bests are stored per essay AND per run configuration — a
    // forgiving 10-word sprint can never claim the whole-essay record.
    const signature = useMemo(() => runSignature({
        sectionIds: custom ? [] : selectedIds,
        customText: custom ? custom.text : null,
        flow,
        ignoreCase,
        ignorePunct,
        ignoreAccents,
    }), [custom, selectedIds, flow, ignoreCase, ignorePunct, ignoreAccents]);
    const best = useMemo(() => {
        void bestVersion; // re-read after a new record is written
        try { return JSON.parse(localStorage.getItem(speedBestKey(essay?.id, signature)) || 'null'); } catch { return null; }
    }, [essay?.id, signature, bestVersion]);

    const toggleSection = (id) => {
        setCustom(null);
        setSelectedIds((prev) => {
            const next = prev.includes(id) ? prev.filter((x) => x !== id) : sections.map((s) => s.id).filter((x) => prev.includes(x) || x === id);
            return next.length ? next : prev; // never empty
        });
    };
    const applyPreset = (kind) => {
        setCustom(null);
        const ids = presetIds(kind, sections);
        if (ids.length) setSelectedIds(ids);
    };

    // Manual highlight: any selection inside one section's preview becomes
    // the passage — it just has to be a verbatim slice of that section.
    const captureHighlight = (section) => {
        const sel = typeof window !== 'undefined' ? window.getSelection() : null;
        if (!sel || sel.isCollapsed) return;
        const raw = typeable(sel.toString()).replace(/\s+/g, ' ').trim();
        if (raw.split(/\s+/).filter(Boolean).length < 2) return;
        const haystack = typeable(section.text).replace(/\s+/g, ' ');
        if (!haystack.includes(raw)) return;
        setCustom({ label: `Highlighted from ${section.label}`, text: raw });
    };

    const start = useCallback(() => {
        const built = buildRun(passage);
        if (!built.words.length) return;
        setRun(built);
        setIdx(0);
        setTyped('');
        setRecords([]);
        setStartedAt(null);
        setEndedAt(null);
        setWasNewBest(false);
        setStrictMsg('');
        setLineOffset(0);
        setPhase('run');
    }, [passage]);

    const finish = useCallback((finalRecords, t0) => {
        const t1 = Date.now();
        setEndedAt(t1);
        setRecords(finalRecords);
        setPhase('done');
        const stats = computeStats(finalRecords, t1 - (t0 || t1));
        // The badge shows ONLY when a new record is actually written — a tie
        // with the standing best is not a new best.
        if (stats.total >= 10 && (!best || stats.wpm > best.wpm)) {
            const entry = { wpm: stats.wpm, accuracy: stats.accuracy, at: new Date().toISOString() };
            try { localStorage.setItem(speedBestKey(essay?.id, signature), JSON.stringify(entry)); } catch { /* private mode */ }
            setBestVersion((v) => v + 1);
            setWasNewBest(true);
        } else {
            setWasNewBest(false);
        }
    }, [best, essay?.id, signature]);

    const pokeCaret = () => {
        setCaretIdle(false);
        clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(() => setCaretIdle(true), 600);
    };

    // The engine: every keystroke lands here. Space commits a word; the last
    // word also completes on an exact match so runs never end on a dangling
    // space press — except in blind mode, where auto-finishing would leak the
    // final word's verdict, so blind requires the trailing space too.
    const handleInput = (value) => {
        if (phase !== 'run' || !run) return;
        pokeCaret();
        const t0 = startedAt || Date.now();
        if (!startedAt) setStartedAt(t0);

        const target = run.words[idx].w;
        const isLast = idx === run.words.length - 1;
        const blind = feedback === 'blind';

        if (value.endsWith(' ')) {
            const word = value.slice(0, -1);
            if (!word.trim()) { setTyped(''); return; } // swallow bare spaces
            const correct = compareWord(target, word, opts);
            if (effectiveStrict && !correct) {
                setShake(true);
                clearTimeout(shakeTimer.current);
                shakeTimer.current = setTimeout(() => setShake(false), 300);
                setStrictMsg('Fix this word to continue');
                setTyped(word); // stay put — fix it first
                return;
            }
            setStrictMsg('');
            const nextRecords = [...records, { target, typed: word, correct, si: run.words[idx].si, t: Date.now() }];
            if (isLast) { finish(nextRecords, t0); return; }
            setRecords(nextRecords);
            setIdx(idx + 1);
            setTyped('');
            return;
        }

        setTyped(value);
        // Exact final word ends the run without needing a trailing space.
        if (!blind && isLast && compareWord(target, value, opts) && value.length >= target.length) {
            finish([...records, { target, typed: value, correct: true, si: run.words[idx].si, t: Date.now() }], t0);
        }
    };

    // Live clock for the stats bar.
    useEffect(() => {
        if (phase !== 'run' || !startedAt) return undefined;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [phase, startedAt]);

    useEffect(() => {
        if (phase === 'run') inputRef.current?.focus();
    }, [phase]);

    // Esc quits to setup, Tab restarts instantly — during the run AND from
    // the results screen.
    useEffect(() => {
        if (phase === 'setup') return undefined;
        const onKey = (e) => {
            if (e.key === 'Tab') { e.preventDefault(); start(); }
            else if (e.key === 'Escape') { e.preventDefault(); setPhase('setup'); }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [phase, start]);

    // Focus mode: tell the workspace when a run is live so it can collapse
    // the page chrome around the stream.
    useEffect(() => { onRunningChange?.(phase === 'run'); }, [phase, onRunningChange]);
    useEffect(() => () => { onRunningChange?.(false); }, [onRunningChange]);
    useEffect(() => () => { clearTimeout(idleTimer.current); clearTimeout(shakeTimer.current); }, []);

    // 3-line rolling window: translate the stream so the active line sits on
    // the middle line — no scrollIntoView jumps.
    useEffect(() => {
        if (phase !== 'run') { setLineOffset(0); return; }
        const wordEl = currentWordRef.current;
        const inner = innerRef.current;
        if (!wordEl || !inner || typeof window === 'undefined') return;
        const lh = parseFloat(window.getComputedStyle(inner).lineHeight);
        if (!lh || Number.isNaN(lh)) return;
        setLineOffset(Math.max(0, wordEl.offsetTop - lh));
    }, [phase, idx, typed, flow]);

    // The gliding caret: measure the current character's box and translate
    // the absolutely-positioned bar onto it.
    useEffect(() => {
        if (phase !== 'run') return;
        const caret = caretRef.current;
        const container = streamRef.current;
        const targetLen = run?.words[idx]?.w.length ?? 0;
        const anchor = (typed.length < targetLen ? caretCharRef.current : caretEndRef.current)
            || caretCharRef.current || caretEndRef.current || currentWordRef.current;
        if (!caret || !container || !anchor || typeof anchor.getBoundingClientRect !== 'function') return;
        const a = anchor.getBoundingClientRect();
        const c = container.getBoundingClientRect();
        if (!a.height && !a.width) { caret.style.opacity = '0'; return; }
        caret.style.opacity = '1';
        caret.style.height = `${a.height}px`;
        caret.style.transform = `translate(${a.left - c.left}px, ${a.top - c.top}px)`;
    });

    if (!sections.length) {
        return <p className="text-sm italic text-text-muted">Set up practice first — the speed run types against your mapped essay.</p>;
    }

    // ── Setup ───────────────────────────────────────────────────────────────
    if (phase === 'setup') {
        const hasIntro = sections.some((s) => s.id === 'intro');
        const hasConclusion = sections.some((s) => s.id === 'conclusion');
        const bodyCount = sections.filter((s) => s.id.startsWith('bp')).length;
        return (
            <div className="animate-rise">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="font-display text-lg font-extrabold tracking-tight text-text-primary">Speed run</h3>
                        <p className="mt-1 text-sm text-text-muted">Type your essay as fast as you can — the drill checks every word.</p>
                        {paragraphs && sections.length < allSections.length && (
                            <p className="mt-1 text-xs font-medium text-accent">Scoped to your selected paragraph{sections.length === 1 ? '' : 's'}.</p>
                        )}
                    </div>
                    {best && (
                        <p className="rounded-xl border border-line-soft px-3 py-2 text-xs font-bold text-text-dim">
                            Personal best (this setup): <span className="text-accent">{best.wpm} wpm</span> · {best.accuracy}%
                        </p>
                    )}
                </div>

                <div className="space-y-3">
                    <OptionRow label="Checking">
                        <TogglePill active={feedback === 'live'} onClick={() => setFeedback('live')} title="Colour every character as you type">Live</TogglePill>
                        <TogglePill active={feedback === 'word'} onClick={() => setFeedback('word')} title="Verdict after each word">Word by word</TogglePill>
                        <TogglePill active={feedback === 'blind'} onClick={() => setFeedback('blind')} title="No feedback until the end">Blind — review only</TogglePill>
                    </OptionRow>
                    <OptionRow label="Flow">
                        <TogglePill active={flow === 'full'} onClick={() => setFlow('full')}>Whole passage</TogglePill>
                        <TogglePill active={flow === 'sentence'} onClick={() => setFlow('sentence')}>Sentence by sentence</TogglePill>
                    </OptionRow>
                    <OptionRow label="Forgive">
                        <TogglePill active={ignoreCase} onClick={() => setIgnoreCase((v) => !v)}>Ignore capitals</TogglePill>
                        <TogglePill active={ignorePunct} onClick={() => setIgnorePunct((v) => !v)}>Ignore punctuation</TogglePill>
                        <TogglePill active={ignoreAccents} onClick={() => setIgnoreAccents((v) => !v)} title="é, ç, œ… match their plain keyboard letters">
                            Ignore accents (é = e)
                        </TogglePill>
                        <TogglePill
                            active={effectiveStrict}
                            disabled={feedback === 'blind'}
                            onClick={() => setStrictStop((v) => !v)}
                            title={feedback === 'blind' ? 'No verdicts in blind mode, so nothing to stop on' : 'Space refuses to advance past a wrong word'}
                        >
                            Strict stop on error
                        </TogglePill>
                    </OptionRow>
                    <OptionRow label="Type">
                        <TogglePill active={!custom && selectedIds.length === sections.length} onClick={() => applyPreset('all')}>Whole essay</TogglePill>
                        {hasIntro && <TogglePill active={!custom && selectedIds.length === 1 && selectedIds[0] === 'intro'} onClick={() => applyPreset('intro')}>Just the intro</TogglePill>}
                        {bodyCount > 0 && <TogglePill active={!custom && selectedIds.length === bodyCount && selectedIds.every((id) => id.startsWith('bp'))} onClick={() => applyPreset('bodies')}>Body ¶s only</TogglePill>}
                        {hasConclusion && <TogglePill active={!custom && selectedIds.length === 1 && selectedIds[0] === 'conclusion'} onClick={() => applyPreset('conclusion')}>Just the conclusion</TogglePill>}
                        {bodyCount > 0 && hasConclusion && (
                            <TogglePill
                                active={!custom && selectedIds.length === 2 && selectedIds.includes('conclusion') && selectedIds.includes(sections.filter((s) => s.id.startsWith('bp')).at(-1)?.id)}
                                onClick={() => applyPreset('lastBpConclusion')}
                            >
                                Last BP + conclusion
                            </TogglePill>
                        )}
                    </OptionRow>
                    <OptionRow label="Sections">
                        {sections.map((s) => (
                            <TogglePill key={s.id} active={!custom && selectedIds.includes(s.id)} onClick={() => toggleSection(s.id)}>{s.label}</TogglePill>
                        ))}
                    </OptionRow>
                </div>

                {custom ? (
                    <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-accent/50 bg-accent-soft/40 px-3 py-2.5">
                        <p className="min-w-0 text-xs font-medium text-text-primary">
                            <span className="font-bold text-accent">{custom.label}:</span>{' '}
                            <span className="italic">“{custom.text.length > 140 ? `${custom.text.slice(0, 140)}…` : custom.text}”</span>
                        </p>
                        <button type="button" aria-label="Clear highlighted selection" onClick={() => setCustom(null)}
                            className="focus-ring shrink-0 rounded p-1 text-text-dim hover:text-text-primary">
                            <XMarkIcon className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ) : (
                    <p className="mt-4 text-[11px] font-medium text-text-dim">
                        …or highlight any passage below to type exactly that.
                    </p>
                )}

                <div className="mt-2 max-h-56 space-y-3 overflow-y-auto rounded-xl border border-line-soft bg-surface-body p-4">
                    {selectedSections.map((s) => (
                        <div key={s.id}>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-text-dim">{s.label}</p>
                            <p
                                onMouseUp={() => captureHighlight(s)}
                                onTouchEnd={() => captureHighlight(s)}
                                className="cursor-text select-text font-serif text-sm leading-relaxed text-text-muted"
                            >
                                {s.text}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={start} disabled={!passageWordCount}
                        className="btn-primary press focus-ring inline-flex items-center gap-2 disabled:opacity-40">
                        <RocketLaunchIcon className="h-4 w-4" /> Start the run
                    </button>
                    <span className="text-xs font-medium text-text-dim">{passageWordCount} words · timer starts on your first key</span>
                </div>
            </div>
        );
    }

    // ── Results ─────────────────────────────────────────────────────────────
    if (phase === 'done') {
        const stats = computeStats(records, (endedAt || 0) - (startedAt || endedAt || 0));
        const bySentence = [];
        records.forEach((r) => {
            (bySentence[r.si] = bySentence[r.si] || []).push(r);
        });
        return (
            <div className="animate-rise">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div className="flex items-center gap-5">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-text-dim">
                                Run complete
                                {wasNewBest && (
                                    <span className="ml-2 inline-block animate-tada rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-contrast">
                                        New personal best
                                    </span>
                                )}
                            </p>
                            <p className="font-display text-5xl font-extrabold tracking-tight text-text-primary">
                                <BigWpm value={stats.wpm} /> <span className="text-lg text-text-dim">wpm</span>
                            </p>
                        </div>
                        <AccuracyRing value={stats.accuracy} />
                    </div>
                    <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                        <div><dt className="inline text-text-dim">Raw </dt><dd className="inline font-bold text-text-primary">{stats.rawWpm} wpm</dd></div>
                        <div><dt className="inline text-text-dim">Errors </dt><dd className={`inline font-bold ${stats.errors ? VERDICT_CLASS.wrong : 'text-text-primary'}`}>{stats.errors}</dd></div>
                        <div><dt className="inline text-text-dim">Time </dt><dd className="inline font-bold text-text-primary">{stats.seconds}s</dd></div>
                    </dl>
                </div>

                <WpmSparkline records={records} startedAt={startedAt} endedAt={endedAt} />

                <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-line-soft bg-surface-body p-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-dim">The review — every word, verdicts included</p>
                    <p className="font-serif text-[15px] leading-relaxed">
                        {records.map((r, i) => (
                            <span key={i}>
                                {r.correct ? (
                                    <span className="text-text-primary">{r.target}</span>
                                ) : (
                                    <span title={`You typed “${r.typed}”`} className={`rounded-sm px-0.5 ${VERDICT_CLASS.wrongBg}`}>
                                        {r.target}
                                        <span className="text-[11px] font-bold"> ✗{r.typed ? ` ${r.typed}` : ''}</span>
                                    </span>
                                )}
                                {' '}
                            </span>
                        ))}
                    </p>
                </div>

                {flow === 'sentence' && bySentence.filter(Boolean).length > 1 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {bySentence.map((list, si) => list && (
                            <span key={si} className={`rounded-lg px-2 py-1 text-[11px] font-bold ${
                                list.every((r) => r.correct) ? VERDICT_CLASS.correctBg : VERDICT_CLASS.wrongBg
                            }`}>
                                S{si + 1}: {list.filter((r) => r.correct).length}/{list.length}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={start} className="btn-primary press focus-ring inline-flex items-center gap-2">
                        <ArrowPathIcon className="h-4 w-4" /> Go again <kbd className="rounded bg-accent-strong/40 px-1 text-[10px] font-bold">Tab</kbd>
                    </button>
                    <button type="button" onClick={() => setPhase('setup')}
                        className="press focus-ring inline-flex items-center gap-2 rounded-xl border border-line-soft px-3 py-2 text-xs font-bold text-text-dim transition-colors hover:border-text-dim hover:text-text-primary">
                        <Cog6ToothIcon className="h-3.5 w-3.5" /> Change settings <kbd className="rounded bg-surface-soft px-1 text-[10px] font-bold">Esc</kbd>
                    </button>
                    {feedback !== 'blind' && (
                        <button type="button" onClick={() => { setFeedback('blind'); setPhase('setup'); }}
                            className="focus-ring inline-flex items-center gap-2 text-xs font-bold text-accent transition-opacity hover:opacity-70">
                            Try it blind <ArrowRightIcon className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ── The run ─────────────────────────────────────────────────────────────
    const words = run.words;
    const currentSentence = words[idx].si;
    const visible = flow === 'sentence'
        ? words.map((w, i) => ({ ...w, i })).filter((w) => w.si === currentSentence)
        : words.map((w, i) => ({ ...w, i }));
    const elapsed = startedAt ? Math.max(now, startedAt) - startedAt : 0;
    const liveStats = computeStats(records, elapsed || 1000);
    const progress = Math.round((records.length / words.length) * 100);
    const blind = feedback === 'blind';

    const caretCharIndex = Math.min(typed.length, chars.length);
    const charClass = (status) => {
        switch (status) {
            case 'ok': return 'text-text-primary';
            case 'bad': return `rounded-[2px] ${VERDICT_CLASS.wrongBg}`;
            case 'extra': return `rounded-[2px] line-through ${VERDICT_CLASS.wrongBg}`;
            case 'typedneutral': return 'text-text-primary';
            default: return VERDICT_CLASS.pending;
        }
    };

    return (
        <div className="flex min-h-[40vh] flex-col justify-center">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-text-dim">
                <div className="flex flex-1 flex-wrap items-center gap-x-5 gap-y-1">
                    <span aria-label="Elapsed time" className="tabular-nums text-text-primary">{Math.floor(elapsed / 1000)}s</span>
                    {!blind && startedAt && <span className="tabular-nums">{liveStats.wpm} wpm</span>}
                    {!blind && records.length > 0 && <span className="tabular-nums">{liveStats.accuracy}% acc</span>}
                    {flow === 'sentence' && <span>Sentence {currentSentence + 1} of {run.sentenceCount}</span>}
                    {blind && <span className="italic font-medium">blind run — verdicts at the end</span>}
                    <span
                        role="progressbar"
                        aria-label="Run progress"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-valuenow={progress}
                        className="h-1 min-w-[80px] flex-1 overflow-hidden rounded-full bg-line-soft"
                    >
                        <span className="block h-full bg-accent" style={{ width: `${progress}%` }} />
                    </span>
                </div>
                <button type="button" onClick={() => setPhase('setup')}
                    className="press focus-ring rounded-lg border border-line-soft px-2.5 py-1.5 font-bold transition-colors hover:border-text-dim hover:text-text-primary">
                    Quit <kbd className="rounded bg-surface-soft px-1 text-[10px]">Esc</kbd>
                </button>
            </div>

            {/* A hidden input drives everything; the stream is the display.
                Clicking anywhere in the stream refocuses the input. */}
            <div
                className={`relative rounded-xl border bg-surface-body p-5 ${shake ? 'animate-shake-x' : ''} ${
                    focused ? 'border-accent/60' : 'border-line-soft'
                }`}
            >
                {!focused && (
                    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-xl bg-surface-body/70 backdrop-blur-[1px]">
                        <span className="text-sm font-bold text-text-dim">Click here and type</span>
                    </div>
                )}
                <div
                    ref={streamRef}
                    aria-hidden="true"
                    className="relative overflow-hidden font-serif text-lg leading-loose"
                    style={{ height: '6em' }}
                >
                    <div
                        ref={innerRef}
                        style={{ transform: `translateY(-${lineOffset}px)`, transition: 'transform 150ms ease' }}
                    >
                        {visible.map(({ w, i }) => {
                            if (i < idx) {
                                const rec = records[i];
                                return <StreamWord key={i} word={w} status={blind ? 'pending' : (rec && !rec.correct ? 'wrong' : 'correct')} />;
                            }
                            if (i === idx) {
                                return (
                                    <span key={i} ref={currentWordRef} className="rounded-sm bg-accent/10">
                                        {chars.map((c, ci) => (
                                            <span
                                                key={ci}
                                                ref={ci === caretCharIndex ? caretCharRef : undefined}
                                                className={`transition-colors duration-75 ${charClass(c.status)}`}
                                            >
                                                {c.ch}
                                            </span>
                                        ))}
                                        <span ref={caretEndRef}>{' '}</span>
                                    </span>
                                );
                            }
                            return <StreamWord key={i} word={w} status="pending" />;
                        })}
                    </div>
                    <span
                        ref={caretRef}
                        className={`type-caret absolute left-0 top-0 ${caretIdle ? 'caret-idle' : ''}`}
                        style={{ opacity: 0 }}
                    />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={typed}
                    onChange={(e) => handleInput(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    aria-label="Type the essay here"
                    autoCapitalize="off"
                    autoCorrect="off"
                    autoComplete="off"
                    spellCheck={false}
                    className="absolute inset-0 z-20 h-full w-full cursor-text opacity-0"
                />
            </div>
            <span role="status" className="sr-only">{strictMsg}</span>
            <p className="mt-2 text-[11px] font-medium text-text-dim">
                {effectiveStrict ? 'Strict mode — a wrong word will not let you pass. ' : ''}
                Space commits each word · Tab restarts · Esc quits
            </p>
        </div>
    );
}
