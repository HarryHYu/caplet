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
    navLabel: 'Lesson',
    path: '/build',
    role: 'Curriculum author',
    eyebrow: '1 · Build',
    title: 'Make a lesson.',
    description: 'Turn one curriculum topic into a short, editable lesson.',
    guide: {
      title: 'First, make the lesson.',
      message: 'A lesson is made from small pieces. Open this Reading slide to see the part a teacher can change.',
      action: 'Show me the slide editor',
      result: 'This is the lesson editor. A teacher can change the wording, then add more learning moments when they are ready.',
    },
  },
  {
    id: 'teach',
    label: 'Teach',
    navLabel: 'Class',
    path: '/teach/cls-commerce',
    role: 'Teacher',
    eyebrow: '2 · Teach',
    title: 'Share it with a class.',
    description: 'Turn that lesson into an activity for a real class.',
    guide: {
      title: 'Now share it with a class.',
      message: 'This is where a teacher gives the lesson to learners. Open the form and you will see the few details they need to set.',
      action: 'Open the assignment form',
      result: 'This form turns the lesson into classwork. A teacher names it, adds a due date, and chooses the work students will receive.',
    },
  },
  {
    id: 'experience',
    label: 'Experience',
    navLabel: 'Student',
    path: '/experience/money-basics/lesson-income-tax',
    role: 'Student',
    eyebrow: '3 · Experience',
    title: 'See the student view.',
    description: 'See the lesson exactly as a learner sees it, including help when they get stuck.',
    guide: {
      title: 'Then see the student view.',
      message: 'Students get one focused lesson, not a teacher dashboard. When something is unclear, they can ask for help right beside the slide.',
      action: 'Open the student helper',
      result: 'This helper stays with the current lesson. It can explain the idea more simply or give the learner a concrete example.',
    },
  },
  {
    id: 'act',
    label: 'Act',
    navLabel: 'Support',
    path: '/act/cls-commerce',
    role: 'Teacher',
    eyebrow: '4 · Act',
    title: 'Help the students who need it.',
    description: 'Use class evidence to offer the right help to the students who need it.',
    guide: {
      title: 'Finally, offer the right help.',
      message: 'Caplet finds the students who need support and suggests the next activity, so a teacher does not have to decode every number first.',
      action: 'Open the suggested assignment',
      result: 'The suggested group and the learning goal are already filled in. A teacher only needs to review it before creating the activity.',
    },
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
    reset({ silent = false } = {}) {
      resetDemo();
      setVersion((current) => current + 1);
      setAnnouncement(silent ? '' : 'The sample workspace has been reset.');
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
        <section className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <span className="font-hand text-2xl text-accent -rotate-2 inline-block">a simple, guided Caplet walkthrough</span>
            <h1 className="mt-4 max-w-4xl font-display text-5xl font-extrabold leading-[0.94] tracking-[-0.05em] text-text-primary sm:text-7xl lg:text-[5.8rem]">
              See how Caplet<br />helps a teacher.
            </h1>
            <p className="mt-7 max-w-2xl text-lg font-medium leading-relaxed text-text-muted md:text-xl">
              In four short scenes, you will make a lesson, share it with a class, see the student view, then offer help where it is needed.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/build" className="btn-primary px-6 py-3">
                Show me how it works <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <p className="mt-5 text-sm font-bold text-text-dim">About 2 minutes · sample workspace · no sign-in needed</p>
          </div>
          <aside className="rounded-[2rem] border border-line-soft bg-surface-raised p-7 shadow-[0_30px_70px_-48px_rgba(20,20,18,0.5)] md:p-9" aria-label="How the guided tour works">
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-3xl border border-line-soft bg-surface-body p-2">
                <img src="/logo.png" alt="Caplet guide" className="h-full w-full object-contain" />
              </span>
              <div>
                <p className="font-hand text-xl text-accent -rotate-2 inline-block">I&apos;ll show you, not tell you.</p>
                <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-text-primary">What you&apos;ll see</h2>
              </div>
            </div>
            <p className="mt-6 text-sm font-medium leading-relaxed text-text-muted">
              You do not need to know the product first. Each step opens one example and explains why it matters.
            </p>
            <ol className="mt-7 divide-y divide-line-soft border-y border-line-soft">
              {DEMO_STEPS.map((step, index) => (
                <li key={step.id} className="flex items-center gap-3 py-4">
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-extrabold ${index === 0 ? 'bg-accent text-white' : 'bg-surface-soft text-text-muted'}`}>{index + 1}</span>
                  <div>
                    <p className="text-sm font-extrabold text-text-primary">{step.title}</p>
                    <p className="mt-0.5 text-xs font-semibold text-text-muted">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </section>
      </div>
    </main>
  );
}

function findDemoFocusTarget(stepId) {
  const buttons = Array.from(document.querySelectorAll('button'));
  const buttonWithText = (text) => buttons.find((button) => button.textContent?.trim().includes(text));

  if (stepId === 'build') {
    const readingCard = document.querySelector('[data-tour-id="editor-reading-slide"]')
      || buttonWithText('Reading')?.closest('.group');
    return {
      target: readingCard,
      activate: () => readingCard?.querySelector('button[aria-label="Expand"]')?.click(),
      afterActivate: () => document.querySelector('[data-tour-id="editor-reading-slide"]') || readingCard,
    };
  }
  if (stepId === 'teach') {
    const assignmentButton = buttonWithText('Create Assignment');
    return {
      target: assignmentButton,
      activate: () => assignmentButton?.click(),
      afterActivate: () => Array.from(document.querySelectorAll('h2')).find((heading) => heading.textContent?.trim() === 'New Assignment')?.closest('.fixed')?.firstElementChild,
    };
  }
  if (stepId === 'experience') {
    const tutor = buttonWithText('Ask the AI tutor about this slide');
    return {
      target: tutor?.parentElement,
      activate: () => tutor?.click(),
      afterActivate: () => Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.trim().includes('Ask the AI tutor about this slide'))?.parentElement,
    };
  }
  if (stepId === 'act') {
    const assignmentButton = buttonWithText('Create remediation assignment');
    return {
      target: assignmentButton?.closest('li'),
      activate: () => assignmentButton?.click(),
      afterActivate: () => document.getElementById('adaptive-assignment'),
    };
  }
  return null;
}

function clearDemoFocus() {
  document.querySelectorAll('.demo-focus-target').forEach((element) => element.classList.remove('demo-focus-target'));
}

function DemoGuide({ step }) {
  const [actionComplete, setActionComplete] = useState(false);
  const [focusMessage, setFocusMessage] = useState('');
  const navigate = useNavigate();
  const currentIndex = DEMO_STEPS.findIndex((candidate) => candidate.id === step.id);
  const nextStep = DEMO_STEPS[currentIndex + 1];

  useEffect(() => {
    clearDemoFocus();
    setActionComplete(false);
    setFocusMessage('');
    return clearDemoFocus;
  }, [step.id]);

  const focusNextAction = (attempt = 0) => {
    const interaction = findDemoFocusTarget(step.id);
    if (!interaction?.target) {
      if (attempt < 20) {
        setFocusMessage('Opening this part of the sample…');
        window.setTimeout(() => focusNextAction(attempt + 1), 100);
        return;
      }
      setFocusMessage('This part could not be opened. Move to the next step and try again.');
      return;
    }
    interaction.activate?.();
    window.setTimeout(() => {
      const target = interaction.afterActivate?.() || interaction.target;
      target?.classList.add('demo-focus-target');
      target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }, 0);
    setActionComplete(true);
    setFocusMessage('');
  };

  const showNextAction = () => {
    clearDemoFocus();
    focusNextAction();
  };

  if (actionComplete && step.id === 'teach') {
    return <p role="status" aria-live="polite" className="sr-only">{step.guide.result}</p>;
  }

  return (
    <aside className="fixed bottom-4 right-4 z-[90] max-h-[calc(100vh-5rem)] w-[min(21rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-line-soft bg-surface-raised p-4 shadow-[0_26px_70px_-35px_rgba(20,20,18,0.55)] md:bottom-6 md:right-6 md:p-5" aria-label={`Caplet guide: ${step.label}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line-soft bg-surface-body p-1.5">
          <img src="/logo.png" alt="Caplet guide" className="h-full w-full object-contain" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-accent">
            <span>Viewing as {step.role}</span><span aria-hidden="true"> · Step {currentIndex + 1} of {DEMO_STEPS.length}</span>
          </p>
          <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-text-primary">{step.guide.title}</h2>
        </div>
      </div>
      {!actionComplete ? (
        <>
          <p className="mt-4 text-sm font-medium leading-relaxed text-text-muted">{step.guide.message}</p>
          <button type="button" onClick={showNextAction} className="btn-primary mt-5 w-full justify-center px-4 py-3 text-sm">
            {step.guide.action} <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="mt-3 text-xs font-bold text-text-dim">This is a safe sample. You can explore without changing anything real.</p>
        </>
      ) : (
        <>
          <div className="mt-4 rounded-2xl bg-accent-soft p-3.5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-accent">You are looking at it</p>
            <p className="mt-1.5 text-sm font-bold leading-relaxed text-text-primary">{step.guide.result}</p>
          </div>
          {nextStep ? (
            <button type="button" onClick={() => navigate(nextStep.path)} className="btn-primary mt-4 w-full justify-center px-4 py-3 text-sm">
              Continue: {nextStep.title} <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button type="button" onClick={() => navigate('/overview')} className="btn-primary mt-4 w-full justify-center px-4 py-3 text-sm">
              Start the story again <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </>
      )}
      {focusMessage && <p role="status" aria-live="polite" className="mt-3 text-xs font-bold text-accent">{focusMessage}</p>}
    </aside>
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
    reset({ silent: true });
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
            <span className="hidden rounded-full bg-accent-soft px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-accent md:inline">Guided tour</span>
          </button>

          <nav className="ml-2 hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex" aria-label="Demo steps">
            {DEMO_STEPS.map((step, index) => {
              const active = currentStep?.id === step.id;
              return (
                <button key={step.id} type="button" onClick={() => go(step.path)} aria-current={active ? 'step' : undefined} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-extrabold transition-colors ${active ? 'bg-accent text-white' : 'text-text-muted hover:bg-surface-soft hover:text-text-primary'}`}>
                  <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${active ? 'bg-white/20' : 'bg-surface-soft'}`}>{index + 1}</span>
                  {step.navLabel}
                </button>
              );
            })}
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-1.5 md:gap-2">
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
                  <button type="button" onClick={restart} className="inline-flex h-10 items-center rounded-xl bg-accent px-3 text-xs font-extrabold text-white md:px-4">Finish</button>
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
                <span className="flex-1">{step.title}</span>
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
      {currentStep && <DemoGuide key={currentStep.id} step={currentStep} />}
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
