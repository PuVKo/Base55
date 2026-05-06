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
  const didMountRef = useRef(false);
  const themeAnimTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const overlayRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  const removeThemeOverlay = useCallback(() => {
    const el = overlayRef.current;
    if (!el) return;
    overlayRef.current = null;
    if (el.parentNode) el.parentNode.removeChild(el);
  }, []);

  const playThemeOverlay = useCallback((nextTheme) => {
    if (typeof document === 'undefined') return;
    removeThemeOverlay();
    const el = document.createElement('div');
    el.className = `theme-switch-overlay ${nextTheme === 'light' ? 'theme-switch-overlay--light' : 'theme-switch-overlay--dark'}`;
    document.body.appendChild(el);
    overlayRef.current = el;
    const root = document.getElementById('root');
    if (typeof el.animate === 'function') {
      const overlayAnim = el.animate(
        [{ opacity: 0 }, { opacity: 1, offset: 0.28 }, { opacity: 0 }],
        { duration: 620, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' },
      );
      overlayAnim.onfinish = () => {
        removeThemeOverlay();
      };
    } else {
      if (themeAnimTimerRef.current) clearTimeout(themeAnimTimerRef.current);
      themeAnimTimerRef.current = setTimeout(() => {
        removeThemeOverlay();
        themeAnimTimerRef.current = null;
      }, 640);
    }
    if (root && typeof root.animate === 'function') {
      root.animate(
        [
          { opacity: 0.985, transform: 'scale(0.996)', filter: 'saturate(0.96)' },
          { opacity: 1, transform: 'scale(1)', filter: 'saturate(1.03)', offset: 0.38 },
          { opacity: 1, transform: 'scale(1)', filter: 'saturate(1)' },
        ],
        { duration: 620, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' },
      );
    }
  }, [removeThemeOverlay]);

  const setTheme = useCallback((t) => {
    const next = t === 'light' ? 'light' : 'dark';
    if (themeRef.current === next) return;
    setThemeState(next);
  }, []);

  useLayoutEffect(() => {
    themeRef.current = theme;
    const shouldAnimate = didMountRef.current;
    if (shouldAnimate) playThemeOverlay(theme);
    applyDomTheme(theme);
    didMountRef.current = true;
  }, [theme, playThemeOverlay]);

  useLayoutEffect(
    () => () => {
      if (themeAnimTimerRef.current) clearTimeout(themeAnimTimerRef.current);
      removeThemeOverlay();
    },
    [removeThemeOverlay],
  );

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** @returns {ThemeContextValue} */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
