import Card from './Card';
import { cn } from './utils';

export default function EmptyState({ action, children, className, icon: Icon, title = 'Nothing here yet', ...props }) {
  return (
    <Card className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)} {...props}>
      {Icon && (
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-xl font-bold tracking-tight text-text-primary">{title}</h3>
      {children && <div className="mt-3 max-w-md text-sm leading-6 text-text-muted">{children}</div>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </Card>
  );
}
