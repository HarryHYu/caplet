import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import SlideRenderer from '../components/lesson/SlideRenderer';
import { slideKindLabel, normalizeSlide } from '../lib/slideSchema';
import { BookmarkIcon, ArrowRightIcon, SparklesIcon, XMarkIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import { useReveal } from '../lib/useReveal';

// Modal slideshow showing an AI-generated summary of a category's slides.
function SummaryModal({ open, loading, error, category, slides, onClose }) {
    const [idx, setIdx] = useState(0);
    useEffect(() => { setIdx(0); }, [slides]);
    if (!open) return null;

    const total = slides?.length || 0;
    const current = total ? slides[Math.min(idx, total - 1)] : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
            <div
                className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden bg-surface-body border border-line-soft flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-line-soft">
                    <div className="flex items-center gap-2 min-w-0">
                        <SparklesIcon className="w-4 h-4 text-accent shrink-0" />
                        <span className="text-sm font-medium text-text-dim truncate">
                            Summary · {category}
                        </span>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close summary"
                        className="w-7 h-7 rounded-full border border-line-soft text-text-dim hover:text-text-primary hover:border-text-dim flex items-center justify-center">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-10 min-h-[260px] flex flex-col justify-center">
                    {loading && <CapletLoader message="Summarizing with AI…" />}
                    {!loading && error && (
                        <p className="text-center text-rose-400 text-sm font-medium">{error}</p>
                    )}
                    {!loading && !error && current && <SlideRenderer slide={current} onSubmit={() => {}} />}
                </div>

                {!loading && !error && total > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-line-soft">
                        <button type="button" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}
                            className="text-sm font-medium text-text-dim hover:text-accent disabled:opacity-30">
                            ← Prev
                        </button>
                        <span className="text-sm font-medium text-text-dim">{Math.min(idx + 1, total)} / {total}</span>
                        <button type="button" disabled={idx >= total - 1} onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
                            className="text-sm font-medium text-text-dim hover:text-accent disabled:opacity-30">
                            Next →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// Active-recall review session over the saved slides that are due today.
// For each slide we ask the AI for one recall question, the learner answers
// from memory, reveals the model answer, then self-grades — and that grade is
// submitted through the shared spaced-repetition scheduler. If AI is
// unavailable, we fall back to showing the slide itself for self-review.
function ReviewSession({ open, slides, onClose, onFinished }) {
    const [idx, setIdx] = useState(0);
    const [revealed, setRevealed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [qa, setQa] = useState(null);
    const [qError, setQError] = useState(null);
    const [grading, setGrading] = useState(false);

    const total = slides.length;
    const current = slides[idx];

    // Restart at the top whenever the session is (re)opened.
    useEffect(() => { if (open) { setIdx(0); } }, [open]);

    // Fetch a fresh recall question whenever the current slide changes.
    useEffect(() => {
        if (!open || !current) return;
        let active = true;
        setRevealed(false);
        setQa(null);
        setQError(null);
        setLoading(true);
        api.getSlideRecallQuestion(current.id)
            .then((res) => { if (active) setQa({ question: res.question, answer: res.answer }); })
            .catch((e) => { if (active) setQError(e?.message || 'Could not generate a question right now.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    // current.id is the canonical signal that the slide changed; depending on
    // current.id (not the whole object) avoids re-fetching on unrelated renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, current?.id]);

    if (!open || !current) return null;

    const fallbackSlide = qError ? getSlidePreview(current) : null;

    const grade = async (recall) => {
        setGrading(true);
        try {
            await api.submitReview('savedSlide', current.id, recall);
        } catch (e) {
            console.warn('Submit review failed:', e?.message || e);
        } finally {
            setGrading(false);
        }
        if (idx + 1 < total) {
            setIdx((i) => i + 1);
        } else {
            onFinished?.();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
            <div
                className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden bg-surface-body border border-line-soft flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-line-soft">
                    <div className="flex items-center gap-2 min-w-0">
                        <AcademicCapIcon className="w-4 h-4 text-accent shrink-0" />
                        <span className="text-sm font-medium text-text-dim truncate">
                            Active recall · {Math.min(idx + 1, total)} / {total}
                        </span>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close review"
                        className="w-7 h-7 rounded-full border border-line-soft text-text-dim hover:text-text-primary hover:border-text-dim flex items-center justify-center">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-10 min-h-[260px] flex flex-col">
                    <p className="text-xs font-medium text-text-dim mb-3 truncate">
                        {current.lesson?.title || 'Saved slide'}
                    </p>

                    {loading && <CapletLoader message="Writing a recall question…" />}

                    {/* AI question flow */}
                    {!loading && qa && (
                        <div className="flex-1 flex flex-col">
                            <h3 className="text-xl md:text-2xl font-display font-bold text-text-primary leading-snug">
                                {qa.question}
                            </h3>
                            {!revealed ? (
                                <button
                                    type="button"
                                    onClick={() => setRevealed(true)}
                                    className="mt-6 self-start text-sm font-medium text-accent border border-accent px-5 py-2.5 hover:bg-accent hover:text-white transition-colors"
                                >
                                    Reveal answer
                                </button>
                            ) : (
                                <div className="mt-6 p-5 rounded-xl border border-line-soft bg-surface-raised">
                                    <p className="text-xs font-bold text-text-dim mb-2">Model answer</p>
                                    <p className="text-sm md:text-base text-text-primary leading-relaxed whitespace-pre-wrap">
                                        {qa.answer || '—'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Fallback: AI unavailable — review the slide itself */}
                    {!loading && qError && (
                        <div className="flex-1 flex flex-col">
                            <p className="text-xs text-text-muted italic mb-4">
                                {qError} Review the slide and grade yourself.
                            </p>
                            {fallbackSlide
                                ? <SlideRenderer key={current.id} slide={fallbackSlide} onSubmit={() => {}} />
                                : <p className="text-sm text-text-dim">This slide has no previewable content.</p>}
                        </div>
                    )}
                </div>

                {/* Grade row — shown once an answer is revealed, or always in fallback mode */}
                {!loading && (qError || revealed) && (
                    <div className="flex items-center justify-center gap-3 px-6 py-4 border-t border-line-soft">
                        <button
                            type="button"
                            disabled={grading}
                            onClick={() => grade('fail')}
                            className="text-sm font-medium text-rose-500 border border-rose-400/60 px-5 py-2.5 hover:bg-rose-500 hover:text-white transition-colors disabled:opacity-40"
                        >
                            Missed it
                        </button>
                        <button
                            type="button"
                            disabled={grading}
                            onClick={() => grade('pass')}
                            className="text-sm font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/60 px-5 py-2.5 hover:bg-emerald-500 hover:text-white transition-colors disabled:opacity-40"
                        >
                            Got it
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

const CATEGORY_LABELS = {
    budgeting: 'Budgeting',
    superannuation: 'Superannuation',
    tax: 'Tax',
    loans: 'Loans & Credit',
    investing: 'Investing',
    insurance: 'Insurance',
    retirement: 'Retirement',
    general: 'General Finance',
};

function getSlidePreview(savedSlide) {
    const raw = savedSlide.lesson?.slides;
    const slides = Array.isArray(raw) ? raw : (typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : []);
    const slide = slides[savedSlide.slideIndex];
    if (!slide) return null;
    return normalizeSlide(slide);
}

export default function Revision() {
    useReveal();
    const [savedSlides, setSavedSlides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [organizing, setOrganizing] = useState(false);
    const [organizeError, setOrganizeError] = useState(null);
    const [removingId, setRemovingId] = useState(null);
    // Summary modal state.
    const [summary, setSummary] = useState({ open: false, loading: false, error: null, category: '', slides: [] });
    // Spaced-repetition: slides due for review + the active-recall session.
    const [due, setDue] = useState([]);
    const [reviewOpen, setReviewOpen] = useState(false);

    const refetch = async () => {
        const data = await api.getSavedSlides().catch(() => null);
        setSavedSlides(data?.savedSlides || []);
    };

    const refetchDue = async () => {
        const data = await api.getDueSavedSlides().catch(() => null);
        setDue(data?.savedSlides || []);
    };

    useEffect(() => {
        (async () => {
            await Promise.all([refetch(), refetchDue()]);
            setLoading(false);
        })();
    }, []);

    const grouped = savedSlides.reduce((acc, s) => {
        const topic = s.category || 'Uncategorized';
        if (!acc[topic]) acc[topic] = [];
        acc[topic].push(s);
        return acc;
    }, {});
    const groups = Object.entries(grouped).sort(([a], [b]) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return a.localeCompare(b);
    });

    const handleOrganize = async () => {
        setOrganizing(true);
        setOrganizeError(null);
        try {
            await api.categorizeSavedSlides();
            await refetch();
        } catch (e) {
            setOrganizeError(e?.message || 'Could not organize right now.');
        } finally {
            setOrganizing(false);
        }
    };

    const handleSummarize = async (category) => {
        setSummary({ open: true, loading: true, error: null, category, slides: [] });
        try {
            const res = await api.summarizeSavedSlides(category);
            setSummary({ open: true, loading: false, error: null, category, slides: res?.slides || [] });
        } catch (e) {
            setSummary({ open: true, loading: false, error: e?.message || 'Could not summarize right now.', category, slides: [] });
        }
    };

    const handleUnsave = async (id) => {
        setRemovingId(id);
        try {
            await api.unsaveSlide(id);
            setSavedSlides((prev) => prev.filter((s) => s.id !== id));
            setDue((prev) => prev.filter((s) => s.id !== id));
        } catch (e) {
            console.warn('Unsave failed:', e?.message || e);
        } finally {
            setRemovingId(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-surface-body flex items-center justify-center">
                <CapletLoader message="Loading your revision…" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
            <div className="container-custom">
                <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 reveal-text">
                    <div>
                        <span className="font-hand text-accent text-lg">Your revision</span>
                        <h1 className="text-5xl md:text-7xl font-display font-extrabold tracking-tight">Archived slides.</h1>
                        <p className="mt-8 text-xl text-text-muted font-medium max-w-xl">
                            Every slide you've flagged, organized into topics by AI.
                        </p>
                    </div>
                    {savedSlides.length > 0 && (
                        <button
                            type="button"
                            onClick={handleOrganize}
                            disabled={organizing}
                            className="btn-secondary flex items-center gap-2 hover:-translate-y-0.5 transition-transform disabled:opacity-40"
                        >
                            <BookmarkIcon className="w-4 h-4" />
                            {organizing ? 'Organizing…' : 'Organize with AI'}
                        </button>
                    )}
                </header>

                {organizeError && (
                    <p className="text-sm text-rose-400 mb-8 font-medium">{organizeError}</p>
                )}

                {due.length > 0 && (
                    <div className="reveal mb-12 block-blue rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                        <div className="flex items-start gap-4">
                            <AcademicCapIcon className="w-7 h-7 text-blue shrink-0" />
                            <div>
                                <p className="text-base font-display font-bold tracking-tight text-text-primary">
                                    {due.length} slide{due.length === 1 ? '' : 's'} due for review
                                </p>
                                <p className="text-sm text-text-muted mt-1 max-w-md">
                                    Active recall beats re-reading. Answer from memory, then grade yourself. We'll reschedule each slide on a 1 · 3 · 7 · 14-day ladder.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setReviewOpen(true)}
                            className="btn-primary shrink-0 flex items-center gap-2 hover:-translate-y-0.5 transition-transform"
                        >
                            Start review
                            <ArrowRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {savedSlides.length === 0 ? (
                    <div className="reveal bg-surface-raised rounded-3xl p-16 text-center shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
                        <BookmarkIcon className="w-8 h-8 text-blue mx-auto mb-6" />
                        <p className="text-text-muted text-base font-medium mb-8">
                            No flagged slides yet.
                        </p>
                        <Link to="/courses" className="btn-primary inline-flex items-center hover:-translate-y-0.5 transition-transform">
                            Browse courses
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-12 reveal-stagger">
                        {groups.map(([topic, slides]) => (
                            <div key={topic}>
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-sm font-display font-bold tracking-tight text-text-primary">
                                        {CATEGORY_LABELS[topic] || topic}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => handleSummarize(topic)}
                                        className="flex items-center gap-1.5 text-xs font-bold text-accent hover:opacity-70 transition-opacity"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        Summarize
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {slides.map((s) => {
                                        const slide = getSlidePreview(s);
                                        const label = slide ? slideKindLabel(slide) : 'Slide';
                                        const excerpt = slide?.type === 'text' && slide.content
                                            ? String(slide.content).replace(/[#*`_[\]]/g, '').slice(0, 120)
                                            : null;
                                        return (
                                            <div key={s.id} className="bg-surface-raised rounded-2xl p-6 flex items-start justify-between gap-4 group shadow-[0_24px_50px_-40px_rgba(20,20,18,0.3)] hover:-translate-y-0.5 transition-transform">
                                                <Link
                                                    to={`/courses/${s.courseId}/lessons/${s.lessonId}?slide=${s.slideIndex}`}
                                                    className="flex-1 min-w-0"
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-bold text-accent">{label}</span>
                                                        <span className="text-text-dim/40 text-xs">·</span>
                                                        <span className="text-xs font-medium text-text-dim">Slide {s.slideIndex + 1}</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate">
                                                        {s.lesson?.title || 'Lesson'}
                                                    </p>
                                                    {excerpt && (
                                                        <p className="text-xs text-text-muted mt-1 line-clamp-1">{excerpt}</p>
                                                    )}
                                                    <p className="text-xs font-medium text-text-dim mt-1">{s.course?.title}</p>
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => handleUnsave(s.id)}
                                                    disabled={removingId === s.id}
                                                    aria-label="Remove saved slide"
                                                    className="shrink-0 w-7 h-7 rounded-full bg-surface-body text-text-dim hover:bg-rose-500 hover:text-white flex items-center justify-center transition-colors disabled:opacity-40"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <SummaryModal
                open={summary.open}
                loading={summary.loading}
                error={summary.error}
                category={CATEGORY_LABELS[summary.category] || summary.category}
                slides={summary.slides}
                onClose={() => setSummary((s) => ({ ...s, open: false }))}
            />

            <ReviewSession
                open={reviewOpen}
                slides={due}
                onClose={() => setReviewOpen(false)}
                onFinished={refetchDue}
            />
        </div>
    );
}
