import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useTour } from '../contexts/TourContext';
import api from '../services/api';

/* ─────────────────────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────────────────────── */
const PAD           = 10;
const TIP_W         = 430;
const TIP_GAP       = 22;
const FADE          = 180;
const TIP_MIN_H     = 220;

// Cursor animation timing (ms)
const CURSOR_MOVE   = 650;   // CSS transition for cursor travel
const HOVER_PAUSE   = 380;   // cursor sits still before clicking
const CLICK_DOWN    = 120;   // scale-down on click
const CLICK_UP      = 140;   // scale-up after click
const POST_CLICK    = 300;   // settle time after click before showing spotlight

// Cursor SVG hotspot offset within the container div
const TIP_OX = 3;
const TIP_OY = 2;

const FUTURE_PLANS = [
  { label: 'Live Kahoot-style Mode',     desc: 'Real-time classroom quizzes — leaderboards, instant feedback, very low latency. Everything Kahoot does, but with the actual course content built in.' },
  { label: 'AI Essay Marking',           desc: 'Students write long-form answers; a fine-tuned model grades them and gives targeted, specific feedback — not just right or wrong.' },
  { label: 'Adaptive Practice',          desc: 'Difficulty adjusts per student in real time based on their quiz performance. Everyone works at exactly the right level.' },
  { label: 'Gamification',               desc: 'One shared currency across lessons, games and activities — points, streaks, leaderboards, all connected.' },
  { label: 'Assessment & Certification', desc: 'Formal assessments with marking rubrics, certificates, and school-level progress reporting.' },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Viewport dimensions hook
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
   Element finder — polls until found or gives up
───────────────────────────────────────────────────────────────────────────── */
function findEl(targetId, onFound, isDead) {
  let attempts = 0;
  const poll = () => {
    if (isDead()) return;
    const el = document.querySelector(`[data-tour-id="${targetId}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        const isFixed   = window.getComputedStyle(el).position === 'fixed';
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
    if (++attempts < 30) setTimeout(poll, 150);
    else onFound(null);
  };
  poll();
}

/* ─────────────────────────────────────────────────────────────────────────────
   Get center-ish point of a DOM element for cursor targeting
   Returns null if element not yet in DOM
───────────────────────────────────────────────────────────────────────────── */
function getElPoint(targetId) {
  if (!targetId) return null;
  const el = document.querySelector(`[data-tour-id="${targetId}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  return {
    x: r.left + r.width  * 0.42,
    y: r.top  + r.height * 0.48,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   Tooltip position calculator — viewport-safe
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
      if (winW - (sr.left + sr.width) < tw + TIP_GAP + 16) return centered;
      return { position: 'fixed', width: tw, left: sr.left + sr.width + TIP_GAP, top: clT(sr.top) };
    }
    case 'left': {
      if (sr.left < tw + TIP_GAP + 16) return centered;
      return { position: 'fixed', width: tw, right: winW - sr.left + TIP_GAP, top: clT(sr.top) };
    }
    default: return centered;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Caret arrow (rotated square, theme-compatible)
───────────────────────────────────────────────────────────────────────────── */
function Caret({ placement }) {
  if (!placement || placement === 'center') return null;
  const S = 9;
  const base = {
    position: 'absolute', width: S, height: S,
    background: 'var(--surface-raised)', transform: 'rotate(45deg)',
  };
  switch (placement) {
    case 'bottom': return <div style={{ ...base, top: -S / 2 - 1, left: '50%', marginLeft: -S / 2, borderTop: '1px solid var(--line-soft)', borderLeft: '1px solid var(--line-soft)' }} />;
    case 'top':    return <div style={{ ...base, bottom: -S / 2 - 1, left: '50%', marginLeft: -S / 2, borderBottom: '1px solid var(--line-soft)', borderRight: '1px solid var(--line-soft)' }} />;
    case 'right':  return <div style={{ ...base, left: -S / 2 - 1, top: 28, borderLeft: '1px solid var(--line-soft)', borderBottom: '1px solid var(--line-soft)' }} />;
    case 'left':   return <div style={{ ...base, right: -S / 2 - 1, top: 28, borderRight: '1px solid var(--line-soft)', borderTop: '1px solid var(--line-soft)' }} />;
    default: return null;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Step dots progress bar
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
   Access-code form (inline inside tooltip for editor step)
───────────────────────────────────────────────────────────────────────────── */
function CodeForm({ onSuccess }) {
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setErr(''); setLoading(true);
    try   { await api.editorEnter(code.trim()); onSuccess(); }
    catch (ex) { setErr(ex.message || 'Wrong code — try again'); }
    finally    { setLoading(false); }
  };

  return (
    <form onSubmit={submit} style={{ marginTop: 12 }}>
      <input
        type="password" autoComplete="off" placeholder="Enter access code"
        value={code} onChange={(e) => setCode(e.target.value)}
        style={{
          display: 'block', width: '100%', boxSizing: 'border-box',
          padding: '10px 14px', borderRadius: 10, marginBottom: 8,
          border: `1.5px solid ${err ? '#ef4444' : 'var(--line-soft)'}`,
          background: 'var(--surface-soft)', color: 'var(--text-primary)',
          fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none',
          cursor: 'text',
        }}
      />
      {err && <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 8px', fontFamily: 'var(--font-body)' }}>{err}</p>}
      <button type="submit" disabled={loading || !code.trim()} style={{
        display: 'block', width: '100%', padding: '10px', border: 'none', borderRadius: 10,
        background: (!loading && code.trim()) ? 'var(--accent)' : 'var(--line-soft)',
        color:      (!loading && code.trim()) ? '#fff'          : 'var(--text-dim)',
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
   Virtual cursor — OS-style arrow that glides between targets
───────────────────────────────────────────────────────────────────────────── */
function VirtualCursor({ x, y, visible, clicking }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: x - TIP_OX,
        top:  y - TIP_OY,
        width: 24,
        height: 28,
        pointerEvents: 'none',
        zIndex: 9960,
        opacity: visible ? 1 : 0,
        transition: [
          `left    ${CURSOR_MOVE}ms cubic-bezier(0.42,0,0.18,1.0)`,
          `top     ${CURSOR_MOVE}ms cubic-bezier(0.42,0,0.18,1.0)`,
          'opacity 0.28s ease',
        ].join(', '),
        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.50)) drop-shadow(0 1px 2px rgba(0,0,0,0.35))',
        willChange: 'left, top',
      }}
    >
      <svg
        width="24" height="28" viewBox="0 0 24 28" fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transform: clicking ? 'scale(0.78)' : 'scale(1)',
          transition: `transform ${clicking ? CLICK_DOWN : CLICK_UP}ms ease`,
          transformOrigin: `${TIP_OX}px ${TIP_OY}px`,
          display: 'block',
        }}
      >
        {/* Standard OS arrow cursor — tip at (3.5, 2.5) */}
        <path
          d="M3.5 2.5 L3.5 21.5 L7.5 17.5 L11.5 25.5 L14 24.5 L10 16.5 L16.5 16.5 Z"
          fill="white"
          stroke="#0f0f0f"
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Click ripple — expands and fades on each click
   key prop forces re-mount to restart the CSS animation
───────────────────────────────────────────────────────────────────────────── */
function ClickRipple({ x, y, id }) {
  return (
    <div
      key={id}
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: x, top: y,
        width: 0, height: 0,
        pointerEvents: 'none',
        zIndex: 9959,
      }}
    >
      {/* Inner ring */}
      <div style={{
        position: 'absolute',
        transform: 'translate(-50%,-50%)',
        width: 32, height: 32,
        borderRadius: '50%',
        border: '2px solid rgba(40,100,255,0.6)',
        background: 'rgba(40,100,255,0.10)',
        animation: 'tourRipple 0.55s cubic-bezier(0.35,0,0.25,1) forwards',
      }} />
      {/* Outer ring (delayed, bigger) */}
      <div style={{
        position: 'absolute',
        transform: 'translate(-50%,-50%)',
        width: 48, height: 48,
        borderRadius: '50%',
        border: '1.5px solid rgba(40,100,255,0.30)',
        background: 'transparent',
        animation: 'tourRippleBig 0.7s 0.05s cubic-bezier(0.35,0,0.25,1) forwards',
      }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main overlay component
───────────────────────────────────────────────────────────────────────────── */
export default function TourOverlay() {
  const { active, stepIndex, steps, next, prev, end } = useTour();
  const location = useLocation();
  const dims     = useDims();

  // Spotlight
  const [rect,    setRect]    = useState(null);
  const [spotVis, setSpotVis] = useState(false);
  const [tipVis,  setTipVis]  = useState(false);

  // Virtual cursor
  const [cursorPos,     setCursorPos]     = useState({
    x: typeof window !== 'undefined' ? window.innerWidth - 72 : 900,
    y: 52,
  });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [isClicking,    setIsClicking]    = useState(false);
  const [rippleKey,     setRippleKey]     = useState(0);
  const [showRipple,    setShowRipple]    = useState(false);

  const deadRef   = useRef(false);
  const timersRef = useRef([]);

  const step = steps[stepIndex];

  /* ── Inject keyframe animations once ────────────────────────────────────── */
  useEffect(() => {
    const ID = 'tour-cursor-keyframes';
    if (document.getElementById(ID)) return;
    const style = document.createElement('style');
    style.id = ID;
    style.textContent = `
      @keyframes tourRipple {
        from { transform: translate(-50%,-50%) scale(0.2); opacity: 1; }
        to   { transform: translate(-50%,-50%) scale(3.2); opacity: 0; }
      }
      @keyframes tourRippleBig {
        from { transform: translate(-50%,-50%) scale(0.1); opacity: 0.6; }
        to   { transform: translate(-50%,-50%) scale(3.8); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(ID)?.remove(); };
  }, []);

  /* ── Timer helpers ───────────────────────────────────────────────────────── */
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

  /* ── Main step transition effect ─────────────────────────────────────────── */
  useEffect(() => {
    cancel();
    deadRef.current = false;

    if (!active || !step) {
      setSpotVis(false);
      setTipVis(false);
      setCursorVisible(false);
      return;
    }

    setCursorVisible(true);
    setTipVis(false);
    setSpotVis(false);
    setIsClicking(false);

    const targetId = step.target;

    // ── Floating step (no target) ──────────────────────────────────────────
    if (!targetId) {
      // Park cursor near center, just off to give depth
      setCursorPos({ x: dims.w * 0.54, y: dims.h * 0.44 });
      setRect(null);
      t(() => setTipVis(true), CURSOR_MOVE + 220);
      return cancel;
    }

    // Find cursor destination (may be null if element not yet mounted)
    const pos0 = getElPoint(targetId);

    // ── Click step (nav links, calc button) ───────────────────────────────
    if (step.clickAnim) {
      // Click-target elements live in the Navbar (always mounted)
      const clickPos = pos0 ?? { x: dims.w / 2, y: 52 };
      setCursorPos(clickPos);

      t(() => {
        // Arrived — hover pause then click
        t(() => {
          setIsClicking(true);
          t(() => {
            setIsClicking(false);
            setRippleKey((k) => k + 1);
            setShowRipple(true);
            t(() => setShowRipple(false), 700);

            // After click: page may navigate → poll for element → show spotlight
            t(() => {
              findEl(targetId, (r) => {
                if (deadRef.current) return;
                if (r) {
                  setRect(r);
                  // Cursor glides to the freshly-spotlit element
                  setCursorPos({ x: r.left + r.width * 0.42, y: r.top + r.height * 0.48 });
                  setSpotVis(true);
                }
                t(() => setTipVis(true), r ? 240 : 80);
              }, () => deadRef.current);
            }, POST_CLICK);
          }, CLICK_DOWN);
        }, HOVER_PAUSE);
      }, CURSOR_MOVE);

      return cancel;
    }

    // ── Normal hover step ─────────────────────────────────────────────────
    // If element is already in DOM, move cursor to it immediately.
    if (pos0) setCursorPos(pos0);

    // findEl handles cross-page polling; when element is found, cursor
    // finishes its travel and spotlight+tooltip appear.
    findEl(targetId, (r) => {
      if (deadRef.current) return;
      if (r) {
        setRect(r);
        setSpotVis(true);
        const p = { x: r.left + r.width * 0.42, y: r.top + r.height * 0.48 };
        setCursorPos(p);
        // Give cursor time to complete its travel before showing tooltip
        t(() => setTipVis(true), pos0 ? CURSOR_MOVE + 120 : CURSOR_MOVE + 80);
      } else {
        t(() => setTipVis(true), 80);
      }
    }, () => deadRef.current);

    return cancel;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex, location.pathname]);

  /* ── Keep spotlight rect fresh on scroll / resize ───────────────────────── */
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
  const DARK = 'rgba(0,0,0,0.68)';

  const sr = rect ? {
    top:    rect.top    - PAD,
    left:   rect.left   - PAD,
    width:  rect.width  + PAD * 2,
    height: rect.height + PAD * 2,
  } : null;

  const isFirst            = stepIndex === 0;
  const isLast             = stepIndex === steps.length - 1;
  const pos                = calcPos(sr, step.placement, dims.w, dims.h, step.wide);
  const effectivePlacement = isFloating ? 'center' : step.placement;

  const node = (
    <>
      {/* Virtual cursor — always on top */}
      <VirtualCursor
        x={cursorPos.x}
        y={cursorPos.y}
        visible={cursorVisible}
        clicking={isClicking}
      />

      {/* Click ripple */}
      {showRipple && (
        <ClickRipple x={cursorPos.x} y={cursorPos.y} id={rippleKey} />
      )}

      {/* Backdrop + spotlight */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9900, pointerEvents: 'none' }}>

        {isFloating ? (
          /* Full-screen dim for floating / no-target steps */
          <div style={{
            position: 'absolute', inset: 0, background: DARK,
            pointerEvents: 'auto',
            opacity: tipVis ? 1 : 0,
            transition: `opacity ${FADE}ms ease`,
          }} onClick={(e) => { if (e.target === e.currentTarget) end(); }} />
        ) : (
          <>
            {/* Box-shadow spotlight — glides on same-page transitions */}
            {sr && (
              <div style={{
                position: 'fixed',
                top: sr.top, left: sr.left, width: sr.width, height: sr.height,
                borderRadius: 14,
                background: 'transparent',
                boxShadow: `0 0 0 9999px ${DARK}, 0 0 0 2.5px var(--accent), 0 0 0 7px rgba(0,80,255,0.14)`,
                pointerEvents: 'none',
                opacity: spotVis ? 1 : 0,
                transition: [
                  `opacity ${FADE}ms ease`,
                  'top    0.42s cubic-bezier(0.4,0,0.2,1)',
                  'left   0.42s cubic-bezier(0.4,0,0.2,1)',
                  'width  0.42s cubic-bezier(0.4,0,0.2,1)',
                  'height 0.42s cubic-bezier(0.4,0,0.2,1)',
                ].join(', '),
              }} />
            )}
            {/* Intercept off-spotlight clicks to prevent accidental interaction */}
            <div
              style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: spotVis ? 'auto' : 'none' }}
              onClick={(e) => {
                if (!sr) return;
                const { clientX: x, clientY: y } = e;
                if (x >= sr.left && x <= sr.left + sr.width && y >= sr.top && y <= sr.top + sr.height) return;
                e.stopPropagation();
              }}
            />
          </>
        )}

        {/* ── Tooltip card ─────────────────────────────────────────────────── */}
        <div style={{
          ...pos,
          zIndex: 9910,
          pointerEvents: 'auto',
          cursor: 'default',
          opacity: tipVis ? 1 : 0,
          transform: `${pos.transform ?? ''} translateY(${tipVis ? 0 : 9}px)`.trim(),
          transition: `opacity ${FADE}ms ease, transform ${FADE}ms ease`,
        }}>
          {!isFloating && <Caret placement={effectivePlacement} />}

          <div style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--line-soft)',
            borderRadius: 18,
            boxShadow: '0 28px 64px rgba(0,0,0,0.22), 0 4px 18px rgba(0,0,0,0.08)',
            overflow: 'hidden',
          }}>
            {/* Accent top bar */}
            <div style={{ height: 4, background: 'var(--accent)', borderRadius: '18px 18px 0 0' }} />

            {/* Header */}
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--line-soft)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{
                    margin: '0 0 3px', fontSize: 10,
                    fontFamily: 'var(--font-mono)', fontWeight: 700,
                    letterSpacing: '0.14em', textTransform: 'uppercase',
                    color: 'var(--accent)', opacity: 0.72,
                  }}>
                    {stepIndex + 1} / {steps.length}
                  </p>
                  <h3 style={{
                    margin: 0, fontSize: 15,
                    fontFamily: 'var(--font-display)', fontWeight: 700,
                    color: 'var(--text-primary)', lineHeight: 1.3,
                  }}>
                    {step.title}
                  </h3>
                </div>
                <button
                  onClick={end}
                  aria-label="Close tour"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 20, lineHeight: 1, color: 'var(--text-dim)',
                    padding: '0 0 0 14px', flexShrink: 0,
                  }}
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
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                          {p.label}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                          {p.desc}
                        </p>
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

            {/* Footer nav */}
            <div style={{
              padding: '14px 20px 18px',
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: 8,
            }}>
              <button
                onClick={prev}
                disabled={isFirst}
                style={{
                  background: 'none', border: 'none',
                  cursor: isFirst ? 'default' : 'pointer',
                  fontSize: 13, color: 'var(--text-dim)', padding: 0,
                  fontFamily: 'var(--font-body)',
                  opacity: isFirst ? 0 : 1,
                  transition: 'color .15s, opacity .15s',
                }}
                onMouseEnter={(e) => !isFirst && (e.currentTarget.style.color = 'var(--text-primary)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
              >← Back</button>

              <Dots total={steps.length} current={stepIndex} />

              {step.codeEntry ? (
                <div style={{ width: 72 }} />
              ) : (
                <button
                  onClick={isLast ? end : next}
                  style={{
                    background: 'var(--accent)', color: '#fff', border: 'none',
                    borderRadius: 999, padding: '8px 20px', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
                    transition: 'opacity .15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '.82')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >{isLast ? 'Finish' : 'Next →'}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(node, document.body);
}
