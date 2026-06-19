/**
 * /tour — standalone demo page. Simulated pages copy exact HTML/CSS from
 * the real Caplet pages (section-kicker, huge serif headings, p-12 cards, etc.)
 * App.jsx renders /tour in its own <Routes> without Navbar/Footer.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

/* ─────────────────────────── Timing ────────────────────────────────────── */
const CURSOR_MOVE  = 680;
const HOVER_PAUSE  = 360;
const CLICK_DOWN   = 110;
const POST_CLICK   = 280;
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
    id: 'enter-course', view: 'courses', nav: 'curriculum', cursor: 'course-card-1', clickAnim: true,
    caption: { title: 'Course Library', body: 'Courses are split into focused modules. Click a course to see its full lesson outline.' },
  },
  {
    id: 'course-detail', view: 'course-detail', nav: 'curriculum', cursor: 'lesson-link', clickAnim: true,
    caption: { title: 'Modules & Lessons', body: 'Each course is broken into modules. Progress is tracked per lesson — students always pick up exactly where they left off.' },
  },
  {
    id: 'lesson-intro', view: 'lesson-intro', nav: 'curriculum', cursor: 'lesson-next-btn', clickAnim: true,
    caption: { title: 'Inside a Lesson', body: 'Each lesson loads fully upfront — no waiting. Arrow keys or the footer buttons move between slides.' },
  },
  {
    id: 'lesson-mcq', view: 'lesson-mcq', nav: 'curriculum', cursor: 'lesson-option-c', clickAnim: true,
    caption: { title: '15 Slide Types', body: 'Multiple choice, flashcards, drag-to-match, fill-in-the-blank, Desmos graphs, diagrams, PhET simulations, hotspot annotations, and more.' },
  },
  {
    id: 'lesson-calc', view: 'lesson-calc', nav: 'curriculum', cursor: 'calc-btn', clickAnim: true,
    caption: { title: 'Built-in Calculator', body: "A floating Desmos graphing and scientific calculator on every lesson. Pop it up, close it — it remembers everything." },
  },
  {
    id: 'academy', view: 'classes', nav: 'academy', cursor: 'nav-academy', clickAnim: true,
    caption: { title: 'The Academy', body: 'The classroom management layer. Teachers create a class, students join with a code, progress is tracked privately.' },
  },
  {
    id: 'classes-create', view: 'classes', nav: 'academy', cursor: 'academy-create-btn', clickAnim: true,
    caption: { title: 'Class Management', body: "One click to establish a class, share the passkey. Track every student's progress privately, post announcements, assign specific lessons." },
  },
  {
    id: 'editor', view: 'editor', nav: null, cursor: 'editor-lesson-row', clickAnim: true,
    caption: { title: 'Lesson Creator', body: "The editor is gated by access code. Full course hierarchy: courses → modules → lessons. Drag, reorder, edit any slide type." },
  },
  {
    id: 'editor-ai', view: 'editor-ai', nav: null, cursor: 'ai-send-btn', clickAnim: true,
    caption: { title: 'AI Generation', body: 'Paste curriculum notes or upload a PDF. AI plans the lesson in natural text first, then converts it to structured slides — coherent output, every time.' },
  },
  {
    id: 'future', view: 'future', nav: null, cursor: null, clickAnim: false,
    caption: { title: "That's Caplet", body: "Live today for students and teachers. Here's where we're heading." },
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
      transition: [`left ${CURSOR_MOVE}ms cubic-bezier(0.42,0,0.18,1.0)`,`top ${CURSOR_MOVE}ms cubic-bezier(0.42,0,0.18,1.0)`,'opacity 0.3s ease'].join(', '),
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
      <div style={{ background: 'rgba(6,6,10,0.85)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: '14px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <p style={{ margin: '0 0 4px', fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.38)' }}>Caplet Demo</p>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'white', lineHeight: 1.2 }}>{title}</h3>
        {body && <p style={{ margin: '5px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.63)', lineHeight: 1.56 }}>{body}</p>}
      </div>
    </div>
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
/* Exact copy of real Navbar HTML structure */
function SimNavbar({ active }) {
  const { isDark, toggleTheme } = useTheme();
  const navItems = [
    { label: 'Curriculum', id: 'curriculum' },
    { label: 'Academy',    id: 'academy' },
    { label: 'Instruments', id: 'instruments' },
  ];
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-surface-body/95 backdrop-blur-2xl shadow-[0_1px_0_var(--line-soft),0_4px_24px_rgba(0,0,0,0.06)] text-text-primary">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
        <div className="h-14 md:h-[60px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden ring-1 ring-line-soft">
              <img src="/logo.png" alt="Caplet" className="w-full h-full object-contain" />
            </div>
            <span className="text-lg md:text-xl font-serif italic font-bold tracking-tight text-text-primary">Caplet.</span>
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
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute inset-0 opacity-80" style={{ background: `linear-gradient(${hue1}deg, hsl(${hue1},70%,85%) 0%, hsl(${hue2},70%,90%) 50%, hsl(${hue3},70%,95%) 100%)` }} />
      <div className="absolute top-[-20%] left-[-20%] w-[100%] h-[100%] rounded-full blur-[80px] mix-blend-multiply opacity-60" style={{ background: `hsl(${hue2},80%,75%)` }} />
      <div className="absolute bottom-[-30%] right-[-10%] w-[120%] h-[120%] rounded-full blur-[100px] mix-blend-screen opacity-40" style={{ background: `hsl(${hue3},60%,85%)` }} />
      <div className="absolute inset-0 flex items-center justify-center opacity-10">
        <span className="text-[8rem] font-serif italic select-none">{title.charAt(0)}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────── SimHome ───────────────────────────────────── */
function SimHome() {
  return (
    <div className="absolute inset-0 bg-surface-body flex flex-col items-center justify-center text-center px-6 md:px-12 lg:px-20 gap-8">
      <div className="max-w-3xl w-full">
        <span className="section-kicker">Financial literacy for Australian students</span>
        <h1 className="text-6xl md:text-8xl font-serif font-bold text-text-primary leading-tight mb-8">
          Learning that<br />actually sticks.
        </h1>
        <p className="text-2xl text-text-muted font-serif italic max-w-xl mx-auto leading-relaxed mb-12">
          Structured courses, interactive lessons, and a built-in classroom system.
        </p>
        <div className="flex gap-4 justify-center">
          <button className="btn-primary">Get started free</button>
          <button className="btn-secondary">Explore curriculum →</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── SimCourses ────────────────────────────────── */
const SIM_COURSES = [
  { id: 1, title: 'Money Basics',       level: 'Beginner',     duration: 45, lessons: 16, desc: 'Understand how money actually works — income, spending, saving, and the basics every Australian student needs.' },
  { id: 2, title: 'Tax & Super',        level: 'Intermediate',  duration: 38, lessons: 12, desc: 'Break down the Australian tax system, PAYG withholding, and why superannuation matters more than most people think.' },
  { id: 3, title: 'Investing Basics',   level: 'Advanced',     duration: 52, lessons: 20, desc: 'From compound interest to ETFs and property — building real wealth over time using evidence-based strategies.' },
];

function SimCourses() {
  return (
    <div className="absolute inset-0 bg-surface-body overflow-hidden selection:bg-accent selection:text-white">
      <div className="container-custom py-12">
        <header className="mb-10">
          <span className="section-kicker">Library</span>
          <h1 className="text-6xl md:text-7xl font-serif font-bold text-text-primary mb-5">
            Curriculum.
          </h1>
          <p className="text-xl text-text-muted font-serif italic max-w-xl leading-relaxed">
            Browse our course library designed for Australian learners.
          </p>
        </header>
        <div data-sim-id="courses-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-line-soft border border-line-soft">
          {SIM_COURSES.map((course) => (
            <div key={course.id} data-sim-id={course.id === 1 ? 'course-card-1' : undefined} className="bg-surface-body p-10 group cursor-default transition-all duration-700 hover:bg-surface-raised flex flex-col">
              <div className="flex justify-between items-start mb-8">
                <span className="text-sm font-medium text-accent border-b border-accent pb-1">{course.level}</span>
              </div>
              <div className="aspect-[16/9] w-full mb-8 overflow-hidden bg-surface-soft border border-line-soft rounded-[1.5rem]">
                <CourseCover title={course.title} />
              </div>
              <h3 className="text-xl font-bold mb-5 group-hover:text-accent transition-colors duration-500">{course.title}</h3>
              <p className="text-sm font-medium text-text-muted leading-relaxed mb-8 line-clamp-2">{course.desc}</p>
              <div className="mt-auto">
                <div className="flex items-center gap-3 text-sm font-medium text-text-dim mb-6">
                  <span>{course.duration}m</span>
                  <span className="w-1 h-1 bg-text-dim rounded-full" />
                  <span>{course.lessons} lessons</span>
                </div>
                <div className="flex items-center justify-between pt-6 border-t border-line-soft">
                  <span className="text-sm font-medium group-hover:text-accent transition-colors duration-500">Enter Lesson →</span>
                  <svg className="w-4 h-4 text-text-dim group-hover:text-accent group-hover:translate-x-2 transition-all duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
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
/* Matches real course detail / ClassDetail page layout */
function SimCourseDetail() {
  const simModules = [
    {
      name: 'Budgeting Fundamentals',
      lessons: [
        { title: 'Introduction to Budgeting', duration: '4m', done: true },
        { title: 'The 50/30/20 Rule', duration: '5m', done: true },
        { title: 'Tracking Your Spending', duration: '6m', done: false, active: true },
      ],
    },
    {
      name: 'Income & Tax',
      lessons: [
        { title: 'Understanding Income', duration: '5m', done: false },
        { title: 'How Tax Brackets Work', duration: '7m', done: false },
        { title: 'PAYG Withholding', duration: '6m', done: false },
      ],
    },
    {
      name: 'Saving Strategies',
      lessons: [
        { title: 'Emergency Funds', duration: '4m', done: false },
        { title: 'Compound Interest', duration: '5m', done: false },
      ],
    },
  ];

  return (
    <div className="absolute inset-0 bg-surface-body overflow-hidden selection:bg-accent selection:text-white">
      <div className="container-custom py-12">
        {/* Course header */}
        <header className="mb-10">
          <span className="section-kicker">Money Basics</span>
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-text-primary mb-4 leading-tight">
            Course overview
          </h1>
          <p className="text-lg text-text-muted font-serif italic max-w-xl leading-relaxed">
            Understand how money works — income, spending, saving, and the basics every Australian student needs.
          </p>
          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 max-w-xs h-1.5 bg-line-soft rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: '25%' }} />
            </div>
            <span className="text-sm font-medium text-text-dim">2 / 8 lessons complete</span>
          </div>
        </header>

        {/* Module accordion */}
        <div className="space-y-4">
          {simModules.map((mod) => (
            <div key={mod.name} className="rounded-2xl border border-line-soft overflow-hidden bg-surface-raised">
              <div className="flex items-center justify-between px-6 py-4 border-b border-line-soft bg-surface-soft/40">
                <h2 className="text-sm font-semibold text-text-muted tracking-wide">{mod.name}</h2>
                <span className="text-xs text-text-dim font-mono">{mod.lessons.length} lessons</span>
              </div>
              <div>
                {mod.lessons.map((lesson, li) => (
                  <div
                    key={lesson.title}
                    data-sim-id={lesson.active ? 'lesson-link' : undefined}
                    className={`flex items-center gap-4 px-6 py-4 border-t border-line-soft/40 first:border-t-0 hover:bg-surface-soft/60 transition-colors cursor-default ${lesson.active ? 'bg-accent/[0.03]' : ''}`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${lesson.done ? 'border-accent bg-accent' : lesson.active ? 'border-accent' : 'border-line-soft'}`}>
                      {lesson.done && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
                      )}
                    </div>
                    <span className={`flex-1 text-sm font-medium ${lesson.done ? 'text-text-dim line-through' : lesson.active ? 'text-accent' : 'text-text-primary'}`}>
                      {lesson.title}
                    </span>
                    <span className="text-xs text-text-dim font-medium shrink-0">{lesson.duration}</span>
                    <svg className={`w-4 h-4 shrink-0 ${lesson.active ? 'text-accent' : 'text-text-dim'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── SimLesson (shell) ─────────────────────────── */
/* Matches real LessonPlayer layout exactly */
function SimLessonShell({ slideIdx = 0, totalSlides = 6, showCalc = false, children }) {
  const BARS = Array.from({ length: totalSlides });
  return (
    <div className="absolute inset-0 flex flex-col bg-surface-body text-text-primary overflow-hidden">
      {/* Sub-header — matches real LessonPlayer header */}
      <header className="shrink-0 bg-surface-body/95 backdrop-blur-md border-b border-line-soft">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
          <div className="h-14 md:h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-5 min-w-0">
              <div className="shrink-0 w-9 h-9 rounded-full border border-line-soft text-text-muted flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </div>
              <div className="hidden md:block min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium text-text-dim mb-0.5">
                  <span>Money Basics</span>
                  <span className="text-text-dim/50">/</span>
                  <span>Budgeting</span>
                </div>
                <p className="text-sm font-serif italic text-text-primary truncate max-w-md">Understanding Income &amp; Tax</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button data-sim-id="calc-btn" className="shrink-0 w-9 h-9 rounded-full border border-line-soft flex items-center justify-center text-text-dim hover:text-text-primary hover:border-text-dim transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" strokeWidth={1.8}/><path d="M8 6h8M8 10h8M8 14h4" strokeWidth={1.8}/></svg>
              </button>
              <span className="text-xs font-medium text-text-dim tabular-nums">{slideIdx + 1} / {totalSlides}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Slide ticker — thin bars, exactly like the real one */}
      <div className="shrink-0 flex items-center gap-1 w-full px-4 md:px-8 lg:px-12 py-0">
        {BARS.map((_, i) => (
          <button key={i} type="button" className="group relative flex-1 py-2.5">
            <span className={`block rounded-full transition-all duration-300 ${
              i <= slideIdx ? 'bg-accent' : 'bg-line-soft'
            } ${i === slideIdx ? 'h-[5px]' : 'h-[3px] group-hover:h-[4px]'}`} />
          </button>
        ))}
      </div>

      {/* Slide canvas */}
      <div className="flex-1 relative overflow-hidden">
        {children}
        {/* Floating calculator */}
        {showCalc && (
          <div className="absolute top-6 right-6 w-60 h-52 bg-surface-raised border border-line-soft rounded-2xl shadow-2xl overflow-hidden" style={{ zIndex: 20 }}>
            <div className="h-8 bg-surface-soft border-b border-line-soft flex items-center px-3 gap-2">
              <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400"/><div className="w-2.5 h-2.5 rounded-full bg-yellow-400"/><div className="w-2.5 h-2.5 rounded-full bg-green-400"/></div>
              <span className="text-xs text-text-dim ml-1">Scientific</span>
            </div>
            <div className="p-2.5 grid grid-cols-4 gap-1">
              {['sin','cos','tan','(','7','8','9','÷','4','5','6','×','1','2','3','−','0','.','=','+'].map((k,i) => (
                <div key={i} className="h-6 rounded-md bg-surface-soft flex items-center justify-center text-xs text-text-muted">{k}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="shrink-0 border-t border-line-soft">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-12">
          <div className="h-16 flex items-center justify-between">
            <button className="flex items-center gap-2 text-sm font-medium text-text-dim hover:text-text-primary transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Previous
            </button>
            <button data-sim-id="lesson-next-btn" className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-strong transition-colors">
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SimLessonIntro() {
  return (
    <SimLessonShell slideIdx={0}>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center gap-5 max-w-3xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Text</p>
        <h2 className="text-3xl md:text-4xl font-serif italic font-bold text-text-primary">Understanding Income &amp; Tax</h2>
        <p className="text-lg text-text-muted leading-relaxed max-w-xl">
          Before you manage money well, you need to understand where it comes from — and where it goes. In Australia, every dollar you earn is subject to the income tax system.
        </p>
        <p className="text-base text-text-muted leading-relaxed max-w-xl">
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
    <SimLessonShell slideIdx={2}>
      <div className="absolute inset-0 flex items-center justify-center px-8">
        <div className="w-full max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-3">Multiple Choice</p>
          <h2 className="text-2xl font-serif italic font-bold text-text-primary mb-7 leading-snug">
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
    <SimLessonShell slideIdx={2} showCalc>
      <div className="absolute inset-0 flex items-center justify-center px-8">
        <div className="w-full max-w-2xl opacity-30">
          <h2 className="text-2xl font-serif italic font-bold text-text-primary leading-snug">
            Which of the following is NOT a feature of Australia's superannuation system?
          </h2>
        </div>
      </div>
    </SimLessonShell>
  );
}

/* ─────────────────────────── SimClasses ────────────────────────────────── */
/* Matches real Classes page exactly */
function SimClasses() {
  const simClasses = [
    { name: 'Year 11 Commerce A', code: 'CAP-4821' },
    { name: 'Year 12 Economics',  code: 'CAP-7193' },
  ];
  return (
    <div className="absolute inset-0 bg-surface-body overflow-hidden selection:bg-accent selection:text-white">
      <div className="container-custom py-12">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <span className="section-kicker">Faculty Admissions</span>
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-text-primary mb-5">
              The Academy.
            </h1>
            <p className="text-xl text-text-muted font-serif italic max-w-xl leading-relaxed">
              Collaborative learning environments structured for peer progression and academic leadership.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button data-sim-id="academy-create-btn" className="btn-secondary px-6 py-2.5 text-sm">Establish Class</button>
            <button className="btn-primary px-6 py-2.5 text-sm gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Join Class
            </button>
          </div>
        </header>

        <h2 className="text-sm font-semibold text-accent mb-8 border-b border-line-soft pb-4">Leadership Portfolio</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line-soft border border-line-soft">
          {simClasses.map((cls) => (
            <div key={cls.name} className="bg-surface-body p-10 group transition-all duration-700 hover:bg-surface-raised flex flex-col justify-between cursor-default">
              <div>
                <div className="flex justify-between items-start mb-8">
                  <h3 className="text-2xl md:text-3xl font-serif italic group-hover:translate-x-2 transition-transform duration-700">{cls.name}</h3>
                  <span className="text-xs font-medium px-3 py-1 bg-text-primary text-surface-body group-hover:bg-accent transition-colors shrink-0 ml-4">Owner</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-8 border-t border-line-soft">
                <span className="text-sm font-medium text-text-dim">Passkey Protocol:</span>
                <span className="text-xs font-bold font-mono tracking-widest text-text-primary group-hover:text-accent transition-colors">{cls.code}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── SimEditor ─────────────────────────────────── */
/* Matches real Editor workspace overview — centered max-w-3xl, grid-technical header */
function SimEditor() {
  const simCourses = [
    { name: 'Money Basics',  modules: 3, lessons: 16, published: true,
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
      {/* Top bar — matches real editor header in workspace mode */}
      <header className="shrink-0 border-b border-line-soft bg-surface-body/95 backdrop-blur-md">
        <div className="px-4 md:px-6 h-12 flex items-center gap-2 min-w-0">
          <p className="font-mono text-[10px] font-medium text-accent/60 uppercase tracking-[0.18em]">Workspace</p>
          <div className="ml-auto flex items-center gap-2">
            <button className="h-7 px-3 rounded-md border border-line-soft text-[12px] font-medium text-text-dim hover:text-text-primary transition-colors">Refresh</button>
            <button className="h-7 px-3 rounded-md border border-line-soft text-[12px] font-medium text-text-dim hover:text-text-primary transition-colors">Leave</button>
          </div>
        </div>
      </header>

      {/* WorkspaceOverview — matches real WorkspaceOverview component */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-surface-body">
        {/* Page header with grid-technical background */}
        <div className="relative border-b border-line-soft overflow-hidden">
          <div className="absolute inset-0 grid-technical opacity-[0.12] pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface-body to-transparent pointer-events-none" />
          <div className="relative max-w-3xl mx-auto px-6 md:px-10 pt-14 pb-12">
            <p className="font-mono text-[10px] font-medium text-accent/60 uppercase tracking-[0.22em] mb-5">Lesson workspace</p>
            <div className="flex items-end justify-between gap-8">
              <div className="min-w-0">
                <h1 className="text-[2.75rem] font-display font-bold text-text-primary tracking-tight leading-none mb-3">Your courses</h1>
                <p className="text-[14px] font-serif italic text-text-dim leading-relaxed">Build, organise, and publish lessons for your students.</p>
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

        {/* Course cards — matching real WorkspaceOverview card structure */}
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-10 space-y-5">
          {simCourses.map((c, ci) => (
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
                            className={`flex items-center gap-4 px-6 py-4 hover:bg-surface-soft/60 transition-colors text-left ${isActive ? 'bg-accent/[0.04]' : ''}`}
                          >
                            <span className="font-mono text-xs text-text-dim w-5 shrink-0 select-none">{String(li + 1).padStart(2, '0')}</span>
                            <span className={`flex-1 text-sm font-medium truncate ${isActive ? 'text-accent' : 'text-text-primary'}`}>{l}</span>
                            <svg className="shrink-0 text-text-dim" width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
/* Matches real Editor in lesson mode with AI panel open */
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
      {/* Lesson mode header — matches real editor header when inLessonMode */}
      <header className="shrink-0 border-b border-line-soft bg-surface-body/95 backdrop-blur-md">
        <div className="px-4 md:px-6 h-12 flex items-center gap-2 md:gap-3 min-w-0">
          <button className="shrink-0 text-[13px] font-medium text-text-dim hover:text-text-primary transition-colors">← Workspace</button>
          <span className="shrink-0 w-px h-3.5 bg-line-soft" />
          <span className="text-[13px] font-serif italic text-text-dim truncate max-w-[120px]">Money Basics</span>
          <span className="text-text-dim/40 shrink-0 text-[11px]">/</span>
          <span className="text-[13px] font-serif italic text-text-dim truncate max-w-[120px]">Income &amp; Tax</span>
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            {/* AI button — active state */}
            <button className="h-8 px-3 rounded-full border border-accent/60 bg-accent/[0.08] text-accent text-sm font-medium flex items-center gap-1.5">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 0.75 L6.4 3.6 L9.25 5.5 L6.4 7.4 L5.5 10.25 L4.6 7.4 L1.75 5.5 L4.6 3.6 Z" fill="currentColor" /></svg>
              AI
            </button>
            <button className="h-8 px-3 rounded-full border border-line-soft text-text-muted text-sm font-medium hover:text-text-primary transition-colors">Preview</button>
            <button className="h-8 px-4 btn-primary text-sm font-medium opacity-40">Saved</button>
            <button className="h-8 w-8 rounded-full border border-line-soft text-text-dim flex items-center justify-center text-base">×</button>
          </div>
        </div>
      </header>

      {/* Lesson builder + AI panel */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Slide list — matches real LessonBuilder left panel */}
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

        {/* AI chat panel — right side */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* User message */}
            <div className="flex gap-3 items-start">
              <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">HY</div>
              <div className="bg-surface-soft border border-line-soft/60 rounded-2xl rounded-tl-sm px-4 py-3 max-w-sm">
                <p className="text-sm text-text-primary leading-relaxed">Generate a 10-slide lesson on Australian income tax for Year 11. Include marginal rates, PAYG withholding, and a worked example.</p>
              </div>
            </div>
            {/* AI response */}
            <div className="flex gap-3 items-start flex-row-reverse">
              <div className="w-7 h-7 rounded-full bg-surface-soft border border-line-soft flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3.5 h-3.5 text-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
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

          {/* Chat input */}
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

/* ─────────────────────────── SimFuture ─────────────────────────────────── */
const FUTURE_ITEMS = [
  { label: 'Live Kahoot-style Mode',     desc: 'Real-time quizzes, leaderboards, instant feedback — all built on actual course content.' },
  { label: 'AI Essay Marking',           desc: 'Students write long-form answers; a fine-tuned model grades and gives targeted, specific feedback.' },
  { label: 'Adaptive Practice',          desc: 'Difficulty adjusts per student based on quiz performance. Everyone works at exactly the right level.' },
  { label: 'Gamification',               desc: 'One shared currency across lessons, games and activities — points, streaks, leaderboards, all connected.' },
  { label: 'Assessment & Certification', desc: 'Formal assessments, marking rubrics, certificates, and school-level progress reporting.' },
];
function SimFuture() {
  return (
    <div className="absolute inset-0 bg-surface-body flex items-center justify-center px-6 md:px-12 lg:px-20">
      <div className="max-w-2xl w-full">
        <span className="section-kicker">Coming next</span>
        <h2 className="text-5xl md:text-6xl font-serif font-bold text-text-primary mb-10">What's next<br />for Caplet</h2>
        <div className="space-y-6">
          {FUTURE_ITEMS.map((p) => (
            <div key={p.label} className="flex gap-5 items-start border-b border-line-soft pb-6 last:border-b-0 last:pb-0">
              <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-2.5" />
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
    y: typeof window !== 'undefined' ? window.innerHeight * 0.04 : 30,
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
    <div style={{ height: '100vh', overflow: 'hidden', position: 'relative', background: 'var(--surface-base)' }}>

      {/* SimNavbar — fixed, z-50, matches real Navbar */}
      {hasSimNav && <SimNavbar active={scene.nav} />}

      {/* Page canvas */}
      <div style={{
        position: 'absolute', top: hasSimNav ? 60 : 0, left: 0, right: 0, bottom: 0,
        opacity: viewOpacity, transition: `opacity ${FADE_VIEW}ms ease`,
      }}>
        {currentView === 'home'          && <SimHome />}
        {currentView === 'courses'       && <SimCourses />}
        {currentView === 'course-detail' && <SimCourseDetail />}
        {currentView === 'lesson-intro'  && <SimLessonIntro />}
        {currentView === 'lesson-mcq'   && <SimLessonMCQ />}
        {currentView === 'lesson-calc'  && <SimLessonCalc />}
        {currentView === 'classes'      && <SimClasses />}
        {currentView === 'editor'       && <SimEditor />}
        {currentView === 'editor-ai'    && <SimEditorAI />}
        {currentView === 'future'       && <SimFuture />}
      </div>

      {/* ── Fixed overlays ── */}
      <ProgressBar current={sceneIndex} total={SCENES.length} />

      {/* Left gradient strip — back */}
      <div
        onMouseEnter={() => setHoverSide('left')}
        onMouseLeave={() => setHoverSide(null)}
        onClick={prevScene}
        style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, width: 220,
          zIndex: 200,
          cursor: sceneIndex > 0 ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', paddingLeft: 22,
          background: sceneIndex > 0
            ? hoverSide === 'left'
              ? 'linear-gradient(to right, rgba(0,0,0,0.36) 0%, rgba(0,0,0,0.10) 55%, transparent 100%)'
              : 'linear-gradient(to right, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.04) 55%, transparent 100%)'
            : 'transparent',
          transition: 'background 0.28s ease',
          pointerEvents: sceneIndex > 0 ? 'auto' : 'none',
        }}
      >
        <svg
          width="26" height="26" viewBox="0 0 24 24" fill="none"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          style={{
            stroke: 'white',
            filter: 'drop-shadow(0 1px 6px rgba(0,0,0,0.55))',
            opacity: sceneIndex > 0 ? (hoverSide === 'left' ? 1 : 0.55) : 0,
            transition: 'opacity 0.22s ease',
            flexShrink: 0,
          }}
        ><polyline points="15 18 9 12 15 6" /></svg>
      </div>

      {/* Right gradient strip — forward */}
      <div
        onMouseEnter={() => setHoverSide('right')}
        onMouseLeave={() => setHoverSide(null)}
        onClick={nextScene}
        style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, width: 220,
          zIndex: 200,
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 22,
          background: hoverSide === 'right'
            ? 'linear-gradient(to left, rgba(0,0,0,0.36) 0%, rgba(0,0,0,0.10) 55%, transparent 100%)'
            : 'linear-gradient(to left, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.04) 55%, transparent 100%)',
          transition: 'background 0.28s ease',
        }}
      >
        <svg
          width="26" height="26" viewBox="0 0 24 24" fill="none"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          style={{
            stroke: 'white',
            filter: 'drop-shadow(0 1px 6px rgba(0,0,0,0.55))',
            opacity: hoverSide === 'right' ? 1 : 0.55,
            transition: 'opacity 0.22s ease',
            flexShrink: 0,
          }}
        ><polyline points="9 18 15 12 9 6" /></svg>
      </div>

      {/* Close button */}
      <button onClick={() => navigate('/')}
        style={{ position: 'fixed', top: 11, right: 16, zIndex: 9990, background: 'rgba(0,0,0,0.44)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.13)', color: 'white', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
      >×</button>

      {/* Scene counter — bottom right */}
      <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 9990, background: 'rgba(0,0,0,0.44)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.13)', color: 'rgba(255,255,255,0.65)', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.06em', pointerEvents: 'none' }}>
        {sceneIndex + 1} / {SCENES.length}
      </div>

      {/* Caption */}
      <Caption title={scene.caption.title} body={scene.caption.body} visible={captionVis} />

      {/* Virtual cursor */}
      <VirtualCursor x={cursorPos.x} y={cursorPos.y} visible={cursorVisible} clicking={isClicking} />

      {/* Ripple */}
      {showRipple && <ClickRipple key={rippleKey} x={cursorPos.x} y={cursorPos.y} />}
    </div>
  );
}
