export const BILLING_PLAN_CODE = 'base56_monthly_400';
export const BILLING_AMOUNT_MINOR = 40000;
export const BILLING_CURRENCY = 'RUB';
export const BILLING_INTERVAL = 'month';

export const SUBSCRIPTION_ACTIVE_STATUSES = ['trialing', 'active', 'past_due', 'incomplete'];

/**
 * @param {number} amountMinor
 */
export function amountMinorToYookassaValue(amountMinor) {
  return (Math.max(0, Number(amountMinor) || 0) / 100).toFixed(2);
}

/**
 * @param {Date} date
 * @param {number} months
 */
export function addUtcMonths(date, months) {
  const d = new Date(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/**
 * @param {string | null | undefined} raw
 */
export function yookassaIsoToDate(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : null;
}
