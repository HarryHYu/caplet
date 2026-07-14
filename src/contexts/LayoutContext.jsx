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
const DEFAULT_NAV_MODE = 'vertical';
const COLLAPSED_KEY = 'caplet:dashboard-sidebar-collapsed';
const SIDEBAR_WIDTH_KEY = 'caplet:dashboard-sidebar-width';
const DEFAULT_SIDEBAR_WIDTH = 304;
const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 420;
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
      return localStorage.getItem(NAV_MODE_KEY) === 'horizontal' ? 'horizontal' : DEFAULT_NAV_MODE;
    } catch {
      return DEFAULT_NAV_MODE;
    }
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
      return Number.isFinite(stored)
        ? Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, stored))
        : DEFAULT_SIDEBAR_WIDTH;
    } catch {
      return DEFAULT_SIDEBAR_WIDTH;
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
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    } catch {
      // Non-fatal: the current width still applies for this session.
    }
  }, [sidebarWidth]);

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

  const chooseNavMode = useCallback((mode) => {
    if (mode === 'vertical' || mode === 'horizontal') setNavMode(mode);
  }, []);

  const toggleSidebar = useCallback(() => setSidebarCollapsed((c) => !c), []);

  const resizeSidebar = useCallback((width) => {
    const nextWidth = Number(width);
    if (!Number.isFinite(nextWidth)) return;
    setSidebarWidth(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, nextWidth)));
  }, []);

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
        setNavMode: chooseNavMode,
        sidebarCollapsed,
        toggleSidebar,
        sidebarWidth,
        resizeSidebar,
        sidebarWidthBounds: { min: MIN_SIDEBAR_WIDTH, max: MAX_SIDEBAR_WIDTH },
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
