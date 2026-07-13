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
    } else if (isStudyPath(location.pathname)) {
      setProductMode?.('study');
      rememberProductRoute?.('study', fullPath);
    }
  }, [featureFlagsLoading, isAuthenticated, isEnabled, location.hash, location.pathname, location.search, rememberProductRoute, setProductMode]);

  return null;
}
