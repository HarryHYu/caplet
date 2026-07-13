import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { probabilityPercent } from '../../lib/learning';

function confidenceLabel(value) {
  if (typeof value === 'string' && value.trim()) {
    return `${value.charAt(0).toUpperCase()}${value.slice(1)} confidence`;
  }
  const confidence = probabilityPercent(value);
  if (confidence >= 75) return 'High confidence';
  if (confidence >= 45) return 'Developing confidence';
  return 'Early estimate';
}

function retentionLabel(value) {
  if (typeof value === 'string' && value.trim()) return value;
  if (value == null) return 'Not measured';
  return `${probabilityPercent(value)}% strength`;
}

function reviewLabel(value) {
  if (!value) return 'No review scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Review date unavailable';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const review = new Date(date);
  review.setHours(0, 0, 0, 0);
  if (review <= now) return 'Due for review';
  return `Review ${new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' }).format(date)}`;
}

function misconceptionText(item) {
  if (typeof item === 'string') return item;
  return item?.label || item?.title || item?.description || item?.code || '';
}

function MasteryBar({ value, label }) {
  const percent = probabilityPercent(value);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold">
        <span className="text-text-muted">{label}</span>
        <span className="font-mono text-text-primary">{percent}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-surface-soft"
        role="progressbar"
        aria-label={`${label}: ${percent}%`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={percent}
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function OutcomeContent({ outcome }) {
  const misconceptions = (outcome.misconceptions || []).map(misconceptionText).filter(Boolean);
  const due = Number(outcome.evidenceCount) > 0 ? reviewLabel(outcome.nextReviewAt) : 'No evidence yet';
  const practiceHref = `/practice?subject=${encodeURIComponent(outcome.subject || 'economics')}&mode=weak-topic&outcomeId=${encodeURIComponent(outcome.id)}`;

  return (
    <>
      {outcome.description && (
        <p className="mt-3 max-w-3xl text-sm font-medium leading-relaxed text-text-muted">{outcome.description}</p>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(220px,1.2fr)_minmax(0,2fr)]">
        <MasteryBar value={outcome.probability} label="Mastery probability" />
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric icon={CheckBadgeIcon} term="Confidence" value={confidenceLabel(outcome.confidence)} />
          <Metric icon={ChartBarIcon} term="Evidence" value={`${Number(outcome.evidenceCount) || 0} ${Number(outcome.evidenceCount) === 1 ? 'attempt' : 'attempts'}`} />
          <Metric icon={ClockIcon} term="Retention" value={retentionLabel(outcome.retentionStrength)} />
          <Metric icon={CalendarDaysIcon} term="Next review" value={due} emphasis={due === 'Due for review'} />
        </dl>
      </div>

      <div className="mt-5 flex flex-col gap-4 border-t border-line-soft pt-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-text-dim">Misconceptions to watch</p>
          {misconceptions.length ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {misconceptions.map((misconception, index) => (
                <li key={`${misconception}-${index}`} className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--block-amber)] px-3 py-1.5 text-xs font-bold text-text-primary">
                  <ExclamationCircleIcon className="h-3.5 w-3.5 shrink-0 text-[color:var(--mark-amber)]" aria-hidden="true" />
                  {misconception}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm font-medium text-text-muted">No recurring misconception detected.</p>
          )}
        </div>
        <Link to={practiceHref} className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-accent hover:text-accent-strong">
          Practise this outcome <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}

function Metric(props) {
  const { term, value, emphasis = false } = props;
  const Icon = props.icon;
  return (
    <div className="rounded-2xl bg-surface-soft px-3.5 py-3">
      <dt className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-text-dim">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {term}
      </dt>
      <dd className={`mt-1.5 text-xs font-bold leading-snug ${emphasis ? 'text-text-error' : 'text-text-primary'}`}>{value}</dd>
    </div>
  );
}

function OutcomeNode({ outcome, depth = 0 }) {
  const children = outcome.children || [];
  const headingLevel = Math.min(6, depth + 2);
  const Heading = `h${headingLevel}`;
  const header = (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        {outcome.code && (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-accent">{outcome.code}</span>
        )}
        <Heading className={`${depth ? 'text-lg' : 'text-xl md:text-2xl'} font-display font-extrabold tracking-tight text-text-primary`}>
          {outcome.title || 'Untitled outcome'}
        </Heading>
      </div>
    </div>
  );

  return (
    <li className={depth ? 'ml-3 border-l border-line-soft pl-4 md:ml-6 md:pl-6' : ''}>
      <article className="rounded-3xl bg-surface-raised p-5 shadow-[0_18px_44px_-36px_rgba(20,20,18,0.45)] md:p-6">
        {children.length ? (
          <details open={depth === 0}>
            <summary className="cursor-pointer list-none rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-4 focus-visible:ring-offset-surface-raised [&::-webkit-details-marker]:hidden">
              <div className="flex items-center justify-between gap-4">
                {header}
                <span className="shrink-0 rounded-full bg-surface-soft px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-text-muted">
                  {children.length} {children.length === 1 ? 'sub-outcome' : 'sub-outcomes'}
                </span>
              </div>
            </summary>
            <OutcomeContent outcome={outcome} />
            <ul className="mt-5 space-y-4">
              {children.map((child) => <OutcomeNode key={child.id || child.code || child.title} outcome={child} depth={depth + 1} />)}
            </ul>
          </details>
        ) : (
          <>
            {header}
            <OutcomeContent outcome={outcome} />
          </>
        )}
      </article>
    </li>
  );
}

export default function MasteryOutcomeTree({ outcomes }) {
  return (
    <ul className="space-y-5" aria-label="Curriculum outcome mastery">
      {outcomes.map((outcome) => <OutcomeNode key={outcome.id || outcome.code || outcome.title} outcome={outcome} />)}
    </ul>
  );
}
