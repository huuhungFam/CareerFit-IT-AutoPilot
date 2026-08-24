import { useEffect, useMemo, useState } from 'react';
import { ThemeContext, type Theme, type ThemeContextValue } from './context';
const storageKey = 'careerfit-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => window.localStorage.getItem(storageKey) === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(storageKey, theme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme: setThemeState,
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
