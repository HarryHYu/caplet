import Card from './Card';
import { cn } from './utils';

export default function StatCard({ className, footer, icon: Icon, label, trend, value, ...props }) {
  return (
    <Card className={cn('group overflow-hidden', className)} padding="lg" {...props}>
      <div className="flex items-start justify-between gap-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-text-dim transition-colors group-hover:text-accent">
          {label}
        </p>
        {Icon && (
          <span className="rounded-full bg-surface-soft p-2 text-text-dim transition-colors group-hover:text-accent">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="mt-8 flex items-end justify-between gap-4">
        <p className="font-serif text-4xl italic tracking-tight text-text-primary transition-transform duration-300 group-hover:translate-x-1 md:text-5xl">
          {value}
        </p>
        {trend && <p className="text-sm font-semibold text-accent">{trend}</p>}
      </div>
      {footer && <div className="mt-6 border-t border-line-soft pt-4 text-sm leading-6 text-text-muted">{footer}</div>}
    </Card>
  );
}
