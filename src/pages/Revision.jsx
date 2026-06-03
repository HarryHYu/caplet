import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';
import SlideRenderer from '../components/lesson/SlideRenderer';
import { slideKindLabel, normalizeSlide } from '../lib/slideSchema';
import { BookmarkIcon, ArrowRightIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';

// Modal slideshow showing an AI-generated summary of a category's slides.
function SummaryModal({ open, loading, error, category, slides, onClose }) {
    const [idx, setIdx] = useState(0);
    useEffect(() => { setIdx(0); }, [slides]);
    if (!open) return null;

    const total = slides?.length || 0;
    const current = total ? slides[Math.min(idx, total - 1)] : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden bg-surface-body border border-line-soft shadow-[0_32px_120px_rgba(0,0,0,0.35)] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-line-soft">
                    <div className="flex items-center gap-2 min-w-0">
                        <SparklesIcon className="w-4 h-4 text-accent shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim truncate">
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
                        <p className="text-center text-rose-400 text-sm font-bold uppercase tracking-wider">{error}</p>
                    )}
                    {!loading && !error && current && <SlideRenderer slide={current} onSubmit={() => {}} />}
                </div>

                {!loading && !error && total > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-line-soft">
                        <button type="button" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}
                            className="text-[10px] font-bold uppercase tracking-widest text-text-dim hover:text-accent disabled:opacity-30">
                            ← Prev
                        </button>
                        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim">{Math.min(idx + 1, total)} / {total}</span>
                        <button type="button" disabled={idx >= total - 1} onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
                            className="text-[10px] font-bold uppercase tracking-widest text-text-dim hover:text-accent disabled:opacity-30">
                            Next →
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
    const [savedSlides, setSavedSlides] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [organizing, setOrganizing] = useState(false);
    const [organizeError, setOrganizeError] = useState(null);
    const [removingId, setRemovingId] = useState(null);
    // Summary modal state.
    const [summary, setSummary] = useState({ open: false, loading: false, error: null, category: '', slides: [] });

    const refetch = async () => {
        const data = await api.getSavedSlides();
        setSavedSlides(data?.savedSlides || []);
        setError(null);
    };

    useEffect(() => {
        (async () => {
            try {
                await refetch();
            } catch (e) {
                console.error('Failed to load saved slides:', e);
                setError(e?.message || 'Failed to load saved slides');
            } finally {
                setLoading(false);
            }
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

    if (error) {
        return (
            <div className="min-h-screen bg-surface-body flex items-center justify-center p-6">
                <ErrorState
                    title="Revision could not be loaded."
                    message="We could not load your saved slides right now. Please try again shortly."
                    details={error}
                    action={<Link to="/courses" className="btn-primary py-3 px-8">Browse Courses</Link>}
                    className="max-w-xl w-full"
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface-body py-28 selection:bg-accent selection:text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.025] grid-technical pointer-events-none" />
            <div className="container-custom relative z-10">
                <header className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-8 reveal-text border-b border-line-soft pb-10">
                    <div>
                        <span className="section-kicker">Revision</span>
                        <h1 className="text-5xl md:text-7xl tracking-tighter">Archived slides.</h1>
                        <p className="mt-8 text-xl text-text-muted font-serif italic leading-relaxed max-w-xl">
                            Every slide you've flagged, organized into topics by AI.
                        </p>
                    </div>
                    {savedSlides.length > 0 && (
                        <button
                            type="button"
                            onClick={handleOrganize}
                            disabled={organizing}
                            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-accent border border-accent px-5 py-3 hover:bg-accent hover:text-white transition-colors disabled:opacity-40 shadow-sm"
                        >
                            <BookmarkIcon className="w-4 h-4" />
                            {organizing ? 'Organizing…' : 'Organize with AI'}
                        </button>
                    )}
                </header>

                {organizeError && (
                    <p className="text-[11px] text-rose-400 mb-8 uppercase tracking-wider font-bold">{organizeError}</p>
                )}

                {savedSlides.length === 0 ? (
                    <div className="border border-line-soft bg-surface-raised/70 p-16 text-center shadow-[0_24px_80px_rgba(15,23,42,0.05)]">
                        <BookmarkIcon className="w-8 h-8 text-text-dim mx-auto mb-6" />
                        <p className="text-text-dim uppercase tracking-widest text-[11px] font-bold italic mb-8">
                            No flagged slides yet.
                        </p>
                        <Link to="/courses" className="text-[10px] font-bold uppercase tracking-widest text-accent border-b border-accent pb-1">
                            Browse courses
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {groups.map(([topic, slides]) => (
                            <div key={topic}>
                                <div className="flex items-center justify-between mb-5 border-b border-line-soft pb-4">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim">
                                        {CATEGORY_LABELS[topic] || topic}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => handleSummarize(topic)}
                                        className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-accent hover:opacity-70 transition-opacity"
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        Summarize
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 gap-px bg-line-soft border border-line-soft shadow-[0_18px_60px_rgba(15,23,42,0.05)]">
                                    {slides.map((s) => {
                                        const slide = getSlidePreview(s);
                                        const label = slide ? slideKindLabel(slide) : 'Slide';
                                        const excerpt = slide?.type === 'text' && slide.content
                                            ? String(slide.content).replace(/[#*`_[\]]/g, '').slice(0, 120)
                                            : null;
                                        return (
                                            <div key={s.id} className="bg-surface-body/95 p-6 flex items-start justify-between gap-4 group hover:bg-surface-raised transition-colors">
                                                <Link
                                                    to={`/courses/${s.courseId}/lessons/${s.lessonId}?slide=${s.slideIndex}`}
                                                    className="flex-1 min-w-0"
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-accent">{label}</span>
                                                        <span className="text-text-dim/40 text-[9px]">·</span>
                                                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-dim">Slide {s.slideIndex + 1}</span>
                                                    </div>
                                                    <p className="text-sm font-bold uppercase tracking-tight text-text-primary group-hover:text-accent transition-colors truncate">
                                                        {s.lesson?.title || 'Lesson'}
                                                    </p>
                                                    {excerpt && (
                                                        <p className="text-[11px] text-text-muted mt-1 line-clamp-1">{excerpt}</p>
                                                    )}
                                                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-text-dim mt-1">{s.course?.title}</p>
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => handleUnsave(s.id)}
                                                    disabled={removingId === s.id}
                                                    aria-label="Remove saved slide"
                                                    className="shrink-0 w-7 h-7 rounded-full border border-line-soft text-text-dim hover:border-rose-400 hover:text-rose-400 flex items-center justify-center transition-colors disabled:opacity-40"
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
        </div>
    );
}
