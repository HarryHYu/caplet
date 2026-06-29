/**
 * /demo — standalone demo page. Sim components copy the exact HTML/CSS from
 * real Caplet pages. Data is fake / hardcoded for demo purposes.
 * App.jsx renders /demo without the global Navbar / Footer.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

/* ─────────────────────────── Timing ────────────────────────────────────── */
const CURSOR_MOVE = 680;
const HOVER_PAUSE = 360;
const CLICK_DOWN  = 110;
const POST_CLICK  = 280;
const FADE_VIEW   = 200;
const TIP_OX = 3, TIP_OY = 2;

/* ─────────────────────────── Scenes ────────────────────────────────────── */
const SCENES = [
  {
    id: 'welcome', view: 'home', nav: null, cursor: null, clickAnim: false,
    caption: { title: 'Meet Caplet', body: "Caplet is being built to be the everything platform for structured learning — interactive courses, AI tools, live classrooms, and calculators — open for anyone to build on. Let me show you what's live today." },
  },
  {
    id: 'curriculum', view: 'courses', nav: 'curriculum', cursor: 'nav-curriculum', clickAnim: true,
    caption: { title: 'The Curriculum', body: "Structured, interactive courses — currently focused on financial literacy for Australian students. The same infrastructure works for any subject, any curriculum, anywhere." },
  },
  {
    id: 'enter-course', view: 'courses', nav: 'curriculum', cursor: 'course-card-1', clickAnim: true,
    caption: { title: 'Course Library', body: 'Courses split into focused modules. Progress is tracked per lesson — click any course to see its full outline and pick up right where you left off.' },
  },
  {
    id: 'course-detail', view: 'course-detail', nav: 'curriculum', cursor: 'module-card-1', clickAnim: true,
    caption: { title: 'Course Overview', body: 'Each course breaks into focused modules with a clean overview — outcomes, structure, time estimates. Click a module to drill into its lessons.' },
  },
  {
    id: 'module-detail', view: 'module-detail', nav: 'curriculum', cursor: 'lesson-link', clickAnim: true,
    caption: { title: 'Modules & Lessons', body: 'Module-level progress, lesson completion status at a glance. Students always know exactly where they are and what comes next.' },
  },
  {
    id: 'lesson-intro', view: 'lesson-intro', nav: 'curriculum', cursor: 'lesson-next-btn', clickAnim: true,
    caption: { title: 'Inside a Lesson', body: 'Each lesson preloads entirely — zero waiting mid-slide. Arrow keys or the footer buttons navigate. No scrolling, no page reloads, no friction.' },
  },
  {
    id: 'lesson-mcq', view: 'lesson-mcq', nav: 'curriculum', cursor: 'lesson-option-c', clickAnim: true,
    caption: { title: '15 Slide Types', body: 'Multiple choice, flashcards, drag-to-match, fill-in-the-blank, Desmos graphs, PhET simulations, annotated hotspots, timelines, charts, and more. No other LMS ships this out of the box.' },
  },
  {
    id: 'lesson-calc', view: 'lesson-calc', nav: 'curriculum', cursor: 'calc-btn', clickAnim: true,
    caption: { title: 'Built-in Calculator', body: "A floating Desmos graphing and scientific calculator on every lesson, anywhere in the platform. Drag it, close it, reopen it — it remembers everything you typed." },
  },
  {
    id: 'academy', view: 'classes', nav: 'academy', cursor: 'nav-academy', clickAnim: true,
    caption: { title: 'The Academy', body: 'Classroom management built in. Teachers create a class, students join with a code, progress is tracked privately — no third-party tools needed.' },
  },
  {
    id: 'enter-class', view: 'classes', nav: 'academy', cursor: 'class-link', clickAnim: true,
    caption: { title: 'Your Classes', body: "Each class has a private stream for announcements, assignments and student responses. Everything is connected — assign a specific lesson with one click." },
  },
  {
    id: 'class-stream', view: 'class-detail', nav: 'academy', cursor: null, clickAnim: false,
    caption: { title: 'Class Stream', body: 'Announcements, assignments with due dates, student comments — all private to the class. Progress across every student is visible in one place.' },
  },
  {
    id: 'editor', view: 'editor', nav: null, cursor: 'editor-lesson-row', clickAnim: true,
    caption: { title: 'Lesson Creator', body: "The editor is access-code gated. Build the full hierarchy — courses, modules, lessons — then drag and reorder any slide type with a clean visual editor." },
  },
  {
    id: 'editor-ai', view: 'editor-ai', nav: null, cursor: 'ai-send-btn', clickAnim: true,
    caption: { title: 'AI Generation', body: 'Paste notes, upload a PDF, pick a model. The AI plans the lesson in plain text first, then structures it into slides — two-stage pipeline, up to 40 slides, 30,000 character input.' },
  },
  {
    id: 'future', view: 'future', nav: null, cursor: null, clickAnim: false,
    caption: { title: "This Is Just v1", body: "Live AI marking, real-time quiz sessions, adaptive practice, certifications, gamification — and an open API so anyone can build on Caplet. We're building the infrastructure for the future of structured learning." },
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
function AvatarGuide({ title, body, visible, talking }) {
  return (
    <>
      {/* ── Speech bubble — floats above the pill, always centered ── */}
      <div style={{
        position: 'fixed',
        bottom: 174,
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.38s ease, transform 0.42s cubic-bezier(0.34,1.56,0.64,1)',
        zIndex: 9900, pointerEvents: 'none',
        maxWidth: 520, width: 'calc(100vw - 180px)',
      }}>
        <div style={{
          background: 'rgba(6,6,14,0.93)',
          backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 20, padding: '14px 22px 16px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(99,102,241,0.12)',
          position: 'relative',
        }}>
          {/* Downward tail toward the pill */}
          <div style={{
            position: 'absolute', bottom: -13, left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '11px solid transparent',
            borderRight: '11px solid transparent',
            borderTop: '13px solid rgba(6,6,14,0.93)',
          }}/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6366f1', display: 'inline-block', flexShrink: 0, boxShadow: '0 0 6px rgba(99,102,241,0.9)' }}/>
            <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'rgba(165,180,252,0.78)' }}>
              {title}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.90)', lineHeight: 1.65 }}>
            {body}
          </p>
        </div>
      </div>

      {/* ── Pill avatar — always visible, always bobbing, centered bottom ── */}
      <div style={{
        position: 'fixed',
        bottom: 14, left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9901, pointerEvents: 'none',
        animation: 'avBob 2.8s ease-in-out infinite',
        filter: 'drop-shadow(0 10px 32px rgba(99,102,241,0.7)) drop-shadow(0 2px 8px rgba(0,0,0,0.4))',
      }}>
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
      </div>
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
      <section className="relative h-full flex items-center overflow-hidden">
        <div className="absolute inset-0 grid-technical opacity-40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface-body pointer-events-none" />
        <div className="container-custom relative z-10 w-full text-center py-32">
          <div className="max-w-4xl mx-auto text-text-primary">
            <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-display font-bold leading-[0.9] tracking-tighter mb-8">
              Money,<br />
              <span className="font-serif italic font-medium text-accent-strong">Simplified.</span>
            </h1>
            <p className="text-xl sm:text-2xl font-display font-medium max-w-2xl mx-auto text-text-muted leading-relaxed mb-12">
              Structured financial education for Australians.<br />
              No products. No catch. Just clarity.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <button className="bg-accent hover:bg-accent-strong text-white font-display font-semibold px-10 py-5 rounded-full transition-all duration-300 shadow-xl">
                Get Started Free
              </button>
              <button className="text-text-muted hover:text-text-primary font-display font-bold text-sm transition-all duration-300 py-4 px-6">
                Browse Registry <span>&rarr;</span>
              </button>
            </div>
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
          <span className="section-kicker">Library</span>
          <h1 className="text-6xl md:text-8xl mb-12">Curriculum.</h1>
          <p className="text-2xl text-text-muted font-serif italic max-w-xl leading-relaxed">
            Browse our course library designed for Australian learners.
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
                <p className="text-sm font-serif italic text-text-primary truncate max-w-md">Tracking Your Spending</p>
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
        <h2 className="text-3xl md:text-4xl font-serif italic font-bold text-text-primary leading-snug">Tracking Your Spending</h2>
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
    <SimLessonShell slideIdx={2} showCalc slideLabel="Multiple Choice">
      <div className="absolute inset-0 flex items-center justify-center px-8">
        <div className="w-full max-w-2xl opacity-25">
          <h2 className="text-2xl font-serif italic font-bold text-text-primary leading-snug">
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
            <span className="section-kicker">Faculty Admissions</span>
            <h1 className="text-6xl md:text-8xl mb-12">The Academy.</h1>
            <p className="text-2xl text-text-muted font-serif italic max-w-xl leading-relaxed">
              Collaborative learning environments structured for peer progression and academic leadership.
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

        {/* Leadership Portfolio */}
        <section className="mb-16">
          <h2 className="text-sm font-semibold text-accent mb-12 border-b border-line-soft pb-6">Leadership Portfolio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-line-soft border border-line-soft">
            {simTeachingClasses.map((cls) => (
              <div
                key={cls.name}
                data-sim-id={cls.code === 'CAP-4821' ? 'class-link' : undefined}
                className="bg-surface-body p-12 group transition-all duration-700 hover:bg-surface-raised flex flex-col justify-between cursor-default"
              >
                <div>
                  <div className="flex justify-between items-start mb-12">
                    <h3 className="text-3xl font-serif italic group-hover:translate-x-2 transition-transform duration-700">{cls.name}</h3>
                    <span className="text-xs font-medium px-3 py-1 bg-text-primary text-surface-body group-hover:bg-accent transition-colors">Owner</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-12 border-t border-line-soft">
                  <span className="text-sm font-medium text-text-dim">Passkey Protocol:</span>
                  <span className="text-xs font-bold font-mono tracking-widest text-text-primary group-hover:text-accent transition-colors">{cls.code}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Enrollment Registry */}
        <section>
          <h2 className="text-sm font-semibold text-accent mb-12 border-b border-line-soft pb-6">Enrollment Registry</h2>
          <div className="p-24 border border-line-soft text-center bg-surface-soft">
            <p className="text-sm font-medium text-text-dim italic">Awaiting first academy registration.</p>
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
        <div className="bg-surface-body border border-line-soft p-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            <div className="flex-1">
              <button className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-text-dim hover:text-accent transition-colors">
                ← Back to Classes
              </button>
              <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary mb-4">Year 11 Commerce A</h1>
              <p className="text-sm font-medium text-text-muted leading-relaxed max-w-2xl">
                Financial literacy and economic principles for Year 11 Commerce students.
              </p>
              <div className="mt-8 inline-flex items-center gap-4 px-5 py-3 bg-surface-soft border border-line-soft">
                <span className="text-xs font-semibold text-text-dim">Class Code:</span>
                <span className="font-mono font-bold text-text-primary text-sm">CAP-4821</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-6">
              <div className="flex items-center gap-4 px-6 py-4 bg-surface-soft border border-line-soft min-w-[240px]">
                <div className="w-10 h-10 rounded-sm bg-text-primary flex items-center justify-center text-surface-body text-xs font-bold">HY</div>
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
        <nav className="flex gap-1 bg-surface-soft border border-line-soft p-1">
          {['Stream', 'Classwork', 'People'].map((tab, i) => (
            <button key={tab} type="button"
              className={`px-8 py-3 text-sm font-medium transition-all duration-200 ${i === 0
                ? 'bg-text-primary text-surface-body'
                : 'text-text-dim hover:text-text-primary hover:bg-surface-raised'}`}
            >
              {tab}
            </button>
          ))}
        </nav>

        {/* Stream — exact copy structure with fake announcements */}
        <div className="space-y-5">
          {/* Teacher composer */}
          <div className="bg-surface-body border border-line-soft p-8 hover:border-accent transition-colors mb-4">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-sm bg-text-primary flex items-center justify-center text-surface-body text-xs font-bold ring-4 ring-line-soft">HY</div>
              <div className="flex-1">
                <div className="w-full px-5 py-4 border border-line-soft text-text-dim text-sm font-medium">
                  Post an announcement...
                </div>
                <div className="flex justify-end mt-6">
                  <button className="px-10 py-3 bg-text-primary text-surface-body text-sm font-medium opacity-40">Post Announcement</button>
                </div>
              </div>
            </div>
          </div>

          {/* Fake announcements */}
          {fakeAnnouncements.map((a) => (
            <div key={a.id} className="bg-surface-body border border-line-soft p-8 hover:border-accent transition-all group">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-sm bg-text-primary flex items-center justify-center text-surface-body text-xs font-bold shadow-sm">{a.initials}</div>
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
                    <div className="w-7 h-7 rounded-sm bg-surface-raised border border-line-soft flex items-center justify-center text-[9px] font-bold text-text-dim shrink-0">{c.initials}</div>
                    <div className="flex-1 min-w-0 bg-surface-soft px-4 py-3 border border-line-soft">
                      <p className="text-xs font-bold text-text-primary mb-1">{c.author} <span className="font-normal text-text-dim">{c.time}</span></p>
                      <p className="text-sm text-text-primary">{c.text}</p>
                    </div>
                  </div>
                ))}
                {/* Comment input */}
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-7 h-7 rounded-sm bg-text-primary flex items-center justify-center text-[9px] font-bold text-surface-body shrink-0">HY</div>
                  <div className="flex-1 px-4 py-2 border border-line-soft text-xs text-text-dim/40">Add a comment...</div>
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
          <span className="text-[13px] font-serif italic text-text-dim truncate max-w-[120px]">Money Basics</span>
          <span className="text-text-dim/40 shrink-0 text-[11px]">/</span>
          <span className="text-[13px] font-serif italic text-text-dim truncate max-w-[120px]">Income &amp; Tax</span>
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

/* ─────────────────────────── SimFuture ─────────────────────────────────── */
const FUTURE_ITEMS = [
  { label: 'Live Kahoot-style Mode',          desc: 'Real-time quizzes, leaderboards, instant feedback — all running on actual course content, not separate decks.' },
  { label: 'AI Essay Marking',                desc: 'Students write long-form answers; a model trained against real marking rubrics grades and returns targeted, specific feedback.' },
  { label: 'Adaptive Practice Paths',         desc: 'Difficulty adjusts per student based on their quiz history. Everyone works at the level that pushes them exactly enough.' },
  { label: 'Gamification Layer',              desc: 'One shared currency across lessons, games and activities — points, streaks, leaderboards, cross-platform rewards.' },
  { label: 'Assessment & Certification',      desc: 'Formal assessments with custom rubrics, auto-generated certificates, and per-school progress reporting dashboards.' },
  { label: 'Open Platform & API',             desc: 'Caplet becomes infrastructure — publishers, developers, and institutions build on top of it for any subject, any audience, anywhere.' },
];
function SimFuture() {
  return (
    <div className="absolute inset-0 bg-surface-body flex items-center justify-center px-6 md:px-12 lg:px-20 overflow-hidden">
      <div className="max-w-2xl w-full">
        <span className="section-kicker">Roadmap</span>
        <h2 className="text-5xl md:text-6xl font-serif font-bold text-text-primary mb-3">
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
  const [avatarTalking, setAvatarTalking] = useState(false);


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
      @keyframes avBob  { 0%,100%{transform:translateX(-50%) translateY(0px)} 50%{transform:translateX(-50%) translateY(-10px)} }
      @keyframes avBlink{ 0%,85%,100%{transform:scaleY(1)} 92%{transform:scaleY(0.06)} }
      @keyframes avTalk { 0%{transform:scaleY(0.18)} 100%{transform:scaleY(1)} }
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
    setAvatarTalking(false);
    setIsClicking(false);
    setCursorVisible(true);

    const sc = SCENES[sceneIndex];
    setViewOpacity(0);
    delay(() => setViewOpacity(1), FADE_VIEW);

    // Show caption AND start talking animation, then stop talking after 2.8s
    const showCaption = (afterMs) => {
      delay(() => {
        setCaptionVis(true);
        setAvatarTalking(true);
        delay(() => setAvatarTalking(false), 2800);
      }, afterMs);
    };

    if (!sc.cursor) {
      setCursorPos({ x: window.innerWidth * 0.52, y: window.innerHeight * 0.44 });
      showCaption(FADE_VIEW + CURSOR_MOVE + 80);
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
    }, FADE_VIEW + 100);

    return cleanup;
  }, [sceneIndex]);

  return (
    <div style={{ height: '100vh', overflow: 'hidden', position: 'relative', background: 'var(--surface-base)' }}>

      {/* SimNavbar */}
      {hasSimNav && <SimNavbar active={scene.nav} />}

      {/* Page canvas */}
      <div style={{
        position: 'absolute', top: hasSimNav ? 60 : 0, left: 0, right: 0, bottom: 0,
        opacity: viewOpacity, transition: `opacity ${FADE_VIEW}ms ease`,
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
        {currentView === 'editor'        && <SimEditor />}
        {currentView === 'editor-ai'     && <SimEditorAI />}
        {currentView === 'future'        && <SimFuture />}
      </div>

      {/* ── Fixed overlays ── */}
      <ProgressBar current={sceneIndex} total={SCENES.length} />

      {/* Left gradient strip — permanent grey */}
      <div
        onClick={prevScene}
        style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, width: 200,
          zIndex: 200,
          cursor: sceneIndex > 0 ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', paddingLeft: 20,
          background: sceneIndex > 0
            ? 'linear-gradient(to right, rgba(100,100,100,0.26) 0%, rgba(100,100,100,0.08) 58%, transparent 100%)'
            : 'transparent',
          pointerEvents: sceneIndex > 0 ? 'auto' : 'none',
          transition: 'background 0.3s ease',
        }}
      >
        <svg
          width="22" height="22" viewBox="0 0 24 24" fill="none"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{
            stroke: 'var(--text-muted)',
            filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.2))',
            opacity: sceneIndex > 0 ? 0.7 : 0,
            flexShrink: 0,
            transition: 'opacity 0.3s ease',
          }}
        ><polyline points="15 18 9 12 15 6" /></svg>
      </div>

      {/* Right gradient strip — permanent grey */}
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
        <svg
          width="22" height="22" viewBox="0 0 24 24" fill="none"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{
            stroke: 'var(--text-muted)',
            filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.2))',
            opacity: 0.7,
            flexShrink: 0,
          }}
        ><polyline points="9 18 15 12 9 6" /></svg>
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
      <AvatarGuide title={scene.caption.title} body={scene.caption.body} visible={captionVis} talking={avatarTalking} />

      {/* Virtual cursor */}
      <VirtualCursor x={cursorPos.x} y={cursorPos.y} visible={cursorVisible} clicking={isClicking} />

      {/* Ripple */}
      {showRipple && <ClickRipple key={rippleKey} x={cursorPos.x} y={cursorPos.y} />}
    </div>
  );
}
