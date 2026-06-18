import { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useTour } from '../contexts/TourContext';

/* ── Future-plans card content ─────────────────────────────────────────────── */
const FUTURE_PLANS = [
  {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    label: 'Live Kahoot-style Mode',
    desc: 'Real-time classroom quizzes — low latency, leaderboards, instant feedback. Everything Kahoot does, but built into the learning content.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    label: 'AI Essay Marking',
    desc: "Students submit written answers; a fine-tuned model grades them and gives targeted feedback. Not just right/wrong — actual explanation.",
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    label: 'Adaptive Practice',
    desc: 'Difficulty adjusts per student in real time based on their quiz performance. Everyone moves at the right pace.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Gamification',
    desc: 'One shared in-app currency across lessons, games, and activities. Points, streaks, leaderboards — all connected.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    label: 'Assessment & Certification',
    desc: 'Formal assessments with marking rubrics, certificates, and school-level reporting — built for classroom use.',
  },
];

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function useDimensions() {
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const handler = () => setDims({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return dims;
}

function useTargetRect(targetId, active, stepIndex, pathname) {
  const [rect, setRect] = useState(null);
  const timerRef = useRef(null);

  const attempt = useCallback((n) => {
    const el = document.querySelector(`[data-tour-id="${targetId}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      const inView = r.top >= 0 && r.bottom <= window.innerHeight;
      if (!inView) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        timerRef.current = setTimeout(() => {
          const el2 = document.querySelector(`[data-tour-id="${targetId}"]`);
          if (el2) setRect(el2.getBoundingClientRect());
        }, 500);
      } else {
        setRect(r);
      }
      return;
    }
    if (n < 30) {
      timerRef.current = setTimeout(() => attempt(n + 1), 120);
    } else {
      setRect(null);
    }
  }, [targetId]);

  useEffect(() => {
    clearTimeout(timerRef.current);
    setRect(null);
    if (!active || !targetId) return;
    timerRef.current = setTimeout(() => attempt(0), 80);
    return () => clearTimeout(timerRef.current);
  }, [active, stepIndex, pathname, targetId, attempt]);

  // Keep rect fresh on scroll / resize
  useEffect(() => {
    if (!targetId || !active) return;
    const refresh = () => {
      const el = document.querySelector(`[data-tour-id="${targetId}"]`);
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener('scroll', refresh, { passive: true, capture: true });
    window.addEventListener('resize', refresh);
    return () => {
      window.removeEventListener('scroll', refresh, { capture: true });
      window.removeEventListener('resize', refresh);
    };
  }, [targetId, active]);

  return rect;
}

const PAD = 10;
const TIP_WIDTH = 380;
const TIP_GAP = 18;

function clampLeft(cx, tw, winW) {
  return Math.max(16, Math.min(cx - tw / 2, winW - tw - 16));
}

function tooltipStyle(r, placement, winW, winH, wide) {
  const tw = Math.min(wide ? 500 : TIP_WIDTH, winW - 32);
  const center = { width: tw, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  if (!r) return center;

  const cx = r.left + r.width / 2;

  switch (placement) {
    case 'bottom': {
      const top = r.bottom + TIP_GAP;
      if (top + 220 > winH) {
        // flip to above
        return { width: tw, bottom: winH - r.top + TIP_GAP, left: clampLeft(cx, tw, winW) };
      }
      return { width: tw, top, left: clampLeft(cx, tw, winW) };
    }
    case 'top': {
      const bottom = winH - r.top + TIP_GAP;
      if (winH - bottom + 16 < 220) {
        return { width: tw, top: r.bottom + TIP_GAP, left: clampLeft(cx, tw, winW) };
      }
      return { width: tw, bottom, left: clampLeft(cx, tw, winW) };
    }
    case 'right': {
      const left = Math.min(r.right + TIP_GAP, winW - tw - 16);
      return { width: tw, left, top: Math.max(16, Math.min(r.top, winH - 300)) };
    }
    case 'left': {
      const right = winW - r.left + TIP_GAP;
      return { width: tw, right: Math.min(right, winW - tw - 16), top: Math.max(16, Math.min(r.top, winH - 300)) };
    }
    default:
      return center;
  }
}

/* ── Arrow indicator from tooltip toward target ─────────────────────────────── */
function Arrow({ placement, rect, tipStyle }) {
  if (!rect || !placement || placement === 'center') return null;
  const style = {
    position: 'absolute',
    width: 0,
    height: 0,
    pointerEvents: 'none',
  };

  const ARROW_SIZE = 8;
  switch (placement) {
    case 'bottom': // tooltip is below → arrow points up
      return <div style={{ ...style, top: -ARROW_SIZE, left: '50%', transform: 'translateX(-50%)', borderLeft: `${ARROW_SIZE}px solid transparent`, borderRight: `${ARROW_SIZE}px solid transparent`, borderBottom: `${ARROW_SIZE}px solid var(--accent)` }} />;
    case 'top': // tooltip is above → arrow points down
      return <div style={{ ...style, bottom: -ARROW_SIZE, left: '50%', transform: 'translateX(-50%)', borderLeft: `${ARROW_SIZE}px solid transparent`, borderRight: `${ARROW_SIZE}px solid transparent`, borderTop: `${ARROW_SIZE}px solid var(--accent)` }} />;
    case 'right': // tooltip is right of target → arrow points left
      return <div style={{ ...style, left: -ARROW_SIZE, top: 24, borderTop: `${ARROW_SIZE}px solid transparent`, borderBottom: `${ARROW_SIZE}px solid transparent`, borderRight: `${ARROW_SIZE}px solid var(--accent)` }} />;
    case 'left': // tooltip is left of target → arrow points right
      return <div style={{ ...style, right: -ARROW_SIZE, top: 24, borderTop: `${ARROW_SIZE}px solid transparent`, borderBottom: `${ARROW_SIZE}px solid transparent`, borderLeft: `${ARROW_SIZE}px solid var(--accent)` }} />;
    default:
      return null;
  }
}

/* ── Dots progress bar ──────────────────────────────────────────────────────── */
function StepDots({ total, current }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 16 : 6,
            height: 6,
            borderRadius: 999,
            background: i === current ? 'var(--accent)' : 'var(--line-soft)',
            transition: 'all 0.25s ease',
          }}
        />
      ))}
    </div>
  );
}

/* ── Main overlay ───────────────────────────────────────────────────────────── */
export default function TourOverlay() {
  const { active, stepIndex, steps, next, prev, end } = useTour();
  const location = useLocation();
  const dims = useDimensions();

  const step = steps[stepIndex];
  const targetId = step?.target || null;
  const targetRect = useTargetRect(targetId, active, stepIndex, location.pathname);

  if (!active || !step) return null;

  const isFloating = !targetId || !targetRect;

  // Spotlight bounding box (with padding)
  const r = targetRect
    ? {
        top: Math.max(0, targetRect.top - PAD),
        left: Math.max(0, targetRect.left - PAD),
        right: Math.min(dims.w, targetRect.right + PAD),
        bottom: Math.min(dims.h, targetRect.bottom + PAD),
        width: targetRect.width + PAD * 2,
        height: targetRect.height + PAD * 2,
      }
    : null;

  const DARK = 'rgba(0,0,0,0.72)';
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const tipPos = tooltipStyle(r, step.placement, dims.w, dims.h, step.wide);

  const overlay = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9900, pointerEvents: 'none' }}>

      {/* ── Backdrop (4-div spotlight or full-screen) ── */}
      {isFloating ? (
        <div
          style={{ position: 'absolute', inset: 0, background: DARK, pointerEvents: 'auto' }}
          onClick={(e) => { if (e.target === e.currentTarget) end(); }}
        />
      ) : (
        <>
          {/* Top strip */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: r.top, background: DARK, pointerEvents: 'auto' }} />
          {/* Bottom strip */}
          <div style={{ position: 'absolute', top: r.bottom, left: 0, right: 0, bottom: 0, background: DARK, pointerEvents: 'auto' }} />
          {/* Left strip */}
          <div style={{ position: 'absolute', top: r.top, height: r.height, left: 0, width: r.left, background: DARK, pointerEvents: step.interactive ? 'none' : 'auto' }} />
          {/* Right strip */}
          <div style={{ position: 'absolute', top: r.top, height: r.height, left: r.right, right: 0, background: DARK, pointerEvents: step.interactive ? 'none' : 'auto' }} />
          {/* Highlight ring */}
          <div style={{
            position: 'absolute',
            top: r.top, left: r.left, width: r.width, height: r.height,
            border: '2px solid var(--accent)',
            borderRadius: 14,
            boxShadow: '0 0 0 4px rgba(0,80,255,0.18), 0 0 24px rgba(0,80,255,0.15)',
            pointerEvents: 'none',
            transition: 'all 0.3s ease',
          }} />
        </>
      )}

      {/* ── Tooltip card ── */}
      <div
        style={{
          position: 'fixed',
          ...tipPos,
          pointerEvents: 'auto',
          zIndex: 9901,
        }}
      >
        {/* Directional arrow */}
        {!isFloating && <Arrow placement={step.placement} rect={r} />}

        {/* Card */}
        <div
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid var(--line-soft)',
            borderRadius: 20,
            boxShadow: '0 24px 64px rgba(0,0,0,0.22), 0 0 0 1px rgba(255,255,255,0.06)',
            overflow: 'hidden',
          }}
        >
          {/* Accent top strip */}
          <div style={{ height: 3, background: 'var(--accent)', borderRadius: '20px 20px 0 0' }} />

          {/* Header */}
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--line-soft)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', opacity: 0.8 }}>
                {stepIndex + 1} of {steps.length}
              </span>
              <button
                onClick={end}
                style={{ fontSize: 18, lineHeight: 1, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}
                aria-label="Close tour"
              >
                ×
              </button>
            </div>
            <h3 style={{ margin: 0, fontSize: 15, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)' }}>
              {step.title}
            </h3>
          </div>

          {/* Body */}
          <div style={{ padding: '14px 20px 0' }}>
            {step.futurePlans ? (
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.55 }}>
                  That's what's live today. Here's what's coming next for Caplet:
                </p>
                {FUTURE_PLANS.map((plan) => (
                  <div key={plan.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <div style={{ marginTop: 1, color: 'var(--accent)', flexShrink: 0 }}>{plan.icon}</div>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{plan.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{plan.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>{step.body}</p>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 20px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
            <button
              onClick={prev}
              disabled={isFirst}
              style={{
                fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-dim)',
                background: 'none', border: 'none', cursor: isFirst ? 'default' : 'pointer',
                opacity: isFirst ? 0 : 1, padding: 0, transition: 'color 0.15s',
              }}
            >
              ← Back
            </button>

            <StepDots total={steps.length} current={stepIndex} />

            <button
              onClick={isLast ? end : next}
              style={{
                fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 999,
                padding: '7px 18px', cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = 0.88)}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = 1)}
            >
              {isLast ? 'Finish tour' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(overlay, document.body);
}
