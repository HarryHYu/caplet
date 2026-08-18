const TABS = [
  { value: 'hot', label: 'Hot' },
  { value: 'new', label: 'New' },
  { value: 'top', label: 'Top' },
  { value: 'best', label: 'Best' },
];

export default function ForumSortTabs({ value, onChange }) {
  return (
    <div className="forum-card mb-4 flex items-center gap-1 p-1.5">
      {TABS.map((tab) => {
        const active = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`rounded-xl px-3.5 py-1.5 text-sm font-bold transition-colors duration-150 ${active ? 'text-accent-contrast' : 'text-text-muted hover:bg-surface-soft hover:text-text-primary'}`}
            style={active ? { background: 'var(--forum-accent)' } : undefined}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
