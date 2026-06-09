-- CreateEnum
CREATE TYPE "OrderPaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'YAPE', 'PLIN', 'CARD', 'GATEWAY');
CREATE TYPE "AdminAuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'UPLOAD', 'IMPORT', 'EXPORT');
CREATE TYPE "ReturnRequestStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED', 'CANCELLED');
CREATE TYPE "ReturnRequestReason" AS ENUM ('DEFECTIVE', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'CHANGED_MIND', 'OTHER');
CREATE TYPE "PaymentGatewayProvider" AS ENUM ('CULQI', 'MERCADO_PAGO', 'STRIPE');
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- AlterTable Order
ALTER TABLE "Order" ADD COLUMN "paymentMethod" "OrderPaymentMethod";
ALTER TABLE "Order" ADD COLUMN "trackingNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN "carrier" TEXT;
ALTER TABLE "Order" ADD COLUMN "trackingUrl" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingNotes" TEXT;

-- CreateTable AdminAuditLog
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AdminAuditAction" NOT NULL,
    "module" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable ShippingZone
CREATE TABLE "ShippingZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "province" TEXT,
    "flatFee" DECIMAL(12,2) NOT NULL,
    "freeShippingMinAmount" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable OrderPaymentEvidence
CREATE TABLE "OrderPaymentEvidence" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentMethod" "OrderPaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2),
    "note" TEXT,
    "fileName" TEXT,
    "storageKey" TEXT,
    "fileUrl" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderPaymentEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable MediaAsset
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "folder" TEXT,
    "alt" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable ReturnRequest
CREATE TABLE "ReturnRequest" (
    "id" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "ReturnRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" "ReturnRequestReason" NOT NULL,
    "reasonNote" TEXT,
    "restockItems" BOOLEAN NOT NULL DEFAULT true,
    "refundAmount" DECIMAL(12,2),
    "internalNotes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "handledById" TEXT,
    CONSTRAINT "ReturnRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable ReturnRequestItem
CREATE TABLE "ReturnRequestItem" (
    "id" TEXT NOT NULL,
    "returnRequestId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "ReturnRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable PaymentGatewayConfig
CREATE TABLE "PaymentGatewayConfig" (
    "id" TEXT NOT NULL,
    "provider" "PaymentGatewayProvider" NOT NULL,
    "displayName" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isTestMode" BOOLEAN NOT NULL DEFAULT true,
    "publicKey" TEXT,
    "secretKey" TEXT,
    "webhookSecret" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentGatewayConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable PaymentTransaction
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "PaymentGatewayProvider" NOT NULL,
    "externalId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'PEN',
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminAuditLog_module_createdAt_idx" ON "AdminAuditLog"("module", "createdAt");
CREATE INDEX "AdminAuditLog_userId_createdAt_idx" ON "AdminAuditLog"("userId", "createdAt");
CREATE INDEX "AdminAuditLog_entityType_entityId_idx" ON "AdminAuditLog"("entityType", "entityId");
CREATE INDEX "ShippingZone_isActive_sortOrder_idx" ON "ShippingZone"("isActive", "sortOrder");
CREATE INDEX "ShippingZone_department_province_idx" ON "ShippingZone"("department", "province");
CREATE INDEX "OrderPaymentEvidence_orderId_createdAt_idx" ON "OrderPaymentEvidence"("orderId", "createdAt");
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");
CREATE INDEX "MediaAsset_folder_createdAt_idx" ON "MediaAsset"("folder", "createdAt");
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");
CREATE UNIQUE INDEX "ReturnRequest_returnNumber_key" ON "ReturnRequest"("returnNumber");
CREATE INDEX "ReturnRequest_orderId_idx" ON "ReturnRequest"("orderId");
CREATE INDEX "ReturnRequest_status_requestedAt_idx" ON "ReturnRequest"("status", "requestedAt");
CREATE INDEX "ReturnRequestItem_returnRequestId_idx" ON "ReturnRequestItem"("returnRequestId");
CREATE UNIQUE INDEX "PaymentGatewayConfig_provider_key" ON "PaymentGatewayConfig"("provider");
CREATE INDEX "PaymentTransaction_orderId_createdAt_idx" ON "PaymentTransaction"("orderId", "createdAt");
CREATE INDEX "PaymentTransaction_provider_externalId_idx" ON "PaymentTransaction"("provider", "externalId");

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderPaymentEvidence" ADD CONSTRAINT "OrderPaymentEvidence_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderPaymentEvidence" ADD CONSTRAINT "OrderPaymentEvidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReturnRequestItem" ADD CONSTRAINT "ReturnRequestItem_returnRequestId_fkey" FOREIGN KEY ("returnRequestId") REFERENCES "ReturnRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReturnRequestItem" ADD CONSTRAINT "ReturnRequestItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed payment gateways
INSERT INTO "PaymentGatewayConfig" ("id", "provider", "displayName", "isEnabled", "isTestMode", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'CULQI', 'Culqi', false, true, NOW()),
  (gen_random_uuid()::text, 'MERCADO_PAGO', 'Mercado Pago', false, true, NOW()),
  (gen_random_uuid()::text, 'STRIPE', 'Stripe', false, true, NOW());
