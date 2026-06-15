-- AlterTable
ALTER TABLE "Task" ADD COLUMN "noteId" TEXT;
ALTER TABLE "Task" ADD COLUMN "noteTaskKey" TEXT;

-- CreateIndex
CREATE INDEX "Task_noteId_idx" ON "Task"("noteId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_noteId_noteTaskKey_key" ON "Task"("noteId", "noteTaskKey");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;
