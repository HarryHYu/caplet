import { InboxIcon } from '@heroicons/react/24/outline';

export default function EmptyState({
  eyebrow = 'Nothing here yet',
  title = 'No results found.',
  message = 'There is no data to show right now.',
  action = null,
  icon: Icon = InboxIcon,
  className = '',
  compact = false,
}) {
  return (
    <div className={`border border-line-soft bg-surface-soft text-center ${compact ? 'p-10' : 'p-16 md:p-20'} ${className}`}>
      {Icon ? <Icon className="w-8 h-8 text-text-dim mx-auto mb-6" aria-hidden="true" /> : null}
      {eyebrow ? (
        <span className="section-kicker mb-4 text-text-dim">
          {eyebrow}
        </span>
      ) : null}
      <h2 className="text-2xl md:text-4xl font-serif italic text-text-primary mb-5">
        {title}
      </h2>
      {message ? (
        <p className="text-sm font-medium text-text-muted max-w-xl mx-auto leading-relaxed">
          {message}
        </p>
      ) : null}
      {action ? <div className="mt-8 flex justify-center">{action}</div> : null}
    </div>
  );
}
