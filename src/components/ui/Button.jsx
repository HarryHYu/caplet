const variantClasses = {
  primary:
    'border-transparent bg-accent text-white shadow-lg shadow-accent/20 hover:bg-accent-strong hover:shadow-xl hover:shadow-accent/25',
  secondary:
    'border-line-soft bg-white/80 text-text-primary shadow-sm hover:border-accent/40 hover:bg-accent/5 hover:text-accent',
  ghost:
    'border-transparent bg-transparent text-accent hover:bg-accent/10',
};

const Button = ({ children, className = '', variant = 'primary', isLoading = false, disabled = false, ...props }) => (
  <button
    className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3.5 text-sm font-bold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${className}`}
    disabled={disabled || isLoading}
    {...props}
  >
    {isLoading ? (
      <span className="h-5 w-5 rounded-full border-2 border-current/30 border-t-current animate-spin" aria-hidden="true" />
    ) : null}
    <span>{children}</span>
  </button>
);

export default Button;
