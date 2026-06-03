const PageShell = ({ children, className = '' }) => (
  <div className={`min-h-screen bg-surface-body py-28 md:py-32 selection:bg-accent selection:text-white ${className}`}>
    <div className="container-custom">
      {children}
    </div>
  </div>
);

export default PageShell;
