import { useEffect, useRef, useState } from 'react';
import { PaperAirplaneIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const STARTERS = [
  'How should I study today?',
  'Help me understand a tricky idea.',
  'Quiz me on a topic.',
];

function conversationContext(messages) {
  if (!messages.length) return undefined;
  return {
    type: 'conversation',
    title: 'Study coach conversation',
    content: messages.slice(-4).map((message) =>
      `${message.role === 'user' ? 'Student' : 'Coach'}: ${message.content}`).join('\n'),
  };
}

export default function StudyCoachDrawer() {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const launcherRef = useRef(null);
  const threadRef = useRef(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const launcher = launcherRef.current;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = panelRef.current?.querySelectorAll(
        'button:not([disabled]), textarea:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      launcher?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open || loadedRef.current) return;
    loadedRef.current = true;
    api.getChatHistory()
      .then((data) => setMessages((data?.messages || []).map((message) => ({
        role: message.role,
        content: message.content,
      }))))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    threadRef.current?.scrollTo?.({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, sending]);

  // Lessons already have a slide-aware tutor. Removing the global launcher in
  // this focused view keeps it from covering Previous/Next lesson controls.
  const isLessonPlayer = /^\/courses\/[^/]+\/lessons\/[^/]+\/?$/.test(pathname);
  if (!isAuthenticated || isLessonPlayer) return null;

  const send = async (raw) => {
    const question = String(raw || '').trim();
    if (!question || sending) return;
    const prior = messages;
    setMessages((current) => [...current, { role: 'user', content: question }]);
    setInput('');
    setSending(true);
    api.saveChatMessage('user', question).catch(() => {});
    try {
      const response = await api.askTutor({ question, slide: conversationContext(prior) });
      const content = response?.answer || response?.message || 'The study coach is unavailable right now. Try again shortly.';
      setMessages((current) => [...current, { role: 'assistant', content }]);
      api.saveChatMessage('assistant', content).catch(() => {});
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-50 inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-extrabold text-white shadow-[0_20px_44px_-18px_rgba(20,20,18,0.55)] transition-transform hover:-translate-y-0.5"
      >
        <SparklesIcon className="h-5 w-5" aria-hidden="true" />
        Study coach
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] bg-text-primary/25 backdrop-blur-[2px]" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="study-coach-title"
            aria-describedby="study-coach-description"
            className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] min-h-[70dvh] flex-col rounded-t-3xl border border-line-soft bg-surface-raised shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:min-h-0 sm:w-[min(440px,92vw)] sm:rounded-none sm:rounded-l-3xl"
          >
            <header className="flex items-start justify-between gap-4 border-b border-line-soft p-5">
              <div>
                <p className="font-hand text-base text-accent">study coach</p>
                <h2 id="study-coach-title" className="font-display text-2xl font-extrabold tracking-tight text-text-primary">What are you working on?</h2>
                <p id="study-coach-description" className="mt-1 text-xs font-medium leading-relaxed text-text-muted">Ask for an explanation, a quiz, or help planning your next study block.</p>
                <Link to="/study" onClick={() => setOpen(false)} className="mt-3 inline-flex text-xs font-extrabold text-accent hover:text-accent-strong">
                  Open full study view
                </Link>
              </div>
              <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close study coach" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line-soft text-text-muted hover:bg-surface-soft hover:text-text-primary">
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div ref={threadRef} className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
              {!messages.length && (
                <div>
                  <p className="text-sm font-medium text-text-muted">Try one of these:</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {STARTERS.map((starter) => <button key={starter} type="button" onClick={() => send(starter)} className="rounded-full border border-line-soft px-3 py-2 text-left text-xs font-bold text-text-muted hover:border-accent hover:text-accent">{starter}</button>)}
                  </div>
                </div>
              )}
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <p className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${message.role === 'user' ? 'bg-accent text-white' : 'bg-surface-soft text-text-primary'}`}>{message.content}</p>
                </div>
              ))}
              {sending && <p className="text-sm font-medium text-text-muted" role="status">Thinking…</p>}
            </div>

            <form onSubmit={(event) => { event.preventDefault(); send(input); }} className="border-t border-line-soft p-4">
              <div className="flex items-end gap-2">
                <label htmlFor="study-coach-input" className="sr-only">Message your study coach</label>
                <textarea id="study-coach-input" rows={2} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send(input);
                  }
                }} placeholder="Ask about your study…" className="max-h-32 flex-1 resize-none rounded-2xl border border-line-soft bg-surface-soft px-4 py-3 text-sm text-text-primary outline-none placeholder:text-text-dim focus:border-accent" />
                <button type="submit" disabled={sending || !input.trim()} aria-label="Send message" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent text-white disabled:opacity-40">
                  <PaperAirplaneIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-text-dim">AI is used to answer. It can make mistakes, so check anything important.</p>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
