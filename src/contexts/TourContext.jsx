import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

const TourContext = createContext(null);

/*
  Tour step schema
  ─────────────────
  id         string   unique
  target     string?  data-tour-id on the DOM element to spotlight (null = floating)
  route      string?  auto-navigate here when this step is active
  placement  'top'|'bottom'|'left'|'right'|'center'
  wide       bool     wider card
  codeEntry  bool     render an inline access-code form instead of body text
  futurePlans bool    render the special future-plans card
  title      string
  body       string?
*/
function buildSteps(lessonUrl) {
  const lessonSteps = lessonUrl
    ? [
        {
          id: 'lesson-header',
          target: 'lesson-header',
          route: lessonUrl,
          placement: 'bottom',
          title: 'Inside a Lesson',
          body: "A clean two-level header shows exactly where the student is — course breadcrumb, lesson title, and a live progress counter. Nothing unnecessary.",
        },
        {
          id: 'lesson-ticker',
          target: 'lesson-ticker',
          route: lessonUrl,
          placement: 'bottom',
          title: 'Slide Progress',
          body: 'Each dot is one slide. Blue means visited, filled means done. Students always know exactly where they are and how much is left.',
        },
        {
          id: 'slide-canvas',
          target: null,
          route: lessonUrl,
          placement: 'center',
          wide: false,
          title: '15 Slide Types',
          body: 'Each slide is one of 15 types — text, multiple choice, flashcards, matching, fill-in-the-blank, Desmos graphs, diagrams, PhET simulations, timelines, hotspot annotations, charts, and embedded tools. Every type is purpose-built for learning, not just for displaying text.',
        },
        {
          id: 'lesson-footer',
          target: 'lesson-footer',
          route: lessonUrl,
          placement: 'top',
          title: 'Navigation',
          body: 'Arrow keys or buttons to move between slides. Progress auto-saves every time a slide changes — students always pick up right where they left off.',
        },
        {
          id: 'calc-btn',
          target: 'calc-btn',
          route: lessonUrl,
          placement: 'bottom',
          clickAnim: true,
          title: 'Built-in Calculator',
          body: "There's a floating Desmos graphing and scientific calculator on every lesson. Pop it up over any slide, do the working, close it — it remembers everything you typed.",
        },
      ]
    : [];

  return [
    {
      id: 'welcome',
      target: null,
      route: null,
      placement: 'center',
      wide: true,
      title: 'Welcome to Caplet',
      body: "Hey! I'm Harry, and I built Caplet to make structured learning actually click. Let me walk you through what's here — it'll only take a couple of minutes, and I think you'll like it.",
    },
    {
      id: 'nav-curriculum',
      target: 'nav-curriculum',
      route: '/courses',
      placement: 'bottom',
      clickAnim: true,
      title: 'The Curriculum',
      body: 'Everything starts here. Structured courses covering financial topics that matter to Australian students — budgeting, tax, investing, superannuation, and more.',
    },
    {
      id: 'courses-grid',
      target: 'courses-grid',
      route: '/courses',
      placement: 'top',
      title: 'Course Library',
      body: 'Each course breaks into modules, and modules into short focused lessons. Students work through at their own pace — progress is tracked automatically, so they always know where they\'re up to.',
    },
    ...lessonSteps,
    {
      id: 'nav-academy',
      target: 'nav-academy',
      route: '/classes',
      placement: 'bottom',
      clickAnim: true,
      title: 'The Academy',
      body: 'This is the classroom management layer — where teachers create class groups, assign lessons, post announcements, and track every student\'s progress in one place.',
    },
    {
      id: 'academy-header',
      target: 'academy-header',
      route: '/classes',
      placement: 'bottom',
      title: 'Class Management',
      body: "Teachers create a class and get a join code — students enter it once and they're in. From there you can post announcements, assign specific lessons, see who's completed what, and reply to individual students privately.",
    },
    {
      id: 'academy-actions',
      target: 'academy-actions',
      route: '/classes',
      placement: 'bottom',
      title: 'Create or Join',
      body: "Teachers hit 'Establish Class' to spin up a new class and get a shareable code. Students join with that code. It's designed to be as frictionless as Google Classroom — but with the actual learning content built in.",
    },
    {
      id: 'tools-grid',
      target: 'tools-grid',
      route: '/tools',
      placement: 'top',
      title: 'Financial Instruments',
      body: "These standalone calculators are live right now — tax, salary, mortgage, compound interest, budget, super, GST, emergency fund. Anyone can use them, no account needed. Think of these as supplementary tools sitting alongside the lessons.",
    },
    {
      id: 'editor-code-entry',
      target: null,
      route: null,
      placement: 'center',
      wide: true,
      codeEntry: true,
      title: 'The Lesson Creator',
      body: "This is where all the content gets built. It's gated by an access code — only you and whoever you authorise can create or edit lessons. Enter the code below to continue the tour.",
    },
    {
      id: 'editor-workspace',
      target: 'editor-workspace',
      route: '/editor',
      placement: 'bottom',
      title: 'Your Workspace',
      body: 'Inside you get a full content management dashboard. Create courses, add modules, build lessons. Publish or unpublish anything with one click. Everything at a glance.',
    },
    {
      id: 'editor-ai',
      target: null,
      route: '/editor',
      placement: 'center',
      wide: true,
      title: 'AI Lesson Generation',
      body: "Click into any lesson and open the AI panel on the right. Paste your curriculum notes or upload a PDF, pick how many slides you want, and it generates a full lesson from scratch. It plans the content in natural text first, then converts it into structured slides — so the output is actually coherent, not just a wall of bullets.",
    },
    {
      id: 'future-plans',
      target: null,
      route: null,
      placement: 'center',
      wide: true,
      futurePlans: true,
      title: "What's Next for Caplet",
    },
  ];
}

export function TourProvider({ children }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const startTour = useCallback(async () => {
    let lessonUrl = null;
    try {
      const raw = await api.getCourses();
      const list = Array.isArray(raw) ? raw : (raw?.courses || []);
      outer: for (const course of list) {
        for (const mod of course.modules || []) {
          for (const lesson of mod.lessons || []) {
            if (lesson.id) {
              lessonUrl = `/courses/${course.id}/lessons/${lesson.id}`;
              break outer;
            }
          }
        }
      }
    } catch { /* skip lesson steps */ }
    const built = buildSteps(lessonUrl);
    setSteps(built);
    setStepIndex(0);
    setActive(true);
  }, []);

  const end = useCallback(() => { setActive(false); setStepIndex(0); }, []);

  const next = useCallback(() => {
    setStepIndex((i) => {
      const n = i + 1;
      if (n >= steps.length) { setActive(false); return 0; }
      return n;
    });
  }, [steps.length]);

  const prev = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), []);

  // Auto-navigate to the step's route
  useEffect(() => {
    if (!active || !steps.length) return;
    const step = steps[stepIndex];
    if (!step?.route || location.pathname === step.route) return;
    navigate(step.route);
  }, [active, stepIndex, steps]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TourContext.Provider value={{ active, stepIndex, steps, startTour, end, next, prev }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
}
