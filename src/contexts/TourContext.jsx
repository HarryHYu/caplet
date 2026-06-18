import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

const TourContext = createContext(null);

/* ── Step definitions ───────────────────────────────────────────────────────
   `target`    → data-tour-id on the DOM element to spotlight
   `route`     → navigate here when this step activates
   `placement` → where the tooltip appears: top | bottom | left | right | center
   `wide`      → wider card (for intro/outro steps)
   `interactive` → don't block pointer-events over the target (e.g. editor form)
   `futurePlans` → render the special future-plans card body
────────────────────────────────────────────────────────────────────────────── */
function buildSteps(lessonUrl) {
  const lessonSteps = lessonUrl
    ? [
        {
          id: 'lesson-header',
          target: 'lesson-header',
          route: lessonUrl,
          placement: 'bottom',
          title: 'Inside a Lesson',
          body: "A clean two-level header shows exactly where the student is — breadcrumbs, lesson title, live progress counter. Nothing unnecessary.",
        },
        {
          id: 'lesson-ticker',
          target: 'lesson-ticker',
          route: lessonUrl,
          placement: 'bottom',
          title: 'Slide Progress',
          body: 'Each dot is a slide. Blue means visited. Students always know exactly where they are and how much is left — no guessing.',
        },
        {
          id: 'slide-canvas',
          target: 'slide-canvas',
          route: lessonUrl,
          placement: 'right',
          title: '15 Slide Types',
          body: 'Lessons are built from 15 different types: text, multiple choice, flashcards, matching, fill-in-the-blank, Desmos graphs, diagrams, PhET simulations, timelines, hotspot annotations, charts, and embedded tools. Each one is purpose-built — not just a PDF reader.',
        },
        {
          id: 'lesson-footer',
          target: 'lesson-footer',
          route: lessonUrl,
          placement: 'top',
          title: 'Navigation',
          body: 'Previous / Next buttons, or just use the arrow keys. Progress auto-saves every time a slide changes — students always pick up exactly where they left off.',
        },
        {
          id: 'calc-btn',
          target: 'calc-btn',
          route: lessonUrl,
          placement: 'bottom',
          title: 'Built-in Calculator',
          body: "There's a floating Desmos graphing and scientific calculator on every lesson page. Open it over any slide, do the working, close it — it remembers everything typed.",
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
      body: "Hey! Harry built this to make structured learning actually stick. Let me take you through what's here — it should only take a couple of minutes and I think you'll like what you see.",
    },
    {
      id: 'nav-curriculum',
      target: 'nav-curriculum',
      route: '/courses',
      placement: 'bottom',
      title: 'The Curriculum',
      body: 'This is where all the learning lives. Courses covering real financial topics — budgeting, tax, super, investing — structured for Australian students.',
    },
    {
      id: 'courses-grid',
      target: 'courses-grid',
      route: '/courses',
      placement: 'top',
      title: 'Course Library',
      body: 'Each course breaks down into modules, and modules into focused lessons. Students work through them at their own pace, and their progress is automatically saved and tracked.',
    },
    ...lessonSteps,
    {
      id: 'tools-grid',
      target: 'tools-grid',
      route: '/tools',
      placement: 'top',
      title: 'Financial Instruments',
      body: "These standalone calculators are live right now — tax, salary, mortgage, compound interest, budget, super, GST, and more. No account needed, anyone can just open and use them.",
    },
    {
      id: 'editor-code-form',
      target: 'editor-code-form',
      route: '/editor',
      placement: 'right',
      interactive: true,
      title: 'The Lesson Creator',
      body: "This is where content gets built. It's gated by an access code — only you and whoever you authorise can create and edit lessons. Go ahead and enter the code, then press Next to continue.",
    },
    {
      id: 'editor-workspace',
      target: 'editor-workspace',
      route: '/editor',
      placement: 'bottom',
      title: 'Content Workspace',
      body: 'Inside you get a full content management dashboard. Create courses, add modules, build lessons. Publish or unpublish anything with one click. Everything visible at a glance.',
    },
    {
      id: 'editor-ai',
      target: null,
      route: '/editor',
      placement: 'center',
      wide: true,
      title: 'AI Lesson Generation',
      body: "Click into any lesson and open the AI panel on the right. Paste curriculum notes or upload a PDF, set the slide count, and it generates a full structured lesson in seconds. It plans in text first, then converts to slides — so the output is much more structured and reliable than a single-shot prompt.",
    },
    {
      id: 'future-plans',
      target: null,
      route: null,
      placement: 'center',
      wide: true,
      title: "What's Next for Caplet",
      futurePlans: true,
    },
  ];
}

export function TourProvider({ children }) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const navigatedRef = useRef(false);

  const startTour = useCallback(async () => {
    let lessonUrl = null;
    try {
      const data = await api.getCourses();
      const courseList = Array.isArray(data) ? data : (data?.courses || []);
      outer: for (const course of courseList) {
        for (const mod of course.modules || []) {
          for (const lesson of mod.lessons || []) {
            if (lesson.id) {
              lessonUrl = `/courses/${course.id}/lessons/${lesson.id}`;
              break outer;
            }
          }
        }
      }
    } catch {
      // no lesson available — lesson steps are skipped
    }
    const builtSteps = buildSteps(lessonUrl);
    setSteps(builtSteps);
    setStepIndex(0);
    setActive(true);
  }, []);

  const end = useCallback(() => {
    setActive(false);
    setStepIndex(0);
  }, []);

  const next = useCallback(() => {
    setStepIndex((i) => {
      const nextI = i + 1;
      if (nextI >= steps.length) {
        setActive(false);
        return 0;
      }
      return nextI;
    });
  }, [steps.length]);

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  // Navigate to the step's route when the step changes
  useEffect(() => {
    if (!active || steps.length === 0) return;
    const step = steps[stepIndex];
    if (!step?.route) return;
    if (location.pathname !== step.route) {
      navigatedRef.current = true;
      navigate(step.route);
    }
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
