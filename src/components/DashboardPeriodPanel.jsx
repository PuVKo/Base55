import { addMonths, addYears, format, startOfMonth, startOfYear } from 'date-fns';
import { ru } from 'date-fns/locale';
import { MoreVertical } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { MonthNav } from '@/components/MonthNav';
import { SettingsThemeToggle } from '@/components/ThemeToggle.jsx';
import { YearNav } from '@/components/YearNav';
import { runViewTransition } from '@/viewTransition.js';

const PERIOD_OPTIONS = [
  ['month', 'Месяц'],
  ['year', 'Год'],
  ['all', 'Всё время'],
];

/**
 * @param {'month' | 'year' | 'all'} pid
 * @param {'month' | 'year' | 'all'} dashboardPeriod
 */
export function selectDashboardPeriod(pid, dashboardPeriod, onChangePeriod, setMonthCursor) {
  runViewTransition(() => {
    onChangePeriod(pid);
    if (pid === 'year') setMonthCursor((c) => startOfMonth(startOfYear(c)));
    if (pid === 'month' && dashboardPeriod !== 'month') {
      setMonthCursor(startOfMonth(new Date()));
    }
  });
}

/**
 * Мобилка: «⋯» — период отчёта (и при переданных clientUi/updateClientUi — тема).
 * @param {object} p
 * @param {'month' | 'year' | 'all'} p.dashboardPeriod
 * @param {(next: 'month' | 'year' | 'all') => void} p.onChangePeriod
 * @param {(fn: (c: Date) => Date) => void} p.setMonthCursor
 * @param {{ theme?: 'dark' | 'light' } | undefined} [p.clientUi]
 * @param {((fn: (prev: object) => object) => void) | undefined} [p.updateClientUi]
 */
export function DashboardMobileOverflowMenu({
  dashboardPeriod,
  onChangePeriod,
  setMonthCursor,
  clientUi,
  updateClientUi,
}) {
  const [open, setOpen] = useState(false);
  /** @type {React.RefObject<HTMLButtonElement | null>} */
  const btnRef = useRef(null);
  /** @type {React.RefObject<HTMLDivElement | null>} */
  const panelRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const menuId = useId();
  const themeInMenu = Boolean(clientUi && updateClientUi);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    function position() {
      if (!btnRef.current) return;
      const rect = btnRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      const t = /** @type {Node | null} */ (e.target);
      if (!t) return;
      if (btnRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pickPeriod(/** @type {'month' | 'year' | 'all'} */ pid) {
    selectDashboardPeriod(pid, dashboardPeriod, onChangePeriod, setMonthCursor);
    setOpen(false);
  }

  const menuPanel =
    open &&
    typeof document !== 'undefined' &&
    createPortal(
      <div
        id={menuId}
        ref={panelRef}
        role="menu"
        style={{
          position: 'fixed',
          top: menuPos.top,
          right: menuPos.right,
          zIndex: 400,
        }}
        className="min-w-[11rem] max-h-[min(70vh,28rem)] overflow-y-auto rounded-lg border border-notion-border bg-notion-surface py-1 shadow-lg ring-1 ring-black/5 dark:ring-white/10"
      >
        <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-notion-muted">
          Период отчёта
        </p>
        {PERIOD_OPTIONS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="menuitemradio"
            aria-checked={dashboardPeriod === id}
            className={`flex w-full items-center px-2.5 py-2 text-left text-sm touch-manipulation ${
              dashboardPeriod === id
                ? 'bg-brand/12 font-medium text-brand'
                : 'text-notion-fg hover:bg-notion-hover'
            }`}
            onClick={() => pickPeriod(/** @type {'month' | 'year' | 'all'} */ (id))}
          >
            {label}
          </button>
        ))}
        {themeInMenu && clientUi && updateClientUi ? (
          <>
            <div className="my-1 h-px bg-notion-border/80" role="separator" />
            <div className="px-2.5 pb-2.5 pt-1">
              <p className="pb-2 text-[11px] font-medium uppercase tracking-wide text-notion-muted">
                Тема
              </p>
              <SettingsThemeToggle
                clientUi={clientUi}
                updateClientUi={updateClientUi}
                className="w-full min-w-[10.5rem]"
              />
            </div>
          </>
        ) : null}
      </div>,
      document.body,
    );

  return (
    <div className="relative shrink-0 md:hidden">
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={open ? menuId : undefined}
        className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-notion-border bg-notion-surface text-notion-muted touch-manipulation hover:bg-notion-hover hover:text-notion-fg"
        aria-label={themeInMenu ? 'Период отчёта и тема оформления' : 'Период отчёта'}
        title={themeInMenu ? 'Период и тема' : 'Период отчёта'}
        onClick={() => setOpen((o) => !o)}
      >
        <MoreVertical className="h-5 w-5 shrink-0" aria-hidden strokeWidth={1.75} />
      </button>
      {menuPanel}
    </div>
  );
}

/**
 * @param {object} p
 * @param {'month' | 'year' | 'all'} p.dashboardPeriod
 * @param {(next: 'month' | 'year' | 'all') => void} p.onChangePeriod
 * @param {(fn: (c: Date) => Date) => void} p.setMonthCursor
 * @param {boolean} [p.compact]
 * @param {string} [p.className]
 */
export function DashboardPeriodModeButtons({
  dashboardPeriod,
  onChangePeriod,
  setMonthCursor,
  compact = false,
  className = '',
}) {
  return (
    <div
      className={`flex flex-wrap items-center ${compact ? 'gap-1.5' : 'gap-2'} ${className}`.trim()}
      role="group"
      aria-label="Период отчёта"
    >
      {PERIOD_OPTIONS.map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() =>
            selectDashboardPeriod(
              /** @type {'month' | 'year' | 'all'} */ (id),
              dashboardPeriod,
              onChangePeriod,
              setMonthCursor,
            )
          }
          className={`rounded-lg border transition-colors touch-manipulation ${
            compact ? 'px-2.5 py-1.5 text-xs sm:px-3 sm:py-2 sm:text-sm' : 'px-3 py-2 text-sm'
          } ${
            dashboardPeriod === id
              ? 'bg-brand/18 border-brand/45 text-brand font-medium'
              : 'border-notion-border text-notion-muted hover:bg-notion-hover hover:text-notion-fg'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Шапка дашборда: навигация (месяц / год / «Всё время»), кнопки периода на md+.
 * Меню «⋯» на мобилке рендерится в App рядом с «Новая запись».
 */
export function DashboardPeriodTopRow({
  dashboardPeriod,
  onChangePeriod,
  setMonthCursor,
  monthCursor,
}) {
  return (
    <div className="flex min-w-0 w-full flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:thin]">
      {dashboardPeriod === 'month' ? (
        <MonthNav
          variant="inline"
          monthCursor={monthCursor}
          onPrev={() => setMonthCursor((c) => addMonths(c, -1))}
          onNext={() => setMonthCursor((c) => addMonths(c, 1))}
          onToday={() => setMonthCursor(startOfMonth(new Date()))}
        />
      ) : null}
      {dashboardPeriod === 'year' ? (
        <YearNav
          variant="inline"
          monthCursor={monthCursor}
          onPrev={() => setMonthCursor((c) => addYears(c, -1))}
          onNext={() => setMonthCursor((c) => addYears(c, 1))}
          onToday={() => setMonthCursor(startOfMonth(startOfYear(new Date())))}
        />
      ) : null}
      {dashboardPeriod === 'all' ? (
        <h1 className="month-title mb-0 min-w-0 truncate capitalize shrink-0">Всё время</h1>
      ) : null}
      <DashboardPeriodModeButtons
        compact
        className="hidden shrink-0 md:flex"
        dashboardPeriod={dashboardPeriod}
        onChangePeriod={onChangePeriod}
        setMonthCursor={setMonthCursor}
      />
    </div>
  );
}

/**
 * Месяц / год / подсказка «всё время» под переключателем режима.
 * @param {object} p
 * @param {'month' | 'year' | 'all'} p.dashboardPeriod
 * @param {Date} p.monthCursor
 * @param {(fn: (c: Date) => Date) => void} p.setMonthCursor
 * @param {boolean} [p.compact]
 */
export function DashboardPeriodDetailSection({ dashboardPeriod, monthCursor, setMonthCursor, compact = false }) {
  const labelClass = compact ? 'text-[11px] text-notion-muted mb-1.5' : 'text-xs text-notion-muted mb-2';

  return (
    <>
      {dashboardPeriod === 'month' ? (
        <div className="w-full min-w-0">
          <p className={labelClass}>Месяц</p>
          <MonthNav
            monthCursor={monthCursor}
            onPrev={() => setMonthCursor((c) => addMonths(c, -1))}
            onNext={() => setMonthCursor((c) => addMonths(c, 1))}
            onToday={() => setMonthCursor(startOfMonth(new Date()))}
          />
        </div>
      ) : null}

      {dashboardPeriod === 'year' ? (
        <div className="w-full min-w-0">
          <p className={labelClass}>Календарный год</p>
          <YearNav
            monthCursor={monthCursor}
            onPrev={() => setMonthCursor((c) => addYears(c, -1))}
            onNext={() => setMonthCursor((c) => addYears(c, 1))}
            onToday={() => setMonthCursor(startOfMonth(startOfYear(new Date())))}
          />
          <p className={`text-notion-muted ${compact ? 'text-xs mt-2' : 'text-xs mt-3'}`}>
            Сводка за {format(monthCursor, 'yyyy', { locale: ru })} год (январь — декабрь).
          </p>
        </div>
      ) : null}

      {dashboardPeriod === 'all' ? (
        <p className="text-sm text-notion-muted leading-relaxed">
          Учитываются все записи с датой съёмки. График «Динамика» внизу строится по текущему календарному году.
        </p>
      ) : null}
    </>
  );
}

/**
 * Содержимое панели выбора периода дашборда (блоком: заголовок + кнопки + детали).
 * @param {object} p
 * @param {'month' | 'year' | 'all'} p.dashboardPeriod
 * @param {(next: 'month' | 'year' | 'all') => void} p.onChangePeriod
 * @param {Date} p.monthCursor
 * @param {(fn: (c: Date) => Date) => void} p.setMonthCursor
 */
export function DashboardPeriodPanelContent({ dashboardPeriod, onChangePeriod, monthCursor, setMonthCursor }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] text-notion-muted uppercase tracking-wide mb-2">Период отчёта</p>
        <DashboardPeriodModeButtons
          dashboardPeriod={dashboardPeriod}
          onChangePeriod={onChangePeriod}
          setMonthCursor={setMonthCursor}
        />
      </div>
      <DashboardPeriodDetailSection
        dashboardPeriod={dashboardPeriod}
        monthCursor={monthCursor}
        setMonthCursor={setMonthCursor}
      />
    </div>
  );
}
