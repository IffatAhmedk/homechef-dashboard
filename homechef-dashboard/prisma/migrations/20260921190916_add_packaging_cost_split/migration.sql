-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "packagingCostPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "packagingCostAtSale" DOUBLE PRECISION NOT NULL DEFAULT 0;
