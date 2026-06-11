/*
  Warnings:

  - You are about to drop the `WalletTopUp` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "WalletTopUp" DROP CONSTRAINT "WalletTopUp_userId_fkey";

-- DropTable
DROP TABLE "WalletTopUp";

-- CreateTable
CREATE TABLE "wallet_top_ups" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT NOT NULL,
    "xenditInvoiceId" TEXT,
    "xenditInvoiceUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_top_ups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_top_ups_reference_key" ON "wallet_top_ups"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_top_ups_xenditInvoiceId_key" ON "wallet_top_ups"("xenditInvoiceId");

-- CreateIndex
CREATE INDEX "wallet_top_ups_userId_status_idx" ON "wallet_top_ups"("userId", "status");

-- AddForeignKey
ALTER TABLE "wallet_top_ups" ADD CONSTRAINT "wallet_top_ups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
