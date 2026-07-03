import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MarkerCursor from '../components/home/MarkerCursor';

gsap.registerPlugin(ScrollTrigger);

/* ── Hand-drawn ink marks (drawn on scroll via the .ink-draw class) ───────── */

const Scribble = ({ className = '', pathClass = '', stroke = 'stroke-blue', width = 3 }) => (
  <svg className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[118%] h-[150%] overflow-visible pointer-events-none ${className}`} viewBox="0 0 200 90" preserveAspectRatio="none" aria-hidden="true">
    <path className={`ink-draw ${stroke} ${pathClass}`} pathLength="1" strokeWidth={width} vectorEffect="non-scaling-stroke"
      d="M48 14 C 96 3 168 6 186 30 C 198 50 150 78 96 80 C 38 82 8 66 8 42 C 8 21 28 13 58 11" />
  </svg>
);

const Arrow = ({ className = '', pathClass = '', stroke = 'stroke-mark', width = 3 }) => (
  <svg className={`pointer-events-none overflow-visible ${className}`} viewBox="0 0 120 90" fill="none" aria-hidden="true">
    <path className={`ink-draw ${stroke} ${pathClass}`} pathLength="1" strokeWidth={width} vectorEffect="non-scaling-stroke"
      d="M14 10 C 36 32 44 58 78 70" />
    <path className={`ink-draw ${stroke} ${pathClass}`} pathLength="1" strokeWidth={width} vectorEffect="non-scaling-stroke"
      d="M78 70 L 58 66 M78 70 L 70 50" />
  </svg>
);

const Check = ({ className = '', pathClass = '', stroke = 'stroke-green', width = 3.2 }) => (
  <svg className={`pointer-events-none overflow-visible ${className}`} viewBox="0 0 28 24" fill="none" aria-hidden="true">
    <path className={`ink-draw ${stroke} ${pathClass}`} pathLength="1" strokeWidth={width} vectorEffect="non-scaling-stroke"
      d="M4 13 L 11 21 L 25 3" />
  </svg>
);

/* A floating hero widget: outer = load-reveal target, inner = ambient CSS float. */
const Widget = ({ className = '', tilt = '0deg', delay = '0s', block = 'block-cream', children }) => (
  <div className={`widget absolute ${className}`}>
    <div className={`animate-soft-float rounded-2xl ${block} shadow-[0_26px_50px_-30px_rgba(20,20,18,0.4)] p-4`} style={{ '--tilt': tilt, animationDelay: delay }}>
      {children}
    </div>
  </div>
);

/* ── Content ──────────────────────────────────────────────────────────────── */

const features = [
  { tag: 'build', title: 'Lesson builder', body: 'Drag blocks onto the page: text, images, video, code, quizzes. Arrange a whole lesson in minutes.', to: '/courses', block: 'block-blue' },
  { tag: 'code', title: 'Live code IDE', body: 'Python, JavaScript, and HTML run right in the browser, with test runners and an AI debugger.', to: '/tools', block: 'block-blue' },
  { tag: 'graph', title: 'Desmos and plotting', body: 'Drop in graphing panels and geometry widgets. A student drags a slider and the curve responds.', to: '/tools', block: 'block-green' },
  { tag: 'check', title: 'Quizzes and grading', body: 'Mix in quiz blocks and grading workflows that track every student’s progress automatically.', to: '/courses', block: 'block-amber' },
  { tag: 'ai', title: 'AI lesson generation', body: 'Describe a topic and Caplet drafts structured slides, quizzes, and a lesson plan for you to edit.', to: '/courses', block: 'block-blue' },
  { tag: 'class', title: 'Classrooms', body: 'Group students into classes, set assignments, and watch submissions arrive in real time.', to: '/classes', block: 'block-blue' },
];

const calculators = [
  'Income tax', 'Superannuation', 'Mortgage', 'GST', 'Compound interest',
  'Budget planner', 'Savings goal', 'Net worth', 'FIRE number', 'Salary',
  'Capital gains', 'Rule of 72', 'Emergency fund', 'Loan repayment',
  'Inflation', 'Rent vs buy', 'Credit-card payoff', 'Debt-to-income',
];

const newFeatures = [
  { tag: 'recall', title: 'Spaced-repetition review', body: 'Saved slides, quotes, and essay paragraphs resurface right before you would forget them.', to: '/revision', block: 'block-blue' },
  { tag: 'tutor', title: 'In-slide AI tutor', body: 'Stuck on a slide? Ask for a hint or a worked example without ever leaving the lesson.', to: '/courses', block: 'block-amber' },
  { tag: 'profile', title: 'Financial profile', body: 'Add your income, goals, and accounts once, and examples across Caplet use your real numbers.', to: '/settings/financial', block: 'block-green' },
];

const principles = [
  { k: 'free', title: 'Free, always', body: 'Build courses, tools, and workspaces for any subject. No tiers, no paywalls, no per-seat pricing.', note: 'yes, actually free' },
  { k: 'open', title: 'Open source', body: 'The whole codebase is yours to read, fork, and self-host. Own your classroom and its data.' },
  { k: 'hands', title: 'Hands-on', body: 'Fifteen and more block types, from rich text and quizzes to live IDEs and graphing calculators.' },
];

const faqItems = [
  { question: 'Is Caplet really free?', answer: 'Yes, genuinely. Caplet is an open learning playground with no subscription tiers, no per-seat pricing, and no user limits. Teachers and students build and complete whole courses without ever hitting a paywall, and there are no ads and nothing sold on the side. The finance tools, the lesson builder, the AI tutor, and classrooms are all included.' },
  { question: 'How do I publish my own curriculum?', answer: 'Sign up, open your dashboard, and create a course. Add modules and lessons, then drag in blocks: rich text, images, video, live code, graphing panels, and quizzes. Rearrange anything, preview it the way a student would see it, and share the link the moment it is ready. You can keep editing after publishing, and every change goes live instantly.' },
  { question: 'Can I host Caplet on my own servers?', answer: 'Yes. Caplet is fully open-source. Pull the code from the repository and deploy it on your own servers or a private cloud. It runs a React frontend and a Node and Express backend, using Postgres in production and SQLite for local development, so a single laptop is enough to get started.' },
  { question: 'Does it support grading and tests?', answer: 'It does. Embed live coding playgrounds with test runners, quiz blocks, and grading workflows that track every learner automatically. Group students into classrooms, set assignments with due dates, and watch submissions arrive in real time, with spaced repetition to help the material actually stick.' },
  { question: 'Are the financial calculators specific to Australia?', answer: 'Yes. Every calculator is built around Australian rules, including income tax brackets, the Medicare levy, superannuation, GST, and HECS and HELP. The new Debt Sequencer models HECS the way it actually works, indexed once a year rather than charged monthly interest, so the guidance stays correct instead of copying a generic overseas template. These are educational tools, not personal financial advice.' },
  { question: 'Is my financial data private?', answer: 'Your figures never leave your account. Your financial profile is stored against your login and used only to pre-fill the tools you choose to open. We do not sell data, we do not show ads, and nothing you enter is shared with third parties.' },
  { question: 'Do I need to know how to code to build a lesson?', answer: 'Not at all. Building a lesson is drag-and-drop, and you can assemble a full lesson in minutes without writing a single line of code. If you do want code, the live IDE runs Python, JavaScript, and HTML right in the browser, so you can add runnable examples whenever they help.' },
  { question: 'Can I use AI to help build a course?', answer: 'Yes. Describe a topic and Caplet drafts structured slides, quizzes, and a lesson plan for you to edit, so a blank page is never the starting point. An in-slide AI tutor also gives students hints and worked examples without leaving the lesson. The AI helps you create; it never touches the deterministic finance calculators.' },
];

const showcaseTabs = [
  { id: 'workspace', label: 'Lesson builder' },
  { id: 'ide', label: 'Live code' },
  { id: 'geometry', label: 'Graphing' },
];

const Home = () => {
  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const lenisRef = useRef(null);
  const [activeShowcaseTab, setActiveShowcaseTab] = useState('workspace');
  const [activeFaq, setActiveFaq] = useState(0);

  // The welcome page is intentionally a single colour: force the light theme
  // while it is mounted (the theme toggle is hidden here — see Navbar), then
  // restore the user's saved theme on leave so the dashboard and every other
  // page keep dark mode.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    return () => {
      if (localStorage.getItem('theme') === 'dark') root.classList.add('dark');
    };
  }, []);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Reduced motion: reveal every mark and highlight statically, do nothing else.
    if (reduce) {
      const root = rootRef.current;
      root?.querySelectorAll('.ink-draw').forEach((p) => { p.style.strokeDashoffset = '0'; });
      root?.querySelectorAll('.hl-swipe').forEach((el) => { el.style.setProperty('--hl-w', '100%'); });
      return;
    }

    let removeTicker;
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    removeTicker = () => gsap.ticker.remove(raf);

    const ctx = gsap.context(() => {
      // Hero opens, then writes its own annotations on top.
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.from('.hero-kicker', { y: 12, opacity: 0, duration: 0.5 })
        .from('.hero-line', { y: 26, opacity: 0, duration: 0.8, stagger: 0.1 }, '-=0.2')
        .to('.hero-hl', { '--hl-w': '100%', duration: 0.5, ease: 'power2.out' }, '-=0.15')
        .to('.hero-circle', { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' }, '-=0.1')
        .from('.hero-sub', { y: 14, opacity: 0, duration: 0.5 }, '-=0.5')
        .from('.hero-cta', { y: 14, opacity: 0, duration: 0.5, stagger: 0.1 }, '-=0.3')
        .to('.hero-arrow', { strokeDashoffset: 0, duration: 0.55, ease: 'power2.inOut' }, '-=0.2')
        .from('.hero-note', { opacity: 0, scale: 0.85, rotate: -8, duration: 0.4 }, '-=0.2')
        .from('.widget', { y: 18, opacity: 0, scale: 0.92, duration: 0.6, stagger: 0.08 }, '-=1.1');

      // Section reveals.
      gsap.utils.toArray('.reveal').forEach((el) => {
        gsap.from(el, { y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 86%' } });
      });
      gsap.utils.toArray('.reveal-stagger').forEach((group) => {
        gsap.from(group.children, { y: 34, opacity: 0, duration: 0.65, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: group, start: 'top 84%' } });
      });

      // Living annotations: ink marks draw + highlights swipe as they enter view.
      gsap.utils.toArray('.ink-draw:not(.hero-mark)').forEach((p) => {
        gsap.to(p, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut', scrollTrigger: { trigger: p.closest('[data-mark]') || p, start: 'top 82%' } });
      });
      gsap.utils.toArray('.hl-swipe:not(.hero-mark)').forEach((el) => {
        gsap.to(el, { '--hl-w': '100%', duration: 0.55, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 86%' } });
      });

      // Lenis-woven parallax: the whole widget constellation drifts with scroll.
      gsap.to('.hero-widgets', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: heroRef.current, start: 'top top', end: 'bottom top', scrub: 0.6 } });
    }, rootRef);

    return () => {
      ctx.revert();
      lenisRef.current?.destroy();
      lenisRef.current = null;
      removeTicker?.();
    };
  }, []);

  const goTo = (selector) => {
    const lenis = lenisRef.current;
    if (lenis) lenis.scrollTo(selector, { offset: -32 });
    else document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div ref={rootRef} className="home-root text-text-primary relative selection:bg-[color:var(--mark-blue)] selection:text-white overflow-x-clip">
      <MarkerCursor />

      {/* ───────── HERO ───────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-16">
        {/* soft ambient washes for depth */}
        <div className="absolute top-[22%] left-1/2 -translate-x-1/2 w-[58vw] h-[58vw] max-w-[720px] max-h-[720px] rounded-full bg-[color:var(--block-blue)] blur-[130px] opacity-80 pointer-events-none" />
        <div className="absolute bottom-[8%] right-[12%] w-[28vw] h-[28vw] max-w-[360px] max-h-[360px] rounded-full bg-[color:var(--block-amber)] blur-[120px] opacity-70 pointer-events-none" />

        {/* widget constellation (xl+ only, so it never crowds the headline) */}
        <div className="hero-widgets absolute inset-0 pointer-events-none hidden xl:block">
          {/* live learners chip */}
          <Widget className="top-[15vh] left-[12vw] w-auto" tilt="-4deg" block="block-blue">
            <div className="flex items-center gap-2 px-1">
              <span className="w-2 h-2 rounded-full bg-[color:var(--mark-green)] animate-pulse" />
              <span className="text-sm font-bold text-text-primary">1,240 learning now</span>
            </div>
          </Widget>

          {/* AI tutor */}
          <Widget className="top-[24vh] left-[4vw] w-56" tilt="3deg" delay="0.5s">
            <p className="font-hand text-base text-blue mb-2">ask anything</p>
            <p className="text-[11px] text-text-primary bg-[color:var(--block-blue)] rounded-lg rounded-tl-sm p-2 mb-1.5">How does compound interest work?</p>
            <p className="text-[11px] text-text-primary bg-[color:var(--block-green)] rounded-lg rounded-tr-sm p-2">It is interest earned on interest. Let us plot it.</p>
          </Widget>

          {/* lesson builder */}
          <Widget className="top-[13vh] right-[5vw] w-60" tilt="-2deg" delay="0.3s">
            <p className="font-hand text-base text-blue mb-2">drag &amp; drop</p>
            <div className="flex gap-1.5 mb-2.5">
              {['Text', 'Code', 'Quiz'].map((t) => (
                <span key={t} className="text-[11px] font-bold px-2 py-1 rounded-md bg-[color:var(--block-blue)] text-text-primary">{t}</span>
              ))}
            </div>
            <div className="space-y-1.5">
              <div className="h-2.5 w-3/4 rounded bg-line-soft" />
              <div className="h-2 w-full rounded bg-surface-soft" />
              <div className="h-10 rounded-lg bg-[color:var(--block-amber)] flex items-center justify-center text-[11px] font-bold text-text-primary">Live preview</div>
            </div>
          </Widget>

          {/* code snippet */}
          <Widget className="top-[50vh] left-[5vw] w-56" tilt="-3deg" delay="0.9s" block="block-cream">
            <div className="rounded-lg bg-[#1b1b1b] text-[#d4d4d4] overflow-hidden font-mono text-[10px]">
              <div className="bg-[#262626] px-2.5 py-1.5 flex gap-1">
                <span className="w-2 h-2 rounded-full bg-[#ff5f56]" />
                <span className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
                <span className="w-2 h-2 rounded-full bg-[#27c93f]" />
              </div>
              <div className="p-2.5 leading-relaxed">
                <div><span className="text-[#569cd6]">def</span> <span className="text-[#dcdcaa]">value</span>(x):</div>
                <div className="pl-3"><span className="text-[#c586c0]">return</span> x ** <span className="text-[#b5cea8]">2</span></div>
                <div className="text-white mt-1">&gt; 2.56</div>
              </div>
            </div>
          </Widget>

          {/* desmos / graphing */}
          <Widget className="top-[46vh] right-[4vw] w-56" tilt="3deg" delay="1.1s" block="block-cream">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[11px] text-text-primary">f(x) = sin x</span>
              <span className="font-hand text-base text-blue">drag me</span>
            </div>
            <div className="h-16 relative">
              <div className="absolute inset-x-0 top-1/2 h-px bg-line-soft" />
              <svg viewBox="0 0 200 70" className="w-full h-full text-[color:var(--mark-blue)]" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 35 Q 25 4 50 35 T 100 35 T 150 35 T 200 35" fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
              </svg>
            </div>
          </Widget>

          {/* growth graph */}
          <Widget className="bottom-[13vh] right-[8vw] w-60" tilt="-2deg" delay="0.2s" block="block-green">
            <div className="flex items-center justify-between mb-2">
              <span className="font-hand text-base text-green">compounding</span>
              <span className="text-[11px] font-bold text-green">+8.5%</span>
            </div>
            <div className="h-16 flex items-end">
              <svg viewBox="0 0 120 60" className="w-full h-full text-[color:var(--mark-green)]" preserveAspectRatio="none" aria-hidden="true">
                <path d="M2 56 Q 40 50 64 32 T 118 6" fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                <circle cx="118" cy="6" r="3.2" className="fill-[color:var(--mark-green)]" />
              </svg>
            </div>
          </Widget>

          {/* quiz */}
          <Widget className="bottom-[12vh] left-[9vw] w-52" tilt="3deg" delay="0.7s" block="block-amber">
            <div className="flex items-center justify-between mb-2">
              <span className="font-hand text-base text-blue">quick check</span>
              <Check className="w-5 h-4" />
            </div>
            <div className="space-y-1.5">
              {['A whole number', 'A fraction', 'An integer'].map((o, i) => (
                <div key={o} className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg ${i === 2 ? 'bg-[color:var(--block-green)] text-text-primary' : 'bg-surface-raised text-text-muted'}`}>{o}</div>
              ))}
            </div>
          </Widget>
        </div>

        {/* centered content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl px-5">
          <p className="hero-kicker font-hand text-2xl md:text-[1.65rem] text-blue mb-5 -rotate-2">free, open, and a little playful</p>

          <h1 className="font-bricolage font-extrabold text-text-primary leading-[0.96] tracking-[-0.03em] text-[clamp(3rem,8.5vw,6.25rem)]">
            <span className="hero-line block">Build,{' '}
              <span className="hero-hl hero-mark hl-swipe">learn</span>,
            </span>
            <span className="hero-line block">and ship{' '}
              <span className="relative inline-block">
                anything
                <Scribble pathClass="hero-circle hero-mark" />
              </span>
              .
            </span>
          </h1>

          <p className="hero-sub body-text mt-8 max-w-xl mx-auto">
            Caplet is a free, open platform for building interactive courses and learning from them.
            Lessons, live code, graphing, quizzes. No subscriptions. No lock-in.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 relative">
            <Link to="/register" className="hero-cta inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-[color:var(--mark-blue)] text-white text-base font-bold shadow-[0_12px_30px_-10px_rgba(19,81,170,0.5)] hover:-translate-y-0.5 transition-transform duration-200">
              Start building
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
            <button onClick={() => goTo('#features')} className="hero-cta inline-flex items-center gap-2 px-6 py-4 rounded-2xl block-blue text-text-primary text-base font-bold hover:-translate-y-0.5 transition-transform duration-200">
              See how it works
            </button>

            {/* hand-drawn note pointing at the primary action */}
            <div className="hero-note hidden sm:block absolute -bottom-16 left-1/2 -translate-x-[9rem] -rotate-6 pointer-events-none">
              <span className="font-hand text-xl text-mark">it’s genuinely free</span>
              <Arrow className="absolute -top-11 left-2 w-16 h-12 rotate-180" pathClass="hero-arrow hero-mark" stroke="stroke-mark" />
            </div>
          </div>
        </div>
      </section>

      {/* ───────── THESIS ───────── */}
      <section className="py-24 md:py-32 px-6 md:px-10" data-mark>
        <div className="max-w-[1100px] mx-auto">
          <h2 className="reveal font-bricolage font-extrabold text-text-primary leading-[1.02] tracking-[-0.03em] text-[clamp(2.25rem,5.5vw,4.25rem)] max-w-4xl">
            Most platforms profit from{' '}
            <span className="hl-swipe hl-blue">confusion</span>. We exist to{' '}
            <span className="relative inline-block">
              end it
              <Scribble stroke="stroke-blue" />
            </span>
            .
          </h2>
          <p className="reveal body-text mt-8 max-w-2xl">
            Learning tools love a locked door: a paywall here, an export you cannot take with you there.
            Caplet goes the other way. Everything is free, the code is open, and the lessons are built to be
            played with, not just read.
          </p>
        </div>
      </section>

      {/* ───────── WHY CAPLET ───────── */}
      <section className="pb-8 px-6 md:px-10">
        <div className="max-w-[1100px] mx-auto reveal-stagger grid md:grid-cols-3 gap-5">
          {principles.map((p) => (
            <div key={p.k} className="relative rounded-3xl block-cream p-7 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
              <span className="font-hand text-xl text-blue">{p.k}</span>
              <h3 className="font-bricolage font-bold text-2xl text-text-primary mt-1 mb-2.5">{p.title}</h3>
              <p className="body-text !text-[1rem] !leading-[1.65]">{p.body}</p>
              {p.note && (
                <span className="absolute -top-4 right-4 font-hand text-lg text-green -rotate-6 select-none">{p.note} ✓</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ───────── FEATURES (extensible) ───────── */}
      <section id="features" className="py-24 md:py-32 px-6 md:px-10" data-mark>
        <div className="max-w-[1200px] mx-auto">
          <div className="reveal flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <h2 className="font-bricolage font-extrabold text-text-primary leading-[1.02] tracking-[-0.03em] text-[clamp(2rem,4.5vw,3.5rem)]">
              <span className="hl-swipe">Everything</span> is in the box
            </h2>
            <p className="font-hand text-xl text-blue md:mb-2 md:-rotate-2">no add-ons. no upsells.</p>
          </div>

          <div className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <Link key={f.title} to={f.to} data-cursor className={`group rounded-3xl ${f.block} p-7 transition-transform duration-200 hover:-translate-y-1`}>
                <span className="font-hand text-xl text-mark opacity-70">{f.tag}</span>
                <h3 className="font-bricolage font-bold text-2xl text-text-primary mt-1 mb-2.5 flex items-center gap-2">
                  {f.title}
                  <svg className="w-5 h-5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </h3>
                <p className="body-text !text-[1rem] !leading-[1.6]">{f.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FINANCE BAND (financial literacy, grouped, own dark background) ───────── */}
      <section className="bg-[#171717] border-y border-white/10 py-24 md:py-32 px-6 md:px-10" data-mark>
        <div className="max-w-[1200px] mx-auto">
          <div className="reveal max-w-3xl">
            <p className="font-hand text-xl text-blue-300 mb-3 -rotate-2">built for Australia 🇦🇺</p>
            <h2 className="font-bricolage font-extrabold text-white leading-[1.02] tracking-[-0.03em] text-[clamp(2rem,4.5vw,3.5rem)]">
              Money, <span className="hl-swipe">made to make sense</span>
            </h2>
            <p className="body-text !text-white/70 mt-6 max-w-2xl">
              Caplet began as a free financial-literacy platform for Australians, and that is still its
              backbone. Learn tax, super, mortgages, and investing by running the numbers yourself, not
              by reading another explainer. Every calculator is built around Australian rules, and your
              figures never leave your account.
            </p>
          </div>

          <div className="reveal-stagger grid sm:grid-cols-3 gap-5 mt-12">
            <div className="rounded-3xl bg-white/[0.05] border border-white/10 p-7">
              <div className="font-bricolage font-extrabold text-4xl md:text-5xl text-blue-300">20+</div>
              <p className="!text-[1rem] !leading-[1.55] mt-2 text-white/65">interactive financial calculators, from income tax to your FIRE number</p>
            </div>
            <div className="rounded-3xl bg-white/[0.05] border border-white/10 p-7">
              <div className="font-bricolage font-extrabold text-4xl md:text-5xl text-emerald-300">AU-ready</div>
              <p className="!text-[1rem] !leading-[1.55] mt-2 text-white/65">tuned to Australian tax brackets, superannuation, and GST</p>
            </div>
            <div className="rounded-3xl bg-white/[0.05] border border-white/10 p-7">
              <div className="font-bricolage font-extrabold text-4xl md:text-5xl text-amber-300">$0</div>
              <p className="!text-[1rem] !leading-[1.55] mt-2 text-white/65">free forever, with no ads and no selling your data</p>
            </div>
          </div>

          <div className="reveal mt-10">
            <p className="font-hand text-lg text-blue-300 mb-3">run the numbers on</p>
            <div className="flex flex-wrap gap-2.5">
              {calculators.map((c) => (
                <span key={c} className="px-3.5 py-2 rounded-full bg-white/[0.06] border border-white/10 text-sm font-semibold text-white/80">{c}</span>
              ))}
              <Link to="/tools" data-cursor className="px-4 py-2 rounded-full bg-[color:var(--mark-blue)] text-white text-sm font-bold hover:-translate-y-0.5 transition-transform inline-flex items-center gap-1.5">
                See every tool
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
            </div>
          </div>

          {/* Debt Sequencer: newest finance tool, revealed like the other sections */}
          <div className="reveal rounded-[2rem] bg-[#262626] text-white p-8 md:p-12 mt-16 grid md:grid-cols-2 gap-x-10 gap-y-8 items-center">
            <div>
              <span className="font-hand text-xl text-white/55">just added</span>
              <h3 className="font-bricolage font-extrabold text-3xl md:text-4xl mt-1 mb-4">Debt Sequencer</h3>
              <p className="text-white/70 text-[1.05rem] leading-[1.7] mb-7 max-w-md">
                See what each of your debts actually costs to carry, ranked so a spare dollar clears the most
                cost first. HECS and HELP are handled on their own terms, indexed once a year, not treated like a
                credit card.
              </p>
              <Link to="/tools/debt-sequencer" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-black font-bold hover:-translate-y-0.5 transition-transform">
                Try the Debt Sequencer
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
            </div>

            {/* mock cost-ranking preview */}
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 space-y-3">
              <p className="font-hand text-lg text-white/55 mb-1">cost ranking</p>
              {[
                { n: '1', label: 'Store card', rate: '24%', note: 'costs the most to carry' },
                { n: '2', label: 'Visa', rate: '19.9%', note: 'next by interest cost' },
              ].map((r) => (
                <div key={r.n} className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-4">
                  <span className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center text-sm font-extrabold flex-shrink-0">{r.n}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-base">{r.label}</span>
                      <span className="text-sm text-white/60">{r.rate}</span>
                    </div>
                    <p className="text-sm text-white/55">{r.note}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-3 rounded-xl border border-white/15 p-4">
                <span className="w-10 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center text-[11px] font-extrabold flex-shrink-0">HECS</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-base">HECS / HELP</span>
                    <span className="text-sm text-white/60">~3.2% indexed</span>
                  </div>
                  <p className="text-sm text-white/55">shown separately, not monthly interest</p>
                </div>
              </div>
            </div>

            {/* playful finance elements filling the bottom of the black block */}
            <div className="md:col-span-2 mt-2 border-t border-white/10 pt-7 flex flex-wrap items-center gap-2.5">
              {[
                '💳 credit card', '🛍️ BNPL', '🎓 HECS / HELP', '🏦 personal loan',
                '📊 avalanche order', '📉 less interest', '％ indexation', '💰 spare cash first',
              ].map((t, i) => (
                <span key={t} className={`text-sm font-semibold text-white/75 bg-white/[0.06] border border-white/10 rounded-full px-3.5 py-1.5 ${i % 2 ? '-rotate-1' : 'rotate-1'}`}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── JUST SHIPPED (Essay Memoriser + new features) ───────── */}
      <section className="py-24 md:py-32 px-6 md:px-10" data-mark>
        <div className="max-w-[1200px] mx-auto">
          <div className="reveal flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <h2 className="font-bricolage font-extrabold text-text-primary leading-[1.02] tracking-[-0.03em] text-[clamp(2rem,4.5vw,3.5rem)]">
              Just <span className="hl-swipe">shipped</span>
            </h2>
            <p className="font-hand text-xl text-blue md:mb-2 md:-rotate-2">fresh out of the workshop</p>
          </div>

          {/* Essay Memoriser — feature spotlight */}
          <div className="reveal rounded-[2rem] block-blue p-8 md:p-10 grid md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="font-hand text-xl text-blue">brand new</span>
              <h3 className="font-bricolage font-extrabold text-3xl md:text-4xl text-text-primary mt-1 mb-4">Essay Memoriser</h3>
              <p className="body-text mb-7 max-w-md">
                Paste an essay or drop in a PDF. Caplet turns it into cloze gaps, quote cards, and
                paragraph-order drills, then schedules them with spaced repetition so the whole thing
                actually sticks before exam day.
              </p>
              <Link to="/essays" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[color:var(--mark-blue)] text-white font-bold hover:-translate-y-0.5 transition-transform">
                Try the memoriser
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
            </div>

            {/* mock preview */}
            <div className="rounded-2xl bg-surface-raised p-6 shadow-[0_24px_50px_-30px_rgba(20,20,18,0.4)] space-y-4">
              <div>
                <span className="font-hand text-base text-blue">cloze gap</span>
                <p className="body-text !text-[1rem] !leading-[1.8] mt-1">
                  In <span className="px-2 py-0.5 rounded bg-[color:var(--block-blue)] font-bold">1788</span> the First Fleet
                  arrived, marking the start of <span className="inline-block w-20 align-middle rounded bg-[color:var(--block-amber)]">&nbsp;</span> settlement.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-hand text-base text-blue mr-1">paragraph order</span>
                {['1', '2', '3', '4'].map((n) => (
                  <span key={n} className="w-7 h-7 rounded-lg bg-[color:var(--block-blue)] flex items-center justify-center text-sm font-bold text-text-primary">{n}</span>
                ))}
                <Check className="w-5 h-4 ml-1" />
              </div>
              <div className="rounded-xl bg-[color:var(--block-green)] p-3.5 text-sm font-semibold text-text-primary flex items-center justify-between">
                Quote card
                <span className="font-hand text-base text-green">tap to flip</span>
              </div>
            </div>
          </div>

          {/* other recent additions */}
          <div className="reveal-stagger grid sm:grid-cols-3 gap-5 mt-5">
            {newFeatures.map((f) => (
              <Link key={f.title} to={f.to} data-cursor className={`group rounded-3xl ${f.block} p-7 transition-transform duration-200 hover:-translate-y-1`}>
                <span className="font-hand text-xl text-mark opacity-70">{f.tag}</span>
                <h3 className="font-bricolage font-bold text-2xl text-text-primary mt-1 mb-2.5 flex items-center gap-2">
                  {f.title}
                  <svg className="w-5 h-5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </h3>
                <p className="body-text !text-[1rem] !leading-[1.6]">{f.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── SEE IT IN ACTION ───────── */}
      <section className="py-20 md:py-28 px-6 md:px-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="reveal flex items-center gap-4 mb-10">
            <h2 className="font-bricolage font-extrabold text-text-primary tracking-[-0.03em] text-[clamp(2rem,4.5vw,3.5rem)]">See it in action</h2>
            <span className="font-hand text-xl text-blue mt-3 hidden sm:block -rotate-3">try the tabs</span>
          </div>

          <div className="reveal">
            <div className="inline-flex flex-wrap gap-2 mb-7">
              {showcaseTabs.map((tab) => {
                const isActive = activeShowcaseTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveShowcaseTab(tab.id)}
                    className={`px-5 py-2.5 rounded-full text-sm font-bold transition-colors duration-200 ${isActive ? 'bg-[color:var(--mark-blue)] text-white' : 'block-cream text-text-primary hover:text-[color:var(--mark-blue)]'}`}>
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="rounded-[2rem] block-cream p-6 md:p-9 shadow-[0_40px_80px_-50px_rgba(20,20,18,0.4)] min-h-[440px] flex items-center">
              {activeShowcaseTab === 'workspace' && (
                <div className="w-full animate-fade-slide-up flex flex-col xl:flex-row gap-10 items-center">
                  <div className="flex-1">
                    <h3 className="font-bricolage font-bold text-3xl text-text-primary mb-4">A canvas you can drag, drop, and play with</h3>
                    <p className="body-text mb-7 max-w-md">Draft slides, drop in coding challenges, embed videos, and run a live classroom. The builder stays out of your way and keeps every block editable.</p>
                    <Link to="/courses" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[color:var(--mark-blue)] text-white font-bold hover:-translate-y-0.5 transition-transform">
                      Open the builder
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </Link>
                  </div>
                  <div className="w-full xl:w-[460px] rounded-2xl bg-surface-body p-4 shadow-[0_20px_40px_-28px_rgba(20,20,18,0.45)]">
                    <div className="flex gap-3 h-[260px]">
                      <div className="w-24 flex flex-col gap-2">
                        {['Text', 'Code', 'Chart', 'Quiz'].map((tool) => (
                          <div key={tool} className="p-2.5 rounded-xl block-blue text-sm font-bold text-text-primary cursor-grab">{tool}</div>
                        ))}
                      </div>
                      <div className="flex-1 flex flex-col gap-3">
                        <div className="h-12 rounded-xl block-blue flex items-center justify-center text-sm font-bold text-[color:var(--mark-blue)]">Drop a block here</div>
                        <div className="flex-1 rounded-xl bg-surface-raised p-4 flex flex-col gap-2">
                          <div className="w-3/4 h-4 rounded bg-line-soft" />
                          <div className="w-full h-2.5 rounded bg-surface-soft" />
                          <div className="w-5/6 h-2.5 rounded bg-surface-soft" />
                          <div className="mt-auto h-14 rounded-lg block-amber flex items-center justify-center text-sm font-bold text-text-primary">Live preview</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeShowcaseTab === 'ide' && (
                <div className="w-full animate-fade-slide-up flex flex-col xl:flex-row gap-10 items-center">
                  <div className="flex-1">
                    <h3 className="font-bricolage font-bold text-3xl text-text-primary mb-4">Run real code, right in the browser</h3>
                    <p className="body-text mb-7 max-w-md">Python, JavaScript, and HTML with instant visual feedback, test runners, and an AI debugger on hand. Nothing to install.</p>
                    <Link to="/tools" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[color:var(--mark-blue)] text-white font-bold hover:-translate-y-0.5 transition-transform">
                      Open the playground
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </Link>
                  </div>
                  <div className="w-full xl:w-[460px] rounded-2xl bg-[#1b1b1b] text-[#d4d4d4] overflow-hidden shadow-[0_24px_50px_-26px_rgba(0,0,0,0.6)]">
                    <div className="bg-[#262626] flex items-center px-4 py-2.5">
                      <div className="flex gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                        <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                        <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                      </div>
                      <div className="mx-auto text-[11px] font-mono text-[#8a8a8a]">main.py</div>
                    </div>
                    <div className="flex font-mono text-[12px] h-[200px]">
                      <div className="w-9 bg-[#1b1b1b] text-[#6a6a6a] text-right pr-3 pt-2 select-none flex flex-col gap-1">
                        {[1, 2, 3, 4, 5].map((n) => <span key={n}>{n}</span>)}
                      </div>
                      <div className="flex-1 p-3 pt-2 flex flex-col gap-1">
                        <div><span className="text-[#569cd6]">import</span> math</div>
                        <div><span className="text-[#569cd6]">def</span> <span className="text-[#dcdcaa]">value</span>(x):</div>
                        <div className="pl-6">y = math.<span className="text-[#dcdcaa]">sin</span>(x) * math.<span className="text-[#dcdcaa]">exp</span>(-<span className="text-[#b5cea8]">0.1</span> * x)</div>
                        <div className="pl-6"><span className="text-[#c586c0]">return</span> <span className="text-[#4ec9b0]">round</span>(y, <span className="text-[#b5cea8]">4</span>)</div>
                        <div className="mt-2"><span className="text-[#dcdcaa]">print</span>(<span className="text-[#dcdcaa]">value</span>(<span className="text-[#b5cea8]">1.57</span>))</div>
                      </div>
                    </div>
                    <div className="bg-[#1b1b1b] px-3 py-2.5 font-mono text-[11px] text-white border-t border-white/5">&gt; 0.8547</div>
                  </div>
                </div>
              )}

              {activeShowcaseTab === 'geometry' && (
                <div className="w-full animate-fade-slide-up flex flex-col xl:flex-row gap-10 items-center">
                  <div className="flex-1">
                    <h3 className="font-bricolage font-bold text-3xl text-text-primary mb-4">Graphing that students can touch</h3>
                    <p className="body-text mb-7 max-w-md">Drop interactive geometry and graphing panels into a lesson. Drag a parameter and watch the curve move, live.</p>
                    <Link to="/tools" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[color:var(--mark-blue)] text-white font-bold hover:-translate-y-0.5 transition-transform">
                      Plot a graph
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </Link>
                  </div>
                  <div className="w-full xl:w-[460px] rounded-2xl bg-surface-body overflow-hidden shadow-[0_20px_40px_-28px_rgba(20,20,18,0.45)]">
                    <div className="px-4 py-3 flex justify-between items-center">
                      <span className="font-mono text-xs text-text-primary">f(x) = sin(x) · e^(0.1x)</span>
                      <span className="font-hand text-base text-blue">drag me</span>
                    </div>
                    <div className="h-[240px] relative text-green">
                      <div className="absolute inset-x-0 top-1/2 h-px bg-line-soft" />
                      <div className="absolute inset-y-0 left-1/4 w-px bg-line-soft" />
                      <svg viewBox="0 0 500 240" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
                        <path d="M 0 120 Q 60 18 125 120 T 250 120 T 375 120 T 500 120" fill="none" stroke="currentColor" strokeWidth="3.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                        <circle cx="95" cy="52" r="5" className="fill-[color:var(--mark-green)] animate-pulse" />
                      </svg>
                      <div className="absolute bottom-4 right-4 rounded-xl bg-surface-raised p-3 font-mono text-[11px] flex flex-col gap-2 w-32 shadow-sm">
                        <label className="flex justify-between items-center gap-2"><span>a</span><input type="range" defaultValue="50" className="w-16 accent-[color:var(--mark-green)]" /></label>
                        <label className="flex justify-between items-center gap-2"><span>b</span><input type="range" defaultValue="30" className="w-16 accent-[color:var(--mark-green)]" /></label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="py-20 md:py-28 px-6 md:px-10">
        <div className="max-w-[1000px] mx-auto">
          <h2 className="reveal font-bricolage font-extrabold text-text-primary tracking-[-0.03em] text-[clamp(2rem,4.5vw,3.5rem)] mb-10">
            Common <span className="hl-swipe hl-blue">questions</span>
          </h2>
          <div className="reveal-stagger space-y-3">
            {faqItems.map((item, index) => {
              const isOpen = activeFaq === index;
              return (
                <div key={item.question} className={`rounded-3xl overflow-hidden block-cream transition-shadow duration-300 ${isOpen ? 'shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]' : ''}`}>
                  <button onClick={() => setActiveFaq(isOpen ? null : index)} className="w-full p-6 flex justify-between items-center text-left gap-4" aria-expanded={isOpen}>
                    <span className="font-bricolage font-bold text-lg md:text-xl text-text-primary">{item.question}</span>
                    <svg className={`w-6 h-6 flex-shrink-0 text-[color:var(--mark-blue)] transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M12 5v14M5 12h14" /></svg>
                  </button>
                  <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <p className="px-6 pb-6 body-text !text-[1rem] !leading-[1.65]">{item.answer}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── SIGN-OFF ───────── */}
      <section className="px-6 md:px-10 pb-28" data-mark>
        <div className="reveal max-w-[1200px] mx-auto rounded-[2.5rem] bg-[color:var(--mark-blue)] text-white px-8 py-16 md:px-16 md:py-24 text-center relative overflow-hidden">
          <p className="font-hand text-2xl text-white/85 mb-3 -rotate-2">ready when you are</p>
          <h2 className="font-bricolage font-extrabold leading-[1.02] tracking-[-0.03em] text-[clamp(2.25rem,5vw,4rem)] max-w-3xl mx-auto">
            Build your first course in an afternoon.
          </h2>
          <p className="mt-6 text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
            Start from a blank canvas or let AI draft your first lesson, add live code and quizzes, and share it
            with a single link. Or skip straight to the money tools and run your own numbers on tax, super,
            mortgages, and debt. Everything here is free, open-source, and built for Australia.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            {['Free forever', 'Open-source', 'Built for Australia', 'No ads, no lock-in', 'Your data stays yours'].map((t) => (
              <span key={t} className="text-sm font-semibold text-white bg-white/15 rounded-full px-4 py-2">{t}</span>
            ))}
          </div>

          <div className="mt-9 flex flex-wrap gap-3 justify-center">
            <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-[color:var(--mark-blue)] text-base font-bold hover:-translate-y-0.5 transition-transform">
              Create a course
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
            <Link to="/tools" className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-white/15 text-white text-base font-bold hover:bg-white/25 transition-colors">
              Explore the tools
            </Link>
            <Link to="/courses" className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-white/15 text-white text-base font-bold hover:bg-white/25 transition-colors">
              Browse the curriculum
            </Link>
          </div>

          <p className="mt-7 text-sm text-white/70">No credit card, and no account needed just to look around.</p>
        </div>
      </section>
    </div>
  );
};

export default Home;
