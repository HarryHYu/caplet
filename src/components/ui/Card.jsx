const Card = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-line-soft bg-surface-raised shadow-sm transition-all ${className}`}>
    {children}
  </div>
);

export default Card;
