import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useReveal } from '../lib/useReveal';
import CapletLoader from '../components/CapletLoader';
import SlideRenderer from '../components/lesson/SlideRenderer';
import { extractPdfText } from '../lib/pdfExtract';
import {
    buildTopicSentenceCloze,
    buildQuoteCards,
    buildParagraphOrder,
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
} from '@heroicons/react/24/outline';

/* ──────────────────────────────────────────────────────────────────────────
   New essay form — paste text or extract from a PDF (client-side).
   ────────────────────────────────────────────────────────────────────────── */
function NewEssayForm({ onCreated }) {
    const [title, setTitle] = useState('');
    const [text, setText] = useState('');
    const [pdfBusy, setPdfBusy] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const onPdf = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // allow re-selecting the same file
        if (!file) return;
        setError(null);
        setPdfBusy(true);
        try {
            const extracted = await extractPdfText(file);
            if (!extracted?.trim()) {
                setError('Could not read any text from that PDF.');
            } else {
                setText((prev) => (prev.trim() ? `${prev}\n\n${extracted}` : extracted));
                if (!title.trim()) setTitle(file.name.replace(/\.pdf$/i, ''));
            }
        } catch {
            setError('Failed to read the PDF. Try pasting the text instead.');
        } finally {
            setPdfBusy(false);
        }
    };

    const submit = async () => {
        setError(null);
        if (!title.trim()) return setError('Give your essay a title.');
        if (!text.trim()) return setError('Paste your essay or upload a PDF first.');
        setSubmitting(true);
        try {
            await onCreated(title.trim(), text);
            setTitle('');
            setText('');
        } catch (e) {
            setError(e?.message || 'Could not save the essay.');
        } finally {
            setSubmitting(false);
        }
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
                    {pdfBusy ? 'Reading PDF' : 'Upload PDF'}
                    <input type="file" accept="application/pdf" className="hidden" onChange={onPdf} disabled={pdfBusy} />
                </label>
                <button
                    type="button"
                    onClick={submit}
                    disabled={submitting || pdfBusy}
                    className="btn-primary inline-flex items-center gap-2 hover:-translate-y-0.5 transition-transform disabled:opacity-40"
                >
                    <PlusIcon className="w-4 h-4" />
                    {submitting ? 'Saving' : 'Save and parse'}
                </button>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────────────────────────────────
   Chunked paragraph recall — the core study flow. Goes paragraph by paragraph,
   cueing each with the previous paragraph's closing line, and schedules every
   paragraph + its quotes through the shared spaced-repetition scheduler.
   ────────────────────────────────────────────────────────────────────────── */
function RecallChunks({ essay, onScheduled }) {
    const structure = essay.parsedStructure || {};
    const paras = structure.bodyParagraphs || [];

    const [pIndex, setPIndex] = useState(0);
    const [graded, setGraded] = useState(false);
    const [busy, setBusy] = useState(false);
    const [revealed, setRevealed] = useState(false);
    const [done, setDone] = useState(false);

    if (!paras.length) {
        return <p className="text-sm text-text-muted italic">No body paragraphs were found in this essay.</p>;
    }
    if (done) {
        return (
            <div className="text-center py-12">
                <AcademicCapIcon className="w-8 h-8 text-accent mx-auto mb-4" />
                <p className="font-display text-lg font-extrabold tracking-tight text-text-primary">Recall session complete</p>
                <p className="text-sm text-text-muted mt-1">Each paragraph reschedules on the 1, 3, 7, 14 day ladder.</p>
                <button
                    type="button"
                    onClick={() => { setPIndex(0); setGraded(false); setRevealed(false); setDone(false); }}
                    className="btn-secondary mt-6 inline-flex hover:-translate-y-0.5 transition-transform"
                >
                    Restart
                </button>
            </div>
        );
    }

    const current = paras[pIndex];
    const cloze = buildTopicSentenceCloze(current, pIndex);
    const cue = pIndex === 0
        ? (structure.thesis
            ? `Start from your thesis: “${structure.thesis}”`
            : 'Recall your first body paragraph.')
        : `The previous paragraph ended: “${lastSentence(paras[pIndex - 1].text)}”. What comes next?`;

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
        } catch (e) {
            console.warn('Schedule paragraph failed:', e?.message || e);
        } finally {
            setBusy(false);
            setGraded(true);
        }
    };

    const next = () => {
        if (pIndex + 1 < paras.length) {
            setPIndex((i) => i + 1);
            setGraded(false);
            setRevealed(false);
        } else {
            setDone(true);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-text-dim">Paragraph {pIndex + 1} / {paras.length}</span>
            </div>
            <p className="text-sm text-text-muted italic mb-6">{cue}</p>

            {cloze ? (
                <SlideRenderer key={`p-${pIndex}`} slide={cloze} onSubmit={(correct) => grade(correct)} />
            ) : (
                <div>
                    <p className="text-base text-text-primary font-serif mb-4">
                        Recall this paragraph's opening: <strong>{current.topicSentence || '(no topic sentence)'}</strong>
                    </p>
                    {!graded && (
                        <div className="flex items-center gap-3">
                            <button type="button" disabled={busy} onClick={() => grade('fail')}
                                className="text-sm font-medium text-rose-500 border border-rose-400/60 px-5 py-2.5 hover:bg-rose-500 hover:text-white transition-colors disabled:opacity-40">
                                Missed it
                            </button>
                            <button type="button" disabled={busy} onClick={() => grade('pass')}
                                className="text-sm font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/60 px-5 py-2.5 hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-40">
                                Got it
                            </button>
                        </div>
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
                            <p className="text-sm md:text-base text-text-primary leading-relaxed whitespace-pre-wrap font-serif">
                                {current.text}
                            </p>
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

/* ──────────────────────────────────────────────────────────────────────────
   Essay detail — parse + practice (Recall / Quotes / Order).
   ────────────────────────────────────────────────────────────────────────── */
function EssayDetail({ essay, onBack, onParsed, onDeleted }) {
    const [parsing, setParsing] = useState(false);
    const [parseError, setParseError] = useState(null);
    const [mode, setMode] = useState('recall');
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
        try {
            const res = await api.parseEssay(essay.id);
            onParsed?.(res.essay);
        } catch (e) {
            setParseError(e?.message || 'Could not parse this essay right now.');
        } finally {
            setParsing(false);
        }
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
                <div className="bg-block-blue rounded-3xl p-10 text-center shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
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
                        {parsing ? 'Parsing' : 'Parse with AI'}
                    </button>
                </div>
            ) : (
                <div>
                    <div className="flex flex-wrap gap-2 mb-8 border-b border-line-soft">
                        {[
                            { key: 'recall', label: 'Recall' },
                            { key: 'quotes', label: 'Quotes' },
                            { key: 'order', label: 'Order' },
                        ].map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setMode(t.key)}
                                className={`px-4 py-3 text-sm font-medium -mb-px border-b-2 transition-colors ${
                                    mode === t.key
                                        ? 'border-accent text-accent'
                                        : 'border-transparent text-text-dim hover:text-text-primary'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="bg-surface-raised rounded-3xl p-6 md:p-10 min-h-[320px] flex flex-col justify-center shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                        {mode === 'recall' && <RecallChunks essay={essay} onScheduled={loadDue} />}
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

/* ──────────────────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────────────────── */
export default function EssayMemoriser() {
    const [essays, setEssays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [essay, setEssay] = useState(null); // full selected essay
    const [opening, setOpening] = useState(false);

    useReveal();

    const loadEssays = async () => {
        const data = await api.getEssays().catch(() => null);
        setEssays(data?.essays || []);
    };

    useEffect(() => {
        (async () => {
            await loadEssays();
            setLoading(false);
        })();
    }, []);

    const openEssay = async (id) => {
        setOpening(true);
        try {
            const res = await api.getEssay(id);
            setEssay(res.essay);
        } catch (e) {
            console.warn('Open essay failed:', e?.message || e);
        } finally {
            setOpening(false);
        }
    };

    const handleCreate = async (title, text) => {
        const res = await api.createEssay(title, text);
        const created = res.essay;
        // Best-effort parse on create; if AI is unavailable the essay is still
        // saved and the detail view offers a manual "Parse with AI" retry.
        try {
            const parsed = await api.parseEssay(created.id);
            setEssay(parsed.essay);
        } catch {
            setEssay(created);
        }
        await loadEssays();
    };

    const handleParsed = (updated) => {
        setEssay(updated);
        loadEssays();
    };

    const handleDelete = async (id) => {
        try {
            await api.deleteEssay(id);
        } catch (e) {
            console.warn('Delete essay failed:', e?.message || e);
        }
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
                        onBack={() => setEssay(null)}
                        onParsed={handleParsed}
                        onDeleted={handleDelete}
                    />
                ) : (
                    <>
                        <header className="mb-12 reveal-text">
                            <span className="section-kicker">Essay memoriser</span>
                            <h1 className="text-5xl md:text-7xl">Learn it by heart.</h1>
                            <p className="mt-8 text-xl text-text-muted font-medium max-w-xl">
                                Caplet breaks your essay into its real structure, then drills you on it with spaced repetition.
                            </p>
                        </header>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 reveal-stagger">
                            <NewEssayForm onCreated={handleCreate} />

                            <div>
                                <h2 className="font-display text-lg font-extrabold tracking-tight text-text-primary mb-4">Your essays</h2>
                                {opening && <p className="text-sm text-text-dim mb-3">Opening</p>}
                                {essays.length === 0 ? (
                                    <div className="bg-block-cream rounded-3xl p-10 text-center shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                                        <DocumentTextIcon className="w-8 h-8 text-text-dim mx-auto mb-4" />
                                        <p className="text-text-dim text-sm font-medium">No essays yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {essays.map((e) => (
                                            <button
                                                key={e.id}
                                                type="button"
                                                onClick={() => openEssay(e.id)}
                                                className="bg-surface-raised rounded-2xl p-5 text-left flex items-center justify-between gap-4 group shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] hover:-translate-y-0.5 transition-transform"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate">
                                                        {e.title}
                                                    </p>
                                                    <p className="text-xs font-medium text-text-dim mt-1">
                                                        {e.parsed ? `${e.paragraphCount} body paragraph${e.paragraphCount === 1 ? '' : 's'}` : 'Not parsed yet'}
                                                    </p>
                                                </div>
                                                <ArrowLeftIcon className="w-4 h-4 text-text-dim rotate-180 shrink-0" />
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
