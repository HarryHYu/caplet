import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import api from '../services/api';

/* ──────────────────────────────────────────────────────────────────────────
   StudyCoachHighlight — highlight anything, right-click, ask the coach.

   A site-wide study coach reachable from a right-click. Two entry points:
     1. Select text → right-click → "Ask coach about this" (the selection is
        sent as context so the answer is about exactly what you highlighted).
     2. Right-click anywhere → "Ask study coach…" for a general question.

   Non-invasive by design: it does NOT modify the AI backend. It calls the
   existing api.askTutor (POST /ai/tutor), passing the highlighted text as the
   slide-context object the tutor already understands. api.askTutor never
   throws, so this feature degrades to an "unavailable" message, never a crash.

   The native context menu is left alone over inputs, textareas, editable
   regions, links, and images — anywhere a real right-click menu is expected —
   so this only ever augments reading, never disrupts editing or copying.
   ────────────────────────────────────────────────────────────────────────── */

const QUICK_ACTIONS = [
  { label: 'Explain simpler', question: 'Explain this in simpler terms, as if I am a total beginner.' },
  { label: 'Give an example', question: 'Give me a simple, concrete example that illustrates this.' },
  { label: 'Why does it matter?', question: 'Why does this matter? Where would I use it?' },
];

const MAX_CONTEXT = 1200; // trim very long selections before sending

function Sparkle({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15l-1.9-4.1L5.5 9l4.6-1.4L12 3z" />
      <path d="M5 16l.8 2 .8-2 2-.8-2-.8-.8-2-.8 2-2 .8 2 .8z" />
    </svg>
  );
}

/** Should a right-click on this element keep the NATIVE menu (editing/links/media)? */
function isNativeMenuTarget(el) {
  if (!el || !el.closest) return false;
  return !!el.closest(
    'input, textarea, [contenteditable="true"], [contenteditable=""], .monaco-editor, .cm-editor, a[href], img, video, audio, select',
  );
}

export default function StudyCoachHighlight() {
  const [menu, setMenu] = useState(null);       // { x, y, selection } | null
  const [panel, setPanel] = useState(null);     // { selection } | null (panel open)
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastAsked, setLastAsked] = useState('');
  const inputRef = useRef(null);

  // ── Right-click → coach menu ──────────────────────────────────────────────
  useEffect(() => {
    const onContextMenu = (e) => {
      if (isNativeMenuTarget(e.target)) return; // leave editing/links/media alone
      const selection = (window.getSelection?.().toString() || '').trim();
      // Only intercept when there's something to act on: a text selection, OR
      // an ordinary content area (so "ask anything" is still reachable).
      e.preventDefault();
      // Clamp to viewport so the menu never opens off-screen.
      const x = Math.min(e.clientX, window.innerWidth - 220);
      const y = Math.min(e.clientY, window.innerHeight - 120);
      setMenu({ x, y, selection: selection.slice(0, MAX_CONTEXT) });
    };
    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, []);

  // ── Dismissal: click-away + Escape ────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setMenu(null); setPanel(null); } };
    const onDown = (e) => {
      if (menu && !e.target.closest?.('[data-coach-menu]')) setMenu(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [menu]);

  useEffect(() => { if (panel) setTimeout(() => inputRef.current?.focus(), 50); }, [panel]);

  const openPanel = useCallback((selection) => {
    setMenu(null);
    setPanel({ selection: selection || '' });
    setQuestion('');
    setAnswer('');
    setError('');
    setLastAsked('');
  }, []);

  const ask = useCallback(async (text) => {
    const q = (text ?? '').trim();
    if (!q || loading) return;
    setLoading(true);
    setError('');
    setAnswer('');
    setLastAsked(q);
    try {
      const selection = panel?.selection?.trim();
      // Feed the highlighted text to the tutor as its slide-context object
      // (the backend reads slide.content), so the answer is grounded in it.
      const slide = selection
        ? { type: 'selection', title: 'Highlighted text', content: selection }
        : undefined;
      const res = await api.askTutor({ question: q, slide });
      if (!res || res.unavailable || !res.answer) {
        setError(res?.message || 'The coach is unavailable right now. Please try again in a moment.');
      } else {
        setAnswer(res.answer);
      }
    } catch {
      setError('The coach is unavailable right now. Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, [loading, panel]);

  return (
    <>
      {/* ── Right-click coach menu ── */}
      {menu && (
        <div
          data-coach-menu
          role="menu"
          className="fixed z-[70] min-w-[200px] rounded-2xl border border-line-soft bg-surface-raised shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ left: menu.x, top: menu.y }}
        >
          {menu.selection && (
            <button
              role="menuitem"
              onClick={() => openPanel(menu.selection)}
              className="w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left hover:bg-surface-body/60 transition-colors"
            >
              <span className="mt-0.5 w-6 h-6 shrink-0 rounded-full bg-accent/10 text-accent flex items-center justify-center"><Sparkle /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-text-primary">Ask coach about this</span>
                <span className="block text-[11px] text-text-dim truncate">“{menu.selection.slice(0, 48)}{menu.selection.length > 48 ? '…' : ''}”</span>
              </span>
            </button>
          )}
          <button
            role="menuitem"
            onClick={() => openPanel('')}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-surface-body/60 transition-colors border-t border-line-soft/60 first:border-t-0"
          >
            <span className="w-6 h-6 shrink-0 rounded-full bg-accent/10 text-accent flex items-center justify-center"><Sparkle /></span>
            <span className="text-sm font-semibold text-text-primary">Ask study coach…</span>
          </button>
        </div>
      )}

      {/* ── Coach panel ── */}
      {panel && (
        <div className="fixed z-[70] bottom-4 right-4 w-[min(400px,calc(100vw-2rem))] max-h-[min(560px,calc(100vh-2rem))] flex flex-col rounded-[20px] border border-line-soft bg-surface-raised shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* header */}
          <div className="flex items-center justify-between gap-3 px-4 h-12 border-b border-line-soft shrink-0">
            <span className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center"><Sparkle /></span>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-primary">Study coach</span>
            </span>
            <button onClick={() => setPanel(null)} aria-label="Close coach" className="text-text-dim hover:text-text-primary transition-colors text-lg leading-none px-1">×</button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {/* highlighted context chip */}
            {panel.selection && (
              <div className="rounded-2xl border border-line-soft bg-surface-body px-3.5 py-2.5">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-text-dim mb-1">About your highlight</span>
                <span className="block text-xs text-text-muted italic line-clamp-4">“{panel.selection}”</span>
              </div>
            )}

            {/* quick actions */}
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.label}
                  disabled={loading}
                  onClick={() => { setQuestion(qa.question); ask(qa.question); }}
                  className="inline-flex items-center h-8 px-3 rounded-full border border-line-soft text-[11px] font-semibold text-text-muted hover:text-text-primary hover:border-text-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {qa.label}
                </button>
              ))}
            </div>

            {/* answer / states */}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" />
                <span className="ml-1">Thinking…</span>
              </div>
            )}
            {error && !loading && (
              <div className="rounded-2xl border border-line-soft bg-surface-body px-4 py-3 text-sm text-text-muted">{error}</div>
            )}
            {answer && !loading && (
              <div className="rounded-2xl border border-line-soft bg-surface-body px-4 py-3">
                {lastAsked && <p className="text-xs font-semibold text-text-dim mb-1.5">You asked: {lastAsked}</p>}
                <div className="prose-coach text-sm text-text-primary leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{answer}</ReactMarkdown>
                </div>
              </div>
            )}

            <p className="text-[10px] text-text-dim leading-relaxed">Educational help only — not financial or professional advice. Answers can be imperfect; check anything important.</p>
          </div>

          {/* input */}
          <div className="flex items-end gap-2 px-4 py-3 border-t border-line-soft shrink-0">
            <textarea
              ref={inputRef}
              rows={1}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(question); } }}
              placeholder={panel.selection ? 'Ask about the highlight…' : 'Ask the coach anything…'}
              className="flex-1 resize-none rounded-2xl border border-line-soft bg-surface-body px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:border-accent transition-colors max-h-28"
            />
            <button
              onClick={() => ask(question)}
              disabled={loading || !question.trim()}
              className="btn-primary h-10 px-4 rounded-full shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ask
            </button>
          </div>
        </div>
      )}
    </>
  );
}
