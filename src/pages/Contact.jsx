const Contact = () => {
  return (
    <div className="min-h-screen py-24">
      {/* Hero Section */}
      <section className="border-b border-zinc-100 dark:border-zinc-900 mb-20 pb-20">
        <div className="container-custom">
          <div className="animate-slide-up">
            <span className="section-kicker mb-6">Network Interface</span>
            <h1 className="text-5xl md:text-6xl font-extrabold text-black dark:text-white mb-8 tracking-tighter uppercase">
              Establish <br />Contact.
            </h1>
            <p className="text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl font-medium leading-relaxed">
              Direct access channels for strategic partnerships, institutional integration, and protocol support.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="reveal-up" style={{ animationDelay: '100ms' }}>
        <div className="container-custom">
          <div className="max-w-4xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="bg-white dark:bg-black border border-zinc-100 dark:border-zinc-900 p-12">
                <div className="mb-12">
                  <div className="w-12 h-12 bg-brand/5 border border-brand/10 flex items-center justify-center text-brand mb-8">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-black text-black dark:text-white uppercase tracking-tighter mb-4">
                    Communications Node
                  </h2>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest leading-loose">
                    Centralized management for curriculum inquiries and platform logistics. Response latency: 24–48 hours.
                  </p>
                </div>

                <div className="space-y-10">
                  <div>
                    <h3 className="text-[10px] font-black text-zinc-300 dark:text-zinc-700 uppercase tracking-[0.3em] mb-4">
                      Institutional Endpoint
                    </h3>
                    <a
                      href="mailto:contact@capletedu.org"
                      className="text-2xl font-black text-black dark:text-white hover:text-brand transition-colors duration-200 block underline underline-offset-8 decoration-1"
                    >
                      contact@capletedu.org
                    </a>
                  </div>
                </div>
              </div>

              <div className="space-y-12">
                <div>
                  <h3 className="text-[10px] font-black text-brand uppercase tracking-[0.3em] mb-8">
                    Operational Scope
                  </h3>
                  <div className="grid grid-cols-1 gap-6">
                    {[
                      'Institutional curriculum integration',
                      'Strategic educational partnerships',
                      'Platform technical maintenance',
                      'Legacy system migrations'
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 text-xs font-bold text-black dark:text-white uppercase tracking-widest">
                        <div className="w-1.5 h-1.5 bg-brand" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-10 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900">
                  <h3 className="text-[10px] font-black text-black dark:text-white uppercase tracking-widest mb-4">
                    Notice: Advisory Protocol
                  </h3>
                  <p className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 leading-relaxed uppercase tracking-tight">
                    While the platform provides comprehensive financial literacy resources, it does not constitute
                    personalized financial advice. All institutional deployments should be verified by certified
                    professionals where regional regulations apply.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
