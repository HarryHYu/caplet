const Terms = () => {
  return (
    <div className="min-h-screen py-32 bg-surface-body selection:bg-accent selection:text-white">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto reveal-text">
          <span className="section-kicker mb-8">Legal Interface</span>
          <h1 className="text-6xl md:text-8xl mb-12">
            Terms and<br />Services.
          </h1>

          <div className="border border-line-soft bg-surface-raised p-12 lg:p-16 space-y-10">
            <div className="space-y-8 text-sm font-medium text-text-muted leading-relaxed">
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

            <div className="pt-10 border-t border-line-soft">
              <p className="text-[9px] font-bold text-text-dim uppercase tracking-widest">
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
