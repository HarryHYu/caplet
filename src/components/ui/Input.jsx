import { forwardRef, useId } from 'react';
import { cn } from './utils';

const sizeClasses = {
  sm: 'min-h-10 px-3 py-2 text-sm',
  md: 'min-h-12 px-4 py-3 text-base',
  lg: 'min-h-14 px-5 py-4 text-lg',
};

const Input = forwardRef(function Input(
  {
    className,
    disabled = false,
    error,
    hint,
    id,
    label,
    leading,
    required = false,
    size = 'md',
    trailing,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-2 block text-sm font-semibold text-text-primary">
          {label}
          {required && <span className="ml-1 text-accent" aria-hidden="true">*</span>}
        </label>
      )}
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border bg-surface-raised text-text-primary shadow-minimal transition-all duration-200',
          error ? 'border-red-500 dark:border-red-400' : 'border-line-soft focus-within:border-accent',
          'focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-surface-body',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        {leading && <span className="pl-4 text-text-dim">{leading}</span>}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full min-w-0 flex-1 bg-transparent text-text-primary placeholder:text-text-dim focus:outline-none disabled:cursor-not-allowed',
            leading && 'pl-0',
            trailing && 'pr-0',
            sizeClasses[size] || sizeClasses.md,
            className,
          )}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          disabled={disabled}
          required={required}
          {...props}
        />
        {trailing && <span className="pr-4 text-text-dim">{trailing}</span>}
      </div>
      {hint && !error && <p id={hintId} className="mt-2 text-sm text-text-dim">{hint}</p>}
      {error && <p id={errorId} className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
});

export default Input;
