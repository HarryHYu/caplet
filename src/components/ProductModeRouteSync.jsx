import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';
import { useLayout } from '../contexts/LayoutContext';
import { canAccessMoneyRoute, isMoneyPath, isStudyPath } from '../config/productNavigation';

export default function ProductModeRouteSync() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { loading: featureFlagsLoading, isEnabled } = useFeatureFlags();
  const { setProductMode, rememberProductRoute } = useLayout();

  useEffect(() => {
    const fullPath = `${location.pathname}${location.search}${location.hash}`;
    if (isMoneyPath(location.pathname)) {
      setProductMode?.('money');
      if (canAccessMoneyRoute(fullPath, { isAuthenticated, featureFlagsLoading, isFeatureEnabled: isEnabled })) {
        rememberProductRoute?.('money', fullPath);
      }
    } else {
      // Any non-Money path — including neutral surfaces like /settings and
      // /profile — restores study mode so the top bar recovers its study
      // links. Only genuine study destinations are remembered for the
      // mode-switch "return to where I was" behaviour.
      setProductMode?.('study');
      if (isStudyPath(location.pathname)) {
        rememberProductRoute?.('study', fullPath);
      }
    }
  }, [featureFlagsLoading, isAuthenticated, isEnabled, location.hash, location.pathname, location.search, rememberProductRoute, setProductMode]);

  return null;
}
