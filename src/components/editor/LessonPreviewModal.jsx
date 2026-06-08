import { useEffect, useState } from 'react';
import SlideRenderer from '../lesson/SlideRenderer';
import { slideKindLabel, normalizeSlide } from '../../lib/slideSchema';

/**
 * Full-screen preview that reuses the real SlideRenderer so what the
 * teacher sees here matches the LessonPlayer exactly.
 */
export default function LessonPreviewModal({ open, onClose, title, slides }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setIndex((i) => Math.min((slides?.length || 1) - 1, i + 1));
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, slides]);

  if (!open) return null;

  const list = slides || [];
  const slide = list[index];
  const normalized = normalizeSlide(slide);

  return (
    <div className="fixed inset-0 z-[60] bg-surface-body flex flex-col">
      <header className="shrink-0 border-b border-line-soft bg-surface-body/95 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 h-14 md:h-16 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-accent mb-0.5">Preview</p>
            <p className="text-sm font-serif italic text-text-primary truncate max-w-md">{title || 'Untitled lesson'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim text-sm font-medium transition-colors duration-150"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Close
          </button>
        </div>
        {list.length > 0 && (
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12 pb-2.5">
            <div className="flex items-center gap-1.5">
              {list.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  className="group flex-1 py-2"
                  aria-label={`Slide ${i + 1}`}
                >
                  <span
                    className={`block rounded-full transition-all ${
                      i === index ? 'bg-accent h-[5px]' : i < index ? 'bg-accent h-[3px]' : 'bg-line-soft h-[3px] group-hover:h-[4px]'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 min-h-0 max-w-[1400px] w-full mx-auto px-4 md:px-8 lg:px-12 py-5 md:py-7 flex flex-col gap-4 md:gap-5">
        {list.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-text-muted font-serif italic">Add some slides to preview.</p>
          </div>
        ) : (
          <>
            <div className="shrink-0 flex items-center gap-3 text-xs font-semibold text-text-dim">
              <span className="font-mono text-accent">
                {String(index + 1).padStart(2, '0')}
                <span className="opacity-50"> / </span>
                {String(list.length).padStart(2, '0')}
              </span>
              <span className="w-6 h-px bg-line-soft" />
              <span>{slideKindLabel(normalized)}</span>
            </div>

            <div
              key={index}
              className="animate-lesson-slide-in flex-1 min-h-0 relative bg-surface-raised border border-line-soft rounded-[28px] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 top-0 flex justify-center pointer-events-none">
                <div className="w-32 h-px bg-accent" />
              </div>
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className="h-full flex flex-col">
                  <SlideRenderer slide={slide} variant="player" />
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setIndex(Math.max(0, index - 1))}
                disabled={index === 0}
                className="px-4 py-2 rounded-full border border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim disabled:opacity-30 text-sm font-medium transition-colors duration-150"
              >
                ← Previous
              </button>
              <div className="hidden md:flex items-center gap-2 text-xs text-text-dim">
                <kbd className="px-2 py-1 rounded border border-line-soft font-mono text-xs">←</kbd>
                <kbd className="px-2 py-1 rounded border border-line-soft font-mono text-xs">→</kbd>
                <span className="ml-1">to navigate</span>
              </div>
              <button
                type="button"
                onClick={() => setIndex(Math.min(list.length - 1, index + 1))}
                disabled={index >= list.length - 1}
                className="px-4 py-2 rounded-full bg-text-primary text-surface-body hover:opacity-90 disabled:opacity-30 text-sm font-medium transition-opacity duration-150"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
