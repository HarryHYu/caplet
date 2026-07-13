import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link, MemoryRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  Bars3Icon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { AuthContext } from '../contexts/AuthContext';
import { CoursesProvider } from '../contexts/CoursesContext';
import { LayoutContext } from '../contexts/LayoutContext';
import { DEMO_STUDENT, DEMO_USER } from '../demo/demoData';
import { resetDemo } from '../demo/demoResolver';
import ClassDetail from './ClassDetail';
import Classes from './Classes';
import CourseDetail from './CourseDetail';
import Courses from './Courses';
import Editor from './Editor';
import LessonPlayer from './LessonPlayer';
import ModuleDetail from './ModuleDetail';
import TeacherClassLearning from './TeacherClassLearning';

const DemoExperienceContext = createContext(null);

const DEMO_STEPS = [
  {
    id: 'build',
    label: 'Build',
    path: '/build',
    role: 'Curriculum author',
    eyebrow: '1 · Build',
    title: 'Turn curriculum into a lesson.',
    description: 'Open a seeded lesson, edit a slide, preview it, or ask the AI assistant to add a learning activity.',
  },
  {
    id: 'teach',
    label: 'Teach',
    path: '/teach/cls-commerce',
    role: 'Teacher',
    eyebrow: '2 · Teach',
    title: 'Give the work to a real class.',
    description: 'The class opens on Classwork so you can inspect assignments, submissions, and linked curriculum.',
  },
  {
    id: 'experience',
    label: 'Experience',
    path: '/experience/money-basics/lesson-income-tax',
    role: 'Student',
    eyebrow: '3 · Experience',
    title: 'See what the learner sees.',
    description: 'Move through the interactive tax lesson as Mia. Answers, saved slides, and progress remain local to this Demo.',
  },
  {
    id: 'act',
    label: 'Act',
    path: '/act/cls-commerce',
    role: 'Teacher',
    eyebrow: '4 · Act',
    title: 'Turn evidence into the next action.',
    description: 'Inspect outcome mastery, open a student profile, and create a targeted remediation assignment.',
  },
];

const DEMO_LAYOUT = {
  navMode: 'horizontal',
  toggleNavMode: () => {},
  sidebarCollapsed: false,
  toggleSidebar: () => {},
};

const makeAuthValue = (user) => ({
  user,
  isAuthenticated: true,
  loading: false,
  error: null,
  login: async () => ({}),
  register: async () => ({}),
  loginWithGoogle: async () => ({}),
  logout: async () => {},
  updateProfile: async () => ({ user }),
});

function useDemoExperience() {
  const value = useContext(DemoExperienceContext);
  if (!value) throw new Error('useDemoExperience must be used inside DemoExperienceProvider');
  return value;
}

function DemoExperienceProvider({ children }) {
  const [freeExplore, setFreeExplore] = useState(false);
  const [version, setVersion] = useState(0);
  const [announcement, setAnnouncement] = useState('');

  const value = useMemo(() => ({
    freeExplore,
    setFreeExplore,
    version,
    announcement,
    reset() {
      resetDemo();
      setVersion((current) => current + 1);
      setAnnouncement('The sample workspace has been reset.');
    },
    clearAnnouncement() {
      setAnnouncement('');
    },
  }), [announcement, freeExplore, version]);

  return <DemoExperienceContext.Provider value={value}>{children}</DemoExperienceContext.Provider>;
}

function stepForPath(pathname) {
  if (pathname.startsWith('/teach/')) return DEMO_STEPS[1];
  if (pathname.startsWith('/experience/')) return DEMO_STEPS[2];
  if (pathname.startsWith('/act/')) return DEMO_STEPS[3];
  if (pathname === '/editor') return DEMO_STEPS[0];
  if (pathname === '/classes' || /^\/classes\/[^/]+$/.test(pathname)) return DEMO_STEPS[1];
  if (pathname.startsWith('/courses')) return DEMO_STEPS[2];
  if (pathname.includes('/learning')) return DEMO_STEPS[3];
  return DEMO_STEPS.find((step) => pathname === step.path) || null;
}

function DemoRoleProvider({ children }) {
  const { pathname } = useLocation();
  const isStudentView = pathname.startsWith('/experience/') || pathname.startsWith('/courses');
  const user = isStudentView ? DEMO_STUDENT : DEMO_USER;
  const auth = useMemo(() => makeAuthValue(user), [user]);

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

function DemoOverview() {
  const location = useLocation();
  return (
    <main className="min-h-screen overflow-x-hidden bg-surface-body px-5 pb-20 pt-28 md:px-10 md:pt-36">
      <div className="mx-auto max-w-6xl">
        {location.state?.demoNotice && (
          <div role="status" className="mb-8 rounded-2xl border border-line-soft bg-accent-soft px-5 py-4 text-sm font-bold text-text-primary">
            {location.state.demoNotice}
          </div>
        )}
        <section className="grid items-end gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <span className="font-hand text-2xl text-accent -rotate-2 inline-block">a five-minute school walkthrough</span>
            <h1 className="mt-4 max-w-4xl font-display text-5xl font-extrabold leading-[0.94] tracking-[-0.05em] text-text-primary sm:text-7xl lg:text-[6.5rem]">
              From curriculum to the next teaching move.
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-medium leading-relaxed text-text-muted md:text-xl">
              Follow one connected workflow across lesson creation, classroom delivery, the student experience, and evidence-led intervention.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/build" className="btn-primary px-6 py-3">
                Start the guided tour <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href="/contact" className="btn-secondary px-6 py-3">Contact about a pilot</a>
            </div>
          </div>
          <aside className="rounded-[2rem] border border-line-soft bg-surface-raised p-7 shadow-[0_30px_70px_-48px_rgba(20,20,18,0.5)] md:p-9">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-accent">Sample workspace</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-text-primary">Year 11 Commerce A</h2>
            <dl className="mt-7 grid grid-cols-2 gap-4">
              {[
                ['4', 'students'],
                ['3', 'curriculum outcomes'],
                ['31', 'evidence records'],
                ['2', 'students to support'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-2xl bg-surface-soft p-4">
                  <dt className="text-xs font-bold text-text-muted">{label}</dt>
                  <dd className="mt-1 font-display text-3xl font-extrabold text-text-primary">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-sm font-medium leading-relaxed text-text-muted">
              Everything is sample data. Changes work locally and can be reset at any time.
            </p>
          </aside>
        </section>

        <section className="mt-20" aria-labelledby="tour-steps-heading">
          <p className="section-kicker">The connected story</p>
          <h2 id="tour-steps-heading" className="mt-2 font-display text-4xl font-extrabold tracking-tight text-text-primary md:text-5xl">Build. Teach. Experience. Act.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {DEMO_STEPS.map((step, index) => (
              <Link key={step.id} to={step.path} className="group rounded-3xl border border-line-soft bg-surface-raised p-6 transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent-soft font-display font-extrabold text-accent">{index + 1}</span>
                  <ArrowRightIcon className="h-5 w-5 text-text-dim transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </div>
                <h3 className="mt-8 font-display text-2xl font-extrabold text-text-primary">{step.label}</h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-text-muted">{step.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function DemoShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { announcement, clearAnnouncement, freeExplore, reset, setFreeExplore, version } = useDemoExperience();
  const [menuOpen, setMenuOpen] = useState(false);
  const currentStep = stepForPath(pathname);
  const currentIndex = currentStep ? DEMO_STEPS.findIndex((step) => step.id === currentStep.id) : -1;
  const previousPath = currentIndex > 0 ? DEMO_STEPS[currentIndex - 1].path : '/overview';
  const nextPath = currentIndex >= 0 && currentIndex < DEMO_STEPS.length - 1 ? DEMO_STEPS[currentIndex + 1].path : null;

  const restart = () => {
    setFreeExplore(false);
    setMenuOpen(false);
    navigate('/overview');
  };

  const go = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface-body text-text-primary">
      <a href="#demo-main" className="skip-link">Skip to Demo content</a>
      <header className="fixed inset-x-0 top-0 z-[100] border-b border-line-soft bg-surface-body/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-2 px-3 md:h-16 md:gap-4 md:px-6">
          <button type="button" onClick={restart} className="flex shrink-0 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label="Restart Demo">
            <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-full border border-line-soft bg-surface-raised">
              <img src="/logo.png" alt="" className="h-full w-full object-contain" />
            </span>
            <span className="hidden font-display text-lg font-extrabold sm:inline">Caplet.</span>
            <span className="rounded-full bg-accent-soft px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-accent">Demo</span>
          </button>

          <nav className="ml-2 hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex" aria-label="Demo steps">
            {DEMO_STEPS.map((step, index) => {
              const active = currentStep?.id === step.id;
              return (
                <button key={step.id} type="button" onClick={() => go(step.path)} aria-current={active ? 'step' : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-extrabold transition-colors ${active ? 'bg-accent text-white' : 'text-text-muted hover:bg-surface-soft hover:text-text-primary'}`}>
                  <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${active ? 'bg-white/20' : 'bg-surface-soft'}`}>{index + 1}</span>
                  {step.label}
                </button>
              );
            })}
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-1.5 md:gap-2">
            {currentStep && (
              <span className="hidden max-w-40 truncate rounded-full border border-line-soft bg-surface-raised px-3 py-1.5 text-xs font-bold text-text-muted md:inline-flex">
                Viewing as {currentStep.role}
              </span>
            )}
            {currentStep && (
              <div className="flex items-center gap-1" aria-label="Tour navigation">
                <button type="button" onClick={() => go(previousPath)} className="grid h-10 w-10 place-items-center rounded-xl border border-line-soft text-text-muted hover:text-text-primary" aria-label="Previous Demo step">
                  <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
                </button>
                {nextPath ? (
                  <button type="button" onClick={() => go(nextPath)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-3 text-xs font-extrabold text-white md:px-4">
                    <span className="hidden sm:inline">Next</span><ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <a href="/contact" className="inline-flex h-10 items-center rounded-xl bg-accent px-3 text-xs font-extrabold text-white md:px-4">Pilot</a>
                )}
              </div>
            )}
            <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="demo-menu" className="grid h-10 w-10 place-items-center rounded-xl border border-line-soft text-text-muted hover:text-text-primary" aria-label={menuOpen ? 'Close Demo menu' : 'Open Demo menu'}>
              {menuOpen ? <XMarkIcon className="h-5 w-5" aria-hidden="true" /> : <Bars3Icon className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div id="demo-menu" className="absolute right-3 top-[calc(100%+0.5rem)] w-[min(22rem,calc(100vw-1.5rem))] rounded-3xl border border-line-soft bg-surface-raised p-3 shadow-[0_28px_70px_-35px_rgba(20,20,18,0.6)] md:right-6">
            <p className="px-3 pb-2 pt-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-text-dim">Tour steps</p>
            {DEMO_STEPS.map((step, index) => (
              <button key={step.id} type="button" onClick={() => go(step.path)} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold ${currentStep?.id === step.id ? 'bg-accent-soft text-accent' : 'text-text-primary hover:bg-surface-soft'}`}>
                <span className="grid h-6 w-6 place-items-center rounded-full bg-surface-soft text-xs">{index + 1}</span>
                <span className="flex-1">{step.label}</span>
                {currentStep?.id === step.id && <CheckIcon className="h-4 w-4" aria-hidden="true" />}
              </button>
            ))}
            <div className="my-3 h-px bg-line-soft" />
            <button type="button" onClick={() => { setFreeExplore(!freeExplore); setMenuOpen(false); }} className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-sm font-bold text-text-primary hover:bg-surface-soft">
              Explore freely <span className="text-xs text-accent">{freeExplore ? 'On' : 'Off'}</span>
            </button>
            {freeExplore && (
              <div className="grid grid-cols-2 gap-2 px-2 pb-2">
                <button type="button" onClick={() => go('/courses')} className="rounded-xl bg-surface-soft px-3 py-2 text-xs font-bold">Curriculum</button>
                <button type="button" onClick={() => go('/classes')} className="rounded-xl bg-surface-soft px-3 py-2 text-xs font-bold">Classes</button>
                <button type="button" onClick={() => go('/editor')} className="rounded-xl bg-surface-soft px-3 py-2 text-xs font-bold">Editor</button>
                <button type="button" onClick={() => go('/classes/cls-commerce/learning')} className="rounded-xl bg-surface-soft px-3 py-2 text-xs font-bold">Insights</button>
              </div>
            )}
            <button type="button" onClick={() => { reset(); setMenuOpen(false); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-text-primary hover:bg-surface-soft">
              <ArrowPathIcon className="h-4 w-4" aria-hidden="true" /> Reset sample data
            </button>
            <button type="button" onClick={restart} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold text-text-primary hover:bg-surface-soft">Restart tour</button>
            <a href="/contact" className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-accent hover:bg-accent-soft">Contact about a pilot</a>
            <a href="/" className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-text-muted hover:bg-surface-soft">Exit Demo</a>
          </div>
        )}
      </header>

      {announcement && (
        <div role="status" aria-live="polite" className="fixed right-4 top-20 z-[110] flex max-w-sm items-center gap-3 rounded-2xl bg-text-primary px-4 py-3 text-sm font-bold text-surface-body shadow-xl">
          <span>{announcement}</span>
          <button type="button" onClick={clearAnnouncement} className="grid h-8 w-8 place-items-center rounded-full bg-white/10" aria-label="Dismiss reset message"><XMarkIcon className="h-4 w-4" /></button>
        </div>
      )}

      <div id="demo-main" tabIndex="-1" key={version}>
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<DemoOverview />} />
          <Route path="/build" element={<Editor demoAccess initialLessonId="l_what_is_budget" />} />
          <Route path="/teach/:classId" element={<ClassDetail initialTab="classwork" />} />
          <Route path="/experience/:courseId/:lessonId" element={<LessonPlayer />} />
          <Route path="/act/:classId" element={<TeacherClassLearning />} />

          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:courseId" element={<CourseDetail />} />
          <Route path="/courses/:courseId/modules/:moduleId" element={<ModuleDetail />} />
          <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonPlayer />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/classes/:classId" element={<ClassDetail />} />
          <Route path="/classes/:classId/learning" element={<TeacherClassLearning />} />
          <Route path="/editor" element={<Editor demoAccess />} />
          <Route path="*" element={<Navigate to="/overview" replace state={{ demoNotice: 'That area is outside this focused Demo. Choose one of the four connected steps below.' }} />} />
        </Routes>
      </div>
    </div>
  );
}

function DemoRuntime() {
  const { version } = useDemoExperience();
  return (
    <DemoRoleProvider>
      <LayoutContext.Provider value={DEMO_LAYOUT}>
        <CoursesProvider key={version}>
          <DemoShell />
        </CoursesProvider>
      </LayoutContext.Provider>
    </DemoRoleProvider>
  );
}

export default function DemoApp() {
  useEffect(() => {
    document.title = 'School Product Demo — Caplet';
  }, []);

  return (
    <MemoryRouter initialEntries={['/overview']}>
      <DemoExperienceProvider>
        <DemoRuntime />
      </DemoExperienceProvider>
    </MemoryRouter>
  );
}
