import { Link } from 'react-router-dom';
import { useReveal } from '../lib/useReveal';

const builders = [
  {
    name: 'Harry Yu',
    initials: 'HY',
    note: 'Works across product, design and engineering — including lessons, live sessions and CapletMark.',
    href: 'https://github.com/HarryHYu',
    color: 'block-blue',
  },
  {
    name: 'Ray Wang',
    initials: 'RW',
    note: 'Works across product, learning design and engineering — including study flows, curriculum tools and Money.',
    href: 'https://github.com/raei-2748',
    color: 'block-green',
  },
  {
    name: 'Sean Xin',
    initials: 'SX',
    role: 'contributor',
    note: 'Contributed to Caplet’s game branch, including the Compound clicker and early game systems.',
    href: 'https://github.com/HarryHYu/caplet/commits?author=withmebucks',
    color: 'block-amber',
  },
];

export default function About() {
  useReveal();

  return (
    <main className="min-h-screen bg-surface-body pb-24 pt-28 text-text-primary md:pb-32 md:pt-36">
      <section className="reveal">
        <div className="container-custom">
          <p className="font-hand text-2xl text-accent -rotate-2">the people behind Caplet</p>
          <h1 className="mt-5 max-w-4xl font-display text-5xl font-extrabold tracking-[-0.04em] sm:text-6xl lg:text-8xl">
            Made by Harry, Ray <span className="text-accent">and</span> Sean.
          </h1>
          <p className="mt-8 max-w-2xl text-lg font-medium leading-relaxed text-text-muted md:text-xl">
            Caplet is designed and built in Australia by Harry Yu and Ray Wang, with contributions from Sean Xin. It brings our ideas, code and learning work together.
          </p>
        </div>
      </section>

      <section className="reveal mt-16 md:mt-24" aria-labelledby="builders-heading">
        <div className="container-custom">
          <h2 id="builders-heading" className="sr-only">Caplet builders</h2>
          <div className="reveal-stagger grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {builders.map((builder) => (
              <article
                key={builder.name}
                className={`${builder.color} flex min-h-[330px] flex-col rounded-3xl p-8 shadow-[0_24px_60px_-44px_rgba(20,20,18,0.45)] sm:p-10 lg:p-12`}
              >
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-surface-raised font-mono text-sm font-extrabold tracking-widest text-accent shadow-sm">
                  {builder.initials}
                </div>
                <div className="mt-auto pt-14">
                  <p className="font-hand text-lg text-accent -rotate-1">{builder.role || 'builder'}</p>
                  <h3 className="mt-2 font-display text-4xl font-extrabold tracking-tight">{builder.name}</h3>
                  <p className="mt-4 max-w-lg leading-relaxed text-text-muted">{builder.note}</p>
                  <a
                    href={builder.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-soft bg-surface-raised px-4 text-sm font-bold text-text-primary transition-colors hover:border-accent hover:text-accent"
                    aria-label={`${builder.name} on GitHub`}
                  >
                    GitHub
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="reveal mt-16 md:mt-24">
        <div className="container-custom">
          <div className="rounded-3xl bg-surface-inverse px-8 py-12 text-text-contrast sm:px-12 md:py-16 lg:flex lg:items-end lg:justify-between lg:gap-12">
            <div className="max-w-2xl">
              <p className="font-hand text-xl text-[var(--footer-accent)] -rotate-2">and we did not build alone</p>
              <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Thank you to everyone who helps Caplet grow.</h2>
              <p className="mt-5 leading-relaxed text-[var(--footer-muted)]">
                Caplet also depends on open-source projects and on the people who test it, share feedback and contribute ideas. Their work makes ours possible.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 lg:mt-0 lg:shrink-0">
              <a
                href="https://github.com/HarryHYu/caplet"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center rounded-xl bg-[var(--footer-accent)] px-5 text-sm font-bold text-[var(--footer-bg)] transition-transform hover:-translate-y-0.5"
              >
                View the project
              </a>
              <Link
                to="/contact"
                className="inline-flex min-h-11 items-center rounded-xl border border-[var(--footer-line)] px-5 text-sm font-bold text-text-contrast transition-colors hover:border-[var(--footer-accent)] hover:text-[var(--footer-accent)]"
              >
                Say hello
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
