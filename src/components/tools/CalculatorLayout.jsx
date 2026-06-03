import { Link } from 'react-router-dom';

const panelBase = 'bg-surface-body/95 backdrop-blur-sm';

export const CalculatorShell = ({ category, title, description, children }) => (
  <main className="min-h-screen bg-surface-body py-28 selection:bg-accent selection:text-white">
    <div className="container-custom">
      <header className="mb-16 reveal-text">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-10">
          <div>
            <span className="section-kicker">Tools &rarr; {category}</span>
            <h1 className="text-5xl md:text-7xl xl:text-8xl mb-8 tracking-tighter leading-none">
              {title}
            </h1>
            <p className="text-xl text-text-muted leading-relaxed font-serif italic max-w-2xl">
              {description}
            </p>
          </div>
          <Link to="/tools" className="btn-secondary text-xs uppercase tracking-widest px-8 shrink-0 self-start md:self-auto">
            &larr; Back to tools
          </Link>
        </div>
        <div className="h-px w-full bg-line-soft" />
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-line-soft border border-line-soft reveal-text stagger-1 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
        {children}
      </section>
    </div>
  </main>
);

export const CalculatorFormPanel = ({ title, children }) => (
  <div className={`lg:col-span-7 ${panelBase} p-8 md:p-12 lg:p-16`}>
    <CalculatorPanelTitle>{title}</CalculatorPanelTitle>
    {children}
  </div>
);

export const CalculatorResultPanel = ({ title, children }) => (
  <aside className="lg:col-span-5 bg-surface-raised p-8 md:p-12 lg:p-16 flex flex-col min-h-[34rem] relative overflow-hidden">
    <div className="absolute inset-0 opacity-[0.035] grid-technical !bg-[size:30px_30px] pointer-events-none" />
    <CalculatorPanelTitle className="relative z-10">{title}</CalculatorPanelTitle>
    {children}
  </aside>
);

export const CalculatorPanelTitle = ({ children, className = '' }) => (
  <h2 className={`text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-12 ${className}`}>
    {children}
  </h2>
);

export const CalculatorEmptyState = ({ code, children }) => (
  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 relative z-10 min-h-64">
    <div className="w-12 h-12 border border-line-soft flex items-center justify-center text-xs font-bold font-serif italic mb-8">
      {code}
    </div>
    <p className="text-[10px] font-bold uppercase tracking-[0.4em]">{children}</p>
  </div>
);
