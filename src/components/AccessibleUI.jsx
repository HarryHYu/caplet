import { useId } from 'react';

export function FormField({ id, label, hint, error, required = false, children, className = '' }) {
  const generatedId = useId();
  const controlId = id || `field-${generatedId.replace(/:/g, '')}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={controlId} className="mb-3 block text-sm font-semibold text-text-dim">
        {label}{required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children({
        id: controlId,
        required,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}
      {hint ? <p id={hintId} className="mt-2 text-xs font-medium text-text-dim">{hint}</p> : null}
      {error ? <ErrorMessage id={errorId}>{error}</ErrorMessage> : null}
    </div>
  );
}

export function IconButton({ label, className = '', children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function ErrorMessage({ id, children, className = '' }) {
  if (!children) return null;
  return <p id={id} role="alert" className={`mt-3 text-sm font-bold text-text-error ${className}`}>{children}</p>;
}

export function FinancialAssumptions({ period, verified, included = [], excluded = [], sources = [] }) {
  return (
    <aside className="rounded-2xl border border-line-soft bg-surface-soft p-5" aria-labelledby="financial-assumptions-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="financial-assumptions-title" className="text-lg font-bold">Assumptions and sources</h2>
        {period ? <span className="text-xs font-bold text-accent">{period}</span> : null}
      </div>
      {verified ? <p className="mt-2 text-xs font-medium text-text-dim">Rates verified {verified}</p> : null}
      <div className="mt-4 grid gap-4 text-sm text-text-muted sm:grid-cols-2">
        {included.length ? <div><h3 className="text-sm font-bold text-text-primary">Included</h3><ul className="mt-2 list-disc space-y-1 pl-5">{included.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
        {excluded.length ? <div><h3 className="text-sm font-bold text-text-primary">Not included</h3><ul className="mt-2 list-disc space-y-1 pl-5">{excluded.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
      </div>
      <p className="mt-4 text-xs font-medium leading-relaxed text-text-dim">For general education and scenario estimates only, not personal financial advice.</p>
      {sources.length ? <div className="mt-4 flex flex-wrap gap-3">{sources.map((source) => <a key={source.href} href={source.href} target="_blank" rel="noreferrer" className="text-sm font-bold text-accent underline underline-offset-4">{source.label}</a>)}</div> : null}
    </aside>
  );
}
