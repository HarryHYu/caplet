import { createElement, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BanknotesIcon,
  CalculatorIcon,
  ChartBarSquareIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Badge, Button, Card, PageShell, SectionHeader, StatCard } from '../components/ui';

const jargonPairs = [
  { complex: 'Amortisation', plain: 'Paying off a loan in regular chunks until it is gone.' },
  { complex: 'Capital gains', plain: 'The profit you make when you sell something for more than you paid.' },
  { complex: 'Compound interest', plain: 'Interest on your savings, plus interest on the interest already earned.' },
  { complex: 'Franking credits', plain: 'A tax credit that can reduce double-taxing company profits.' },
];

const featuredCourses = [
  'Budgeting Fundamentals',
  'Understanding Tax',
  'Superannuation 101',
];

const pillars = [
  {
    icon: ChatBubbleLeftRightIcon,
    title: 'Plain-English lessons',
    description: 'No jargon-first definitions. Each lesson starts with the real decision a learner is trying to make.',
  },
  {
    icon: CalculatorIcon,
    title: 'Practical tools',
    description: 'Calculators and examples help learners test trade-offs with Australian assumptions and familiar language.',
  },
  {
    icon: AcademicCapIcon,
    title: 'Structured pathways',
    description: 'Courses and modules build confidence step by step, from foundations through to more advanced concepts.',
  },
];

const outcomes = [
  'Build a budget that can survive real life.',
  'Understand tax, super, loans, and investing basics.',
  'Practise with calculators before making decisions.',
  'Track progress through short, focused modules.',
];

const faqs = [
  {
    question: 'Is Caplet financial advice?',
    answer:
      'No. Caplet is education, not personal advice. We explain concepts clearly so learners can ask better questions and make more informed decisions.',
  },
  {
    question: 'Who is Caplet for?',
    answer:
      'Anyone who wants a calmer introduction to money topics, especially Australian students, early-career learners, and teachers looking for accessible material.',
  },
  {
    question: 'Do I need an account?',
    answer:
      'You can explore public pages without an account. Creating an account lets you save progress and continue courses where you left off.',
  },
];

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card padding="none" variant="flat" className="overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left sm:px-6"
        aria-expanded={isOpen}
      >
        <span className="font-display text-lg font-semibold tracking-tight text-text-primary sm:text-xl">{question}</span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-soft bg-surface-raised text-text-muted">
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180 text-accent' : ''}`} />
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-48' : 'max-h-0'}`}>
        <p className="px-5 pb-5 text-sm leading-6 text-text-muted sm:px-6 sm:text-base">{answer}</p>
      </div>
    </Card>
  );
}

export default function Home() {
  const [jargonIndex, setJargonIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setJargonIndex((index) => (index + 1) % jargonPairs.length);
    }, 3600);

    return () => window.clearInterval(interval);
  }, []);

  const currentJargon = jargonPairs[jargonIndex];

  return (
    <PageShell contained={false} spacing="sm" className="overflow-hidden">
      <section className="relative border-b border-line-soft py-20 sm:py-24 lg:py-32">
        <div className="absolute inset-0 grid-technical opacity-30" aria-hidden="true" />
        <div className="container-custom relative grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-4xl">
            <Badge variant="accent" className="mb-6">Financial literacy, made calmer</Badge>
            <h1 className="text-5xl font-bold tracking-tight text-text-primary sm:text-6xl lg:text-7xl">
              Learn money skills without the finance fog.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-text-muted sm:text-xl">
              Caplet turns Australian personal finance into friendly lessons, guided modules, and practical tools you can use before money decisions feel urgent.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button as={Link} to="/courses" size="lg">
                Explore courses <ArrowRightIcon className="h-5 w-5" />
              </Button>
              <Button as={Link} to="/tools" variant="secondary" size="lg">
                Try calculators
              </Button>
            </div>
          </div>

          <Card padding="lg" className="relative overflow-hidden">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-accent-soft blur-3xl" aria-hidden="true" />
            <div className="relative">
              <div className="mb-8 flex items-center justify-between gap-4">
                <Badge variant="neutral">Live lesson preview</Badge>
                <SparklesIcon className="h-6 w-6 text-accent" />
              </div>
              <div className="rounded-xl border border-line-soft bg-surface-soft p-5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-text-dim">Finance term</p>
                <p className="mt-3 font-serif text-4xl italic text-text-primary">{currentJargon.complex}</p>
              </div>
              <div className="mt-4 rounded-xl border border-accent/20 bg-accent-soft p-5">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Caplet translation</p>
                <p className="mt-3 text-lg leading-7 text-text-primary">{currentJargon.plain}</p>
              </div>
              <div className="mt-8 space-y-3">
                {featuredCourses.map((course, index) => (
                  <div key={course} className="flex items-center justify-between rounded-lg border border-line-soft bg-surface-raised p-4">
                    <span className="text-sm font-semibold text-text-primary">{course}</span>
                    <Badge size="sm" variant={index === 0 ? 'accent' : 'neutral'}>{index === 0 ? 'Start' : 'Next'}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="container-custom py-16 sm:py-20">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Course library" value="Free" trend="Public access" footer="Browse foundations before creating an account." />
          <StatCard label="Learning style" value="Short" trend="Focused modules" footer="Designed for mobile review and classroom use." />
          <StatCard label="Built for" value="AU" trend="Local context" footer="Examples reference Australian tax, super, and common terms." />
        </div>
      </section>

      <section className="container-custom py-16 sm:py-20">
        <SectionHeader eyebrow="How it works" title="A better front door to financial confidence.">
          The public experience now follows the same card, badge, button, and spacing system used across the product.
        </SectionHeader>
        <div className="grid gap-5 md:grid-cols-3">
          {pillars.map(({ icon: PillarIcon, title, description }) => (
            <Card key={title} padding="lg" interactive>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
                {createElement(PillarIcon, { className: 'h-6 w-6', 'aria-hidden': true })}
              </div>
              <h3 className="text-xl font-bold tracking-tight text-text-primary">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-text-muted">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="container-custom py-16 sm:py-20">
        <Card padding="lg" variant="inverse" className="grid gap-10 overflow-hidden lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Badge variant="inverse" className="mb-5">Foundation sprint</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-text-contrast sm:text-4xl">From confused to capable, one module at a time.</h2>
            <p className="mt-5 text-base leading-7 text-text-contrast/75">
              Start with a course, open a module, then practise with a tool. Caplet keeps the interface predictable so the learning can stay front and centre.
            </p>
            <Button as={Link} to="/courses" variant="primary" className="mt-8">
              Start learning
            </Button>
          </div>
          <div className="grid gap-3">
            {outcomes.map((outcome) => (
              <div key={outcome} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 text-text-contrast">
                <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-sm leading-6">{outcome}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="container-custom py-16 sm:py-20">
        <SectionHeader eyebrow="Public questions" title="Answers before you sign in." />
        <div className="grid gap-3">
          {faqs.map((faq) => <FAQItem key={faq.question} {...faq} />)}
        </div>
      </section>

      <section className="container-custom pb-20 pt-10 sm:pb-28">
        <Card padding="lg" className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant="accent" className="mb-4">Ready when you are</Badge>
            <h2 className="text-3xl font-bold tracking-tight text-text-primary">Choose a course and take the first small step.</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button as={Link} to="/register">Create account</Button>
            <Button as={Link} to="/courses" variant="secondary">Browse library</Button>
          </div>
        </Card>
      </section>
    </PageShell>
  );
}
