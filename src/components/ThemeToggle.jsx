import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/theme/ThemeProvider.jsx';

/**
 * @param {{
 *   value: 'dark' | 'light',
 *   onChange: (t: 'dark' | 'light', e?: import('react').MouseEvent) => void,
 *   className?: string,
 * }} props
 */
/**
 * Одна круглая кнопка: показывает текущую тему, по клику переключает на другую.
 */
function ThemeToggleRound({ value, onChange, className }) {
  const next = value === 'dark' ? 'light' : 'dark';
  const Icon = value === 'dark' ? Moon : Sun;
  const label = value === 'dark' ? 'Светлая тема' : 'Тёмная тема';
  return (
    <button
      type="button"
      onClick={(e) => onChange(next, e)}
      aria-label={`Переключить на ${label.toLowerCase()}`}
      title={`Сейчас: ${value === 'dark' ? 'тёмная' : 'светлая'}. Нажмите — ${next === 'dark' ? 'тёмная' : 'светлая'}.`}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-notion-border',
        'bg-notion-surface text-notion-muted transition-colors',
        'hover:bg-notion-hover hover:text-notion-fg',
        className,
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

function ThemeSegmented({ value, onChange, className }) {
  const icon =
    'h-3.5 w-3.5 shrink-0 transition-[color,stroke-width] duration-200 ease-out motion-reduce:transition-none';
  return (
    <div
      role="group"
      aria-label="Тема оформления"
      className={cn(
        'theme-segmented relative isolate inline-flex h-9 w-full min-w-0 items-stretch rounded-full',
        'bg-gradient-to-b from-notion-border/30 to-notion-border/[0.06]',
        'dark:from-white/[0.12] dark:to-white/[0.03]',
        'shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]',
        'dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.55)]',
        'ring-1 ring-inset ring-notion-border/75',
        'p-0.5',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0.5 left-0.5 z-0 rounded-full',
          'w-[calc(50%-2px)]',
          'bg-notion-surface',
          'shadow-[0_1px_2px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.05)]',
          'dark:shadow-[0_1px_3px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.04)]',
          'ring-1 ring-notion-border/50',
          'transition-transform duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
          'motion-reduce:transition-none',
          value === 'dark' && 'translate-x-full',
        )}
      />
      <button
        type="button"
        onClick={(e) => onChange('light', e)}
        aria-pressed={value === 'light'}
        title="Светлая тема"
        className={cn(
          'relative z-10 flex flex-1 items-center justify-center rounded-full outline-none transition-colors',
          'focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-notion-bg',
          value === 'light' ? 'text-brand' : 'text-notion-muted hover:text-notion-fg/85',
        )}
      >
        <Sun className={icon} aria-hidden strokeWidth={value === 'light' ? 2.25 : 1.75} />
      </button>
      <button
        type="button"
        onClick={(e) => onChange('dark', e)}
        aria-pressed={value === 'dark'}
        title="Тёмная тема"
        className={cn(
          'relative z-10 flex flex-1 items-center justify-center rounded-full outline-none transition-colors',
          'focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-notion-bg',
          value === 'dark' ? 'text-brand' : 'text-notion-muted hover:text-notion-fg/85',
        )}
      >
        <Moon className={icon} aria-hidden strokeWidth={value === 'dark' ? 2.25 : 1.75} />
      </button>
    </div>
  );
}

/**
 * Развёрнутый сайдбар: бегунок под активную тему; на неактивной стороне — полная подпись («Светлая тема» / «Тёмная тема»).
 * `narrow`: свёрнутый сайдбар — тот же узел без размонтирования: кроссфейд на круглую кнопку (без рывка при анимации колонки).
 * @param {{ value: 'dark' | 'light', onChange: (t: 'dark' | 'light', e?: import('react').MouseEvent) => void, className?: string, narrow?: boolean }} props
 */
function ThemeSidebarToggle({ value, onChange, className, narrow = false }) {
  const labelInactive =
    'text-center text-[11px] font-medium leading-tight tracking-tight px-0.5 max-w-full';
  const labelActive = 'truncate text-[11px] font-semibold leading-none tracking-tight';
  const iconActive = 'h-3.5 w-3.5 shrink-0';
  const stack =
    'relative grid h-full min-h-0 w-full min-w-0 place-items-center [grid-template-areas:"stack"]';
  const layer = 'col-start-1 row-start-1 flex max-w-full items-center justify-center [grid-area:stack]';

  const pill = (
    <div
      role="group"
      aria-label="Тема оформления"
      data-theme={value}
      className={cn(
        'theme-sidebar-toggle relative isolate h-9 w-full min-w-0 overflow-hidden rounded-full',
        'bg-gradient-to-b from-notion-border/25 to-notion-border/[0.05]',
        'dark:from-white/[0.1] dark:to-white/[0.02]',
        'shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]',
        'dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]',
        'ring-1 ring-inset ring-notion-border/70',
        'p-0.5',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'theme-sidebar-toggle-thumb pointer-events-none absolute inset-y-0.5 left-0.5 z-0 rounded-full',
          'w-[calc(50%-2px)] bg-notion-surface',
          'shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.05)]',
          'dark:shadow-[0_2px_12px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06)]',
          'ring-1 ring-notion-border/50',
          'will-change-transform',
          'transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          'motion-reduce:transition-none',
          value === 'dark' && 'translate-x-full',
        )}
      />
      <div className="relative z-10 grid h-full w-full min-h-0 grid-cols-2">
        <button
          type="button"
          onClick={(e) => onChange('light', e)}
          aria-pressed={value === 'light'}
          title="Светлая тема"
          className={cn(
            'flex min-h-0 min-w-0 items-stretch justify-stretch px-1.5 outline-none',
            'rounded-l-[calc(9999px-2px)] rounded-r-none',
            'transition-[color,background-color] duration-200 ease-out motion-reduce:transition-none',
            'focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-notion-bg',
            value === 'light'
              ? 'text-brand'
              : 'text-notion-muted hover:bg-notion-hover/50 hover:text-notion-fg',
          )}
        >
          <span className={stack}>
            <span
              className={cn(
                layer,
                'gap-1 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] motion-reduce:transition-none',
                value === 'light'
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-0.5 opacity-0',
              )}
            >
              <Sun className={iconActive} strokeWidth={2.25} aria-hidden />
              <span className={labelActive}>Светлая</span>
            </span>
            <span
              className={cn(
                layer,
                'transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] motion-reduce:transition-none',
                value !== 'light'
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none -translate-y-0.5 opacity-0',
              )}
            >
              <span className={labelInactive}>Светлая тема</span>
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={(e) => onChange('dark', e)}
          aria-pressed={value === 'dark'}
          title="Тёмная тема"
          className={cn(
            'flex min-h-0 min-w-0 items-stretch justify-stretch px-1.5 outline-none',
            'rounded-l-none rounded-r-[calc(9999px-2px)]',
            'transition-[color,background-color] duration-200 ease-out motion-reduce:transition-none',
            'focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-notion-bg',
            value === 'dark'
              ? 'text-brand'
              : 'text-notion-muted hover:bg-notion-hover/50 hover:text-notion-fg',
          )}
        >
          <span className={stack}>
            <span
              className={cn(
                layer,
                'gap-1 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] motion-reduce:transition-none',
                value === 'dark'
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-0.5 opacity-0',
              )}
            >
              <Moon className={iconActive} strokeWidth={2.25} aria-hidden />
              <span className={labelActive}>Тёмная</span>
            </span>
            <span
              className={cn(
                layer,
                'transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] motion-reduce:transition-none',
                value !== 'dark'
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none -translate-y-0.5 opacity-0',
              )}
            >
              <span className={labelInactive}>Тёмная тема</span>
            </span>
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        'theme-sidebar-toggle-root relative isolate min-w-0',
        narrow ? 'flex h-9 min-h-9 w-full items-center justify-center' : 'w-full',
      )}
    >
      <div
        className={cn(
          'min-w-0 transition-opacity duration-200 ease-out motion-reduce:transition-none',
          narrow
            ? 'pointer-events-none absolute inset-0 opacity-0'
            : 'relative w-full opacity-100',
        )}
        aria-hidden={narrow ? true : undefined}
      >
        {pill}
      </div>
      <div
        className={cn(
          'flex items-center justify-center transition-opacity duration-200 ease-out motion-reduce:transition-none',
          narrow
            ? 'relative opacity-100'
            : 'pointer-events-none absolute inset-0 opacity-0',
        )}
        aria-hidden={narrow ? undefined : true}
      >
        <ThemeToggleRound value={value} onChange={onChange} className={className} />
      </div>
    </div>
  );
}

/**
 * @param {{
 *   clientUi: { theme: 'dark' | 'light' },
 *   updateClientUi: (fn: (prev: object) => object) => void,
 *   className?: string,
 *   variant?: 'segmented' | 'toggle' | 'sidebar',
 *   narrow?: boolean,
 * }} props
 */
export function SettingsThemeToggle({
  clientUi,
  updateClientUi,
  className,
  variant = 'segmented',
  narrow = false,
}) {
  const { setTheme } = useTheme();
  const apply = (/** @type {'dark' | 'light'} */ t) => {
    updateClientUi((prev) => ({ ...prev, theme: t }));
    setTheme(t);
  };
  if (variant === 'toggle') {
    return <ThemeToggleRound value={clientUi.theme} onChange={apply} className={className} />;
  }
  if (variant === 'sidebar') {
    return (
      <ThemeSidebarToggle value={clientUi.theme} onChange={apply} className={className} narrow={narrow} />
    );
  }
  return <ThemeSegmented value={clientUi.theme} onChange={apply} className={className} />;
}
