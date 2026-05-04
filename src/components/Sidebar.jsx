import { ChevronLeft } from 'lucide-react';
import { SettingsThemeToggle } from '@/components/ThemeToggle.jsx';
import { MAIN_VIEWS } from '@/navConfig';
import { profileInitials } from '@/lib/userDisplay';

/**
 * @param {object} props
 * @param {{ id: string, email: string, login?: string | null, avatarUrl?: string } | null} [props.currentUser]
 * @param {() => void} [props.onOpenProfileSettings]
 * @param {boolean} props.collapsed
 * @param {() => void} props.onToggleCollapse
 * @param {import('@/lib/galleryPrefsModel').ClientUiPayload} props.clientUi
 * @param {(fn: (prev: import('@/lib/galleryPrefsModel').ClientUiPayload) => import('@/lib/galleryPrefsModel').ClientUiPayload) => void} props.updateClientUi
 */
export function Sidebar({
  activeView,
  onViewChange,
  onOpenProfileSettings,
  collapsed,
  onToggleCollapse,
  currentUser,
  clientUi,
  updateClientUi,
}) {
  return (
    <aside className="sidebar hidden md:flex min-h-0 h-full self-stretch flex-col">
      <div className="sidebar-brand">
        <div className="brand-mark">B56</div>
        <div className="brand-text">
          <span className="brand-name">Base56</span>
          <span className="brand-tag">Умный календарь</span>
        </div>
      </div>

      <button
        type="button"
        className="sidebar-collapse-btn"
        onClick={onToggleCollapse}
        title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
      >
        <ChevronLeft size={14} className="sidebar-collapse-chevron shrink-0" aria-hidden />
        <span className="collapse-text">Свернуть</span>
      </button>

      <nav className="nav">
        {MAIN_VIEWS.map(({ id, label, sidebarLabel, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`nav-item ${activeView === id ? 'active' : ''}`}
            onClick={() => onViewChange(id)}
          >
            <Icon size={16} strokeWidth={1.75} />
            <span className="nav-label">{sidebarLabel ?? label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-theme flex items-center justify-start">
          <SettingsThemeToggle
            clientUi={clientUi}
            updateClientUi={updateClientUi}
            variant="sidebar"
            narrow={collapsed}
            className={
              collapsed
                ? 'h-[30px] w-[30px] min-h-[30px] min-w-[30px] [&_svg]:h-[15px] [&_svg]:w-[15px]'
                : undefined
            }
          />
        </div>
        {currentUser ? (
          <button
            type="button"
            className="sidebar-user"
            onClick={() => onOpenProfileSettings?.()}
            title={
              collapsed
                ? currentUser.email || currentUser.login || 'Профиль'
                : 'Профиль'
            }
          >
            <div className="user-avatar">{profileInitials(currentUser)}</div>
            <div className="user-info">
              <span className="user-name">
                {currentUser.login || currentUser.email?.split('@')[0] || 'Профиль'}
              </span>
              <span className="user-email" title={currentUser.email ?? ''}>
                {currentUser.email}
              </span>
            </div>
          </button>
        ) : null}
      </div>
    </aside>
  );
}
