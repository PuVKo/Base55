-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'incomplete');

-- CreateEnum
CREATE TYPE "BillingEventType" AS ENUM (
    'checkout_created',
    'payment_succeeded',
    'payment_canceled',
    'recurring_charge',
    'recurring_failed',
    'subscription_canceled'
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "billingInterval" TEXT NOT NULL DEFAULT 'month',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'incomplete',
    "paymentMethodId" TEXT,
    "yookassaCustomerId" TEXT,
    "lastPaymentId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "nextBillingAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "type" "BillingEventType" NOT NULL,
    "status" TEXT,
    "yookassaEventId" TEXT,
    "yookassaPaymentId" TEXT,
    "idempotencyKey" TEXT,
    "payload" JSONB,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- CreateIndex
CREATE INDEX "Subscription_nextBillingAt_status_idx" ON "Subscription"("nextBillingAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BillingEvent_yookassaEventId_key" ON "BillingEvent"("yookassaEventId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingEvent_idempotencyKey_key" ON "BillingEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BillingEvent_userId_type_idx" ON "BillingEvent"("userId", "type");

-- CreateIndex
CREATE INDEX "BillingEvent_subscriptionId_createdAt_idx" ON "BillingEvent"("subscriptionId", "createdAt");

-- CreateIndex
CREATE INDEX "BillingEvent_yookassaPaymentId_idx" ON "BillingEvent"("yookassaPaymentId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
