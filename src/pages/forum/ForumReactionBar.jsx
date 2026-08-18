import { REACTION_META } from './forumTheme';

/** Named learning-signal reactions — separate row from the plain vote/like control. */
export default function ForumReactionBar({ counts = {}, myReactions = [], onToggle }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTION_META.map((r) => {
        const active = myReactions.includes(r.value);
        const count = counts[r.value] || 0;
        return (
          <button
            key={r.value}
            type="button"
            onClick={() => onToggle(r.value, !active)}
            title={r.label}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold transition-colors duration-150 ${active ? 'text-accent-contrast' : 'text-text-muted hover:bg-surface-soft'}`}
            style={active ? { background: 'var(--forum-accent)', borderColor: 'var(--forum-accent)' } : { borderColor: 'var(--line-soft)' }}
          >
            <span aria-hidden="true">{r.emoji}</span>
            <span>{r.label}</span>
            {count > 0 && <span className="font-mono">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
