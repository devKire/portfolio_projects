-- AlterTable
ALTER TABLE "Note"
ADD COLUMN "fileName" TEXT,
ADD COLUMN "filePath" TEXT,
ADD COLUMN "folderPath" TEXT,
ADD COLUMN "folderName" TEXT,
ADD COLUMN "extension" TEXT,
ADD COLUMN "importedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "NoteAttachment" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "folderPath" TEXT,
    "folderName" TEXT,
    "extension" TEXT,
    "mimeType" TEXT,
    "size" INTEGER,
    "dataUrl" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Note_filePath_key" ON "Note"("filePath");

-- CreateIndex
CREATE INDEX "Note_folderPath_idx" ON "Note"("folderPath");

-- CreateIndex
CREATE UNIQUE INDEX "NoteAttachment_filePath_key" ON "NoteAttachment"("filePath");

-- CreateIndex
CREATE INDEX "NoteAttachment_folderPath_idx" ON "NoteAttachment"("folderPath");

-- CreateIndex
CREATE INDEX "NoteAttachment_fileName_idx" ON "NoteAttachment"("fileName");
