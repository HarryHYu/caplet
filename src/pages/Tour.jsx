/**
 * /demo — standalone demo page. Sim components copy the exact HTML/CSS from
 * real Caplet pages. Data is fake / hardcoded for demo purposes.
 * App.jsx renders /demo without the global Navbar / Footer.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

/* ─────────────────────────── Timing ────────────────────────────────────── */
const CURSOR_MOVE   = 600;  // ms virtual cursor travel time
const HOVER_PAUSE   = 260;  // ms pause before click
const CLICK_DOWN    = 110;  // ms press-down duration
const POST_CLICK    = 220;  // ms after click before caption shows
const COVER_DELAY   = 460;  // ms: fade-in cover → swap content → fade-out cover
const TIP_OX = 3, TIP_OY = 2;

/* ─────────────────────────── Scenes ────────────────────────────────────── */
// avatarLeft: horizontal anchor for the pill (50% = centred, <30% = left side, >70% = right side)
const SCENES = [
  {
    id: 'welcome',
    view: 'home', nav: null, cursor: null, clickAnim: false,
    avatarLeft: '50%',
    caption: {
      title: 'Meet Caplet',
      body: "The average student uses five different apps just to study. Teachers spend weekends on admin. We built one platform to replace all of it — lessons, classrooms, AI tools, and calculators, all connected from day one.",
    },
  },
  {
    id: 'the-content',
    view: 'courses', nav: 'curriculum', cursor: 'course-card-1', clickAnim: true,
    avatarLeft: '13%',
    caption: {
      title: 'Real curriculum, not links',
      body: "Structured courses split into modules and lessons — currently built around Australian financial literacy, but the same platform works for any subject, any curriculum, anywhere. Teachers can use ours or build their own.",
    },
  },
  {
    id: 'inside-lessons',
    view: 'lesson-mcq', nav: 'curriculum', cursor: 'lesson-option-c', clickAnim: true,
    avatarLeft: '11%',
    caption: {
      title: '15 interactive slide types',
      body: "Multiple choice, drag-to-match, flashcards, Desmos graphs, PhET simulations, annotated hotspots, timelines, charts — not a PDF with a quiz at the end. A real learning environment that loads instantly, no scrolling anywhere.",
    },
  },
  {
    id: 'classrooms',
    view: 'class-detail', nav: 'academy', cursor: null, clickAnim: false,
    avatarLeft: '84%',
    caption: {
      title: 'Classrooms, built in',
      body: "Teachers create a class, students join with a code. Progress, assignments, and announcements all in one stream — no Google Classroom, no Edmodo. Every lesson is assignable in one click. Everything is native.",
    },
  },
  {
    id: 'build-it',
    view: 'editor', nav: null, cursor: 'editor-lesson-row', clickAnim: true,
    avatarLeft: '11%',
    caption: {
      title: 'Build any lesson yourself',
      body: "The editor lets any teacher build the full hierarchy — courses, modules, lessons — and assemble slides in any order. Drag, reorder, choose from all 15 slide types. No coding, no exports, no format conversions.",
    },
  },
  {
    id: 'ai-generate',
    view: 'editor-ai', nav: null, cursor: 'ai-send-btn', clickAnim: true,
    avatarLeft: '85%',
    caption: {
      title: 'Or just describe what you want',
      body: "Paste your notes, upload a PDF, pick a model, hit send. The AI plans the lesson in plain text first — then structures it. Up to 40 slides, 30,000 characters of input. A full unit of work in under a minute.",
    },
  },
  // ── CapletMark micro-pitch ────────────────────────────────────────────────
  {
    id: 'mark-problem',
    view: 'mark-problem', nav: null, cursor: null, clickAnim: false,
    avatarLeft: '50%',
    caption: {
      title: "Now, the real pitch",
      body: "$500 million, every year, in NSW alone — spent on marking. Done by hand, done inconsistently, by teachers who should be teaching. Generic AI can't fix it without the right data. That's exactly the gap we're targeting.",
    },
  },
  {
    id: 'mark-solution',
    view: 'mark-solution', nav: null, cursor: null, clickAnim: false,
    avatarLeft: '13%',
    caption: {
      title: "CapletMark",
      body: "We're building the data layer that doesn't exist yet — real marking rubrics, band exemplars, and syllabus dot points, structured exactly the way AI needs to grade accurately. Not a guess. Grounded in the actual marking scheme.",
    },
  },
  {
    id: 'mark-flow',
    view: 'mark-flow', nav: null, cursor: null, clickAnim: false,
    avatarLeft: '84%',
    caption: {
      title: "How it works",
      body: "Student submits a response. CapletMark retrieves the matching rubric and exemplars. AI grades against real criteria. Student gets structured band, score, and feedback. Same data a human marker uses — but instant and consistent.",
    },
  },
  {
    id: 'mark-market',
    view: 'mark-market', nav: null, cursor: null, clickAnim: false,
    avatarLeft: '50%',
    caption: {
      title: "The market",
      body: "$500M in NSW, over $3 billion across Australia. We don't need to capture all of it — 1% is already a meaningful business. And we're already inside the schools through Caplet.",
    },
  },
  {
    id: 'open-platform',
    view: 'future', nav: null, cursor: null, clickAnim: false,
    avatarLeft: '50%',
    caption: {
      title: "And beyond",
      body: "Caplet is the platform students and teachers use today — live, Kahoot-style quiz sessions included. CapletMark is how we turn that into a scalable business. Adaptive practice, certifications, an open API — the infrastructure for how people learn next.",
    },
  },
];

/* ─────────────────────────── Helpers ───────────────────────────────────── */
function getSimPoint(simId) {
  if (!simId) return null;
  const el = document.querySelector(`[data-sim-id="${simId}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 };
}

/* ─────────────────────────── VirtualCursor ─────────────────────────────── */
function VirtualCursor({ x, y, visible, clicking }) {
  return (
    <div aria-hidden="true" style={{
      position: 'fixed', left: x - TIP_OX, top: y - TIP_OY,
      width: 24, height: 28, pointerEvents: 'none', zIndex: 9960,
      opacity: visible ? 1 : 0,
      transition: [`left ${CURSOR_MOVE}ms cubic-bezier(0.42,0,0.18,1.0)`, `top ${CURSOR_MOVE}ms cubic-bezier(0.42,0,0.18,1.0)`, 'opacity 0.3s ease'].join(', '),
      filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.55)) drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
      willChange: 'left, top',
    }}>
      <svg width="24" height="28" viewBox="0 0 24 28" fill="none"
        style={{ transform: clicking ? 'scale(0.76)' : 'scale(1)', transition: `transform ${clicking ? CLICK_DOWN : 140}ms ease`, transformOrigin: `${TIP_OX}px ${TIP_OY}px`, display: 'block' }}
      >
        <path d="M3.5 2.5 L3.5 21.5 L7.5 17.5 L11.5 25.5 L14 24.5 L10 16.5 L16.5 16.5 Z"
          fill="white" stroke="#0f0f0f" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/* ─────────────────────────── ClickRipple ───────────────────────────────── */
function ClickRipple({ x, y }) {
  return (
    <div aria-hidden="true" style={{ position: 'fixed', left: x, top: y, width: 0, height: 0, pointerEvents: 'none', zIndex: 9959 }}>
      <div style={{ position: 'absolute', transform: 'translate(-50%,-50%)', width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(40,100,255,0.65)', background: 'rgba(40,100,255,0.10)', animation: 'simRipple 0.55s cubic-bezier(0.35,0,0.25,1) forwards' }} />
      <div style={{ position: 'absolute', transform: 'translate(-50%,-50%)', width: 48, height: 48, borderRadius: '50%', border: '1.5px solid rgba(40,100,255,0.28)', animation: 'simRippleBig 0.7s 0.05s cubic-bezier(0.35,0,0.25,1) forwards' }} />
    </div>
  );
}

/* ─────────────────────────── AvatarGuide ───────────────────────────────── */
// avatarLeft: CSS left value — drives both pill anchor and bubble direction
// ≤32%  → pill on left,  bubble extends RIGHT  (left-pointing tail)
// ≥68%  → pill on right, bubble extends LEFT   (right-pointing tail)
// 33-67% → bubble floats ABOVE pill            (downward tail)
// avatarScale: drives the outer scale transform (1.0 normal, >1 during transition)
function AvatarGuide({ title, body, visible, talking, avatarLeft = '50%', avatarScale = 1.0 }) {
  const leftNum = parseFloat(avatarLeft) || 50;
  const onLeft  = leftNum <= 32;
  const onRight = leftNum >= 68;
  const BG = 'rgba(6,6,14,0.93)';

  /* ── bubble geometry ── */
  let bubblePos, bubbleTail;
  if (onLeft) {
    bubblePos = {
      position: 'fixed', bottom: 34,
      left: `calc(${avatarLeft} + 62px)`,
      transform: `translateY(${visible ? 0 : 12}px)`,
      opacity: visible ? 1 : 0,
      maxWidth: 480, width: 'calc(100vw - 210px)',
      transition: 'opacity 0.35s ease, transform 0.42s cubic-bezier(0.34,1.56,0.64,1)',
      zIndex: 9900, pointerEvents: 'none',
    };
    bubbleTail = {
      position: 'absolute', left: -13, bottom: 32,
      width: 0, height: 0,
      borderTop: '11px solid transparent',
      borderBottom: '11px solid transparent',
      borderRight: `13px solid ${BG}`,
    };
  } else if (onRight) {
    bubblePos = {
      position: 'fixed', bottom: 34,
      right: `calc(${100 - leftNum}% + 62px)`,
      transform: `translateY(${visible ? 0 : 12}px)`,
      opacity: visible ? 1 : 0,
      maxWidth: 480, width: 'calc(100vw - 210px)',
      transition: 'opacity 0.35s ease, transform 0.42s cubic-bezier(0.34,1.56,0.64,1)',
      zIndex: 9900, pointerEvents: 'none',
    };
    bubbleTail = {
      position: 'absolute', right: -13, bottom: 32,
      width: 0, height: 0,
      borderTop: '11px solid transparent',
      borderBottom: '11px solid transparent',
      borderLeft: `13px solid ${BG}`,
    };
  } else {
    bubblePos = {
      position: 'fixed', bottom: 178,
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
      opacity: visible ? 1 : 0,
      maxWidth: 540, width: 'calc(100vw - 160px)',
      transition: 'opacity 0.38s ease, transform 0.44s cubic-bezier(0.34,1.56,0.64,1)',
      zIndex: 9900, pointerEvents: 'none',
    };
    bubbleTail = {
      position: 'absolute', bottom: -14, left: '50%',
      transform: 'translateX(-50%)',
      width: 0, height: 0,
      borderLeft: '12px solid transparent',
      borderRight: '12px solid transparent',
      borderTop: `14px solid ${BG}`,
    };
  }

  return (
    <>
      {/* ── Speech bubble ── */}
      <div style={bubblePos}>
        <div style={{
          background: BG,
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.11)',
          borderRadius: 22, padding: '16px 24px 18px',
          boxShadow: '0 10px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
          position: 'relative',
        }}>
          <div style={bubbleTail}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', display: 'inline-block', flexShrink: 0, boxShadow: '0 0 8px rgba(99,102,241,1)' }}/>
            <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.82)' }}>
              {title}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 16, color: 'rgba(255,255,255,0.93)', lineHeight: 1.68, fontWeight: 400 }}>
            {body}
          </p>
        </div>
      </div>

      {/* ── Pill avatar ─────────────────────────────────────────────────────
          Outer div: position anchor + scale (CSS transition on both)
          Inner div: avBob animation (translateY only — no translateX here)
      ──────────────────────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        bottom: 14, left: avatarLeft,
        transform: `translateX(-50%) scale(${avatarScale})`,
        transformOrigin: 'bottom center',
        transition: 'left 0.82s cubic-bezier(0.34,1.56,0.64,1), transform 0.52s cubic-bezier(0.34,1.56,0.64,1)',
        zIndex: 9901, pointerEvents: 'none',
        filter: 'drop-shadow(0 12px 36px rgba(99,102,241,0.72)) drop-shadow(0 2px 10px rgba(0,0,0,0.45))',
      }}>
        <div style={{ animation: 'avBob 2.8s ease-in-out infinite' }}>
        {/*
          viewBox "-18 -4 116 158":
            x: -18 → 98  (room for arms sticking out 18px each side of 80px body)
            y:  -4 → 154  (body is 0→150, slight padding)
          Arms sit at x=-18..4 (left) and x=76..98 (right)
        */}
        <svg viewBox="-18 -4 116 158" width="97" height="132" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="pgTop" cx="32%" cy="28%" r="68%">
              <stop offset="0%" stopColor="#a5b4fc"/>
              <stop offset="100%" stopColor="#6366f1"/>
            </radialGradient>
            <radialGradient id="pgBot" cx="32%" cy="20%" r="70%">
              <stop offset="0%" stopColor="#5b5cf9"/>
              <stop offset="100%" stopColor="#3730a3"/>
            </radialGradient>
            <clipPath id="pillClip">
              <rect x="0" y="0" width="80" height="150" rx="40"/>
            </clipPath>
          </defs>

          {/* Left arm */}
          <rect x="-18" y="60" width="24" height="14" rx="7" fill="#5b5ce8"/>
          {/* Right arm */}
          <rect x="74" y="60" width="24" height="14" rx="7" fill="#4f46e5"/>

          {/* Pill body — top half (lighter) */}
          <rect x="0" y="0" width="80" height="150" rx="40" fill="url(#pgTop)"/>
          {/* Pill body — bottom half overlay (darker), clipped to pill */}
          <rect x="0" y="75" width="80" height="75" fill="url(#pgBot)" clipPath="url(#pillClip)"/>

          {/* Score / groove line */}
          <rect x="0" y="73" width="80" height="4" fill="white" opacity="0.18" clipPath="url(#pillClip)"/>

          {/* Shine */}
          <ellipse cx="26" cy="28" rx="11" ry="21" fill="white" opacity="0.20" transform="rotate(-10 26 28)" clipPath="url(#pillClip)"/>

          {/* Left eye */}
          <ellipse cx="26" cy="53" rx="7.5" ry="8" fill="white"
            style={{ transformOrigin: '26px 53px', animation: 'avBlink 4.3s 0.2s ease-in-out infinite' }}/>
          <circle cx="27.8" cy="53" r="3.8" fill="#1e1b4b"/>
          <circle cx="29.5" cy="51.2" r="1.4" fill="white"/>

          {/* Right eye */}
          <ellipse cx="54" cy="53" rx="7.5" ry="8" fill="white"
            style={{ transformOrigin: '54px 53px', animation: 'avBlink 4.3s 2.1s ease-in-out infinite' }}/>
          <circle cx="55.8" cy="53" r="3.8" fill="#1e1b4b"/>
          <circle cx="57.5" cy="51.2" r="1.4" fill="white"/>

          {/* Cheeks */}
          <ellipse cx="10" cy="65" rx="8.5" ry="5" fill="#c7d2fe" opacity="0.55" clipPath="url(#pillClip)"/>
          <ellipse cx="70" cy="65" rx="8.5" ry="5" fill="#c7d2fe" opacity="0.55" clipPath="url(#pillClip)"/>

          {/* Smile (idle) */}
          <path d="M22 82 Q40 96 58 82" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round"
            style={{ opacity: talking ? 0 : 1, transition: 'opacity 0.1s' }}/>

          {/* Talking mouth */}
          <ellipse cx="40" cy="86" rx="12" ry="6.5" fill="#312e81"
            style={{
              opacity: talking ? 1 : 0, transition: 'opacity 0.1s',
              transformOrigin: '40px 86px',
              animation: talking ? 'avTalk 0.2s ease-in-out infinite alternate' : 'none',
            }}/>
          {/* Teeth strip */}
          <rect x="32" y="83.5" width="16" height="3.5" rx="1.8" fill="white"
            style={{ opacity: talking ? 0.72 : 0, transition: 'opacity 0.1s' }}/>
        </svg>
        </div>{/* /avBob inner */}
      </div>{/* /outer scale+position */}
    </>
  );
}

/* ─────────────────────────── ProgressBar ───────────────────────────────── */
function ProgressBar({ current, total }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 9980, background: 'var(--line-soft)' }}>
      <div style={{ height: '100%', background: 'var(--accent)', width: `${((current + 1) / total) * 100}%`, transition: 'width 0.55s cubic-bezier(0.4,0,0.2,1)' }} />
    </div>
  );
}

/* ─────────────────────────── SimNavbar ─────────────────────────────────── */
function SimNavbar({ active }) {
  const { isDark, toggleTheme } = useTheme();
  const navItems = [
    { label: 'Curriculum', id: 'curriculum' },
    { label: 'Classes',    id: 'academy' },
    { label: 'Financial Tools', id: 'instruments' },
  ];
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface-body/95 backdrop-blur-2xl shadow-[0_1px_0_var(--line-soft),0_4px_24px_rgba(0,0,0,0.06)] text-text-primary">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
        <div className="h-14 md:h-[60px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden ring-1 ring-line-soft">
              <img src="/logo.png" alt="Caplet" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg md:text-xl font-bricolage font-extrabold tracking-[-0.02em] text-text-primary">Caplet.</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ label, id }) => (
              <span key={id} data-sim-id={`nav-${id}`}
                className={`relative px-3.5 py-2 text-sm font-medium rounded-lg select-none cursor-default transition-all duration-200 ${active === id ? 'text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-surface-soft'}`}
              >
                {label}
                {active === id && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-accent rounded-full" />}
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            <button type="button" onClick={toggleTheme} className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-soft transition-all">
              {isDark ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <div className="hidden md:block w-px h-4 bg-line-soft mx-0.5" />
            <div className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-line-soft cursor-default">
              <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold font-mono leading-none shrink-0">HY</div>
              <span className="text-sm font-medium text-text-primary leading-none">Harry</span>
              <svg className="w-3 h-3 text-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────── CourseCover (exact copy from Courses.jsx) ─── */
function CourseCover({ title }) {
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const hue1 = hash % 360;
  const hue2 = (hue1 + 40) % 360;
  const hue3 = (hue1 + 180) % 360;
  return (
    <div className="relative w-full h-full overflow-hidden group-hover:scale-105 transition-transform duration-700">
      <div className="absolute inset-0 opacity-80" style={{ background: `linear-gradient(${hue1}deg, hsl(${hue1},70%,85%) 0%, hsl(${hue2},70%,90%) 50%, hsl(${hue3},70%,95%) 100%)` }} />
      <div className="absolute top-[-20%] left-[-20%] w-[100%] h-[100%] rounded-full blur-[80px] mix-blend-multiply opacity-60" style={{ background: `hsl(${hue2},80%,75%)` }} />
      <div className="absolute bottom-[-30%] right-[-10%] w-[120%] h-[120%] rounded-full blur-[100px] mix-blend-screen opacity-40" style={{ background: `hsl(${hue3},60%,85%)` }} />
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <span className="text-[12rem] font-serif italic select-none">{title.charAt(0)}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────── SimHome ───────────────────────────────────── */
/* Exact copy of real Home.jsx hero section */
function SimHome() {
  return (
    <div className="absolute inset-0 bg-surface-body text-text-primary relative selection:bg-accent selection:text-text-contrast overflow-hidden">
      <section className="relative h-full flex items-center justify-center overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl px-5 mx-auto">
          <p className="font-hand text-2xl md:text-[1.65rem] text-blue mb-5 -rotate-2">free, open, and a little playful</p>
          <h1 className="font-bricolage font-extrabold text-text-primary leading-[0.96] tracking-[-0.03em] text-[clamp(3rem,8.5vw,6.25rem)]">
            Build, learn,<br />
            and ship anything.
          </h1>
          <p className="body-text mt-8 max-w-xl mx-auto">
            Caplet is a free, open platform for building interactive courses and learning from them.
            Lessons, live code, graphing, quizzes. No subscriptions. No lock-in.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <button className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-[color:var(--mark-blue)] text-white text-base font-bold shadow-[0_12px_30px_-10px_rgba(19,81,170,0.5)]">
              Start building
              <span aria-hidden>&rarr;</span>
            </button>
            <button className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl block-blue text-text-primary text-base font-bold">
              See how it works
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─────────────────────────── SimCourses ────────────────────────────────── */
/* Exact copy of real Courses.jsx */
const SIM_COURSES = [
  { id: 1, title: 'Money Basics', level: 'Beginner', duration: 45, lessons: 16,
    desc: 'Understand how money actually works — income, spending, saving, and the basics every Australian student needs before they enter the workforce.' },
  { id: 2, title: 'Tax & Super', level: 'Intermediate', duration: 38, lessons: 12,
    desc: 'Break down the Australian tax system, PAYG withholding, and why superannuation matters more than most 17-year-olds realise.' },
  { id: 3, title: 'Investing Basics', level: 'Advanced', duration: 52, lessons: 20,
    desc: 'From compound interest to ETFs and property — how to build real wealth over time using evidence-based, long-term strategies.' },
];

function SimCourses() {
  return (
    <div className="absolute inset-0 bg-surface-body overflow-hidden selection:bg-accent selection:text-white">
      <div className="container-custom" style={{ paddingTop: '5rem' }}>
        {/* Header — exact copy from Courses.jsx */}
        <header className="mb-16">
          <p className="font-hand text-2xl text-accent mb-3 -rotate-2">Pick something to learn</p>
          <h1 className="font-display font-extrabold tracking-tight text-6xl md:text-8xl mb-8">Curriculum</h1>
          <p className="text-xl md:text-2xl text-text-muted max-w-xl leading-relaxed">
            Browse the full course library and start wherever you like.
          </p>
        </header>

        {/* Filters — exact copy */}
        <div className="mb-10 flex flex-col sm:flex-row gap-8">
          <div className="sm:w-48">
            <label className="text-sm font-semibold text-text-dim mb-4 block">Level</label>
            <div className="w-full bg-surface-raised border border-line-soft px-6 py-4 rounded-xl text-sm font-medium text-text-dim">All Levels ▾</div>
          </div>
          <div className="flex-1">
            <label className="text-sm font-semibold text-text-dim mb-4 block">Search</label>
            <div className="w-full bg-surface-raised border border-line-soft px-6 py-4 rounded-xl text-sm font-medium text-text-dim/30">Search by title...</div>
          </div>
        </div>

        {/* Course grid — exact copy */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-line-soft border border-line-soft">
          {SIM_COURSES.map((course) => (
            <div
              key={course.id}
              data-sim-id={course.id === 1 ? 'course-card-1' : undefined}
              className="bg-surface-body p-12 group cursor-pointer transition-all duration-700 hover:bg-surface-raised flex flex-col"
            >
              <div className="flex justify-between items-start mb-12">
                <span className="text-sm font-medium text-accent border-b border-accent pb-1">{course.level}</span>
              </div>
              <div className="aspect-[16/9] w-full mb-12 overflow-hidden bg-surface-soft border border-line-soft rounded-[2rem]">
                <CourseCover title={course.title} />
              </div>
              <h3 className="text-2xl font-bold mb-8 group-hover:text-accent transition-colors duration-500">{course.title}</h3>
              <p className="text-sm font-medium text-text-muted leading-relaxed mb-12 line-clamp-3">{course.desc}</p>
              <div className="mt-auto">
                <div className="flex items-center gap-4 text-sm font-medium text-text-dim mb-8">
                  <span>{course.duration}m</span>
                  <span className="w-1 h-1 bg-text-dim" />
                  <span>{course.lessons} lessons</span>
                </div>
                <div className="flex items-center justify-between pt-8 border-t border-line-soft">
                  <span className="text-sm font-medium group-hover:text-accent transition-colors duration-500">Enter Lesson &rarr;</span>
                  <svg className="w-4 h-4 text-text-dim group-hover:text-accent group-hover:translate-x-2 transition-all duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── SimCourseDetail ───────────────────────────── */
/* Exact copy of real CourseDetail.jsx — shows modules list with "View Module →" */
function SimCourseDetail() {
  const simModules = [
    { id: 1, title: 'Budgeting Fundamentals', lessonCount: 3 },
    { id: 2, title: 'Income & Tax',           lessonCount: 3 },
    { id: 3, title: 'Saving Strategies',      lessonCount: 2 },
  ];
  const outcomes = [
    'How income and tax work in Australia',
    'Building a realistic personal budget',
    'Superannuation basics and why it matters now',
    'Strategies for emergency funds and saving',
  ];
  return (
    <div className="absolute inset-0 bg-surface-body overflow-y-auto selection:bg-accent selection:text-white">
      <div className="container-custom" style={{ paddingTop: '3.5rem', paddingBottom: '3rem' }}>
        {/* Back link */}
        <button className="mb-8 inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent transition-colors">
          ← All Courses
        </button>

        {/* Course header */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">Money Basics</h1>
              <p className="text-lg text-text-muted leading-relaxed max-w-2xl">
                Understand how money actually works — income, spending, saving, and the basics every Australian student needs before they enter the workforce.
              </p>
            </div>
          </div>
        </div>

        {/* Info card + outcomes */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
          <div className="lg:col-span-8">
            <div className="bg-surface-raised border border-line-soft rounded-xl p-8">
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div>
                  <p className="text-xs font-medium text-text-muted mb-1">Duration</p>
                  <p className="text-lg font-semibold">45 minutes</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-muted mb-1">Lessons</p>
                  <p className="text-lg font-semibold">8 lessons</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-muted mb-1">Level</p>
                  <p className="text-lg font-semibold">Beginner</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mb-8">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-text-muted">Your Progress</span>
                  <span className="font-medium text-accent">25%</span>
                </div>
                <div className="h-2 w-full bg-surface-soft rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all duration-500 ease-out" style={{ width: '25%' }} />
                </div>
              </div>
              <button className="btn-primary py-3 px-10">Continue Learning</button>
            </div>
          </div>
          <aside className="lg:col-span-4 bg-accent/5 border border-accent/20 rounded-xl p-8">
            <h3 className="text-sm font-semibold mb-4">What you&apos;ll learn</h3>
            <ul className="space-y-3">
              {outcomes.map((o) => (
                <li key={o} className="flex items-start gap-2 text-sm text-text-muted">
                  <span className="text-accent mt-0.5">&#10003;</span>
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {/* Modules list — exact copy from CourseDetail.jsx */}
        <div>
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl font-bold">Modules</h2>
            <p className="text-sm text-text-muted">{simModules.length} modules</p>
          </div>
          <div className="space-y-2">
            {simModules.map((mod, index) => (
              <div
                key={mod.id}
                data-sim-id={index === 0 ? 'module-card-1' : undefined}
                className="group bg-surface-raised border border-line-soft rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between transition-colors duration-200 hover:border-accent/50 cursor-default"
              >
                <div className="flex items-center gap-5 min-w-0 mb-4 md:mb-0">
                  <span className="text-2xl font-bold text-text-dim w-8 text-right shrink-0">{index + 1}</span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-text-primary mb-1 truncate group-hover:text-accent transition-colors">{mod.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-text-muted">
                      <span>{mod.lessonCount} lessons</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-text-muted group-hover:text-accent transition-colors">View Module &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── SimModuleDetail ───────────────────────────── */
/* Exact copy of real ModuleDetail.jsx — shows lessons list */
function SimModuleDetail() {
  const simLessons = [
    { id: 1, title: 'Introduction to Budgeting',  completed: true },
    { id: 2, title: 'The 50/30/20 Rule',          completed: true },
    { id: 3, title: 'Tracking Your Spending',      completed: false, active: true },
  ];
  const completedCount = simLessons.filter((l) => l.completed).length;
  const progressWidth  = (completedCount / simLessons.length) * 100;
  return (
    <div className="absolute inset-0 bg-surface-body overflow-y-auto selection:bg-accent selection:text-white">
      <div className="container-custom" style={{ paddingTop: '3.5rem', paddingBottom: '3rem' }}>
        {/* Back link */}
        <button className="mb-8 inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent transition-colors">
          ← Course Overview
        </button>

        {/* Module header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-12">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Budgeting Fundamentals</h1>
            <p className="text-lg text-text-muted leading-relaxed max-w-2xl">
              A practical guide to building and sticking to a budget that actually works for Australian students.
            </p>
          </div>
          {/* Progress summary */}
          <div className="flex flex-col gap-3 min-w-[260px] p-6 bg-surface-raised border border-line-soft rounded-xl">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">Progress</span>
              <span className="font-medium text-accent">{completedCount} of {simLessons.length} completed</span>
            </div>
            <div className="h-2 w-full bg-surface-soft rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-500 ease-out" style={{ width: `${progressWidth}%` }} />
            </div>
          </div>
        </div>

        {/* Lessons list — exact copy from ModuleDetail.jsx */}
        <div>
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-2xl font-bold">Lessons</h2>
            <p className="text-sm text-text-muted">{simLessons.length} lessons</p>
          </div>
          <div className="space-y-2">
            {simLessons.map((lesson, idx) => (
              <div
                key={lesson.id}
                data-sim-id={lesson.active ? 'lesson-link' : undefined}
                className="group bg-surface-raised border border-line-soft rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between transition-colors duration-200 hover:border-accent/50 cursor-default"
              >
                <div className="flex items-center gap-5 min-w-0 mb-4 md:mb-0">
                  <span className="text-2xl font-bold text-text-dim w-8 text-right shrink-0">{idx + 1}</span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-text-primary mb-1 truncate group-hover:text-accent transition-colors">{lesson.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-text-muted">
                      {lesson.completed && (
                        <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-0.5 rounded-full">Completed</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-text-muted group-hover:text-accent transition-colors">
                    {lesson.completed ? 'Review' : 'Start Lesson'} &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── SimLesson (shell) ─────────────────────────── */
/* Exact copy of real LessonPlayer layout */
function SimLessonShell({ slideIdx = 0, totalSlides = 6, showCalc = false, slideLabel = 'Text', children }) {
  const BARS = Array.from({ length: totalSlides });
  return (
    <div className="absolute inset-0 flex flex-col bg-surface-body text-text-primary overflow-hidden">
      {/* Header — exact copy of real LessonPlayer header */}
      <header className="shrink-0 bg-surface-body/95 backdrop-blur-md border-b border-line-soft">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
          <div className="h-14 md:h-16 flex items-center justify-between gap-4">
            {/* Left: back + breadcrumb */}
            <div className="flex items-center gap-3 md:gap-5 min-w-0">
              <div className="shrink-0 w-9 h-9 rounded-full border border-line-soft text-text-muted flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </div>
              <div className="hidden md:block min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium text-text-dim mb-0.5">
                  <span className="truncate">Money Basics</span>
                  <span className="text-text-dim/50">/</span>
                  <span className="truncate">Budgeting</span>
                </div>
                <p className="text-sm font-display font-bold text-text-primary truncate max-w-md">Tracking Your Spending</p>
              </div>
            </div>
            {/* Right: progress indicators + buttons */}
            <div className="flex items-center gap-2 md:gap-3 shrink-0">
              <div className="hidden md:flex items-center gap-2 text-xs font-medium text-text-dim">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                Lesson {slideIdx + 1} <span className="opacity-50">/</span> 16
              </div>
              <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-text-dim">
                <span className="opacity-50">·</span>
                Course 47%
              </div>
              {/* Calculator button */}
              <button
                data-sim-id="calc-btn"
                className={`inline-flex items-center gap-2 h-9 px-3 md:px-4 rounded-full border transition-colors ${showCalc ? 'border-accent bg-accent/10 text-accent' : 'border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 7h6M9 11h2m4 0h-2m-2 4h2M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                </svg>
                <span className="hidden md:inline text-xs font-medium">Calc</span>
              </button>
              {/* Outline button */}
              <button className="inline-flex items-center gap-2 h-9 px-3 md:px-4 rounded-full border border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" />
                </svg>
                <span className="hidden md:inline text-xs font-medium">Outline</span>
              </button>
            </div>
          </div>
        </div>
        {/* Slide ticker — thin bars, exact real structure */}
        <div className="pb-2.5 max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
          <div className="flex items-center gap-1.5 w-full">
            {BARS.map((_, i) => (
              <button key={i} type="button" className="group relative flex-1 py-2.5">
                <span className={`block rounded-full transition-all duration-300 ${
                  i < slideIdx ? 'bg-accent h-[3px]' : i === slideIdx ? 'bg-accent h-[5px]' : 'bg-line-soft h-[3px]'
                } group-hover:h-[4px]`} />
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main canvas */}
      <main className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 max-w-[1400px] w-full mx-auto px-4 md:px-8 lg:px-12 py-5 md:py-7 flex flex-col gap-4 md:gap-5">
          {/* Slide kicker — exact copy */}
          <div className="shrink-0 flex items-center justify-between gap-3 text-xs font-medium text-text-dim">
            <div className="flex items-center gap-3">
              <span className="font-mono text-accent">
                {String(slideIdx + 1).padStart(2, '0')}
                <span className="opacity-50"> / </span>
                {String(totalSlides).padStart(2, '0')}
              </span>
              <span className="w-6 h-px bg-line-soft" />
              <span>{slideLabel}</span>
              <span className="w-6 h-px bg-line-soft hidden sm:block" />
              <span className="text-text-dim/60 hidden sm:inline">
                {Math.round(((slideIdx + 1) / totalSlides) * 100)}% through
              </span>
            </div>
            <button className="shrink-0 flex items-center gap-1.5 h-7 px-3 rounded-full border border-line-soft text-text-muted hover:border-text-dim hover:text-text-primary transition-colors text-xs font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span className="hidden sm:inline">Save</span>
            </button>
          </div>

          {/* Slide canvas — exact copy including decorative notch */}
          <div className="flex-1 min-h-0 relative bg-surface-raised border border-line-soft rounded-[28px] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.12)] dark:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent pointer-events-none z-10" />
            <div className="absolute inset-x-0 top-0 flex justify-center pointer-events-none z-10">
              <div className="w-32 h-px bg-accent" />
            </div>
            {children}
            {/* Floating calculator */}
            {showCalc && (
              <div className="absolute top-6 right-6 w-64 h-56 bg-surface-raised border border-line-soft rounded-2xl shadow-2xl overflow-hidden" style={{ zIndex: 20 }}>
                <div className="h-8 bg-surface-soft border-b border-line-soft flex items-center px-3 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <span className="text-xs text-text-dim ml-1">Scientific</span>
                </div>
                <div className="p-2.5 grid grid-cols-4 gap-1">
                  {['sin','cos','tan','(','7','8','9','÷','4','5','6','×','1','2','3','−','0','.','=','+'].map((k, i) => (
                    <div key={i} className="h-7 rounded-md bg-surface-soft flex items-center justify-center text-xs text-text-muted">{k}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer controls — exact copy */}
          <div className="shrink-0 flex items-center justify-between gap-4">
            <button className="group inline-flex items-center gap-3 h-11 md:h-12 px-4 md:px-5 rounded-full border border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim disabled:opacity-30 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-xs font-medium hidden sm:inline">Previous</span>
            </button>
            <div className="hidden md:flex items-center gap-2 text-xs font-medium text-text-dim">
              <kbd className="px-2 py-1 rounded border border-line-soft text-text-dim/80 font-mono text-[10px]">←</kbd>
              <kbd className="px-2 py-1 rounded border border-line-soft text-text-dim/80 font-mono text-[10px]">→</kbd>
              <span className="ml-1">to navigate</span>
            </div>
            <button data-sim-id="lesson-next-btn" className="group inline-flex items-center gap-3 h-11 md:h-12 px-4 md:px-5 rounded-full border border-line-soft text-text-muted hover:text-text-primary hover:border-text-dim transition-all">
              <span className="text-xs font-medium hidden sm:inline">Next</span>
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function SimLessonIntro() {
  return (
    <SimLessonShell slideIdx={0} slideLabel="Text">
      <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center gap-6 max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-display font-bold text-text-primary leading-snug">Tracking Your Spending</h2>
        <p className="text-lg text-text-muted leading-relaxed max-w-xl">
          Before you manage money well, you need to know where it goes. In Australia, most households underestimate their discretionary spending by 30–40%.
        </p>
        <p className="text-base text-text-muted leading-relaxed max-w-xl">
          This lesson covers expense categories, tracking methods, and how to identify patterns in your spending over time.
        </p>
      </div>
    </SimLessonShell>
  );
}

function SimLessonMCQ() {
  const opts = [
    { id: 'a', text: 'Tax advantages on contributions' },
    { id: 'b', text: 'Compulsory employer contributions (11%)' },
    { id: 'c', text: 'Guaranteed returns on investment', wrong: true },
    { id: 'd', text: 'Long-term retirement savings' },
  ];
  return (
    <SimLessonShell slideIdx={2} slideLabel="Multiple Choice">
      <div className="absolute inset-0 flex items-center justify-center px-8">
        <div className="w-full max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-3">Multiple Choice</p>
          <h2 className="text-2xl font-display font-bold text-text-primary mb-7 leading-snug">
            Which of the following is NOT a feature of Australia's superannuation system?
          </h2>
          <div className="space-y-3">
            {opts.map((o) => (
              <div key={o.id} data-sim-id={`lesson-option-${o.id}`}
                className={`flex items-center gap-4 p-4 rounded-xl border cursor-default transition-colors ${o.wrong ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-line-soft hover:bg-surface-soft'}`}
              >
                <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${o.wrong ? 'border-red-400 text-red-500' : 'border-line-soft text-text-dim'}`}>
                  {o.id.toUpperCase()}
                </span>
                <span className="text-sm font-medium text-text-primary">{o.text}</span>
                {o.wrong && <span className="ml-auto text-xs text-red-500 font-medium">Incorrect ✕</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </SimLessonShell>
  );
}

function SimLessonCalc() {
  return (
    <SimLessonShell slideIdx={2} showCalc slideLabel="Multiple Choice">
      <div className="absolute inset-0 flex items-center justify-center px-8">
        <div className="w-full max-w-2xl opacity-25">
          <h2 className="text-2xl font-display font-bold text-text-primary leading-snug">
            Which of the following is NOT a feature of Australia's superannuation system?
          </h2>
        </div>
      </div>
    </SimLessonShell>
  );
}

/* ─────────────────────────── SimClasses ────────────────────────────────── */
/* Exact copy of real Classes.jsx */
function SimClasses() {
  const simTeachingClasses = [
    { name: 'Year 11 Commerce A', code: 'CAP-4821' },
    { name: 'Year 12 Economics',  code: 'CAP-7193' },
  ];
  return (
    <div className="absolute inset-0 bg-surface-body overflow-hidden selection:bg-accent selection:text-white">
      <div className="container-custom" style={{ paddingTop: '3rem' }}>
        {/* Header — exact copy from Classes.jsx */}
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div>
            <span className="font-hand text-accent text-2xl">Learn together</span>
            <h1 className="font-display font-extrabold tracking-tight text-6xl md:text-8xl mb-12 mt-2">The Academy.</h1>
            <p className="text-2xl text-text-muted max-w-xl leading-relaxed">
              Collaborative learning environments built for peer progression and academic leadership.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button className="btn-secondary px-6 py-2.5 text-sm">Establish Class</button>
            <button className="btn-primary px-6 py-2.5 text-sm gap-2 flex items-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Join Class
            </button>
          </div>
        </header>

        {/* Classes You Teach — exact copy from Classes.jsx */}
        <section className="mb-32">
          <h2 className="font-display font-bold tracking-tight text-2xl mb-12">
            Classes You Teach
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {simTeachingClasses.map((cls) => (
              <div
                key={cls.name}
                data-sim-id={cls.code === 'CAP-4821' ? 'class-link' : undefined}
                className="block-blue rounded-3xl p-10 group flex flex-col justify-between shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] hover:-translate-y-0.5 transition-transform cursor-default"
              >
                <div>
                  <div className="flex justify-between items-start mb-12 gap-4">
                    <h3 className="font-display font-bold tracking-tight text-3xl">{cls.name}</h3>
                    <span className="text-xs font-bold px-3 py-1 rounded-xl bg-accent text-white shrink-0">Owner</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-8">
                  <span className="text-sm font-medium text-text-dim">Class code</span>
                  <span className="text-xs font-bold font-mono tracking-widest text-accent">{cls.code}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Classes You're In */}
        <section>
          <h2 className="font-display font-bold tracking-tight text-2xl mb-12">
            Classes You're In
          </h2>
          <div className="p-16 rounded-3xl text-center block-cream shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <p className="text-sm font-medium text-text-dim">Join your first class to get started.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ─────────────────────────── SimClassDetail ────────────────────────────── */
/* Exact copy of real ClassDetail.jsx layout with fake stream data */
function SimClassDetail() {
  const fakeAnnouncements = [
    {
      id: 1,
      author: 'Harry Y',
      initials: 'HY',
      time: '2 hours ago',
      content: "Hey everyone — don't forget that this week's lesson on tax brackets is now live. Work through the MCQ slides and use the built-in calculator for the PAYG practice section. Any questions, drop them here 👇",
      comments: [
        { id: 1, author: 'Emily T', initials: 'ET', time: '1h ago', text: "Got to slide 4, the Desmos graph is really helpful for visualising the brackets!" },
        { id: 2, author: 'James K', initials: 'JK', time: '45m ago', text: "Does the calculator save between sessions? I had some working on it last week." },
      ],
    },
    {
      id: 2,
      author: 'Harry Y',
      initials: 'HY',
      time: 'Yesterday',
      content: "Assignment due Friday: complete the Budgeting Fundamentals module and submit your 50/30/20 budget for your own hypothetical income. Template is in Classwork.",
      comments: [
        { id: 3, author: 'Priya M', initials: 'PM', time: '20h ago', text: "Can we use a different income figure than the example in the lesson?" },
      ],
    },
  ];

  return (
    <div className="absolute inset-0 bg-surface-body overflow-hidden selection:bg-accent selection:text-white">
      <div className="container-custom space-y-8" style={{ paddingTop: '2rem', paddingBottom: '2rem' }}>
        {/* Class header — exact copy from ClassDetail.jsx */}
        <div className="bg-surface-raised rounded-3xl shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] p-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            <div className="flex-1">
              <button className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-text-dim hover:text-accent transition-colors">
                ← Back to Classes
              </button>
              <p className="font-hand text-accent text-lg -rotate-2 inline-block mb-2">your classroom</p>
              <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight text-text-primary mb-4">Year 11 Commerce A</h1>
              <p className="text-sm font-medium text-text-muted leading-relaxed max-w-2xl">
                Financial literacy and economic principles for Year 11 Commerce students.
              </p>
              <div className="mt-8 inline-flex items-center gap-4 px-5 py-3 bg-surface-soft rounded-xl">
                <span className="text-xs font-semibold text-text-dim">Class Code:</span>
                <span className="font-mono font-bold text-text-primary text-sm">CAP-4821</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-6">
              <div className="flex items-center gap-4 px-6 py-4 bg-surface-soft rounded-2xl min-w-[240px]">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">HY</div>
                <div>
                  <p className="text-xs font-medium text-text-dim mb-1">Signed in as</p>
                  <p className="text-sm font-bold text-text-primary">Harry Y</p>
                  <span className="text-xs text-accent font-medium mt-1 block">Teacher</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab bar — exact copy */}
        <nav className="inline-flex gap-1 bg-surface-soft rounded-2xl p-1.5">
          {['Stream', 'Classwork', 'People'].map((tab, i) => (
            <button key={tab} type="button"
              className={`px-8 py-3 text-sm font-bold rounded-xl transition-all duration-200 ${i === 0
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-dim hover:text-text-primary hover:bg-surface-raised'}`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Stream — exact copy structure with fake announcements */}
        <div className="space-y-5">
          {/* Teacher composer */}
          <div className="bg-surface-raised rounded-3xl p-8 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] mb-4">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold">HY</div>
              <div className="flex-1">
                <div className="w-full px-5 py-4 rounded-2xl bg-surface-soft text-text-dim text-sm font-medium">
                  Post an announcement...
                </div>
                <div className="flex justify-end mt-6">
                  <button className="px-10 py-3 rounded-2xl bg-accent text-white text-sm font-bold opacity-40">Post Announcement</button>
                </div>
              </div>
            </div>
          </div>

          {/* Fake announcements */}
          {fakeAnnouncements.map((a) => (
            <div key={a.id} className="bg-surface-raised rounded-3xl p-8 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] group">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white text-xs font-bold shadow-sm">{a.initials}</div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">{a.author}</p>
                    <span className="text-xs font-medium text-text-dim mt-1 block">Posted {a.time}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-text-primary font-medium whitespace-pre-wrap leading-relaxed mb-6">{a.content}</p>

              {/* Comments */}
              <div className="border-t border-line-soft pt-4 space-y-3">
                {a.comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-surface-soft flex items-center justify-center text-[9px] font-bold text-text-dim shrink-0">{c.initials}</div>
                    <div className="flex-1 min-w-0 bg-surface-soft rounded-2xl px-4 py-3">
                      <p className="text-xs font-bold text-text-primary mb-1">{c.author} <span className="font-normal text-text-dim">{c.time}</span></p>
                      <p className="text-sm text-text-primary">{c.text}</p>
                    </div>
                  </div>
                ))}
                {/* Comment input */}
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-[9px] font-bold text-white shrink-0">HY</div>
                  <div className="flex-1 px-4 py-2 rounded-2xl bg-surface-soft text-xs text-text-dim/40">Add a comment...</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── SimEditor ─────────────────────────────────── */
/* Exact copy of real Editor workspace overview */
function SimEditor() {
  const simCourses = [
    { name: 'Money Basics', modules: 3, lessons: 16, published: true,
      mods: [
        { name: 'Budgeting',    lessons: ['Introduction', 'Core concepts'] },
        { name: 'Saving',       lessons: ['Introduction', 'Core concepts'] },
        { name: 'Income & Tax', lessons: ['What is income?', 'Tax brackets', 'PAYG System'] },
      ],
    },
    { name: 'Tax & Super', modules: 2, lessons: 12, published: false, mods: [] },
  ];
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-surface-body">
      {/* Top bar — exact copy from Editor.jsx workspace mode */}
      <header className="shrink-0 border-b border-line-soft bg-surface-body/95 backdrop-blur-md">
        <div className="px-4 md:px-6 h-12 flex items-center gap-2 min-w-0">
          <p className="font-mono text-[10px] font-medium text-accent/60 uppercase tracking-[0.18em]">Workspace</p>
          <div className="ml-auto flex items-center gap-2">
            <button className="h-7 px-3 rounded-md border border-line-soft text-[12px] font-medium text-text-dim hover:text-text-primary transition-colors">Refresh</button>
            <button className="h-7 px-3 rounded-md border border-line-soft text-[12px] font-medium text-text-dim hover:text-text-primary transition-colors">Leave</button>
          </div>
        </div>
      </header>

      {/* WorkspaceOverview — exact copy from Editor.jsx */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-surface-body">
        <div className="relative border-b border-line-soft overflow-hidden">
          <div className="absolute top-[-20%] left-[8%] w-[26vw] h-[26vw] max-w-[340px] max-h-[340px] rounded-full bg-[color:var(--block-blue)] blur-[110px] pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface-body to-transparent pointer-events-none" />
          <div className="relative max-w-3xl mx-auto px-6 md:px-10 pt-14 pb-12">
            <p className="font-hand text-xl text-blue -rotate-2 mb-3 inline-block">lesson workspace</p>
            <div className="flex items-end justify-between gap-8">
              <div className="min-w-0">
                <h1 className="text-[2.75rem] font-display font-extrabold text-text-primary tracking-tight leading-none mb-3">Your courses</h1>
                <p className="text-[15px] text-text-dim leading-relaxed">Build, organise, and publish lessons for your students.</p>
              </div>
              <button className="btn-primary shrink-0 px-4 py-2 text-sm font-medium">+ Course</button>
            </div>
            <div className="flex items-center gap-8 mt-8 pt-6 border-t border-line-soft/50">
              {[{ label: 'courses', value: 2 }, { label: 'modules', value: 5 }, { label: 'lessons', value: 28 }].map((s) => (
                <div key={s.label} className="flex items-baseline gap-1.5">
                  <span className="text-xl font-display font-bold text-text-primary tabular-nums">{s.value}</span>
                  <span className="text-[11px] text-text-dim tracking-wide">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Course cards — exact copy from WorkspaceOverview */}
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 space-y-5">
          {simCourses.map((c) => (
            <div key={c.name} className="rounded-xl border border-line-soft bg-surface-raised overflow-hidden hover:border-text-dim/30 transition-colors duration-200">
              <div className="flex items-start gap-3 px-6 py-4 border-b border-line-soft">
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-display font-bold text-text-primary leading-tight">{c.name}</p>
                  <p className="font-mono text-xs text-text-dim mt-1.5">{c.modules} modules · {c.lessons} lessons</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${c.published ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600' : 'border-line-soft text-text-dim'}`}>
                    {c.published ? 'Live' : 'Draft'}
                  </span>
                  <span className="text-sm font-medium text-accent cursor-default">+ Module</span>
                </div>
              </div>
              {c.mods.length > 0 && c.mods.map((m, mi) => (
                <div key={m.name} className={mi > 0 ? 'border-t border-line-soft/50' : ''}>
                  <div className="flex items-center gap-3 px-6 py-2.5">
                    <span className="flex-1 text-sm font-semibold text-text-muted">{m.name}</span>
                    <span className="text-xs font-medium text-accent cursor-default">+ Lesson</span>
                  </div>
                  <ul>
                    {m.lessons.map((l, li) => {
                      const isActive = mi === 2 && li === 1;
                      return (
                        <li key={l} className="border-t border-line-soft/30">
                          <div
                            data-sim-id={isActive ? 'editor-lesson-row' : undefined}
                            className={`flex items-center gap-4 px-6 py-4 hover:bg-surface-soft/60 transition-colors ${isActive ? 'bg-accent/[0.04]' : ''}`}
                          >
                            <span className="font-mono text-xs text-text-dim w-5 shrink-0 select-none">{String(li + 1).padStart(2, '0')}</span>
                            <span className={`flex-1 text-sm font-medium truncate ${isActive ? 'text-accent' : 'text-text-primary'}`}>{l}</span>
                            <svg className="shrink-0 text-text-dim" width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {c.mods.length === 0 && (
                <p className="px-6 py-5 font-serif italic text-sm text-text-dim">No modules yet.</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── SimEditorAI ───────────────────────────────── */
/* Exact copy of real lesson-mode editor with AI panel open */
function SimEditorAI() {
  const slides = [
    { label: 'Text',  title: 'What is income?' },
    { label: 'Flash', title: 'Gross vs Net' },
    { label: 'MCQ',   title: 'Tax Brackets' },
    { label: 'Text',  title: 'PAYG System' },
    { label: 'Table', title: 'Worked Example' },
  ];
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-surface-body">
      {/* Lesson mode header — exact copy from Editor.jsx inLessonMode */}
      <header className="shrink-0 border-b border-line-soft bg-surface-body/95 backdrop-blur-md">
        <div className="px-4 md:px-6 h-12 flex items-center gap-2 md:gap-3 min-w-0">
          <button className="shrink-0 text-[13px] font-medium text-text-dim hover:text-text-primary transition-colors">← Workspace</button>
          <span className="shrink-0 w-px h-3.5 bg-line-soft" />
          <span className="text-[13px] font-bold text-text-dim truncate max-w-[120px]">Money Basics</span>
          <span className="text-text-dim/40 shrink-0 text-[11px]">/</span>
          <span className="text-[13px] font-bold text-text-dim truncate max-w-[120px]">Income &amp; Tax</span>
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            <button className="h-8 px-3 rounded-full border border-accent/60 bg-accent/[0.08] text-accent text-sm font-medium flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 0.75 L6.4 3.6 L9.25 5.5 L6.4 7.4 L5.5 10.25 L4.6 7.4 L1.75 5.5 L4.6 3.6 Z" fill="currentColor" /></svg>
              AI
            </button>
            <button className="h-8 px-3 rounded-full border border-line-soft text-text-muted text-sm font-medium">Preview</button>
            <button className="h-8 px-4 btn-primary text-sm font-medium opacity-40">Saved</button>
            <button className="h-8 w-8 rounded-full border border-line-soft text-text-dim flex items-center justify-center text-base">×</button>
          </div>
        </div>
      </header>

      {/* Split: slide list + AI panel */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Slide list — matches real LessonBuilder */}
        <div className="w-64 border-r border-line-soft flex flex-col overflow-hidden shrink-0 bg-surface-body">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {slides.map((s, i) => (
              <div key={s.title} className={`group rounded-xl border px-5 py-4 flex items-center gap-3 ${i === 2 ? 'border-accent/40 bg-surface-raised' : 'border-line-soft bg-surface-raised hover:border-text-dim/25 transition-colors'}`}>
                <span className="font-mono text-[11px] text-text-dim/60 w-6 shrink-0 tabular-nums select-none">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex-1 min-w-0">
                  <span className="inline-flex items-center px-2 py-[3px] mb-1 rounded-md bg-accent/[0.08] text-accent text-[10px] font-bold tracking-wide uppercase">{s.label}</span>
                  <p className="text-[13px] text-text-primary truncate leading-snug">{s.title}</p>
                </div>
              </div>
            ))}
            <button className="w-full mt-1 py-3 rounded-xl border border-dashed border-line-soft text-sm text-text-dim hover:border-accent/40 hover:text-accent transition-colors">
              + Add slide
            </button>
          </div>
        </div>

        {/* AI chat panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">HY</div>
              <div className="bg-surface-soft border border-line-soft/60 rounded-2xl rounded-tl-sm px-4 py-3 max-w-sm">
                <p className="text-sm text-text-primary leading-relaxed">Generate a 10-slide lesson on Australian income tax for Year 11. Include marginal rates, PAYG withholding, and a worked payslip example.</p>
              </div>
            </div>
            <div className="flex gap-3 items-start flex-row-reverse">
              <div className="w-7 h-7 rounded-full bg-surface-soft border border-line-soft flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
              </div>
              <div className="bg-accent/[0.05] border border-accent/20 rounded-2xl rounded-tr-sm px-4 py-3 max-w-sm">
                <p className="text-[10px] text-accent font-mono mb-2 tracking-[0.1em] uppercase">Planning lesson…</p>
                <p className="text-xs text-text-primary leading-relaxed">
                  1. What is income? (Text)<br />
                  2. Gross vs net income (Flashcard)<br />
                  3. Tax bracket table (Chart)<br />
                  4. Marginal vs effective rate (MCQ)<br />
                  5. PAYG withholding system (Text)<br />
                  6. Worked payslip example (Table)
                </p>
              </div>
            </div>
            <p className="text-[11px] text-text-dim text-center font-mono py-1">Added 5 slides to your lesson.</p>
          </div>
          <div className="shrink-0 p-4 border-t border-line-soft">
            <div className="border border-line-soft rounded-2xl p-4 bg-surface-raised">
              <p className="text-sm text-text-dim">Ask me to generate or refine slides…</p>
              <div className="mt-3 flex justify-between items-center gap-3">
                <div className="flex gap-2">
                  <button className="text-xs border border-line-soft px-2.5 py-1.5 rounded-lg text-text-dim">📎 PDF</button>
                  <button className="text-xs border border-line-soft px-2.5 py-1.5 rounded-lg text-text-dim">10 slides ↕</button>
                </div>
                <button data-sim-id="ai-send-btn" className="btn-primary px-4 py-2 text-sm rounded-xl">Generate →</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── CapletMark pitch slides ───────────────────── */
const MARK_BG = 'linear-gradient(140deg,#0b0b18 0%,#130d2e 55%,#0d1224 100%)';
const MARK_LINE = { display:'flex', alignItems:'center', gap:10, marginBottom:24 };
const markKicker = (label) => (
  <div style={MARK_LINE}>
    <div style={{ width:28, height:2, background:'#6366f1', borderRadius:2 }}/>
    <span style={{ fontSize:11, fontFamily:'monospace', fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'#6366f1' }}>{label}</span>
  </div>
);

function SimMarkProblem() {
  const pains = [
    { n:'01', title:'Manual & slow', body:'Marking is done by hand, inconsistently, across thousands of scripts every exam season.' },
    { n:'02', title:'AI gets it wrong', body:'Generic models invent plausible-sounding marks with no rubric — inconsistent and untrustworthy.' },
    { n:'03', title:'No scalable fix', body:"The industry's answer is hiring more markers. That isn't a solution, it's a band-aid." },
  ];
  return (
    <div style={{ position:'absolute', inset:0, background:MARK_BG, display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 80px' }}>
      <div style={{ maxWidth:900, width:'100%' }}>
        {markKicker('The Problem')}
        <div style={{ display:'flex', alignItems:'flex-start', gap:48, marginBottom:52 }}>
          <div>
            <div style={{ fontSize:100, fontWeight:900, color:'white', lineHeight:1, fontFamily:'Georgia,serif', letterSpacing:'-2px' }}>$500M</div>
            <div style={{ fontSize:18, color:'rgba(255,255,255,0.52)', marginTop:10, maxWidth:320, lineHeight:1.55 }}>
              spent on marking in <strong style={{ color:'rgba(255,255,255,0.8)' }}>NSW alone</strong>, every single year. Teachers spend up to <strong style={{ color:'rgba(255,255,255,0.8)' }}>40% of their working hours</strong> on assessment — not teaching.
            </div>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:18 }}>
          {pains.map(p => (
            <div key={p.n} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:'22px 22px 24px' }}>
              <div style={{ fontSize:11, fontFamily:'monospace', color:'rgba(99,102,241,0.7)', fontWeight:700, letterSpacing:'0.1em', marginBottom:14 }}>{p.n}</div>
              <div style={{ fontSize:15, fontWeight:700, color:'white', marginBottom:8 }}>{p.title}</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,0.45)', lineHeight:1.65 }}>{p.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SimMarkSolution() {
  const items = ['Marking rubrics by question and year','Band exemplar responses (A–E)','Syllabus dot points mapped to criteria','Assessment criteria fully structured'];
  const rubric = [
    { band:'Band 6', pts:'9–10', desc:'Explains two distinct factors with precise data linkage and correct direction of effect.' },
    { band:'Band 5', pts:'7–8', desc:'Explains two factors clearly with supporting reasoning, minor gaps in data use.' },
    { band:'Band 4', pts:'5–6', desc:'Identifies two factors with some explanation, limited analytical depth.' },
    { band:'Band 3', pts:'3–4', desc:'Identifies one factor with explanation, or two factors without clear explanation.' },
  ];
  return (
    <div style={{ position:'absolute', inset:0, background:MARK_BG, display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 80px' }}>
      <div style={{ maxWidth:940, width:'100%', display:'flex', gap:56, alignItems:'center' }}>
        {/* Left */}
        <div style={{ flex:1, minWidth:0 }}>
          {markKicker('The Solution')}
          <h2 style={{ fontSize:54, fontWeight:900, color:'white', lineHeight:1.08, marginBottom:18, fontFamily:'Georgia,serif' }}>
            Caplet<span style={{ color:'#818cf8' }}>Mark</span>
          </h2>
          <p style={{ fontSize:16, color:'rgba(255,255,255,0.55)', lineHeight:1.72, marginBottom:32 }}>
            A structured library of marking rubrics, exemplar responses, and syllabus dot points — the data layer AI needs to grade student work <em style={{ color:'rgba(255,255,255,0.8)', fontStyle:'normal', fontWeight:600 }}>accurately, not plausibly</em>.
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
            {items.map(item => (
              <div key={item} style={{ display:'flex', alignItems:'center', gap:13 }}>
                <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(99,102,241,0.18)', border:'1.5px solid rgba(99,102,241,0.55)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:'#818cf8' }}/>
                </div>
                <span style={{ fontSize:14, color:'rgba(255,255,255,0.7)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Right: rubric card mockup */}
        <div style={{ width:330, flexShrink:0 }}>
          <div style={{ background:'rgba(99,102,241,0.07)', border:'1px solid rgba(99,102,241,0.22)', borderRadius:20, padding:24 }}>
            <div style={{ fontSize:10, fontFamily:'monospace', color:'rgba(99,102,241,0.75)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>HSC Economics — Q28b</div>
            <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.85)', marginBottom:18, lineHeight:1.5 }}>
              "Explain two factors that affect Australia's current account balance." (10 marks)
            </div>
            <div style={{ fontSize:10, fontFamily:'monospace', color:'rgba(255,255,255,0.3)', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:10 }}>Marking Rubric</div>
            {rubric.map((r, i) => (
              <div key={r.band} style={{ display:'flex', gap:10, padding:'9px 0', borderBottom: i < rubric.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none', alignItems:'flex-start' }}>
                <div style={{ background:'rgba(99,102,241,0.2)', borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:700, color:'#a5b4fc', flexShrink:0, whiteSpace:'nowrap' }}>{r.band}</div>
                <div>
                  <div style={{ fontSize:10, color:'rgba(99,102,241,0.6)', fontWeight:600, marginBottom:3 }}>{r.pts} pts</div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', lineHeight:1.55 }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SimMarkFlow() {
  const steps = [
    { n:'01', label:'Student submits', sub:'Written response to exam question' },
    { n:'02', label:'Library lookup', sub:'CapletMark retrieves rubric + exemplars' },
    { n:'03', label:'AI grades', sub:'Model marks against real criteria only' },
    { n:'04', label:'Structured feedback', sub:'Band, score, targeted improvement notes' },
  ];
  return (
    <div style={{ position:'absolute', inset:0, background:MARK_BG, display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 80px' }}>
      <div style={{ maxWidth:920, width:'100%' }}>
        {markKicker('How It Works')}
        <h2 style={{ fontSize:50, fontWeight:900, color:'white', lineHeight:1.12, marginBottom:48, fontFamily:'Georgia,serif' }}>
          From submission<br/>to feedback in seconds
        </h2>
        {/* Flow steps */}
        <div style={{ display:'flex', alignItems:'stretch', gap:0, marginBottom:36 }}>
          {steps.flatMap((s, i) => {
            const card = (
              <div key={s.n} style={{ flex:1, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, padding:'28px 20px 26px', textAlign:'center' }}>
                <div style={{ fontSize:11, fontFamily:'monospace', color:'rgba(99,102,241,0.7)', fontWeight:700, letterSpacing:'0.1em', marginBottom:16 }}>{s.n}</div>
                <div style={{ width:42, height:42, borderRadius:'50%', background:'rgba(99,102,241,0.16)', border:'1.5px solid rgba(99,102,241,0.35)', margin:'0 auto 16px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <div style={{ width:14, height:14, borderRadius:'50%', background:'#6366f1' }}/>
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:'white', marginBottom:8 }}>{s.label}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.42)', lineHeight:1.6 }}>{s.sub}</div>
              </div>
            );
            if (i < steps.length - 1) {
              return [card, (
                <div key={`arr-${i}`} style={{ width:44, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(99,102,241,0.5)', fontSize:26 }}>→</div>
              )];
            }
            return [card];
          })}
        </div>
        {/* Key insight callout */}
        <div style={{ background:'rgba(99,102,241,0.10)', border:'1px solid rgba(99,102,241,0.22)', borderRadius:14, padding:'18px 26px', display:'flex', alignItems:'flex-start', gap:16 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#818cf8', flexShrink:0, marginTop:6 }}/>
          <p style={{ margin:0, fontSize:14, color:'rgba(255,255,255,0.7)', lineHeight:1.68 }}>
            <strong style={{ color:'white' }}>The key insight:</strong> generic AI invents plausible-sounding marks because it has no rubric to work from. CapletMark ensures the model only grades against the actual marking criteria — the same document a human marker uses. That's what makes it trustworthy.
          </p>
        </div>
      </div>
    </div>
  );
}

function SimMarkMarket() {
  const tiers = [
    { label:'NSW alone', value:'$500M', sub:'annual marking spend, public + private' },
    { label:'Australia-wide', value:'$3B+', sub:'estimated total addressable market' },
    { label:'Our target', value:'1%', sub:'is already a significant, fundable business' },
  ];
  const moats = [
    'Already inside schools — students and teachers use Caplet today',
    'Data flywheel: every lesson and assessment generates richer training data',
    'First mover: no one has built a structured marking library at this scale',
  ];
  return (
    <div style={{ position:'absolute', inset:0, background:MARK_BG, display:'flex', alignItems:'center', justifyContent:'center', padding:'48px 80px' }}>
      <div style={{ maxWidth:940, width:'100%', display:'flex', gap:60, alignItems:'center' }}>
        {/* Left */}
        <div style={{ flex:1, minWidth:0 }}>
          {markKicker('The Opportunity')}
          <h2 style={{ fontSize:46, fontWeight:900, color:'white', lineHeight:1.12, marginBottom:36, fontFamily:'Georgia,serif' }}>
            A massive market<br/>nobody has solved
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
            {tiers.map(t => (
              <div key={t.label} style={{ display:'flex', alignItems:'baseline', gap:22 }}>
                <div style={{ fontSize:52, fontWeight:900, color:'#a5b4fc', minWidth:120, fontFamily:'Georgia,serif', letterSpacing:'-1px' }}>{t.value}</div>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:'white' }}>{t.label}</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:2 }}>{t.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Right: moat card */}
        <div style={{ width:300, flexShrink:0 }}>
          <div style={{ background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.22)', borderRadius:22, padding:'28px 24px' }}>
            <div style={{ fontSize:11, fontFamily:'monospace', fontWeight:700, color:'#818cf8', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:22 }}>Why Caplet wins</div>
            {moats.map((m, i) => (
              <div key={i} style={{ display:'flex', gap:14, marginBottom:20, alignItems:'flex-start' }}>
                <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(99,102,241,0.22)', border:'1.5px solid rgba(99,102,241,0.5)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                  <span style={{ fontSize:10, fontWeight:800, color:'#a5b4fc' }}>{i+1}</span>
                </div>
                <p style={{ margin:0, fontSize:13, color:'rgba(255,255,255,0.6)', lineHeight:1.65 }}>{m}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── SimFuture ─────────────────────────────────── */
const FUTURE_ITEMS = [
  { label: 'AI Essay Marking',                desc: 'Students write long-form answers; a model trained against real marking rubrics grades and returns targeted, specific feedback.' },
  { label: 'Adaptive Practice Paths',         desc: 'Difficulty adjusts per student based on their quiz history. Everyone works at the level that pushes them exactly enough.' },
  { label: 'Shared Currency, Platform-wide',  desc: 'One economy that works across every lesson, game, and activity on Caplet — earn it anywhere, spend it anywhere.' },
  { label: 'Assessment & Certification',      desc: 'Formal assessments with custom rubrics, auto-generated certificates, and per-school progress reporting dashboards.' },
  { label: 'Open Platform & API',             desc: 'Caplet becomes infrastructure — publishers, developers, and institutions build on top of it for any subject, any audience, anywhere.' },
];
function SimFuture() {
  return (
    <div className="absolute inset-0 bg-surface-body flex items-center justify-center px-6 md:px-12 lg:px-20 overflow-hidden">
      <div className="max-w-2xl w-full">
        <span className="font-hand text-xl text-accent -rotate-2 inline-block mb-3">roadmap</span>
        <h2 className="text-5xl md:text-6xl font-display font-extrabold tracking-tight text-text-primary mb-3">
          The infrastructure<br />for how people learn
        </h2>
        <p className="text-text-muted mb-8 leading-relaxed max-w-lg">
          Caplet v1 is live. Here's what's being built next — a platform open enough for anyone to build on, powerful enough to replace every tool a school currently uses.
        </p>
        <div className="space-y-5">
          {FUTURE_ITEMS.map((p) => (
            <div key={p.label} className="flex gap-5 items-start border-b border-line-soft pb-5 last:border-b-0 last:pb-0">
              <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2" />
              <div>
                <p className="font-semibold text-text-primary text-sm">{p.label}</p>
                <p className="text-sm text-text-muted mt-0.5 leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Main Tour page ─────────────────────────────── */
export default function Tour() {
  const navigate = useNavigate();
  const [sceneIndex, setSceneIndex] = useState(0);
  const [coverOpacity, setCoverOpacity] = useState(0);   // dark cover for scene transitions
  const [displayedLeft, setDisplayedLeft] = useState(SCENES[0].avatarLeft); // avatar horizontal anchor
  const [avatarScale, setAvatarScale]     = useState(1.0);                  // avatar zoom during transition
  const [cursorPos, setCursorPos] = useState({
    x: typeof window !== 'undefined' ? window.innerWidth  * 0.88 : 800,
    y: typeof window !== 'undefined' ? window.innerHeight * 0.04 : 30,
  });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [isClicking, setIsClicking]  = useState(false);
  const [rippleKey, setRippleKey]    = useState(0);
  const [showRipple, setShowRipple]  = useState(false);
  const [captionVis, setCaptionVis]  = useState(false);
  const [avatarTalking, setAvatarTalking] = useState(false);
  const isFirstMount = useRef(true);
  const [navHintVisible, setNavHintVisible] = useState(true);

  // Dismiss nav hint after 3.2 s
  useEffect(() => {
    const t = setTimeout(() => setNavHintVisible(false), 3200);
    return () => clearTimeout(t);
  }, []);

  const scene       = SCENES[sceneIndex];
  const currentView = scene.view;
  const hasSimNav   = currentView !== 'editor' && currentView !== 'editor-ai'
    && currentView !== 'future' && !currentView.startsWith('mark-');

  /* ── CSS keyframes ── */
  useEffect(() => {
    const ID = 'tour-kf';
    if (document.getElementById(ID)) return;
    const s = document.createElement('style');
    s.id = ID;
    s.textContent = `
      @keyframes simRipple    { from{transform:translate(-50%,-50%) scale(0.2);opacity:1} to{transform:translate(-50%,-50%) scale(3.2);opacity:0} }
      @keyframes simRippleBig { from{transform:translate(-50%,-50%) scale(0.1);opacity:.6} to{transform:translate(-50%,-50%) scale(3.8);opacity:0} }
      @keyframes avBob      { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-11px)} }
      @keyframes avBlink    { 0%,85%,100%{transform:scaleY(1)} 92%{transform:scaleY(0.06)} }
      @keyframes avTalk     { 0%{transform:scaleY(0.18)} 100%{transform:scaleY(1)} }
      @keyframes hintBounceL{ 0%,100%{transform:translateX(0)}  50%{transform:translateX(-7px)} }
      @keyframes hintBounceR{ 0%,100%{transform:translateX(0)}  50%{transform:translateX(7px)} }
    `;
    document.head.appendChild(s);
    return () => document.getElementById(ID)?.remove();
  }, []);

  /* ── Navigation ── */
  const prevScene = useCallback(() => {
    setNavHintVisible(false);
    setSceneIndex(i => Math.max(0, i - 1));
  }, []);
  const nextScene = useCallback(() => {
    setNavHintVisible(false);
    setSceneIndex(i => {
      if (i < SCENES.length - 1) return i + 1;
      navigate('/');
      return i;
    });
  }, [navigate]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextScene(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prevScene(); }
      if (e.key === 'Escape')     navigate('/');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nextScene, prevScene, navigate]);

  /* ── Scene animation ── */
  useEffect(() => {
    let dead = false;
    const timers = [];
    const delay = (fn, ms) => { const id = setTimeout(() => { if (!dead) fn(); }, ms); timers.push(id); };
    const cleanup = () => { dead = true; timers.forEach(clearTimeout); };

    const sc = SCENES[sceneIndex];
    setCaptionVis(false);
    setAvatarTalking(false);
    setIsClicking(false);

    const showCaption = (afterMs) => {
      delay(() => {
        setCaptionVis(true);
        setAvatarTalking(true);
        delay(() => setAvatarTalking(false), 2800);
      }, afterMs);
    };

    const launchCursor = () => {
      setCursorVisible(true);
      if (!sc.cursor) {
        setCursorPos({ x: window.innerWidth * 0.52, y: window.innerHeight * 0.44 });
        showCaption(660);
        return;
      }
      let attempts = 0;
      const findAndGo = () => {
        if (dead) return;
        const pos = getSimPoint(sc.cursor);
        if (pos) {
          setCursorPos(pos);
          if (sc.clickAnim) {
            delay(() => {
              setIsClicking(true);
              delay(() => {
                setIsClicking(false);
                setRippleKey(k => k + 1);
                setShowRipple(true);
                delay(() => setShowRipple(false), 700);
                showCaption(POST_CLICK + 60);
              }, CLICK_DOWN);
            }, CURSOR_MOVE + HOVER_PAUSE);
          } else {
            showCaption(CURSOR_MOVE + 240);
          }
        } else if (attempts++ < 30) {
          setTimeout(findAndGo, 80);
        } else {
          showCaption(200);
        }
      };
      findAndGo();
    };

    if (isFirstMount.current) {
      // First scene: no cover transition, just fade in and start
      isFirstMount.current = false;
      setDisplayedLeft(sc.avatarLeft);
      setAvatarScale(1.0);
      setCoverOpacity(0);
      delay(launchCursor, 300);
      return cleanup;
    }

    // ── Transition sequence ──────────────────────────────────────────────
    // Phase 1 (t=0): hide caption, cover fades IN, avatar glides to centre
    //                and grows — avatar is always visible above the cover
    setCursorVisible(false);
    setCoverOpacity(1);
    setDisplayedLeft('50%');
    setAvatarScale(1.36);

    // Phase 2 (t=COVER_DELAY): content has changed (sceneIndex already updated),
    //   cover fades OUT, avatar glides to new position and shrinks back
    delay(() => {
      setCoverOpacity(0);
      setDisplayedLeft(sc.avatarLeft);
      setAvatarScale(1.0);
      // Cursor / caption start after avatar arrives (left transition is 0.8s)
      delay(launchCursor, 820);
    }, COVER_DELAY);

    return cleanup;
  }, [sceneIndex]);

  return (
    <div style={{ height: '100vh', overflow: 'hidden', position: 'relative', background: 'var(--surface-base)' }}>

      {/* SimNavbar */}
      {hasSimNav && <SimNavbar active={scene.nav} />}

      {/* Page canvas — no opacity here; cover overlay handles transitions */}
      <div style={{
        position: 'absolute', top: hasSimNav ? 60 : 0, left: 0, right: 0, bottom: 0,
      }}>
        {currentView === 'home'          && <SimHome />}
        {currentView === 'courses'       && <SimCourses />}
        {currentView === 'course-detail' && <SimCourseDetail />}
        {currentView === 'module-detail' && <SimModuleDetail />}
        {currentView === 'lesson-intro'  && <SimLessonIntro />}
        {currentView === 'lesson-mcq'    && <SimLessonMCQ />}
        {currentView === 'lesson-calc'   && <SimLessonCalc />}
        {currentView === 'classes'       && <SimClasses />}
        {currentView === 'class-detail'  && <SimClassDetail />}
        {currentView === 'editor'         && <SimEditor />}
        {currentView === 'editor-ai'     && <SimEditorAI />}
        {currentView === 'mark-problem'  && <SimMarkProblem />}
        {currentView === 'mark-solution' && <SimMarkSolution />}
        {currentView === 'mark-flow'     && <SimMarkFlow />}
        {currentView === 'mark-market'   && <SimMarkMarket />}
        {currentView === 'future'        && <SimFuture />}
      </div>

      {/* ── Scene-transition cover — fades in over old content, out over new ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9800,
        background: 'var(--surface-base)',
        opacity: coverOpacity,
        transition: 'opacity 420ms cubic-bezier(0.4,0,0.2,1)',
        pointerEvents: coverOpacity > 0.05 ? 'auto' : 'none',
      }}/>

      {/* ── Fixed overlays ── */}
      <ProgressBar current={sceneIndex} total={SCENES.length} />

      {/* Left gradient strip */}
      <div
        onClick={prevScene}
        style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, width: 200,
          zIndex: 200,
          cursor: sceneIndex > 0 ? 'pointer' : navHintVisible ? 'default' : 'default',
          display: 'flex', alignItems: 'center', paddingLeft: 20,
          background: (sceneIndex > 0 || navHintVisible)
            ? 'linear-gradient(to right, rgba(100,100,100,0.26) 0%, rgba(100,100,100,0.08) 58%, transparent 100%)'
            : 'transparent',
          pointerEvents: sceneIndex > 0 ? 'auto' : 'none',
          transition: 'background 0.3s ease',
        }}
      >
        {/* Persistent small chevron (shown once hint fades) */}
        <svg
          width="22" height="22" viewBox="0 0 24 24" fill="none"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{
            stroke: 'var(--text-muted)',
            filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.2))',
            opacity: sceneIndex > 0 && !navHintVisible ? 0.7 : 0,
            flexShrink: 0,
            transition: 'opacity 0.4s ease',
          }}
        ><polyline points="15 18 9 12 15 6" /></svg>

        {/* Nav hint — bouncing arrow + label, fades after 3 s */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
          opacity: navHintVisible ? 1 : 0,
          transition: 'opacity 0.9s ease',
          pointerEvents: 'none',
        }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none"
            strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ stroke: 'rgba(180,180,200,0.9)', animation: 'hintBounceL 1.0s ease-in-out infinite' }}
          ><polyline points="15 18 9 12 15 6" /></svg>
          <span style={{
            fontSize: 11, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(180,180,200,0.7)',
          }}>Back</span>
        </div>
      </div>

      {/* Right gradient strip */}
      <div
        onClick={nextScene}
        style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, width: 200,
          zIndex: 200,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 20,
          background: 'linear-gradient(to left, rgba(100,100,100,0.26) 0%, rgba(100,100,100,0.08) 58%, transparent 100%)',
        }}
      >
        {/* Persistent small chevron */}
        <svg
          width="22" height="22" viewBox="0 0 24 24" fill="none"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{
            stroke: 'var(--text-muted)',
            filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.2))',
            opacity: navHintVisible ? 0 : 0.7,
            flexShrink: 0,
            transition: 'opacity 0.4s ease',
          }}
        ><polyline points="9 18 15 12 9 6" /></svg>

        {/* Nav hint */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
          opacity: navHintVisible ? 1 : 0,
          transition: 'opacity 0.9s ease',
          pointerEvents: 'none',
        }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none"
            strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"
            style={{ stroke: 'rgba(180,180,200,0.9)', animation: 'hintBounceR 1.0s ease-in-out infinite' }}
          ><polyline points="9 18 15 12 9 6" /></svg>
          <span style={{
            fontSize: 11, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'rgba(180,180,200,0.7)',
          }}>Next</span>
        </div>
      </div>

      {/* Close button */}
      <button onClick={() => navigate('/')}
        style={{ position: 'fixed', top: 11, right: 16, zIndex: 9990, background: 'rgba(0,0,0,0.44)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.13)', color: 'white', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
      >×</button>

      {/* Scene counter */}
      <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9990, background: 'rgba(0,0,0,0.44)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.65)', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.06em', pointerEvents: 'none' }}>
        {sceneIndex + 1} / {SCENES.length}
      </div>

      {/* Avatar guide */}
      <AvatarGuide
        title={scene.caption.title} body={scene.caption.body}
        visible={captionVis} talking={avatarTalking}
        avatarLeft={displayedLeft} avatarScale={avatarScale}
      />

      {/* Virtual cursor */}
      <VirtualCursor x={cursorPos.x} y={cursorPos.y} visible={cursorVisible} clicking={isClicking} />

      {/* Ripple */}
      {showRipple && <ClickRipple key={rippleKey} x={cursorPos.x} y={cursorPos.y} />}
    </div>
  );
}
