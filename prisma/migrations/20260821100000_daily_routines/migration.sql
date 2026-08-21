CREATE TABLE "DailyRoutine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyRoutine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DailyRoutineSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyRoutineSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RoutineDateOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RoutineDateOverride_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DailyChecklistItem" ADD COLUMN "routineId" TEXT;
ALTER TABLE "DailyChecklistEntry"
    ADD COLUMN "routineId" TEXT,
    ADD COLUMN "routineNameSnapshot" TEXT,
    ADD COLUMN "itemTitleSnapshot" TEXT,
    ADD COLUMN "itemDescriptionSnapshot" TEXT,
    ADD COLUMN "periodSnapshot" TEXT,
    ADD COLUMN "timeRangeSnapshot" TEXT,
    ADD COLUMN "startTimeSnapshot" TEXT,
    ADD COLUMN "endTimeSnapshot" TEXT,
    ADD COLUMN "positionSnapshot" INTEGER,
    ADD COLUMN "isSacredSnapshot" BOOLEAN;

INSERT INTO "DailyRoutine" (
    "id", "userId", "name", "description", "color", "active", "isDefault", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    "userId",
    'Rotina atual',
    'Rotina criada automaticamente para preservar o checklist existente.',
    '#8b5cf6',
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "DailyChecklistItem"
GROUP BY "userId";

UPDATE "DailyChecklistItem" item
SET "routineId" = routine."id"
FROM "DailyRoutine" routine
WHERE routine."userId" = item."userId" AND routine."isDefault" = true;

UPDATE "DailyChecklistEntry" entry
SET
    "routineId" = item."routineId",
    "routineNameSnapshot" = routine."name",
    "itemTitleSnapshot" = item."title",
    "itemDescriptionSnapshot" = item."description",
    "periodSnapshot" = item."period",
    "timeRangeSnapshot" = item."timeRange",
    "startTimeSnapshot" = item."startTime",
    "endTimeSnapshot" = item."endTime",
    "positionSnapshot" = item."position",
    "isSacredSnapshot" = item."isSacred"
FROM "DailyChecklistItem" item
JOIN "DailyRoutine" routine ON routine."id" = item."routineId"
WHERE entry."itemId" = item."id" AND entry."userId" = item."userId";

ALTER TABLE "DailyChecklistItem" ALTER COLUMN "routineId" SET NOT NULL;
ALTER TABLE "DailyChecklistEntry"
    ALTER COLUMN "routineId" SET NOT NULL,
    ALTER COLUMN "routineNameSnapshot" SET NOT NULL,
    ALTER COLUMN "itemTitleSnapshot" SET NOT NULL,
    ALTER COLUMN "itemDescriptionSnapshot" SET NOT NULL,
    ALTER COLUMN "periodSnapshot" SET NOT NULL,
    ALTER COLUMN "timeRangeSnapshot" SET NOT NULL,
    ALTER COLUMN "positionSnapshot" SET NOT NULL,
    ALTER COLUMN "isSacredSnapshot" SET NOT NULL;

DROP INDEX "DailyChecklistItem_userId_slug_key";
DROP INDEX "DailyChecklistItem_userId_period_idx";
DROP INDEX "DailyChecklistItem_userId_position_idx";
ALTER TABLE "DailyChecklistEntry" DROP CONSTRAINT "DailyChecklistEntry_itemId_fkey";

CREATE UNIQUE INDEX "DailyRoutine_id_userId_key" ON "DailyRoutine"("id", "userId");
CREATE UNIQUE INDEX "DailyRoutine_userId_name_key" ON "DailyRoutine"("userId", "name");
CREATE INDEX "DailyRoutine_userId_active_idx" ON "DailyRoutine"("userId", "active");
CREATE INDEX "DailyRoutine_userId_isDefault_idx" ON "DailyRoutine"("userId", "isDefault");
CREATE UNIQUE INDEX "DailyRoutineSchedule_userId_weekday_key" ON "DailyRoutineSchedule"("userId", "weekday");
CREATE INDEX "DailyRoutineSchedule_routineId_idx" ON "DailyRoutineSchedule"("routineId");
CREATE UNIQUE INDEX "RoutineDateOverride_userId_date_key" ON "RoutineDateOverride"("userId", "date");
CREATE INDEX "RoutineDateOverride_routineId_date_idx" ON "RoutineDateOverride"("routineId", "date");
CREATE UNIQUE INDEX "DailyChecklistItem_id_userId_key" ON "DailyChecklistItem"("id", "userId");
CREATE UNIQUE INDEX "DailyChecklistItem_userId_routineId_slug_key" ON "DailyChecklistItem"("userId", "routineId", "slug");
CREATE INDEX "DailyChecklistItem_routineId_active_idx" ON "DailyChecklistItem"("routineId", "active");
CREATE INDEX "DailyChecklistItem_routineId_period_idx" ON "DailyChecklistItem"("routineId", "period");
CREATE INDEX "DailyChecklistItem_routineId_position_idx" ON "DailyChecklistItem"("routineId", "position");
CREATE INDEX "DailyChecklistEntry_routineId_date_idx" ON "DailyChecklistEntry"("routineId", "date");

ALTER TABLE "DailyRoutine" ADD CONSTRAINT "DailyRoutine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyRoutineSchedule" ADD CONSTRAINT "DailyRoutineSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyRoutineSchedule" ADD CONSTRAINT "DailyRoutineSchedule_routineId_userId_fkey" FOREIGN KEY ("routineId", "userId") REFERENCES "DailyRoutine"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoutineDateOverride" ADD CONSTRAINT "RoutineDateOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoutineDateOverride" ADD CONSTRAINT "RoutineDateOverride_routineId_userId_fkey" FOREIGN KEY ("routineId", "userId") REFERENCES "DailyRoutine"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DailyChecklistItem" ADD CONSTRAINT "DailyChecklistItem_routineId_userId_fkey" FOREIGN KEY ("routineId", "userId") REFERENCES "DailyRoutine"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyChecklistEntry" ADD CONSTRAINT "DailyChecklistEntry_routineId_userId_fkey" FOREIGN KEY ("routineId", "userId") REFERENCES "DailyRoutine"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DailyChecklistEntry" ADD CONSTRAINT "DailyChecklistEntry_itemId_userId_fkey" FOREIGN KEY ("itemId", "userId") REFERENCES "DailyChecklistItem"("id", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;
