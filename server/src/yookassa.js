import { randomUUID } from 'crypto';
import { BILLING_AMOUNT_MINOR, BILLING_CURRENCY, BILLING_PLAN_CODE, amountMinorToYookassaValue } from './billingConfig.js';

const YOOKASSA_API_BASE = 'https://api.yookassa.ru/v3';

function trimEnv(name) {
  return (process.env[name] ?? '').trim();
}

export function isYookassaConfigured() {
  return Boolean(trimEnv('YOOKASSA_SHOP_ID') && trimEnv('YOOKASSA_SECRET_KEY'));
}

function yookassaAuthHeader() {
  const shopId = trimEnv('YOOKASSA_SHOP_ID');
  const secretKey = trimEnv('YOOKASSA_SECRET_KEY');
  const token = Buffer.from(`${shopId}:${secretKey}`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

/**
 * @param {string} path
 * @param {string} idempotencyKey
 * @param {unknown} body
 */
async function yookassaRequest(path, idempotencyKey, body) {
  if (!isYookassaConfigured()) {
    throw new Error('ЮKassa не настроена: задайте YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY');
  }
  const res = await fetch(`${YOOKASSA_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: yookassaAuthHeader(),
      'Content-Type': 'application/json',
      'Idempotence-Key': idempotencyKey,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const details = data?.description || data?.type || text || `HTTP ${res.status}`;
    throw new Error(`ЮKassa API error: ${details}`);
  }
  return data;
}

/**
 * @param {{ userId: string, subscriptionId: string }} p
 */
export async function createCheckoutPayment(p) {
  const idempotencyKey = randomUUID();
  const returnUrl =
    trimEnv('YOOKASSA_RETURN_URL') || `${(process.env.APP_PUBLIC_URL ?? '').trim().replace(/\/$/, '') || 'http://localhost:5174'}/settings`;
  const payload = {
    amount: {
      value: amountMinorToYookassaValue(BILLING_AMOUNT_MINOR),
      currency: BILLING_CURRENCY,
    },
    capture: true,
    confirmation: {
      type: 'redirect',
      return_url: returnUrl,
    },
    description: 'Подписка Base56: 400 ₽/мес',
    save_payment_method: true,
    metadata: {
      userId: p.userId,
      subscriptionId: p.subscriptionId,
      planCode: BILLING_PLAN_CODE,
      flow: 'checkout',
    },
  };
  const payment = await yookassaRequest('/payments', idempotencyKey, payload);
  return { payment, idempotencyKey };
}

/**
 * @param {{ userId: string, subscriptionId: string, paymentMethodId: string }} p
 */
export async function createRecurringPayment(p) {
  const idempotencyKey = randomUUID();
  const payload = {
    amount: {
      value: amountMinorToYookassaValue(BILLING_AMOUNT_MINOR),
      currency: BILLING_CURRENCY,
    },
    capture: true,
    payment_method_id: p.paymentMethodId,
    description: 'Подписка Base56: автопродление',
    metadata: {
      userId: p.userId,
      subscriptionId: p.subscriptionId,
      planCode: BILLING_PLAN_CODE,
      flow: 'recurring',
    },
  };
  const payment = await yookassaRequest('/payments', idempotencyKey, payload);
  return { payment, idempotencyKey };
}
