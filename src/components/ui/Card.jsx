import { cn } from './utils';

const variantClasses = {
  default: 'border-line-soft bg-surface-raised shadow-sm',
  flat: 'border-line-soft bg-surface-body',
  soft: 'border-line-soft bg-surface-soft',
  inverse: 'border-transparent bg-surface-inverse text-text-contrast shadow-xl',
};

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8 md:p-10',
};

const Card = ({ as = 'div', children, className = '', interactive = false, padding = 'none', variant = 'default', ...props }) => {
  const Element = as;

  return (
    <Element
      className={cn(
        'rounded-2xl border transition-all',
        variantClasses[variant] || variantClasses.default,
        paddingClasses[padding] ?? paddingClasses.none,
        interactive && 'hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10',
        className
      )}
      {...props}
    >
      {children}
    </Element>
  );
};

export const CardContent = ({ children, className = '', ...props }) => (
  <div className={cn('space-y-4', className)} {...props}>
    {children}
  </div>
);

export default Card;
