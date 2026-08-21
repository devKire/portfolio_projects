ALTER TABLE "ChatMessage"
ADD COLUMN "taskId" TEXT,
ADD COLUMN "ticketId" TEXT,
ADD COLUMN "noteId" TEXT,
ADD COLUMN "clientNonce" TEXT,
ADD COLUMN "deletedById" TEXT,
ADD COLUMN "pinnedAt" TIMESTAMP(3),
ADD COLUMN "pinnedById" TEXT;

CREATE TABLE "ChatAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChatMessage_channelId_authorId_clientNonce_key" ON "ChatMessage"("channelId", "authorId", "clientNonce");
CREATE INDEX "ChatMessage_channelId_updatedAt_idx" ON "ChatMessage"("channelId", "updatedAt");
CREATE INDEX "ChatMessage_channelId_pinnedAt_idx" ON "ChatMessage"("channelId", "pinnedAt");
CREATE INDEX "ChatMessage_authorId_channelId_createdAt_idx" ON "ChatMessage"("authorId", "channelId", "createdAt");
CREATE INDEX "ChatMessage_taskId_idx" ON "ChatMessage"("taskId");
CREATE INDEX "ChatMessage_ticketId_idx" ON "ChatMessage"("ticketId");
CREATE INDEX "ChatMessage_noteId_idx" ON "ChatMessage"("noteId");

CREATE UNIQUE INDEX "ChatAttachment_storageKey_key" ON "ChatAttachment"("storageKey");
CREATE INDEX "ChatAttachment_messageId_idx" ON "ChatAttachment"("messageId");
CREATE INDEX "ChatAttachment_organizationId_createdAt_idx" ON "ChatAttachment"("organizationId", "createdAt");
CREATE INDEX "ChatAttachment_organizationId_fileName_idx" ON "ChatAttachment"("organizationId", "fileName");
CREATE INDEX "ChatAttachment_createdAt_idx" ON "ChatAttachment"("createdAt");

CREATE UNIQUE INDEX "ChatReaction_messageId_userId_emoji_key" ON "ChatReaction"("messageId", "userId", "emoji");
CREATE INDEX "ChatReaction_messageId_emoji_idx" ON "ChatReaction"("messageId", "emoji");
CREATE INDEX "ChatReaction_organizationId_userId_createdAt_idx" ON "ChatReaction"("organizationId", "userId", "createdAt");

ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChatAttachment" ADD CONSTRAINT "ChatAttachment_messageId_organizationId_fkey" FOREIGN KEY ("messageId", "organizationId") REFERENCES "ChatMessage"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatAttachment" ADD CONSTRAINT "ChatAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChatReaction" ADD CONSTRAINT "ChatReaction_messageId_organizationId_fkey" FOREIGN KEY ("messageId", "organizationId") REFERENCES "ChatMessage"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatReaction" ADD CONSTRAINT "ChatReaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatReaction" ADD CONSTRAINT "ChatReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
