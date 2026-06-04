import { Link } from 'react-router-dom';
import { cn } from './utils';

const variantClasses = {
  primary:
    'border-transparent bg-accent text-white shadow-lg shadow-accent/20 hover:bg-accent-strong hover:shadow-xl hover:shadow-accent/25',
  secondary:
    'border-line-soft bg-white/80 text-text-primary shadow-sm hover:border-accent/40 hover:bg-accent/5 hover:text-accent',
  ghost:
    'border-transparent bg-transparent text-accent hover:bg-accent/10',
};

const sizeClasses = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-5 py-3.5 text-sm',
  lg: 'px-7 py-4 text-base',
};

const Button = ({
  as,
  children,
  className = '',
  variant,
  tone,
  size = 'md',
  isLoading = false,
  disabled = false,
  to,
  ...props
}) => {
  const Element = as || (to ? Link : 'button');
  const selectedVariant = variant || tone || 'primary';
  const isButton = Element === 'button';

  return (
    <Element
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl border font-bold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[selectedVariant] || variantClasses.primary,
        sizeClasses[size] || sizeClasses.md,
        className
      )}
      disabled={isButton ? disabled || isLoading : undefined}
      aria-disabled={!isButton && (disabled || isLoading) ? 'true' : undefined}
      to={to}
      type={isButton ? 'button' : undefined}
      {...props}
    >
      {isLoading ? (
        <span className="h-5 w-5 rounded-full border-2 border-current/30 border-t-current animate-spin" aria-hidden="true" />
      ) : null}
      <span>{children}</span>
    </Element>
  );
};

export default Button;
