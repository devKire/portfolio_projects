CREATE TYPE "ChatChannelType" AS ENUM ('ORGANIZATION', 'TEAM', 'PRIVATE', 'DIRECT');

CREATE TABLE "ChatChannel" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ChatChannelType" NOT NULL,
    "teamId" TEXT,
    "directKey" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChatChannel_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ChatChannel_type_target" CHECK (
      ("type" = 'TEAM' AND "teamId" IS NOT NULL AND "directKey" IS NULL) OR
      ("type" = 'DIRECT' AND "teamId" IS NULL AND "directKey" IS NOT NULL) OR
      ("type" IN ('ORGANIZATION', 'PRIVATE') AND "teamId" IS NULL AND "directKey" IS NULL)
    )
);

CREATE TABLE "ChatChannelMember" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatChannelMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "replyToId" TEXT,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessageUserMention" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ChatMessageUserMention_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessageTeamMention" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    CONSTRAINT "ChatMessageTeamMention_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatChannelReadState" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChatChannelReadState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChatChannel_id_organizationId_key" ON "ChatChannel"("id", "organizationId");
CREATE UNIQUE INDEX "ChatChannel_organizationId_name_key" ON "ChatChannel"("organizationId", "name");
CREATE UNIQUE INDEX "ChatChannel_organizationId_directKey_key" ON "ChatChannel"("organizationId", "directKey");
CREATE INDEX "ChatChannel_organizationId_type_idx" ON "ChatChannel"("organizationId", "type");
CREATE INDEX "ChatChannel_organizationId_teamId_idx" ON "ChatChannel"("organizationId", "teamId");
CREATE UNIQUE INDEX "ChatChannelMember_channelId_userId_key" ON "ChatChannelMember"("channelId", "userId");
CREATE INDEX "ChatChannelMember_organizationId_userId_idx" ON "ChatChannelMember"("organizationId", "userId");
CREATE UNIQUE INDEX "ChatMessage_id_organizationId_key" ON "ChatMessage"("id", "organizationId");
CREATE INDEX "ChatMessage_channelId_createdAt_idx" ON "ChatMessage"("channelId", "createdAt");
CREATE INDEX "ChatMessage_organizationId_authorId_createdAt_idx" ON "ChatMessage"("organizationId", "authorId", "createdAt");
CREATE INDEX "ChatMessage_replyToId_createdAt_idx" ON "ChatMessage"("replyToId", "createdAt");
CREATE INDEX "ChatMessage_eventId_idx" ON "ChatMessage"("eventId");
CREATE UNIQUE INDEX "ChatMessageUserMention_messageId_userId_key" ON "ChatMessageUserMention"("messageId", "userId");
CREATE INDEX "ChatMessageUserMention_organizationId_userId_idx" ON "ChatMessageUserMention"("organizationId", "userId");
CREATE UNIQUE INDEX "ChatMessageTeamMention_messageId_teamId_key" ON "ChatMessageTeamMention"("messageId", "teamId");
CREATE INDEX "ChatMessageTeamMention_organizationId_teamId_idx" ON "ChatMessageTeamMention"("organizationId", "teamId");
CREATE UNIQUE INDEX "ChatChannelReadState_channelId_userId_key" ON "ChatChannelReadState"("channelId", "userId");
CREATE INDEX "ChatChannelReadState_organizationId_userId_idx" ON "ChatChannelReadState"("organizationId", "userId");

ALTER TABLE "ChatChannel" ADD CONSTRAINT "ChatChannel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatChannel" ADD CONSTRAINT "ChatChannel_teamId_organizationId_fkey" FOREIGN KEY ("teamId", "organizationId") REFERENCES "Team"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatChannel" ADD CONSTRAINT "ChatChannel_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChatChannelMember" ADD CONSTRAINT "ChatChannelMember_channelId_organizationId_fkey" FOREIGN KEY ("channelId", "organizationId") REFERENCES "ChatChannel"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatChannelMember" ADD CONSTRAINT "ChatChannelMember_organizationId_userId_fkey" FOREIGN KEY ("organizationId", "userId") REFERENCES "OrganizationMember"("organizationId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_channelId_organizationId_fkey" FOREIGN KEY ("channelId", "organizationId") REFERENCES "ChatChannel"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatMessageUserMention" ADD CONSTRAINT "ChatMessageUserMention_messageId_organizationId_fkey" FOREIGN KEY ("messageId", "organizationId") REFERENCES "ChatMessage"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessageUserMention" ADD CONSTRAINT "ChatMessageUserMention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessageTeamMention" ADD CONSTRAINT "ChatMessageTeamMention_messageId_organizationId_fkey" FOREIGN KEY ("messageId", "organizationId") REFERENCES "ChatMessage"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessageTeamMention" ADD CONSTRAINT "ChatMessageTeamMention_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatMessageTeamMention" ADD CONSTRAINT "ChatMessageTeamMention_teamId_organizationId_fkey" FOREIGN KEY ("teamId", "organizationId") REFERENCES "Team"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatChannelReadState" ADD CONSTRAINT "ChatChannelReadState_channelId_organizationId_fkey" FOREIGN KEY ("channelId", "organizationId") REFERENCES "ChatChannel"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatChannelReadState" ADD CONSTRAINT "ChatChannelReadState_organizationId_userId_fkey" FOREIGN KEY ("organizationId", "userId") REFERENCES "OrganizationMember"("organizationId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ChatChannel" (
  "id", "organizationId", "name", "description", "type", "createdById", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  organization."id",
  'Geral',
  'Canal geral da organização.',
  'ORGANIZATION',
  organization."createdById",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Organization" organization
ON CONFLICT ("organizationId", "name") DO NOTHING;
