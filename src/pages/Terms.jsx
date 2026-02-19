const Terms = () => {
  return (
    <div className="min-h-screen py-24 page-section-light">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 p-10">
          <span className="section-kicker mb-4">Legal Interface</span>
          <h1 className="text-3xl font-extrabold text-black dark:text-white mb-6 uppercase tracking-tight">
            Terms and Services
          </h1>

          <div className="space-y-4 text-xs font-bold uppercase tracking-widest leading-relaxed text-zinc-600 dark:text-zinc-400">
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
        </div>
      </div>
    </div>
  );
};

export default Terms;

