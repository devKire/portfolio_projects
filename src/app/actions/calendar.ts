'use server';

import {
  Prisma,
  type CalendarEventType,
  type CalendarEventVisibility,
  type CalendarParticipantResponse,
  type CalendarRecurrenceFrequency,
} from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { requireUser } from '@/lib/auth/session';
import {
  calendarEventAccessInclude,
  getCalendarEventAccess,
  requireCalendarEventManage,
} from '@/lib/calendar/authorization';
import {
  expandCalendarEvent,
  isValidTimeZone,
} from '@/lib/calendar/recurrence';
import {
  OrganizationAuthorizationError,
  requireOrganizationMembership,
  requireTicketAccess,
} from '@/lib/organizations/authorization';
import {
  canCreateOrganizationEvent,
  isOrganizationManager,
} from '@/lib/organizations/policy';
import { db } from '@/lib/prisma';
import { buildTaskAccessWhere, getAccessibleTask } from '@/lib/tasks/access';
import { buildTicketAccessWhere } from '@/lib/tickets/access';

const EVENT_TYPES: readonly CalendarEventType[] = [
  'EVENT',
  'MEETING',
  'REMINDER',
  'FOCUS',
];
const VISIBILITIES: readonly CalendarEventVisibility[] = [
  'INVITE_ONLY',
  'ORGANIZATION',
  'TEAMS',
];
const RECURRENCES: readonly CalendarRecurrenceFrequency[] = [
  'NONE',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
];
const RESPONSES: readonly CalendarParticipantResponse[] = [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'TENTATIVE',
];

export type CalendarEventInput = {
  title: string;
  description?: string;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  timezone: string;
  organizationId?: string | null;
  location?: string;
  meetingUrl?: string;
  type?: CalendarEventType;
  visibility?: CalendarEventVisibility;
  participantIds?: string[];
  teamIds?: string[];
  recurrenceFrequency?: CalendarRecurrenceFrequency;
  recurrenceInterval?: number;
  recurrenceWeekdays?: number[];
  recurrenceUntil?: string | null;
  taskId?: string | null;
  ticketId?: string | null;
  projectId?: string | null;
};

export type CalendarFilter =
  | 'all'
  | 'mine'
  | 'invites'
  | 'organization'
  | 'team'
  | 'meetings'
  | 'events';

function revalidateCalendar() {
  revalidatePath('/admin');
}

function actionError(error: unknown, fallback: string) {
  if (error instanceof OrganizationAuthorizationError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  console.error(fallback, error);
  return fallback;
}

function parseDate(value: string, field: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${field} inválido.`);
  return date;
}

function optionalText(value: string | undefined, max: number) {
  return value?.trim().slice(0, max) || null;
}

function normalizeIds(values: string[] | undefined) {
  return Array.from(
    new Set((values || []).map((value) => value.trim()).filter(Boolean))
  );
}

function normalizeEventInput(input: CalendarEventInput) {
  const title = input.title.trim().slice(0, 160);
  if (title.length < 2)
    throw new Error('Título deve ter ao menos 2 caracteres.');
  const startAt = parseDate(input.startAt, 'Data inicial');
  const endAt = parseDate(input.endAt, 'Data final');
  if (endAt <= startAt)
    throw new Error('O término deve ser posterior ao início.');
  const timezone = input.timezone.trim();
  if (!isValidTimeZone(timezone)) throw new Error('Timezone inválido.');
  const type = EVENT_TYPES.includes(input.type || 'EVENT')
    ? input.type || 'EVENT'
    : 'EVENT';
  const visibility = VISIBILITIES.includes(input.visibility || 'INVITE_ONLY')
    ? input.visibility || 'INVITE_ONLY'
    : 'INVITE_ONLY';
  const recurrenceFrequency = RECURRENCES.includes(
    input.recurrenceFrequency || 'NONE'
  )
    ? input.recurrenceFrequency || 'NONE'
    : 'NONE';
  const recurrenceInterval = Math.min(
    52,
    Math.max(1, Math.trunc(input.recurrenceInterval || 1))
  );
  const recurrenceWeekdays = Array.from(
    new Set(input.recurrenceWeekdays || [])
  ).sort();
  if (recurrenceWeekdays.some((weekday) => weekday < 0 || weekday > 6)) {
    throw new Error('Dia de recorrência inválido.');
  }
  const recurrenceUntil = input.recurrenceUntil
    ? parseDate(input.recurrenceUntil, 'Fim da recorrência')
    : null;
  if (recurrenceUntil && recurrenceUntil < startAt) {
    throw new Error('O fim da recorrência não pode anteceder o evento.');
  }
  const meetingUrl = optionalText(input.meetingUrl, 1000);
  if (meetingUrl) {
    let parsed: URL;
    try {
      parsed = new URL(meetingUrl);
    } catch {
      throw new Error('Link da reunião inválido.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Link da reunião inválido.');
    }
  }
  return {
    title,
    description: optionalText(input.description, 10_000),
    startAt,
    endAt,
    allDay: Boolean(input.allDay),
    timezone,
    organizationId: input.organizationId?.trim() || null,
    location: optionalText(input.location, 300),
    meetingUrl,
    type,
    visibility,
    participantIds: normalizeIds(input.participantIds),
    teamIds: normalizeIds(input.teamIds),
    recurrenceFrequency,
    recurrenceInterval,
    recurrenceWeekdays,
    recurrenceUntil,
    taskId: input.taskId?.trim() || null,
    ticketId: input.ticketId?.trim() || null,
    projectId: input.projectId?.trim() || null,
  };
}

async function validateParticipants(
  tx: Prisma.TransactionClient,
  actorId: string,
  organizationId: string | null,
  participantIds: string[]
) {
  const ids = participantIds.filter((id) => id !== actorId);
  if (!ids.length) return [];
  if (organizationId) {
    const members = await tx.organizationMember.findMany({
      where: { organizationId, userId: { in: ids } },
      select: { userId: true },
    });
    if (members.length !== ids.length)
      throw new OrganizationAuthorizationError();
    return ids;
  }
  const actorOrganizations = await tx.organizationMember.findMany({
    where: { userId: actorId },
    select: { organizationId: true },
  });
  if (!actorOrganizations.length) throw new OrganizationAuthorizationError();
  const related = await tx.organizationMember.findMany({
    where: {
      organizationId: {
        in: actorOrganizations.map((membership) => membership.organizationId),
      },
      userId: { in: ids },
    },
    distinct: ['userId'],
    select: { userId: true },
  });
  if (related.length !== ids.length) throw new OrganizationAuthorizationError();
  return ids;
}

async function validateOrganizationTargets(
  tx: Prisma.TransactionClient,
  actorId: string,
  organizationId: string | null,
  visibility: CalendarEventVisibility,
  teamIds: string[]
) {
  if (!organizationId) {
    if (visibility !== 'INVITE_ONLY' || teamIds.length) {
      throw new OrganizationAuthorizationError();
    }
    return [];
  }
  const membership = await tx.organizationMember.findFirst({
    where: {
      organizationId,
      userId: actorId,
      organization: { active: true },
    },
    select: { role: true },
  });
  if (!membership || !canCreateOrganizationEvent(membership.role)) {
    throw new OrganizationAuthorizationError();
  }
  if (visibility !== 'TEAMS') return [];
  if (!teamIds.length) throw new Error('Selecione ao menos uma equipe.');
  const teams = await tx.team.findMany({
    where: { organizationId, id: { in: teamIds }, active: true },
    select: { id: true },
  });
  if (teams.length !== teamIds.length)
    throw new OrganizationAuthorizationError();
  if (!isOrganizationManager(membership.role)) {
    const memberships = await tx.teamMember.findMany({
      where: { organizationId, userId: actorId, teamId: { in: teamIds } },
      select: { teamId: true },
    });
    if (memberships.length !== teamIds.length) {
      throw new OrganizationAuthorizationError();
    }
  }
  return teamIds;
}

async function validateWorkLinks(
  userId: string,
  organizationId: string | null,
  links: {
    taskId: string | null;
    ticketId: string | null;
    projectId: string | null;
  }
) {
  const [task, project] = await Promise.all([
    links.taskId ? getAccessibleTask(userId, links.taskId) : null,
    links.projectId
      ? db.project.findFirst({
          where: { id: links.projectId, userId },
          select: { id: true, userId: true },
        })
      : null,
  ]);
  if (links.taskId && (!task || task.organizationId !== organizationId)) {
    throw new OrganizationAuthorizationError();
  }
  if (links.ticketId) {
    if (!organizationId) throw new OrganizationAuthorizationError();
    const access = await requireTicketAccess(
      userId,
      organizationId,
      links.ticketId
    );
    if (access.ticket.organizationId !== organizationId) {
      throw new OrganizationAuthorizationError();
    }
  }
  if (links.projectId && (!project || organizationId)) {
    throw new OrganizationAuthorizationError();
  }
}

function serializeEvent<
  T extends Awaited<ReturnType<typeof getCalendarEventAccess>>['event'],
>(
  event: T,
  occurrence?: {
    occurrenceKey: string;
    occurrenceStartAt: Date;
    occurrenceEndAt: Date;
  }
) {
  return {
    ...event,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    recurrenceUntil: event.recurrenceUntil?.toISOString() || null,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    occurrenceKey: occurrence?.occurrenceKey || event.id,
    occurrenceStartAt: (
      occurrence?.occurrenceStartAt || event.startAt
    ).toISOString(),
    occurrenceEndAt: (occurrence?.occurrenceEndAt || event.endAt).toISOString(),
    participants: event.participants.map((participant) => ({
      ...participant,
      invitedAt: participant.invitedAt.toISOString(),
      respondedAt: participant.respondedAt?.toISOString() || null,
    })),
  };
}

async function loadCalendarEvents(input: {
  userId: string;
  rangeStart: Date;
  rangeEnd: Date;
  organizationId?: string | null;
  filter?: CalendarFilter;
  search?: string;
}) {
  const memberships = await db.organizationMember.findMany({
    where: {
      userId: input.userId,
      organization: { active: true },
      ...(input.organizationId ? { organizationId: input.organizationId } : {}),
    },
    select: { organizationId: true },
  });
  if (input.organizationId && !memberships.length) {
    throw new OrganizationAuthorizationError();
  }
  const organizationIds = memberships.map(
    (membership) => membership.organizationId
  );
  const teamMemberships = organizationIds.length
    ? await db.teamMember.findMany({
        where: {
          userId: input.userId,
          organizationId: { in: organizationIds },
        },
        select: { teamId: true },
      })
    : [];
  const teamIds = teamMemberships.map((membership) => membership.teamId);
  const accessWhere: Prisma.CalendarEventWhereInput = {
    OR: [
      { creatorId: input.userId },
      { participants: { some: { userId: input.userId } } },
      ...(organizationIds.length
        ? [
            {
              organizationId: { in: organizationIds },
              visibility: 'ORGANIZATION' as const,
            },
            ...(teamIds.length
              ? [
                  {
                    organizationId: { in: organizationIds },
                    visibility: 'TEAMS' as const,
                    teams: { some: { teamId: { in: teamIds } } },
                  },
                ]
              : []),
          ]
        : []),
    ],
  };
  const temporalWhere: Prisma.CalendarEventWhereInput = {
    OR: [
      {
        recurrenceFrequency: 'NONE',
        startAt: { lt: input.rangeEnd },
        endAt: { gt: input.rangeStart },
      },
      {
        recurrenceFrequency: { not: 'NONE' },
        startAt: { lt: input.rangeEnd },
        OR: [
          { recurrenceUntil: null },
          { recurrenceUntil: { gte: input.rangeStart } },
        ],
      },
    ],
  };
  const filter = input.filter || 'all';
  const filterWhere: Prisma.CalendarEventWhereInput =
    filter === 'mine'
      ? { creatorId: input.userId }
      : filter === 'invites'
        ? {
            creatorId: { not: input.userId },
            participants: { some: { userId: input.userId } },
          }
        : filter === 'organization'
          ? { organizationId: { not: null } }
          : filter === 'team'
            ? { visibility: 'TEAMS' }
            : filter === 'meetings'
              ? { type: 'MEETING' }
              : filter === 'events'
                ? { type: 'EVENT' }
                : {};
  const search = input.search?.trim().slice(0, 160);
  const events = await db.calendarEvent.findMany({
    where: {
      AND: [
        accessWhere,
        temporalWhere,
        filterWhere,
        input.organizationId
          ? {
              OR: [
                { organizationId: null },
                { organizationId: input.organizationId },
              ],
            }
          : { organizationId: null },
        search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { location: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    },
    include: calendarEventAccessInclude,
    orderBy: { startAt: 'asc' },
  });
  return events
    .flatMap((event) =>
      expandCalendarEvent(event, input.rangeStart, input.rangeEnd).map(
        (occurrence) => serializeEvent(event, occurrence)
      )
    )
    .sort(
      (left, right) =>
        new Date(left.occurrenceStartAt).getTime() -
        new Date(right.occurrenceStartAt).getTime()
    );
}

export async function getCalendarEvents(input: {
  rangeStart: string;
  rangeEnd: string;
  organizationId?: string | null;
  filter?: CalendarFilter;
  search?: string;
}) {
  try {
    const user = await requireUser();
    const rangeStart = parseDate(input.rangeStart, 'Início do intervalo');
    const rangeEnd = parseDate(input.rangeEnd, 'Fim do intervalo');
    const days = (rangeEnd.getTime() - rangeStart.getTime()) / 86_400_000;
    if (days <= 0 || days > 400) throw new Error('Intervalo inválido.');
    const events = await loadCalendarEvents({
      userId: user.id,
      rangeStart,
      rangeEnd,
      organizationId: input.organizationId,
      filter: input.filter,
      search: input.search,
    });
    return { success: true as const, data: events };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível carregar o calendário.'),
    };
  }
}

export async function getUpcomingCalendarEvents(
  organizationId?: string | null,
  limit = 8
) {
  try {
    const user = await requireUser();
    const rangeStart = new Date();
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 45);
    const events = await loadCalendarEvents({
      userId: user.id,
      rangeStart,
      rangeEnd,
      organizationId,
    });
    return {
      success: true as const,
      data: events.slice(0, Math.min(limit, 20)),
    };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível carregar próximos eventos.'),
    };
  }
}

export async function getCalendarOptions(organizationId?: string | null) {
  try {
    const user = await requireUser();
    const sharedOrganizationIds = await db.organizationMember.findMany({
      where: { userId: user.id, organization: { active: true } },
      select: { organizationId: true },
    });
    if (organizationId) {
      await requireOrganizationMembership(user.id, organizationId);
    }
    const relatedUsers = sharedOrganizationIds.length
      ? await db.organizationMember.findMany({
          where: {
            organizationId: {
              in: sharedOrganizationIds.map((item) => item.organizationId),
            },
            userId: { not: user.id },
          },
          distinct: ['userId'],
          orderBy: { user: { name: 'asc' } },
          select: {
            user: {
              select: { id: true, name: true, username: true, email: true },
            },
          },
        })
      : [];
    const organization = organizationId
      ? await db.organization.findUnique({
          where: { id: organizationId },
          select: {
            id: true,
            name: true,
            members: {
              orderBy: { user: { name: 'asc' } },
              select: {
                user: {
                  select: { id: true, name: true, username: true, email: true },
                },
              },
            },
            teams: {
              where: { active: true },
              orderBy: { name: 'asc' },
              select: { id: true, name: true },
            },
          },
        })
      : null;
    const personalTaskWhere = await buildTaskAccessWhere(user.id, {
      scope: 'personal',
    });
    const organizationTaskWhere = organizationId
      ? await buildTaskAccessWhere(user.id, {
          organizationId,
          scope: 'mine',
        })
      : null;
    const ticketAccess = organizationId
      ? await buildTicketAccessWhere(user.id, organizationId)
      : null;
    const [tasks, tickets, projects] = await Promise.all([
      db.task.findMany({
        where: organizationTaskWhere
          ? { OR: [personalTaskWhere, organizationTaskWhere] }
          : personalTaskWhere,
        orderBy: { updatedAt: 'desc' },
        take: 100,
        select: { id: true, title: true, organizationId: true },
      }),
      ticketAccess
        ? db.ticket.findMany({
            where: ticketAccess.where,
            orderBy: { updatedAt: 'desc' },
            take: 100,
            select: { id: true, title: true, organizationId: true },
          })
        : [],
      db.project.findMany({
        where: { userId: user.id, isActive: true },
        orderBy: { position: 'asc' },
        select: { id: true, title: true },
      }),
    ]);
    return {
      success: true as const,
      data: {
        organization,
        users: relatedUsers.map((item) => item.user),
        organizationUsers: organization?.members.map((item) => item.user) || [],
        teams: organization?.teams || [],
        tasks,
        tickets,
        projects,
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(
        error,
        'Não foi possível carregar opções do calendário.'
      ),
    };
  }
}

export async function createCalendarEvent(input: CalendarEventInput) {
  try {
    const user = await requireUser();
    const data = normalizeEventInput(input);
    await validateWorkLinks(user.id, data.organizationId, data);
    const event = await db.$transaction(async (tx) => {
      const teamIds = await validateOrganizationTargets(
        tx,
        user.id,
        data.organizationId,
        data.visibility,
        data.teamIds
      );
      const participantIds = await validateParticipants(
        tx,
        user.id,
        data.organizationId,
        data.participantIds
      );
      return tx.calendarEvent.create({
        data: {
          title: data.title,
          description: data.description,
          startAt: data.startAt,
          endAt: data.endAt,
          allDay: data.allDay,
          timezone: data.timezone,
          creatorId: user.id,
          organizationId: data.organizationId,
          location: data.location,
          meetingUrl: data.meetingUrl,
          type: data.type,
          visibility: data.visibility,
          recurrenceFrequency: data.recurrenceFrequency,
          recurrenceInterval: data.recurrenceInterval,
          recurrenceWeekdays: data.recurrenceWeekdays,
          recurrenceUntil: data.recurrenceUntil,
          taskId: data.taskId,
          ticketId: data.ticketId,
          projectId: data.projectId,
          participants: {
            create: participantIds.map((userId) => ({ userId })),
          },
          teams: {
            create: teamIds.map((teamId) => ({
              organizationId: data.organizationId!,
              teamId,
            })),
          },
        },
        include: calendarEventAccessInclude,
      });
    });
    revalidateCalendar();
    return { success: true as const, data: serializeEvent(event) };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível criar o evento.'),
    };
  }
}

export async function updateCalendarEvent(
  eventId: string,
  input: CalendarEventInput
) {
  try {
    const user = await requireUser();
    const access = await requireCalendarEventManage(user.id, eventId);
    const data = normalizeEventInput(input);
    if (data.organizationId !== access.event.organizationId) {
      throw new OrganizationAuthorizationError();
    }
    await validateWorkLinks(user.id, data.organizationId, data);
    const event = await db.$transaction(async (tx) => {
      const teamIds = await validateOrganizationTargets(
        tx,
        user.id,
        data.organizationId,
        data.visibility,
        data.teamIds
      );
      const participantIds = await validateParticipants(
        tx,
        user.id,
        data.organizationId,
        data.participantIds
      );
      await Promise.all([
        tx.calendarEventParticipant.deleteMany({ where: { eventId } }),
        tx.calendarEventTeam.deleteMany({ where: { eventId } }),
      ]);
      return tx.calendarEvent.update({
        where: { id: eventId },
        data: {
          title: data.title,
          description: data.description,
          startAt: data.startAt,
          endAt: data.endAt,
          allDay: data.allDay,
          timezone: data.timezone,
          location: data.location,
          meetingUrl: data.meetingUrl,
          type: data.type,
          visibility: data.visibility,
          recurrenceFrequency: data.recurrenceFrequency,
          recurrenceInterval: data.recurrenceInterval,
          recurrenceWeekdays: data.recurrenceWeekdays,
          recurrenceUntil: data.recurrenceUntil,
          taskId: data.taskId,
          ticketId: data.ticketId,
          projectId: data.projectId,
          participants: {
            create: participantIds.map((participantId) => ({
              userId: participantId,
            })),
          },
          teams: {
            create: teamIds.map((teamId) => ({
              organizationId: data.organizationId!,
              teamId,
            })),
          },
        },
        include: calendarEventAccessInclude,
      });
    });
    revalidateCalendar();
    return { success: true as const, data: serializeEvent(event) };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível atualizar o evento.'),
    };
  }
}

export async function deleteCalendarEvent(eventId: string) {
  try {
    const user = await requireUser();
    await requireCalendarEventManage(user.id, eventId);
    await db.calendarEvent.delete({ where: { id: eventId } });
    revalidateCalendar();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível excluir o evento.'),
    };
  }
}

export async function duplicateCalendarEvent(eventId: string) {
  try {
    const user = await requireUser();
    const access = await getCalendarEventAccess(user.id, eventId);
    const source = access.event;
    const event = await db.calendarEvent.create({
      data: {
        title: `${source.title} — cópia`,
        description: source.description,
        startAt: source.startAt,
        endAt: source.endAt,
        allDay: source.allDay,
        timezone: source.timezone,
        creatorId: user.id,
        organizationId: source.organizationId,
        location: source.location,
        meetingUrl: source.meetingUrl,
        type: source.type,
        visibility: source.visibility,
        recurrenceFrequency: source.recurrenceFrequency,
        recurrenceInterval: source.recurrenceInterval,
        recurrenceWeekdays: source.recurrenceWeekdays,
        recurrenceUntil: source.recurrenceUntil,
        taskId: source.taskId,
        ticketId: source.ticketId,
        projectId: source.projectId,
        participants: {
          create: source.participants
            .filter((participant) => participant.userId !== user.id)
            .map((participant) => ({ userId: participant.userId })),
        },
        teams: {
          create: source.teams.map((team) => ({
            organizationId: team.organizationId,
            teamId: team.teamId,
          })),
        },
      },
      include: calendarEventAccessInclude,
    });
    revalidateCalendar();
    return { success: true as const, data: serializeEvent(event) };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível duplicar o evento.'),
    };
  }
}

export async function respondCalendarInvitation(
  eventId: string,
  response: CalendarParticipantResponse
) {
  try {
    const user = await requireUser();
    if (!RESPONSES.includes(response) || response === 'PENDING') {
      throw new Error('Resposta inválida.');
    }
    await getCalendarEventAccess(user.id, eventId);
    const participant = await db.calendarEventParticipant.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
    });
    if (!participant) throw new OrganizationAuthorizationError();
    await db.calendarEventParticipant.update({
      where: { id: participant.id },
      data: { response, respondedAt: new Date() },
    });
    revalidateCalendar();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível responder ao convite.'),
    };
  }
}
