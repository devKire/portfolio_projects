-- KCS comments are additive and constrained to the same organization as their note.

CREATE UNIQUE INDEX "Note_id_organizationId_key" ON "Note"("id", "organizationId");

CREATE TABLE "NoteComment" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NoteComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NoteComment_organizationId_noteId_createdAt_idx" ON "NoteComment"("organizationId", "noteId", "createdAt");
CREATE INDEX "NoteComment_authorId_idx" ON "NoteComment"("authorId");

ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_noteId_organizationId_fkey"
FOREIGN KEY ("noteId", "organizationId") REFERENCES "Note"("id", "organizationId")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NoteComment" ADD CONSTRAINT "NoteComment_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
