import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import { applyDomTheme, readStoredTheme } from '@/theme/themeStorage';
import { prefersReducedMotion } from '@/viewTransition.js';

/**
 * @typedef {{ clientX: number, clientY: number }} ThemeTransitionOrigin
 * @typedef {{ theme: 'dark' | 'light', setTheme: (t: 'dark' | 'light', origin?: ThemeTransitionOrigin) => void }} ThemeContextValue
 */

/** @type {React.Context<ThemeContextValue | null>} */
const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => readStoredTheme() ?? 'dark');
  const themeRef = useRef(theme);

  const setTheme = useCallback((t, origin) => {
    const next = t === 'light' ? 'light' : 'dark';
    if (themeRef.current === next) return;

    const run = () => {
      flushSync(() => {
        setThemeState(next);
      });
    };

    if (typeof document === 'undefined') {
      setThemeState(next);
      return;
    }

    if (prefersReducedMotion() || typeof document.startViewTransition !== 'function') {
      run();
      return;
    }

    const html = document.documentElement;
    const useWave =
      origin &&
      typeof origin.clientX === 'number' &&
      typeof origin.clientY === 'number' &&
      typeof window !== 'undefined' &&
      window.innerWidth > 0 &&
      window.innerHeight > 0;

    if (useWave) {
      const xPct = (origin.clientX / window.innerWidth) * 100;
      const yPct = (origin.clientY / window.innerHeight) * 100;
      html.style.setProperty('--theme-vt-x', `${xPct}%`);
      html.style.setProperty('--theme-vt-y', `${yPct}%`);
      html.classList.add('theme-vt-wave');
      void html.offsetHeight;
    }

    const vt = document.startViewTransition(run);

    if (useWave && vt.finished) {
      void vt.finished.finally(() => {
        html.classList.remove('theme-vt-wave');
        html.style.removeProperty('--theme-vt-x');
        html.style.removeProperty('--theme-vt-y');
      });
    }
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
