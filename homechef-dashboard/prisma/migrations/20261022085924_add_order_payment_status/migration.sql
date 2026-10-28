-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- Backfill: every order that already exists predates payment tracking and has already
-- been fulfilled — treat it as settled so day one doesn't show a false historical backlog
-- on the "Amount payable" card. Only orders created from here on start at PENDING.
UPDATE "Order" SET "paymentStatus" = 'PAID';
