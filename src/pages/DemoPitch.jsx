import { ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

function Kicker({ children }) {
  return (
    <div className="mb-7 flex items-center gap-3">
      <span className="h-0.5 w-7 rounded-full bg-accent" aria-hidden="true" />
      <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent">{children}</span>
    </div>
  );
}

function PitchSection({ children, className = '' }) {
  return (
    <section className={`flex min-h-[calc(100dvh-4rem)] items-center px-5 py-20 sm:px-8 lg:px-12 lg:py-28 ${className}`}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

const pains = [
  ['01', 'Manual & slow', 'Marking is done by hand, inconsistently, across thousands of scripts every exam season.'],
  ['02', 'AI gets it wrong', 'Generic models invent plausible-sounding marks with no rubric — inconsistent and untrustworthy.'],
  ['03', 'No scalable fix', "The industry's answer is hiring more markers. That isn't a solution, it's a band-aid."],
];

const rubric = [
  ['Band 6', '9–10', 'Explains two distinct factors with precise data linkage and correct direction of effect.'],
  ['Band 5', '7–8', 'Explains two factors clearly with supporting reasoning, minor gaps in data use.'],
  ['Band 4', '5–6', 'Identifies two factors with some explanation, limited analytical depth.'],
  ['Band 3', '3–4', 'Identifies one factor with explanation, or two factors without clear explanation.'],
];

const flow = [
  ['01', 'Student submits', 'Written response to exam question'],
  ['02', 'Library lookup', 'CapletMark retrieves rubric + exemplars'],
  ['03', 'AI grades', 'Model marks against real criteria only'],
  ['04', 'Structured feedback', 'Band, score, targeted improvement notes'],
];

const futureItems = [
  ['AI Essay Marking', 'Students write long-form answers; a model trained against real marking rubrics grades and returns targeted, specific feedback.'],
  ['Adaptive Practice Paths', 'Difficulty adjusts per student based on their quiz history. Everyone works at the level that pushes them exactly enough.'],
  ['Shared Currency, Platform-wide', 'One economy that works across every lesson, game, and activity on Caplet — earn it anywhere, spend it anywhere.'],
  ['Assessment & Certification', 'Formal assessments with custom rubrics, auto-generated certificates, and per-school progress reporting dashboards.'],
  ['Open Platform & API', 'Caplet becomes infrastructure — publishers, developers, and institutions build on top of it for any subject, any audience, anywhere.'],
];

export default function DemoPitch() {
  return (
    <main className="overflow-x-hidden bg-text-primary pt-14 text-surface-body md:pt-16">
      <PitchSection>
        <Kicker>The Problem</Kicker>
        <div className="max-w-3xl">
          <h1 className="font-serif text-[clamp(5rem,18vw,9rem)] font-bold leading-[0.8] tracking-[-0.06em]">$500M</h1>
          <p className="mt-8 max-w-xl text-lg font-medium leading-relaxed text-surface-body/60 md:text-xl">
            spent on marking in <strong className="text-surface-body/90">NSW alone</strong>, every single year. Teachers spend up to <strong className="text-surface-body/90">40% of their working hours</strong> on assessment — not teaching.
          </p>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {pains.map(([number, title, description]) => (
            <article key={number} className="rounded-3xl border border-line-soft/20 bg-surface-raised/5 p-6 md:p-7">
              <p className="font-mono text-xs font-bold tracking-widest text-accent">{number}</p>
              <h2 className="mt-7 text-lg font-extrabold text-surface-body">{title}</h2>
              <p className="mt-3 text-sm font-medium leading-relaxed text-surface-body/50">{description}</p>
            </article>
          ))}
        </div>
      </PitchSection>

      <PitchSection className="border-t border-line-soft/10">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_25rem]">
          <div>
            <Kicker>The Solution</Kicker>
            <h2 className="font-serif text-5xl font-bold leading-none tracking-tight sm:text-7xl">Caplet<span className="text-accent">Mark</span></h2>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-relaxed text-surface-body/60">
              A structured library of marking rubrics, exemplar responses, and syllabus dot points — the data layer AI needs to grade student work <strong className="text-surface-body/90">accurately, not plausibly</strong>.
            </p>
            <ul className="mt-9 space-y-4">
              {['Marking rubrics by question and year', 'Band exemplar responses (A–E)', 'Syllabus dot points mapped to criteria', 'Assessment criteria fully structured'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm font-bold text-surface-body/70">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-accent/50 bg-accent/15 text-accent"><CheckIcon className="h-3.5 w-3.5" /></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <aside className="min-w-0 rounded-3xl border border-accent/25 bg-accent/10 p-5 sm:p-7">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-accent">HSC Economics — Q28b</p>
            <p className="mt-3 text-sm font-bold leading-relaxed text-surface-body/85">“Explain two factors that affect Australia&apos;s current account balance.” (10 marks)</p>
            <p className="mt-7 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-surface-body/40">Marking rubric</p>
            <div className="mt-2 divide-y divide-line-soft/10">
              {rubric.map(([band, points, description]) => (
                <div key={band} className="grid grid-cols-[4.5rem_1fr] gap-3 py-4">
                  <div><span className="rounded-lg bg-accent/20 px-2 py-1 text-[10px] font-extrabold text-accent">{band}</span><p className="mt-2 text-[10px] font-bold text-accent/70">{points} pts</p></div>
                  <p className="text-xs font-medium leading-relaxed text-surface-body/55">{description}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </PitchSection>

      <PitchSection className="border-t border-line-soft/10">
        <Kicker>How It Works</Kicker>
        <h2 className="max-w-3xl font-serif text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl">From submission to feedback in seconds</h2>
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {flow.map(([number, title, description]) => (
            <li key={number} className="rounded-3xl border border-line-soft/20 bg-surface-raised/5 p-6 text-left">
              <p className="font-mono text-xs font-bold tracking-widest text-accent">{number}</p>
              <span className="mt-7 block h-10 w-10 rounded-full border border-accent/40 bg-accent/20" aria-hidden="true" />
              <h3 className="mt-6 text-base font-extrabold">{title}</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-surface-body/50">{description}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 rounded-2xl border border-accent/25 bg-accent/10 p-5 text-sm font-medium leading-relaxed text-surface-body/70 sm:p-6">
          <strong className="text-surface-body">The key insight:</strong> generic AI invents plausible-sounding marks because it has no rubric to work from. CapletMark ensures the model only grades against the actual marking criteria — the same document a human marker uses. That&apos;s what makes it trustworthy.
        </div>
      </PitchSection>

      <PitchSection className="border-t border-line-soft/10">
        <div className="grid items-start gap-14 lg:grid-cols-[1fr_23rem]">
          <div>
            <Kicker>The Opportunity</Kicker>
            <h2 className="max-w-3xl font-serif text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl">A massive market nobody has solved</h2>
            <div className="mt-10 space-y-7">
              {[
                ['$500M', 'NSW alone', 'annual marking spend, public + private'],
                ['$3B+', 'Australia-wide', 'estimated total addressable market'],
                ['1%', 'Our target', 'is already a significant, fundable business'],
              ].map(([value, label, detail]) => (
                <div key={label} className="grid gap-2 sm:grid-cols-[9rem_1fr] sm:items-baseline sm:gap-6">
                  <p className="font-serif text-5xl font-bold tracking-tight text-accent">{value}</p>
                  <div><h3 className="font-extrabold">{label}</h3><p className="mt-1 text-sm font-medium text-surface-body/45">{detail}</p></div>
                </div>
              ))}
            </div>
          </div>
          <aside className="rounded-3xl border border-accent/25 bg-accent/10 p-7">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-accent">Why Caplet wins</p>
            <ol className="mt-7 space-y-6">
              {[
                'Already inside schools — students and teachers use Caplet today',
                'Data flywheel: every lesson and assessment generates richer training data',
                'First mover: no one has built a structured marking library at this scale',
              ].map((item, index) => (
                <li key={item} className="flex gap-4 text-sm font-medium leading-relaxed text-surface-body/60"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/25 text-xs font-extrabold text-accent">{index + 1}</span>{item}</li>
              ))}
            </ol>
          </aside>
        </div>
      </PitchSection>

      <PitchSection className="border-t border-line-soft/10">
        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Kicker>Roadmap</Kicker>
            <h2 className="font-serif text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl">The infrastructure for how people learn</h2>
            <p className="mt-6 text-base font-medium leading-relaxed text-surface-body/50">Caplet v1 is live. Here&apos;s what&apos;s being built next — a platform open enough for anyone to build on, powerful enough to replace every tool a school currently uses.</p>
          </div>
          <div className="divide-y divide-line-soft/15">
            {futureItems.map(([title, description]) => (
              <article key={title} className="grid gap-2 py-5 first:pt-0 sm:grid-cols-[12rem_1fr] sm:gap-6">
                <h3 className="font-extrabold text-surface-body">{title}</h3>
                <p className="text-sm font-medium leading-relaxed text-surface-body/50">{description}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-20 rounded-[2rem] border border-accent/30 bg-accent/10 p-7 sm:p-10 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div><p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-accent">See the product</p><h2 className="mt-3 font-serif text-3xl font-bold sm:text-5xl">Follow the complete school workflow.</h2></div>
          <div className="mt-7 flex flex-wrap gap-3 lg:mt-0 lg:shrink-0">
            <Link to="/demo" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-extrabold text-white">Open Demo <ArrowRightIcon className="h-4 w-4" /></Link>
            <Link to="/contact" className="inline-flex min-h-11 items-center rounded-xl border border-line-soft/30 px-5 text-sm font-extrabold text-surface-body">Contact us</Link>
          </div>
        </div>
      </PitchSection>
    </main>
  );
}
