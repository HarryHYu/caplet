const variantClasses = {
  default: 'border-line-soft bg-surface-soft text-text-muted',
  accent: 'border-accent/20 bg-accent/10 text-accent',
  strong: 'border-accent bg-accent text-white',
  inverse: 'border-white/10 bg-white/10 text-white',
};

const Badge = ({ children, variant = 'default', className = '' }) => (
  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${variantClasses[variant] || variantClasses.default} ${className}`}>
    {children}
  </span>
);

export default Badge;
