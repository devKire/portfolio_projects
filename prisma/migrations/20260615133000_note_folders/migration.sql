-- AlterTable
ALTER TABLE "Note"
ADD COLUMN "folderId" TEXT,
ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "NoteFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "parentId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteFolder_pkey" PRIMARY KEY ("id")
);

-- Backfill folders from existing Obsidian-compatible paths.
WITH RECURSIVE note_paths AS (
    SELECT DISTINCT "folderPath" AS path
    FROM "Note"
    WHERE "folderPath" IS NOT NULL AND "folderPath" <> ''
),
folder_paths AS (
    SELECT path FROM note_paths
    UNION
    SELECT regexp_replace(path, '/[^/]+$', '') AS path
    FROM folder_paths
    WHERE path LIKE '%/%'
),
normalized_paths AS (
    SELECT DISTINCT path
    FROM folder_paths
    WHERE path IS NOT NULL AND path <> ''
),
folder_rows AS (
    SELECT
        md5(path) AS id,
        substring(path from '[^/]+$') AS name,
        path,
        CASE
            WHEN path LIKE '%/%' THEN md5(regexp_replace(path, '/[^/]+$', ''))
            ELSE NULL
        END AS "parentId",
        row_number() OVER (
            PARTITION BY CASE
                WHEN path LIKE '%/%' THEN regexp_replace(path, '/[^/]+$', '')
                ELSE NULL
            END
            ORDER BY substring(path from '[^/]+$')
        ) - 1 AS position
    FROM normalized_paths
)
INSERT INTO "NoteFolder" ("id", "name", "path", "parentId", "position", "updatedAt")
SELECT id, name, path, "parentId", position, CURRENT_TIMESTAMP
FROM folder_rows;

-- Link existing notes to backfilled folders.
UPDATE "Note"
SET "folderId" = md5("folderPath")
WHERE "folderPath" IS NOT NULL AND "folderPath" <> '';

-- CreateIndex
CREATE UNIQUE INDEX "NoteFolder_path_key" ON "NoteFolder"("path");

-- CreateIndex
CREATE INDEX "NoteFolder_parentId_idx" ON "NoteFolder"("parentId");

-- CreateIndex
CREATE INDEX "NoteFolder_path_idx" ON "NoteFolder"("path");

-- CreateIndex
CREATE INDEX "NoteFolder_position_idx" ON "NoteFolder"("position");

-- CreateIndex
CREATE INDEX "Note_folderId_idx" ON "Note"("folderId");

-- CreateIndex
CREATE INDEX "Note_position_idx" ON "Note"("position");

-- AddForeignKey
ALTER TABLE "NoteFolder" ADD CONSTRAINT "NoteFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "NoteFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "NoteFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
