import { forwardRef } from 'react';
import { cn } from './utils';

const variantClasses = {
  primary:
    'border-transparent bg-accent text-white shadow-minimal hover:bg-accent-strong hover:shadow-minimal-lg active:bg-accent-strong',
  secondary:
    'border-line-soft bg-surface-raised text-text-primary shadow-minimal hover:border-text-dim hover:bg-surface-soft hover:shadow-minimal-lg',
  soft:
    'border-transparent bg-accent-soft text-accent hover:bg-accent hover:text-white active:bg-accent-strong',
  ghost:
    'border-transparent bg-transparent text-text-muted hover:bg-surface-soft hover:text-text-primary',
  inverse:
    'border-transparent bg-surface-inverse text-text-contrast shadow-minimal hover:opacity-90 hover:shadow-minimal-lg',
  danger:
    'border-transparent bg-red-600 text-white shadow-minimal hover:bg-red-700 hover:shadow-minimal-lg dark:bg-red-500 dark:hover:bg-red-600',
};

const sizeClasses = {
  sm: 'min-h-9 px-3 py-2 text-xs',
  md: 'min-h-11 px-5 py-2.5 text-sm',
  lg: 'min-h-12 px-7 py-3 text-base',
  icon: 'h-10 w-10 p-0',
};

const Button = forwardRef(function Button(
  {
    as: Component = 'button',
    children,
    className,
    disabled = false,
    fullWidth = false,
    size = 'md',
    type,
    variant = 'primary',
    ...props
  },
  ref,
) {
  const isButton = Component === 'button';

  return (
    <Component
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg border font-display font-semibold tracking-tight transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-body',
        'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
        fullWidth && 'w-full',
        sizeClasses[size] || sizeClasses.md,
        variantClasses[variant] || variantClasses.primary,
        className,
      )}
      disabled={isButton ? disabled : undefined}
      aria-disabled={!isButton && disabled ? true : undefined}
      type={isButton ? type || 'button' : undefined}
      {...props}
    >
      {children}
    </Component>
  );
});

export default Button;
