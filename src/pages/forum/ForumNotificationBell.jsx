import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { relativeTime } from './forumTheme';

/** In-app notifications, fanned out when a followed subject gets a new approved thread. */
export default function ForumNotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);

  const load = async () => {
    try {
      const res = await api.getForumNotifications({ limit: 10 });
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } catch {
      // Non-fatal — the bell just stays quiet.
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const markRead = async (n) => {
    if (n.isRead) return;
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try { await api.markForumNotificationRead(n.id); } catch { /* already optimistic */ }
  };

  const markAll = async () => {
    setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
    setUnreadCount(0);
    try { await api.markAllForumNotificationsRead(); } catch { /* already optimistic */ }
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="relative rounded-full p-2 text-text-muted transition-colors hover:bg-surface-soft hover:text-text-primary">
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-accent-contrast" style={{ background: 'var(--forum-accent)' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-2xl border border-line-soft bg-surface-raised shadow-card">
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
            <p className="text-sm font-bold text-text-primary">Notifications</p>
            {unreadCount > 0 && <button type="button" onClick={markAll} className="text-xs font-bold text-[color:var(--forum-accent)]">Mark all read</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-sm text-text-muted">No notifications yet. Follow a subject to get one when a new thread goes up.</p>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  to={n.thread ? `/forum/t/${n.thread.id}` : '/forum'}
                  onClick={() => { markRead(n); setOpen(false); }}
                  className={`block border-b border-line-soft px-4 py-3 text-sm last:border-0 hover:bg-surface-soft ${n.isRead ? 'text-text-muted' : 'font-semibold text-text-primary'}`}
                >
                  {n.message}
                  <p className="forum-meta mt-1">{relativeTime(n.createdAt)}</p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
