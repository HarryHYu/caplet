import { forwardRef } from 'react';

const Input = forwardRef(({ className = '', ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full rounded-xl border border-line-soft bg-surface-raised px-5 py-3.5 text-sm font-medium text-text-primary outline-none transition-all placeholder:text-text-dim/60 hover:border-text-dim/60 focus:border-accent focus:ring-4 focus:ring-accent/10 ${className}`}
    {...props}
  />
));

Input.displayName = 'Input';

export default Input;
