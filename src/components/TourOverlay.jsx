import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useTour } from '../contexts/TourContext';
import api from '../services/api';

/* ── Constants ───────────────────────────────────────────────────────────────── */
const PAD      = 10;
const TIP_W    = 430;
const TIP_GAP  = 22;
const FADE_MS  = 200;
const POLL_DELAY = FADE_MS + 100;   // start polling after fade completes + page paint

const FUTURE_PLANS = [
  { label: 'Live Kahoot-style Mode',    desc: 'Real-time classroom quizzes — leaderboards, instant feedback, low latency. Better than Kahoot, and the content is already built into the platform.' },
  { label: 'AI Essay Marking',          desc: 'Students submit written answers; a fine-tuned model grades them with specific, targeted feedback — not just right or wrong.' },
  { label: 'Adaptive Practice',         desc: 'Difficulty adjusts per student in real time based on their quiz performance. Every student works at exactly the right level.' },
  { label: 'Gamification',              desc: 'One shared in-app currency across lessons, games, and activities — points, streaks, leaderboards, all connected.' },
  { label: 'Assessment & Certification',desc: 'Formal assessments with marking rubrics, certificates, and school-level reporting built for real classroom use.' },
];

/* ── Hooks ───────────────────────────────────────────────────────────────────── */
function useDims() {
  const [d, setD] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const h = () => setD({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return d;
}

/* ── Tooltip position ────────────────────────────────────────────────────────── */
function calcTipPos(sr, placement, winW, winH, wide) {
  const tw = Math.min(wide ? 500 : TIP_W, winW - 32);
  if (!sr || placement === 'center') {
    return { width: tw, position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  }
  const cx  = sr.left + sr.width / 2;
  const clL = (l) => Math.max(16, Math.min(l, winW - tw - 16));

  switch (placement) {
    case 'bottom': {
      const top = sr.top + sr.height + TIP_GAP;
      if (top + 260 <= winH) return { width: tw, position: 'fixed', top, left: clL(cx - tw / 2) };
      return { width: tw, position: 'fixed', bottom: winH - sr.top + TIP_GAP, left: clL(cx - tw / 2) };
    }
    case 'top': {
      const bot = winH - sr.top + TIP_GAP;
      if (winH - bot >= 260) return { width: tw, position: 'fixed', bottom: bot, left: clL(cx - tw / 2) };
      return { width: tw, position: 'fixed', top: sr.top + sr.height + TIP_GAP, left: clL(cx - tw / 2) };
    }
    case 'right':
      return { width: tw, position: 'fixed', left: Math.min(sr.left + sr.width + TIP_GAP, winW - tw - 16), top: Math.max(16, Math.min(sr.top, winH - 340)) };
    case 'left':
      return { width: tw, position: 'fixed', right: Math.max(16, winW - sr.left + TIP_GAP), top: Math.max(16, Math.min(sr.top, winH - 340)) };
    default:
      return { width: tw, position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  }
}

/* ── Caret arrow (rotated square technique, supports CSS vars) ───────────────── */
function Caret({ placement }) {
  if (!placement || placement === 'center') return null;
  const size = 10;
  const shared = {
    position: 'absolute',
    width: size, height: size,
    background: 'var(--surface-raised)',
    transform: 'rotate(45deg)',
    zIndex: 1,
  };
  switch (placement) {
    case 'bottom': return <div style={{ ...shared, top: -size / 2 - 1, left: '50%', marginLeft: -size / 2, borderTop: '1px solid var(--line-soft)', borderLeft: '1px solid var(--line-soft)' }} />;
    case 'top':    return <div style={{ ...shared, bottom: -size / 2 - 1, left: '50%', marginLeft: -size / 2, borderBottom: '1px solid var(--line-soft)', borderRight: '1px solid var(--line-soft)' }} />;
    case 'right':  return <div style={{ ...shared, left: -size / 2 - 1, top: 28, borderLeft: '1px solid var(--line-soft)', borderBottom: '1px solid var(--line-soft)' }} />;
    case 'left':   return <div style={{ ...shared, right: -size / 2 - 1, top: 28, borderRight: '1px solid var(--line-soft)', borderTop: '1px solid var(--line-soft)' }} />;
    default: return null;
  }
}

/* ── Step dots ───────────────────────────────────────────────────────────────── */
function Dots({ total, current }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ height: 6, width: i === current ? 18 : 6, borderRadius: 9, background: i === current ? 'var(--accent)' : 'var(--line-soft)', transition: 'width .25s ease, background .25s ease' }} />
      ))}
    </div>
  );
}

/* ── Code-entry form (inline inside guide tooltip) ───────────────────────────── */
function CodeEntryForm({ onSuccess }) {
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setErr(''); setLoading(true);
    try {
      await api.editorEnter(code.trim());
      onSuccess();
    } catch (ex) {
      setErr(ex.message || 'Wrong code — try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ marginTop: 10 }}>
      <input
        type="password"
        autoComplete="off"
        placeholder="Enter access code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        style={{
          display: 'block', width: '100%', boxSizing: 'border-box',
          padding: '10px 14px', borderRadius: 10, marginBottom: 8,
          border: `1.5px solid ${err ? '#ef4444' : 'var(--line-soft)'}`,
          background: 'var(--surface-soft)', color: 'var(--text-primary)',
          fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={(e)  => (e.target.style.borderColor = err ? '#ef4444' : 'var(--line-soft)')}
      />
      {err && <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 8px', fontFamily: 'var(--font-body)' }}>{err}</p>}
      <button
        type="submit"
        disabled={loading || !code.trim()}
        style={{
          display: 'block', width: '100%', padding: '10px',
          background: (!loading && code.trim()) ? 'var(--accent)' : 'var(--line-soft)',
          color: (!loading && code.trim()) ? '#fff' : 'var(--text-dim)',
          border: 'none', borderRadius: 10, cursor: loading ? 'wait' : 'pointer',
          fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
          transition: 'background .15s, color .15s',
        }}
      >
        {loading ? 'Checking…' : 'Continue →'}
      </button>
    </form>
  );
}

/* ── Main overlay ─────────────────────────────────────────────────────────────── */
export default function TourOverlay() {
  const { active, stepIndex, steps, next, prev, end } = useTour();
  const location = useLocation();
  const dims     = useDims();

  const [rect, setRect]   = useState(null);  // current spotlight rect
  const [vis,  setVis]    = useState(false); // opacity gate
  const cleanupRef        = useRef(null);    // latest cleanup fn

  const step = steps[stepIndex];

  /* ── Single consolidated effect ─────────────────────────────────────────────
     Runs when: tour starts/stops, step changes, or route changes.
     Each run cancels all previous async work via a `dead` flag + stored cleanup.
  ─────────────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (cleanupRef.current) cleanupRef.current();   // cancel previous work
    if (!active || !step) { setVis(false); return; }

    let dead = false;
    const timers = [];
    const t = (fn, ms) => { const id = setTimeout(() => !dead && fn(), ms); timers.push(id); return id; };

    cleanupRef.current = () => {
      dead = true;
      timers.forEach(clearTimeout);
    };

    // Always fade out first then start finding
    setVis(false);
    setRect(null);

    t(() => {
      if (!step.target) {
        // Floating step — no element needed
        setRect(null);
        setVis(true);
        return;
      }

      let attempts = 0;
      const find = () => {
        if (dead) return;
        const el = document.querySelector(`[data-tour-id="${step.target}"]`);
        if (el) {
          const r = el.getBoundingClientRect();
          // Check element has visible dimensions
          if (r.width > 0 && r.height > 0) {
            // Only scroll for elements genuinely off screen (not fixed-position nav items)
            const cs       = window.getComputedStyle(el);
            const isFixed  = cs.position === 'fixed' || !!el.closest('[style*="position: fixed"]');
            const offScreen = !isFixed && (r.bottom < 0 || r.top > window.innerHeight);
            if (offScreen) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              t(() => {
                const el2 = document.querySelector(`[data-tour-id="${step.target}"]`);
                if (el2) { setRect(el2.getBoundingClientRect()); setVis(true); }
              }, 600);
            } else {
              setRect(r);
              setVis(true);
            }
            return;
          }
        }
        if (++attempts < 28) {
          t(find, 150);
        } else {
          // Give up — show floating (element not found / not rendered)
          setRect(null);
          setVis(true);
        }
      };
      find();
    }, POLL_DELAY);

    return () => {
      dead = true;
      timers.forEach(clearTimeout);
    };
  // Intentionally include location.pathname so we re-try after route changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex, location.pathname]);

  // Keep rect fresh on scroll / resize while showing
  useEffect(() => {
    if (!active || !step?.target || !vis) return;
    const refresh = () => {
      const el = document.querySelector(`[data-tour-id="${step.target}"]`);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener('scroll',  refresh, { passive: true, capture: true });
    window.addEventListener('resize',  refresh);
    return () => {
      window.removeEventListener('scroll',  refresh, { capture: true });
      window.removeEventListener('resize',  refresh);
    };
  }, [active, step?.target, vis]);

  if (!active || !step) return null;

  const isFloating = !step.target || !rect;
  const DARK       = 'rgba(0,0,0,0.70)';
  const sr         = rect ? {
    top: rect.top - PAD, left: rect.left - PAD,
    width: rect.width + PAD * 2, height: rect.height + PAD * 2,
  } : null;
  const isFirst = stepIndex === 0;
  const isLast  = stepIndex === steps.length - 1;
  const tipPos  = calcTipPos(sr, step.placement, dims.w, dims.h, step.wide);

  const fadeStyle = {
    opacity:    vis ? 1 : 0,
    transition: `opacity ${FADE_MS}ms ease`,
  };

  const node = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9900, pointerEvents: 'none' }}>

      {/* ── Backdrop ────────────────────────────────────────────── */}
      {isFloating ? (
        <div style={{ position: 'absolute', inset: 0, background: DARK, pointerEvents: 'auto', ...fadeStyle }}
          onClick={(e) => { if (e.target === e.currentTarget) end(); }} />
      ) : (
        <>
          {/* Single-element box-shadow spotlight */}
          <div style={{
            position: 'fixed',
            top: sr.top, left: sr.left, width: sr.width, height: sr.height,
            borderRadius: 14, background: 'transparent',
            boxShadow: `0 0 0 9999px ${DARK}, 0 0 0 2.5px var(--accent), 0 0 0 6px rgba(0,80,255,0.16)`,
            pointerEvents: 'none',
            ...fadeStyle,
          }} />
          {/* Click-sink outside spotlight */}
          <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: vis ? 'auto' : 'none' }}
            onClick={(e) => {
              if (!sr) return;
              const { clientX: x, clientY: y } = e;
              if (x >= sr.left && x <= sr.left + sr.width && y >= sr.top && y <= sr.top + sr.height) return;
              e.stopPropagation();
            }}
          />
        </>
      )}

      {/* ── Tooltip card ────────────────────────────────────────── */}
      <div style={{
        ...tipPos,
        zIndex: 9902,
        pointerEvents: 'auto',
        opacity:   vis ? 1 : 0,
        transform: `${tipPos.transform ?? ''} translateY(${vis ? 0 : 8}px)`.trim(),
        transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
      }}>

        {/* Caret arrow toward target */}
        {!isFloating && <Caret placement={step.placement} />}

        {/* Card body */}
        <div style={{
          background: 'var(--surface-raised)',
          border:     '1px solid var(--line-soft)',
          borderRadius: 18,
          boxShadow: '0 24px 64px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}>
          {/* Accent strip */}
          <div style={{ height: 4, background: 'var(--accent)', borderRadius: '18px 18px 0 0' }} />

          {/* Header */}
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--line-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', opacity: 0.7 }}>
                  {stepIndex + 1} / {steps.length}
                </p>
                <h3 style={{ margin: 0, fontSize: 15, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {step.title}
                </h3>
              </div>
              <button onClick={end} aria-label="Close tour" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 19, lineHeight: 1, color: 'var(--text-dim)', padding: '0 0 0 12px', flexShrink: 0 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
              >×</button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '14px 20px 4px' }}>
            {step.futurePlans ? (
              <div>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  That's what's live today. Here's what's coming next:
                </p>
                {FUTURE_PLANS.map((p) => (
                  <div key={p.label} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <div style={{ marginTop: 4, width: 6, height: 6, borderRadius: 99, background: 'var(--accent)', flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{p.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : step.codeEntry ? (
              <div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{step.body}</p>
                <CodeEntryForm onSuccess={next} />
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65 }}>{step.body}</p>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 20px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <button onClick={prev} disabled={isFirst} style={{ background: 'none', border: 'none', cursor: isFirst ? 'default' : 'pointer', fontSize: 13, color: 'var(--text-dim)', padding: 0, fontFamily: 'var(--font-body)', opacity: isFirst ? 0 : 1, transition: 'color .15s, opacity .15s' }}
              onMouseEnter={(e) => !isFirst && (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
            >← Back</button>

            <Dots total={steps.length} current={stepIndex} />

            {step.codeEntry ? (
              <div style={{ width: 70 }} />
            ) : (
              <button onClick={isLast ? end : next}
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)', transition: 'opacity .15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '.82')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >{isLast ? 'Finish' : 'Next →'}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(node, document.body);
}
