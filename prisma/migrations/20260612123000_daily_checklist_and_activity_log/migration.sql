CREATE TABLE "DailyChecklistItem" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "period" TEXT NOT NULL,
  "timeRange" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DailyChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyChecklistEntry" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DailyChecklistEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskActivityLog" (
  "id" TEXT NOT NULL,
  "taskId" TEXT,
  "dailyChecklistItemId" TEXT,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaskActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyChecklistItem_slug_key" ON "DailyChecklistItem"("slug");
CREATE INDEX "DailyChecklistItem_period_idx" ON "DailyChecklistItem"("period");
CREATE INDEX "DailyChecklistItem_position_idx" ON "DailyChecklistItem"("position");

CREATE UNIQUE INDEX "DailyChecklistEntry_itemId_date_key" ON "DailyChecklistEntry"("itemId", "date");
CREATE INDEX "DailyChecklistEntry_date_idx" ON "DailyChecklistEntry"("date");

CREATE INDEX "TaskActivityLog_createdAt_idx" ON "TaskActivityLog"("createdAt");
CREATE INDEX "TaskActivityLog_taskId_idx" ON "TaskActivityLog"("taskId");
CREATE INDEX "TaskActivityLog_dailyChecklistItemId_idx" ON "TaskActivityLog"("dailyChecklistItemId");
CREATE INDEX "TaskActivityLog_type_idx" ON "TaskActivityLog"("type");

ALTER TABLE "DailyChecklistEntry"
ADD CONSTRAINT "DailyChecklistEntry_itemId_fkey"
FOREIGN KEY ("itemId") REFERENCES "DailyChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskActivityLog"
ADD CONSTRAINT "TaskActivityLog_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TaskActivityLog"
ADD CONSTRAINT "TaskActivityLog_dailyChecklistItemId_fkey"
FOREIGN KEY ("dailyChecklistItemId") REFERENCES "DailyChecklistItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
