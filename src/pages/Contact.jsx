const Contact = () => {
  return (
    <div className="min-h-screen py-32 bg-surface-body selection:bg-accent selection:text-white">
      {/* Hero Section */}
      <section className="mb-24">
        <div className="container-custom">
          <div className="reveal-text">
            <span className="section-kicker mb-8">Communications</span>
            <h1 className="text-6xl lg:text-8xl mb-10">
              Technical <br />Inquiry.
            </h1>
            <p className="text-xl text-text-muted max-w-2xl font-serif italic leading-relaxed">
              Synthesize your questions for curriculum integration, institutional partnerships, or platform architecture support.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-32 reveal-text stagger-1">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5 bg-line-soft border border-line-soft">
            <div className="bg-surface-body p-12 lg:p-20 flex flex-col justify-between min-h-[500px]">
              <div className="relative z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.5em] text-accent mb-12 block">Terminal Channel</span>
                <h2 className="text-4xl font-serif italic text-text-primary mb-8 leading-tight">
                  Reach out to our <br />core architects.
                </h2>
                <p className="text-base text-text-muted font-medium tracking-tight max-w-sm mb-12">
                  For protocol-level inquiries and partnership synchronization, our response window typically spans 24-48 standard hours.
                </p>
              </div>

              <div className="space-y-12">
                <div>
                  <h3 className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em] mb-4">
                    Direct Registry
                  </h3>
                  <a
                    href="mailto:contact@capletedu.org"
                    className="text-3xl font-serif italic text-text-primary hover:text-accent transition-all duration-300 block border-b border-line-soft pb-4 w-fit"
                  >
                    contact@capletedu.org
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-surface-raised p-12 lg:p-20 space-y-20 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] grid-technical !bg-[size:30px_30px] pointer-events-none" />

              <div>
                <h3 className="text-[10px] font-black text-accent uppercase tracking-[0.4em] mb-12">
                  Service Domains
                </h3>
                <div className="space-y-8">
                  {[
                    'Institutional curriculum integration',
                    'Strategic educational partnerships',
                    'Platform architecture maintenance',
                    'Data-layer migration & updates'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-6 group">
                      <div className="w-4 h-px bg-text-dim group-hover:w-8 group-hover:bg-accent transition-all" />
                      <span className="text-xs font-bold text-text-primary uppercase tracking-[0.2em]">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-12 border-t border-line-soft">
                <h3 className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em] mb-6">
                  Legal Disclaimer
                </h3>
                <p className="text-[10px] font-bold text-text-dim/60 leading-relaxed uppercase tracking-[0.2em]">
                  Caplet provides technical resources for financial literacy. These resources do not constitute personalized financial advice. Institutional users must ensure regulatory alignment with local jurisdiction mandates.
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
