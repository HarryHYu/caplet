import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ShieldCheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import CapletLoader from '../../components/CapletLoader';
import ForumNotificationBell from './ForumNotificationBell';

/**
 * Owns the forum's chrome entirely — no shared Navbar/Sidebar (see
 * pageOwnsMain/bareChrome in App.jsx). Same cream/editorial register and
 * fonts as the rest of Caplet; distinctness comes from the coral accent and
 * denser board layout, not a different visual world.
 */
export default function ForumLayout() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  const refresh = useCallback(async () => {
    const data = await api.getForumCategories();
    setCategories(data.categories || []);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [catsRes, statusRes] = await Promise.all([
          api.getForumCategories(),
          api.getForumMyStatus().catch(() => null),
        ]);
        if (!alive) return;
        setCategories(catsRes.categories || []);
        setStatus(statusRes);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="forum-root forum-shell flex min-h-screen flex-col bg-surface-body">
      <header className="sticky top-0 z-30 border-b border-line-soft bg-surface-body/95 backdrop-blur-xl">
        <div className="container-custom flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
          <Link to="/forum" className="flex shrink-0 items-center gap-2">
            <span className="font-display text-lg font-extrabold tracking-[-0.03em] text-text-primary">Caplet.</span>
            <span
              className="forum-pill"
              style={{ color: 'var(--forum-accent)', borderColor: 'color-mix(in srgb, var(--forum-accent) 45%, var(--line-soft))', background: 'var(--forum-accent-soft)' }}
            >
              Forum
            </span>
          </Link>

          <form
            className="hidden min-w-0 max-w-xs flex-1 items-center gap-2 rounded-full border border-line-soft bg-surface-input px-3 py-1.5 md:flex"
            onSubmit={(e) => {
              e.preventDefault();
              if (searchValue.trim()) navigate(`/forum/search?q=${encodeURIComponent(searchValue.trim())}`);
            }}
          >
            <MagnifyingGlassIcon className="h-4 w-4 shrink-0 text-text-dim" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search the forum..."
              className="w-full border-0 bg-transparent p-0 text-sm shadow-none focus:ring-0"
            />
          </form>

          <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
            <Link to="/forum/search" className="rounded-full p-2 text-text-muted transition-colors hover:bg-surface-soft hover:text-text-primary md:hidden">
              <MagnifyingGlassIcon className="h-5 w-5" />
            </Link>
            <ForumNotificationBell />
            {status?.isModerator && (
              <Link
                to="/forum/mod"
                className="forum-pill text-text-primary hover:bg-surface-soft"
              >
                <ShieldCheckIcon className="h-3.5 w-3.5" /> Mod queue
              </Link>
            )}
            <Link to="/dashboard" className="hidden items-center gap-1 text-sm font-semibold text-text-muted transition-colors hover:text-text-primary sm:inline-flex">
              <ArrowLeftIcon className="h-4 w-4" /> Back to Caplet
            </Link>
          </div>
        </div>
      </header>

      {status?.sanction && (
        <div className="border-b border-border-error bg-surface-error px-6 py-2.5 text-center text-sm font-semibold text-text-error">
          {status.sanction.type === 'ban'
            ? 'Your forum account has been banned.'
            : `You are temporarily muted from posting${status.sanction.expiresAt ? ` until ${new Date(status.sanction.expiresAt).toLocaleString()}` : ''}.`}
          {status.sanction.reason ? ` — ${status.sanction.reason}` : ''}
        </div>
      )}

      <main className="container-custom flex-1 py-8 md:py-12">
        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <CapletLoader message="Opening the forum..." />
          </div>
        ) : (
          <Outlet context={{ categories, status, refreshCategories: refresh }} />
        )}
      </main>
    </div>
  );
}
