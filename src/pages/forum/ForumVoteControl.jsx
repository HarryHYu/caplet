import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

/**
 * Vertical vote widget. There's no downvote in this forum by design (see
 * backend/services/forumModeration.js — a deliberate choice for a school
 * context) — the down chevron stays visible for the familiar shape but is
 * inert, with a title tooltip explaining why instead of just missing.
 */
export default function ForumVoteControl({ count, liked, onToggle, size = 'md' }) {
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5 py-1">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={liked}
        aria-label={liked ? 'Remove like' : 'Like'}
        className="rounded-md p-1 transition-colors hover:bg-surface-soft"
      >
        <ChevronUpIcon className={iconSize} style={{ color: liked ? 'var(--forum-accent)' : 'var(--text-dim)' }} />
      </button>
      <span className="font-mono text-sm font-bold" style={{ color: liked ? 'var(--forum-accent)' : 'var(--text-primary)' }}>
        {count}
      </span>
      <button
        type="button"
        disabled
        title="Downvotes are off here — like the most helpful posts instead"
        className="cursor-not-allowed rounded-md p-1 opacity-25"
      >
        <ChevronDownIcon className={iconSize} style={{ color: 'var(--text-dim)' }} />
      </button>
    </div>
  );
}
