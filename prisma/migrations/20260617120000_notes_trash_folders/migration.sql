-- AlterTable
ALTER TABLE "Note"
ADD COLUMN "statusBeforeTrash" "NoteStatus",
ADD COLUMN "trashedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "NoteFolder"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "trashedAt" TIMESTAMP(3),
ADD COLUMN "pathBeforeTrash" TEXT,
ADD COLUMN "parentIdBeforeTrash" TEXT;

-- CreateIndex
CREATE INDEX "Note_trashedAt_idx" ON "Note"("trashedAt");

-- CreateIndex
CREATE INDEX "NoteFolder_deletedAt_idx" ON "NoteFolder"("deletedAt");

-- CreateIndex
CREATE INDEX "NoteFolder_trashedAt_idx" ON "NoteFolder"("trashedAt");
