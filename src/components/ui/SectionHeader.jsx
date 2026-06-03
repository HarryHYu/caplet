import { cn } from './utils';

export default function SectionHeader({ actions, children, className, eyebrow, title, ...props }) {
  return (
    <div className={cn('mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)} {...props}>
      <div className="max-w-2xl">
        {eyebrow && <span className="section-kicker">{eyebrow}</span>}
        {title && <h2 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">{title}</h2>}
        {children && <p className="mt-3 text-sm leading-6 text-text-muted md:text-base">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
