const baseClasses =
  'w-full rounded-2xl border border-line-soft bg-white/80 px-4 py-3.5 text-sm font-medium text-text-primary shadow-sm outline-none transition-all placeholder:text-text-dim focus:border-accent focus:bg-white focus:ring-4 focus:ring-accent/10 disabled:cursor-not-allowed disabled:opacity-60';

const Input = ({ label, hint, error, id, className = '', as = 'input', ...props }) => {
  const Field = as;
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-text-primary">
          {label}
        </label>
      )}
      <Field
        id={id}
        className={`${baseClasses} ${as === 'select' ? 'appearance-none pr-10' : ''} ${className}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
