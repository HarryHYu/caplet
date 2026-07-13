import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/* eslint-disable-next-line react-refresh/only-export-components */
export const LayoutContext = createContext();

/* eslint-disable-next-line react-refresh/only-export-components */
export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};

const NAV_MODE_KEY = 'caplet:nav-mode';
const COLLAPSED_KEY = 'caplet:dashboard-sidebar-collapsed';
const PRODUCT_MODE_KEY = 'caplet:product-mode';
const LAST_STUDY_ROUTE_KEY = 'caplet:last-study-route';
const LAST_MONEY_ROUTE_KEY = 'caplet:last-money-route';

/**
 * Owns the app's navigation chrome preference: a single global choice between
 * the horizontal top bar and the vertical side rail. The two are mutually
 * exclusive — never rendered together — and the choice applies to every page,
 * so switching modes is consistent site-wide. Also owns the rail's collapsed
 * state so it survives navigation. Both are persisted to localStorage.
 */
export const LayoutProvider = ({ children }) => {
  const [navMode, setNavMode] = useState(() => {
    try {
      return localStorage.getItem(NAV_MODE_KEY) === 'vertical' ? 'vertical' : 'horizontal';
    } catch {
      return 'horizontal';
    }
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [productMode, setProductMode] = useState(() => {
    try {
      return localStorage.getItem(PRODUCT_MODE_KEY) === 'money' ? 'money' : 'study';
    } catch {
      return 'study';
    }
  });

  const [lastStudyRoute, setLastStudyRoute] = useState(() => {
    try {
      return localStorage.getItem(LAST_STUDY_ROUTE_KEY) || '/dashboard';
    } catch {
      return '/dashboard';
    }
  });

  const [lastMoneyRoute, setLastMoneyRoute] = useState(() => {
    try {
      return localStorage.getItem(LAST_MONEY_ROUTE_KEY) || '/money';
    } catch {
      return '/money';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(NAV_MODE_KEY, navMode);
    } catch {
      // Non-fatal: preference just won't persist.
    }
  }, [navMode]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSED_KEY, String(sidebarCollapsed));
    } catch {
      // Non-fatal: preference just won't persist.
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(PRODUCT_MODE_KEY, productMode);
    } catch {
      // Non-fatal: the current route still determines the active mode.
    }
  }, [productMode]);

  useEffect(() => {
    try {
      localStorage.setItem(LAST_STUDY_ROUTE_KEY, lastStudyRoute);
    } catch {
      // Non-fatal: fall back to the Study overview.
    }
  }, [lastStudyRoute]);

  useEffect(() => {
    try {
      localStorage.setItem(LAST_MONEY_ROUTE_KEY, lastMoneyRoute);
    } catch {
      // Non-fatal: fall back to the Money overview.
    }
  }, [lastMoneyRoute]);

  const toggleNavMode = useCallback(
    () => setNavMode((m) => (m === 'vertical' ? 'horizontal' : 'vertical')),
    []
  );

  const toggleSidebar = useCallback(() => setSidebarCollapsed((c) => !c), []);

  const rememberProductRoute = useCallback((mode, route) => {
    if (!route || typeof route !== 'string') return;
    if (mode === 'money') setLastMoneyRoute(route);
    if (mode === 'study') setLastStudyRoute(route);
  }, []);

  return (
    <LayoutContext.Provider
      value={{
        navMode,
        toggleNavMode,
        sidebarCollapsed,
        toggleSidebar,
        productMode,
        setProductMode,
        lastStudyRoute,
        lastMoneyRoute,
        rememberProductRoute,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};
