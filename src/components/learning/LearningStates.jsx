import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import CapletLoader from '../CapletLoader';

export function LearningLoader({ message = 'Loading your learning data…' }) {
  return (
    <div className="min-h-[55vh] grid place-items-center px-6">
      <CapletLoader message={message} />
    </div>
  );
}

export function LearningError({ title = 'This could not load', message, onRetry }) {
  return (
    <div className="min-h-[55vh] grid place-items-center px-6">
      <div className="w-full max-w-lg rounded-3xl bg-surface-raised p-8 text-center shadow-card">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface-error text-text-error">
          <ExclamationTriangleIcon className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-display font-extrabold text-text-primary">{title}</h1>
        <p role="alert" className="mt-3 text-sm font-medium leading-relaxed text-text-muted">
          {message || 'Please check your connection and try again.'}
        </p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn-primary mx-auto mt-6">
            <ArrowPathIcon className="h-4 w-4" aria-hidden="true" /> Try again
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The page-level empty state: a whole panel is standing in for content that is
 * not there yet. Pass `icon` when a more literal glyph reads better than the
 * default spark.
 */
export function LearningEmpty({ title, message, action, icon }) {
  const Icon = icon || SparklesIcon;
  return (
    <div className="rounded-3xl bg-surface-raised p-8 text-center shadow-card md:p-12">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-2xl font-display font-extrabold text-text-primary">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-relaxed text-text-muted">{message}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * The same empty-state sentence at section scale — one shape for the boxes that
 * sit *inside* a page rather than replacing it: icon chip, bold line, muted
 * line, and an action that gets the reader out of the empty. Same vocabulary as
 * LearningEmpty, one step quieter (rounded-2xl, dashed edge, soft ground) so it
 * reads as a hole in a page instead of a card of its own.
 */
export function InlineEmpty({ title, message, action, icon, className = '' }) {
  const Icon = icon || SparklesIcon;
  return (
    <div className={`rounded-2xl border border-dashed border-line-soft bg-surface-soft p-8 text-center ${className}`}>
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-accent-soft text-accent">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-4 font-display text-lg font-extrabold text-text-primary">{title}</p>
      {message && <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-text-muted">{message}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
