import {
  BILLING_AMOUNT_MINOR,
  BILLING_CURRENCY,
  BILLING_INTERVAL,
  BILLING_PLAN_CODE,
  SUBSCRIPTION_ACTIVE_STATUSES,
  addUtcMonths,
  yookassaIsoToDate,
} from './billingConfig.js';
import { createCheckoutPayment, createRecurringPayment } from './yookassa.js';

const SUBSCRIPTION_SELECT = {
  id: true,
  userId: true,
  planCode: true,
  amountMinor: true,
  currency: true,
  billingInterval: true,
  status: true,
  paymentMethodId: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  nextBillingAt: true,
  cancelAtPeriodEnd: true,
  canceledAt: true,
  updatedAt: true,
};

/**
 * @param {unknown} e
 */
function isUniqueConstraintError(e) {
  return Boolean(e && typeof e === 'object' && 'code' in e && e.code === 'P2002');
}

/**
 * @param {any} row
 */
export function serializeSubscription(row) {
  if (!row) return null;
  return {
    id: row.id,
    planCode: row.planCode,
    amountMinor: row.amountMinor,
    amountRub: Number((row.amountMinor / 100).toFixed(2)),
    currency: row.currency,
    billingInterval: row.billingInterval,
    status: row.status,
    paymentMethodBound: Boolean(row.paymentMethodId),
    currentPeriodStart: row.currentPeriodStart ? row.currentPeriodStart.toISOString() : null,
    currentPeriodEnd: row.currentPeriodEnd ? row.currentPeriodEnd.toISOString() : null,
    nextBillingAt: row.nextBillingAt ? row.nextBillingAt.toISOString() : null,
    cancelAtPeriodEnd: Boolean(row.cancelAtPeriodEnd),
    canceledAt: row.canceledAt ? row.canceledAt.toISOString() : null,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} userId
 */
export async function getUserSubscription(prisma, userId) {
  return prisma.subscription.findFirst({
    where: { userId, planCode: BILLING_PLAN_CODE },
    orderBy: { updatedAt: 'desc' },
    select: SUBSCRIPTION_SELECT,
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} userId
 */
export async function createSubscriptionCheckout(prisma, userId) {
  const now = new Date();
  let subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      planCode: BILLING_PLAN_CODE,
      status: { in: SUBSCRIPTION_ACTIVE_STATUSES },
    },
    orderBy: { updatedAt: 'desc' },
  });
  if (subscription && ['active', 'trialing'].includes(subscription.status) && !subscription.cancelAtPeriodEnd) {
    return {
      alreadyActive: true,
      subscription,
      confirmationUrl: null,
    };
  }
  if (!subscription) {
    subscription = await prisma.subscription.create({
      data: {
        userId,
        planCode: BILLING_PLAN_CODE,
        amountMinor: BILLING_AMOUNT_MINOR,
        currency: BILLING_CURRENCY,
        billingInterval: BILLING_INTERVAL,
        status: 'incomplete',
      },
    });
  } else {
    subscription = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'incomplete',
        amountMinor: BILLING_AMOUNT_MINOR,
        currency: BILLING_CURRENCY,
        billingInterval: BILLING_INTERVAL,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        nextBillingAt: null,
      },
    });
  }

  const { payment, idempotencyKey } = await createCheckoutPayment({
    userId,
    subscriptionId: subscription.id,
  });

  await prisma.billingEvent.create({
    data: {
      userId,
      subscriptionId: subscription.id,
      type: 'checkout_created',
      status: String(payment?.status || 'pending'),
      idempotencyKey,
      yookassaPaymentId: typeof payment?.id === 'string' ? payment.id : null,
      payload: payment ?? null,
      processedAt: now,
    },
  });

  return {
    alreadyActive: false,
    subscription,
    confirmationUrl: payment?.confirmation?.confirmation_url || null,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} userId
 */
export async function cancelSubscription(prisma, userId) {
  const row = await getUserSubscription(prisma, userId);
  if (!row) return null;
  if (row.status === 'canceled') return row;
  if (row.status === 'active' || row.status === 'trialing') {
    return prisma.subscription.update({
      where: { id: row.id },
      data: { cancelAtPeriodEnd: true },
      select: SUBSCRIPTION_SELECT,
    });
  }
  return prisma.subscription.update({
    where: { id: row.id },
    data: {
      status: 'canceled',
      cancelAtPeriodEnd: false,
      canceledAt: new Date(),
      nextBillingAt: null,
    },
    select: SUBSCRIPTION_SELECT,
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {any} event
 */
export async function applyYookassaWebhookEvent(prisma, event) {
  const eventType = typeof event?.event === 'string' ? event.event : '';
  const eventId = typeof event?.id === 'string' ? event.id : null;
  const object = typeof event?.object === 'object' && event.object ? event.object : {};
  const metadata = typeof object?.metadata === 'object' && object.metadata ? object.metadata : {};
  const userId = typeof metadata?.userId === 'string' ? metadata.userId : '';
  if (!userId) {
    return { ok: false, ignored: true, reason: 'metadata.userId missing' };
  }

  if (eventId) {
    const dup = await prisma.billingEvent.findUnique({ where: { yookassaEventId: eventId } });
    if (dup) {
      return { ok: true, duplicate: true };
    }
  }

  const paymentId = typeof object?.id === 'string' ? object.id : null;
  const status = typeof object?.status === 'string' ? object.status : null;
  const subscriptionId = typeof metadata?.subscriptionId === 'string' ? metadata.subscriptionId : '';
  const paymentMethodId =
    typeof object?.payment_method?.id === 'string' ? object.payment_method.id : null;

  const now = new Date();
  const periodStart = yookassaIsoToDate(object?.paid_at) ?? now;
  const periodEnd = addUtcMonths(periodStart, 1);

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      let subscription = null;
      if (subscriptionId) {
        subscription = await tx.subscription.findFirst({ where: { id: subscriptionId, userId } });
      }
      if (!subscription) {
        subscription = await tx.subscription.findFirst({
          where: { userId, planCode: BILLING_PLAN_CODE },
          orderBy: { updatedAt: 'desc' },
        });
      }
      if (!subscription) {
        subscription = await tx.subscription.create({
          data: {
            userId,
            planCode: BILLING_PLAN_CODE,
            amountMinor: BILLING_AMOUNT_MINOR,
            currency: BILLING_CURRENCY,
            billingInterval: BILLING_INTERVAL,
            status: 'incomplete',
          },
        });
      }

      if (eventType === 'payment.succeeded') {
        subscription = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'active',
            paymentMethodId: paymentMethodId ?? subscription.paymentMethodId,
            lastPaymentId: paymentId,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            nextBillingAt: periodEnd,
            cancelAtPeriodEnd: false,
            canceledAt: null,
          },
        });
        await tx.billingEvent.create({
          data: {
            userId,
            subscriptionId: subscription.id,
            type: 'payment_succeeded',
            status: status ?? 'succeeded',
            yookassaEventId: eventId,
            yookassaPaymentId: paymentId,
            payload: event,
            processedAt: now,
          },
        });
        return { subscriptionId: subscription.id, status: 'active', applied: true };
      }

      if (eventType === 'payment.canceled') {
        subscription = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: 'past_due',
            lastPaymentId: paymentId,
          },
        });
        await tx.billingEvent.create({
          data: {
            userId,
            subscriptionId: subscription.id,
            type: 'payment_canceled',
            status: status ?? 'canceled',
            yookassaEventId: eventId,
            yookassaPaymentId: paymentId,
            payload: event,
            processedAt: now,
          },
        });
        return { subscriptionId: subscription.id, status: 'past_due', applied: true };
      }

      await tx.billingEvent.create({
        data: {
          userId,
          subscriptionId: subscription.id,
          type: 'checkout_created',
          status: status ?? eventType ?? 'received',
          yookassaEventId: eventId,
          yookassaPaymentId: paymentId,
          payload: event,
          processedAt: now,
        },
      });
      return { subscriptionId: subscription.id, status: subscription.status, applied: false };
    });
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      return { ok: true, duplicate: true };
    }
    throw e;
  }

  return { ok: true, duplicate: false, result };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ limit?: number, inFlightSet?: Set<string> }} [opts]
 */
export async function runRecurringBillingCycle(prisma, opts = {}) {
  const limit = Math.max(1, Math.min(100, Number(opts.limit) || 20));
  const now = new Date();
  const inFlight = opts.inFlightSet ?? new Set();
  const due = await prisma.subscription.findMany({
    where: {
      status: 'active',
      cancelAtPeriodEnd: false,
      paymentMethodId: { not: null },
      nextBillingAt: { lte: now },
    },
    orderBy: { nextBillingAt: 'asc' },
    take: limit,
  });

  let charged = 0;
  let failed = 0;
  let skipped = 0;
  for (const sub of due) {
    if (!sub.paymentMethodId) {
      skipped += 1;
      continue;
    }
    if (inFlight.has(sub.id)) {
      skipped += 1;
      continue;
    }
    inFlight.add(sub.id);
    try {
      const lockUntil = new Date(Date.now() + 10 * 60 * 1000);
      const lock = await prisma.subscription.updateMany({
        where: {
          id: sub.id,
          status: 'active',
          cancelAtPeriodEnd: false,
          nextBillingAt: sub.nextBillingAt,
        },
        data: {
          nextBillingAt: lockUntil,
        },
      });
      if (lock.count === 0) {
        skipped += 1;
        continue;
      }
      const { payment, idempotencyKey } = await createRecurringPayment({
        userId: sub.userId,
        subscriptionId: sub.id,
        paymentMethodId: sub.paymentMethodId,
      });
      await prisma.billingEvent.create({
        data: {
          userId: sub.userId,
          subscriptionId: sub.id,
          type: 'recurring_charge',
          status: String(payment?.status || 'pending'),
          idempotencyKey,
          yookassaPaymentId: typeof payment?.id === 'string' ? payment.id : null,
          payload: payment ?? null,
          processedAt: new Date(),
        },
      });
      charged += 1;
    } catch (e) {
      failed += 1;
      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: sub.id },
          data: { status: 'past_due', nextBillingAt: null },
        }),
        prisma.billingEvent.create({
          data: {
            userId: sub.userId,
            subscriptionId: sub.id,
            type: 'recurring_failed',
            status: 'error',
            payload: {
              message: e instanceof Error ? e.message : String(e),
            },
            processedAt: new Date(),
          },
        }),
      ]);
    } finally {
      inFlight.delete(sub.id);
    }
  }

  return { due: due.length, charged, failed, skipped };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export async function expireCancelAtPeriodEndSubscriptions(prisma) {
  const now = new Date();
  const out = await prisma.subscription.updateMany({
    where: {
      cancelAtPeriodEnd: true,
      status: { in: ['active', 'trialing', 'past_due'] },
      OR: [{ nextBillingAt: { lte: now } }, { nextBillingAt: null }],
    },
    data: {
      status: 'canceled',
      cancelAtPeriodEnd: false,
      canceledAt: now,
      nextBillingAt: null,
    },
  });
  return out.count;
}
