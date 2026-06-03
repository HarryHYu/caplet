import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function ErrorState({
  eyebrow = 'Unable to load',
  title = 'Something went wrong.',
  message = 'We could not load this data. Please try again shortly.',
  details = null,
  action = null,
  className = '',
  compact = false,
}) {
  return (
    <div className={`border border-red-500/30 bg-red-50/70 dark:bg-red-900/10 text-center ${compact ? 'p-10' : 'p-16 md:p-20'} ${className}`} role="alert">
      <ExclamationTriangleIcon className="w-9 h-9 text-red-500 mx-auto mb-6" aria-hidden="true" />
      {eyebrow ? (
        <span className="section-kicker mb-4 text-red-500">
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
      {details ? (
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-red-500/80 break-words">
          {details}
        </p>
      ) : null}
      {action ? <div className="mt-8 flex justify-center">{action}</div> : null}
    </div>
  );
}
