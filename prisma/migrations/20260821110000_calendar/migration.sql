CREATE TYPE "CalendarEventType" AS ENUM ('EVENT', 'MEETING', 'REMINDER', 'FOCUS');
CREATE TYPE "CalendarEventVisibility" AS ENUM ('INVITE_ONLY', 'ORGANIZATION', 'TEAMS');
CREATE TYPE "CalendarEventStatus" AS ENUM ('CONFIRMED', 'CANCELLED');
CREATE TYPE "CalendarParticipantResponse" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE');
CREATE TYPE "CalendarRecurrenceFrequency" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY');

CREATE TABLE "CalendarEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "organizationId" TEXT,
    "location" TEXT,
    "meetingUrl" TEXT,
    "type" "CalendarEventType" NOT NULL DEFAULT 'EVENT',
    "visibility" "CalendarEventVisibility" NOT NULL DEFAULT 'INVITE_ONLY',
    "status" "CalendarEventStatus" NOT NULL DEFAULT 'CONFIRMED',
    "recurrenceFrequency" "CalendarRecurrenceFrequency" NOT NULL DEFAULT 'NONE',
    "recurrenceInterval" INTEGER NOT NULL DEFAULT 1,
    "recurrenceWeekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "recurrenceUntil" TIMESTAMP(3),
    "taskId" TEXT,
    "ticketId" TEXT,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CalendarEvent_valid_range" CHECK ("endAt" > "startAt"),
    CONSTRAINT "CalendarEvent_valid_interval" CHECK ("recurrenceInterval" >= 1),
    CONSTRAINT "CalendarEvent_personal_visibility" CHECK ("organizationId" IS NOT NULL OR "visibility" = 'INVITE_ONLY')
);

CREATE TABLE "CalendarEventParticipant" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "response" "CalendarParticipantResponse" NOT NULL DEFAULT 'PENDING',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    CONSTRAINT "CalendarEventParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalendarEventTeam" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    CONSTRAINT "CalendarEventTeam_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarEvent_id_organizationId_key" ON "CalendarEvent"("id", "organizationId");
CREATE INDEX "CalendarEvent_creatorId_startAt_idx" ON "CalendarEvent"("creatorId", "startAt");
CREATE INDEX "CalendarEvent_organizationId_startAt_idx" ON "CalendarEvent"("organizationId", "startAt");
CREATE INDEX "CalendarEvent_startAt_endAt_idx" ON "CalendarEvent"("startAt", "endAt");
CREATE INDEX "CalendarEvent_recurrenceFrequency_recurrenceUntil_idx" ON "CalendarEvent"("recurrenceFrequency", "recurrenceUntil");
CREATE INDEX "CalendarEvent_taskId_idx" ON "CalendarEvent"("taskId");
CREATE INDEX "CalendarEvent_ticketId_idx" ON "CalendarEvent"("ticketId");
CREATE INDEX "CalendarEvent_projectId_idx" ON "CalendarEvent"("projectId");
CREATE UNIQUE INDEX "CalendarEventParticipant_eventId_userId_key" ON "CalendarEventParticipant"("eventId", "userId");
CREATE INDEX "CalendarEventParticipant_userId_response_idx" ON "CalendarEventParticipant"("userId", "response");
CREATE UNIQUE INDEX "CalendarEventTeam_eventId_teamId_key" ON "CalendarEventTeam"("eventId", "teamId");
CREATE INDEX "CalendarEventTeam_organizationId_teamId_idx" ON "CalendarEventTeam"("organizationId", "teamId");

ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalendarEventParticipant" ADD CONSTRAINT "CalendarEventParticipant_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CalendarEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEventParticipant" ADD CONSTRAINT "CalendarEventParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEventTeam" ADD CONSTRAINT "CalendarEventTeam_eventId_organizationId_fkey" FOREIGN KEY ("eventId", "organizationId") REFERENCES "CalendarEvent"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEventTeam" ADD CONSTRAINT "CalendarEventTeam_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEventTeam" ADD CONSTRAINT "CalendarEventTeam_teamId_organizationId_fkey" FOREIGN KEY ("teamId", "organizationId") REFERENCES "Team"("id", "organizationId") ON DELETE CASCADE ON UPDATE CASCADE;
