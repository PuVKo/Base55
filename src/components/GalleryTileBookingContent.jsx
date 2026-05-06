import { MessageSquare } from 'lucide-react';
import { formatClientDisplay } from '@/lib/clientField';
import { formatDateDdMm, formatRub } from '@/lib/format';
import { getFieldOptionItems, pillDisplayForField, tagPillFromFieldOrConstants } from '@/lib/fieldOptions';
import { notionPillClasses } from '@/lib/notionColors';

/** Как на событии календаря: `.chip` + `.chip-tag` из mockup-base + notionPillClasses из поля */
const TILE_CHIP_CLASS = 'chip chip-tag max-w-full min-w-0';
/** Одна строка бейджей: одинаковая для статуса, источника, тегов и multiselect — без «лишней» обёртки у одиночных чипов */
const TILE_CHIP_ROW_CLASS =
  'tile-chip-row flex min-h-[22px] flex-wrap content-start items-center gap-x-1.5 gap-y-1.5';

/** На плитке не показываем «пустые» опции (как в MockupChips). */
function isEmptyOptionChipLabel(label) {
  const t = String(label ?? '').trim();
  if (!t) return true;
  if (t === 'Без источника' || t === 'Не выбран' || t === 'Не выбрано') return true;
  if (t === '—') return true;
  return false;
}

/**
 * Компактное значение поля на плитке (только для списка настроенных полей).
 * @param {any} field
 * @param {Record<string, unknown>} booking
 * @param {any[] | undefined} fields
 * @param {any | undefined} tagsField — поле тегов для резолва id
 */
function renderFieldBlock(field, booking, fields, tagsField) {
  const key = field.key;
  const raw = booking[key];

  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'url': {
      const s = typeof raw === 'string' ? raw.trim() : '';
      if (!s) return null;
      return <p className="text-[12px] text-notion-fg/80 line-clamp-2 break-words leading-snug">{s}</p>;
    }
    case 'textarea': {
      const s = typeof raw === 'string' ? raw.trim() : '';
      if (!s) return null;
      return <p className="text-[12px] text-notion-fg/80 line-clamp-2 break-words leading-relaxed">{s}</p>;
    }
    case 'number': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n) && key !== 'amount') return null;
      if (key === 'amount') {
        if (!Number.isFinite(n) || n === 0) return null;
        return (
          <div className="text-[15px] font-semibold tabular-nums leading-none tracking-tight text-[color:var(--accent)]">
            {formatRub(n)}
          </div>
        );
      }
      return <p className="text-[12px] text-notion-muted tabular-nums">{Number.isFinite(n) ? String(n) : '—'}</p>;
    }
    case 'date': {
      const s = typeof raw === 'string' ? raw.trim() : '';
      const dd = formatDateDdMm(s);
      if (!dd) return null;
      return <div className="text-[13px] sm:text-[14px] font-medium tabular-nums text-notion-fg/90">{dd}</div>;
    }
    case 'time': {
      const s = typeof raw === 'string' ? raw.trim() : '';
      if (!s) return null;
      return <div className="text-[13px] sm:text-[14px] font-medium tabular-nums text-notion-fg/90">{s}</div>;
    }
    case 'checkbox': {
      return <span className="text-[12px] text-notion-muted">{raw ? 'Да' : 'Нет'}</span>;
    }
    case 'select':
    case 'status':
    case 'source': {
      const rawStr =
        typeof raw === 'string' ? raw.trim() : raw === undefined || raw === null ? '' : String(raw);
      if (!rawStr) return null;
      const pill = pillDisplayForField(fields, key, typeof raw === 'string' ? raw.trim() : String(raw));
      if (isEmptyOptionChipLabel(pill.label)) return null;
      return (
        <div className={TILE_CHIP_ROW_CLASS}>
          <span className={`${TILE_CHIP_CLASS} ${pill.className}`}>{pill.label}</span>
        </div>
      );
    }
    case 'multiselect': {
      const arr = Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : [];
      if (!arr.length) return null;
      const items = getFieldOptionItems(field);
      return (
        <div className={TILE_CHIP_ROW_CLASS}>
          {arr.map((id) => {
            const opt = items.find((x) => x.id === id);
            const cls = opt ? notionPillClasses(opt.color || 'gray') : notionPillClasses('gray');
            const label = opt?.label ?? id;
            return (
              <span key={id} className={`${TILE_CHIP_CLASS} ${cls}`}>
                {label}
              </span>
            );
          })}
        </div>
      );
    }
    case 'tags': {
      const arr = Array.isArray(booking.tagIds) ? booking.tagIds.filter((x) => typeof x === 'string') : [];
      if (!arr.length) return null;
      return (
        <div className={TILE_CHIP_ROW_CLASS}>
          {arr.map((tid) => {
            const pill = tagPillFromFieldOrConstants(tagsField, tid);
            if (!pill) return null;
            return (
              <span key={tid} className={`${TILE_CHIP_CLASS} ${pill.className}`}>
                {pill.label}
              </span>
            );
          })}
        </div>
      );
    }
    case 'client': {
      const line = formatClientDisplay(raw);
      if (!line) return null;
      return (
        <span
          className="block w-full min-w-0 max-w-full truncate text-[12px] leading-snug text-amber-200/80 [html.light_&]:text-amber-950/90"
          title={`Клиент: ${line}`}
        >
          Клиент: {line}
        </span>
      );
    }
    case 'comments': {
      const list = Array.isArray(raw) ? raw : [];
      if (!list.length) return null;
      return (
        <div
          className="flex items-center gap-1 text-[12px] text-notion-muted tabular-nums"
          aria-label={`${list.length} комментариев`}
        >
          <MessageSquare className="w-3.5 h-3.5 shrink-0" aria-hidden />
          {list.length}
        </div>
      );
    }
    default: {
      if (raw === undefined || raw === null || raw === '') return null;
      if (typeof raw === 'object') {
        return <p className="text-[12px] text-notion-muted line-clamp-2">{JSON.stringify(raw)}</p>;
      }
      return <p className="text-[12px] text-notion-muted line-clamp-2">{String(raw)}</p>;
    }
  }
}

/**
 * Заголовок (название) — всегда отдельно, крупнее.
 */
function TitleBlock({ field, booking, compact }) {
  const raw = booking[field.key];
  const s = typeof raw === 'string' ? raw.trim() : '';
  return (
    <div
      className={
        compact
          ? 'font-medium text-notion-fg line-clamp-2 leading-snug text-[12px] sm:text-[13px]'
          : 'tile-title line-clamp-2'
      }
    >
      {s || 'Без названия'}
    </div>
  );
}

/** Полная ширина — длинный текст и блоки с несколькими бейджами; остальное в потоке flex-wrap как в календаре. */
function isTileFieldFullWidth(field) {
  const t = field.type;
  const compactInline = new Set([
    'date',
    'time',
    'number',
    'checkbox',
    'select',
    'status',
    'source',
  ]);
  if (compactInline.has(t)) return false;
  return true;
}

const PROSE_TYPES = new Set(['text', 'textarea', 'email', 'phone', 'url']);
/** Числовые поля кроме суммы — строкой в блоке описания */
function isProseNumberField(field) {
  return field.type === 'number' && field.key !== 'amount';
}

/**
 * Порядок секций как в Notion: мета → текст → бейджи → клиент → комментарии (сумма отдельно в подвале).
 * @param {any[]} fields — после исключения date/time и amount
 */
function partitionGalleryMiddleFields(fields) {
  /** @type {any[]} */
  const prose = [];
  /** @type {any[]} */
  const chips = [];
  /** @type {any[]} */
  const client = [];
  /** @type {any[]} */
  const comments = [];
  for (const f of fields) {
    if (f.type === 'client') {
      client.push(f);
      continue;
    }
    if (f.type === 'comments') {
      comments.push(f);
      continue;
    }
    if (PROSE_TYPES.has(f.type) || isProseNumberField(f)) {
      prose.push(f);
      continue;
    }
    chips.push(f);
  }
  return { prose, chips, client, comments };
}

/**
 * @param {object} p
 * @param {Record<string, unknown>} p.booking
 * @param {any[]} p.fields
 * @param {Record<string, boolean>} p.galleryTileFieldVisible
 * @param {boolean} [p.compact] — компактный вид (календарь)
 */
export function GalleryTileBookingContent({ booking, fields, galleryTileFieldVisible, compact }) {
  const tagsField = fields?.find((f) => f.type === 'tags' || f.key === 'tagIds');
  const visibleFields = [...(fields || [])]
    .filter((f) => f.visible)
    .filter((f) => galleryTileFieldVisible[f.id] !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const titleField = visibleFields.find((f) => f.key === 'title');
  const rest = visibleFields.filter((f) => f.key !== 'title');
  const orderedNodes = rest
    .map((field) => {
      const block = renderFieldBlock(field, booking, fields, tagsField);
      if (!block) return null;
      const full = isTileFieldFullWidth(field);
      return (
        <div
          key={field.id}
          className={
            full
              ? 'min-w-0 w-full basis-full shrink-0'
              : 'min-w-0 max-w-full shrink-0 grow-0 basis-auto'
          }
        >
          {block}
        </div>
      );
    })
    .filter(Boolean);

  return (
    <div
      className={`flex h-full min-h-0 flex-col ${compact ? 'gap-1' : 'gap-1.5'} ${compact ? 'text-[11px] sm:text-[12px]' : ''}`}
    >
      {titleField ? (
        <TitleBlock field={titleField} booking={booking} compact={compact} />
      ) : (
        <div
          className={`font-medium text-notion-fg line-clamp-2 leading-snug ${compact ? 'text-[12px] sm:text-[13px]' : ''}`}
        >
          {typeof booking.title === 'string' && booking.title.trim() ? booking.title : 'Без названия'}
        </div>
      )}
      {orderedNodes.length > 0 ? (
        <div className="mt-0.5 flex min-h-0 flex-wrap items-center content-start gap-x-1.5 gap-y-1.5 w-full min-w-0">
          {orderedNodes}
        </div>
      ) : null}
    </div>
  );
}
