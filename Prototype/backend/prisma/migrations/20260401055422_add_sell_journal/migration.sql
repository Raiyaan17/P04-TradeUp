/*
  Warnings:

  - You are about to drop the `Notification` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "SellReason" AS ENUM ('TARGET_HIT', 'PANIC_EMOTION', 'NEEDED_CASH');

-- DropForeignKey
ALTER TABLE "public"."Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "sellNote" TEXT,
ADD COLUMN     "sellReason" "SellReason";

-- DropTable
DROP TABLE "public"."Notification";

-- DropEnum
DROP TYPE "public"."NotificationType";
