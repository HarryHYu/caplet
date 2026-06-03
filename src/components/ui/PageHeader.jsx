import { cn } from './utils';

const alignClasses = {
  left: 'items-start text-left',
  center: 'items-center text-center mx-auto',
};

export default function PageHeader({ actions, align = 'left', children, className, eyebrow, title, ...props }) {
  return (
    <header
      className={cn(
        'mb-14 flex flex-col gap-6 md:mb-20',
        actions && align === 'left' && 'md:flex-row md:items-end md:justify-between',
        !actions && alignClasses[align],
        className,
      )}
      {...props}
    >
      <div className={cn('max-w-3xl', align === 'center' && 'mx-auto')}>
        {eyebrow && <span className="section-kicker">{eyebrow}</span>}
        {title && <h1 className="text-4xl font-bold tracking-tight text-text-primary md:text-6xl">{title}</h1>}
        {children && <div className="mt-5 max-w-2xl text-lg leading-8 text-text-muted md:text-xl">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
