import { Outlet } from 'react-router-dom';

/**
 * Статичный фон .login-shell; анимируется только слой .view-transition-auth-panel (как main-content в приложении).
 */
export function AuthPageTransitionLayout() {
  return (
    <div className="login-shell px-4">
      <div className="view-transition-auth-panel w-full max-w-[400px]">
        <Outlet />
      </div>
    </div>
  );
}
