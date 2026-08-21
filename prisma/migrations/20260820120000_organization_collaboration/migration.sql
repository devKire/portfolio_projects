-- Organization collaboration is additive. Legacy personal records remain personal.

CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED');
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "TicketActivityType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'ASSIGNEE_CHANGED', 'QUEUE_CHANGED', 'PRIORITY_CHANGED', 'TEAM_CHANGED', 'COMMENTED', 'RESOLVED', 'CLOSED');

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "avatarUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketQueue" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "teamId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TicketQueue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketQueueAgent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketQueueAgent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "queueId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "teamId" TEXT,
    "linkedTaskId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketActivity" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "TicketActivityType" NOT NULL,
    "message" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketActivity_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Task"
ADD COLUMN "assigneeId" TEXT,
ADD COLUMN "createdById" TEXT,
ADD COLUMN "organizationId" TEXT,
ADD COLUMN "teamId" TEXT;

ALTER TABLE "Note" ADD COLUMN "organizationId" TEXT, ADD COLUMN "scopeKey" TEXT;
ALTER TABLE "NoteFolder" ADD COLUMN "organizationId" TEXT, ADD COLUMN "scopeKey" TEXT;
ALTER TABLE "NoteAttachment" ADD COLUMN "organizationId" TEXT, ADD COLUMN "scopeKey" TEXT;

UPDATE "Note" SET "scopeKey" = 'user:' || "userId";
UPDATE "NoteFolder" SET "scopeKey" = 'user:' || "userId";
UPDATE "NoteAttachment" SET "scopeKey" = 'user:' || "userId";

ALTER TABLE "Note" ALTER COLUMN "scopeKey" SET NOT NULL;
ALTER TABLE "NoteFolder" ALTER COLUMN "scopeKey" SET NOT NULL;
ALTER TABLE "NoteAttachment" ALTER COLUMN "scopeKey" SET NOT NULL;

DROP INDEX "Note_userId_filePath_key";
DROP INDEX "Note_userId_slug_key";
DROP INDEX "NoteAttachment_userId_filePath_key";
DROP INDEX "NoteFolder_userId_path_key";

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_createdById_idx" ON "Organization"("createdById");
CREATE INDEX "Organization_active_name_idx" ON "Organization"("active", "name");
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");
CREATE INDEX "OrganizationMember_organizationId_role_idx" ON "OrganizationMember"("organizationId", "role");
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

CREATE INDEX "Team_organizationId_active_idx" ON "Team"("organizationId", "active");
CREATE UNIQUE INDEX "Team_organizationId_name_key" ON "Team"("organizationId", "name");
CREATE UNIQUE INDEX "Team_id_organizationId_key" ON "Team"("id", "organizationId");
CREATE INDEX "TeamMember_organizationId_userId_idx" ON "TeamMember"("organizationId", "userId");
CREATE INDEX "TeamMember_organizationId_teamId_idx" ON "TeamMember"("organizationId", "teamId");
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

CREATE INDEX "TicketQueue_organizationId_active_idx" ON "TicketQueue"("organizationId", "active");
CREATE INDEX "TicketQueue_organizationId_teamId_idx" ON "TicketQueue"("organizationId", "teamId");
CREATE UNIQUE INDEX "TicketQueue_organizationId_name_key" ON "TicketQueue"("organizationId", "name");
CREATE UNIQUE INDEX "TicketQueue_id_organizationId_key" ON "TicketQueue"("id", "organizationId");
CREATE INDEX "TicketQueueAgent_organizationId_userId_idx" ON "TicketQueueAgent"("organizationId", "userId");
CREATE INDEX "TicketQueueAgent_organizationId_queueId_idx" ON "TicketQueueAgent"("organizationId", "queueId");
CREATE UNIQUE INDEX "TicketQueueAgent_queueId_userId_key" ON "TicketQueueAgent"("queueId", "userId");

CREATE UNIQUE INDEX "Ticket_linkedTaskId_key" ON "Ticket"("linkedTaskId");
CREATE INDEX "Ticket_organizationId_status_idx" ON "Ticket"("organizationId", "status");
CREATE INDEX "Ticket_organizationId_queueId_status_idx" ON "Ticket"("organizationId", "queueId", "status");
CREATE INDEX "Ticket_organizationId_teamId_status_idx" ON "Ticket"("organizationId", "teamId", "status");
CREATE INDEX "Ticket_organizationId_assigneeId_status_idx" ON "Ticket"("organizationId", "assigneeId", "status");
CREATE INDEX "Ticket_organizationId_requesterId_idx" ON "Ticket"("organizationId", "requesterId");
CREATE INDEX "Ticket_organizationId_priority_idx" ON "Ticket"("organizationId", "priority");
CREATE INDEX "Ticket_updatedAt_idx" ON "Ticket"("updatedAt");
CREATE INDEX "TicketActivity_ticketId_createdAt_idx" ON "TicketActivity"("ticketId", "createdAt");
CREATE INDEX "TicketActivity_actorId_idx" ON "TicketActivity"("actorId");
CREATE INDEX "TicketActivity_type_idx" ON "TicketActivity"("type");

CREATE INDEX "Note_organizationId_idx" ON "Note"("organizationId");
CREATE INDEX "Note_scopeKey_idx" ON "Note"("scopeKey");
CREATE UNIQUE INDEX "Note_scopeKey_slug_key" ON "Note"("scopeKey", "slug");
CREATE UNIQUE INDEX "Note_scopeKey_filePath_key" ON "Note"("scopeKey", "filePath");
CREATE INDEX "NoteFolder_organizationId_idx" ON "NoteFolder"("organizationId");
CREATE INDEX "NoteFolder_scopeKey_idx" ON "NoteFolder"("scopeKey");
CREATE UNIQUE INDEX "NoteFolder_scopeKey_path_key" ON "NoteFolder"("scopeKey", "path");
CREATE INDEX "NoteAttachment_organizationId_idx" ON "NoteAttachment"("organizationId");
CREATE INDEX "NoteAttachment_scopeKey_idx" ON "NoteAttachment"("scopeKey");
CREATE UNIQUE INDEX "NoteAttachment_scopeKey_filePath_key" ON "NoteAttachment"("scopeKey", "filePath");

CREATE INDEX "Task_organizationId_status_idx" ON "Task"("organizationId", "status");
CREATE INDEX "Task_organizationId_teamId_status_idx" ON "Task"("organizationId", "teamId", "status");
CREATE INDEX "Task_organizationId_assigneeId_status_idx" ON "Task"("organizationId", "assigneeId", "status");
CREATE INDEX "Task_createdById_idx" ON "Task"("createdById");

ALTER TABLE "Organization" ADD CONSTRAINT "Organization_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_organizationId_fkey" FOREIGN KEY ("teamId", "organizationId") REFERENCES "Team"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_organizationId_userId_fkey" FOREIGN KEY ("organizationId", "userId") REFERENCES "OrganizationMember"("organizationId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicketQueue" ADD CONSTRAINT "TicketQueue_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketQueue" ADD CONSTRAINT "TicketQueue_teamId_organizationId_fkey" FOREIGN KEY ("teamId", "organizationId") REFERENCES "Team"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketQueueAgent" ADD CONSTRAINT "TicketQueueAgent_queueId_organizationId_fkey" FOREIGN KEY ("queueId", "organizationId") REFERENCES "TicketQueue"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketQueueAgent" ADD CONSTRAINT "TicketQueueAgent_organizationId_userId_fkey" FOREIGN KEY ("organizationId", "userId") REFERENCES "OrganizationMember"("organizationId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_queueId_organizationId_fkey" FOREIGN KEY ("queueId", "organizationId") REFERENCES "TicketQueue"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_teamId_organizationId_fkey" FOREIGN KEY ("teamId", "organizationId") REFERENCES "Team"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_linkedTaskId_fkey" FOREIGN KEY ("linkedTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_teamId_organizationId_fkey" FOREIGN KEY ("teamId", "organizationId") REFERENCES "Team"("id", "organizationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Note" ADD CONSTRAINT "Note_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoteFolder" ADD CONSTRAINT "NoteFolder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NoteAttachment" ADD CONSTRAINT "NoteAttachment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
