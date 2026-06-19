-- Multi-user tenant isolation.
-- Existing Admin credentials and all current application data are preserved.

CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'USER');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Admin") THEN
    RAISE EXCEPTION 'Multi-user migration requires the existing Admin row so its password hash can be preserved.';
  END IF;
END $$;

INSERT INTO "User" (
    "id",
    "name",
    "username",
    "email",
    "passwordHash",
    "role",
    "createdAt",
    "updatedAt"
)
SELECT
    admin_user."id",
    COALESCE(landing."name", admin_user."username"),
    lower(admin_user."username"),
    lower(
      COALESCE(
        NULLIF(contact."email", ''),
        admin_user."username" || '@legacy.local'
      )
    ),
    admin_user."password",
    'OWNER'::"UserRole",
    admin_user."createdAt",
    admin_user."updatedAt"
FROM (
    SELECT *
    FROM "Admin"
    ORDER BY "createdAt" ASC
    LIMIT 1
) AS admin_user
LEFT JOIN LATERAL (
    SELECT *
    FROM "LandingPage"
    ORDER BY "createdAt" ASC
    LIMIT 1
) AS landing ON true
LEFT JOIN "ContactInfo" AS contact
  ON contact."landingpageId" = landing."id";

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

ALTER TABLE "LandingPage" ADD COLUMN "userId" TEXT;
ALTER TABLE "Project" ADD COLUMN "userId" TEXT;
ALTER TABLE "TaskTemplate" ADD COLUMN "userId" TEXT;
ALTER TABLE "Task" ADD COLUMN "userId" TEXT;
ALTER TABLE "DailyChecklistItem" ADD COLUMN "userId" TEXT;
ALTER TABLE "DailyChecklistEntry" ADD COLUMN "userId" TEXT;
ALTER TABLE "TaskActivityLog" ADD COLUMN "userId" TEXT;
ALTER TABLE "Note" ADD COLUMN "userId" TEXT;
ALTER TABLE "NoteFolder" ADD COLUMN "userId" TEXT;
ALTER TABLE "NoteAttachment" ADD COLUMN "userId" TEXT;

UPDATE "LandingPage" SET "userId" = (SELECT "id" FROM "User" WHERE "role" = 'OWNER' LIMIT 1);
UPDATE "Project" SET "userId" = (SELECT "id" FROM "User" WHERE "role" = 'OWNER' LIMIT 1);
UPDATE "TaskTemplate" SET "userId" = (SELECT "id" FROM "User" WHERE "role" = 'OWNER' LIMIT 1);
UPDATE "TimeEntry" SET "userId" = (SELECT "id" FROM "User" WHERE "role" = 'OWNER' LIMIT 1);
UPDATE "Task" SET "userId" = (SELECT "id" FROM "User" WHERE "role" = 'OWNER' LIMIT 1);
UPDATE "DailyChecklistItem" SET "userId" = (SELECT "id" FROM "User" WHERE "role" = 'OWNER' LIMIT 1);
UPDATE "DailyChecklistEntry" SET "userId" = (SELECT "id" FROM "User" WHERE "role" = 'OWNER' LIMIT 1);
UPDATE "TaskActivityLog" SET "userId" = (SELECT "id" FROM "User" WHERE "role" = 'OWNER' LIMIT 1);
UPDATE "Note" SET "userId" = (SELECT "id" FROM "User" WHERE "role" = 'OWNER' LIMIT 1);
UPDATE "NoteFolder" SET "userId" = (SELECT "id" FROM "User" WHERE "role" = 'OWNER' LIMIT 1);
UPDATE "NoteAttachment" SET "userId" = (SELECT "id" FROM "User" WHERE "role" = 'OWNER' LIMIT 1);

ALTER TABLE "LandingPage" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Project" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "TaskTemplate" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "TimeEntry" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Task" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "DailyChecklistItem" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "DailyChecklistEntry" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "TaskActivityLog" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Note" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "NoteFolder" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "NoteAttachment" ALTER COLUMN "userId" SET NOT NULL;

DROP INDEX "DailyChecklistItem_slug_key";
DROP INDEX "DailyChecklistItem_period_idx";
DROP INDEX "DailyChecklistItem_position_idx";
DROP INDEX "DailyChecklistEntry_itemId_date_key";
DROP INDEX "DailyChecklistEntry_date_idx";
DROP INDEX "TaskActivityLog_createdAt_idx";
DROP INDEX "TaskActivityLog_taskId_idx";
DROP INDEX "TaskActivityLog_dailyChecklistItemId_idx";
DROP INDEX "TaskActivityLog_type_idx";
DROP INDEX "Task_status_idx";
DROP INDEX "Task_projectId_idx";
DROP INDEX "Task_sprintId_idx";
DROP INDEX "Task_noteId_idx";
DROP INDEX "Note_slug_key";
DROP INDEX "Note_slug_idx";
DROP INDEX "Note_visibility_idx";
DROP INDEX "Note_status_idx";
DROP INDEX "Note_trashedAt_idx";
DROP INDEX "Note_projectId_idx";
DROP INDEX "Note_folderPath_idx";
DROP INDEX "Note_folderId_idx";
DROP INDEX "Note_position_idx";
DROP INDEX "Note_updatedAt_idx";
DROP INDEX "Note_filePath_key";
DROP INDEX "NoteFolder_path_key";
DROP INDEX "NoteFolder_parentId_idx";
DROP INDEX "NoteFolder_path_idx";
DROP INDEX "NoteFolder_position_idx";
DROP INDEX "NoteFolder_deletedAt_idx";
DROP INDEX "NoteFolder_trashedAt_idx";
DROP INDEX "NoteAttachment_filePath_key";
DROP INDEX "NoteAttachment_folderPath_idx";
DROP INDEX "NoteAttachment_fileName_idx";

CREATE INDEX "LandingPage_userId_idx" ON "LandingPage"("userId");
CREATE INDEX "LandingPage_userId_updatedAt_idx" ON "LandingPage"("userId", "updatedAt");

CREATE INDEX "Project_userId_idx" ON "Project"("userId");
CREATE INDEX "Project_userId_position_idx" ON "Project"("userId", "position");
CREATE INDEX "Project_userId_isActive_idx" ON "Project"("userId", "isActive");

CREATE INDEX "TaskTemplate_userId_idx" ON "TaskTemplate"("userId");

CREATE INDEX "TimeEntry_userId_idx" ON "TimeEntry"("userId");
CREATE INDEX "TimeEntry_userId_taskId_idx" ON "TimeEntry"("userId", "taskId");
CREATE INDEX "TimeEntry_userId_date_idx" ON "TimeEntry"("userId", "date");

CREATE INDEX "Task_userId_idx" ON "Task"("userId");
CREATE INDEX "Task_userId_status_idx" ON "Task"("userId", "status");
CREATE INDEX "Task_userId_projectId_idx" ON "Task"("userId", "projectId");
CREATE INDEX "Task_userId_sprintId_idx" ON "Task"("userId", "sprintId");
CREATE INDEX "Task_userId_noteId_idx" ON "Task"("userId", "noteId");
CREATE INDEX "Task_userId_updatedAt_idx" ON "Task"("userId", "updatedAt");

CREATE UNIQUE INDEX "DailyChecklistItem_userId_slug_key" ON "DailyChecklistItem"("userId", "slug");
CREATE INDEX "DailyChecklistItem_userId_idx" ON "DailyChecklistItem"("userId");
CREATE INDEX "DailyChecklistItem_userId_period_idx" ON "DailyChecklistItem"("userId", "period");
CREATE INDEX "DailyChecklistItem_userId_position_idx" ON "DailyChecklistItem"("userId", "position");

CREATE UNIQUE INDEX "DailyChecklistEntry_userId_itemId_date_key" ON "DailyChecklistEntry"("userId", "itemId", "date");
CREATE INDEX "DailyChecklistEntry_userId_idx" ON "DailyChecklistEntry"("userId");
CREATE INDEX "DailyChecklistEntry_userId_date_idx" ON "DailyChecklistEntry"("userId", "date");

CREATE INDEX "TaskActivityLog_userId_idx" ON "TaskActivityLog"("userId");
CREATE INDEX "TaskActivityLog_userId_createdAt_idx" ON "TaskActivityLog"("userId", "createdAt");
CREATE INDEX "TaskActivityLog_userId_taskId_idx" ON "TaskActivityLog"("userId", "taskId");
CREATE INDEX "TaskActivityLog_userId_dailyChecklistItemId_idx" ON "TaskActivityLog"("userId", "dailyChecklistItemId");
CREATE INDEX "TaskActivityLog_userId_type_idx" ON "TaskActivityLog"("userId", "type");

CREATE UNIQUE INDEX "Note_userId_slug_key" ON "Note"("userId", "slug");
CREATE UNIQUE INDEX "Note_userId_filePath_key" ON "Note"("userId", "filePath");
CREATE INDEX "Note_userId_idx" ON "Note"("userId");
CREATE INDEX "Note_userId_visibility_idx" ON "Note"("userId", "visibility");
CREATE INDEX "Note_userId_status_idx" ON "Note"("userId", "status");
CREATE INDEX "Note_userId_trashedAt_idx" ON "Note"("userId", "trashedAt");
CREATE INDEX "Note_userId_projectId_idx" ON "Note"("userId", "projectId");
CREATE INDEX "Note_userId_folderPath_idx" ON "Note"("userId", "folderPath");
CREATE INDEX "Note_userId_folderId_idx" ON "Note"("userId", "folderId");
CREATE INDEX "Note_userId_position_idx" ON "Note"("userId", "position");
CREATE INDEX "Note_userId_updatedAt_idx" ON "Note"("userId", "updatedAt");

CREATE UNIQUE INDEX "NoteFolder_userId_path_key" ON "NoteFolder"("userId", "path");
CREATE INDEX "NoteFolder_userId_idx" ON "NoteFolder"("userId");
CREATE INDEX "NoteFolder_userId_parentId_idx" ON "NoteFolder"("userId", "parentId");
CREATE INDEX "NoteFolder_userId_position_idx" ON "NoteFolder"("userId", "position");
CREATE INDEX "NoteFolder_userId_deletedAt_idx" ON "NoteFolder"("userId", "deletedAt");
CREATE INDEX "NoteFolder_userId_trashedAt_idx" ON "NoteFolder"("userId", "trashedAt");

CREATE UNIQUE INDEX "NoteAttachment_userId_filePath_key" ON "NoteAttachment"("userId", "filePath");
CREATE INDEX "NoteAttachment_userId_idx" ON "NoteAttachment"("userId");
CREATE INDEX "NoteAttachment_userId_folderPath_idx" ON "NoteAttachment"("userId", "folderPath");
CREATE INDEX "NoteAttachment_userId_fileName_idx" ON "NoteAttachment"("userId", "fileName");

ALTER TABLE "UserSession"
ADD CONSTRAINT "UserSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LandingPage"
ADD CONSTRAINT "LandingPage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Project"
ADD CONSTRAINT "Project_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskTemplate"
ADD CONSTRAINT "TaskTemplate_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimeEntry"
ADD CONSTRAINT "TimeEntry_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task"
ADD CONSTRAINT "Task_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DailyChecklistItem"
ADD CONSTRAINT "DailyChecklistItem_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DailyChecklistEntry"
ADD CONSTRAINT "DailyChecklistEntry_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskActivityLog"
ADD CONSTRAINT "TaskActivityLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Note"
ADD CONSTRAINT "Note_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NoteFolder"
ADD CONSTRAINT "NoteFolder_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NoteAttachment"
ADD CONSTRAINT "NoteAttachment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
