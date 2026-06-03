import { cn } from './utils';

const spacingClasses = {
  sm: 'py-16 md:py-20',
  md: 'py-24 md:py-28',
  lg: 'py-32',
};

export default function PageShell({ children, className, contained = true, spacing = 'lg', ...props }) {
  return (
    <main
      className={cn(
        'min-h-screen bg-surface-body text-text-primary selection:bg-accent selection:text-white',
        spacingClasses[spacing] || spacingClasses.lg,
        className,
      )}
      {...props}
    >
      {contained ? <div className="container-custom">{children}</div> : children}
    </main>
  );
}
