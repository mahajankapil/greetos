/*
  Warnings:

  - You are about to drop the column `shiprocketAwb` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shiprocketCourier` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shiprocketMode` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shiprocketOrderId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shiprocketPushedAt` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shiprocketShipmentId` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shiprocketStatus` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `shiprocketAwb` on the `ReturnRequest` table. All the data in the column will be lost.
  - You are about to drop the column `shiprocketMode` on the `ReturnRequest` table. All the data in the column will be lost.
  - You are about to drop the column `shiprocketPushedAt` on the `ReturnRequest` table. All the data in the column will be lost.
  - You are about to drop the column `shiprocketReturnId` on the `ReturnRequest` table. All the data in the column will be lost.
  - You are about to drop the column `shiprocketShipmentId` on the `ReturnRequest` table. All the data in the column will be lost.
  - You are about to drop the column `shiprocketStatus` on the `ReturnRequest` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "shiprocketAwb",
DROP COLUMN "shiprocketCourier",
DROP COLUMN "shiprocketMode",
DROP COLUMN "shiprocketOrderId",
DROP COLUMN "shiprocketPushedAt",
DROP COLUMN "shiprocketShipmentId",
DROP COLUMN "shiprocketStatus",
ADD COLUMN     "courierName" TEXT,
ADD COLUMN     "dispatchedAt" TIMESTAMP(3),
ADD COLUMN     "trackingNumber" TEXT,
ADD COLUMN     "trackingUrl" TEXT;

-- AlterTable
ALTER TABLE "ReturnRequest" DROP COLUMN "shiprocketAwb",
DROP COLUMN "shiprocketMode",
DROP COLUMN "shiprocketPushedAt",
DROP COLUMN "shiprocketReturnId",
DROP COLUMN "shiprocketShipmentId",
DROP COLUMN "shiprocketStatus",
ADD COLUMN     "pickedUpAt" TIMESTAMP(3),
ADD COLUMN     "returnCourierName" TEXT,
ADD COLUMN     "returnTrackingNumber" TEXT;
