import { expireCancelAtPeriodEndSubscriptions, runRecurringBillingCycle } from './billingService.js';
import { isYookassaConfigured } from './yookassa.js';

function intervalMs() {
  const raw = Number(process.env.BILLING_CRON_INTERVAL_MS);
  if (!Number.isFinite(raw)) return 60_000;
  return Math.max(15_000, Math.min(60 * 60 * 1000, raw));
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export function startBillingScheduler(prisma) {
  if (!isYookassaConfigured()) {
    console.log('Billing scheduler: skipped (YOOKASSA_SHOP_ID/YOOKASSA_SECRET_KEY are not set)');
    return () => {};
  }

  const inFlightSet = new Set();
  let running = false;
  const step = async () => {
    if (running) return;
    running = true;
    try {
      const expired = await expireCancelAtPeriodEndSubscriptions(prisma);
      const recurring = await runRecurringBillingCycle(prisma, { inFlightSet, limit: 20 });
      if (expired > 0 || recurring.charged > 0 || recurring.failed > 0) {
        console.log(
          `Billing scheduler: expired=${expired}, due=${recurring.due}, charged=${recurring.charged}, failed=${recurring.failed}, skipped=${recurring.skipped}`,
        );
      }
    } catch (e) {
      console.error('Billing scheduler cycle failed:', e);
    } finally {
      running = false;
    }
  };

  void step();
  const timer = setInterval(() => {
    void step();
  }, intervalMs());

  return () => clearInterval(timer);
}
