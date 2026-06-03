import { createElement, forwardRef } from 'react';
import { cn } from './utils';

const variantClasses = {
  default: 'border-line-soft bg-surface-raised shadow-minimal',
  soft: 'border-line-soft bg-surface-soft',
  flat: 'border-line-soft bg-surface-body',
  inverse: 'border-transparent bg-surface-inverse text-text-contrast shadow-minimal-lg',
};

const paddingClasses = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const Card = forwardRef(function Card(
  { as: Component = 'div', children, className, interactive = false, padding = 'md', variant = 'default', ...props },
  ref,
) {
  return createElement(
    Component,
    {
      ref,
      className: cn(
        'rounded-xl border transition-all duration-200',
        variantClasses[variant] || variantClasses.default,
        paddingClasses[padding] || paddingClasses.md,
        interactive &&
          'hover:-translate-y-0.5 hover:border-text-dim hover:shadow-minimal-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-body',
        className,
      ),
      ...props,
    },
    children,
  );
});

export function CardHeader({ children, className, ...props }) {
  return (
    <div className={cn('mb-5 flex flex-col gap-2 border-b border-line-soft pb-5', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }) {
  return (
    <h3 className={cn('text-xl font-bold tracking-tight text-text-primary', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className, ...props }) {
  return (
    <p className={cn('text-sm leading-6 text-text-muted', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className, ...props }) {
  return (
    <div className={cn('text-text-primary', className)} {...props}>
      {children}
    </div>
  );
}

export default Card;
