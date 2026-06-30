import { useReveal } from '../lib/useReveal';

const Terms = () => {
  useReveal();

  return (
    <div className="min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto reveal">
          <span className="font-hand text-accent text-xl mb-4 block">The fine print</span>
          <h1 className="font-display font-extrabold tracking-tight text-6xl md:text-8xl mb-12">
            Terms and<br />Services.
          </h1>

          <div className="bg-surface-raised rounded-3xl p-12 lg:p-16 space-y-10 shadow-[0_24px_50px_-34px_rgba(20,20,18,0.3)]">
            <div className="space-y-8 text-base font-medium text-text-muted leading-relaxed">
              <p>
                Caplet is not liable for any financial damages.
              </p>

              <p>
                Caplet is designed purely for educational purposes and should not be construed as robust financial advice.
              </p>

              <p>
                Do not sue us.
              </p>
            </div>

            <div className="pt-10">
              <p className="text-xs font-medium text-text-dim">
                Last updated: February 2026
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
