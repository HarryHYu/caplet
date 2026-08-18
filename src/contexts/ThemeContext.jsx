import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();
const palettes = ['paper', 'white', 'sky', 'sage', 'rose'];
// Respect the device first; an explicit saved choice still wins.
const DEFAULT_THEME = 'system';

/* eslint-disable-next-line react-refresh/only-export-components */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const getSystemPreference = () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  // All localStorage access is guarded: privacy modes and blocked storage
  // throw on any touch, and the theme boots before everything else — an
  // unguarded read here crashes the whole app at startup.
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem('theme');
      return ['light', 'dark', 'system'].includes(stored) ? stored : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });
  const [systemIsDark, setSystemIsDark] = useState(getSystemPreference);
  const [palette, setPalette] = useState(() => {
    try {
      const stored = localStorage.getItem('palette');
      return palettes.includes(stored) ? stored : 'paper';
    } catch {
      return 'paper';
    }
  });
  const isDark = theme === 'dark' || (theme === 'system' && systemIsDark);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return undefined;
    const syncSystemPreference = (event) => setSystemIsDark(event.matches);
    media.addEventListener?.('change', syncSystemPreference);
    return () => media.removeEventListener?.('change', syncSystemPreference);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Non-fatal: the choice just won't persist.
    }
  }, [isDark, theme]);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    try {
      localStorage.setItem('palette', palette);
    } catch {
      // Non-fatal: the choice just won't persist.
    }
  }, [palette]);

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, palette, setPalette, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
