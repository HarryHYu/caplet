import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRightIcon,
  BanknotesIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { revealOnScroll, useReveal } from '../lib/useReveal';

gsap.registerPlugin(ScrollTrigger);

const Scribble = ({ className = '', pathClass = '', stroke = 'stroke-blue', width = 3 }) => (
  <svg className={`absolute left-1/2 top-1/2 h-[150%] w-[118%] -translate-x-1/2 -translate-y-1/2 overflow-visible pointer-events-none ${className}`} viewBox="0 0 200 90" preserveAspectRatio="none" aria-hidden="true">
    <path className={`ink-draw ${stroke} ${pathClass}`} pathLength="1" strokeWidth={width} vectorEffect="non-scaling-stroke" d="M48 14 C 96 3 168 6 186 30 C 198 50 150 78 96 80 C 38 82 8 66 8 42 C 8 21 28 13 58 11" />
  </svg>
);

const Arrow = ({ className = '', pathClass = '', stroke = 'stroke-mark', width = 3 }) => (
  <svg className={`pointer-events-none overflow-visible ${className}`} viewBox="0 0 120 90" fill="none" aria-hidden="true">
    <path className={`ink-draw ${stroke} ${pathClass}`} pathLength="1" strokeWidth={width} vectorEffect="non-scaling-stroke" d="M14 10 C 36 32 44 58 78 70" />
    <path className={`ink-draw ${stroke} ${pathClass}`} pathLength="1" strokeWidth={width} vectorEffect="non-scaling-stroke" d="M78 70 L 58 66 M78 70 L 70 50" />
  </svg>
);

const Check = ({ className = '', pathClass = '', stroke = 'stroke-green', width = 3.2 }) => (
  <svg className={`pointer-events-none overflow-visible ${className}`} viewBox="0 0 28 24" fill="none" aria-hidden="true">
    <path className={`ink-draw ${stroke} ${pathClass}`} pathLength="1" strokeWidth={width} vectorEffect="non-scaling-stroke" d="M4 13 L 11 21 L 25 3" />
  </svg>
);

const Widget = ({ className = '', tilt = '0deg', delay = '0s', block = 'block-cream', children }) => (
  <div className={`widget absolute ${className}`}>
    <div className={`animate-soft-float rounded-2xl ${block} p-4 shadow-card`} style={{ '--tilt': tilt, animationDelay: delay }}>
      {children}
    </div>
  </div>
);

const pathways = [
  {
    title: 'Subjects',
    description: 'Notes, lessons and practice organised by subject.',
    href: '/library',
    icon: BookOpenIcon,
  },
  {
    title: 'Assessment dates',
    description: 'See what is coming up and prepare in time.',
    href: '/assessments',
    icon: CalendarDaysIcon,
  },
  {
    title: 'Practice',
    description: 'Work through focused questions and review mistakes.',
    href: '/practice',
    icon: PencilSquareIcon,
  },
  {
    title: 'Financial tools',
    description: 'Simple calculators for everyday money decisions.',
    href: '/money/tools',
    icon: BanknotesIcon,
  },
];

const principles = [
  'See the next useful step without searching for it.',
  'Keep notes, practice and planning in one place.',
  'Use clear explanations without unnecessary jargon.',
];

const featureHighlights = [
  { tag: 'build', title: 'Lesson builder', body: 'Combine text, images, video, code and quizzes into complete interactive lessons.', to: '/courses', block: 'block-blue' },
  { tag: 'code', title: 'Live code IDE', body: 'Run Python, JavaScript and HTML in the browser with tests and guided debugging.', to: '/courses', block: 'block-blue' },
  { tag: 'graph', title: 'Graphing tools', body: 'Use responsive plotting and geometry tools to explore ideas instead of only reading them.', to: '/courses', block: 'block-green' },
  { tag: 'check', title: 'Quizzes and grading', body: 'Mix focused checks into lessons and keep track of progress as students practise.', to: '/practice', block: 'block-amber' },
  { tag: 'ai', title: 'AI lesson generation', body: 'Draft structured slides, questions and a lesson plan, then edit everything before publishing.', to: '/courses', block: 'block-blue' },
  { tag: 'class', title: 'Classrooms', body: 'Organise students, assignments and submissions without separating them from the learning material.', to: '/classes', block: 'block-blue' },
];

const faqItems = [
  { question: 'Is Caplet free?', answer: 'Caplet’s core learning, classroom and financial-education tools are currently available without subscription or per-seat pricing.' },
  { question: 'What can I study on Caplet?', answer: 'You can organise your selected subjects, open learning resources, practise questions, plan study, save notes and prepare for upcoming assessments in one place.' },
  { question: 'Can teachers build their own lessons?', answer: 'Yes. Teachers can create courses, add modules and lessons, combine interactive content blocks, preview the student experience and publish reviewed material.' },
  { question: 'Does Caplet support tests and grading?', answer: 'Caplet supports quizzes, timed practice, classroom assignments, written feedback and assessment records. Practice guidance does not replace an official teacher mark.' },
  { question: 'Are the financial tools made for Australia?', answer: 'Yes. The calculators are designed around Australian concepts such as income tax, Medicare levy, superannuation, GST and HECS or HELP. They are educational tools, not personal financial advice.' },
  { question: 'How is student information handled?', answer: 'Caplet keeps financial information separate from classroom learning views and does not sell personal information or use student data for targeted advertising. The Trust Centre explains current controls and providers.' },
];

export default function Home() {
  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const lenisRef = useRef(null);
  const [activeFaq, setActiveFaq] = useState(0);

  useReveal(rootRef);

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      const root = rootRef.current;
      root?.querySelectorAll('.ink-draw').forEach((path) => { path.style.strokeDashoffset = '0'; });
      root?.querySelectorAll('.hl-swipe').forEach((element) => { element.style.setProperty('--hl-w', '100%'); });
      return undefined;
    }

    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    const observers = [];

    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
      timeline.from('.hero-kicker', { y: 12, opacity: 0, duration: 0.5 })
        .from('.hero-line', { y: 26, opacity: 0, duration: 0.8, stagger: 0.1 }, '-=0.2')
        .to('.hero-hl', { '--hl-w': '100%', duration: 0.5, ease: 'power2.out' }, '-=0.15')
        .to('.hero-circle', { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' }, '-=0.1')
        .from('.hero-sub', { y: 14, opacity: 0, duration: 0.5 }, '-=0.5')
        .from('.hero-cta', { y: 14, opacity: 0, duration: 0.5, stagger: 0.1 }, '-=0.3')
        .to('.hero-arrow', { strokeDashoffset: 0, duration: 0.55, ease: 'power2.inOut' }, '-=0.2')
        .from('.hero-note', { opacity: 0, scale: 0.85, rotate: -8, duration: 0.4 }, '-=0.2')
        .from('.widget', { y: 18, opacity: 0, scale: 0.92, duration: 0.6, stagger: 0.08 }, '-=1.1');

      gsap.utils.toArray('.ink-draw:not(.hero-mark)').forEach((path) => {
        const trigger = path.closest('[data-mark]') || path;
        revealOnScroll(trigger, path, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut' }, '0px 0px -18% 0px', observers);
      });
      gsap.utils.toArray('.hl-swipe:not(.hero-mark)').forEach((element) => {
        revealOnScroll(element, element, { '--hl-w': '0%' }, { '--hl-w': '100%', duration: 0.55, ease: 'power2.out' }, '0px 0px -14% 0px', observers);
      });
      gsap.to('.hero-widgets', { yPercent: -8, ease: 'none', scrollTrigger: { trigger: heroRef.current, start: 'top top', end: 'bottom top', scrub: 0.6 } });
    }, rootRef);

    return () => {
      context.revert();
      observers.forEach((observer) => observer.disconnect());
      lenisRef.current?.destroy();
      lenisRef.current = null;
      gsap.ticker.remove(raf);
    };
  }, []);

  const goTo = (selector) => {
    if (lenisRef.current) lenisRef.current.scrollTo(selector, { offset: -32 });
    else document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div ref={rootRef} className="home-root relative overflow-x-clip bg-surface-body text-text-primary selection:bg-[color:var(--mark-blue)] selection:text-accent-contrast">
      <section ref={heroRef} className="relative flex min-h-screen items-center justify-center overflow-hidden pb-16 pt-24">
        <div className="pointer-events-none absolute left-1/2 top-[22%] h-[58vw] max-h-[720px] w-[58vw] max-w-[720px] -translate-x-1/2 rounded-full bg-[color:var(--block-blue)] opacity-80 blur-[130px]" />
        <div className="pointer-events-none absolute bottom-[8%] right-[12%] h-[28vw] max-h-[360px] w-[28vw] max-w-[360px] rounded-full bg-[color:var(--block-amber)] opacity-70 blur-[120px]" />

        <div className="hero-widgets pointer-events-none absolute inset-0 hidden xl:block">
          <Widget className="left-[12vw] top-[15vh] w-auto" tilt="-4deg" block="block-blue">
            <div className="flex items-center gap-2 px-1"><span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--mark-green)]" /><span className="text-sm font-bold text-text-primary">learning together right now</span></div>
          </Widget>
          <Widget className="left-[4vw] top-[24vh] w-56" tilt="3deg" delay="0.5s">
            <p className="mb-2 font-hand text-base text-blue -rotate-2 inline-block">ask anything</p><p className="mb-1.5 rounded-lg rounded-tl-sm bg-[color:var(--block-blue)] p-2 text-[11px] text-text-primary">How does compound interest work?</p><p className="rounded-lg rounded-tr-sm bg-[color:var(--block-green)] p-2 text-[11px] text-text-primary">It is interest earned on interest. Let us plot it.</p>
          </Widget>
          <Widget className="right-[5vw] top-[13vh] w-60" tilt="-2deg" delay="0.3s">
            <p className="mb-2 font-hand text-base text-blue -rotate-2 inline-block">drag &amp; drop</p><div className="mb-2.5 flex gap-1.5">{['Text', 'Code', 'Quiz'].map((item) => <span key={item} className="rounded-md bg-[color:var(--block-blue)] px-2 py-1 text-[11px] font-bold text-text-primary">{item}</span>)}</div><div className="space-y-1.5"><div className="h-2.5 w-3/4 rounded bg-line-soft" /><div className="h-2 w-full rounded bg-surface-soft" /><div className="flex h-10 items-center justify-center rounded-lg bg-[color:var(--block-amber)] text-[11px] font-bold text-text-primary">Live preview</div></div>
          </Widget>
          {/* Token exemption: the raw hex below is a deliberate mock of a code
              editor/terminal chrome (macOS traffic lights + VS Code syntax
              colours). It stays theme-independent by design, so these literals
              intentionally bypass the surface/text token system. */}
          <Widget className="left-[5vw] top-[50vh] w-56" tilt="-3deg" delay="0.9s" block="block-cream">
            {/* Code-editor mock — a picture of an always-dark editor chrome, so its
                literal hex ink (including text-white) is intentional, not a token gap. */}
            <div className="overflow-hidden rounded-lg bg-[#1b1b1b] font-mono text-[10px] text-[#d4d4d4]"><div className="flex gap-1 bg-[#262626] px-2.5 py-1.5"><span className="h-2 w-2 rounded-full bg-[#ff5f56]" /><span className="h-2 w-2 rounded-full bg-[#ffbd2e]" /><span className="h-2 w-2 rounded-full bg-[#27c93f]" /></div><div className="p-2.5 leading-relaxed"><div><span className="text-[#569cd6]">def</span> <span className="text-[#dcdcaa]">value</span>(x):</div><div className="pl-3"><span className="text-[#c586c0]">return</span> x ** <span className="text-[#b5cea8]">2</span></div><div className="mt-1 text-white">&gt; 2.56</div></div></div>
          </Widget>
          <Widget className="right-[4vw] top-[46vh] w-56" tilt="3deg" delay="1.1s" block="block-cream">
            <div className="mb-2 flex items-center justify-between"><span className="font-mono text-[11px] text-text-primary">f(x) = sin x</span><span className="font-hand text-base text-blue -rotate-2 inline-block">drag me</span></div><div className="relative h-16"><div className="absolute inset-x-0 top-1/2 h-px bg-line-soft" /><svg viewBox="0 0 200 70" className="h-full w-full text-[color:var(--mark-blue)]" preserveAspectRatio="none" aria-hidden="true"><path d="M0 35 Q 25 4 50 35 T 100 35 T 150 35 T 200 35" fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" /></svg></div>
          </Widget>
          <Widget className="bottom-[13vh] right-[8vw] w-60" tilt="-2deg" delay="0.2s" block="block-green">
            <div className="mb-2 flex items-center justify-between"><span className="font-hand text-base text-green -rotate-2 inline-block">compounding</span><span className="text-[11px] font-bold text-green">+8.5%</span></div><div className="flex h-16 items-end"><svg viewBox="0 0 120 60" className="h-full w-full text-[color:var(--mark-green)]" preserveAspectRatio="none" aria-hidden="true"><path d="M2 56 Q 40 50 64 32 T 118 6" fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinecap="round" /><circle cx="118" cy="6" r="3.2" className="fill-[color:var(--mark-green)]" /></svg></div>
          </Widget>
          <Widget className="bottom-[12vh] left-[9vw] w-52" tilt="3deg" delay="0.7s" block="block-amber">
            <div className="mb-2 flex items-center justify-between"><span className="font-hand text-base text-blue -rotate-2 inline-block">quick check</span><Check className="h-4 w-5" /></div><div className="space-y-1.5">{['A whole number', 'A fraction', 'An integer'].map((option, index) => <div key={option} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${index === 2 ? 'bg-[color:var(--block-green)] text-text-primary' : 'bg-surface-raised text-text-muted'}`}>{option}</div>)}</div>
          </Widget>
        </div>

        <div className="relative z-10 flex max-w-3xl flex-col items-center px-5 text-center">
          <p className="hero-kicker mb-5 font-hand text-2xl md:text-[1.65rem] text-blue -rotate-2 inline-block">made for students, built around learning</p>
          <h1 aria-label="Study, practise, and stay on track." className="font-display text-[clamp(3rem,8.5vw,6.25rem)] font-extrabold leading-[0.96] tracking-[-0.03em] text-text-primary">
            <span className="hero-line block">Study, <span className="hero-hl hero-mark hl-swipe">practise</span>,</span>
            <span className="hero-line block">and stay <span className="relative inline-block">on track.<Scribble pathClass="hero-circle hero-mark" /></span></span>
          </h1>
          <p className="hero-sub body-text mx-auto mt-8 max-w-xl">Keep your subjects, notes, practice, study plan and upcoming assessments together—so you always know what to do next.</p>
          <div className="relative mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/register" className="hero-cta focus-ring press inline-flex items-center gap-2 rounded-2xl bg-[color:var(--mark-blue)] px-7 py-4 text-base font-bold text-accent-contrast shadow-pop press">Start learning <ArrowRightIcon className="h-5 w-5" aria-hidden="true" /></Link>
            <button type="button" onClick={() => goTo('#features')} className="hero-cta focus-ring press block-blue inline-flex items-center gap-2 rounded-2xl px-6 py-4 text-base font-bold text-text-primary press">See how it works</button>
            <div className="hero-note pointer-events-none absolute -bottom-16 left-1/2 hidden -translate-x-[9rem] -rotate-6 sm:block"><span className="font-hand text-xl text-mark -rotate-2 inline-block">it’s genuinely free</span><Arrow className="absolute -top-11 left-2 h-12 w-16 rotate-180" pathClass="hero-arrow hero-mark" stroke="stroke-mark" /></div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20" aria-labelledby="home-pathways">
        <div className="container-custom">
          <div className="mb-8 flex items-end justify-between gap-6">
            <div>
              <h2 id="home-pathways" className="font-display text-3xl font-extrabold tracking-tight">Everything in its place</h2>
              <p className="mt-2 text-base text-text-muted">Choose where you want to begin.</p>
            </div>
          </div>
          <div className="grid border-y border-line-soft md:grid-cols-2 xl:grid-cols-4">
            {pathways.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  to={item.href}
                  className={`group focus-ring flex min-h-52 flex-col px-1 py-8 md:px-6 ${index > 0 ? 'border-t border-line-soft md:border-t-0 md:border-l' : ''} ${index === 2 ? 'md:border-l-0 xl:border-l' : ''}`}
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-7 text-lg font-bold text-text-primary group-hover:text-accent">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">{item.description}</p>
                  <span className="mt-auto pt-6 text-sm font-bold text-accent">Open</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-line-soft py-20 md:py-28" aria-labelledby="home-features" data-mark>
        <div className="container-custom">
          <div className="reveal flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="section-kicker">More than a dashboard</p>
              <h2 id="home-features" className="font-display text-3xl font-extrabold tracking-tight md:text-5xl">Everything is in the box.</h2>
            </div>
            <p className="max-w-md text-base leading-relaxed text-text-muted">Build lessons, practise actively and keep the work around each subject connected.</p>
          </div>
          <div className="reveal-stagger mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureHighlights.map((feature) => (
              <Link key={feature.title} to={feature.to} className={`group card-lift focus-ring min-h-64 rounded-3xl ${feature.block} p-7`}>
                <span className="opacity-70 font-hand text-xl text-mark -rotate-2 inline-block">{feature.tag}</span>
                <h3 className="mt-2 font-display text-2xl font-bold text-text-primary group-hover:text-accent">{feature.title}</h3>
                <p className="body-text mt-3 !text-[1rem] !leading-[1.65]">{feature.body}</p>
                <span className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-accent">Explore <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20" aria-labelledby="home-principles">
        <div className="container-custom grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-20">
          <div>
            <p className="section-kicker">A clearer process</p>
            <h2 id="home-principles" className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
              Focus on learning, not navigating.
            </h2>
          </div>
          <ol className="divide-y divide-line-soft border-y border-line-soft">
            {principles.map((principle, index) => (
              <li key={principle} className="flex gap-4 py-6 text-base font-semibold leading-relaxed">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line-soft text-xs text-text-muted">{index + 1}</span>
                {principle}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-y border-line-soft py-20 md:py-28" aria-labelledby="home-faq">
        <div className="container-custom max-w-5xl">
          <h2 id="home-faq" className="reveal font-display text-3xl font-extrabold tracking-[-0.03em] text-text-primary md:text-5xl">Common <span className="hl-swipe hl-blue">questions</span></h2>
          <div className="reveal-stagger mt-10 space-y-3">
            {faqItems.map((item, index) => {
              const isOpen = activeFaq === index;
              return (
                <div key={item.question} className={`overflow-hidden rounded-3xl border border-line-soft bg-surface-raised transition-shadow duration-300 ${isOpen ? 'shadow-card' : ''}`}>
                  <button type="button" onClick={() => setActiveFaq(isOpen ? null : index)} className="focus-ring flex w-full items-center justify-between gap-4 rounded-3xl p-6 text-left" aria-expanded={isOpen} aria-controls={`faq-answer-${index}`}>
                    <span className="font-display text-lg font-bold text-text-primary md:text-xl">{item.question}</span>
                    <PlusIcon className={`h-6 w-6 shrink-0 text-accent transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} aria-hidden="true" />
                  </button>
                  <div id={`faq-answer-${index}`} className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden"><p className="body-text px-6 pb-6 !text-[1rem] !leading-[1.65]">{item.answer}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24" aria-labelledby="home-free">
        <div className="container-custom">
          <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="flex items-center gap-3 text-accent">
                <CheckCircleIcon className="h-6 w-6" aria-hidden="true" />
                <p className="text-sm font-extrabold">Free to use</p>
              </div>
              <h2 id="home-free" className="mt-4 max-w-2xl font-display text-3xl font-extrabold tracking-tight md:text-4xl">
                Start with one subject. Build from there.
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-text-muted">
                No ads and no complicated setup. Sign in, choose your subjects and continue from Today.
              </p>
            </div>
            <Link to="/register" className="btn-primary press focus-ring min-h-12 px-8">Create an account</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
