import { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useTour } from '../contexts/TourContext';
import api from '../services/api';

/* ── Future-plans data ─────────────────────────────────────────────────────── */
const FUTURE_PLANS = [
  { label: 'Live Kahoot-style Mode', desc: 'Real-time classroom quizzes — leaderboards, instant feedback, low latency. Everything Kahoot does, but the content is already inside the platform.' },
  { label: 'AI Essay Marking', desc: 'Students submit written answers; a fine-tuned model grades them and gives specific, targeted feedback — not just right or wrong.' },
  { label: 'Adaptive Practice', desc: 'Difficulty adjusts per student in real time based on quiz performance. Every student moves at exactly the right pace.' },
  { label: 'Gamification', desc: 'One shared in-app currency across lessons, games, and activities — points, streaks, leaderboards, all connected.' },
  { label: 'Assessment & Certification', desc: 'Formal assessments with rubrics, certificates, and school-level reporting built for real classroom use.' },
];

/* ── Spotlight PAD & tooltip sizing ─────────────────────────────────────────── */
const PAD = 10;
const TIP_W = 420;
const TIP_GAP = 20;
const FADE_MS = 220;

/* ── Dimension hook ──────────────────────────────────────────────────────────── */
function useDims() {
  const [d, setD] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const h = () => setD({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return d;
}

/* ── Tooltip position calculator ─────────────────────────────────────────────── */
function tipPos(r, placement, winW, winH, wide) {
  const tw = Math.min(wide ? 500 : TIP_W, winW - 32);

  if (!r || placement === 'center') {
    return { width: tw, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  }

  const cx = r.left + r.width / 2;
  const clampL = (l) => Math.max(16, Math.min(l, winW - tw - 16));

  switch (placement) {
    case 'bottom': {
      const top = r.bottom + TIP_GAP;
      return (top + 260 <= winH)
        ? { width: tw, top, left: clampL(cx - tw / 2) }
        : { width: tw, bottom: winH - r.top + TIP_GAP, left: clampL(cx - tw / 2) };
    }
    case 'top': {
      const bot = winH - r.top + TIP_GAP;
      return (winH - bot >= 260)
        ? { width: tw, bottom: bot, left: clampL(cx - tw / 2) }
        : { width: tw, top: r.bottom + TIP_GAP, left: clampL(cx - tw / 2) };
    }
    case 'right':
      return { width: tw, left: Math.min(r.right + TIP_GAP, winW - tw - 16), top: Math.max(16, Math.min(r.top, winH - 320)) };
    case 'left':
      return { width: tw, right: Math.max(16, winW - r.left + TIP_GAP), top: Math.max(16, Math.min(r.top, winH - 320)) };
    default:
      return { width: tw, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' };
  }
}

/* ── Arrow pointing from tooltip toward the target ──────────────────────────── */
function TooltipArrow({ placement }) {
  if (!placement || placement === 'center') return null;
  const base = { position: 'absolute', width: 0, height: 0, pointerEvents: 'none' };
  const S = 9; // half-width
  switch (placement) {
    case 'bottom': return <div style={{ ...base, top: -(S * 2 - 1), left: '50%', transform: 'translateX(-50%)', borderLeft: `${S}px solid transparent`, borderRight: `${S}px solid transparent`, borderBottom: `${S * 2}px solid #fff` }} />;
    case 'top':    return <div style={{ ...base, bottom: -(S * 2 - 1), left: '50%', transform: 'translateX(-50%)', borderLeft: `${S}px solid transparent`, borderRight: `${S}px solid transparent`, borderTop: `${S * 2}px solid #fff` }} />;
    case 'right':  return <div style={{ ...base, left: -(S * 2 - 1), top: 28, borderTop: `${S}px solid transparent`, borderBottom: `${S}px solid transparent`, borderRight: `${S * 2}px solid #fff` }} />;
    case 'left':   return <div style={{ ...base, right: -(S * 2 - 1), top: 28, borderTop: `${S}px solid transparent`, borderBottom: `${S}px solid transparent`, borderLeft: `${S * 2}px solid #fff` }} />;
    default: return null;
  }
}

/* ── Step dot indicator ──────────────────────────────────────────────────────── */
function StepDots({ total, current }) {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 6,
          width: i === current ? 18 : 6,
          borderRadius: 999,
          background: i === current ? 'var(--accent)' : 'var(--line-soft)',
          transition: 'width 0.25s ease, background 0.25s ease',
        }} />
      ))}
    </div>
  );
}

/* ── Code-entry body (built into the guide) ──────────────────────────────────── */
function CodeEntryBody({ onSuccess }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setErr('');
    setLoading(true);
    try {
      await api.editorEnter(code.trim());
      onSuccess();
    } catch (ex) {
      setErr(ex.message || 'Incorrect code — try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ marginTop: 12 }}>
      <input
        type="password"
        autoComplete="off"
        placeholder="Access code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '10px 14px',
          borderRadius: 10,
          border: err ? '1.5px solid #ef4444' : '1.5px solid var(--line-soft)',
          background: 'var(--surface-soft)',
          color: 'var(--text-primary)',
          fontSize: 14,
          fontFamily: 'var(--font-body)',
          outline: 'none',
          transition: 'border-color 0.15s',
          marginBottom: 8,
          display: 'block',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={(e) => (e.target.style.borderColor = err ? '#ef4444' : 'var(--line-soft)')}
      />
      {err && <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 8px', fontFamily: 'var(--font-body)' }}>{err}</p>}
      <button
        type="submit"
        disabled={loading || !code.trim()}
        style={{
          width: '100%',
          padding: '10px',
          background: loading || !code.trim() ? 'var(--line-soft)' : 'var(--accent)',
          color: loading || !code.trim() ? 'var(--text-dim)' : '#fff',
          border: 'none', borderRadius: 10, cursor: loading ? 'wait' : 'pointer',
          fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
          transition: 'all 0.15s',
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
  const dims = useDims();

  // rect of the spotlight element (null = floating / not yet found)
  const [rect, setRect] = useState(null);
  // opacity for smooth fade in/out
  const [vis, setVis] = useState(false);
  const pollRef = useRef(null);
  const fadeRef = useRef(null);
  const prevStepRef = useRef(-1);

  const step = steps[stepIndex];

  // ── Find the target element after step changes ──────────────────────────────
  const findTarget = useCallback((targetId, attempt) => {
    clearTimeout(pollRef.current);
    if (!targetId) {
      setRect(null);
      setVis(true);
      return;
    }
    const el = document.querySelector(`[data-tour-id="${targetId}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      const inView = r.top >= 60 && r.bottom <= window.innerHeight - 20;
      if (!inView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        pollRef.current = setTimeout(() => {
          const el2 = document.querySelector(`[data-tour-id="${targetId}"]`);
          if (el2) { setRect(el2.getBoundingClientRect()); setVis(true); }
        }, 520);
      } else {
        setRect(r);
        setVis(true);
      }
      return;
    }
    if (attempt < 30) {
      pollRef.current = setTimeout(() => findTarget(targetId, attempt + 1), 130);
    } else {
      // Give up — show as floating
      setRect(null);
      setVis(true);
    }
  }, []);

  // ── On step change: fade out → reposition → fade in ─────────────────────────
  useEffect(() => {
    if (!active || !step) return;
    clearTimeout(pollRef.current);
    clearTimeout(fadeRef.current);

    // Fade out first (unless this is the very first step)
    if (prevStepRef.current !== -1) {
      setVis(false);
      fadeRef.current = setTimeout(() => {
        setRect(null);
        findTarget(step.target || null, 0);
      }, FADE_MS);
    } else {
      findTarget(step.target || null, 0);
    }
    prevStepRef.current = stepIndex;
  }, [active, stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // On deactivate
  useEffect(() => {
    if (!active) { setVis(false); setRect(null); prevStepRef.current = -1; }
  }, [active]);

  // Re-measure on scroll / resize
  useEffect(() => {
    if (!active || !step?.target) return;
    const refresh = () => {
      const el = document.querySelector(`[data-tour-id="${step.target}"]`);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener('scroll', refresh, { passive: true, capture: true });
    window.addEventListener('resize', refresh);
    return () => { window.removeEventListener('scroll', refresh, { capture: true }); window.removeEventListener('resize', refresh); };
  }, [active, step?.target]);

  // Re-find when route changes (in case element wasn't rendered yet)
  useEffect(() => {
    if (!active || !step?.target) return;
    clearTimeout(pollRef.current);
    setVis(false);
    setRect(null);
    pollRef.current = setTimeout(() => findTarget(step.target, 0), 200);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active || !step) return null;

  const isFloating = !step.target || !rect;
  const DARK = 'rgba(0,0,0,0.68)';

  // Spotlight rect with padding
  const sr = rect ? {
    top:    rect.top    - PAD,
    left:   rect.left   - PAD,
    width:  rect.width  + PAD * 2,
    height: rect.height + PAD * 2,
  } : null;

  const isFirst = stepIndex === 0;
  const isLast  = stepIndex === steps.length - 1;
  const pos     = tipPos(sr, step.placement, dims.w, dims.h, step.wide);

  const overlay = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9900, pointerEvents: 'none' }}>

      {/* ── Backdrop / spotlight ───────────────────────────────────────── */}
      {isFloating ? (
        /* Full-screen dim for floating steps */
        <div style={{
          position: 'absolute', inset: 0,
          background: DARK,
          opacity: vis ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
          pointerEvents: 'auto',
        }} onClick={(e) => { if (e.target === e.currentTarget) end(); }} />
      ) : (
        /* Box-shadow spotlight — single element, smooth CSS transition */
        <div style={{
          position: 'fixed',
          top: sr.top, left: sr.left,
          width: sr.width, height: sr.height,
          borderRadius: 14,
          background: 'transparent',
          boxShadow: `0 0 0 9999px ${DARK}, 0 0 0 2.5px var(--accent), 0 0 0 6px rgba(0,80,255,0.18)`,
          opacity: vis ? 1 : 0,
          pointerEvents: 'none',
          transition: `opacity ${FADE_MS}ms ease`,
        }} />
      )}

      {/* ── Click-blocker for non-interactive spotlight area ──────────── */}
      {!isFloating && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9899,
          pointerEvents: vis ? 'auto' : 'none',
        }}
          onClick={(e) => {
            // Allow clicks only within the spotlight
            if (!sr) return;
            const { clientX: x, clientY: y } = e;
            const inSpot = x >= sr.left && x <= sr.left + sr.width && y >= sr.top && y <= sr.top + sr.height;
            if (!inSpot) e.stopPropagation();
          }}
        />
      )}

      {/* ── Tooltip card ──────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          ...pos,
          zIndex: 9902,
          pointerEvents: 'auto',
          opacity: vis ? 1 : 0,
          transform: `${pos.transform || ''} translateY(${vis ? 0 : 10}px)`.trim(),
          transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
        }}
      >
        {/* Arrow pointing at target */}
        {!isFloating && <TooltipArrow placement={step.placement} />}

        {/* Card */}
        <div style={{
          background: '#fff',
          borderRadius: 18,
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          color: '#1a1a1a',
        }}>
          {/* Blue top-bar */}
          <div style={{ height: 4, background: 'var(--accent)' }} />

          {/* Header */}
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', opacity: 0.75 }}>
                  {stepIndex + 1} / {steps.length}
                </p>
                <h3 style={{ margin: 0, fontSize: 15, fontFamily: 'var(--font-display)', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3 }}>
                  {step.title}
                </h3>
              </div>
              <button
                onClick={end}
                aria-label="Close tour"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, lineHeight: 1, color: '#aaa', padding: '2px 4px', flexShrink: 0, marginTop: 2 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#555')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#aaa')}
              >
                ×
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '14px 20px 4px' }}>
            {step.futurePlans ? (
              <div>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                  That's what's live today. Here's what's coming next:
                </p>
                {FUTURE_PLANS.map((p) => (
                  <div key={p.label} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <div style={{ marginTop: 3, width: 6, height: 6, borderRadius: 99, background: 'var(--accent)', flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{p.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#666', lineHeight: 1.5 }}>{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : step.codeEntry ? (
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#555', lineHeight: 1.6 }}>{step.body}</p>
                <CodeEntryBody onSuccess={next} />
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: '#555', lineHeight: 1.65 }}>{step.body}</p>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 20px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <button
              onClick={prev}
              disabled={isFirst}
              style={{
                background: 'none', border: 'none', cursor: isFirst ? 'default' : 'pointer',
                fontSize: 13, color: '#aaa', padding: 0, fontFamily: 'var(--font-body)',
                opacity: isFirst ? 0 : 1, transition: 'color 0.15s, opacity 0.15s',
              }}
              onMouseEnter={(e) => !isFirst && (e.currentTarget.style.color = '#333')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#aaa')}
            >
              ← Back
            </button>

            <StepDots total={steps.length} current={stepIndex} />

            {/* Don't show Next on codeEntry steps — they advance via form submit */}
            {step.codeEntry ? (
              <div style={{ width: 80 }} />
            ) : (
              <button
                onClick={isLast ? end : next}
                style={{
                  background: 'var(--accent)', color: '#fff', border: 'none',
                  borderRadius: 999, padding: '8px 20px', cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                {isLast ? 'Finish' : 'Next →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(overlay, document.body);
}
