-- OrderStatus: recojo en tienda
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'READY_FOR_PICKUP';

-- StoreSettings: pagos, envíos y punto de recojo
ALTER TABLE "StoreSettings" ADD COLUMN "flatShippingFee" DECIMAL(12,2);
ALTER TABLE "StoreSettings" ADD COLUMN "pickupPointName" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN "pickupPointAddress" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN "pickupPointDistrict" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN "pickupPointProvince" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN "pickupPointDepartment" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN "pickupPointHours" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN "pickupPointPhone" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN "paymentCashEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StoreSettings" ADD COLUMN "paymentBankTransferEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StoreSettings" ADD COLUMN "paymentYapeEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StoreSettings" ADD COLUMN "paymentPlinEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StoreSettings" ADD COLUMN "bankTransferInstructions" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN "yapeNumber" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN "plinNumber" TEXT;
