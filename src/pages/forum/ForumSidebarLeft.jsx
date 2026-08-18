import { NavLink } from 'react-router-dom';
import { HomeIcon, ShieldCheckIcon, BookmarkIcon } from '@heroicons/react/24/outline';
import { categoryColorVars } from './forumTheme';

/**
 * The subreddit-list equivalent: every board, always visible, current one
 * highlighted. This is now the forum's primary navigation surface — the
 * horizontal pill rail that used to live in the top bar moved here.
 */
export default function ForumSidebarLeft({ categories, isModerator }) {
  return (
    <nav aria-label="Subjects" className="sticky top-20 flex flex-col gap-4">
      <div className="forum-card flex flex-col gap-0.5 p-2">
        <NavLink
          to="/forum"
          end
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors duration-150 ${isActive ? 'text-accent-contrast' : 'text-text-primary hover:bg-surface-soft'}`
          }
          style={({ isActive }) => (isActive ? { background: 'var(--forum-accent)' } : undefined)}
        >
          <HomeIcon className="h-4 w-4 shrink-0" />
          Home
        </NavLink>
        <NavLink
          to="/forum/saved"
          className={({ isActive }) =>
            `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors duration-150 ${isActive ? 'text-accent-contrast' : 'text-text-primary hover:bg-surface-soft'}`
          }
          style={({ isActive }) => (isActive ? { background: 'var(--forum-accent)' } : undefined)}
        >
          <BookmarkIcon className="h-4 w-4 shrink-0" />
          Revision list
        </NavLink>

        <p className="forum-meta px-3 pb-1 pt-3">Subjects</p>

        {categories.map((cat) => {
          const vars = categoryColorVars(cat.color);
          return (
            <NavLink
              key={cat.id}
              to={`/forum/c/${cat.slug}`}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-150 ${isActive ? 'bg-surface-soft text-text-primary' : 'text-text-muted hover:bg-surface-soft hover:text-text-primary'}`
              }
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: vars.text }} />
              <span className="truncate">{cat.name}</span>
            </NavLink>
          );
        })}
      </div>

      {isModerator && (
        <NavLink
          to="/forum/mod"
          className={({ isActive }) =>
            `forum-card flex items-center gap-2.5 px-3 py-2.5 text-sm font-bold transition-colors duration-150 ${isActive ? 'text-[color:var(--forum-accent)]' : 'text-text-primary hover:bg-surface-soft'}`
          }
        >
          <ShieldCheckIcon className="h-4 w-4 shrink-0" />
          Mod queue
        </NavLink>
      )}
    </nav>
  );
}
