import { createElement } from 'react';
import { cn } from './utils';

const variantClasses = {
  accent: 'bg-accent-soft text-accent ring-accent/10',
  neutral: 'bg-surface-soft text-text-muted ring-line-soft',
  inverse: 'bg-surface-inverse text-text-contrast ring-transparent',
  success: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300',
  warning: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300',
  danger: 'bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-300',
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export default function Badge({ as: Component = 'span', children, className, size = 'md', variant = 'neutral', ...props }) {
  return createElement(
    Component,
    {
      className: cn(
        'inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-[0.16em] ring-1 ring-inset',
        sizeClasses[size] || sizeClasses.md,
        variantClasses[variant] || variantClasses.neutral,
        className,
      ),
      ...props,
    },
    children,
  );
}
