import { useLayoutEffect } from 'react';
import { useTheme } from '@/theme/ThemeProvider.jsx';

/** Страницы входа/регистрации — всегда тёмная тема (переключателя нет). */
export function useAuthPagesDarkTheme() {
  const { setTheme } = useTheme();
  useLayoutEffect(() => {
    setTheme('dark');
  }, [setTheme]);
}
