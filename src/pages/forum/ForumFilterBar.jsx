import { TAG_META } from './forumTheme';

const SOLVED_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Solved' },
  { value: 'false', label: 'Unsolved' },
];

/** Tag + solved/unsolved filters, shared between the home feed and each subject feed. */
export default function ForumFilterBar({ tag, onTagChange, solved, onSolvedChange }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <select value={tag || ''} onChange={(e) => onTagChange(e.target.value || '')} className="rounded-xl px-3 py-1.5 text-xs">
        <option value="">All tags</option>
        {TAG_META.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <div className="forum-card flex items-center gap-1 p-1">
        {SOLVED_OPTIONS.map((opt) => {
          const active = (solved || '') === opt.value;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onSolvedChange(opt.value)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${active ? 'text-white' : 'text-text-muted hover:bg-surface-soft'}`}
              style={active ? { background: 'var(--forum-accent)' } : undefined}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
