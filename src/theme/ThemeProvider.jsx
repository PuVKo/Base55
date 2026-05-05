import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { applyDomTheme, readStoredTheme } from '@/theme/themeStorage';

/**
 * @typedef {{ theme: 'dark' | 'light', setTheme: (t: 'dark' | 'light') => void }} ThemeContextValue
 */

/** @type {React.Context<ThemeContextValue | null>} */
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => readStoredTheme() ?? 'dark');
  const themeRef = useRef(theme);

  const setTheme = useCallback((t) => {
    const next = t === 'light' ? 'light' : 'dark';
    if (themeRef.current === next) return;
    setThemeState(next);
  }, []);

  useLayoutEffect(() => {
    themeRef.current = theme;
    applyDomTheme(theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** @returns {ThemeContextValue} */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
