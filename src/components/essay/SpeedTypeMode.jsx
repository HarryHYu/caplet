import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from '../../lib/speedType';

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
 * that. The essay text is never altered — this is a pure typing drill.
 */

const bestKey = (essayId) => `caplet:speedbest:${essayId}`;

// ── Small UI atoms ──────────────────────────────────────────────────────────

function TogglePill({ active, onClick, children, disabled, title }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-pressed={active}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors disabled:opacity-35 ${
                active ? 'bg-accent text-white' : 'bg-surface-body text-text-dim hover:text-text-primary'
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

// ── The drill ───────────────────────────────────────────────────────────────

export default function SpeedTypeMode({ essay }) {
    const sections = useMemo(() => buildSpeedSections(essay), [essay]);

    // Setup — scope + toggles.
    const [selectedIds, setSelectedIds] = useState(() => sections.map((s) => s.id));
    const [custom, setCustom] = useState(null); // { label, text } from a manual highlight
    const [feedback, setFeedback] = useState('live'); // live | word | blind
    const [flow, setFlow] = useState('full'); // full | sentence
    const [ignoreCase, setIgnoreCase] = useState(false);
    const [ignorePunct, setIgnorePunct] = useState(false);
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
    const [best, setBest] = useState(() => {
        try { return JSON.parse(localStorage.getItem(bestKey(essay?.id)) || 'null'); } catch { return null; }
    });
    const inputRef = useRef(null);
    const currentWordRef = useRef(null);

    const opts = useMemo(() => ({ ignoreCase, ignorePunct }), [ignoreCase, ignorePunct]);
    // Blind means blind: with no verdicts there is nothing for strict stop to
    // stop on, so it switches itself off.
    const effectiveStrict = strictStop && feedback !== 'blind';

    const selectedSections = sections.filter((s) => selectedIds.includes(s.id));
    const passage = custom ? custom.text : selectedSections.map((s) => s.text).join('\n\n');
    const passageWordCount = useMemo(
        () => typeable(passage).trim().split(/\s+/).filter(Boolean).length,
        [passage],
    );

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

    const start = () => {
        const built = buildRun(passage);
        if (!built.words.length) return;
        setRun(built);
        setIdx(0);
        setTyped('');
        setRecords([]);
        setStartedAt(null);
        setEndedAt(null);
        setPhase('run');
    };

    const finish = useCallback((finalRecords, t0) => {
        const t1 = Date.now();
        setEndedAt(t1);
        setRecords(finalRecords);
        setPhase('done');
        const stats = computeStats(finalRecords, t1 - (t0 || t1));
        if (stats.total >= 10 && (!best || stats.wpm > best.wpm)) {
            const entry = { wpm: stats.wpm, accuracy: stats.accuracy, at: new Date().toISOString() };
            setBest(entry);
            try { localStorage.setItem(bestKey(essay?.id), JSON.stringify(entry)); } catch { /* private mode */ }
        }
    }, [best, essay?.id]);

    // The engine: every keystroke lands here. Space commits a word; the last
    // word also completes on an exact match so runs never end on a dangling
    // space press.
    const handleInput = (value) => {
        if (phase !== 'run' || !run) return;
        const t0 = startedAt || Date.now();
        if (!startedAt) setStartedAt(t0);

        const target = run.words[idx].w;
        const isLast = idx === run.words.length - 1;

        if (value.endsWith(' ')) {
            const word = value.slice(0, -1);
            if (!word.trim()) { setTyped(''); return; } // swallow bare spaces
            const correct = compareWord(target, word, opts);
            if (effectiveStrict && !correct) {
                setShake(true);
                setTimeout(() => setShake(false), 300);
                setTyped(word); // stay put — fix it first
                return;
            }
            const nextRecords = [...records, { target, typed: word, correct, si: run.words[idx].si }];
            if (isLast) { finish(nextRecords, t0); return; }
            setRecords(nextRecords);
            setIdx(idx + 1);
            setTyped('');
            return;
        }

        setTyped(value);
        // Exact final word ends the run without needing a trailing space.
        if (isLast && compareWord(target, value, opts) && value.length >= target.length) {
            finish([...records, { target, typed: value, correct: true, si: run.words[idx].si }], t0);
        }
    };

    // Live clock for the stats bar.
    useEffect(() => {
        if (phase !== 'run' || !startedAt) return undefined;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [phase, startedAt]);

    // Keep the caret's word in view on long passages.
    useEffect(() => {
        currentWordRef.current?.scrollIntoView?.({ block: 'nearest' });
    }, [idx]);

    useEffect(() => {
        if (phase === 'run') inputRef.current?.focus();
    }, [phase]);

    if (!sections.length) {
        return <p className="text-sm italic text-text-muted">Set up practice first — the speed run types against your mapped essay.</p>;
    }

    // ── Setup ───────────────────────────────────────────────────────────────
    if (phase === 'setup') {
        const hasIntro = sections.some((s) => s.id === 'intro');
        const hasConclusion = sections.some((s) => s.id === 'conclusion');
        const bodyCount = sections.filter((s) => s.id.startsWith('bp')).length;
        return (
            <div>
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="font-display text-lg font-extrabold tracking-tight text-text-primary">Speed run</h3>
                        <p className="mt-1 text-sm text-text-muted">Type your essay as fast as you can — the drill checks every word.</p>
                    </div>
                    {best && (
                        <p className="rounded-xl border border-line-soft px-3 py-2 text-xs font-bold text-text-dim">
                            Personal best: <span className="text-accent">{best.wpm} wpm</span> · {best.accuracy}%
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
                                active={!custom && selectedIds.length === 2 && selectedIds.includes('conclusion') && selectedIds.includes(`bp${bodyCount - 1}`)}
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
                            className="shrink-0 rounded p-1 text-text-dim hover:text-text-primary">
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
                        className="btn-primary inline-flex items-center gap-2 disabled:opacity-40">
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
        const isBest = best && stats.wpm === best.wpm && stats.total >= 10;
        const bySentence = [];
        records.forEach((r) => {
            (bySentence[r.si] = bySentence[r.si] || []).push(r);
        });
        return (
            <div>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-text-dim">Run complete{isBest ? ' — new personal best!' : ''}</p>
                        <p className="font-display text-4xl font-extrabold tracking-tight text-text-primary">
                            {stats.wpm} <span className="text-lg text-text-dim">wpm</span>
                        </p>
                    </div>
                    <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                        <div><dt className="inline text-text-dim">Accuracy </dt><dd className="inline font-bold text-text-primary">{stats.accuracy}%</dd></div>
                        <div><dt className="inline text-text-dim">Raw </dt><dd className="inline font-bold text-text-primary">{stats.rawWpm} wpm</dd></div>
                        <div><dt className="inline text-text-dim">Errors </dt><dd className="inline font-bold text-text-primary">{stats.errors}</dd></div>
                        <div><dt className="inline text-text-dim">Time </dt><dd className="inline font-bold text-text-primary">{stats.seconds}s</dd></div>
                    </dl>
                </div>

                <div className="max-h-72 overflow-y-auto rounded-xl border border-line-soft bg-surface-body p-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-dim">The review — every word, verdicts included</p>
                    <p className="font-serif text-[15px] leading-relaxed">
                        {records.map((r, i) => (
                            <span key={i}>
                                {r.correct ? (
                                    <span className="text-text-primary">{r.target}</span>
                                ) : (
                                    <span title={`You typed “${r.typed}”`} className="rounded-sm bg-rose-200/70 px-0.5 text-rose-700 dark:bg-rose-500/25 dark:text-rose-300">
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
                                list.every((r) => r.correct)
                                    ? 'bg-emerald-100/70 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                                    : 'bg-rose-100/70 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                            }`}>
                                S{si + 1}: {list.filter((r) => r.correct).length}/{list.length}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={start} className="btn-primary inline-flex items-center gap-2">
                        <ArrowPathIcon className="h-4 w-4" /> Go again
                    </button>
                    <button type="button" onClick={() => setPhase('setup')}
                        className="inline-flex items-center gap-2 rounded-xl border border-line-soft px-3 py-2 text-xs font-bold text-text-dim transition-colors hover:border-text-dim hover:text-text-primary">
                        <Cog6ToothIcon className="h-3.5 w-3.5" /> Change settings
                    </button>
                    {feedback !== 'blind' && (
                        <button type="button" onClick={() => { setFeedback('blind'); setPhase('setup'); }}
                            className="inline-flex items-center gap-2 text-xs font-bold text-accent transition-opacity hover:opacity-70">
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

    return (
        <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-text-dim">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                    <span aria-label="Elapsed time" className="tabular-nums text-text-primary">{Math.floor(elapsed / 1000)}s</span>
                    {!blind && startedAt && <span>{liveStats.wpm} wpm</span>}
                    {!blind && records.length > 0 && <span>{liveStats.accuracy}% acc</span>}
                    {flow === 'sentence' && <span>Sentence {currentSentence + 1} of {run.sentenceCount}</span>}
                    <span>{progress}%</span>
                    {blind && <span className="italic font-medium">blind run — verdicts at the end</span>}
                </div>
                <button type="button" onClick={() => setPhase('setup')}
                    className="rounded-lg border border-line-soft px-2.5 py-1.5 font-bold transition-colors hover:border-text-dim hover:text-text-primary">
                    Quit
                </button>
            </div>

            {/* One input drives everything; clicking the text refocuses it. */}
            <div
                className={`relative max-h-64 overflow-y-auto rounded-xl border bg-surface-body p-5 ${shake ? 'animate-[essayShake_0.3s_ease-in-out]' : ''} ${
                    focused ? 'border-accent/60' : 'border-line-soft'
                }`}
                onClick={() => inputRef.current?.focus()}
            >
                {!focused && (
                    <div className="absolute inset-0 z-10 grid place-items-center rounded-xl bg-surface-body/70 backdrop-blur-[1px]">
                        <span className="text-sm font-bold text-text-dim">Click here and type</span>
                    </div>
                )}
                <p className="font-serif text-lg leading-loose">
                    {visible.map(({ w, i }) => {
                        if (i < idx) {
                            const rec = records[i];
                            if (blind) return <span key={i} className="text-text-dim">{w} </span>;
                            return (
                                <span key={i} className={rec && !rec.correct
                                    ? 'rounded-sm bg-rose-200/60 text-rose-700 dark:bg-rose-500/25 dark:text-rose-300'
                                    : 'text-emerald-700 dark:text-emerald-400'}>
                                    {w}{' '}
                                </span>
                            );
                        }
                        if (i === idx) {
                            return (
                                <span key={i} ref={currentWordRef} className="rounded-sm bg-accent/10 underline decoration-accent/70 decoration-2 underline-offset-4">
                                    {feedback === 'live'
                                        ? charStatuses(w, typed, opts).map((c, ci) => (
                                            <span key={ci} className={
                                                c.status === 'ok' ? 'text-text-primary'
                                                    : c.status === 'bad' ? 'bg-rose-200/80 text-rose-700 dark:bg-rose-500/30 dark:text-rose-300'
                                                        : c.status === 'extra' ? 'bg-rose-200/80 text-rose-700 dark:bg-rose-500/30 dark:text-rose-300'
                                                            : 'text-text-dim'
                                            }>{c.ch}</span>
                                        ))
                                        : <span className="text-text-primary">{w}</span>}
                                    {' '}
                                </span>
                            );
                        }
                        return <span key={i} className="text-text-dim">{w} </span>;
                    })}
                </p>
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
                className="mt-3 w-full rounded-xl border border-line-soft bg-surface-raised px-4 py-3 font-mono text-sm text-text-primary outline-none focus:border-accent"
                placeholder={effectiveStrict ? 'Strict mode — a wrong word will not let you pass' : 'Type here — space moves to the next word'}
            />
        </div>
    );
}
