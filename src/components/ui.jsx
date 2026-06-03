import { Link } from 'react-router-dom';

const toneClasses = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
};

export function PageShell({ children, className = '' }) {
  return (
    <div className={`min-h-screen bg-surface-body py-32 selection:bg-accent selection:text-white ${className}`}>
      <div className="container-custom">
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ kicker, title, description, actions, className = '' }) {
  return (
    <header className={`flex flex-col gap-10 md:flex-row md:items-end md:justify-between ${className}`}>
      <div>
        {kicker && <span className="section-kicker">{kicker}</span>}
        <h1 className="text-5xl md:text-7xl">{title}</h1>
        {description && (
          <p className="mt-8 max-w-2xl text-xl font-medium text-text-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-4">{actions}</div>}
    </header>
  );
}

export function Card({ children, className = '', as = 'div', ...props }) {
  const Element = as;

  return (
    <Element className={`border border-line-soft bg-surface-raised ${className}`} {...props}>
      {children}
    </Element>
  );
}

export function StatCard({ label, value, icon: Icon, sub, className = '' }) {
  return (
    <Card className={`group p-8 transition-colors hover:bg-surface-body ${className}`}>
      <div className="mb-8 flex items-center justify-between gap-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-text-dim transition-colors group-hover:text-accent">
          {label}
        </p>
        {Icon && <Icon className="h-5 w-5 text-text-dim opacity-50" />}
      </div>
      <p className="font-serif text-5xl italic text-text-primary transition-transform duration-500 group-hover:translate-x-2">
        {value}
      </p>
      {sub && <p className="mt-4 text-xs font-medium text-text-muted">{sub}</p>}
    </Card>
  );
}

export function EmptyState({ title, description, actions, className = '' }) {
  return (
    <Card className={`p-10 text-center ${className}`}>
      <h3 className="text-2xl font-bold uppercase tracking-tight text-text-primary">{title}</h3>
      {description && (
        <p className="mx-auto mt-4 max-w-lg text-sm font-medium leading-relaxed text-text-muted">
          {description}
        </p>
      )}
      {actions && <div className="mt-8 flex flex-wrap justify-center gap-4">{actions}</div>}
    </Card>
  );
}

export function Button({ children, to, tone = 'primary', className = '', ...props }) {
  const classes = `${toneClasses[tone] || toneClasses.primary} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
