import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLayout } from '../contexts/LayoutContext';
import { isMoneyPath, isStudyPath } from '../config/productNavigation';

export default function ProductModeRouteSync() {
  const location = useLocation();
  const { setProductMode, rememberProductRoute } = useLayout();

  useEffect(() => {
    const fullPath = `${location.pathname}${location.search}${location.hash}`;
    if (isMoneyPath(location.pathname)) {
      setProductMode?.('money');
      rememberProductRoute?.('money', fullPath);
    } else if (isStudyPath(location.pathname)) {
      setProductMode?.('study');
      rememberProductRoute?.('study', fullPath);
    }
  }, [location.hash, location.pathname, location.search, rememberProductRoute, setProductMode]);

  return null;
}

