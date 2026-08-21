import type {
  OrganizationRole,
  Prisma,
  TicketPriority,
  TicketStatus,
} from '@prisma/client';

import { requireOrganizationMembership } from '@/lib/organizations/authorization';
import { canViewAllTickets } from '@/lib/organizations/policy';

export type TicketAccessFilters = {
  status?: TicketStatus;
  statuses?: TicketStatus[];
  priority?: TicketPriority;
  priorities?: TicketPriority[];
  queueId?: string;
  teamId?: string;
  assigneeId?: string | null;
  requesterId?: string;
  mine?: boolean;
  search?: string;
  createdFrom?: Date;
  createdTo?: Date;
};

export function ticketVisibilityWhere(
  userId: string,
  role: OrganizationRole
): Prisma.TicketWhereInput {
  if (canViewAllTickets(role)) return {};

  return {
    OR: [
      { requesterId: userId },
      { assigneeId: userId },
      { queue: { agents: { some: { userId } } } },
      { team: { members: { some: { userId } } } },
      { queue: { team: { members: { some: { userId } } } } },
    ],
  };
}

export async function buildTicketAccessWhere(
  userId: string,
  organizationId: string,
  filters: TicketAccessFilters = {}
) {
  const membership = await requireOrganizationMembership(
    userId,
    organizationId
  );
  const visibilityWhere = ticketVisibilityWhere(userId, membership.role);
  const filterWhere: Prisma.TicketWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.statuses?.length ? { status: { in: filters.statuses } } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.priorities?.length
      ? { priority: { in: filters.priorities } }
      : {}),
    ...(filters.queueId ? { queueId: filters.queueId } : {}),
    ...(filters.teamId ? { teamId: filters.teamId } : {}),
    ...(filters.assigneeId !== undefined
      ? { assigneeId: filters.assigneeId }
      : {}),
    ...(filters.requesterId ? { requesterId: filters.requesterId } : {}),
    ...(filters.createdFrom || filters.createdTo
      ? {
          createdAt: {
            ...(filters.createdFrom ? { gte: filters.createdFrom } : {}),
            ...(filters.createdTo ? { lt: filters.createdTo } : {}),
          },
        }
      : {}),
  };
  const mineWhere: Prisma.TicketWhereInput = filters.mine
    ? { OR: [{ requesterId: userId }, { assigneeId: userId }] }
    : {};
  const search = filters.search?.trim().slice(0, 160);
  const searchWhere: Prisma.TicketWhereInput = search
    ? {
        OR: [
          { id: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  return {
    membership,
    visibilityWhere,
    where: {
      organizationId,
      AND: [visibilityWhere, filterWhere, mineWhere, searchWhere],
    } satisfies Prisma.TicketWhereInput,
  };
}
