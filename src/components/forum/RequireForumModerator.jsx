import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

/**
 * Like RequireAdmin, but for forum moderators — a role that isn't on the
 * User model (see backend/models/ForumModerator.js), so it needs an async
 * check instead of a synchronous user.role comparison.
 */
export default function RequireForumModerator({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const location = useLocation();
  const [isModerator, setIsModerator] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let alive = true;
    api.getForumMyStatus()
      .then((data) => { if (alive) setIsModerator(!!data.isModerator); })
      .catch(() => { if (alive) setIsModerator(false); });
    return () => { alive = false; };
  }, [isAuthenticated]);

  if (authLoading || (isAuthenticated && isModerator === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-body">
        <span className="text-text-muted">Checking access…</span>
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  if (!isModerator) {
    return <Navigate to="/forum" replace />;
  }
  return children;
}
