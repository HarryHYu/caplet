import { Link } from 'react-router-dom';
import { ArrowRightIcon, BookOpenIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export function LearningPageHeader({ eyebrow, title, description, actions, className = '' }) {
  return (
    <header className={`max-w-4xl ${className}`}>
      {eyebrow && <p className="section-kicker">{eyebrow}</p>}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-5xl font-extrabold leading-[0.96] tracking-[-0.04em] text-text-primary md:text-6xl">
            {title}
          </h1>
          {description && <p className="mt-5 max-w-2xl text-lg font-medium leading-relaxed text-text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
      </div>
    </header>
  );
}

export function LearningSection({ eyebrow, title, description, action, children, className = '', labelledBy }) {
  const headingId = labelledBy || `learning-section-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <section aria-labelledby={headingId} className={className}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow && <p className="section-kicker">{eyebrow}</p>}
          <h2 id={headingId} className="font-display text-3xl font-extrabold tracking-tight text-text-primary">{title}</h2>
          {description && <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function LearningCard({
  title,
  description,
  href,
  kind = 'Learning',
  metadata = [],
  status,
  progress,
  icon = BookOpenIcon,
  actionLabel = 'Open',
  className = '',
}) {
  const CardIcon = icon;
  const percentage = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : null;
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
          <CardIcon className="h-6 w-6" aria-hidden="true" />
        </span>
        {status && (
          <span className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.11em] ${status === 'Complete' ? 'block-green text-green' : 'bg-surface-soft text-text-muted'}`}>
            {status === 'Complete' && <CheckCircleIcon className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />}
            {status}
          </span>
        )}
      </div>
      <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.13em] text-text-dim">{kind}</p>
      <h3 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-text-primary transition-colors group-hover:text-accent">{title}</h3>
      {description && <p className="mt-3 text-sm font-medium leading-relaxed text-text-muted">{description}</p>}
      {metadata.length > 0 && <p className="mt-5 text-xs font-bold text-text-dim">{metadata.filter(Boolean).join(' · ')}</p>}
      {percentage !== null && (
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs font-bold text-text-muted"><span>Progress</span><span>{Math.round(percentage)}%</span></div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-soft" role="progressbar" aria-label={`${title} progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(percentage)}>
            <div className="h-full rounded-full bg-accent" style={{ width: `${percentage}%` }} />
          </div>
        </div>
      )}
      <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-extrabold text-accent">
        {actionLabel} {href && <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />}
      </span>
    </>
  );
  const classes = `group flex min-h-full flex-col rounded-3xl border border-line-soft bg-surface-raised p-6 shadow-[0_22px_48px_-40px_rgba(20,20,18,0.5)] transition-[transform,border-color,box-shadow] duration-200 ${href ? 'hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_28px_54px_-38px_rgba(20,20,18,0.45)]' : 'opacity-75'} ${className}`;

  if (!href) return <div className={classes} aria-disabled="true">{content}</div>;
  return <Link to={href} className={classes}>{content}</Link>;
}
