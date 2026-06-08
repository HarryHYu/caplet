import { useEffect, useRef, useState } from 'react';
import { SLASH_COMMANDS } from '../../lib/slideCommands';

const MODEL_OPTIONS = [
  { id: 'gpt-5.4-nano', short: 'Nano', desc: 'Fastest & cheapest' },
  { id: 'gpt-5.4-mini', short: 'Mini', desc: 'Recommended' },
  { id: 'gpt-5.4',      short: 'Standard', desc: 'Higher quality' },
  { id: 'gpt-5.5',      short: 'Max', desc: 'Most powerful' },
];

/* ── AI avatar ─────────────────────────────────────────────────────────────── */

export function AIAvatar({ size = 'sm', className = '' }) {
  const dim = size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';
  const imgSize = size === 'lg' ? 'w-6 h-6' : 'w-[15px] h-[15px]';
  return (
    <div
      className={`${dim} rounded-full bg-white border border-line-soft flex items-center justify-center shrink-0 ${className}`}
      style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.10)' }}
    >
      <img src="/logo.png" alt="Caplet AI" className={`${imgSize} object-contain`} />
    </div>
  );
}

/* ── Message bubble ──────────────────────────────────────────────────────────── */

export function Bubble({ msg }) {
  const isUser = msg.role === 'user';
  const isSlashCmd = isUser && /^\/\S+$/.test(msg.text.trim());

  if (isUser) {
    return (
      <div className="flex justify-end animate-msg-in">
        {isSlashCmd ? (
          <span className="font-mono text-[11px] font-semibold text-accent bg-accent/[0.07] border border-accent/20 px-3 py-1.5 rounded-full select-none tracking-wide">
            {msg.text.trim()}
          </span>
        ) : (
          <div
            className="max-w-[84%] text-white text-[15px] px-4 py-2.5 rounded-[18px] rounded-br-[5px] leading-[1.65]"
            style={{
              background: 'var(--accent)',
              boxShadow: '0 2px 14px rgba(0, 80, 255, 0.2)',
            }}
          >
            {msg.text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 animate-msg-in">
      <AIAvatar className="mt-0.5 shrink-0" />
      <div
        className={`flex-1 min-w-0 rounded-[18px] rounded-tl-[5px] px-3.5 py-3 ${
          msg.isError
            ? 'bg-surface-error border border-line-error'
            : 'bg-surface-raised border border-line-soft/70'
        }`}
        style={msg.isError ? {} : { boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        <p className={`text-[15px] leading-[1.72] ${msg.isError ? 'text-text-error' : 'text-text-primary'}`}>
          {msg.text}
        </p>
        {msg.slideCount != null && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 bg-accent/[0.07] border border-accent/15 text-accent text-[11px] font-semibold px-2.5 py-1 rounded-full">
            <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
              <path d="M5 0.75 L5.95 3.8 L9 5 L5.95 6.2 L5 9.25 L4.05 6.2 L1 5 L4.05 3.8 Z" fill="currentColor" />
            </svg>
            {msg.slideCount} slide{msg.slideCount !== 1 ? 's' : ''} added
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Loading bubble ──────────────────────────────────────────────────────────── */

export function LoadingBubble() {
  return (
    <div className="flex items-start gap-2.5 animate-msg-in">
      <AIAvatar className="mt-0.5 shrink-0" />
      <div
        className="bg-surface-raised border border-line-soft/70 rounded-[18px] rounded-tl-[5px] px-4 py-[14px]"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-end gap-[4px] h-[14px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-[4px] h-[14px] rounded-full bg-accent/60 animate-dot-wave origin-bottom"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Slash command palette ────────────────────────────────────────────────────── */

function SlashMenu({ filter, onSelect, activeIndex }) {
  const filtered = SLASH_COMMANDS.filter(
    (c) => !filter || c.slug.startsWith(filter) || c.label.toLowerCase().startsWith(filter),
  );
  if (filtered.length === 0) return null;

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-2 bg-surface-raised border border-line-soft rounded-2xl overflow-hidden z-20"
      style={{ boxShadow: '0 -20px 60px rgba(0,0,0,0.1), 0 -2px 10px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-2.5 border-b border-line-soft/60 bg-surface-soft/60">
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent)' }}
        >
          <span className="font-mono font-bold text-white text-[11px] leading-none">/</span>
        </div>
        <p className="text-[10px] font-bold text-text-dim uppercase tracking-[0.12em]">Slide commands</p>
        <div className="ml-auto hidden sm:flex items-center gap-1.5 text-[9px] text-text-dim/50 font-mono">
          <kbd className="bg-surface-raised border border-line-soft rounded px-[5px] py-[2px] leading-none">↑↓</kbd>
          <span>navigate</span>
          <kbd className="bg-surface-raised border border-line-soft rounded px-[5px] py-[2px] leading-none">↵</kbd>
          <span>insert</span>
        </div>
      </div>

      <ul className="max-h-[240px] overflow-y-auto py-1">
        {filtered.map((c, i) => (
          <li key={c.slug}>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onSelect(c); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-75 ${
                i === activeIndex ? 'bg-accent/[0.05]' : 'hover:bg-surface-soft/60'
              }`}
            >
              <span
                className={`font-mono text-[11px] min-w-[52px] shrink-0 font-semibold ${
                  i === activeIndex ? 'text-accent' : 'text-text-dim'
                }`}
              >
                /{c.slug}
              </span>
              <div className="flex-1 min-w-0">
                <span
                  className={`block text-[13px] font-semibold leading-tight ${
                    i === activeIndex ? 'text-text-primary' : 'text-text-muted'
                  }`}
                >
                  {c.label}
                </span>
                <span className="block text-[11px] text-text-dim leading-snug mt-0.5 truncate">{c.desc}</span>
              </div>
              {i === activeIndex && (
                <span className="shrink-0 text-[9px] font-mono bg-accent/[0.08] border border-accent/20 text-accent rounded-[5px] px-1.5 py-0.5 leading-none">
                  ↵
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Model picker dropdown ────────────────────────────────────────────────────── */

function ModelPicker({ model, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = MODEL_OPTIONS.find((m) => m.id === model) || MODEL_OPTIONS[1];

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border text-[11px] font-medium transition-all duration-150 ${
          open
            ? 'border-accent/40 bg-accent/[0.06] text-accent'
            : 'border-transparent text-text-dim hover:text-accent hover:bg-accent/[0.06] hover:border-accent/20'
        }`}
      >
        {current.short}
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
          <path d="M1.5 3L4 5.5L6.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-1.5 w-48 bg-surface-raised border border-line-soft rounded-xl overflow-hidden z-30"
          style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.12), 0 -1px 8px rgba(0,0,0,0.06)' }}
        >
          <p className="px-3 pt-2.5 pb-1.5 text-[9px] font-bold text-text-dim uppercase tracking-[0.1em]">Model</p>
          {MODEL_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onChange(opt.id); setOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors duration-75 ${
                opt.id === model ? 'bg-accent/[0.06]' : 'hover:bg-surface-soft/60'
              }`}
            >
              <div>
                <span className={`block text-[12px] font-semibold leading-tight ${opt.id === model ? 'text-accent' : 'text-text-muted'}`}>
                  {opt.short}
                </span>
                <span className="block text-[10px] text-text-dim leading-snug">{opt.desc}</span>
              </div>
              {opt.id === model && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-accent shrink-0">
                  <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
          <div className="h-1" />
        </div>
      )}
    </div>
  );
}

/* ── Chat input ──────────────────────────────────────────────────────────────── */

export function ChatInput({ onSubmit, onAddSlide, onClear, loading, model, onModelChange, placeholder, className = '' }) {
  const [input, setInput] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [menuFilter, setMenuFilter] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const filteredCmds = SLASH_COMMANDS.filter(
    (c) => !menuFilter || c.slug.startsWith(menuFilter) || c.label.toLowerCase().startsWith(menuFilter),
  );

  const resize = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  };

  const applyCommand = (cmd) => {
    onAddSlide(cmd);
    setInput('');
    setShowMenu(false);
    setMenuFilter('');
    setTimeout(() => { inputRef.current?.focus(); }, 0);
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setInput(val);
    resize();
    if (val.startsWith('/')) {
      setMenuFilter(val.slice(1).toLowerCase());
      setShowMenu(true);
      setActiveIndex(0);
    } else {
      setShowMenu(false);
      setMenuFilter('');
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || loading) return;
    if (text.startsWith('/')) {
      const slug = text.slice(1).toLowerCase();
      const cmd = SLASH_COMMANDS.find((c) => c.slug === slug);
      if (cmd) { applyCommand(cmd); return; }
    }
    onSubmit(text, model);
    setInput('');
    setShowMenu(false);
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (showMenu && filteredCmds.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filteredCmds.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter') { e.preventDefault(); applyCommand(filteredCmds[activeIndex]); return; }
      if (e.key === 'Escape') { setShowMenu(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const triggerSlash = () => {
    setInput('/');
    setMenuFilter('');
    setShowMenu(true);
    setActiveIndex(0);
    inputRef.current?.focus();
    setTimeout(resize, 0);
  };

  const canSend = !!input.trim() && !loading;

  return (
    <div className={`relative ${className}`}>
      {showMenu && <SlashMenu filter={menuFilter} onSelect={applyCommand} activeIndex={activeIndex} />}

      <div
        className="bg-surface-raised border border-line-soft rounded-[20px] transition-all duration-200 focus-within:border-accent/40"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
        onFocusCapture={(e) => {
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,80,255,0.07), 0 2px 14px rgba(0,80,255,0.07)';
        }}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
          }
        }}
      >
        {/* Textarea */}
        <div className="px-4 pt-3.5 pb-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Ask AI or describe what to add…'}
            className="w-full bg-transparent text-[15px] text-text-primary placeholder:text-text-dim/50 resize-none focus:outline-none leading-[1.6] overflow-hidden"
            style={{ minHeight: '22px', maxHeight: '128px' }}
            disabled={loading}
          />
        </div>

        {/* Bottom toolbar */}
        <div className="flex items-center gap-1.5 px-3 pb-2.5 pt-0">
          <button
            type="button"
            onClick={triggerSlash}
            title="Insert slide type"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-text-dim hover:text-accent hover:bg-accent/[0.06] hover:border-accent/20 border border-transparent transition-all duration-150"
          >
            <span className="font-mono font-bold text-accent text-[11px] leading-none">/</span>
            <span className="text-[11px] font-medium tracking-wide">Slide</span>
          </button>

          <ModelPicker model={model} onChange={onModelChange} />

          <div className="flex-1" />

          {onClear && (
            <button
              type="button"
              onClick={onClear}
              title="Clear conversation"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-text-dim hover:text-text-muted hover:bg-surface-soft/80 transition-all duration-150"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 3.5h9M5 3.5V2.5h3v1M4.5 3.5l.4 7h3.2l.4-7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="w-[30px] h-[30px] rounded-[13px] text-white flex items-center justify-center transition-all duration-150 active:scale-[0.92]"
            style={{
              background: 'var(--accent)',
              opacity: canSend ? 1 : 0.2,
              boxShadow: canSend ? '0 2px 10px rgba(0,80,255,0.25)' : 'none',
            }}
            aria-label="Send"
          >
            {loading ? (
              <span className="w-3.5 h-3.5 border-[1.5px] border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
                <path d="M6.5 11V2M2.5 5.5l4-3.5 4 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Full panel ───────────────────────────────────────────────────────────────── */

export default function AIChatPanel({ messages, loading, onSubmit, onAddSlide, onClear }) {
  const [model, setModel] = useState('gpt-5.4-mini');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div className="flex flex-col h-full bg-surface-body">

      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto relative">
        <div className="sticky top-0 h-5 bg-gradient-to-b from-surface-body to-transparent pointer-events-none z-10 -mb-5" />

        <div className="px-3.5 pt-3 pb-4 space-y-3.5">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] py-12 text-center px-5">
              <AIAvatar size="lg" className="mb-3.5" />
              <p className="text-[14px] font-semibold text-text-muted mb-1.5">Caplet AI</p>
              <p className="text-[13px] text-text-dim leading-relaxed max-w-[200px]">
                Describe what to generate, or type{' '}
                <span className="inline font-mono font-bold text-accent text-[10px] rounded-md border border-accent/40 bg-accent/[0.08] px-1.5 py-[2px]">
                  /
                </span>
                {' '}to pick a slide type.
              </p>
            </div>
          ) : (
            <>
              {messages.map((m) => <Bubble key={m.id} msg={m} />)}
              {loading && <LoadingBubble />}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input footer */}
      <div className="shrink-0 px-3 pb-3 pt-2 border-t border-line-soft relative">
        <div className="absolute -top-6 inset-x-0 h-6 bg-gradient-to-b from-transparent to-surface-body pointer-events-none" />
        <ChatInput
          onSubmit={onSubmit}
          onAddSlide={onAddSlide}
          onClear={onClear}
          loading={loading}
          model={model}
          onModelChange={setModel}
        />
      </div>
    </div>
  );
}
