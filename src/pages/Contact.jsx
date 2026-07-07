import { useReveal } from '../lib/useReveal';

const Contact = () => {
  useReveal();

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <section className="mb-20 reveal">
        <div className="container-custom">
          <div>
            <p className="font-hand text-2xl text-blue mb-5 -rotate-2">say hello</p>
            <h1 className="font-display font-extrabold tracking-tight text-6xl lg:text-8xl mb-10">
              Get in <br />touch.
            </h1>
            <p className="body-text text-xl text-text-muted max-w-2xl leading-relaxed">
              Have questions about curriculum, school partnerships, or the platform? We&apos;d love to hear from you.
            </p>
          </div>
        </div>
      </section>

      <section className="pb-32 reveal">
        <div className="container-custom">
          <div className="reveal-stagger grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="block-blue rounded-3xl p-12 lg:p-16 flex flex-col justify-between min-h-[400px] shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] hover:-translate-y-1 transition-transform">
              <div>
                <h2 className="font-display font-bold tracking-tight text-4xl text-text-primary mb-6 leading-tight">
                  Email Us Directly
                </h2>
                <p className="text-base text-text-muted leading-relaxed max-w-sm mb-12">
                  We typically respond within one to two business days.
                </p>
                <a
                  href="mailto:contact@caplet.org"
                  className="text-2xl md:text-3xl font-display font-bold tracking-tight text-accent hover:text-text-primary transition-colors inline-block"
                >
                  contact@caplet.org
                </a>
              </div>
            </div>

            <div className="bg-surface-raised rounded-3xl p-12 lg:p-16 space-y-12 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)] hover:-translate-y-1 transition-transform">
              <div>
                <h3 className="font-display font-bold tracking-tight text-2xl text-text-primary mb-8">
                  We Can Help With
                </h3>
                <ul className="space-y-4 text-base text-text-muted">
                  <li>Bringing Caplet into your school or class</li>
                  <li>Partnerships and curriculum questions</li>
                  <li>Platform support and feedback</li>
                  <li>Content or accessibility issues</li>
                </ul>
              </div>

              <div className="block-cream rounded-2xl p-6">
                <p className="text-xs text-text-dim leading-relaxed">
                  Caplet provides financial literacy education only, not personalised financial advice. Schools and teachers remain responsible for meeting local requirements.
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
