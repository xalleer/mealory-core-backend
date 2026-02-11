-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin', 'super_admin');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('free', 'pro', 'family_pro');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('pending', 'in_progress', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "SupportTicketPriority" AS ENUM ('low', 'normal', 'high', 'urgent');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'user',
ADD COLUMN     "subscription_expires_at" TIMESTAMP(3),
ADD COLUMN     "subscription_tier" "SubscriptionTier" NOT NULL DEFAULT 'free',
ADD COLUMN     "trial_ends_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'pending',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'normal',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
