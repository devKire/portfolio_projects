import type { OrganizationRole, Prisma } from '@prisma/client';

import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/prisma';

import { canManageQueue, canManageTeam, canViewAllTickets } from './policy';

export class OrganizationAuthorizationError extends Error {
  constructor(message = 'Recurso não encontrado ou acesso negado.') {
    super(message);
    this.name = 'OrganizationAuthorizationError';
  }
}

const membershipSelect = {
  id: true,
  organizationId: true,
  userId: true,
  role: true,
  organization: {
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      avatarUrl: true,
      active: true,
    },
  },
} satisfies Prisma.OrganizationMemberSelect;

export async function getOrganizationMembership(
  userId: string,
  organizationId: string
) {
  if (!organizationId) return null;
  return db.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
      organization: { active: true },
    },
    select: membershipSelect,
  });
}

export async function requireOrganizationMembership(
  userId: string,
  organizationId: string,
  roles?: readonly OrganizationRole[]
) {
  const membership = await getOrganizationMembership(userId, organizationId);
  if (!membership || (roles && !roles.includes(membership.role))) {
    throw new OrganizationAuthorizationError();
  }
  return membership;
}

export async function requireOrganizationMember(organizationId: string) {
  const user = await requireUser();
  const membership = await requireOrganizationMembership(
    user.id,
    organizationId
  );
  return { user, membership };
}

export async function requireOrganizationRole(
  organizationId: string,
  roles: readonly OrganizationRole[]
) {
  const user = await requireUser();
  const membership = await requireOrganizationMembership(
    user.id,
    organizationId,
    roles
  );
  return { user, membership };
}

export async function requireOrganizationUser(
  organizationId: string,
  userId: string
) {
  const member = await db.organizationMember.findFirst({
    where: { organizationId, userId },
    select: {
      id: true,
      userId: true,
      role: true,
      user: { select: { id: true, name: true, username: true, email: true } },
    },
  });
  if (!member) throw new OrganizationAuthorizationError();
  return member;
}

export async function requireOrganizationTeam(
  organizationId: string,
  teamId: string,
  options: { active?: boolean } = {}
) {
  const team = await db.team.findFirst({
    where: {
      id: teamId,
      organizationId,
      ...(options.active === false ? {} : { active: true }),
    },
  });
  if (!team) throw new OrganizationAuthorizationError();
  return team;
}

export async function requireTeamOperationAccess(
  userId: string,
  organizationId: string,
  teamId: string
) {
  const membership = await requireOrganizationMembership(
    userId,
    organizationId
  );
  const team = await requireOrganizationTeam(organizationId, teamId);
  if (canManageTeam(membership.role)) return { membership, team };

  const teamMember = await db.teamMember.findFirst({
    where: { organizationId, teamId, userId },
    select: { id: true },
  });
  if (!teamMember) throw new OrganizationAuthorizationError();
  return { membership, team };
}

export async function requireQueueOperationAccess(
  userId: string,
  organizationId: string,
  queueId: string,
  options: { allowInactive?: boolean } = {}
) {
  const membership = await requireOrganizationMembership(
    userId,
    organizationId
  );
  const queue = await db.ticketQueue.findFirst({
    where: {
      id: queueId,
      organizationId,
      ...(options.allowInactive ? {} : { active: true }),
    },
    select: { id: true, organizationId: true, teamId: true, name: true },
  });
  if (!queue) throw new OrganizationAuthorizationError();
  if (canManageQueue(membership.role)) return { membership, queue };

  const [agent, teamMember] = await Promise.all([
    db.ticketQueueAgent.findFirst({
      where: { organizationId, queueId, userId },
      select: { id: true },
    }),
    queue.teamId
      ? db.teamMember.findFirst({
          where: { organizationId, teamId: queue.teamId, userId },
          select: { id: true },
        })
      : null,
  ]);
  if (!agent && !teamMember) throw new OrganizationAuthorizationError();
  return { membership, queue };
}

export async function requireTicketAccess(
  userId: string,
  organizationId: string,
  ticketId: string,
  options: { operate?: boolean } = {}
) {
  const membership = await requireOrganizationMembership(
    userId,
    organizationId
  );
  const ticket = await db.ticket.findFirst({
    where: { id: ticketId, organizationId },
    include: {
      queue: { select: { id: true, name: true, active: true, teamId: true } },
      team: { select: { id: true, name: true, active: true } },
    },
  });
  if (!ticket) throw new OrganizationAuthorizationError();

  if (!options.operate) {
    if (
      canViewAllTickets(membership.role) ||
      ticket.requesterId === userId ||
      ticket.assigneeId === userId
    ) {
      return { membership, ticket };
    }

    const teamIds = Array.from(
      new Set([ticket.teamId, ticket.queue.teamId].filter(Boolean))
    ) as string[];
    const [agent, teamMember] = await Promise.all([
      db.ticketQueueAgent.findFirst({
        where: { organizationId, queueId: ticket.queueId, userId },
        select: { id: true },
      }),
      teamIds.length
        ? db.teamMember.findFirst({
            where: {
              organizationId,
              teamId: { in: teamIds },
              userId,
            },
            select: { id: true },
          })
        : null,
    ]);
    if (agent || teamMember) return { membership, ticket };
    throw new OrganizationAuthorizationError();
  }

  if (ticket.teamId) {
    const ticketTeamMember = await db.teamMember.findFirst({
      where: { organizationId, teamId: ticket.teamId, userId },
      select: { id: true },
    });
    if (ticketTeamMember) return { membership, ticket };
  }

  await requireQueueOperationAccess(userId, organizationId, ticket.queueId, {
    allowInactive: true,
  });
  return { membership, ticket };
}
