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
const THEME_OPTIONS = [
  { id: 'light', label: 'Светлая', fullLabel: 'Светлая тема', Icon: Sun },
  { id: 'dark', label: 'Тёмная', fullLabel: 'Тёмная тема', Icon: Moon },
];

/** Кнопка для свёрнутого сайдбара */
function ThemeToggleRound({ value, onChange, className }) {
  const next = value === 'dark' ? 'light' : 'dark';
  const nextOption = THEME_OPTIONS.find((x) => x.id === next) ?? THEME_OPTIONS[0];
  return (
    <button
      type="button"
      onClick={(e) => onChange(next, e)}
      aria-label={`Переключить на ${nextOption.fullLabel.toLowerCase()}`}
      title={`Переключить на ${nextOption.fullLabel.toLowerCase()}.`}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-notion-border/80',
        'bg-gradient-to-b from-notion-surface to-notion-hover/45 text-notion-muted',
        'shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_3px_12px_rgba(0,0,0,0.16)]',
        'transition-colors hover:text-notion-fg',
        className,
      )}
    >
      <nextOption.Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}

function ThemeSegmented({ value, onChange, className, compactText = false }) {
  const activeIndex = value === 'dark' ? 1 : 0;
  return (
    <div
      role="group"
      aria-label="Тема оформления"
      className={cn(
        'theme-segmented relative isolate inline-flex h-9 w-full min-w-0 items-stretch rounded-full p-0.5',
        'border border-notion-border/80',
        'bg-gradient-to-b from-notion-surface to-notion-hover/35',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_16px_rgba(0,0,0,0.12)]',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0.5 left-0.5 z-0 w-[calc(50%-2px)] rounded-full',
          'bg-[color:var(--accent-soft)] ring-1 ring-[color:var(--accent-soft-strong)]',
          'shadow-[0_2px_12px_rgba(0,0,0,0.18)]',
          'transition-transform duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
          'motion-reduce:transition-none',
          activeIndex === 1 && 'translate-x-full',
        )}
      />
      {THEME_OPTIONS.map((opt) => {
        const selected = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={(e) => onChange(/** @type {'dark' | 'light'} */ (opt.id), e)}
            aria-pressed={selected}
            title={opt.fullLabel}
            className={cn(
              'relative z-10 flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 outline-none transition-colors',
              'focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-notion-bg',
              selected ? 'text-[color:var(--accent)]' : 'text-notion-muted hover:text-notion-fg/90',
            )}
          >
            <opt.Icon className="h-3.5 w-3.5 shrink-0" aria-hidden strokeWidth={selected ? 2.2 : 1.9} />
            <span className={cn('truncate text-[11px] font-medium leading-none', compactText ? 'sm:hidden' : '')}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Развёрнутый сайдбар: бегунок под активную тему; на неактивной стороне — полная подпись («Светлая тема» / «Тёмная тема»).
 * `narrow`: свёрнутый сайдбар — тот же узел без размонтирования: кроссфейд на круглую кнопку (без рывка при анимации колонки).
 * @param {{ value: 'dark' | 'light', onChange: (t: 'dark' | 'light', e?: import('react').MouseEvent) => void, className?: string, narrow?: boolean }} props
 */
function ThemeSidebarToggle({ value, onChange, className, narrow = false }) {
  const desktopToggle = (
    <ThemeSegmented value={value} onChange={onChange} className={cn('theme-sidebar-toggle w-full', className)} />
  );
  const compactToggle = <ThemeToggleRound value={value} onChange={onChange} className={className} />;
  return (
    <div
      className={cn(
        'theme-sidebar-toggle-root relative isolate min-w-0 flex h-9 min-h-9 w-full items-center',
        narrow ? 'justify-center' : 'justify-start',
      )}
    >
      {narrow ? compactToggle : desktopToggle}
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
  return <ThemeSegmented value={clientUi.theme} onChange={apply} className={className} compactText />;
}
