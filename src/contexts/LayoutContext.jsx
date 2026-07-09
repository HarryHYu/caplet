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

  const toggleNavMode = useCallback(
    () => setNavMode((m) => (m === 'vertical' ? 'horizontal' : 'vertical')),
    []
  );

  const toggleSidebar = useCallback(() => setSidebarCollapsed((c) => !c), []);

  return (
    <LayoutContext.Provider
      value={{ navMode, toggleNavMode, sidebarCollapsed, toggleSidebar }}
    >
      {children}
    </LayoutContext.Provider>
  );
};
