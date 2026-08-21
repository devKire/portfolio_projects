import type { ChatChannelType, OrganizationRole } from '@prisma/client';

import { getCalendarEventAccess } from '@/lib/calendar/authorization';
import type { getChatChannelAccess } from '@/lib/chat/authorization';
import { OrganizationAuthorizationError } from '@/lib/organizations/authorization';
import { isOrganizationManager } from '@/lib/organizations/policy';
import { db } from '@/lib/prisma';

type ChatAccess = Awaited<ReturnType<typeof getChatChannelAccess>>;

export type ChatResourceInput = {
  eventId?: string | null;
  taskId?: string | null;
  ticketId?: string | null;
  noteId?: string | null;
};

function selectedResourceCount(input: ChatResourceInput) {
  return [input.eventId, input.taskId, input.ticketId, input.noteId].filter(
    Boolean
  ).length;
}

async function getChannelAudience(access: ChatAccess) {
  const organizationId = access.channel.organizationId;
  if (access.channel.type === 'ORGANIZATION') {
    return db.organizationMember.findMany({
      where: { organizationId },
      select: { userId: true, role: true },
    });
  }
  if (access.channel.type === 'TEAM' && access.channel.teamId) {
    return db.organizationMember.findMany({
      where: {
        organizationId,
        OR: [
          { role: { in: ['OWNER', 'ADMIN'] } },
          {
            teamMemberships: {
              some: { teamId: access.channel.teamId, organizationId },
            },
          },
        ],
      },
      select: { userId: true, role: true },
    });
  }
  return db.organizationMember.findMany({
    where: {
      organizationId,
      chatMemberships: { some: { channelId: access.channel.id } },
    },
    select: { userId: true, role: true },
  });
}

async function validateEvent(
  actorId: string,
  access: ChatAccess,
  eventId: string
) {
  const calendarAccess = await getCalendarEventAccess(actorId, eventId);
  const event = calendarAccess.event;
  if (event.organizationId !== access.channel.organizationId) {
    throw new OrganizationAuthorizationError();
  }
  if (access.channel.type === 'ORGANIZATION') {
    if (event.visibility !== 'ORGANIZATION') {
      throw new OrganizationAuthorizationError();
    }
    return;
  }
  if (access.channel.type === 'TEAM') {
    const allowed =
      event.visibility === 'ORGANIZATION' ||
      (event.visibility === 'TEAMS' &&
        event.teams.some((team) => team.teamId === access.channel.teamId));
    if (!allowed) throw new OrganizationAuthorizationError();
    return;
  }
  const audience = await getChannelAudience(access);
  const explicit = new Set([
    event.creatorId,
    ...event.participants.map((participant) => participant.userId),
  ]);
  if (event.visibility === 'ORGANIZATION') return;
  if (audience.every((member) => explicit.has(member.userId))) return;
  throw new OrganizationAuthorizationError();
}

function canAudienceViewTask(
  audience: { userId: string; role: OrganizationRole }[],
  task: {
    userId: string;
    createdById: string | null;
    assigneeId: string | null;
    teamId: string | null;
  },
  teamMemberIds: Set<string>
) {
  return audience.every(
    (member) =>
      isOrganizationManager(member.role) ||
      member.userId === task.userId ||
      member.userId === task.createdById ||
      member.userId === task.assigneeId ||
      (Boolean(task.teamId) && teamMemberIds.has(member.userId))
  );
}

async function validateTask(access: ChatAccess, taskId: string) {
  const task = await db.task.findFirst({
    where: { id: taskId, organizationId: access.channel.organizationId },
    select: {
      id: true,
      userId: true,
      createdById: true,
      assigneeId: true,
      teamId: true,
    },
  });
  if (!task) throw new OrganizationAuthorizationError();
  const audience = await getChannelAudience(access);
  const teamMembers = task.teamId
    ? await db.teamMember.findMany({
        where: {
          organizationId: access.channel.organizationId,
          teamId: task.teamId,
        },
        select: { userId: true },
      })
    : [];
  if (
    !canAudienceViewTask(
      audience,
      task,
      new Set(teamMembers.map((member) => member.userId))
    )
  ) {
    throw new OrganizationAuthorizationError();
  }
}

async function validateTicket(access: ChatAccess, ticketId: string) {
  const ticket = await db.ticket.findFirst({
    where: { id: ticketId, organizationId: access.channel.organizationId },
    select: {
      requesterId: true,
      assigneeId: true,
      teamId: true,
      queueId: true,
      queue: { select: { teamId: true } },
    },
  });
  if (!ticket) throw new OrganizationAuthorizationError();
  const audience = await getChannelAudience(access);
  const teamIds = Array.from(
    new Set([ticket.teamId, ticket.queue.teamId].filter(Boolean))
  ) as string[];
  const [teamMembers, queueAgents] = await Promise.all([
    teamIds.length
      ? db.teamMember.findMany({
          where: {
            organizationId: access.channel.organizationId,
            teamId: { in: teamIds },
          },
          select: { userId: true },
        })
      : [],
    db.ticketQueueAgent.findMany({
      where: {
        organizationId: access.channel.organizationId,
        queueId: ticket.queueId,
      },
      select: { userId: true },
    }),
  ]);
  const allowed = new Set([
    ticket.requesterId,
    ticket.assigneeId,
    ...teamMembers.map((member) => member.userId),
    ...queueAgents.map((agent) => agent.userId),
  ]);
  if (
    !audience.every(
      (member) =>
        isOrganizationManager(member.role) || allowed.has(member.userId)
    )
  ) {
    throw new OrganizationAuthorizationError();
  }
}

async function validateNote(access: ChatAccess, noteId: string) {
  const note = await db.note.findFirst({
    where: {
      id: noteId,
      organizationId: access.channel.organizationId,
      scopeKey: `organization:${access.channel.organizationId}`,
      trashedAt: null,
    },
    select: { id: true },
  });
  if (!note) throw new OrganizationAuthorizationError();
}

export async function validateChatSharedResource(
  actorId: string,
  access: ChatAccess,
  input: ChatResourceInput
) {
  if (selectedResourceCount(input) > 1) {
    throw new Error('Compartilhe um recurso por mensagem.');
  }
  if (input.eventId) await validateEvent(actorId, access, input.eventId);
  if (input.taskId) await validateTask(access, input.taskId);
  if (input.ticketId) await validateTicket(access, input.ticketId);
  if (input.noteId) await validateNote(access, input.noteId);
}

export function chatChannelKind(type: ChatChannelType) {
  if (type === 'DIRECT') return 'DIRECT';
  if (type === 'PRIVATE') return 'PRIVATE_CHANNEL';
  if (type === 'TEAM') return 'TEAM_CHANNEL';
  return 'ORGANIZATION_CHANNEL';
}
