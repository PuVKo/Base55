import express from 'express';
import { clientSafeError } from './clientSafeError.js';
import { requireAuth } from './session.js';
import {
  applyYookassaWebhookEvent,
  cancelSubscription,
  createSubscriptionCheckout,
  getUserSubscription,
  serializeSubscription,
} from './billingService.js';
import { isYookassaConfigured } from './yookassa.js';

function webhookSecretValid(req) {
  const expected = (process.env.YOOKASSA_WEBHOOK_SECRET ?? '').trim();
  if (!expected) return true;
  const fromHeader = String(req.get('x-yookassa-webhook-secret') ?? '').trim();
  const fromQuery = String(req.query?.secret ?? '').trim();
  return fromHeader === expected || fromQuery === expected;
}

function remoteIp(req) {
  const fromHeader = String(req.get('x-forwarded-for') ?? '')
    .split(',')[0]
    ?.trim();
  return fromHeader || req.socket?.remoteAddress || '';
}

function ipAllowed(req) {
  const raw = (process.env.YOOKASSA_WEBHOOK_ALLOWED_IPS ?? '').trim();
  if (!raw) return true;
  const allowSet = new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return allowSet.has(remoteIp(req));
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export function createBillingRouter(prisma) {
  const router = express.Router();

  router.get('/subscription', requireAuth, async (req, res) => {
    try {
      const row = await getUserSubscription(prisma, req.userId);
      res.json({
        configured: isYookassaConfigured(),
        subscription: serializeSubscription(row),
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: clientSafeError(e) });
    }
  });

  router.post('/subscription/checkout', requireAuth, async (req, res) => {
    try {
      if (!isYookassaConfigured()) {
        res.status(503).json({ error: 'ЮKassa не настроена на сервере' });
        return;
      }
      const out = await createSubscriptionCheckout(prisma, req.userId);
      if (out.alreadyActive) {
        res.status(409).json({
          error: 'Подписка уже активна',
          subscription: serializeSubscription(out.subscription),
        });
        return;
      }
      if (!out.confirmationUrl) {
        res.status(502).json({ error: 'ЮKassa не вернула ссылку на оплату' });
        return;
      }
      res.json({
        confirmationUrl: out.confirmationUrl,
        subscription: serializeSubscription(out.subscription),
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: clientSafeError(e) });
    }
  });

  router.post('/subscription/cancel', requireAuth, async (req, res) => {
    try {
      const row = await cancelSubscription(prisma, req.userId);
      if (!row) {
        res.status(404).json({ error: 'Подписка не найдена' });
        return;
      }
      res.json({ ok: true, subscription: serializeSubscription(row) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: clientSafeError(e) });
    }
  });

  router.post('/yookassa/webhook', async (req, res) => {
    try {
      if (!ipAllowed(req) || !webhookSecretValid(req)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      const out = await applyYookassaWebhookEvent(prisma, req.body);
      if (!out.ok && out.ignored) {
        res.json({ ok: true, ignored: true, reason: out.reason });
        return;
      }
      res.json({ ok: true, duplicate: Boolean(out.duplicate) });
    } catch (e) {
      console.error('Billing webhook failed:', e);
      res.status(500).json({ error: clientSafeError(e) });
    }
  });

  return router;
}
