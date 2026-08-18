import { Navigate, useLocation } from 'react-router-dom';
import CapletLoader from './CapletLoader';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';

export default function MoneyRouteGate({
  children,
  flagKey = null,
  fallbackPath = '/dashboard',
  unavailableMessage = '',
}) {
  const location = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { loading, isEnabled } = useFeatureFlags();

  // Core Money learning, public data, and calculators are part of Caplet.
  // Only higher-risk private/personalised surfaces pass an explicit flag.
  if (!flagKey) return children;

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-live="polite">
        <CapletLoader message="Checking Money access…" />
      </div>
    );
  }

  // Flagged Money surfaces are all account-bound. A signed-out visitor gets
  // the sign-in door (with a way back to this page), not a confusing
  // "not available for this account" bounce.
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}`, returnState: location.state }}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-live="polite">
        <CapletLoader message="Checking Money access…" />
      </div>
    );
  }

  if (!isEnabled(flagKey)) {
    return (
      <Navigate
        to={fallbackPath}
        replace
        state={{
          from: location.pathname,
          ...(unavailableMessage ? { moneyNotice: unavailableMessage } : {}),
        }}
      />
    );
  }

  return children;
}
