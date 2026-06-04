import { cn } from './utils';

const spacingClasses = {
  sm: 'py-20 md:py-24',
  md: 'py-28 md:py-32',
  lg: 'py-32 md:py-40',
};

const PageShell = ({ children, className = '', contained = true, spacing = 'md' }) => (
  <div className={cn('min-h-screen bg-surface-body selection:bg-accent selection:text-white', spacingClasses[spacing] || spacingClasses.md, className)}>
    {contained ? <div className="container-custom">{children}</div> : children}
  </div>
);

export default PageShell;
