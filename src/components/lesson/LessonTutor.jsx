import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import api from '../../services/api';

/* ──────────────────────────────────────────────────────────────────────────
   LessonTutor — an in-lesson AI tutor scoped to the CURRENT slide.
   Built for total beginners ("clueless users", see docs/roadmap.md): quick
   actions for the most common asks, plus a free-text box. Educational only,
   never financial advice — the disclaimer is always visible.

   Props:
     - slide:    the active slide object (tutor answers are scoped to it)
     - lessonId: id of the lesson the slide belongs to
   The component is self-contained and degrades gracefully: api.askTutor never
   throws, so a missing backend surfaces an "unavailable" message, not a crash.
   ────────────────────────────────────────────────────────────────────────── */

const QUICK_ACTIONS = [
  { label: 'Explain this simpler', question: 'Explain this slide in simpler terms, as if I am a total beginner.' },
  { label: 'Give an example', question: 'Give me a simple, concrete example that illustrates this slide.' },
  { label: 'Why does this matter?', question: 'Why does this matter? How would I use this in real life?' },
];

export default function LessonTutor({ slide, lessonId }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastAsked, setLastAsked] = useState('');
  const inputRef = useRef(null);

  // The tutor is scoped to the current slide. When the slide changes, clear any
  // previous answer so beginners are never shown an answer about another slide.
  useEffect(() => {
    setAnswer('');
    setError('');
    setLastAsked('');
    setQuestion('');
  }, [slide]);

  const ask = async (text) => {
    const q = (text ?? '').trim();
    if (!q || loading) return;
    setLoading(true);
    setError('');
    setAnswer('');
    setLastAsked(q);
    try {
      const res = await api.askTutor({ lessonId, slide, question: q });
      if (!res || res.unavailable || !res.answer) {
        setError(res?.message || 'Tutor is unavailable right now. Please try again in a moment.');
      } else {
        setAnswer(res.answer);
      }
    } catch {
      // api.askTutor is designed never to throw; this is a defensive backstop.
      setError('Tutor is unavailable right now. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    ask(question);
  };

  return (
    <div className="shrink-0 bg-surface-raised border border-line-soft rounded-[20px] overflow-hidden">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 md:px-5 h-12 text-left hover:bg-surface-body/40 transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12a9 9 0 11-3.6-7.2L21 3v6h-6" />
            </svg>
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-primary">Ask the AI tutor about this slide</span>
        </span>
        <svg
          className={`w-4 h-4 text-text-dim transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 md:px-5 pb-4 md:pb-5 pt-1 border-t border-line-soft">
          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 pt-3">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => ask(a.question)}
                disabled={loading}
                className="inline-flex items-center h-8 px-3 rounded-full border border-line-soft text-[11px] font-semibold text-text-muted hover:text-text-primary hover:border-text-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* Free-text box */}
          <form onSubmit={onSubmit} className="mt-3 flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  ask(question);
                }
              }}
              rows={2}
              placeholder="Ask about this slide…"
              className="flex-1 resize-none rounded-2xl border border-line-soft bg-surface-body px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="btn-primary h-10 px-4 rounded-full shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Asking…' : 'Ask'}
            </button>
          </form>

          {/* Answer / states */}
          <div className="mt-3" aria-live="polite">
            {loading && (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" style={{ animationDelay: '0.15s' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" style={{ animationDelay: '0.3s' }} />
                <span className="ml-1">Thinking about this slide…</span>
              </div>
            )}

            {!loading && error && (
              <div className="rounded-2xl border border-line-soft bg-surface-body px-4 py-3 text-sm text-text-muted">
                {error}
              </div>
            )}

            {!loading && !error && answer && (
              <div className="rounded-2xl border border-line-soft bg-surface-body px-4 py-3">
                {lastAsked && (
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-dim mb-2">
                    You asked: <span className="font-normal normal-case tracking-normal text-text-muted">{lastAsked}</span>
                  </p>
                )}
                <div className="prose-lesson text-sm">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {answer}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          {/* Disclaimer — always visible while the panel is open */}
          <p className="mt-3 text-[11px] leading-relaxed text-text-dim">
            The AI tutor is for educational purposes only and can make mistakes. This is not financial advice.
          </p>
        </div>
      )}
    </div>
  );
}
