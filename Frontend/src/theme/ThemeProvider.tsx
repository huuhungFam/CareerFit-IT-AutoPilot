import { useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeContext, type ThemeContextValue, type ThemeMode } from './ThemeContext';

const STORAGE_KEY = 'careerfit.theme';

function getInitialTheme(): ThemeMode {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    setTheme(nextTheme) {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
      setThemeState(nextTheme);
    },
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
