import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

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
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme');
    return ['light', 'dark', 'system'].includes(stored) ? stored : 'system';
  });
  const [systemIsDark, setSystemIsDark] = useState(getSystemPreference);
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
    localStorage.setItem('theme', theme);
  }, [isDark, theme]);

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
