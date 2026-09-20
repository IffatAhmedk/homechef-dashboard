-- AlterTable
ALTER TABLE "Order" ADD COLUMN "platformCutOverride" REAL;
ALTER TABLE "Order" ADD COLUMN "externalId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_externalId_key" ON "Order"("externalId");
