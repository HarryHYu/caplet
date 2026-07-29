import { Navigate, useLocation } from 'react-router-dom';
import CapletLoader from './CapletLoader';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';

export default function MoneyRouteGate({
  children,
  flagKey = null,
  fallbackPath = '/dashboard',
  unavailableMessage = '',
}) {
  const location = useLocation();
  const { loading, isEnabled } = useFeatureFlags();

  // Core Money learning, public data, and calculators are part of Caplet.
  // Only higher-risk private/personalised surfaces pass an explicit flag.
  if (!flagKey) return children;

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
