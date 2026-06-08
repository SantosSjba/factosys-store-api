-- CreateEnum
CREATE TYPE "OrderDeliveryMethod" AS ENUM ('SHIPPING', 'PICKUP');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "deliveryMethod" "OrderDeliveryMethod" NOT NULL DEFAULT 'SHIPPING';
