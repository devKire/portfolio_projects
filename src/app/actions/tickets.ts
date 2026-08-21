'use server';

import {
  Prisma,
  type TicketActivityType,
  type TicketPriority,
  type TicketStatus,
} from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { requireUser } from '@/lib/auth/session';
import {
  OrganizationAuthorizationError,
  requireOrganizationMembership,
  requireOrganizationTeam,
  requireOrganizationUser,
  requireQueueOperationAccess,
  requireTicketAccess,
} from '@/lib/organizations/authorization';
import {
  canManageQueue,
  canViewAllTickets,
  ORGANIZATION_MANAGER_ROLES,
  ticketStatusActivityType,
} from '@/lib/organizations/policy';
import { db } from '@/lib/prisma';
import { getAccessibleTask } from '@/lib/tasks/access';

const TICKET_STATUSES = new Set<TicketStatus>([
  'OPEN',
  'IN_PROGRESS',
  'WAITING',
  'RESOLVED',
  'CLOSED',
]);
const TICKET_PRIORITIES = new Set<TicketPriority>([
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
]);

function cleanText(value: string | undefined, max: number) {
  return (value || '').trim().slice(0, max);
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof OrganizationAuthorizationError) return error.message;
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return 'Já existe um registro com esses dados.';
  }
  console.error(fallback, error);
  return fallback;
}

function revalidateTickets() {
  revalidatePath('/admin');
  revalidatePath('/admin/tickets');
}

export async function createTicketQueue(input: {
  organizationId: string;
  name: string;
  description?: string;
  teamId?: string | null;
}) {
  try {
    const user = await requireUser();
    await requireOrganizationMembership(
      user.id,
      input.organizationId,
      ORGANIZATION_MANAGER_ROLES
    );
    const name = cleanText(input.name, 100);
    if (name.length < 2) {
      return { success: false as const, error: 'Nome de fila inválido.' };
    }
    if (input.teamId) {
      await requireOrganizationTeam(input.organizationId, input.teamId);
    }
    const queue = await db.ticketQueue.create({
      data: {
        organizationId: input.organizationId,
        name,
        description: cleanText(input.description, 1000) || null,
        teamId: input.teamId || null,
      },
    });
    revalidateTickets();
    return { success: true as const, data: queue };
  } catch (error) {
    return {
      success: false as const,
      error: errorMessage(error, 'Não foi possível criar a fila.'),
    };
  }
}

export async function updateTicketQueue(
  organizationId: string,
  queueId: string,
  input: {
    name?: string;
    description?: string;
    teamId?: string | null;
    active?: boolean;
  }
) {
  try {
    const user = await requireUser();
    await requireOrganizationMembership(
      user.id,
      organizationId,
      ORGANIZATION_MANAGER_ROLES
    );
    const existing = await db.ticketQueue.findFirst({
      where: { id: queueId, organizationId },
    });
    if (!existing) throw new OrganizationAuthorizationError();
    if (input.teamId)
      await requireOrganizationTeam(organizationId, input.teamId);

    const data: Prisma.TicketQueueUncheckedUpdateInput = {};
    if (input.name !== undefined) {
      const name = cleanText(input.name, 100);
      if (name.length < 2) {
        return { success: false as const, error: 'Nome de fila inválido.' };
      }
      data.name = name;
    }
    if (input.description !== undefined) {
      data.description = cleanText(input.description, 1000) || null;
    }
    if (input.teamId !== undefined) data.teamId = input.teamId || null;
    if (input.active !== undefined) data.active = input.active;

    const queue = await db.ticketQueue.update({ where: { id: queueId }, data });
    revalidateTickets();
    return { success: true as const, data: queue };
  } catch (error) {
    return {
      success: false as const,
      error: errorMessage(error, 'Não foi possível atualizar a fila.'),
    };
  }
}

export async function addTicketQueueAgent(input: {
  organizationId: string;
  queueId: string;
  userId: string;
}) {
  try {
    const actor = await requireUser();
    await requireOrganizationMembership(
      actor.id,
      input.organizationId,
      ORGANIZATION_MANAGER_ROLES
    );
    const [queue, member] = await Promise.all([
      db.ticketQueue.findFirst({
        where: {
          id: input.queueId,
          organizationId: input.organizationId,
          active: true,
        },
        select: { id: true },
      }),
      requireOrganizationUser(input.organizationId, input.userId),
    ]);
    if (!queue || !member) throw new OrganizationAuthorizationError();
    const agent = await db.ticketQueueAgent.create({ data: input });
    revalidateTickets();
    return { success: true as const, data: agent };
  } catch (error) {
    return {
      success: false as const,
      error: errorMessage(error, 'Não foi possível adicionar o agente.'),
    };
  }
}

export async function removeTicketQueueAgent(input: {
  organizationId: string;
  queueId: string;
  userId: string;
}) {
  try {
    const actor = await requireUser();
    await requireOrganizationMembership(
      actor.id,
      input.organizationId,
      ORGANIZATION_MANAGER_ROLES
    );
    const queue = await db.ticketQueue.findFirst({
      where: { id: input.queueId, organizationId: input.organizationId },
      select: { id: true },
    });
    if (!queue) throw new OrganizationAuthorizationError();
    await db.$transaction([
      db.ticket.updateMany({
        where: {
          organizationId: input.organizationId,
          queueId: input.queueId,
          assigneeId: input.userId,
          status: { notIn: ['RESOLVED', 'CLOSED'] },
        },
        data: { assigneeId: null },
      }),
      db.ticketQueueAgent.deleteMany({ where: input }),
    ]);
    revalidateTickets();
    return { success: true as const, data: input };
  } catch (error) {
    return {
      success: false as const,
      error: errorMessage(error, 'Não foi possível remover o agente.'),
    };
  }
}

export type TicketFilters = {
  status?: TicketStatus;
  priority?: TicketPriority;
  queueId?: string;
  teamId?: string;
  assigneeId?: string;
  mine?: boolean;
  search?: string;
};

export async function getTicketWorkspace(
  organizationId: string,
  filters: TicketFilters = {}
) {
  try {
    const user = await requireUser();
    const membership = await requireOrganizationMembership(
      user.id,
      organizationId
    );
    const accessWhere: Prisma.TicketWhereInput = canViewAllTickets(
      membership.role
    )
      ? {}
      : {
          OR: [
            { requesterId: user.id },
            { assigneeId: user.id },
            { queue: { agents: { some: { userId: user.id } } } },
            { team: { members: { some: { userId: user.id } } } },
            { queue: { team: { members: { some: { userId: user.id } } } } },
          ],
        };
    const baseFilters: Prisma.TicketWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.queueId ? { queueId: filters.queueId } : {}),
      ...(filters.teamId ? { teamId: filters.teamId } : {}),
      ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
    };
    const mineWhere: Prisma.TicketWhereInput = filters.mine
      ? { OR: [{ requesterId: user.id }, { assigneeId: user.id }] }
      : {};
    const searchWhere: Prisma.TicketWhereInput = filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            {
              description: {
                contains: filters.search,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {};
    const where: Prisma.TicketWhereInput = {
      organizationId,
      AND: [accessWhere, baseFilters, mineWhere, searchWhere],
    };

    const [tickets, queues, stats] = await Promise.all([
      db.ticket.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        include: {
          queue: { select: { id: true, name: true, active: true } },
          team: { select: { id: true, name: true, active: true } },
          requester: { select: { id: true, name: true, username: true } },
          assignee: { select: { id: true, name: true, username: true } },
          activities: {
            orderBy: { createdAt: 'asc' },
            include: {
              actor: { select: { id: true, name: true, username: true } },
            },
          },
        },
      }),
      db.ticketQueue.findMany({
        where: { organizationId },
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
        include: {
          team: { select: { id: true, name: true } },
          agents: {
            select: {
              userId: true,
              organizationMember: {
                select: {
                  user: {
                    select: { id: true, name: true, username: true },
                  },
                },
              },
            },
          },
          _count: { select: { tickets: true } },
        },
      }),
      db.ticket.groupBy({
        by: ['status'],
        where: { organizationId, ...accessWhere },
        _count: { status: true },
      }),
    ]);

    return {
      success: true as const,
      data: {
        tickets,
        queues,
        stats: Object.fromEntries(
          stats.map((item) => [item.status, item._count.status])
        ),
        canManageQueues: canManageQueue(membership.role),
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: errorMessage(error, 'Não foi possível carregar os chamados.'),
    };
  }
}

export async function createTicket(input: {
  organizationId: string;
  queueId: string;
  title: string;
  description: string;
  priority?: TicketPriority;
  assigneeId?: string | null;
  teamId?: string | null;
  linkedTaskId?: string | null;
}) {
  try {
    const user = await requireUser();
    await requireOrganizationMembership(user.id, input.organizationId);
    const title = cleanText(input.title, 240);
    const description = cleanText(input.description, 20000);
    const priority = input.priority || 'MEDIUM';
    if (!title || !description) {
      return {
        success: false as const,
        error: 'Título e descrição são obrigatórios.',
      };
    }
    if (!TICKET_PRIORITIES.has(priority)) {
      return { success: false as const, error: 'Prioridade inválida.' };
    }
    const queue = await db.ticketQueue.findFirst({
      where: {
        id: input.queueId,
        organizationId: input.organizationId,
        active: true,
      },
      select: { id: true, teamId: true },
    });
    if (!queue) throw new OrganizationAuthorizationError();
    const teamId = input.teamId === undefined ? queue.teamId : input.teamId;
    if (teamId) await requireOrganizationTeam(input.organizationId, teamId);
    if (input.assigneeId) {
      await requireOrganizationUser(input.organizationId, input.assigneeId);
      await requireQueueOperationAccess(
        input.assigneeId,
        input.organizationId,
        queue.id
      );
    }
    if (input.linkedTaskId) {
      const task = await getAccessibleTask(user.id, input.linkedTaskId);
      if (!task || task.organizationId !== input.organizationId) {
        throw new OrganizationAuthorizationError();
      }
    }

    const ticket = await db.$transaction(async (tx) => {
      const created = await tx.ticket.create({
        data: {
          organizationId: input.organizationId,
          queueId: queue.id,
          requesterId: user.id,
          assigneeId: input.assigneeId || null,
          teamId: teamId || null,
          linkedTaskId: input.linkedTaskId || null,
          title,
          description,
          priority,
        },
      });
      await tx.ticketActivity.create({
        data: {
          ticketId: created.id,
          actorId: user.id,
          type: 'CREATED',
          message: 'Chamado criado',
          after: {
            queueId: created.queueId,
            priority: created.priority,
            assigneeId: created.assigneeId,
            teamId: created.teamId,
          },
        },
      });
      return created;
    });
    revalidateTickets();
    return { success: true as const, data: ticket };
  } catch (error) {
    return {
      success: false as const,
      error: errorMessage(error, 'Não foi possível abrir o chamado.'),
    };
  }
}

type TicketPatch = {
  status?: TicketStatus;
  priority?: TicketPriority;
  queueId?: string;
  teamId?: string | null;
  assigneeId?: string | null;
};

export async function updateTicket(
  organizationId: string,
  ticketId: string,
  input: TicketPatch
) {
  try {
    const user = await requireUser();
    const { ticket: existing } = await requireTicketAccess(
      user.id,
      organizationId,
      ticketId,
      { operate: true }
    );
    if (input.status && !TICKET_STATUSES.has(input.status)) {
      return { success: false as const, error: 'Status inválido.' };
    }
    if (input.priority && !TICKET_PRIORITIES.has(input.priority)) {
      return { success: false as const, error: 'Prioridade inválida.' };
    }

    const queueId = input.queueId || existing.queueId;
    let queueTeamId = existing.queue.teamId;
    if (queueId !== existing.queueId) {
      const { queue } = await requireQueueOperationAccess(
        user.id,
        organizationId,
        queueId
      );
      queueTeamId = queue.teamId;
    }
    const teamId =
      input.teamId === undefined
        ? queueId !== existing.queueId
          ? queueTeamId
          : existing.teamId
        : input.teamId;
    if (teamId) await requireOrganizationTeam(organizationId, teamId);
    if (input.assigneeId) {
      await requireOrganizationUser(organizationId, input.assigneeId);
      await requireQueueOperationAccess(
        input.assigneeId,
        organizationId,
        queueId,
        { allowInactive: queueId === existing.queueId }
      );
    }

    const changes: Array<{
      type: TicketActivityType;
      message: string;
      before: Prisma.InputJsonValue;
      after: Prisma.InputJsonValue;
    }> = [];
    const register = (
      changed: boolean,
      type: TicketActivityType,
      message: string,
      before: Prisma.InputJsonValue,
      after: Prisma.InputJsonValue
    ) => {
      if (changed) changes.push({ type, message, before, after });
    };
    register(
      Boolean(input.status && input.status !== existing.status),
      ticketStatusActivityType(input.status || existing.status),
      'Status alterado',
      { status: existing.status },
      { status: input.status || existing.status }
    );
    register(
      Boolean(input.priority && input.priority !== existing.priority),
      'PRIORITY_CHANGED',
      'Prioridade alterada',
      { priority: existing.priority },
      { priority: input.priority || existing.priority }
    );
    register(
      queueId !== existing.queueId,
      'QUEUE_CHANGED',
      'Fila alterada',
      { queueId: existing.queueId },
      { queueId }
    );
    register(
      teamId !== existing.teamId,
      'TEAM_CHANGED',
      'Equipe alterada',
      { teamId: existing.teamId },
      { teamId }
    );
    const assigneeId =
      input.assigneeId === undefined ? existing.assigneeId : input.assigneeId;
    register(
      assigneeId !== existing.assigneeId,
      'ASSIGNEE_CHANGED',
      'Responsável alterado',
      { assigneeId: existing.assigneeId },
      { assigneeId }
    );

    const ticket = await db.$transaction(async (tx) => {
      const updated = await tx.ticket.update({
        where: { id: existing.id },
        data: {
          status: input.status,
          priority: input.priority,
          queueId,
          teamId,
          assigneeId,
          resolvedAt:
            input.status === 'RESOLVED'
              ? new Date()
              : input.status
                ? null
                : undefined,
          closedAt:
            input.status === 'CLOSED'
              ? new Date()
              : input.status
                ? null
                : undefined,
        },
      });
      if (changes.length) {
        await tx.ticketActivity.createMany({
          data: changes.map((change) => ({
            ticketId: existing.id,
            actorId: user.id,
            ...change,
          })),
        });
      }
      return updated;
    });
    revalidateTickets();
    return { success: true as const, data: ticket };
  } catch (error) {
    return {
      success: false as const,
      error: errorMessage(error, 'Não foi possível atualizar o chamado.'),
    };
  }
}

export async function assumeTicket(organizationId: string, ticketId: string) {
  const user = await requireUser();
  return updateTicket(organizationId, ticketId, { assigneeId: user.id });
}

export async function addTicketComment(
  organizationId: string,
  ticketId: string,
  commentInput: string
) {
  try {
    const user = await requireUser();
    const { ticket } = await requireTicketAccess(
      user.id,
      organizationId,
      ticketId
    );
    const comment = cleanText(commentInput, 10000);
    if (!comment)
      return { success: false as const, error: 'Comentário vazio.' };
    const activity = await db.ticketActivity.create({
      data: {
        ticketId: ticket.id,
        actorId: user.id,
        type: 'COMMENTED',
        message: 'Comentário adicionado',
        comment,
      },
    });
    revalidateTickets();
    return { success: true as const, data: activity };
  } catch (error) {
    return {
      success: false as const,
      error: errorMessage(error, 'Não foi possível comentar no chamado.'),
    };
  }
}
