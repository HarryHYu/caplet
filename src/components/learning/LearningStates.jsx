import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import CapletLoader from '../CapletLoader';

export function LearningLoader({ message = 'Loading your learning data…' }) {
  return (
    <div className="min-h-[55vh] grid place-items-center px-6" role="status">
      <CapletLoader message={message} />
    </div>
  );
}

export function LearningError({ title = 'We could not load this yet.', message, onRetry }) {
  return (
    <div className="min-h-[55vh] grid place-items-center px-6">
      <div className="w-full max-w-lg rounded-3xl bg-surface-raised p-8 text-center shadow-[0_24px_60px_-42px_rgba(20,20,18,0.45)]">
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

export function LearningEmpty({ title, message, action }) {
  return (
    <div className="rounded-3xl bg-surface-raised p-8 text-center md:p-12">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
        <SparklesIcon className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-2xl font-display font-extrabold text-text-primary">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-relaxed text-text-muted">{message}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
