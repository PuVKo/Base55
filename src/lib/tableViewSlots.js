/** Порядок столбцов таблицы (соответствие полям формы). */
export const TABLE_SLOT_ORDER = [
  'date',
  'title',
  'time',
  'description',
  'amount',
  'status',
  'tags',
  'source',
  'client',
];

/** @param {any} f */
export function tableSlotForField(f) {
  const k = f.key;
  const t = f.type;
  if (k === 'date' || t === 'date') return 'date';
  if (k === 'title') return 'title';
  if (k === 'timeRange' || (t === 'time' && k === 'timeRange')) return 'time';
  if (k === 'description') return 'description';
  if (k === 'amount' || (t === 'number' && k === 'amount')) return 'amount';
  if (k === 'status' || t === 'status') return 'status';
  if (k === 'tagIds' || t === 'tags') return 'tags';
  if (k === 'sourceId' || t === 'source') return 'source';
  if (k === 'clientName' || t === 'client') return 'client';
  return null;
}

/** @param {string} slot @param {any[]} fields */
export function fieldForTableSlot(slot, fields) {
  const sorted = [...(fields || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  return sorted.find((f) => tableSlotForField(f) === slot);
}

/**
 * @param {string} slot
 * @param {any[]} fields
 * @param {Record<string, boolean>} tableTileFieldVisible
 */
export function isTableSlotVisible(slot, fields, tableTileFieldVisible) {
  const f = fieldForTableSlot(slot, fields);
  if (!f) return true;
  if (f.visible === false) return false;
  return tableTileFieldVisible[f.id] !== false;
}

/** @param {any[]} fields */
export function orderedTableSlotsFromFields(fields) {
  const sorted = [...(fields || [])]
    .filter((f) => f.visible !== false)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const slots = [];
  for (const f of sorted) {
    const slot = tableSlotForField(f);
    if (!slot) continue;
    if (!slots.includes(slot)) slots.push(slot);
  }

  if (slots.includes('date')) {
    return ['date', ...slots.filter((slot) => slot !== 'date')];
  }
  return slots;
}
