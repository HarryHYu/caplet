/**
 * /tour  — standalone demo page
 *
 * Layout:
 *   height:100vh + overflow:hidden container (no fixed positioning needed)
 *   SimNavbar  →  position:fixed top-0 z-50  (exact copy of real Navbar HTML)
 *   Page canvas  →  absolute { top:60, inset-x:0, bottom:0 }  for simulated views
 *   Nav zones / cursor / caption  →  position:fixed, no z-index fight with real site
 *   because App.jsx renders /tour in its own <Routes> without Navbar/Footer wrapper
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

/* ─────────────────────────── Timing ────────────────────────────────────── */
const CURSOR_MOVE  = 680;
const HOVER_PAUSE  = 340;
const CLICK_DOWN   = 110;
const POST_CLICK   = 260;
const FADE_VIEW    = 200;
const TIP_OX = 3, TIP_OY = 2;

/* ─────────────────────────── Scenes ────────────────────────────────────── */
const SCENES = [
  {
    id: 'welcome', view: 'home', nav: null, cursor: null, clickAnim: false,
    caption: { title: 'Welcome to Caplet', body: "Hey — I'm Harry. I built Caplet to make financial literacy actually stick for students. Let me walk you through what's here." },
  },
  {
    id: 'curriculum', view: 'courses', nav: 'curriculum', cursor: 'nav-curriculum', clickAnim: true,
    caption: { title: 'The Curriculum', body: 'Structured courses covering the financial skills that matter most to Australian students — tax, budgeting, super, investing, and more.' },
  },
  {
    id: 'courses-grid', view: 'courses', nav: 'curriculum', cursor: 'courses-grid', clickAnim: false,
    caption: { title: 'Course Library', body: 'Courses break into modules and short focused lessons. Progress is tracked automatically — students always pick up right where they left off.' },
  },
  {
    id: 'lesson-intro', view: 'lesson-intro', nav: 'curriculum', cursor: 'lesson-next-btn', clickAnim: true,
    caption: { title: 'Inside a Lesson', body: 'A clean lesson player — course breadcrumb, slide progress dots, and a full-screen canvas. Arrow keys or buttons to move between slides.' },
  },
  {
    id: 'lesson-mcq', view: 'lesson-mcq', nav: 'curriculum', cursor: 'lesson-option-c', clickAnim: true,
    caption: { title: '15 Slide Types', body: 'Multiple choice, flashcards, drag-to-match, fill-in-the-blank, Desmos graphs, diagrams, PhET simulations, hotspot annotations, and more.' },
  },
  {
    id: 'lesson-calc', view: 'lesson-calc', nav: 'curriculum', cursor: 'calc-btn', clickAnim: true,
    caption: { title: 'Built-in Calculator', body: "A floating Desmos graphing and scientific calculator on every lesson. Pop it up, do the working, close it — it remembers everything you typed." },
  },
  {
    id: 'academy', view: 'classes', nav: 'academy', cursor: 'nav-academy', clickAnim: true,
    caption: { title: 'The Academy', body: 'The classroom management layer. Teachers create a class, students join with a code, and progress tracking is built right in.' },
  },
  {
    id: 'classes-view', view: 'classes', nav: 'academy', cursor: 'academy-create-btn', clickAnim: true,
    caption: { title: 'Class Management', body: "One click to create a class, share the join code, and track every student's progress privately. Post announcements, assign specific lessons — all built in." },
  },
  {
    id: 'editor', view: 'editor', nav: null, cursor: 'editor-workspace', clickAnim: false,
    caption: { title: 'Lesson Creator', body: "The editor is where all content gets built. It's gated by access code — only authorised teachers can create or edit. Full course hierarchy: courses → modules → lessons." },
  },
  {
    id: 'editor-ai', view: 'editor-ai', nav: null, cursor: 'ai-send-btn', clickAnim: true,
    caption: { title: 'AI Generation', body: 'Paste curriculum notes or upload a PDF. The AI plans the lesson in natural text first, then converts it to structured slides — coherent output, every time.' },
  },
  {
    id: 'future', view: 'future', nav: null, cursor: null, clickAnim: false,
    caption: { title: "That's Caplet", body: "Live today for students and teachers. Here's where we're heading next." },
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
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', left: x - TIP_OX, top: y - TIP_OY,
        width: 24, height: 28, pointerEvents: 'none', zIndex: 9960,
        opacity: visible ? 1 : 0,
        transition: [
          `left ${CURSOR_MOVE}ms cubic-bezier(0.42,0,0.18,1.0)`,
          `top  ${CURSOR_MOVE}ms cubic-bezier(0.42,0,0.18,1.0)`,
          'opacity 0.3s ease',
        ].join(', '),
        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.55)) drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
        willChange: 'left, top',
      }}
    >
      <svg
        width="24" height="28" viewBox="0 0 24 28" fill="none"
        style={{
          transform: clicking ? 'scale(0.76)' : 'scale(1)',
          transition: `transform ${clicking ? CLICK_DOWN : 140}ms ease`,
          transformOrigin: `${TIP_OX}px ${TIP_OY}px`,
          display: 'block',
        }}
      >
        <path
          d="M3.5 2.5 L3.5 21.5 L7.5 17.5 L11.5 25.5 L14 24.5 L10 16.5 L16.5 16.5 Z"
          fill="white" stroke="#0f0f0f" strokeWidth="1.6"
          strokeLinejoin="round" strokeLinecap="round"
        />
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

/* ─────────────────────────── Caption ───────────────────────────────────── */
function Caption({ title, body, visible }) {
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%',
      transform: `translateX(-50%) translateY(${visible ? 0 : 14}px)`,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.35s ease, transform 0.35s ease',
      zIndex: 400, pointerEvents: 'none',
      maxWidth: 540, width: 'calc(100vw - 140px)',
    }}>
      <div style={{
        background: 'rgba(6,6,10,0.84)',
        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 18, padding: '14px 20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
      }}>
        <p style={{ margin: '0 0 4px', fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>
          Caplet Demo
        </p>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>{title}</h3>
        {body && <p style={{ margin: '5px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.63)', lineHeight: 1.56 }}>{body}</p>}
      </div>
    </div>
  );
}

/* ─────────────────────────── Progress bar ──────────────────────────────── */
function ProgressBar({ current, total }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 9980, background: 'var(--line-soft)' }}>
      <div style={{ height: '100%', background: 'var(--accent)', width: `${((current + 1) / total) * 100}%`, transition: 'width 0.55s cubic-bezier(0.4,0,0.2,1)' }} />
    </div>
  );
}

/* ─────────────────────────── SimNavbar ─────────────────────────────────── */
/* Pixel-matches the real Navbar — same Tailwind classes, same structure */
function SimNavbar({ active }) {
  const { isDark, toggleTheme } = useTheme();

  const navItems = [
    { label: 'Curriculum', id: 'curriculum' },
    { label: 'Academy',    id: 'academy'    },
    { label: 'Instruments', id: 'instruments' },
  ];

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 bg-surface-body/95 backdrop-blur-2xl shadow-[0_1px_0_var(--line-soft),0_4px_24px_rgba(0,0,0,0.06)] text-text-primary"
      style={{ zIndex: 50 }}
    >
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
        <div className="h-14 md:h-[60px] flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-2.5 group relative z-10 shrink-0 cursor-default">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden ring-1 ring-line-soft">
              <img src="/logo.png" alt="Caplet" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg md:text-xl font-serif italic font-bold tracking-tight text-text-primary">
              Caplet.
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ label, id }) => {
              const isActive = active === id;
              return (
                <span
                  key={id}
                  data-sim-id={`nav-${id}`}
                  className={`relative px-3.5 py-2 text-sm font-medium rounded-lg select-none cursor-default ${
                    isActive ? 'text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-surface-soft'
                  }`}
                >
                  {label}
                  {isActive && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-accent rounded-full" />
                  )}
                </span>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5 md:gap-2 relative z-10 shrink-0">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-soft transition-all duration-200"
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <div className="hidden md:block w-px h-4 bg-line-soft mx-0.5" />

            {/* Demo user pill — always shows Harry */}
            <div className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-line-soft cursor-default">
              <div className="w-6 h-6 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold font-mono leading-none flex-shrink-0">
                HY
              </div>
              <span className="text-sm font-medium text-text-primary leading-none">Harry</span>
              <svg className="w-3 h-3 text-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────── SimHome ───────────────────────────────────── */
function SimHome() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 gap-8">
      <div className="space-y-5 max-w-2xl">
        <p className="text-xs font-mono font-bold tracking-widest uppercase text-accent opacity-60">
          Financial literacy for Australian students
        </p>
        <h1 className="text-6xl font-serif font-bold text-text-primary leading-tight">
          Learning that<br />actually sticks.
        </h1>
        <p className="text-xl text-text-muted leading-relaxed">
          Structured courses, interactive lessons, and a built-in classroom system — all in one place.
        </p>
      </div>
      <div className="flex gap-3">
        <button className="bg-accent text-white px-8 py-3 rounded-full font-semibold text-sm">Get started free</button>
        <button className="border border-line-soft px-8 py-3 rounded-full font-medium text-sm text-text-primary">Explore curriculum →</button>
      </div>
    </div>
  );
}

/* ─────────────────────────── SimCourses ────────────────────────────────── */
const SIM_COURSES = [
  { id: 1, title: 'Money Basics',   tag: 'Foundation', lessons: 16, color: '#0050ff' },
  { id: 2, title: 'Tax & Super',    tag: 'Essential',  lessons: 12, color: '#7c3aed' },
  { id: 3, title: 'Investing',      tag: 'Advanced',   lessons: 20, color: '#059669' },
];
function SimCourses() {
  return (
    <div className="absolute inset-0 overflow-hidden px-8 md:px-12 lg:px-16">
      <div className="max-w-[1400px] mx-auto pt-20 pb-16">
        <h1 className="text-4xl font-serif font-bold text-text-primary mb-3">Curriculum</h1>
        <p className="text-text-muted text-sm mb-10">Financial education for every stage of your journey.</p>
        <div
          data-sim-id="courses-grid"
          className="grid grid-cols-3 gap-px bg-line-soft border border-line-soft rounded-2xl overflow-hidden"
        >
          {SIM_COURSES.map((c) => (
            <div key={c.id} className="bg-surface-body p-8 cursor-default hover:bg-surface-soft transition-colors">
              <p className="text-xs font-mono font-bold tracking-widest uppercase mb-5" style={{ color: c.color }}>{c.tag}</p>
              <h3 className="text-xl font-bold text-text-primary mb-2 font-serif">{c.title}</h3>
              <p className="text-sm text-text-muted">{c.lessons} lessons</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── SimLesson shell ───────────────────────────── */
function SimLessonShell({ idx = 0, total = 6, showCalc = false, children }) {
  return (
    <div className="absolute inset-0 flex flex-col">
      {/* Sub-header */}
      <div className="shrink-0 h-14 border-b border-line-soft flex items-center px-6 gap-3 bg-surface-body">
        <span className="text-xs text-text-dim">Money Basics</span>
        <svg className="w-3 h-3 text-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-sm font-medium text-text-primary">Understanding Income &amp; Tax</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            data-sim-id="calc-btn"
            className="w-8 h-8 rounded-lg border border-line-soft flex items-center justify-center text-text-dim hover:bg-surface-soft transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="4" y="2" width="16" height="20" rx="2"/>
              <path d="M8 6h8M8 10h8M8 14h4"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Progress dots */}
      <div className="shrink-0 h-9 flex items-center justify-center gap-1.5 border-b border-line-soft">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i < idx ? 'w-2 h-2 bg-accent' : i === idx ? 'w-4 h-2 bg-accent' : 'w-2 h-2 bg-line-soft'
            }`}
          />
        ))}
      </div>

      {/* Slide content */}
      <div className="flex-1 relative overflow-hidden">
        {children}

        {/* Floating calculator */}
        {showCalc && (
          <div className="absolute top-8 right-8 w-60 h-52 bg-surface-raised border border-line-soft rounded-2xl shadow-2xl overflow-hidden" style={{ zIndex: 20 }}>
            <div className="h-7 bg-surface-soft border-b border-line-soft flex items-center px-3 gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-400"/>
              <div className="w-2 h-2 rounded-full bg-yellow-400"/>
              <div className="w-2 h-2 rounded-full bg-green-400"/>
              <span className="text-xs text-text-dim ml-1">Scientific</span>
            </div>
            <div className="p-2.5 grid grid-cols-4 gap-1">
              {['sin','cos','tan','(','7','8','9','÷','4','5','6','×','1','2','3','−','0','.','=','+'].map((k,i) => (
                <div key={i} className="h-6 rounded bg-surface-soft flex items-center justify-center text-xs text-text-muted">{k}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 h-14 border-t border-line-soft flex items-center justify-between px-6 bg-surface-body">
        <button className="text-sm text-text-dim">← Previous</button>
        <span className="text-xs text-text-dim">{idx + 1} of {total}</span>
        <button data-sim-id="lesson-next-btn" className="text-sm text-accent font-medium">Next →</button>
      </div>
    </div>
  );
}

function SimLessonIntro() {
  return (
    <SimLessonShell idx={0}>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-16 text-center gap-6">
        <span className="text-xs font-mono uppercase tracking-widest text-accent opacity-60">Text</span>
        <h2 className="text-4xl font-serif font-bold text-text-primary">Understanding Income &amp; Tax</h2>
        <p className="text-lg text-text-muted max-w-xl leading-relaxed">
          Before you manage money well, you need to understand where it comes from — and where it goes. In Australia, every dollar you earn is subject to the income tax system.
        </p>
        <p className="text-base text-text-muted max-w-xl leading-relaxed">
          This lesson covers gross vs net income, the marginal tax rate system, and how PAYG withholding works in practice.
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
    <SimLessonShell idx={2}>
      <div className="absolute inset-0 flex items-center justify-center px-12">
        <div className="w-full max-w-2xl">
          <span className="text-xs font-mono uppercase tracking-widest text-accent opacity-60">Multiple Choice</span>
          <h2 className="text-2xl font-serif font-bold text-text-primary mt-3 mb-7 leading-snug">
            Which of the following is NOT a feature of Australia's superannuation system?
          </h2>
          <div className="space-y-3">
            {opts.map((o) => (
              <div
                key={o.id}
                data-sim-id={`lesson-option-${o.id}`}
                className={`flex items-center gap-4 p-4 rounded-xl border cursor-default transition-colors ${
                  o.wrong ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-line-soft hover:bg-surface-soft'
                }`}
              >
                <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${
                  o.wrong ? 'border-red-400 text-red-500' : 'border-line-soft text-text-dim'
                }`}>
                  {o.id.toUpperCase()}
                </span>
                <span className="text-sm text-text-primary">{o.text}</span>
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
    <SimLessonShell idx={2} showCalc>
      <div className="absolute inset-0 flex items-center justify-center px-12">
        <div className="w-full max-w-2xl opacity-35">
          <h2 className="text-2xl font-serif font-bold text-text-primary leading-snug">
            Which of the following is NOT a feature of Australia's superannuation system?
          </h2>
        </div>
      </div>
    </SimLessonShell>
  );
}

/* ─────────────────────────── SimClasses ────────────────────────────────── */
function SimClasses() {
  return (
    <div className="absolute inset-0 overflow-hidden px-8 md:px-12 lg:px-16">
      <div className="max-w-[1400px] mx-auto pt-20">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-4xl font-serif font-bold text-text-primary mb-3">The Academy</h1>
            <p className="text-text-muted text-sm">Manage your classes and track student progress.</p>
          </div>
          <div className="flex gap-3">
            <button data-sim-id="academy-create-btn" className="bg-accent text-white px-5 py-2.5 rounded-lg text-sm font-semibold">
              + Establish Class
            </button>
            <button className="border border-line-soft px-5 py-2.5 rounded-lg text-sm font-medium text-text-primary">
              Join Class
            </button>
          </div>
        </div>
        <div className="border border-line-soft rounded-2xl overflow-hidden">
          <div className="bg-surface-soft border-b border-line-soft px-6 py-3">
            <span className="text-xs font-mono uppercase tracking-wider text-text-dim">Your Classes</span>
          </div>
          {[
            { name: 'Year 11 Commerce A', students: 28, code: 'CAP-4821' },
            { name: 'Year 12 Economics',  students: 24, code: 'CAP-7193' },
          ].map((c) => (
            <div key={c.name} className="px-6 py-4 flex items-center gap-4 border-b border-line-soft last:border-b-0 hover:bg-surface-soft transition-colors">
              <div className="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center shrink-0">
                <span className="text-accent text-xs font-bold">{c.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary">{c.name}</p>
                <p className="text-xs text-text-dim">{c.students} students · Code: {c.code}</p>
              </div>
              <button className="text-xs text-text-dim hover:text-text-primary transition-colors">View →</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── SimEditor ─────────────────────────────────── */
function SimEditor() {
  return (
    <div data-sim-id="editor-workspace" className="absolute inset-0 flex">
      {/* Sidebar */}
      <div className="w-72 border-r border-line-soft bg-surface-soft flex flex-col shrink-0">
        <div className="p-4 border-b border-line-soft">
          <p className="text-xs font-mono uppercase tracking-wider text-text-dim mb-3">Courses</p>
          {['Money Basics', 'Tax & Super', 'Investing'].map((c) => (
            <div key={c} className="px-3 py-2 rounded-lg text-sm text-text-muted mb-0.5 cursor-default hover:bg-surface-body hover:text-text-primary transition-colors">{c}</div>
          ))}
          <button className="mt-2 w-full text-left px-3 py-2 text-xs text-accent hover:bg-accent-soft rounded-lg transition-colors">+ New Course</button>
        </div>
        <div className="p-4 flex-1">
          <p className="text-xs font-mono uppercase tracking-wider text-text-dim mb-3">Slides</p>
          {['Intro: Income Types', 'Gross vs Net', 'Tax Brackets', 'PAYG System', 'Worked Example'].map((s, i) => (
            <div key={s} className={`px-3 py-2 rounded-lg text-sm mb-0.5 cursor-default ${i === 2 ? 'bg-accent-soft text-accent font-medium' : 'text-text-muted'}`}>
              {i + 1}. {s}
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="h-12 border-b border-line-soft flex items-center px-6 gap-3 shrink-0 bg-surface-body">
          <span className="text-sm font-semibold text-text-primary">Tax Brackets</span>
          <span className="text-xs bg-surface-soft px-2 py-0.5 rounded text-text-dim">MCQ</span>
          <div className="ml-auto flex gap-2">
            <button className="text-xs bg-accent-soft text-accent px-3 py-1.5 rounded-lg font-medium">✦ AI</button>
            <button className="text-xs border border-line-soft px-3 py-1.5 rounded-lg text-text-dim">Preview</button>
          </div>
        </div>
        <div className="flex-1 p-8 overflow-y-auto bg-surface-body">
          <div className="max-w-2xl mx-auto space-y-4">
            <div>
              <label className="text-xs text-text-dim uppercase tracking-wider">Question</label>
              <div className="mt-1 p-3 border border-line-soft rounded-lg bg-surface-soft text-sm text-text-primary">
                At what income threshold does the 32.5% marginal tax rate begin in Australia?
              </div>
            </div>
            <div className="space-y-2">
              {['$18,201', '$45,001', '$120,001', '$180,001'].map((opt, i) => (
                <div key={i} className={`flex gap-3 items-center p-2.5 border rounded-lg ${i === 1 ? 'border-accent bg-accent-soft/20' : 'border-line-soft bg-surface-body'}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${i === 1 ? 'border-accent bg-accent' : 'border-line-soft'}`}>
                    {i === 1 && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth={3}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-text-primary">{opt}</span>
                  {i === 1 && <span className="ml-auto text-xs text-accent font-medium">Correct</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── SimEditorAI ───────────────────────────────── */
function SimEditorAI() {
  return (
    <div className="absolute inset-0 flex">
      {/* Slim slide list */}
      <div className="w-56 border-r border-line-soft bg-surface-soft flex flex-col shrink-0 p-4">
        <p className="text-xs font-mono uppercase tracking-wider text-text-dim mb-3">Slides</p>
        {['Intro: Income Types', 'Gross vs Net', 'Tax Brackets', 'PAYG System', 'Worked Example'].map((s, i) => (
          <div key={s} className={`px-3 py-2 rounded-lg text-sm mb-0.5 ${i === 2 ? 'bg-accent-soft text-accent font-medium' : 'text-text-muted'}`}>
            {i + 1}. {s}
          </div>
        ))}
      </div>

      {/* AI panel */}
      <div className="flex-1 flex flex-col bg-surface-body">
        <div className="h-12 border-b border-line-soft flex items-center px-6 gap-3 shrink-0">
          <span className="text-sm font-semibold text-accent">✦ AI Assistant</span>
          <span className="text-xs text-text-dim">Lesson Generator</span>
        </div>
        <div className="flex-1 p-5 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 space-y-4 overflow-hidden">
            {/* User message */}
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold shrink-0">HY</div>
              <div className="bg-surface-soft rounded-2xl rounded-tl-sm px-4 py-3 max-w-xs">
                <p className="text-sm text-text-primary">10-slide lesson on Australian income tax for Year 11. Cover marginal rates, PAYG withholding, and a worked example.</p>
              </div>
            </div>
            {/* AI response */}
            <div className="flex gap-3 flex-row-reverse">
              <div className="w-7 h-7 rounded-full bg-surface-soft border border-line-soft flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div className="bg-accent-soft border border-accent/20 rounded-2xl rounded-tr-sm px-4 py-3 max-w-xs">
                <p className="text-[11px] text-accent font-mono mb-2 tracking-wide">Planning lesson structure…</p>
                <p className="text-xs text-text-primary leading-relaxed">
                  1. What is income? (Text)<br/>
                  2. Gross vs net (Flashcard)<br/>
                  3. Tax brackets (Chart)<br/>
                  4. Marginal vs effective (MCQ)<br/>
                  5. PAYG withholding (Text)<br/>
                  6. Worked example (Table)<br/>
                  ...
                </p>
              </div>
            </div>
          </div>

          {/* Input */}
          <div data-sim-id="ai-input" className="border border-line-soft rounded-2xl p-4 bg-surface-raised shrink-0">
            <p className="text-sm text-text-dim">Ask me to generate or refine slides…</p>
            <div className="mt-3 flex justify-between items-center gap-3">
              <div className="flex gap-2">
                <button className="text-xs border border-line-soft px-2.5 py-1.5 rounded-lg text-text-dim">📎 PDF</button>
                <button className="text-xs border border-line-soft px-2.5 py-1.5 rounded-lg text-text-dim">10 slides ↕</button>
              </div>
              <button data-sim-id="ai-send-btn" className="bg-accent text-white px-4 py-2 rounded-xl text-sm font-semibold">
                Generate →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── SimFuture ─────────────────────────────────── */
const FUTURE_ITEMS = [
  { label: 'Live Kahoot-style Mode',    desc: 'Real-time quizzes, leaderboards, instant feedback — all built on actual course content.' },
  { label: 'AI Essay Marking',          desc: 'Students write long-form answers; a fine-tuned model grades and gives targeted, specific feedback.' },
  { label: 'Adaptive Practice',         desc: 'Difficulty adjusts per student based on quiz performance. Everyone works at exactly the right level.' },
  { label: 'Gamification',              desc: 'One shared currency across lessons, games and activities — points, streaks, leaderboards, all connected.' },
  { label: 'Assessment & Certification', desc: 'Formal assessments, marking rubrics, certificates, and school-level progress reporting.' },
];
function SimFuture() {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-16">
      <div className="max-w-2xl w-full">
        <p className="text-xs font-mono uppercase tracking-widest text-accent opacity-60 mb-4">Coming next</p>
        <h2 className="text-4xl font-serif font-bold text-text-primary mb-10">What's next for Caplet</h2>
        <div className="space-y-7">
          {FUTURE_ITEMS.map((p) => (
            <div key={p.label} className="flex gap-5 items-start">
              <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-accent" />
              </div>
              <div>
                <p className="font-semibold text-text-primary">{p.label}</p>
                <p className="text-sm text-text-muted mt-1 leading-relaxed">{p.desc}</p>
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
  const [viewOpacity, setViewOpacity] = useState(1);
  const [cursorPos, setCursorPos] = useState({
    x: typeof window !== 'undefined' ? window.innerWidth  * 0.88 : 800,
    y: typeof window !== 'undefined' ? window.innerHeight * 0.06 : 30,
  });
  const [cursorVisible, setCursorVisible] = useState(false);
  const [isClicking, setIsClicking]  = useState(false);
  const [rippleKey, setRippleKey]    = useState(0);
  const [showRipple, setShowRipple]  = useState(false);
  const [captionVis, setCaptionVis]  = useState(false);
  const [hoverSide, setHoverSide]    = useState(null);

  const scene       = SCENES[sceneIndex];
  const currentView = scene.view;
  const hasSimNav   = currentView !== 'editor' && currentView !== 'editor-ai';

  /* ── CSS keyframes ── */
  useEffect(() => {
    const ID = 'tour-kf';
    if (document.getElementById(ID)) return;
    const s = document.createElement('style');
    s.id = ID;
    s.textContent = `
      @keyframes simRipple    { from{transform:translate(-50%,-50%) scale(0.2);opacity:1} to{transform:translate(-50%,-50%) scale(3.2);opacity:0} }
      @keyframes simRippleBig { from{transform:translate(-50%,-50%) scale(0.1);opacity:.6} to{transform:translate(-50%,-50%) scale(3.8);opacity:0} }
    `;
    document.head.appendChild(s);
    return () => document.getElementById(ID)?.remove();
  }, []);

  /* ── Navigation ── */
  const prevScene = useCallback(() => setSceneIndex(i => Math.max(0, i - 1)), []);
  const nextScene = useCallback(() => {
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

    setCaptionVis(false);
    setIsClicking(false);
    setCursorVisible(true);

    const sc = SCENES[sceneIndex];

    setViewOpacity(0);
    delay(() => setViewOpacity(1), FADE_VIEW);

    if (!sc.cursor) {
      setCursorPos({ x: window.innerWidth * 0.52, y: window.innerHeight * 0.44 });
      delay(() => setCaptionVis(true), FADE_VIEW + CURSOR_MOVE + 80);
      return cleanup;
    }

    delay(() => {
      if (dead) return;
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
                delay(() => setCaptionVis(true), POST_CLICK + 60);
              }, CLICK_DOWN);
            }, CURSOR_MOVE + HOVER_PAUSE);
          } else {
            delay(() => setCaptionVis(true), CURSOR_MOVE + 240);
          }
        } else if (attempts++ < 30) {
          setTimeout(findAndGo, 80);
        } else {
          delay(() => setCaptionVis(true), 200);
        }
      };
      findAndGo();
    }, FADE_VIEW + 100);

    return cleanup;
  }, [sceneIndex]);

  return (
    /*
     * Tour container: height:100vh + overflow:hidden.
     * NOT position:fixed — App.jsx renders Tour without Navbar/Footer,
     * so this div IS the entire page and fills the viewport naturally.
     */
    <div style={{ height: '100vh', overflow: 'hidden', position: 'relative', background: 'var(--surface-base)' }}>

      {/* SimNavbar — fixed to top, z-index 50 matches real Navbar */}
      {hasSimNav && <SimNavbar active={scene.nav} />}

      {/* Page canvas — area below navbar */}
      <div
        style={{
          position: 'absolute',
          top: hasSimNav ? 60 : 0,
          left: 0, right: 0, bottom: 0,
          opacity: viewOpacity,
          transition: `opacity ${FADE_VIEW}ms ease`,
        }}
      >
        {currentView === 'home'         && <SimHome />}
        {currentView === 'courses'      && <SimCourses />}
        {currentView === 'lesson-intro' && <SimLessonIntro />}
        {currentView === 'lesson-mcq'   && <SimLessonMCQ />}
        {currentView === 'lesson-calc'  && <SimLessonCalc />}
        {currentView === 'classes'      && <SimClasses />}
        {currentView === 'editor'       && <SimEditor />}
        {currentView === 'editor-ai'    && <SimEditorAI />}
        {currentView === 'future'       && <SimFuture />}
      </div>

      {/* ── Overlays (all position:fixed so they sit above the simulated site) ── */}

      {/* Progress bar */}
      <ProgressBar current={sceneIndex} total={SCENES.length} />

      {/* Left half — go back */}
      <div
        onMouseEnter={() => setHoverSide('left')}
        onMouseLeave={() => setHoverSide(null)}
        onClick={prevScene}
        style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: '50%', zIndex: 200, cursor: sceneIndex > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', paddingLeft: 22 }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"
          style={{ opacity: hoverSide === 'left' && sceneIndex > 0 ? 0.7 : sceneIndex > 0 ? 0.18 : 0, transition: 'opacity 0.18s ease' }}
        >
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </div>

      {/* Right half — go forward */}
      <div
        onMouseEnter={() => setHoverSide('right')}
        onMouseLeave={() => setHoverSide(null)}
        onClick={nextScene}
        style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: '50%', zIndex: 200, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 22 }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"
          style={{ opacity: hoverSide === 'right' ? 0.7 : 0.18, transition: 'opacity 0.18s ease' }}
        >
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>

      {/* Close button — top right, above nav zones */}
      <button
        onClick={() => navigate('/')}
        style={{ position: 'fixed', top: 11, right: 16, zIndex: 9990, background: 'rgba(0,0,0,0.44)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.13)', color: 'white', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
      >×</button>

      {/* Scene counter — bottom right, above caption */}
      <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9990, background: 'rgba(0,0,0,0.44)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.65)', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.06em', pointerEvents: 'none' }}>
        {sceneIndex + 1} / {SCENES.length}
      </div>

      {/* Caption */}
      <Caption title={scene.caption.title} body={scene.caption.body} visible={captionVis} />

      {/* Virtual cursor */}
      <VirtualCursor x={cursorPos.x} y={cursorPos.y} visible={cursorVisible} clicking={isClicking} />

      {/* Click ripple */}
      {showRipple && <ClickRipple key={rippleKey} x={cursorPos.x} y={cursorPos.y} />}
    </div>
  );
}
