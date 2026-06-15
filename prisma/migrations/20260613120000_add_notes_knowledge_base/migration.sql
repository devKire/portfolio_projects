-- CreateEnum
CREATE TYPE "NoteVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "NoteStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT,
    "visibility" "NoteVisibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "NoteStatus" NOT NULL DEFAULT 'DRAFT',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteTag" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoteTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NoteLink" (
    "id" TEXT NOT NULL,
    "sourceNoteId" TEXT NOT NULL,
    "targetNoteId" TEXT,
    "targetSlug" TEXT NOT NULL,
    "targetTitle" TEXT NOT NULL,
    "alias" TEXT,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "targetExists" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Note_slug_key" ON "Note"("slug");

-- CreateIndex
CREATE INDEX "Note_slug_idx" ON "Note"("slug");

-- CreateIndex
CREATE INDEX "Note_visibility_idx" ON "Note"("visibility");

-- CreateIndex
CREATE INDEX "Note_status_idx" ON "Note"("status");

-- CreateIndex
CREATE INDEX "Note_projectId_idx" ON "Note"("projectId");

-- CreateIndex
CREATE INDEX "Note_updatedAt_idx" ON "Note"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NoteTag_noteId_slug_key" ON "NoteTag"("noteId", "slug");

-- CreateIndex
CREATE INDEX "NoteTag_slug_idx" ON "NoteTag"("slug");

-- CreateIndex
CREATE INDEX "NoteTag_name_idx" ON "NoteTag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "NoteLink_sourceNoteId_targetSlug_key" ON "NoteLink"("sourceNoteId", "targetSlug");

-- CreateIndex
CREATE INDEX "NoteLink_targetNoteId_idx" ON "NoteLink"("targetNoteId");

-- CreateIndex
CREATE INDEX "NoteLink_targetSlug_idx" ON "NoteLink"("targetSlug");

-- CreateIndex
CREATE INDEX "NoteLink_targetExists_idx" ON "NoteLink"("targetExists");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteTag" ADD CONSTRAINT "NoteTag_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteLink" ADD CONSTRAINT "NoteLink_sourceNoteId_fkey" FOREIGN KEY ("sourceNoteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteLink" ADD CONSTRAINT "NoteLink_targetNoteId_fkey" FOREIGN KEY ("targetNoteId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;
