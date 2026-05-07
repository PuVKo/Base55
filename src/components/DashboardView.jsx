import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addMonths,
  endOfMonth,
  endOfYear,
  format,
  getMonth,
  getYear,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArrowRight, Check, MessageSquare, Settings2, TrendingDown, TrendingUp } from 'lucide-react';
import { formatClientDisplay } from '@/lib/clientField';
import { getFieldOptionItems, pillDisplayForField } from '@/lib/fieldOptions';
import { notionColorFillHex, notionPillClasses, normalizeNotionColor } from '@/lib/notionColors';
import {
  countBySource,
  sumAmount,
  sumBySource,
} from '@/lib/dashboardStats';
import { filterByCalendarYear, filterByMonth } from '@/lib/bookingUtils';
import { BookingSourceChip, BookingStatusChip, BookingTagChips } from '@/components/MockupChips.jsx';
import { formatDateDdMmYyyy, formatOrderCountRu, formatRub } from '@/lib/format';

/** Короткая сумма над столбцом */
function barTopLabel(sum) {
  if (sum <= 0) return '—';
  if (sum >= 1000) return `${Math.round(sum / 1000)}k`;
  return formatRub(sum);
}

/**
 * Сектор кольца (donut).
 * @param {object} p
 * @param {number} p.cx
 * @param {number} p.cy
 * @param {number} p.r0 outer
 * @param {number} p.r1 inner
 * @param {number} p.startAngle rad
 * @param {number} p.endAngle rad
 */
function donutSegmentPath({ cx, cy, r0, r1, startAngle, endAngle }) {
  const x1 = cx + r0 * Math.cos(startAngle);
  const y1 = cy + r0 * Math.sin(startAngle);
  const x2 = cx + r0 * Math.cos(endAngle);
  const y2 = cy + r0 * Math.sin(endAngle);
  const x3 = cx + r1 * Math.cos(endAngle);
  const y3 = cy + r1 * Math.sin(endAngle);
  const x4 = cx + r1 * Math.cos(startAngle);
  const y4 = cy + r1 * Math.sin(startAngle);
  const sweep = endAngle - startAngle;
  const largeArc = sweep > Math.PI ? 1 : 0;
  return [
    `M ${x1} ${y1}`,
    `A ${r0} ${r0} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${r1} ${r1} 0 ${largeArc} 0 ${x4} ${y4}`,
    'Z',
  ].join(' ');
}

function sourceCountWordRu(n) {
  const c = Math.abs(Math.trunc(Number(n) || 0));
  const m100 = c % 100;
  const m10 = c % 10;
  if (m100 >= 11 && m100 <= 14) return 'источников';
  if (m10 === 1) return 'источник';
  if (m10 >= 2 && m10 <= 4) return 'источника';
  return 'источников';
}

function commentsCountWordRu(n) {
  const c = Math.abs(Math.trunc(Number(n) || 0));
  const m100 = c % 100;
  if (m100 >= 11 && m100 <= 14) return 'комментариев';
  const m10 = c % 10;
  if (m10 === 1) return 'комментарий';
  if (m10 >= 2 && m10 <= 4) return 'комментария';
  return 'комментариев';
}

function statusWordRu(n) {
  const c = Math.abs(Math.trunc(Number(n) || 0));
  const m100 = c % 100;
  if (m100 >= 11 && m100 <= 14) return 'статусов';
  const m10 = c % 10;
  if (m10 === 1) return 'статус';
  if (m10 >= 2 && m10 <= 4) return 'статуса';
  return 'статусов';
}

/** Доля по источникам: кольцо, в центре лидер, подсказка при наведении, компактная легенда. */
function SourceRevenueDonut({ sources, segments, total, metric = 'sum' }) {
  const chartWrapRef = useRef(null);
  const [sliceTip, setSliceTip] = useState(null);
  const bestSeg = useMemo(() => {
    if (!segments.length) return null;
    return segments.reduce((a, b) => (b.sum > a.sum ? b : a));
  }, [segments]);

  const cx = 50;
  const cy = 50;
  /** Меньше внешний радиус + шире отверстие — тонкое цветное кольцо, больше места под хаб */
  const r0 = 39;
  const r1 = 32;
  const rMid = (r0 + r1) / 2;
  const strokeRing = r0 - r1;
  const gapRad = 0.056;
  const startBase = -Math.PI / 2;
  const n = segments.length;
  const gapBetween = n > 1 ? gapRad : 0;
  const available = 2 * Math.PI - n * gapBetween;

  const bestRow = bestSeg ? sources.find((s) => s.id === bestSeg.id) : null;
  const bestLabel = bestRow?.label ?? bestSeg?.id ?? '';
  const totalLabel = metric === 'sum' ? formatRub(total) : formatOrderCountRu(total);

  let angle = startBase;
  const slices = segments.map((seg) => {
    const row = sources.find((s) => s.id === seg.id);
    const label = row?.label ?? seg.id;
    const fill = row?.fillHex ?? notionColorFillHex('gray');
    const baseValue = metric === 'sum' ? seg.sum : seg.count;
    const frac = total > 0 ? baseValue / total : 0;
    const sweep = frac * available;
    const startA = angle;
    const endA = angle + sweep;
    angle = endA + gapBetween;
    const d =
      sweep > 0.0001 && frac > 0
        ? donutSegmentPath({ cx, cy, r0, r1, startAngle: startA, endAngle: endA })
        : '';
    return { id: seg.id, d, fill, seg, label };
  });

  const hasSlice = slices.some((s) => s.d);
  const singleFull = segments.length === 1 && total > 0;
  const singleStroke =
    sources.find((s) => s.id === segments[0]?.id)?.fillHex ?? notionColorFillHex('gray');

  const ariaLabel =
    total > 0
      ? `Доля по источникам. Всего ${totalLabel}. ${segments
          .map((seg) => {
            const src = sources.find((s) => s.id === seg.id);
            return metric === 'sum'
              ? `${src?.label ?? seg.id}: ${seg.pct.toFixed(1)}%, ${formatRub(seg.sum)}, ${formatOrderCountRu(seg.count)}`
              : `${src?.label ?? seg.id}: ${seg.pct.toFixed(1)}%, ${formatOrderCountRu(seg.count)}`;
          })
          .join('. ')}`
      : 'Доля по источникам — нет данных';

  const setTipFromEvent = (e, sl) => {
    const root = chartWrapRef.current;
    if (!root) return;
    const r = root.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const pad = 8;
    const tx = Math.min(Math.max(x, pad), r.width - pad);
    const ty = Math.min(Math.max(y, pad), r.height - pad);
    setSliceTip({
      id: sl.id,
      label: sl.label,
      pct: sl.seg.pct,
      sum: sl.seg.sum,
      count: sl.seg.count,
      x: tx,
      y: ty,
    });
  };

  return (
    <div className="flex w-full flex-col items-stretch gap-4" role="img" aria-label={ariaLabel}>
      <div
        ref={chartWrapRef}
        className="donut-wrap relative mx-auto aspect-square w-full max-w-[min(100%,15rem)] sm:max-w-[min(100%,16.5rem)] max-h-[220px]"
      >
        <div className="relative size-full min-h-0">
          <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
            <title>Выручка по источникам</title>
            {n === 0 || (!singleFull && !hasSlice) ? (
              <circle
                cx={cx}
                cy={cy}
                r={rMid}
                fill="none"
                stroke="currentColor"
                className="text-notion-border"
                strokeOpacity={0.45}
                strokeWidth={strokeRing + 0.75}
                vectorEffect="non-scaling-stroke"
              />
            ) : (
              <>
                <circle
                  cx={cx}
                  cy={cy}
                  r={rMid}
                  fill="none"
                  stroke="currentColor"
                  className="text-notion-border"
                  strokeOpacity={0.2}
                  strokeWidth={strokeRing + 1.25}
                  vectorEffect="non-scaling-stroke"
                />
                {singleFull ? (
                  <g>
                    <title>
                      {metric === 'sum'
                        ? `${sources.find((s) => s.id === segments[0].id)?.label ?? segments[0].id}: 100% · ${formatRub(segments[0].sum)} · ${formatOrderCountRu(segments[0].count)}`
                        : `${sources.find((s) => s.id === segments[0].id)?.label ?? segments[0].id}: 100% · ${formatOrderCountRu(segments[0].count)}`}
                    </title>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={rMid}
                      fill="none"
                      stroke={singleStroke}
                      strokeWidth={strokeRing}
                      strokeLinecap="round"
                      className="cursor-default transition-opacity hover:opacity-90"
                      onPointerEnter={(e) =>
                        setTipFromEvent(e, {
                          id: segments[0].id,
                          label: sources.find((s) => s.id === segments[0].id)?.label ?? segments[0].id,
                          seg: segments[0],
                        })
                      }
                      onPointerMove={(e) =>
                        setTipFromEvent(e, {
                          id: segments[0].id,
                          label: sources.find((s) => s.id === segments[0].id)?.label ?? segments[0].id,
                          seg: segments[0],
                        })
                      }
                      onPointerLeave={() => setSliceTip(null)}
                    />
                  </g>
                ) : (
                  slices.map((sl) =>
                    sl.d ? (
                      <path
                        key={sl.id}
                        d={sl.d}
                        fill={sl.fill}
                        stroke="rgb(var(--notion-bg))"
                        strokeOpacity={0.92}
                        strokeWidth={1.05}
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                        className="cursor-pointer transition-[opacity,filter] hover:opacity-95 hover:brightness-110"
                        onPointerEnter={(e) => setTipFromEvent(e, sl)}
                        onPointerMove={(e) => setTipFromEvent(e, sl)}
                        onPointerLeave={() => setSliceTip(null)}
                      >
                        <title>
                          {metric === 'sum'
                            ? `${sl.label}: ${sl.seg.pct.toFixed(1)}% · ${formatRub(sl.seg.sum)} · ${formatOrderCountRu(sl.seg.count)}`
                            : `${sl.label}: ${sl.seg.pct.toFixed(1)}% · ${formatOrderCountRu(sl.seg.count)}`}
                        </title>
                      </path>
                    ) : null,
                  )
                )}
              </>
            )}
          </svg>

          {n > 0 && (singleFull || hasSlice) && bestSeg ? (
            <div className="donut-center pointer-events-none z-[1]">
              <div className="donut-eyebrow">Лучший</div>
              <div className="donut-name line-clamp-2 max-w-[96%] mx-auto">
                {singleFull ? sources.find((s) => s.id === segments[0].id)?.label ?? segments[0].id : bestLabel}
              </div>
              <div className="donut-share">{singleFull ? '100%' : `${bestSeg.pct.toFixed(1)}%`}</div>
              <div className="donut-amount tabular-nums">
                {metric === 'sum'
                  ? formatRub(singleFull ? segments[0].sum : bestSeg.sum)
                  : formatOrderCountRu(singleFull ? segments[0].count : bestSeg.count)}
              </div>
            </div>
          ) : null}

          {sliceTip ? (
            <div
              className="pointer-events-none absolute z-[2] w-56 rounded-xl border border-notion-border bg-notion-surface px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.55)] ring-1 ring-black/60"
              style={{
                left: sliceTip.x,
                top: sliceTip.y,
                transform: 'translate(-50%, calc(-100% - 12px))',
              }}
            >
              <p className="line-clamp-3 text-sm font-semibold leading-tight text-notion-fg break-words">
                {sliceTip.label}
              </p>
              <p className="mt-1 text-xs leading-tight tabular-nums text-notion-muted">
                <span className="font-semibold text-notion-fg">{sliceTip.pct.toFixed(1)}%</span>
                <span className="text-notion-muted/55"> · </span>
                {metric === 'sum' ? formatRub(sliceTip.sum) : formatOrderCountRu(sliceTip.count)}
                {metric === 'sum' ? (
                  <>
                    <span className="text-notion-muted/55"> · </span>
                    {formatOrderCountRu(sliceTip.count)}
                  </>
                ) : null}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <ul className="src-legend min-w-0 w-full">
        {segments.map((seg) => {
          const src = sources.find((s) => s.id === seg.id);
          const fill = src?.fillHex ?? notionColorFillHex('gray');
          return (
            <li key={seg.id} className="src-legend-item">
              <span className="dot shrink-0" style={{ backgroundColor: fill }} aria-hidden />
              <div className="src-legend-info min-w-0">
                <div className="src-legend-name">{src?.label ?? seg.id}</div>
                <div className="src-legend-meta tabular-nums">
                  {metric === 'sum'
                    ? `${formatRub(seg.sum)} · ${formatOrderCountRu(seg.count)}`
                    : formatOrderCountRu(seg.count)}
                </div>
              </div>
              <span className="src-legend-share tabular-nums">{seg.pct.toFixed(1)}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function KpiCard({ title, value, hint }) {
  return (
    <div className="kpi-card card">
      <div className="kpi-eyebrow">{title}</div>
      <div className="kpi-value">{value}</div>
      {hint ? <div className="kpi-sub">{hint}</div> : null}
    </div>
  );
}

/**
 * @param {object} props
 * @param {ReturnType<import('@/lib/bookingUtils').normalizeBooking>[]} props.bookings
 * @param {Date} props.monthCursor
 * @param {any[] | undefined} props.fields
 * @param {(id: string) => void} props.onOpenBooking
 * @param {'month' | 'year' | 'all'} [props.dashboardPeriod]
 * @param {import('@/lib/galleryPrefsModel').ClientUiPayload} props.clientUi
 * @param {(next: import('@/lib/galleryPrefsModel').ClientUiPayload | ((prev: import('@/lib/galleryPrefsModel').ClientUiPayload) => import('@/lib/galleryPrefsModel').ClientUiPayload)) => void} props.updateClientUi
 */
export function DashboardView({
  bookings,
  monthCursor,
  fields,
  onOpenBooking,
  dashboardPeriod = 'month',
  clientUi,
  updateClientUi,
}) {
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [upcomingPickerOpen, setUpcomingPickerOpen] = useState(false);
  const [upcomingKpiPickerOpen, setUpcomingKpiPickerOpen] = useState(false);
  const statusPickerRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const upcomingPickerRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const upcomingKpiPickerRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const statusField = useMemo(
    () => fields?.find((f) => f.key === 'status' || f.type === 'status'),
    [fields],
  );
  const statusOptions = useMemo(
    () => (statusField ? getFieldOptionItems(statusField) : []),
    [statusField],
  );
  const fallbackStatusId = statusOptions[0]?.id || 'processing';
  const focusedStatusIdRaw = typeof clientUi?.dashboardStatusFocusId === 'string' ? clientUi.dashboardStatusFocusId : '';
  const focusedStatusId = focusedStatusIdRaw || fallbackStatusId;
  const focusedStatusPill = pillDisplayForField(fields, 'status', focusedStatusId);
  const defaultUpcomingStatusIds = useMemo(() => {
    if (!statusOptions.length) return ['booked'];
    const ids = new Set(['booked']);
    for (const it of statusOptions) {
      const l = String(it.label || '')
        .trim()
        .toLowerCase();
      if (l === 'записан' || l === 'переговоры') ids.add(it.id);
    }
    return [...ids].filter((id) => statusOptions.some((it) => it.id === id));
  }, [statusOptions]);
  const allStatusIds = useMemo(() => statusOptions.map((it) => it.id), [statusOptions]);
  const upcomingKpiRaw = Array.isArray(clientUi?.dashboardUpcomingKpiStatusIds)
    ? clientUi.dashboardUpcomingKpiStatusIds
    : [];
  const upcomingKpiSelected = useMemo(() => {
    const valid = upcomingKpiRaw.filter((id) => allStatusIds.includes(id));
    return valid.length > 0 ? valid : defaultUpcomingStatusIds;
  }, [upcomingKpiRaw, allStatusIds, defaultUpcomingStatusIds]);
  const upcomingKpiStatusSummary = useMemo(() => {
    if (!statusOptions.length) return 'по выбранным статусам';
    if (upcomingKpiSelected.length >= statusOptions.length) return 'все статусы';
    const labels = statusOptions
      .filter((it) => upcomingKpiSelected.includes(it.id))
      .map((it) => it.label);
    if (labels.length <= 2) return labels.join(' и ');
    return `${labels.length} ${statusWordRu(labels.length)}`;
  }, [statusOptions, upcomingKpiSelected]);
  const showUpcomingDateMeta = clientUi?.dashboardUpcomingVisible?.dateMeta !== false;
  const upcomingFieldVisible = clientUi?.dashboardUpcomingFieldVisible || {};
  const upcomingFields = useMemo(
    () => [...(fields || [])].filter((f) => f.visible !== false).sort((a, b) => a.sortOrder - b.sortOrder),
    [fields],
  );
  const upcomingFieldsForSettings = useMemo(
    () => upcomingFields.filter((f) => f.key !== 'date'),
    [upcomingFields],
  );
  const upcomingAmountField = useMemo(
    () =>
      upcomingFields.find(
        (f) =>
          f.key === 'amount' ||
          (f.type === 'number' && /сумм/i.test(String(f.label || ''))),
      ) || null,
    [upcomingFields],
  );
  const globalAmountFieldVisible = Boolean(upcomingAmountField);
  const showUpcomingAmount = upcomingAmountField
    ? isUpcomingFieldShown(upcomingAmountField.id)
    : false;

  function isUpcomingFieldShown(fieldId) {
    return upcomingFieldVisible[fieldId] !== false;
  }

  /**
   * Короткий текст для блока "Ближайшие записи" по текущему полю.
   * @param {any} field
   * @param {any} booking
   */
  function formatUpcomingFieldText(field, booking) {
    const raw = booking[field.key];
    if (raw == null || raw === '') return null;
    if (field.type === 'client') {
      const client = formatClientDisplay(raw);
      return client || null;
    }
    if (field.type === 'comments') {
      const list = Array.isArray(raw) ? raw : [];
      if (!list.length) return null;
      return `${list.length} ${commentsCountWordRu(list.length)}`;
    }
    if (field.key === 'timeRange' || field.type === 'time') {
      const t = String(raw).trim();
      return t ? t : null;
    }
    if (field.key === 'status' || field.type === 'status' || field.key === 'sourceId' || field.type === 'source') {
      const items = getFieldOptionItems(field);
      const id = String(raw);
      const hit = items.find((x) => x.id === id);
      return hit?.label ?? id;
    }
    if (field.type === 'multiselect' || field.type === 'tags') {
      if (!Array.isArray(raw)) return null;
      const items = getFieldOptionItems(field);
      const labels = raw
        .map((id) => {
          const sid = String(id);
          const hit = items.find((x) => x.id === sid);
          return hit?.label ?? sid;
        })
        .filter(Boolean);
      return labels.length ? labels.join(', ') : null;
    }
    if (field.type === 'checkbox') return raw ? 'Да' : 'Нет';
    if (field.key === 'amount' || (field.type === 'number' && Number.isFinite(Number(raw)))) {
      return formatRub(Number(raw) || 0);
    }
    if (typeof raw === 'object') return null;
    const text = String(raw).trim();
    return text || null;
  }

  useEffect(() => {
    if (!statusPickerOpen) return;
    function onDoc(e) {
      if (statusPickerRef.current && !statusPickerRef.current.contains(/** @type {Node} */ (e.target))) {
        setStatusPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [statusPickerOpen]);

  useEffect(() => {
    if (!upcomingPickerOpen) return;
    function onDoc(e) {
      if (upcomingPickerRef.current && !upcomingPickerRef.current.contains(/** @type {Node} */ (e.target))) {
        setUpcomingPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [upcomingPickerOpen]);

  useEffect(() => {
    if (!upcomingKpiPickerOpen) return;
    function onDoc(e) {
      if (upcomingKpiPickerRef.current && !upcomingKpiPickerRef.current.contains(/** @type {Node} */ (e.target))) {
        setUpcomingKpiPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [upcomingKpiPickerOpen]);

  const stats = useMemo(() => {
    const calendarYear = getYear(monthCursor);
    const chartYear = dashboardPeriod === 'all' ? getYear(new Date()) : calendarYear;

    let reportList;
    if (dashboardPeriod === 'month') {
      reportList = filterByMonth(bookings, monthCursor);
    } else if (dashboardPeriod === 'year') {
      reportList = filterByCalendarYear(bookings, calendarYear);
    } else {
      reportList = bookings.filter((b) => {
        const raw = typeof b?.date === 'string' ? b.date.trim() : '';
        if (!raw) return false;
        const d = parseISO(raw);
        return isValid(d);
      });
    }

    const reportSum = sumAmount(reportList);
    const avgCheck = reportList.length ? reportSum / reportList.length : 0;

    let prevSum = 0;
    let delta = 0;
    /** @type {boolean} */
    let showCompare = false;
    /** @type {string} */
    let comparePrefix = '';

    if (dashboardPeriod === 'month') {
      const prevMonth = addMonths(monthCursor, -1);
      const prevList = filterByMonth(bookings, prevMonth);
      prevSum = sumAmount(prevList);
      delta = prevSum > 0 ? ((reportSum - prevSum) / prevSum) * 100 : reportSum > 0 ? 100 : 0;
      showCompare = true;
      comparePrefix = 'к прошлому месяцу';
    } else if (dashboardPeriod === 'year') {
      const prevList = filterByCalendarYear(bookings, calendarYear - 1);
      prevSum = sumAmount(prevList);
      delta = prevSum > 0 ? ((reportSum - prevSum) / prevSum) * 100 : reportSum > 0 ? 100 : 0;
      showCompare = true;
      comparePrefix = 'к прошлому году';
    }

    /** Карточка «Проекты по статусу» — без фильтра по периоду отчёта */
    const processingBookings = bookings
      .filter((b) => b.status === focusedStatusId)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    const sourceCounts = countBySource(reportList);
    const sourceSums = sumBySource(reportList);
    const today = startOfDay(new Date());
    const allowedStatusSet = new Set(upcomingKpiSelected);
    let upcomingStart = today;
    let upcomingEnd = endOfYear(new Date());
    let upcomingKpiHint = 'За текущий год';
    let upcomingListHint =
      `Лента ближайших записей до конца ${format(new Date(), 'yyyy')} года. Набор отображаемых полей настраивается через кнопку справа.`;
    if (dashboardPeriod === 'month') {
      const periodStart = startOfMonth(monthCursor);
      const periodEnd = endOfMonth(monthCursor);
      upcomingStart = periodStart > today ? periodStart : today;
      upcomingEnd = periodEnd;
      upcomingKpiHint = 'За текущий месяц';
      upcomingListHint =
        `Лента ближайших записей за ${format(monthCursor, 'LLLL yyyy', { locale: ru })}. Набор отображаемых полей настраивается через кнопку справа.`;
    } else if (dashboardPeriod === 'year') {
      const periodStart = startOfYear(monthCursor);
      const periodEnd = endOfYear(monthCursor);
      upcomingStart = periodStart > today ? periodStart : today;
      upcomingEnd = periodEnd;
      upcomingKpiHint = 'За текущий год';
      upcomingListHint =
        `Лента ближайших записей за ${format(monthCursor, 'yyyy', { locale: ru })} год. Набор отображаемых полей настраивается через кнопку справа.`;
    } else if (dashboardPeriod === 'all') {
      upcomingStart = today;
      upcomingEnd = new Date('9999-12-31T00:00:00');
      upcomingKpiHint = 'За всё время';
      upcomingListHint =
        'Лента ближайших записей начиная с сегодня. Набор отображаемых полей настраивается через кнопку справа.';
    }
    const upcoming = bookings
      .filter((b) => {
        const d = parseISO(b.date);
        if (!isValid(d) || d < upcomingStart || d > upcomingEnd) return false;
        return allowedStatusSet.has(b.status);
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const yearListForChart = filterByCalendarYear(bookings, chartYear);
    const yearListCalendar = filterByCalendarYear(bookings, calendarYear);
    const yearSumCalendar = sumAmount(yearListCalendar);

    const datedBookings = bookings.filter((b) => {
      const raw = typeof b?.date === 'string' ? b.date.trim() : '';
      if (!raw) return false;
      return isValid(parseISO(raw));
    });
    const allTimeSum = sumAmount(datedBookings);
    const nowY = getYear(new Date());
    const currentYearList = filterByCalendarYear(bookings, nowY);
    const currentYearSum = sumAmount(currentYearList);

    // Календарный год для графика: Янв → Дек
    const yearMo = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(chartYear, i, 1);
      return { month, sum: 0, count: 0 };
    });
    for (const b of yearListForChart) {
      if (!b?.date) continue;
      const m = parseISO(b.date).getMonth();
      if (m < 0 || m > 11) continue;
      yearMo[m].sum += Number(b.amount) || 0;
      yearMo[m].count += 1;
    }
    const yearTotal = yearMo.reduce((acc, x) => acc + x.sum, 0);
    const yearMax = Math.max(...yearMo.map((x) => x.sum), 0);
    const maxBar = Math.max(yearMax, 1);

    const sourceIdKeys = Object.keys(sourceSums).filter((id) => (sourceSums[id] || 0) > 0);
    const totalSourceRev = sourceIdKeys.reduce((acc, id) => acc + (sourceSums[id] || 0), 0);
    const sourcePieSegments = sourceIdKeys
      .map((id) => {
        const sum = sourceSums[id] || 0;
        const count = sourceCounts[id] || 0;
        return {
          id,
          sum,
          count,
          pct: totalSourceRev > 0 ? (sum / totalSourceRev) * 100 : 0,
        };
      })
      .sort((a, b) => b.sum - a.sum);
    const sourceCountKeys = Object.keys(sourceCounts).filter((id) => (sourceCounts[id] || 0) > 0);
    const totalSourceCount = sourceCountKeys.reduce((acc, id) => acc + (sourceCounts[id] || 0), 0);
    const sourceCountSegments = sourceCountKeys
      .map((id) => {
        const count = sourceCounts[id] || 0;
        const sum = sourceSums[id] || 0;
        return {
          id,
          sum,
          count,
          pct: totalSourceCount > 0 ? (count / totalSourceCount) * 100 : 0,
        };
      })
      .sort((a, b) => b.count - a.count);

    const sourceField = fields?.find((f) => f.key === 'sourceId' || f.type === 'source');
    const sourceOptionItems = sourceField ? getFieldOptionItems(sourceField) : [];
    const sourceRowsForPie = sourcePieSegments.map((seg) => {
      const p = pillDisplayForField(fields, 'sourceId', seg.id);
      const opt = sourceOptionItems.find((x) => x.id === seg.id);
      const colorKey = normalizeNotionColor(opt?.color);
      return {
        id: seg.id,
        label: p.label,
        className: p.className,
        fillHex: notionColorFillHex(colorKey),
      };
    });
    const sourceRowsForCount = sourceCountSegments.map((seg) => {
      const p = pillDisplayForField(fields, 'sourceId', seg.id);
      const opt = sourceOptionItems.find((x) => x.id === seg.id);
      const colorKey = normalizeNotionColor(opt?.color);
      return {
        id: seg.id,
        label: p.label,
        className: p.className,
        fillHex: notionColorFillHex(colorKey),
      };
    });

    /** Четвёртая KPI: контрастный период */
    let kpi4Title = 'В календарном году';
    let kpi4Value = formatRub(yearSumCalendar);
    let kpi4Hint = `${yearListCalendar.length} записей за ${calendarYear} год`;
    if (dashboardPeriod === 'year') {
      kpi4Title = 'За всё время';
      kpi4Value = formatRub(allTimeSum);
      kpi4Hint = `${datedBookings.length} записей всего`;
    } else if (dashboardPeriod === 'all') {
      kpi4Title = `За ${nowY} год`;
      kpi4Value = formatRub(currentYearSum);
      kpi4Hint = `${currentYearList.length} записей с датой в ${nowY}`;
    }

    let primaryKpiTitle = 'Выручка за месяц';
    if (dashboardPeriod === 'year') primaryKpiTitle = 'Выручка за год';
    if (dashboardPeriod === 'all') primaryKpiTitle = 'Выручка за всё время';

    return {
      reportList,
      reportSum,
      prevSum,
      delta,
      showCompare,
      comparePrefix,
      processingBookings,
      sourceCounts,
      sourceSums,
      totalSourceRev,
      sourcePieSegments,
      sourceCountSegments,
      sourceRowsForPie,
      sourceRowsForCount,
      totalSourceCount,
      yearMo,
      yearTotal,
      yearMax,
      yearCountTotal: yearMo.reduce((acc, x) => acc + x.count, 0),
      yearCountMax: Math.max(...yearMo.map((x) => x.count), 0),
      maxBar,
      upcoming,
      upcomingKpiHint,
      upcomingListHint,
      calendarYear,
      chartYear,
      yearListForChart,
      avgCheck,
      kpi4Title,
      kpi4Value,
      kpi4Hint,
      primaryKpiTitle,
      allTimeSum,
    };
  }, [bookings, monthCursor, fields, dashboardPeriod, focusedStatusId, upcomingKpiSelected]);

  const monthTitle = format(monthCursor, 'LLLL yyyy', { locale: ru });
  const yearTitle = format(monthCursor, 'yyyy', { locale: ru });
  const heroTitle =
    dashboardPeriod === 'month'
      ? `Сводка за ${monthTitle}`
      : dashboardPeriod === 'year'
        ? `Сводка за ${yearTitle} год`
        : 'Сводка за всё время';
  const heroBlurb =
    dashboardPeriod === 'month'
      ? 'Выручка, записи и источники за выбранный месяц. Период и месяц меняются в шапке дашборда.'
      : dashboardPeriod === 'year'
        ? 'Показаны все записи с датой в выбранном календарном году. Переключите год в той же панели.'
        : 'Показаны все записи с датой съёмки. График ниже — по месяцам текущего календарного года.';

  return (
    <div className="content dashboard-page">
      <div className="content-narrow flex flex-col gap-[18px]">
      <div className="dash-hero card card-pad-lg">
        <div className="card-eyebrow">Отчёты</div>
        <h1 className={`dash-hero-title ${dashboardPeriod === 'month' ? 'capitalize' : ''}`}>{heroTitle}</h1>
        <p className="dash-hero-sub">{heroBlurb}</p>
      </div>

      <div className={`kpi-grid${globalAmountFieldVisible ? '' : ' kpi-grid--no-amount'}`}>
        {globalAmountFieldVisible ? (
          <KpiCard
            title={stats.primaryKpiTitle}
            value={formatRub(stats.reportSum)}
            hint={
              stats.showCompare ? (
                stats.prevSum > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    {stats.delta >= 0 ? (
                      <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--status-done)' }} />
                    ) : (
                      <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    {stats.comparePrefix}: {stats.delta >= 0 ? '+' : ''}
                    {stats.delta.toFixed(0)}%
                  </span>
                ) : (
                  `Нет данных за прошлый ${dashboardPeriod === 'year' ? 'год' : 'месяц'} для сравнения`
                )
              ) : null
            }
          />
        ) : null}
        <KpiCard
          title="Всего записей"
          value={String(stats.reportList.length)}
          hint={globalAmountFieldVisible ? `Средний чек ${formatRub(Math.round(stats.avgCheck))}` : null}
        />
        <div className="kpi-card card">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="kpi-eyebrow">Ближайшие записи</div>
              <div className="kpi-value">{String(stats.upcoming.length)}</div>
              <div className="kpi-sub">
                {stats.upcomingKpiHint}
              </div>
            </div>
            <div className="relative shrink-0" ref={upcomingKpiPickerRef}>
              <button
                type="button"
                onClick={() => setUpcomingKpiPickerOpen((v) => !v)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[color:var(--border)] text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--text)]"
                aria-label="Настроить какие записи считать"
                aria-expanded={upcomingKpiPickerOpen}
                title="Настройки KPI"
              >
                <Settings2 className="h-3.5 w-3.5" aria-hidden />
              </button>
              {upcomingKpiPickerOpen ? (
                <div className="absolute right-0 top-full z-40 mt-1 w-64 max-h-72 overflow-y-auto rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elev-2)] p-2 shadow-[var(--shadow-lg)]">
                  <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-[color:var(--text-faint)]">
                    Учитывать статусы
                  </p>
                  <button
                    type="button"
                    className="mb-1 ml-2 text-[11px] text-[color:var(--text-muted)] hover:text-[color:var(--text)]"
                    onClick={() =>
                      updateClientUi((prev) => ({
                        ...prev,
                        dashboardUpcomingKpiStatusIds: [...allStatusIds],
                      }))
                    }
                  >
                    Выбрать все
                  </button>
                  {statusOptions.map((opt) => {
                    const checked = upcomingKpiSelected.includes(opt.id);
                    const pillClass = pillDisplayForField(fields, 'status', opt.id).className;
                    return (
                      <label
                        key={opt.id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[color:var(--text-muted)] hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--text)]"
                      >
                        <input
                          type="checkbox"
                          className="rounded border-[color:var(--border)]"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...new Set([...upcomingKpiSelected, opt.id])]
                              : upcomingKpiSelected.filter((id) => id !== opt.id);
                            updateClientUi((prev) => ({
                              ...prev,
                              dashboardUpcomingKpiStatusIds: next,
                            }));
                          }}
                        />
                        <span className={`chip chip-tag ${pillClass}`}>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        {globalAmountFieldVisible ? <KpiCard title={stats.kpi4Title} value={stats.kpi4Value} hint={stats.kpi4Hint} /> : null}
      </div>

      <div className="dash-two-col">
        <div className="card">
          <div className="card-h">
            <div className="min-w-0">
              <h2 className="card-title">Проекты по статусу</h2>
              <p className="card-sub">
                Все записи со статусом «{focusedStatusPill.label}», независимо от месяца и периода отчёта
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-start whitespace-nowrap" ref={statusPickerRef}>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatusPickerOpen((v) => !v)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--border)] text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--text)]"
                  aria-label="Настроить статус блока"
                  aria-expanded={statusPickerOpen}
                  title="Настройки блока"
                >
                  <Settings2 className="h-4 w-4" aria-hidden />
                </button>
                {statusPickerOpen ? (
                  <div className="absolute right-0 top-full z-40 mt-1 w-64 max-h-72 overflow-y-auto rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elev-2)] p-2 shadow-[var(--shadow-lg)]">
                    <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-[color:var(--text-faint)]">
                      Статус в блоке
                    </p>
                    {statusOptions.map((opt) => {
                      const selected = opt.id === focusedStatusId;
                      const pillClass = pillDisplayForField(fields, 'status', opt.id).className;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            updateClientUi((prev) => ({ ...prev, dashboardStatusFocusId: opt.id }));
                            setStatusPickerOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                            selected ? 'bg-[color:var(--surface-hover)] text-[color:var(--text)]' : 'text-[color:var(--text-muted)] hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--text)]'
                          }`}
                        >
                          <span className={`chip chip-tag ${pillClass}`}>{opt.label}</span>
                          {selected ? <Check className="h-3.5 w-3.5 shrink-0 text-[color:var(--accent)]" aria-hidden /> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <div
                className="badge-count tabular-nums"
                title={`Записей со статусом «${focusedStatusPill.label}»`}
              >
                {stats.processingBookings.length}
              </div>
            </div>
          </div>
          {stats.processingBookings.length === 0 ? (
            <p className="text-sm text-notion-muted py-6 text-center rounded-xl bg-notion-bg/50 border border-dashed border-notion-border">
              Нет записей со статусом «{focusedStatusPill.label}»
            </p>
          ) : (
            <ul className="proj-list max-h-[min(320px,50vh)] overflow-y-auto pr-0.5">
              {stats.processingBookings.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => onOpenBooking(b.id)}
                    className="proj-row w-full text-left font-inherit"
                  >
                    <div className="proj-row-main">
                      <div className="proj-title">{b.title || 'Без названия'}</div>
                      <div className="proj-row-foot">
                        <div className="proj-meta">
                          <span className="proj-meta-line tabular-nums">
                            <span className="proj-date">{formatDateDdMmYyyy(b.date)}</span>
                            {typeof b.timeRange === 'string' && b.timeRange.trim() ? (
                              <span className="proj-time">{b.timeRange.trim()}</span>
                            ) : null}
                          </span>
                          <BookingStatusChip fields={fields} status={b.status} />
                        </div>
                        {globalAmountFieldVisible && b.amount ? (
                          <div className="proj-amount tabular-nums">{formatRub(b.amount)}</div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="card-title">Источники</h2>
          <p className="card-sub mb-4">
            {globalAmountFieldVisible
              ? 'Доля выручки за период: в центре — лидер по сумме; наведите на сектор кольца, чтобы увидеть партнёра и долю. Ниже — компактный список источников.'
              : 'Доля записей за период: в центре — источник с наибольшим количеством записей. Ниже — компактный список источников.'}
          </p>
          {stats.reportList.length === 0 ? (
            <p className="text-sm text-notion-muted py-6 text-center rounded-xl bg-notion-bg/50 border border-dashed border-notion-border">
              Нет данных за период
            </p>
          ) : (globalAmountFieldVisible ? stats.sourcePieSegments.length === 0 : stats.sourceCountSegments.length === 0) ? (
            <p className="text-sm text-notion-muted py-6 text-center rounded-xl bg-notion-bg/50 border border-dashed border-notion-border">
              {globalAmountFieldVisible ? 'Нет выручки по источникам за период' : 'Нет записей по источникам за период'}
            </p>
          ) : (
            <SourceRevenueDonut
              sources={globalAmountFieldVisible ? stats.sourceRowsForPie : stats.sourceRowsForCount}
              segments={globalAmountFieldVisible ? stats.sourcePieSegments : stats.sourceCountSegments}
              total={globalAmountFieldVisible ? stats.totalSourceRev : stats.totalSourceCount}
              metric={globalAmountFieldVisible ? 'sum' : 'count'}
            />
          )}
        </div>
      </div>

      <div className="card dyn-card overflow-hidden">
        <div className="card-h pb-4 border-b border-[color:var(--border)]">
          <div>
            <div className="card-eyebrow mb-1">Динамика</div>
            <h2 className="card-title big mb-1">{globalAmountFieldVisible ? 'Выручка по месяцам' : 'Записи по месяцам'}</h2>
            <p className="card-sub">
              {globalAmountFieldVisible
                ? `Календарный год ${stats.chartYear}: с января по декабрь`
                : `Календарный год ${stats.chartYear}: количество записей по месяцам`}
            </p>
          </div>
          <div className="dyn-total text-right">
            <div className="kpi-eyebrow mb-1">За период</div>
            <div className="kpi-value">
              {globalAmountFieldVisible ? formatRub(stats.yearTotal) : formatOrderCountRu(stats.yearCountTotal)}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 pt-4">
          <div className="dyn-legend">
            <span className="legend-pill">
              {globalAmountFieldVisible ? (
                <>
                  Столбец — месяц; сверху сумма (₽). Максимум —{' '}
                  <strong className="tabular-nums">{formatRub(stats.yearMax)}</strong>
                </>
              ) : (
                <>
                  Столбец — месяц; сверху количество записей. Максимум —{' '}
                  <strong className="tabular-nums">{formatOrderCountRu(stats.yearCountMax)}</strong>
                </>
              )}
            </span>
          </div>
          <div className="bars">
            {stats.yearMo.map(({ month, sum, count }) => {
              const value = globalAmountFieldVisible ? sum : count;
              const max = globalAmountFieldVisible ? stats.maxBar : Math.max(stats.yearCountMax, 1);
              const hPx =
                max > 0 && value > 0 ? Math.max(6, (value / max) * 130) : value === 0 ? 2 : 0;
              const isSelectedMonth =
                dashboardPeriod === 'month' &&
                getYear(month) === getYear(monthCursor) &&
                getMonth(month) === getMonth(monthCursor);
              const isPeak = dashboardPeriod === 'month'
                ? isSelectedMonth
                : max > 0 && value > 0 && value === max;
              const mLabel = format(month, 'LLL', { locale: ru });
              const valueLabel = globalAmountFieldVisible ? barTopLabel(sum) : count > 0 ? String(count) : '—';
              return (
                <div
                  key={month.toISOString()}
                  className="bar-col"
                  title={
                    value > 0
                      ? globalAmountFieldVisible
                        ? `${formatRub(sum)} · ${count} ${count === 1 ? 'запись' : 'записей'}`
                        : formatOrderCountRu(count)
                      : `${mLabel}: нет данных`
                  }
                >
                  <div className="bar-value">{valueLabel}</div>
                  <div className="bar-track">
                    <div className={`bar-fill ${isPeak ? 'peak' : ''}`} style={{ height: `${hPx}px` }}>
                      {isPeak ? <div className="bar-peak-dot" /> : null}
                    </div>
                  </div>
                  <div className="bar-label">{mLabel}</div>
                  <div className="bar-value-mobile tabular-nums">{valueLabel}</div>
                  <span className="small faint tabular-nums">{count > 0 ? `${count} з.` : '—'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="min-w-0">
            <h2 className="card-title">Ближайшие записи</h2>
            <p className="card-sub">
              {stats.upcomingListHint}
            </p>
          </div>
          <div className="relative shrink-0" ref={upcomingPickerRef}>
            <button
              type="button"
              onClick={() => setUpcomingPickerOpen((v) => !v)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[color:var(--border)] text-[color:var(--text-muted)] transition-colors hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--text)]"
              aria-label="Настроить поля блока ближайших записей"
              aria-expanded={upcomingPickerOpen}
              title="Настройки блока"
            >
              <Settings2 className="h-4 w-4" aria-hidden />
            </button>
            {upcomingPickerOpen ? (
              <div className="absolute right-0 top-full z-40 mt-1 w-72 max-h-80 overflow-y-auto rounded-lg border border-[color:var(--border)] bg-[color:var(--bg-elev-2)] p-2 shadow-[var(--shadow-lg)]">
                <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-[color:var(--text-faint)]">
                  Показывать в строке
                </p>
                <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[color:var(--text-muted)] hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--text)]">
                  <input
                    type="checkbox"
                    className="rounded border-[color:var(--border)]"
                    checked={showUpcomingDateMeta}
                    onChange={(e) =>
                      updateClientUi((prev) => ({
                        ...prev,
                        dashboardUpcomingVisible: {
                          ...(prev.dashboardUpcomingVisible || {}),
                          dateMeta: e.target.checked,
                        },
                      }))
                    }
                  />
                  Дата и день недели
                </label>
                <div className="my-1 h-px bg-[color:var(--border)]/70" />
                {upcomingAmountField ? (
                  <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[color:var(--text-muted)] hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--text)]">
                    <input
                      type="checkbox"
                      className="rounded border-[color:var(--border)]"
                      checked={showUpcomingAmount}
                      onChange={(e) =>
                        updateClientUi((prev) => ({
                          ...prev,
                          dashboardUpcomingFieldVisible: {
                            ...(prev.dashboardUpcomingFieldVisible || {}),
                            [upcomingAmountField.id]: e.target.checked,
                          },
                        }))
                      }
                    />
                    Сумма
                  </label>
                ) : null}
                {upcomingFieldsForSettings
                  .filter((field) => field.id !== upcomingAmountField?.id)
                  .map((field) => (
                  <label
                    key={field.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[color:var(--text-muted)] hover:bg-[color:var(--surface-hover)] hover:text-[color:var(--text)]"
                  >
                    <input
                      type="checkbox"
                      className="rounded border-[color:var(--border)]"
                      checked={isUpcomingFieldShown(field.id)}
                      onChange={(e) =>
                        updateClientUi((prev) => ({
                          ...prev,
                          dashboardUpcomingFieldVisible: {
                            ...(prev.dashboardUpcomingFieldVisible || {}),
                            [field.id]: e.target.checked,
                          },
                        }))
                      }
                    />
                    <span className="truncate">{field.label}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {stats.upcoming.length === 0 ? (
          <p className="text-sm text-notion-muted py-6 text-center border border-dashed border-notion-border rounded-xl">
            Нет подходящих записей до конца года
          </p>
        ) : (
          <ul className="dash-upcoming-list max-h-[min(480px,60vh)] divide-y divide-[color:var(--border)] overflow-y-auto rounded-[var(--radius-lg)] border border-[color:var(--border)]">
            {stats.upcoming.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onOpenBooking(b.id)}
                  className="dash-upcoming-row w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 text-left touch-manipulation group"
                >
                  {showUpcomingDateMeta ? (
                    <div className="shrink-0 text-center min-w-[3rem] sm:min-w-[3.5rem]">
                      <div className="text-xs muted leading-tight">
                        {format(parseISO(b.date), 'd MMM', { locale: ru })}
                      </div>
                      <div className="text-[10px] faint capitalize">
                        {format(parseISO(b.date), 'EEE', { locale: ru })}
                      </div>
                    </div>
                  ) : null}
                  <div className="flex-1 min-w-0">
                    {(() => {
                      const titleField = upcomingFields.find((f) => f.key === 'title');
                      const showTitle = titleField ? isUpcomingFieldShown(titleField.id) : true;
                      return showTitle ? (
                        <div className="font-medium truncate group-hover:opacity-90 transition-opacity" style={{ color: 'var(--text)' }}>
                          {b.title || 'Без названия'}
                        </div>
                      ) : null;
                    })()}
                    <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                      {upcomingFields
                        .filter((f) => isUpcomingFieldShown(f.id))
                        .filter((f) => f.key !== 'title' && f.key !== 'date' && f.key !== 'amount')
                        .map((f) => {
                          if ((f.key === 'status' || f.type === 'status') && b.status) {
                            return <BookingStatusChip key={f.id} fields={fields} status={b.status} />;
                          }
                          if ((f.key === 'sourceId' || f.type === 'source') && b.sourceId) {
                            return <BookingSourceChip key={f.id} fields={fields} sourceId={b.sourceId} />;
                          }
                          if (f.key === 'tagIds' || f.type === 'tags') {
                            const tagIds = Array.isArray(b.tagIds) ? b.tagIds : Array.isArray(b[f.key]) ? b[f.key] : [];
                            if (!tagIds.length) return null;
                            return (
                              <span key={f.id} className="inline-flex items-center">
                                <BookingTagChips fields={fields} tagIds={tagIds} />
                              </span>
                            );
                          }
                          if (f.type === 'multiselect') {
                            const ids = Array.isArray(b[f.key]) ? b[f.key] : [];
                            if (!ids.length) return null;
                            const options = getFieldOptionItems(f);
                            return (
                              <span key={f.id} className="inline-flex flex-wrap gap-1">
                                {ids.map((id) => {
                                  const sid = String(id);
                                  const opt = options.find((x) => x.id === sid);
                                  const cls = notionPillClasses(opt?.color || 'gray');
                                  return (
                                    <span key={`${f.id}-${sid}`} className={`chip chip-tag ${cls}`}>
                                      {opt?.label || sid}
                                    </span>
                                  );
                                })}
                              </span>
                            );
                          }
                          if (f.type === 'comments') {
                            const list = Array.isArray(b[f.key]) ? b[f.key] : [];
                            if (!list.length) return null;
                            return (
                              <span
                                key={f.id}
                                className="inline-flex items-center gap-1 text-[12px] text-notion-muted tabular-nums"
                                aria-label={`${list.length} ${commentsCountWordRu(list.length)}`}
                                title={`${list.length} ${commentsCountWordRu(list.length)}`}
                              >
                                <MessageSquare className="w-3.5 h-3.5 shrink-0" aria-hidden />
                                {list.length}
                              </span>
                            );
                          }
                          if (f.type === 'select') {
                            const valueId = typeof b[f.key] === 'string' ? b[f.key] : String(b[f.key] ?? '');
                            if (!valueId) return null;
                            const options = getFieldOptionItems(f);
                            const opt = options.find((x) => x.id === valueId);
                            const cls = notionPillClasses(opt?.color || 'gray');
                            return (
                              <span key={f.id} className={`chip chip-tag ${cls}`}>
                                {opt?.label || valueId}
                              </span>
                            );
                          }
                          const text = formatUpcomingFieldText(f, b);
                          if (!text) return null;
                          if (f.key === 'timeRange' || f.type === 'time') {
                            return (
                              <span key={f.id} className="text-xs font-medium tabular-nums" style={{ color: 'var(--status-progress)' }}>
                                {text}
                              </span>
                            );
                          }
                          if (f.type === 'client') {
                            return (
                              <span
                                key={f.id}
                                className="inline-flex max-w-full min-w-0 items-center text-[12px] leading-snug text-amber-200/80 [html.light_&]:text-amber-950/90"
                                title={text}
                              >
                                <span className="truncate">{text}</span>
                              </span>
                            );
                          }
                          return (
                            <span
                              key={f.id}
                              className="inline-flex max-w-full min-w-0 items-center rounded-full border border-[color:var(--border)] px-2 py-0.5 text-[11px] text-[color:var(--text-muted)]"
                              title={text}
                            >
                              <span className="truncate">{text}</span>
                            </span>
                          );
                        })}
                    </div>
                  </div>
                  {showUpcomingAmount ? (
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold tabular-nums" style={{ color: 'var(--accent)' }}>
                        {formatRub(b.amount)}
                      </div>
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ml-auto mt-1 hidden sm:block faint" />
                    </div>
                  ) : (
                    <div className="shrink-0 text-right">
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity ml-auto mt-1 hidden sm:block faint" />
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      </div>
    </div>
  );
}
