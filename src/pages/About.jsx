import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="minimal-page">
      <div className="container-custom">
        <p className="section-kicker">The team behind Caplet</p>
        <h1 className="minimal-page-title max-w-4xl">
          Learning should feel clear, useful, and a little more human.
        </h1>
        <div className="mt-10 grid gap-10 border-t border-line-soft pt-10 md:grid-cols-[1.3fr_0.7fr] md:items-start md:gap-16">
          <div className="space-y-5 text-base font-medium leading-relaxed text-text-muted">
            <p>
              Caplet brings courses, practice, revision, classroom tools, and carefully framed financial education into one calm learning space.
            </p>
            <p>
              It is an evolving project built around a simple idea: students should be able to understand what they are learning, practise it honestly, and see what to do next.
            </p>
            <p>
              We keep the platform open, explain its limits, and treat student work and privacy as part of the product rather than paperwork around it.
            </p>
          </div>
          <aside className="border-l border-line-soft pl-6">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-accent">Explore Caplet</p>
            <div className="mt-5 flex flex-col gap-3 text-sm font-bold">
              <Link to="/courses" className="btn-primary">Browse Courses</Link>
              <Link to="/trust" className="btn-secondary">Read the Trust Center</Link>
              <Link to="/contact" className="btn-secondary">Get in touch</Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
