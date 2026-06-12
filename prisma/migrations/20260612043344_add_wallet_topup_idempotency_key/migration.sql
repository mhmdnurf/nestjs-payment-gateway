/*
  Warnings:

  - A unique constraint covering the columns `[userId,idempotencyKey]` on the table `wallet_top_ups` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "wallet_top_ups" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "wallet_top_ups_userId_idempotencyKey_key" ON "wallet_top_ups"("userId", "idempotencyKey");
