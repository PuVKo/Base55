-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "billingInterval" TEXT NOT NULL DEFAULT 'month',
    "status" TEXT NOT NULL DEFAULT 'incomplete',
    "paymentMethodId" TEXT,
    "yookassaCustomerId" TEXT,
    "lastPaymentId" TEXT,
    "currentPeriodStart" DATETIME,
    "currentPeriodEnd" DATETIME,
    "nextBillingAt" DATETIME,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT,
    "yookassaEventId" TEXT,
    "yookassaPaymentId" TEXT,
    "idempotencyKey" TEXT,
    "payload" JSONB,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BillingEvent_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE SET NULL ON UPDATE CASCADE
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
