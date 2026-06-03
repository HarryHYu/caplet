import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const cardBase = 'rounded-xl border border-line-soft bg-surface-raised shadow-minimal';

const Button = ({ to, children, variant = 'primary', className = '' }) => {
  const variants = {
    primary: 'bg-accent text-white border-accent hover:bg-accent-strong hover:border-accent-strong',
    secondary: 'bg-surface-raised text-text-primary border-line-soft hover:border-text-dim hover:bg-surface-soft',
    inverse: 'bg-surface-raised text-accent border-surface-raised hover:bg-surface-soft',
  };

  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center rounded-lg border px-6 py-3 text-sm font-display font-bold tracking-wide transition-colors ${variants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`${cardBase} p-6 md:p-8 ${className}`}>{children}</div>
);

const SectionHeader = ({ kicker, title, children, align = 'left' }) => (
  <div className={`mb-10 ${align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}`}>
    <span className="section-kicker">{kicker}</span>
    <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-text-primary">
      {title}
    </h2>
    {children && (
      <p className="mt-5 text-lg leading-relaxed text-text-muted md:text-xl">
        {children}
      </p>
    )}
  </div>
);

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-line-soft last:border-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group flex w-full items-center justify-between gap-6 py-6 text-left"
      >
        <span className="text-lg font-display font-semibold text-text-primary transition-colors group-hover:text-accent md:text-xl">
          {question}
        </span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line-soft text-text-muted transition-colors ${isOpen ? 'bg-accent text-white border-accent' : 'bg-surface-soft'}`}>
          <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96 pb-6' : 'max-h-0'}`}>
        <p className="max-w-3xl text-base leading-relaxed text-text-muted md:text-lg">
          {answer}
        </p>
      </div>
    </div>
  );
};

const productSurfaces = [
  {
    title: 'Courses',
    kicker: 'Guided lessons',
    description: 'Structured modules explain tax, super, budgeting, debt and long-term planning in language built for learners.',
    to: '/courses',
    cta: 'Browse courses',
  },
  {
    title: 'Tools',
    kicker: 'Practice calculators',
    description: 'Explore tax, savings, loans and compound interest with calculators that teach the idea behind the number.',
    to: '/tools',
    cta: 'Open tools',
  },
  {
    title: 'Classes',
    kicker: 'Learning groups',
    description: 'Teachers and students can organise learning spaces around the same plain-English financial concepts.',
    to: '/classes',
    cta: 'View classes',
  },
];

const learningPath = [
  {
    step: '01',
    title: 'Understand the system',
    description: 'Start with the vocabulary, institutions and everyday rules that shape Australian personal finance.',
  },
  {
    step: '02',
    title: 'Practise with examples',
    description: 'Use short lessons and calculators to connect concepts like cash flow, tax and compounding to realistic scenarios.',
  },
  {
    step: '03',
    title: 'Ask better questions',
    description: 'Leave with enough context to make your own decisions and know when to speak with a qualified professional.',
  },
];

const jargons = [
  { complex: 'Amortisation', plain: 'Paying off a loan in regular chunks until it is gone.' },
  { complex: 'Capital gains', plain: 'The profit you make when you sell something for more than you paid.' },
  { complex: 'Compound interest', plain: 'Interest earned on your original money and on earlier interest.' },
  { complex: 'Asset allocation', plain: 'Spreading money across different places to manage risk.' },
];

const faqs = [
  {
    q: 'Is Caplet really free?',
    a: 'Yes. Caplet is built around accessible financial literacy, not selling financial products or hiding affiliate offers in lessons.',
  },
  {
    q: 'Is this financial advice?',
    a: 'No. Caplet provides general education only. It explains concepts and systems so you can make your own decisions or ask informed questions when speaking with a licensed professional.',
  },
  {
    q: 'Do I need to live in Australia?',
    a: 'Many examples focus on Australian tax, superannuation and school contexts, but the core ideas around budgeting, cash flow and compounding are broadly useful.',
  },
  {
    q: 'How often are courses updated?',
    a: 'Courses are reviewed when policies, thresholds or curriculum references change so learners can rely on current educational context.',
  },
  {
    q: 'Where are the sources gathered from?',
    a: 'Course material is designed around public information and school-aligned learning goals, including NESA Commerce topics for Years 9 and 10.',
  },
  {
    q: 'Can I suggest courses and give feedback to Caplet?',
    a: 'Yes. Feedback and new topic suggestions are welcome through the contact form.',
  },
  {
    q: 'How do I get started?',
    a: 'Choose a course, tool or class space that matches what you want to understand first. A free account lets you track learning progress.',
  },
];

const Home = () => {
  const [jargonIndex, setJargonIndex] = useState(0);

  useEffect(() => {
    const jargonInterval = setInterval(() => {
      setJargonIndex((prev) => (prev + 1) % jargons.length);
    }, 4200);

    return () => clearInterval(jargonInterval);
  }, []);

  const currentJargon = jargons[jargonIndex];

  return (
    <div className="relative bg-surface-body text-text-primary selection:bg-accent selection:text-white">
      <section className="relative overflow-hidden border-b border-line-soft py-24 md:py-32 lg:py-40">
        <div className="container-custom">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-4xl">
              <span className="section-kicker">Financial education for Australians</span>
              <h1 className="text-5xl font-display font-bold leading-[0.95] tracking-ultra text-text-primary md:text-7xl lg:text-8xl">
                Understand money without being sold a product.
              </h1>
              <p className="mt-8 max-w-2xl text-xl leading-relaxed text-text-muted md:text-2xl">
                Caplet turns financial topics into clear courses, tools and class materials. It is education only — never personal financial advice.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Button to="/register" className="w-full sm:w-auto">Get started free</Button>
                <Button to="/courses" variant="secondary" className="w-full sm:w-auto">Browse courses</Button>
              </div>
            </div>

            <Card className="relative overflow-hidden p-0">
              <div className="border-b border-line-soft bg-surface-soft px-6 py-4">
                <p className="text-xs font-mono font-bold uppercase tracking-widest text-accent">Caplet learning brief</p>
              </div>
              <div className="space-y-6 p-6 md:p-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-text-dim">Learner asks</p>
                  <p className="mt-2 text-2xl font-serif italic text-text-primary">“What does compound interest actually mean?”</p>
                </div>
                <div className="rounded-lg border border-line-soft bg-surface-body p-5">
                  <p className="text-sm font-semibold uppercase tracking-wide text-accent">Caplet explains</p>
                  <p className="mt-3 text-lg leading-relaxed text-text-muted">
                    It is growth on your original money plus growth on earlier growth — useful to understand before comparing any product.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {['Course', 'Tool', 'Class'].map((item) => (
                    <div key={item} className="rounded-lg bg-accent-soft px-3 py-4 text-sm font-bold text-accent">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-custom">
          <SectionHeader kicker="What Caplet is" title="A calmer way to learn financial literacy." align="center">
            Caplet is a structured learning platform for people who want financial concepts explained before they face real-world decisions.
          </SectionHeader>

          <div className="grid gap-6 md:grid-cols-3">
            {productSurfaces.map((surface) => (
              <Card key={surface.title} className="flex min-h-[320px] flex-col">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-accent">{surface.kicker}</span>
                <h3 className="mt-5 text-3xl font-display font-bold text-text-primary">{surface.title}</h3>
                <p className="mt-4 flex-1 text-base leading-relaxed text-text-muted md:text-lg">{surface.description}</p>
                <Button to={surface.to} variant="secondary" className="mt-8 self-start">{surface.cta}</Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-soft py-20 md:py-28">
        <div className="container-custom">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <SectionHeader kicker="Who it helps" title="Built for beginners, students and educators.">
              Caplet helps learners who feel behind, teachers who need structured material and families who want clearer money conversations.
            </SectionHeader>
            <div className="grid gap-4 sm:grid-cols-3">
              {['New learners', 'Students', 'Teachers'].map((audience) => (
                <Card key={audience} className="min-h-[180px]">
                  <div className="mb-5 h-2 w-12 rounded-full bg-accent" />
                  <h3 className="text-xl font-display font-bold text-text-primary">{audience}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">
                    Clear explanations, practical examples and no pressure to buy or choose a financial product.
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-custom">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <SectionHeader kicker="Plain English" title="Finance terms translated into usable ideas.">
                One intentional animation on this page shows Caplet’s core promise: turn jargon into understanding.
              </SectionHeader>
            </div>
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-line-soft pb-5">
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-text-dim">Term {jargonIndex + 1}/{jargons.length}</span>
                <span className="h-2 w-2 rounded-full bg-accent" />
              </div>
              <div key={currentJargon.complex} className="animate-fade-slide-up py-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-text-dim">Instead of</p>
                <h3 className="mt-3 text-3xl font-display font-bold text-text-primary md:text-5xl">{currentJargon.complex}</h3>
                <div className="my-8 h-px bg-line-soft" />
                <p className="text-sm font-semibold uppercase tracking-wide text-accent">Say</p>
                <p className="mt-3 text-2xl font-serif italic leading-relaxed text-accent md:text-3xl">“{currentJargon.plain}”</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-surface-soft py-20 md:py-28">
        <div className="container-custom">
          <SectionHeader kicker="How it works" title="A structured path from confusion to confidence." align="center">
            The product surfaces support one learning journey: learn the concept, practise safely and decide what to explore next.
          </SectionHeader>
          <div className="grid gap-6 md:grid-cols-3">
            {learningPath.map((item) => (
              <Card key={item.step}>
                <span className="font-mono text-sm font-bold text-accent">{item.step}</span>
                <h3 className="mt-5 text-2xl font-display font-bold text-text-primary">{item.title}</h3>
                <p className="mt-4 text-base leading-relaxed text-text-muted">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-custom">
          <Card className="grid gap-8 bg-accent-soft md:grid-cols-[0.85fr_1.15fr] md:items-center">
            <div>
              <span className="section-kicker">Education only</span>
              <h2 className="text-3xl font-display font-bold text-text-primary md:text-5xl">Trust starts with a clear boundary.</h2>
            </div>
            <div className="space-y-4 text-lg leading-relaxed text-text-muted">
              <p>
                Caplet does not tell you which product to buy, which investment to pick or what decision is right for your circumstances.
              </p>
              <p>
                It gives general educational context, source-aware explanations and practice tools so you can understand the topic before making your own choices or speaking to a professional.
              </p>
            </div>
          </Card>
        </div>
      </section>

      <section className="border-t border-line-soft py-20 md:py-28">
        <div className="container-custom">
          <SectionHeader kicker="Common questions" title="Still curious?" align="center" />
          <Card className="mx-auto max-w-4xl py-2">
            {faqs.map((faq) => (
              <FAQItem key={faq.q} question={faq.q} answer={faq.a} />
            ))}
          </Card>
        </div>
      </section>

      <section className="bg-accent py-20 text-white md:py-28">
        <div className="container-custom mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-display font-bold md:text-6xl">Start with the topic that feels least clear.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/85 md:text-xl">
            Courses, tools and classes are all built for education first — free to explore and designed to reduce pressure.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Button to="/courses" variant="inverse" className="w-full sm:w-auto">View curriculum</Button>
            <Button to="/tools" variant="inverse" className="w-full sm:w-auto">Try tools</Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
