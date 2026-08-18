import { Link } from 'react-router-dom';

export default function Contact() {
  return (
    <div className="minimal-page">
      <div className="container-custom">
        <header className="minimal-page-header animate-rise">
          <p className="section-kicker">Contact</p>
          <h1 className="minimal-page-title">Get in touch</h1>
          <p className="minimal-page-description">Questions about Caplet, school use, curriculum or accessibility.</p>
        </header>

        <div className="animate-rise-slow grid border-y border-line-soft md:grid-cols-2">
          <section className="py-10 md:pr-12" aria-labelledby="contact-email">
            <h2 id="contact-email" className="text-xl font-bold">Email</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-text-muted">We usually respond within one to two business days.</p>
            <a href="mailto:contact@caplet.org" className="focus-ring mt-8 inline-block rounded-md text-lg font-bold text-accent hover:text-accent-strong">contact@caplet.org</a>
          </section>

          <section className="border-t border-line-soft py-10 md:border-l md:border-t-0 md:pl-12" aria-labelledby="contact-help">
            <h2 id="contact-help" className="text-xl font-bold">What we can help with</h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-text-muted">
              <li>School and classroom use</li>
              <li>Partnerships and curriculum questions</li>
              <li>Platform support and feedback</li>
              <li>Content and accessibility issues</li>
            </ul>
            <Link to="/trust" className="focus-ring mt-8 inline-block rounded-md text-sm font-bold text-accent">Read the Trust Center</Link>
          </section>
        </div>
      </div>
    </div>
  );
}
