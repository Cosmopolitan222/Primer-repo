-- AlterTable
ALTER TABLE "NotificationLog" ADD COLUMN "reminderStepId" TEXT;

-- CreateIndex
CREATE INDEX "NotificationLog_appointmentId_reminderStepId_idx" ON "NotificationLog"("appointmentId", "reminderStepId");
