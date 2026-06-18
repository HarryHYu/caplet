import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useTour } from '../contexts/TourContext';
import api from '../services/api';

/* ─────────────────────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────────────────────── */
const PAD     = 10;
const TIP_W   = 430;
const TIP_GAP = 22;
const FADE    = 200;   // ms for opacity transitions
const TIP_MIN_H = 240; // minimum height needed to show a tooltip without clipping

const FUTURE_PLANS = [
  { label: 'Live Kahoot-style Mode',     desc: 'Real-time classroom quizzes — leaderboards, instant feedback, very low latency. Everything Kahoot does, but with the actual course content built in.' },
  { label: 'AI Essay Marking',           desc: 'Students write long-form answers; a fine-tuned model grades them and gives targeted, specific feedback — not just right or wrong.' },
  { label: 'Adaptive Practice',          desc: 'Difficulty adjusts per student in real time based on their quiz performance. Everyone works at exactly the right level.' },
  { label: 'Gamification',               desc: 'One shared currency across lessons, games and activities — points, streaks, leaderboards, all connected.' },
  { label: 'Assessment & Certification', desc: 'Formal assessments with marking rubrics, certificates, and school-level progress reporting.' },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Hooks
───────────────────────────────────────────────────────────────────────────── */
function useDims() {
  const [d, setD] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const h = () => setD({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return d;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Element finder — cancellable
───────────────────────────────────────────────────────────────────────────── */
function findEl(targetId, onFound, isDead) {
  let attempts = 0;
  const poll = () => {
    if (isDead()) return;
    const el = document.querySelector(`[data-tour-id="${targetId}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const isFixed  = window.getComputedStyle(el).position === 'fixed';
        const offScreen = !isFixed && (r.bottom < 0 || r.top > window.innerHeight);
        if (offScreen) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            if (isDead()) return;
            const el2 = document.querySelector(`[data-tour-id="${targetId}"]`);
            onFound(el2 ? el2.getBoundingClientRect() : null);
          }, 580);
        } else {
          onFound(r);
        }
        return;
      }
    }
    if (++attempts < 30) setTimeout(poll, 140);
    else onFound(null);  // give up → show floating
  };
  poll();
}

/* ─────────────────────────────────────────────────────────────────────────────
   Tooltip position calculator  (viewport-safe)
───────────────────────────────────────────────────────────────────────────── */
function calcPos(sr, placement, winW, winH, wide) {
  const tw = Math.min(wide ? 500 : TIP_W, winW - 32);
  const centered = { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: tw };

  if (!sr || placement === 'center') return centered;

  const cx  = sr.left + sr.width / 2;
  const clL = (l) => Math.max(16, Math.min(l, winW - tw - 16));
  const clT = (t) => Math.max(70, Math.min(t, winH - TIP_MIN_H));

  switch (placement) {
    case 'bottom': {
      const spaceBelow = winH - (sr.top + sr.height);
      const spaceAbove = sr.top;
      if (spaceBelow < TIP_MIN_H && spaceAbove < TIP_MIN_H) return centered;
      if (spaceBelow >= TIP_MIN_H)
        return { position: 'fixed', width: tw, top: clT(sr.top + sr.height + TIP_GAP), left: clL(cx - tw / 2) };
      return { position: 'fixed', width: tw, bottom: Math.max(20, winH - sr.top + TIP_GAP), left: clL(cx - tw / 2) };
    }
    case 'top': {
      const spaceAbove = sr.top;
      const spaceBelow = winH - (sr.top + sr.height);
      if (spaceAbove < TIP_MIN_H && spaceBelow < TIP_MIN_H) return centered;
      if (spaceAbove >= TIP_MIN_H)
        return { position: 'fixed', width: tw, bottom: Math.max(20, winH - sr.top + TIP_GAP), left: clL(cx - tw / 2) };
      return { position: 'fixed', width: tw, top: clT(sr.top + sr.height + TIP_GAP), left: clL(cx - tw / 2) };
    }
    case 'right': {
      const spaceRight = winW - (sr.left + sr.width);
      if (spaceRight < tw + TIP_GAP + 16) return centered;
      return { position: 'fixed', width: tw, left: sr.left + sr.width + TIP_GAP, top: clT(sr.top) };
    }
    case 'left': {
      const spaceLeft = sr.left;
      if (spaceLeft < tw + TIP_GAP + 16) return centered;
      return { position: 'fixed', width: tw, right: winW - sr.left + TIP_GAP, top: clT(sr.top) };
    }
    default: return centered;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Caret arrow (rotated square, uses CSS vars)
───────────────────────────────────────────────────────────────────────────── */
function Caret({ placement }) {
  if (!placement || placement === 'center') return null;
  const S = 9;
  const base = { position: 'absolute', width: S, height: S, background: 'var(--surface-raised)', transform: 'rotate(45deg)' };
  switch (placement) {
    case 'bottom': return <div style={{ ...base, top: -S / 2 - 1, left: '50%', marginLeft: -S / 2, borderTop: '1px solid var(--line-soft)', borderLeft: '1px solid var(--line-soft)' }} />;
    case 'top':    return <div style={{ ...base, bottom: -S / 2 - 1, left: '50%', marginLeft: -S / 2, borderBottom: '1px solid var(--line-soft)', borderRight: '1px solid var(--line-soft)' }} />;
    case 'right':  return <div style={{ ...base, left: -S / 2 - 1, top: 28, borderLeft: '1px solid var(--line-soft)', borderBottom: '1px solid var(--line-soft)' }} />;
    case 'left':   return <div style={{ ...base, right: -S / 2 - 1, top: 28, borderRight: '1px solid var(--line-soft)', borderTop: '1px solid var(--line-soft)' }} />;
    default: return null;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Step dot progress bar
───────────────────────────────────────────────────────────────────────────── */
function Dots({ total, current }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 6, width: i === current ? 18 : 6, borderRadius: 9,
          background: i === current ? 'var(--accent)' : 'var(--line-soft)',
          transition: 'width .25s ease, background .25s ease',
        }} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Access-code form (inline inside tooltip)
───────────────────────────────────────────────────────────────────────────── */
function CodeForm({ onSuccess }) {
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setErr(''); setLoading(true);
    try   { await api.editorEnter(code.trim()); onSuccess(); }
    catch (ex) { setErr(ex.message || 'Wrong code — try again'); }
    finally    { setLoading(false); }
  };

  const borderColor = (focused) => err ? '#ef4444' : focused ? 'var(--accent)' : 'var(--line-soft)';
  return (
    <form onSubmit={submit} style={{ marginTop: 12 }}>
      <input
        type="password" autoComplete="off" placeholder="Enter access code"
        value={code} onChange={(e) => setCode(e.target.value)}
        onFocus={(e) => (e.target.style.borderColor = borderColor(true))}
        onBlur={(e)  => (e.target.style.borderColor = borderColor(false))}
        style={{
          display: 'block', width: '100%', boxSizing: 'border-box',
          padding: '10px 14px', borderRadius: 10, marginBottom: 8,
          border: `1.5px solid ${borderColor(false)}`,
          background: 'var(--surface-soft)', color: 'var(--text-primary)',
          fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none',
        }}
      />
      {err && <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 8px', fontFamily: 'var(--font-body)' }}>{err}</p>}
      <button type="submit" disabled={loading || !code.trim()} style={{
        display: 'block', width: '100%', padding: '10px', border: 'none', borderRadius: 10,
        background: (!loading && code.trim()) ? 'var(--accent)' : 'var(--line-soft)',
        color:      (!loading && code.trim()) ? '#fff' : 'var(--text-dim)',
        cursor: loading ? 'wait' : 'pointer',
        fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
        transition: 'background .15s, color .15s',
      }}>
        {loading ? 'Checking…' : 'Continue →'}
      </button>
    </form>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main overlay
───────────────────────────────────────────────────────────────────────────── */
export default function TourOverlay() {
  const { active, stepIndex, steps, next, prev, end } = useTour();
  const location = useLocation();
  const dims     = useDims();

  const [rect,    setRect]    = useState(null);   // spotlight rect
  const [spotVis, setSpotVis] = useState(false);  // spotlight opacity
  const [tipVis,  setTipVis]  = useState(false);  // tooltip opacity
  const prevRef  = useRef({ stepIndex: -1, route: undefined });
  const deadRef  = useRef(false);
  const timersRef = useRef([]);

  const step = steps[stepIndex];

  /* ── Helpers ─────────────────────────────────────────────────────────────── */
  const cancel = () => {
    deadRef.current = true;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };
  const t = (fn, ms) => {
    const id = setTimeout(() => { if (!deadRef.current) fn(); }, ms);
    timersRef.current.push(id);
    return id;
  };

  /* ── Main transition effect ──────────────────────────────────────────────── */
  useEffect(() => {
    cancel();
    deadRef.current = false;

    if (!active || !step) { setSpotVis(false); setTipVis(false); return; }

    const prev_ = prevRef.current;
    const isSamePage = (
      prev_.stepIndex >= 0 &&
      step.route !== undefined &&
      prev_.route === step.route
    );
    prevRef.current = { stepIndex, route: step.route };

    // ── Floating step (no target) ────────────────────────────────────────────
    if (!step.target) {
      setSpotVis(false);
      setRect(null);
      setTipVis(false);
      t(() => { setTipVis(true); }, isSamePage ? FADE : FADE + 60);
      return;
    }

    // ── Non-floating: has a target element ──────────────────────────────────
    if (isSamePage) {
      // Spotlight stays visible; only tooltip fades out → glide → fade in
      setTipVis(false);
      t(() => {
        findEl(step.target, (r) => {
          if (deadRef.current) return;
          if (r) { setRect(r); setSpotVis(true); }
          else   { setSpotVis(false); setRect(null); }
          t(() => setTipVis(true), r ? 360 : 0); // wait for spotlight glide
        }, () => deadRef.current);
      }, FADE);
    } else {
      // Cross-page: fade everything out, find on new page, fade back in
      setSpotVis(false);
      setTipVis(false);
      t(() => {
        setRect(null);
        findEl(step.target, (r) => {
          if (deadRef.current) return;
          if (r) {
            setRect(r);         // mount spotlight at correct position (no transition on mount)
            t(() => { setSpotVis(true); t(() => setTipVis(true), 80); }, 30);
          } else {
            // Element not found — show floating
            setSpotVis(false); setRect(null);
            t(() => setTipVis(true), 60);
          }
        }, () => deadRef.current);
      }, FADE + 80);
    }

    return cancel;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex, location.pathname]);

  // Keep rect fresh on scroll/resize while visible
  useEffect(() => {
    if (!active || !step?.target || !spotVis) return;
    const refresh = () => {
      const el = document.querySelector(`[data-tour-id="${step.target}"]`);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener('scroll', refresh, { passive: true, capture: true });
    window.addEventListener('resize', refresh);
    return () => {
      window.removeEventListener('scroll', refresh, { capture: true });
      window.removeEventListener('resize', refresh);
    };
  }, [active, step?.target, spotVis]);

  /* ── Render ──────────────────────────────────────────────────────────────── */
  if (!active || !step) return null;

  const isFloating = !step.target || !rect;
  const DARK = 'rgba(0,0,0,0.70)';

  const sr = rect ? {
    top:    rect.top    - PAD,
    left:   rect.left   - PAD,
    width:  rect.width  + PAD * 2,
    height: rect.height + PAD * 2,
  } : null;

  const isFirst = stepIndex === 0;
  const isLast  = stepIndex === steps.length - 1;
  const pos     = calcPos(sr, step.placement, dims.w, dims.h, step.wide);

  // For floating steps that ended up floating due to element not found,
  // use the step's actual placement for tooltip position
  const effectivePlacement = isFloating ? 'center' : step.placement;

  const node = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9900, pointerEvents: 'none' }}>

      {/* ── Spotlight / Backdrop ─────────────────────────────────── */}
      {isFloating ? (
        /* Full-screen dim for floating steps */
        <div style={{
          position: 'absolute', inset: 0, background: DARK, pointerEvents: 'auto',
          opacity: tipVis ? 1 : 0, transition: `opacity ${FADE}ms ease`,
        }} onClick={(e) => { if (e.target === e.currentTarget) end(); }} />
      ) : (
        <>
          {/* Box-shadow spotlight — glides smoothly on same-page moves */}
          {sr && (
            <div style={{
              position: 'fixed',
              top: sr.top, left: sr.left, width: sr.width, height: sr.height,
              borderRadius: 14, background: 'transparent',
              boxShadow: `0 0 0 9999px ${DARK}, 0 0 0 2.5px var(--accent), 0 0 0 6px rgba(0,80,255,0.15)`,
              pointerEvents: 'none',
              opacity: spotVis ? 1 : 0,
              transition: [
                `opacity ${FADE}ms ease`,
                'top 0.38s cubic-bezier(0.4,0,0.2,1)',
                'left 0.38s cubic-bezier(0.4,0,0.2,1)',
                'width 0.38s cubic-bezier(0.4,0,0.2,1)',
                'height 0.38s cubic-bezier(0.4,0,0.2,1)',
              ].join(', '),
            }} />
          )}
          {/* Intercept off-spotlight clicks */}
          <div style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: spotVis ? 'auto' : 'none' }}
            onClick={(e) => {
              if (!sr) return;
              const { clientX: x, clientY: y } = e;
              if (x >= sr.left && x <= sr.left + sr.width && y >= sr.top && y <= sr.top + sr.height) return;
              e.stopPropagation();
            }}
          />
        </>
      )}

      {/* ── Tooltip card ─────────────────────────────────────────── */}
      <div style={{
        ...pos,
        zIndex: 9902,
        pointerEvents: 'auto',
        opacity: tipVis ? 1 : 0,
        transform: `${pos.transform ?? ''} translateY(${tipVis ? 0 : 8}px)`.trim(),
        transition: `opacity ${FADE}ms ease, transform ${FADE}ms ease`,
      }}>
        {!isFloating && <Caret placement={effectivePlacement} />}

        <div style={{
          background: 'var(--surface-raised)',
          border: '1px solid var(--line-soft)',
          borderRadius: 18,
          boxShadow: '0 24px 60px rgba(0,0,0,0.20), 0 4px 16px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}>
          {/* Accent bar */}
          <div style={{ height: 4, background: 'var(--accent)', borderRadius: '18px 18px 0 0' }} />

          {/* Header */}
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--line-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ margin: '0 0 3px', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', opacity: 0.72 }}>
                  {stepIndex + 1} / {steps.length}
                </p>
                <h3 style={{ margin: 0, fontSize: 15, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {step.title}
                </h3>
              </div>
              <button onClick={end} aria-label="Close tour"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, lineHeight: 1, color: 'var(--text-dim)', padding: '0 0 0 14px', flexShrink: 0 }}
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
                  <div key={p.label} style={{ display: 'flex', gap: 10, marginBottom: 13 }}>
                    <div style={{ marginTop: 5, width: 5, height: 5, borderRadius: 99, background: 'var(--accent)', flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{p.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : step.codeEntry ? (
              <div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>{step.body}</p>
                <CodeForm onSuccess={next} />
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65 }}>{step.body}</p>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 20px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <button onClick={prev} disabled={isFirst}
              style={{ background: 'none', border: 'none', cursor: isFirst ? 'default' : 'pointer', fontSize: 13, color: 'var(--text-dim)', padding: 0, fontFamily: 'var(--font-body)', opacity: isFirst ? 0 : 1, transition: 'color .15s, opacity .15s' }}
              onMouseEnter={(e) => !isFirst && (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
            >← Back</button>

            <Dots total={steps.length} current={stepIndex} />

            {step.codeEntry ? <div style={{ width: 72 }} /> : (
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
