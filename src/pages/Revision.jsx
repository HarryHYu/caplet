import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import CapletLoader from '../components/CapletLoader';
import { slideKindLabel, normalizeSlide } from '../lib/slideSchema';
import { BookmarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

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
    const [organizing, setOrganizing] = useState(false);
    const [organizeError, setOrganizeError] = useState(null);
    const [removingId, setRemovingId] = useState(null);

    const refetch = async () => {
        const data = await api.getSavedSlides().catch(() => null);
        setSavedSlides(data?.savedSlides || []);
    };

    useEffect(() => {
        (async () => {
            await refetch();
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

    return (
        <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
            <div className="container-custom">
                <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 reveal-text">
                    <div>
                        <span className="section-kicker">Revision</span>
                        <h1 className="text-5xl md:text-7xl">Archived slides.</h1>
                        <p className="mt-8 text-xl text-text-muted font-medium max-w-xl">
                            Every slide you've flagged, organized into topics by AI.
                        </p>
                    </div>
                    {savedSlides.length > 0 && (
                        <button
                            type="button"
                            onClick={handleOrganize}
                            disabled={organizing}
                            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-accent border border-accent px-5 py-3 hover:bg-accent hover:text-white transition-colors disabled:opacity-40"
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
                    <div className="border border-line-soft bg-surface-body p-16 text-center">
                        <BookmarkIcon className="w-8 h-8 text-text-dim mx-auto mb-6" />
                        <p className="text-text-dim uppercase tracking-widest text-[11px] font-bold italic mb-8">
                            No flagged slides yet.
                        </p>
                        <Link to="/courses" className="text-[10px] font-bold uppercase tracking-widest text-accent border-b border-accent pb-1">
                            Browse courses
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {groups.map(([topic, slides]) => (
                            <div key={topic}>
                                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim mb-4">
                                    {CATEGORY_LABELS[topic] || topic}
                                </p>
                                <div className="grid grid-cols-1 gap-px bg-line-soft border border-line-soft">
                                    {slides.map((s) => {
                                        const slide = getSlidePreview(s);
                                        const label = slide ? slideKindLabel(slide) : 'Slide';
                                        const excerpt = slide?.type === 'text' && slide.content
                                            ? String(slide.content).replace(/[#*`_[\]]/g, '').slice(0, 120)
                                            : null;
                                        return (
                                            <div key={s.id} className="bg-surface-body p-6 flex items-start justify-between gap-4 group hover:bg-surface-raised transition-colors">
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
        </div>
    );
}
