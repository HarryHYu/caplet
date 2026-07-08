/**
 * DemoApp — the interactive /demo sandbox.
 *
 * Instead of hand-cloning each page (the old approach, which drifted from the
 * real design), this mounts the REAL page components + the REAL Navbar/Footer
 * inside a self-contained MemoryRouter. `api.demoMode` makes every backend call
 * resolve to fixtures (see src/demo/demoResolver.js), so the visitor can scroll,
 * click, and navigate the genuine product with demo data and no login.
 *
 * Because the real components are reused verbatim, the demo automatically tracks
 * the current design — nothing here needs updating when a page is restyled.
 */
import { useEffect, useRef } from 'react';
import { MemoryRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import { LayoutContext } from '../contexts/LayoutContext';
import { CoursesProvider } from '../contexts/CoursesContext';
import { DEMO_USER } from '../demo/demoData';

import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Courses from './Courses';
import CourseDetail from './CourseDetail';
import ModuleDetail from './ModuleDetail';
import LessonPlayer from './LessonPlayer';
import CourseComplete from './CourseComplete';
import Classes from './Classes';
import ClassDetail from './ClassDetail';
import Editor from './Editor';
import DemoPitch from './DemoPitch';

/* Seeded context values — Harry Y, instructor, always "logged in". */
const DEMO_AUTH = {
  user: DEMO_USER,
  isAuthenticated: true,
  loading: false,
  error: null,
  login: async () => ({}),
  register: async () => ({}),
  loginWithGoogle: async () => ({}),
  logout: async () => {},
  updateProfile: async () => ({}),
};
const DEMO_LAYOUT = { navMode: 'horizontal', toggleNavMode: () => {}, sidebarCollapsed: false, toggleSidebar: () => {} };

/* Friendly fallback for site areas not wired into the demo. */
function DemoStub() {
  return (
    <div className="min-h-screen bg-surface-body flex items-center justify-center px-6 pt-24 pb-16">
      <div className="max-w-md text-center">
        <p className="font-hand text-2xl text-accent mb-3 -rotate-2">just the highlights</p>
        <h1 className="font-display font-extrabold tracking-tight text-4xl text-text-primary mb-4">Not part of this demo</h1>
        <p className="text-text-muted mb-8 leading-relaxed">
          This walkthrough focuses on the curriculum, the classroom, and the lesson editor. Jump back into any of those below.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/courses" className="btn-primary px-5 py-2.5 text-sm">Curriculum</Link>
          <Link to="/classes" className="btn-secondary px-5 py-2.5 text-sm">Classes</Link>
          <Link to="/editor" className="btn-secondary px-5 py-2.5 text-sm">Editor</Link>
        </div>
      </div>
    </div>
  );
}

/* Floating demo section switcher — scoped to the memory router so links
   navigate the demo. Surfaces the four showcase areas regardless of what the
   real Navbar exposes, then hands off to the real, fully-interactive pages. */
const DEMO_SECTIONS = [
  { label: 'Curriculum', to: '/courses', match: '/courses' },
  { label: 'Classes', to: '/classes', match: '/classes' },
  { label: 'Editor', to: '/editor', match: '/editor' },
  { label: 'Pitch', to: '/pitch', match: '/pitch' },
];

function DemoChrome() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-1 rounded-full border border-line-soft bg-surface-raised/95 backdrop-blur-xl px-1.5 py-1.5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.35)]">
      <span className="pl-2.5 pr-1.5 text-[11px] font-bold uppercase tracking-wider text-text-dim select-none">Demo</span>
      {DEMO_SECTIONS.map((s) => {
        const active = s.match === '/courses' ? path.startsWith('/courses') : path.startsWith(s.match);
        return (
          <button
            key={s.to}
            type="button"
            onClick={() => navigate(s.to)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              active ? 'bg-accent text-white' : 'text-text-muted hover:bg-surface-soft'
            }`}
          >
            {s.label}
          </button>
        );
      })}
      <span className="w-px h-4 bg-line-soft mx-0.5" />
      <a href="/" className="rounded-full px-3 py-1.5 text-xs font-bold text-text-dim hover:bg-surface-soft transition-colors">
        Exit
      </a>
    </div>
  );
}

/* The scrolling frame: real Navbar (fixed) + routed real pages + Footer. */
function DemoFrame() {
  const scrollRef = useRef(null);
  const location = useLocation();
  const path = location.pathname;
  const onPitch = path === '/pitch';
  // Lesson player + editor own the full viewport; the site footer would just
  // add awkward scroll under them.
  const hideFooter = onPitch || path.includes('/lessons/') || path === '/editor';

  // Reset the frame's scroll (not window) on in-demo navigation.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [path]);

  return (
    <div ref={scrollRef} className="h-screen overflow-y-auto overflow-x-hidden bg-surface-body">
      {!onPitch && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/courses" replace />} />
          <Route path="/dashboard" element={<Navigate to="/courses" replace />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:courseId" element={<CourseDetail />} />
          <Route path="/courses/:courseId/modules/:moduleId" element={<ModuleDetail />} />
          <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonPlayer />} />
          <Route path="/courses/:courseId/complete" element={<CourseComplete />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/classes/:classId" element={<ClassDetail />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/pitch" element={<DemoPitch />} />
          <Route path="*" element={<DemoStub />} />
        </Routes>
      </main>
      {!hideFooter && <Footer />}
      <DemoChrome />
    </div>
  );
}

export default function DemoApp() {
  // Set the flag during render so it is true before any child page's fetch
  // effect runs (child effects run before parent effects, so an effect here
  // would be too late).
  api.demoMode = true;
  useEffect(() => {
    api.demoMode = true;
    return () => {
      api.demoMode = false;
    };
  }, []);

  return (
    <AuthContext.Provider value={DEMO_AUTH}>
      <LayoutContext.Provider value={DEMO_LAYOUT}>
        <CoursesProvider>
          <MemoryRouter initialEntries={['/courses']}>
            <DemoFrame />
          </MemoryRouter>
        </CoursesProvider>
      </LayoutContext.Provider>
    </AuthContext.Provider>
  );
}
