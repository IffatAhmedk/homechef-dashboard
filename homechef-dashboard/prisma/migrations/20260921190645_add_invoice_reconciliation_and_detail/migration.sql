/*
  Warnings:

  - The `category` column on the `Expense` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "IngredientCategory" AS ENUM ('FOOD', 'PACKAGING');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('INGREDIENTS', 'PACKAGING', 'FOODPANDA_SUBSCRIPTION', 'ADVERTISING', 'ONBOARDING', 'UTILITIES', 'LABOUR', 'WASTAGE_SPOILAGE', 'BRANDING_PRINTING', 'STARTUP_INVESTMENT', 'OTHER');

-- AlterTable
ALTER TABLE "Expense" DROP COLUMN "category",
ADD COLUMN     "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN     "category" "IngredientCategory" NOT NULL DEFAULT 'FOOD';

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "batchYield" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "alreadyReceivedAmount" DOUBLE PRECISION,
ADD COLUMN     "commission" DOUBLE PRECISION,
ADD COLUMN     "commissionBase" DOUBLE PRECISION,
ADD COLUMN     "commissionRate" DOUBLE PRECISION,
ADD COLUMN     "deliveryMode" TEXT,
ADD COLUMN     "discountFundedByPlatform" DOUBLE PRECISION,
ADD COLUMN     "discountPaidByRestaurant" DOUBLE PRECISION,
ADD COLUMN     "foodGst" DOUBLE PRECISION,
ADD COLUMN     "incomeTaxWithholding" DOUBLE PRECISION,
ADD COLUMN     "invoiceId" TEXT,
ADD COLUMN     "onlinePaymentFee" DOUBLE PRECISION,
ADD COLUMN     "packagingFeesPaidByCustomer" DOUBLE PRECISION,
ADD COLUMN     "payableAmount" DOUBLE PRECISION,
ADD COLUMN     "restaurantRevenue" DOUBLE PRECISION,
ADD COLUMN     "salesTaxCollection" DOUBLE PRECISION,
ADD COLUMN     "salesTaxWithholding" DOUBLE PRECISION,
ADD COLUMN     "sstOnCommission" DOUBLE PRECISION,
ADD COLUMN     "voucherFundedByPlatform" DOUBLE PRECISION,
ADD COLUMN     "waitingTimeFee" DOUBLE PRECISION,
ADD COLUMN     "wastage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wastageRefundAmount" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "foodpandaPayout" DOUBLE PRECISION NOT NULL,
    "actualBankDeposit" DOUBLE PRECISION,
    "paymentDate" TIMESTAMP(3),
    "pendingAmount" DOUBLE PRECISION,
    "disputedAmount" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
