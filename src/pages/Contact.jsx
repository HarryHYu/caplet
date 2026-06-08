const Contact = () => {
  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <section className="mb-24">
        <div className="container-custom">
          <div className="reveal-text">
            <span className="section-kicker mb-8">Contact</span>
            <h1 className="text-6xl lg:text-8xl mb-10">
              Get in <br />touch.
            </h1>
            <p className="text-xl text-text-muted max-w-2xl font-serif italic leading-relaxed">
              Questions about curriculum, school partnerships, or the platform? We&apos;d love to hear from you.
            </p>
          </div>
        </div>
      </section>

      <section className="pb-32 reveal-text stagger-1">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5 bg-line-soft border border-line-soft">
            <div className="bg-surface-body p-12 lg:p-20 flex flex-col justify-between min-h-[400px]">
              <div>
                <h2 className="text-4xl font-serif italic text-text-primary mb-6 leading-tight">
                  Email us directly
                </h2>
                <p className="text-base text-text-muted leading-relaxed max-w-sm mb-12">
                  We typically respond within one to two business days.
                </p>
                <a
                  href="mailto:contact@capletedu.org"
                  className="text-2xl md:text-3xl font-serif italic text-text-primary hover:text-accent transition-colors border-b border-line-soft pb-3 inline-block"
                >
                  contact@capletedu.org
                </a>
              </div>
            </div>

            <div className="bg-surface-raised p-12 lg:p-20 space-y-12">
              <div>
                <h3 className="text-sm font-semibold text-accent mb-8">
                  We can help with
                </h3>
                <ul className="space-y-4 text-sm text-text-muted">
                  <li>Bringing Caplet into your school or class</li>
                  <li>Partnerships and curriculum questions</li>
                  <li>Platform support and feedback</li>
                  <li>Content or accessibility issues</li>
                </ul>
              </div>

              <div className="pt-8 border-t border-line-soft">
                <p className="text-xs text-text-dim leading-relaxed">
                  Caplet provides financial literacy education only — not personalised financial advice. Schools and teachers remain responsible for meeting local requirements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
