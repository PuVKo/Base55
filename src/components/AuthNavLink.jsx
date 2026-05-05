import { flushSync } from 'react-dom';
import { Link, useLocation, useNavigate, useResolvedPath } from 'react-router-dom';
import { runViewTransition } from '@/viewTransition.js';

/**
 * Ссылка между экранами входа/регистрации/сброса: навигация внутри document.startViewTransition
 * (тот же приём, что `runViewTransition` в App.jsx), без анимации фона.
 *
 * @param {import('react-router-dom').LinkProps} props
 */
export function AuthNavLink({ to, replace, onClick, ...rest }) {
  const navigate = useNavigate();
  const location = useLocation();
  const next = useResolvedPath(to);

  return (
    <Link
      to={to}
      replace={replace}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (next.pathname === location.pathname && next.search === location.search) return;
        e.preventDefault();
        runViewTransition(() => {
          flushSync(() => navigate(to, { replace: !!replace }));
        });
      }}
      {...rest}
    />
  );
}
