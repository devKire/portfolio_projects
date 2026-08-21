import type { Prisma } from '@prisma/client';

import { OrganizationAuthorizationError } from '@/lib/organizations/authorization';
import {
  canManageOrganizationEvent,
  canViewCalendarEvent,
} from '@/lib/organizations/policy';
import { db } from '@/lib/prisma';

export const calendarEventAccessInclude = {
  creator: { select: { id: true, name: true, username: true, email: true } },
  participants: {
    orderBy: { invitedAt: 'asc' },
    include: {
      user: { select: { id: true, name: true, username: true, email: true } },
    },
  },
  teams: {
    include: { team: { select: { id: true, name: true, active: true } } },
  },
  task: { select: { id: true, title: true, organizationId: true } },
  ticket: { select: { id: true, title: true, organizationId: true } },
  project: { select: { id: true, title: true, userId: true } },
} satisfies Prisma.CalendarEventInclude;

export async function getCalendarEventAccess(userId: string, eventId: string) {
  const event = await db.calendarEvent.findUnique({
    where: { id: eventId },
    include: calendarEventAccessInclude,
  });
  if (!event) throw new OrganizationAuthorizationError();

  const [membership, teamMembership] = await Promise.all([
    event.organizationId
      ? db.organizationMember.findFirst({
          where: {
            organizationId: event.organizationId,
            userId,
            organization: { active: true },
          },
          select: { role: true },
        })
      : null,
    event.organizationId && event.teams.length
      ? db.teamMember.findFirst({
          where: {
            organizationId: event.organizationId,
            userId,
            teamId: { in: event.teams.map((item) => item.teamId) },
          },
          select: { id: true },
        })
      : null,
  ]);
  const isParticipant = event.participants.some(
    (participant) => participant.userId === userId
  );
  const canView = canViewCalendarEvent({
    actorId: userId,
    creatorId: event.creatorId,
    organizationRole: membership?.role || null,
    visibility: event.visibility,
    isParticipant,
    isTeamMember: Boolean(teamMembership),
  });
  if (!canView) throw new OrganizationAuthorizationError();
  return {
    event,
    membership,
    isParticipant,
    canManage: canManageOrganizationEvent({
      role: membership?.role || null,
      actorId: userId,
      creatorId: event.creatorId,
    }),
  };
}

export async function requireCalendarEventManage(
  userId: string,
  eventId: string
) {
  const access = await getCalendarEventAccess(userId, eventId);
  if (!access.canManage) throw new OrganizationAuthorizationError();
  return access;
}
