import { Navigate, useLocation } from 'react-router-dom';
import CapletLoader from './CapletLoader';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';

export default function MoneyRouteGate({ children, flagKey = 'money.mode.pilot', fallbackPath = '/dashboard' }) {
  const location = useLocation();
  const { loading, isEnabled } = useFeatureFlags();

  // The first clickable Money prototype is approved for direct access. Named
  // high-risk flags passed by future surfaces still use the guarded path below.
  if (flagKey === 'money.mode.pilot') return children;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-live="polite">
        <CapletLoader message="Checking Money access…" />
      </div>
    );
  }

  if (!isEnabled(flagKey)) {
    return <Navigate to={fallbackPath} replace state={{ from: location.pathname }} />;
  }

  return children;
}
