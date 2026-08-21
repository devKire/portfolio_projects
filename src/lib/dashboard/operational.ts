import type {
  NoteStatus,
  OrganizationRole,
  Prisma,
  TicketStatus,
} from '@prisma/client';

import {
  buildTimelineBuckets,
  calculateDashboardComparison,
  normalizeDashboardFilters,
  noteStatusesForDashboard,
  taskStatusesForDashboard,
  ticketStatusesForDashboard,
} from '@/lib/dashboard/filters';
import {
  OrganizationAuthorizationError,
  requireOrganizationMembership,
} from '@/lib/organizations/authorization';
import {
  organizationNoteScope,
  personalNoteScope,
} from '@/lib/organizations/policy';
import { db } from '@/lib/prisma';
import { buildTaskAccessWhere } from '@/lib/tasks/access';
import { ticketVisibilityWhere } from '@/lib/tickets/access';
import {
  taskStatusToWorkLane,
  ticketStatusToWorkLane,
} from '@/lib/work/adapter';
import type {
  DashboardActivityItem,
  DashboardAttentionItem,
  DashboardFilters,
  DashboardNoteItem,
  DashboardUpcomingGroup,
  DashboardWorkItem,
  OperationalDashboardData,
  PortfolioAnalytics,
  PriorityPoint,
  QueueStat,
  TimelinePoint,
  WorkloadPoint,
  WorkStatusPoint,
} from '@/types/dashboard';
import type { WorkLane, WorkPriority } from '@/types/work';

const ACTIVE_TICKET_STATUSES: TicketStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING',
];
const STATUS_LABELS: Record<WorkLane, string> = {
  BACKLOG: 'Aberto / Pendente',
  IN_PROGRESS: 'Em andamento',
  WAITING: 'Aguardando',
  DONE: 'Concluído / Resolvido',
  CLOSED: 'Fechado',
};
const PRIORITY_LABELS: Record<WorkPriority, string> = {
  URGENT: 'Urgente',
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
};
const PRIORITY_SCORE: Record<WorkPriority, number> = {
  URGENT: 40,
  HIGH: 30,
  MEDIUM: 20,
  LOW: 10,
};

type DashboardUser = {
  id: string;
  name: string | null;
  username: string;
  landingPages: Array<{ id: string; slug: string }>;
};

const taskItemSelect = {
  id: true,
  title: true,
  status: true,
  priority: true,
  dueDate: true,
  organizationId: true,
  teamId: true,
  assigneeId: true,
  createdAt: true,
  updatedAt: true,
  team: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true, username: true } },
} satisfies Prisma.TaskSelect;

const ticketItemSelect = {
  id: true,
  title: true,
  status: true,
  priority: true,
  queueId: true,
  teamId: true,
  assigneeId: true,
  linkedTaskId: true,
  createdAt: true,
  updatedAt: true,
  queue: { select: { id: true, name: true } },
  team: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true, username: true } },
} satisfies Prisma.TicketSelect;

type TaskItemRow = Prisma.TaskGetPayload<{ select: typeof taskItemSelect }>;
type TicketItemRow = Prisma.TicketGetPayload<{
  select: typeof ticketItemSelect;
}>;

function normalizePriority(priority: string): WorkPriority {
  const value = priority.toUpperCase();
  if (value === 'LOW' || value === 'HIGH' || value === 'URGENT') return value;
  return 'MEDIUM';
}

function displayName(
  user: {
    name: string | null;
    username: string;
  } | null
) {
  return user ? user.name || `@${user.username}` : null;
}

function taskToDashboardItem(task: TaskItemRow): DashboardWorkItem {
  return {
    key: `TASK:${task.id}`,
    id: task.id,
    kind: 'TASK',
    title: task.title,
    identifier: 'TASK',
    priority: normalizePriority(task.priority),
    lane: taskStatusToWorkLane(task.status),
    dueDate: task.dueDate?.toISOString() || null,
    queueId: null,
    queueName: null,
    teamId: task.teamId,
    teamName: task.team?.name || null,
    assigneeId: task.assigneeId,
    assigneeName: displayName(task.assignee),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function ticketToDashboardItem(ticket: TicketItemRow): DashboardWorkItem {
  return {
    key: `TICKET:${ticket.id}`,
    id: ticket.id,
    kind: 'TICKET',
    title: ticket.title,
    identifier: `#${ticket.id.slice(-8).toUpperCase()}`,
    priority: ticket.priority,
    lane: ticketStatusToWorkLane(ticket.status),
    dueDate: null,
    queueId: ticket.queueId,
    queueName: ticket.queue.name,
    teamId: ticket.teamId,
    teamName: ticket.team?.name || null,
    assigneeId: ticket.assigneeId,
    assigneeName: displayName(ticket.assignee),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

function workItemSort(left: DashboardWorkItem, right: DashboardWorkItem) {
  const priority =
    PRIORITY_SCORE[right.priority] - PRIORITY_SCORE[left.priority];
  if (priority !== 0) return priority;
  const leftDue = left.dueDate ? new Date(left.dueDate).getTime() : Infinity;
  const rightDue = right.dueDate ? new Date(right.dueDate).getTime() : Infinity;
  if (leftDue !== rightDue) return leftDue - rightDue;
  return (
    new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  );
}

function countStatus<T extends string>(
  rows: Array<{ status: T; _count: { _all: number } }>,
  status: T
) {
  return rows.find((row) => row.status === status)?._count._all || 0;
}

function countPriority(
  rows: Array<{ priority: string; _count: { _all: number } }>,
  priority: string
) {
  return rows.find((row) => row.priority === priority)?._count._all || 0;
}

function startOfToday(now: Date) {
  const result = new Date(now);
  result.setHours(0, 0, 0, 0);
  return result;
}

function withDate(
  where: Prisma.TaskWhereInput,
  field: 'createdAt' | 'completedAt',
  start: Date,
  end: Date
): Prisma.TaskWhereInput {
  return { AND: [where, { [field]: { gte: start, lt: end } }] };
}

function withTicketDate(
  where: Prisma.TicketWhereInput,
  field: 'createdAt' | 'resolvedAt' | 'closedAt',
  start: Date,
  end: Date
): Prisma.TicketWhereInput {
  return { AND: [where, { [field]: { gte: start, lt: end } }] };
}

function withNoteDate(
  where: Prisma.NoteWhereInput,
  field: 'createdAt' | 'updatedAt',
  start: Date,
  end: Date
): Prisma.NoteWhereInput {
  return { AND: [where, { [field]: { gte: start, lt: end } }] };
}

function attentionFromWorkItem(
  item: DashboardWorkItem,
  today: Date,
  tomorrow: Date
): DashboardAttentionItem | null {
  const due = item.dueDate ? new Date(item.dueDate) : null;
  const overdue = Boolean(due && due < today);
  const dueToday = Boolean(due && due >= today && due < tomorrow);

  if (item.priority === 'URGENT' && overdue) {
    return {
      ...item,
      reason: 'URGENT_OVERDUE',
      reasonLabel: 'Urgente e vencida',
      score: 700,
    };
  }
  if (item.priority === 'URGENT') {
    return { ...item, reason: 'URGENT', reasonLabel: 'Urgente', score: 600 };
  }
  if (overdue) {
    return { ...item, reason: 'OVERDUE', reasonLabel: 'Vencida', score: 500 };
  }
  if (item.priority === 'HIGH') {
    return {
      ...item,
      reason: 'HIGH',
      reasonLabel: 'Alta prioridade',
      score: 400,
    };
  }
  if (item.kind === 'TICKET' && !item.assigneeId) {
    return {
      ...item,
      reason: 'UNASSIGNED',
      reasonLabel: 'Sem responsável',
      score: 300,
    };
  }
  if (dueToday) {
    return {
      ...item,
      reason: 'DUE_TODAY',
      reasonLabel: 'Vence hoje',
      score: 200,
    };
  }
  return null;
}

async function loadPortfolioAnalytics(
  userId: string,
  landingpageId: string | undefined,
  range: {
    start: Date;
    end: Date;
    previousStart: Date;
    previousEnd: Date;
  }
): Promise<PortfolioAnalytics> {
  if (!landingpageId) {
    return {
      available: false,
      portfolioViews: 0,
      projectsCount: 0,
      socialInteractions: 0,
      linkedinFollowers: 0,
      githubFollowers: 0,
      viewsComparison: calculateDashboardComparison(0, 0),
    };
  }

  const [
    portfolioViews,
    previousViews,
    projectsCount,
    social,
    linkedin,
    github,
  ] = await Promise.all([
    db.pageView.count({
      where: {
        landingpageId,
        createdAt: { gte: range.start, lt: range.end },
      },
    }),
    db.pageView.count({
      where: {
        landingpageId,
        createdAt: { gte: range.previousStart, lt: range.previousEnd },
      },
    }),
    db.project.count({ where: { userId, landingpageId, isActive: true } }),
    db.socialInteraction.aggregate({
      where: {
        landingpageId,
        createdAt: { gte: range.start, lt: range.end },
      },
      _sum: { count: true },
    }),
    db.socialInteraction.aggregate({
      where: { landingpageId, platform: 'linkedin', type: 'follow' },
      _sum: { count: true },
    }),
    db.socialInteraction.aggregate({
      where: { landingpageId, platform: 'github', type: 'follow' },
      _sum: { count: true },
    }),
  ]);

  return {
    available: true,
    portfolioViews,
    projectsCount,
    socialInteractions: social._sum.count || 0,
    linkedinFollowers: linkedin._sum.count || 0,
    githubFollowers: github._sum.count || 0,
    viewsComparison: calculateDashboardComparison(
      portfolioViews,
      previousViews
    ),
  };
}

export async function buildOperationalDashboard(
  user: DashboardUser,
  input: Partial<DashboardFilters>
): Promise<OperationalDashboardData> {
  const now = new Date();
  const { filters, range } = normalizeDashboardFilters(input, now);
  const organizationId = filters.organizationId || null;

  if (filters.scope === 'organization' && !organizationId) {
    throw new OrganizationAuthorizationError();
  }
  if (filters.scope === 'personal' && filters.type === 'TICKET') {
    throw new Error('Chamados exigem um escopo organizacional.');
  }
  if (
    !organizationId &&
    (filters.teamId ||
      filters.queueId ||
      (filters.assigneeId &&
        filters.assigneeId !== 'me' &&
        filters.assigneeId !== 'unassigned'))
  ) {
    throw new OrganizationAuthorizationError();
  }

  const membership =
    organizationId && filters.scope !== 'personal'
      ? await requireOrganizationMembership(user.id, organizationId)
      : null;

  const role = membership?.role || null;
  const ticketVisibility = role
    ? ticketVisibilityWhere(user.id, role)
    : ({} satisfies Prisma.TicketWhereInput);
  const ticketMineWhere: Prisma.TicketWhereInput =
    filters.scope === 'mine'
      ? { OR: [{ requesterId: user.id }, { assigneeId: user.id }] }
      : {};
  const canonicalTicketWhere: Prisma.TicketWhereInput | null =
    organizationId && filters.scope !== 'personal'
      ? {
          organizationId,
          AND: [ticketVisibility, ticketMineWhere],
        }
      : null;

  const tasksEnabled =
    (filters.type === 'ALL' || filters.type === 'TASK') && !filters.queueId;
  const ticketsEnabled =
    (filters.type === 'ALL' || filters.type === 'TICKET') &&
    Boolean(canonicalTicketWhere) &&
    !filters.projectId;
  const notesEnabled = filters.type === 'ALL' || filters.type === 'NOTE';

  const assigneeId =
    filters.assigneeId === 'me'
      ? user.id
      : filters.assigneeId === 'unassigned'
        ? null
        : filters.assigneeId;
  const permittedQueueWhere: Prisma.TicketQueueWhereInput =
    organizationId && role
      ? organizationDashboardQueueWhere(organizationId, user.id, role)
      : { id: { in: [] } };

  const [targetTeam, targetQueue, targetMember, targetProject] =
    await Promise.all([
      filters.teamId && organizationId
        ? db.team.findFirst({
            where: { id: filters.teamId, organizationId },
            select: { id: true },
          })
        : null,
      filters.queueId && organizationId
        ? db.ticketQueue.findFirst({
            where: {
              id: filters.queueId,
              ...permittedQueueWhere,
            },
            select: { id: true },
          })
        : null,
      assigneeId && organizationId
        ? db.organizationMember.findFirst({
            where: { organizationId, userId: assigneeId },
            select: { userId: true },
          })
        : null,
      filters.projectId
        ? db.project.findFirst({
            where: { id: filters.projectId, userId: user.id },
            select: { id: true },
          })
        : null,
    ]);
  if (
    (filters.teamId && !targetTeam) ||
    (filters.queueId && !targetQueue) ||
    (assigneeId && organizationId && !targetMember) ||
    (filters.projectId && !targetProject)
  ) {
    throw new OrganizationAuthorizationError();
  }

  const taskScope =
    filters.scope === 'personal' || !organizationId
      ? 'personal'
      : filters.scope === 'organization'
        ? 'organization'
        : 'mine';
  const taskAccessWhere = tasksEnabled
    ? await buildTaskAccessWhere(user.id, {
        organizationId: taskScope === 'personal' ? undefined : organizationId!,
        scope: taskScope,
        teamId: filters.teamId,
      })
    : ({} satisfies Prisma.TaskWhereInput);
  const taskStatuses = taskStatusesForDashboard(filters.status);
  const taskFilterWhere: Prisma.TaskWhereInput = {
    ...(taskStatuses ? { status: { in: taskStatuses } } : {}),
    ...(filters.priority ? { priority: filters.priority.toLowerCase() } : {}),
    ...(assigneeId !== undefined ? { assigneeId } : {}),
    ...(filters.teamId ? { teamId: filters.teamId } : {}),
    ...(filters.projectId ? { projectId: filters.projectId } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
            {
              project: {
                title: { contains: filters.search, mode: 'insensitive' },
              },
            },
            { tags: { has: filters.search.toLowerCase() } },
          ],
        }
      : {}),
  };
  const canonicalTaskConstraint: Prisma.TaskWhereInput = canonicalTicketWhere
    ? { NOT: { linkedTicket: { is: canonicalTicketWhere } } }
    : {};
  const taskSnapshotWhere: Prisma.TaskWhereInput = tasksEnabled
    ? {
        AND: [taskAccessWhere, taskFilterWhere, canonicalTaskConstraint],
      }
    : { id: { in: [] } };

  const ticketStatuses = ticketStatusesForDashboard(filters.status);
  const ticketFilterWhere: Prisma.TicketWhereInput = {
    ...(ticketStatuses ? { status: { in: ticketStatuses } } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(assigneeId !== undefined ? { assigneeId } : {}),
    ...(filters.teamId ? { teamId: filters.teamId } : {}),
    ...(filters.queueId ? { queueId: filters.queueId } : {}),
    ...(filters.search
      ? {
          OR: [
            { id: { contains: filters.search, mode: 'insensitive' } },
            { title: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
            {
              queue: {
                name: { contains: filters.search, mode: 'insensitive' },
              },
            },
          ],
        }
      : {}),
  };
  const ticketSnapshotWhere: Prisma.TicketWhereInput = ticketsEnabled
    ? { AND: [canonicalTicketWhere!, ticketFilterWhere] }
    : { id: { in: [] } };

  const personalNotes: Prisma.NoteWhereInput = {
    userId: user.id,
    organizationId: null,
    scopeKey: personalNoteScope(user.id),
  };
  const organizationNotes: Prisma.NoteWhereInput | null = organizationId
    ? {
        organizationId,
        scopeKey: organizationNoteScope(organizationId),
      }
    : null;
  const noteAccessWhere: Prisma.NoteWhereInput =
    filters.scope === 'personal' || !organizationNotes
      ? personalNotes
      : filters.scope === 'organization'
        ? organizationNotes
        : { OR: [personalNotes, organizationNotes] };
  const noteStatuses = noteStatusesForDashboard(filters.status);
  const noteFilterWhere: Prisma.NoteWhereInput = {
    trashedAt: null,
    ...(noteStatuses ? { status: { in: noteStatuses } } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { excerpt: { contains: filters.search, mode: 'insensitive' } },
            {
              tags: {
                some: {
                  name: { contains: filters.search, mode: 'insensitive' },
                },
              },
            },
          ],
        }
      : {}),
  };
  const noteSnapshotWhere: Prisma.NoteWhereInput = notesEnabled
    ? { AND: [noteAccessWhere, noteFilterWhere] }
    : { id: { in: [] } };

  const today = startOfToday(now);
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const nextSevenDays = new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000);
  const currentTaskCreatedWhere = withDate(
    taskSnapshotWhere,
    'createdAt',
    range.start,
    range.end
  );
  const previousTaskCreatedWhere = withDate(
    taskSnapshotWhere,
    'createdAt',
    range.previousStart,
    range.previousEnd
  );
  const currentTicketCreatedWhere = withTicketDate(
    ticketSnapshotWhere,
    'createdAt',
    range.start,
    range.end
  );
  const previousTicketCreatedWhere = withTicketDate(
    ticketSnapshotWhere,
    'createdAt',
    range.previousStart,
    range.previousEnd
  );
  const currentNoteCreatedWhere = withNoteDate(
    noteSnapshotWhere,
    'createdAt',
    range.start,
    range.end
  );
  const previousNoteCreatedWhere = withNoteDate(
    noteSnapshotWhere,
    'createdAt',
    range.previousStart,
    range.previousEnd
  );

  const queueOptionsWhere = permittedQueueWhere;

  const [
    taskStatusGroups,
    ticketStatusGroups,
    noteStatusGroups,
    taskPriorityGroups,
    ticketPriorityGroups,
    taskOverdue,
    taskDueToday,
    taskDueNextSeven,
    taskUrgent,
    taskHigh,
    taskUnassigned,
    taskMine,
    taskPersonal,
    taskOrganizational,
    taskHours,
    taskCreated,
    taskCreatedPrevious,
    taskCreatedCompleted,
    taskCompleted,
    taskCompletedPrevious,
    ticketUrgent,
    ticketUnassigned,
    ticketAssignedToMe,
    ticketRequestedByMe,
    ticketCreated,
    ticketCreatedPrevious,
    ticketResolved,
    ticketResolvedPrevious,
    ticketClosed,
    ticketClosedPrevious,
    resolvedDurations,
    noteCreated,
    noteCreatedPrevious,
    noteUpdated,
    noteFavorites,
    noteFolders,
    queueGroups,
    taskAssigneeGroups,
    ticketAssigneeGroups,
    taskUrgentAssigneeGroups,
    ticketUrgentAssigneeGroups,
    taskTeamGroups,
    ticketTeamGroups,
    taskUrgentTeamGroups,
    ticketUrgentTeamGroups,
    attentionTasks,
    attentionTickets,
    pendingTasks,
    pendingTickets,
    upcomingRows,
    recentTicketRows,
    recentNoteRows,
    taskActivities,
    ticketActivities,
    members,
    teams,
    queues,
    projects,
    portfolio,
  ] = await Promise.all([
    db.task.groupBy({
      by: ['status'],
      where: taskSnapshotWhere,
      _count: { _all: true },
    }),
    db.ticket.groupBy({
      by: ['status'],
      where: ticketSnapshotWhere,
      _count: { _all: true },
    }),
    db.note.groupBy({
      by: ['status'],
      where: noteSnapshotWhere,
      _count: { _all: true },
    }),
    db.task.groupBy({
      by: ['priority'],
      where: taskSnapshotWhere,
      _count: { _all: true },
    }),
    db.ticket.groupBy({
      by: ['priority'],
      where: ticketSnapshotWhere,
      _count: { _all: true },
    }),
    db.task.count({
      where: {
        AND: [
          taskSnapshotWhere,
          { status: { not: 'completed' }, dueDate: { lt: today } },
        ],
      },
    }),
    db.task.count({
      where: {
        AND: [
          taskSnapshotWhere,
          {
            status: { not: 'completed' },
            dueDate: { gte: today, lt: tomorrow },
          },
        ],
      },
    }),
    db.task.count({
      where: {
        AND: [
          taskSnapshotWhere,
          {
            status: { not: 'completed' },
            dueDate: { gte: today, lt: nextSevenDays },
          },
        ],
      },
    }),
    db.task.count({
      where: {
        AND: [
          taskSnapshotWhere,
          { status: { not: 'completed' }, priority: 'urgent' },
        ],
      },
    }),
    db.task.count({
      where: {
        AND: [
          taskSnapshotWhere,
          { status: { not: 'completed' }, priority: 'high' },
        ],
      },
    }),
    db.task.count({
      where: {
        AND: [
          taskSnapshotWhere,
          { status: { not: 'completed' }, assigneeId: null },
        ],
      },
    }),
    db.task.count({
      where: { AND: [taskSnapshotWhere, { assigneeId: user.id }] },
    }),
    db.task.count({
      where: { AND: [taskSnapshotWhere, { organizationId: null }] },
    }),
    db.task.count({
      where: { AND: [taskSnapshotWhere, { organizationId: { not: null } }] },
    }),
    db.task.aggregate({
      where: taskSnapshotWhere,
      _sum: { estimatedHours: true, actualHours: true },
    }),
    db.task.count({ where: currentTaskCreatedWhere }),
    db.task.count({ where: previousTaskCreatedWhere }),
    db.task.count({
      where: { AND: [currentTaskCreatedWhere, { status: 'completed' }] },
    }),
    db.task.count({
      where: withDate(taskSnapshotWhere, 'completedAt', range.start, range.end),
    }),
    db.task.count({
      where: withDate(
        taskSnapshotWhere,
        'completedAt',
        range.previousStart,
        range.previousEnd
      ),
    }),
    db.ticket.count({
      where: {
        AND: [
          ticketSnapshotWhere,
          { status: { in: ACTIVE_TICKET_STATUSES }, priority: 'URGENT' },
        ],
      },
    }),
    db.ticket.count({
      where: {
        AND: [
          ticketSnapshotWhere,
          { status: { in: ACTIVE_TICKET_STATUSES }, assigneeId: null },
        ],
      },
    }),
    db.ticket.count({
      where: { AND: [ticketSnapshotWhere, { assigneeId: user.id }] },
    }),
    db.ticket.count({
      where: { AND: [ticketSnapshotWhere, { requesterId: user.id }] },
    }),
    db.ticket.count({ where: currentTicketCreatedWhere }),
    db.ticket.count({ where: previousTicketCreatedWhere }),
    db.ticket.count({
      where: withTicketDate(
        ticketSnapshotWhere,
        'resolvedAt',
        range.start,
        range.end
      ),
    }),
    db.ticket.count({
      where: withTicketDate(
        ticketSnapshotWhere,
        'resolvedAt',
        range.previousStart,
        range.previousEnd
      ),
    }),
    db.ticket.count({
      where: withTicketDate(
        ticketSnapshotWhere,
        'closedAt',
        range.start,
        range.end
      ),
    }),
    db.ticket.count({
      where: withTicketDate(
        ticketSnapshotWhere,
        'closedAt',
        range.previousStart,
        range.previousEnd
      ),
    }),
    db.ticket.findMany({
      where: withTicketDate(
        ticketSnapshotWhere,
        'resolvedAt',
        range.start,
        range.end
      ),
      select: { createdAt: true, resolvedAt: true },
    }),
    db.note.count({ where: currentNoteCreatedWhere }),
    db.note.count({ where: previousNoteCreatedWhere }),
    db.note.count({
      where: withNoteDate(
        noteSnapshotWhere,
        'updatedAt',
        range.start,
        range.end
      ),
    }),
    db.note.count({
      where: { AND: [noteSnapshotWhere, { isFavorite: true }] },
    }),
    notesEnabled
      ? db.noteFolder.count({
          where: {
            deletedAt: null,
            trashedAt: null,
            ...(filters.scope === 'personal' || !organizationId
              ? {
                  userId: user.id,
                  organizationId: null,
                  scopeKey: personalNoteScope(user.id),
                }
              : filters.scope === 'organization'
                ? {
                    organizationId,
                    scopeKey: organizationNoteScope(organizationId),
                  }
                : {
                    OR: [
                      {
                        userId: user.id,
                        organizationId: null,
                        scopeKey: personalNoteScope(user.id),
                      },
                      {
                        organizationId,
                        scopeKey: organizationNoteScope(organizationId),
                      },
                    ],
                  }),
          },
        })
      : Promise.resolve(0),
    db.ticket.groupBy({
      by: ['queueId', 'status'],
      where: ticketSnapshotWhere,
      _count: { _all: true },
    }),
    db.task.groupBy({
      by: ['assigneeId'],
      where: { AND: [taskSnapshotWhere, { status: { not: 'completed' } }] },
      _count: { _all: true },
    }),
    db.ticket.groupBy({
      by: ['assigneeId'],
      where: {
        AND: [ticketSnapshotWhere, { status: { in: ACTIVE_TICKET_STATUSES } }],
      },
      _count: { _all: true },
    }),
    db.task.groupBy({
      by: ['assigneeId'],
      where: {
        AND: [
          taskSnapshotWhere,
          { status: { not: 'completed' }, priority: 'urgent' },
        ],
      },
      _count: { _all: true },
    }),
    db.ticket.groupBy({
      by: ['assigneeId'],
      where: {
        AND: [
          ticketSnapshotWhere,
          { status: { in: ACTIVE_TICKET_STATUSES }, priority: 'URGENT' },
        ],
      },
      _count: { _all: true },
    }),
    db.task.groupBy({
      by: ['teamId'],
      where: { AND: [taskSnapshotWhere, { status: { not: 'completed' } }] },
      _count: { _all: true },
    }),
    db.ticket.groupBy({
      by: ['teamId'],
      where: {
        AND: [ticketSnapshotWhere, { status: { in: ACTIVE_TICKET_STATUSES } }],
      },
      _count: { _all: true },
    }),
    db.task.groupBy({
      by: ['teamId'],
      where: {
        AND: [
          taskSnapshotWhere,
          { status: { not: 'completed' }, priority: 'urgent' },
        ],
      },
      _count: { _all: true },
    }),
    db.ticket.groupBy({
      by: ['teamId'],
      where: {
        AND: [
          ticketSnapshotWhere,
          { status: { in: ACTIVE_TICKET_STATUSES }, priority: 'URGENT' },
        ],
      },
      _count: { _all: true },
    }),
    db.task.findMany({
      where: {
        AND: [
          taskSnapshotWhere,
          { status: { not: 'completed' } },
          {
            OR: [
              { priority: { in: ['urgent', 'high'] } },
              { dueDate: { lt: tomorrow } },
            ],
          },
        ],
      },
      select: taskItemSelect,
      orderBy: { updatedAt: 'desc' },
      take: 40,
    }),
    db.ticket.findMany({
      where: {
        AND: [
          ticketSnapshotWhere,
          { status: { in: ACTIVE_TICKET_STATUSES } },
          { OR: [{ priority: 'URGENT' }, { assigneeId: null }] },
        ],
      },
      select: ticketItemSelect,
      orderBy: { updatedAt: 'desc' },
      take: 40,
    }),
    db.task.findMany({
      where: { AND: [taskSnapshotWhere, { status: { not: 'completed' } }] },
      select: taskItemSelect,
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
    db.ticket.findMany({
      where: {
        AND: [ticketSnapshotWhere, { status: { in: ACTIVE_TICKET_STATUSES } }],
      },
      select: ticketItemSelect,
      orderBy: { updatedAt: 'desc' },
      take: 20,
    }),
    db.task.findMany({
      where: {
        AND: [
          taskSnapshotWhere,
          { status: { not: 'completed' }, dueDate: { lt: nextSevenDays } },
        ],
      },
      select: taskItemSelect,
      orderBy: { dueDate: 'asc' },
      take: 40,
    }),
    db.ticket.findMany({
      where: {
        AND: [
          ticketSnapshotWhere,
          { updatedAt: { gte: range.start, lt: range.end } },
        ],
      },
      select: ticketItemSelect,
      orderBy: { updatedAt: 'desc' },
      take: 30,
    }),
    db.note.findMany({
      where: withNoteDate(
        noteSnapshotWhere,
        'updatedAt',
        range.start,
        range.end
      ),
      select: {
        id: true,
        title: true,
        status: true,
        isFavorite: true,
        organizationId: true,
        updatedAt: true,
        organization: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 6,
    }),
    db.taskActivityLog.findMany({
      where: {
        createdAt: { gte: range.start, lt: range.end },
        task: { is: taskSnapshotWhere },
      },
      select: {
        id: true,
        message: true,
        createdAt: true,
        user: { select: { name: true, username: true } },
        task: {
          select: {
            id: true,
            title: true,
            organizationId: true,
            organization: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.ticketActivity.findMany({
      where: {
        createdAt: { gte: range.start, lt: range.end },
        ticket: { is: ticketSnapshotWhere },
      },
      select: {
        id: true,
        message: true,
        createdAt: true,
        actor: { select: { name: true, username: true } },
        ticket: {
          select: { id: true, title: true, queue: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    organizationId && filters.scope !== 'personal'
      ? db.organizationMember.findMany({
          where: { organizationId },
          select: {
            user: { select: { id: true, name: true, username: true } },
          },
          orderBy: { user: { name: 'asc' } },
        })
      : Promise.resolve([]),
    organizationId && filters.scope !== 'personal'
      ? db.team.findMany({
          where: { organizationId, active: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
    organizationId && filters.scope !== 'personal'
      ? db.ticketQueue.findMany({
          where: queueOptionsWhere,
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
    db.project.findMany({
      where: { userId: user.id, isActive: true },
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    }),
    loadPortfolioAnalytics(user.id, user.landingPages[0]?.id, range),
  ]);

  const timelineBuckets = buildTimelineBuckets(range.start, range.end);
  // Prisma não agrupa DateTime por dia. Para evitar dezenas de counts por
  // bucket, buscamos somente timestamps já autorizados e agregamos no servidor.
  const [
    taskCreatedEvents,
    ticketCreatedEvents,
    taskCompletedEvents,
    ticketCompletedEvents,
    noteCreatedEvents,
  ] = await Promise.all([
    db.task.findMany({
      where: currentTaskCreatedWhere,
      select: { createdAt: true },
    }),
    db.ticket.findMany({
      where: currentTicketCreatedWhere,
      select: { createdAt: true },
    }),
    db.task.findMany({
      where: withDate(taskSnapshotWhere, 'completedAt', range.start, range.end),
      select: { completedAt: true },
    }),
    db.ticket.findMany({
      where: {
        AND: [
          ticketSnapshotWhere,
          {
            OR: [
              { resolvedAt: { gte: range.start, lt: range.end } },
              { closedAt: { gte: range.start, lt: range.end } },
            ],
          },
        ],
      },
      select: { resolvedAt: true, closedAt: true },
    }),
    db.note.findMany({
      where: currentNoteCreatedWhere,
      select: { createdAt: true },
    }),
  ]);
  const inBucket = (date: Date | null, start: Date, end: Date) =>
    Boolean(date && date >= start && date < end);
  const timeline: TimelinePoint[] = timelineBuckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    created:
      taskCreatedEvents.filter((event) =>
        inBucket(event.createdAt, bucket.start, bucket.end)
      ).length +
      ticketCreatedEvents.filter((event) =>
        inBucket(event.createdAt, bucket.start, bucket.end)
      ).length,
    completed:
      taskCompletedEvents.filter((event) =>
        inBucket(event.completedAt, bucket.start, bucket.end)
      ).length +
      ticketCompletedEvents.filter((event) =>
        inBucket(event.resolvedAt || event.closedAt, bucket.start, bucket.end)
      ).length,
    notes: noteCreatedEvents.filter((event) =>
      inBucket(event.createdAt, bucket.start, bucket.end)
    ).length,
  }));

  const taskStatus = {
    pending: countStatus(taskStatusGroups, 'pending'),
    inProgress: countStatus(taskStatusGroups, 'in-progress'),
    completed: countStatus(taskStatusGroups, 'completed'),
  };
  const ticketStatus = {
    OPEN: countStatus(ticketStatusGroups, 'OPEN'),
    IN_PROGRESS: countStatus(ticketStatusGroups, 'IN_PROGRESS'),
    WAITING: countStatus(ticketStatusGroups, 'WAITING'),
    RESOLVED: countStatus(ticketStatusGroups, 'RESOLVED'),
    CLOSED: countStatus(ticketStatusGroups, 'CLOSED'),
  };
  const noteStatus: Record<NoteStatus, number> = {
    DRAFT: countStatus(noteStatusGroups, 'DRAFT'),
    PUBLISHED: countStatus(noteStatusGroups, 'PUBLISHED'),
    ARCHIVED: countStatus(noteStatusGroups, 'ARCHIVED'),
  };

  const workByStatus: WorkStatusPoint[] = [
    ['BACKLOG', taskStatus.pending, ticketStatus.OPEN],
    ['IN_PROGRESS', taskStatus.inProgress, ticketStatus.IN_PROGRESS],
    ['WAITING', 0, ticketStatus.WAITING],
    ['DONE', taskStatus.completed, ticketStatus.RESOLVED],
    ['CLOSED', 0, ticketStatus.CLOSED],
  ].map(([lane, tasksCount, ticketsCount]) => ({
    lane: lane as WorkLane,
    label: STATUS_LABELS[lane as WorkLane],
    tasks: Number(tasksCount),
    tickets: Number(ticketsCount),
    total: Number(tasksCount) + Number(ticketsCount),
  }));

  const workByPriority: PriorityPoint[] = (
    ['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as WorkPriority[]
  ).map((priority) => {
    const tasksCount = countPriority(
      taskPriorityGroups,
      priority.toLowerCase()
    );
    const ticketsCount = countPriority(ticketPriorityGroups, priority);
    return {
      priority,
      label: PRIORITY_LABELS[priority],
      tasks: tasksCount,
      tickets: ticketsCount,
      total: tasksCount + ticketsCount,
    };
  });

  const queueStats: QueueStat[] = queues
    .map((queue) => {
      const value = (status: TicketStatus) =>
        queueGroups.find(
          (row) => row.queueId === queue.id && row.status === status
        )?._count._all || 0;
      const open = value('OPEN');
      const inProgress = value('IN_PROGRESS');
      const waiting = value('WAITING');
      const resolved = value('RESOLVED');
      return {
        id: queue.id,
        name: queue.name,
        open,
        inProgress,
        waiting,
        resolved,
        total: open + inProgress + waiting + resolved + value('CLOSED'),
      };
    })
    .filter((queue) => queue.total > 0);

  const taskAssigneeCounts = new Map(
    taskAssigneeGroups.map((row) => [
      row.assigneeId || 'unassigned',
      row._count._all,
    ])
  );
  const ticketAssigneeCounts = new Map(
    ticketAssigneeGroups.map((row) => [
      row.assigneeId || 'unassigned',
      row._count._all,
    ])
  );
  const taskUrgentAssigneeCounts = new Map(
    taskUrgentAssigneeGroups.map((row) => [
      row.assigneeId || 'unassigned',
      row._count._all,
    ])
  );
  const ticketUrgentAssigneeCounts = new Map(
    ticketUrgentAssigneeGroups.map((row) => [
      row.assigneeId || 'unassigned',
      row._count._all,
    ])
  );
  const memberWorkload: WorkloadPoint[] = members
    .map((member) => {
      const tasksCount = taskAssigneeCounts.get(member.user.id) || 0;
      const ticketsCount = ticketAssigneeCounts.get(member.user.id) || 0;
      return {
        id: member.user.id,
        name: member.user.name || `@${member.user.username}`,
        tasks: tasksCount,
        tickets: ticketsCount,
        urgent:
          (taskUrgentAssigneeCounts.get(member.user.id) || 0) +
          (ticketUrgentAssigneeCounts.get(member.user.id) || 0),
        total: tasksCount + ticketsCount,
      };
    })
    .filter((member) => member.total > 0);
  const unassignedTasks = taskAssigneeCounts.get('unassigned') || 0;
  const unassignedTickets = ticketAssigneeCounts.get('unassigned') || 0;
  if (unassignedTasks + unassignedTickets > 0) {
    memberWorkload.push({
      id: 'unassigned',
      name: 'Sem responsável',
      tasks: unassignedTasks,
      tickets: unassignedTickets,
      urgent:
        (taskUrgentAssigneeCounts.get('unassigned') || 0) +
        (ticketUrgentAssigneeCounts.get('unassigned') || 0),
      total: unassignedTasks + unassignedTickets,
    });
  }
  memberWorkload.sort((left, right) => right.total - left.total);

  const taskTeamCounts = new Map(
    taskTeamGroups.map((row) => [row.teamId || 'unassigned', row._count._all])
  );
  const ticketTeamCounts = new Map(
    ticketTeamGroups.map((row) => [row.teamId || 'unassigned', row._count._all])
  );
  const taskUrgentTeamCounts = new Map(
    taskUrgentTeamGroups.map((row) => [
      row.teamId || 'unassigned',
      row._count._all,
    ])
  );
  const ticketUrgentTeamCounts = new Map(
    ticketUrgentTeamGroups.map((row) => [
      row.teamId || 'unassigned',
      row._count._all,
    ])
  );
  const teamWorkload: WorkloadPoint[] = teams
    .map((team) => {
      const tasksCount = taskTeamCounts.get(team.id) || 0;
      const ticketsCount = ticketTeamCounts.get(team.id) || 0;
      return {
        id: team.id,
        name: team.name,
        tasks: tasksCount,
        tickets: ticketsCount,
        urgent:
          (taskUrgentTeamCounts.get(team.id) || 0) +
          (ticketUrgentTeamCounts.get(team.id) || 0),
        total: tasksCount + ticketsCount,
      };
    })
    .filter((team) => team.total > 0)
    .sort((left, right) => right.total - left.total);

  const attentionItems = [
    ...attentionTasks.map(taskToDashboardItem),
    ...attentionTickets.map(ticketToDashboardItem),
  ]
    .map((item) => attentionFromWorkItem(item, today, tomorrow))
    .filter((item): item is DashboardAttentionItem => Boolean(item))
    .sort(
      (left, right) => right.score - left.score || workItemSort(left, right)
    )
    .slice(0, 8);
  const pendingWork = [
    ...pendingTasks.map(taskToDashboardItem),
    ...pendingTickets.map(ticketToDashboardItem),
  ]
    .sort(workItemSort)
    .slice(0, 10);

  const upcomingMapped = upcomingRows.map(taskToDashboardItem);
  const upcomingGroups = [
    {
      key: 'overdue',
      label: 'Vencidas',
      items: upcomingMapped.filter(
        (item) => item.dueDate && new Date(item.dueDate) < today
      ),
    },
    {
      key: 'today',
      label: 'Hoje',
      items: upcomingMapped.filter((item) => {
        const date = item.dueDate ? new Date(item.dueDate) : null;
        return Boolean(date && date >= today && date < tomorrow);
      }),
    },
    {
      key: 'tomorrow',
      label: 'Amanhã',
      items: upcomingMapped.filter((item) => {
        const date = item.dueDate ? new Date(item.dueDate) : null;
        const afterTomorrow = new Date(
          tomorrow.getTime() + 24 * 60 * 60 * 1000
        );
        return Boolean(date && date >= tomorrow && date < afterTomorrow);
      }),
    },
    {
      key: 'week',
      label: 'Próximos 7 dias',
      items: upcomingMapped.filter((item) => {
        const date = item.dueDate ? new Date(item.dueDate) : null;
        const afterTomorrow = new Date(
          tomorrow.getTime() + 24 * 60 * 60 * 1000
        );
        return Boolean(date && date >= afterTomorrow && date < nextSevenDays);
      }),
    },
  ] satisfies DashboardUpcomingGroup[];
  const upcomingTasks: DashboardUpcomingGroup[] = upcomingGroups.map(
    (group) => ({ ...group, items: group.items.slice(0, 6) })
  );

  const recentNotes: DashboardNoteItem[] = recentNoteRows.map((note) => ({
    id: note.id,
    title: note.title,
    status: note.status,
    isFavorite: note.isFavorite,
    source: note.organizationId ? 'KCS' : 'PERSONAL',
    organizationId: note.organizationId,
    organizationName: note.organization?.name || null,
    updatedAt: note.updatedAt.toISOString(),
  }));

  const recentActivity: DashboardActivityItem[] = [
    ...taskActivities.flatMap((activity) =>
      activity.task
        ? [
            {
              id: `TASK:${activity.id}`,
              kind: 'TASK' as const,
              itemId: activity.task.id,
              title: activity.task.title,
              message: activity.message,
              actorName: displayName(activity.user),
              sourceLabel: activity.task.organizationId
                ? `Task • ${activity.task.organization?.name || 'Organização'}`
                : 'Task pessoal',
              timestamp: activity.createdAt.toISOString(),
            },
          ]
        : []
    ),
    ...ticketActivities.map((activity) => ({
      id: `TICKET:${activity.id}`,
      kind: 'TICKET' as const,
      itemId: activity.ticket.id,
      title: activity.ticket.title,
      message: activity.message,
      actorName: displayName(activity.actor),
      sourceLabel: `Chamado • ${activity.ticket.queue.name}`,
      timestamp: activity.createdAt.toISOString(),
    })),
    ...recentNotes.map((note) => ({
      id: `NOTE:${note.id}:${note.updatedAt}`,
      kind: 'NOTE' as const,
      itemId: note.id,
      title: note.title,
      message: 'Nota atualizada',
      actorName: null,
      sourceLabel:
        note.source === 'KCS'
          ? `KCS • ${note.organizationName || 'Organização'}`
          : 'Nota pessoal',
      timestamp: note.updatedAt,
    })),
  ]
    .sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    )
    .slice(0, 10);

  const averageResolutionMinutes = resolvedDurations.length
    ? Math.round(
        resolvedDurations.reduce((total, ticket) => {
          if (!ticket.resolvedAt) return total;
          return (
            total +
            (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / 60000
          );
        }, 0) / resolvedDurations.length
      )
    : null;
  const notesTotal =
    noteStatus.DRAFT + noteStatus.PUBLISHED + noteStatus.ARCHIVED;
  const taskTotal =
    taskStatus.pending + taskStatus.inProgress + taskStatus.completed;
  const completedWorkCurrent = taskCompleted + ticketResolved + ticketClosed;
  const completedWorkPrevious =
    taskCompletedPrevious + ticketResolvedPrevious + ticketClosedPrevious;

  return {
    meta: {
      generatedAt: now.toISOString(),
      scope: filters.scope,
      organization: membership
        ? {
            id: membership.organization.id,
            name: membership.organization.name,
            role: membership.role,
          }
        : null,
      period: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        previousStart: range.previousStart.toISOString(),
        previousEnd: range.previousEnd.toISOString(),
      },
    },
    options: {
      members: members.map((member) => ({
        id: member.user.id,
        label: member.user.name || `@${member.user.username}`,
      })),
      teams: teams.map((team) => ({ id: team.id, label: team.name })),
      queues: queues.map((queue) => ({ id: queue.id, label: queue.name })),
      projects: projects.map((project) => ({
        id: project.id,
        label: project.title,
      })),
    },
    summary: {
      pendingWork:
        taskStatus.pending +
        taskStatus.inProgress +
        ticketStatus.OPEN +
        ticketStatus.IN_PROGRESS +
        ticketStatus.WAITING,
      overdueTasks: taskOverdue,
      dueTodayTasks: taskDueToday,
      openTickets: ticketStatus.OPEN,
      unassignedTickets: ticketUnassigned,
      inProgressWork: taskStatus.inProgress + ticketStatus.IN_PROGRESS,
      completedInPeriod: completedWorkCurrent,
      urgentWork: taskUrgent + ticketUrgent,
      knowledgeTotal: notesTotal,
      knowledgeUpdatedInPeriod: noteUpdated,
      comparisons: {
        createdWork: calculateDashboardComparison(
          taskCreated + ticketCreated,
          taskCreatedPrevious + ticketCreatedPrevious
        ),
        completedWork: calculateDashboardComparison(
          completedWorkCurrent,
          completedWorkPrevious
        ),
        notesCreated: calculateDashboardComparison(
          noteCreated,
          noteCreatedPrevious
        ),
      },
    },
    tasks: {
      total: taskTotal,
      pending: taskStatus.pending,
      inProgress: taskStatus.inProgress,
      completed: taskStatus.completed,
      completedInPeriod: taskCompleted,
      overdue: taskOverdue,
      dueToday: taskDueToday,
      dueNextSevenDays: taskDueNextSeven,
      urgent: taskUrgent,
      high: taskHigh,
      unassigned: taskUnassigned,
      mine: taskMine,
      personal: taskPersonal,
      organizational: taskOrganizational,
      estimatedHours: taskHours._sum.estimatedHours || 0,
      actualHours: taskHours._sum.actualHours || 0,
      // Denominador: Tasks criadas no período que obedecem aos filtros atuais.
      completionRate:
        taskCreated === 0
          ? null
          : Math.round((taskCreatedCompleted / taskCreated) * 1000) / 10,
    },
    tickets: {
      ...ticketStatus,
      urgent: ticketUrgent,
      unassigned: ticketUnassigned,
      assignedToMe: ticketAssignedToMe,
      requestedByMe: ticketRequestedByMe,
      createdInPeriod: ticketCreated,
      resolvedInPeriod: ticketResolved,
      closedInPeriod: ticketClosed,
      averageResolutionMinutes,
    },
    notes: {
      total: notesTotal,
      draft: noteStatus.DRAFT,
      published: noteStatus.PUBLISHED,
      archived: noteStatus.ARCHIVED,
      favorites: noteFavorites,
      createdInPeriod: noteCreated,
      updatedInPeriod: noteUpdated,
      folders: noteFolders,
    },
    workByStatus,
    workByPriority,
    timeline,
    queueStats,
    memberWorkload,
    teamWorkload,
    attentionItems,
    pendingWork,
    upcomingTasks,
    recentTickets: [...recentTicketRows]
      .sort((left, right) => {
        const leftScore =
          (ACTIVE_TICKET_STATUSES.includes(left.status) ? 100 : 0) +
          (left.assigneeId === user.id ? 50 : 0) +
          PRIORITY_SCORE[left.priority];
        const rightScore =
          (ACTIVE_TICKET_STATUSES.includes(right.status) ? 100 : 0) +
          (right.assigneeId === user.id ? 50 : 0) +
          PRIORITY_SCORE[right.priority];
        return (
          rightScore - leftScore ||
          right.updatedAt.getTime() - left.updatedAt.getTime()
        );
      })
      .slice(0, 6)
      .map(ticketToDashboardItem),
    recentNotes,
    recentActivity,
    portfolio,
  };
}

export function organizationDashboardQueueWhere(
  organizationId: string,
  userId: string,
  role: OrganizationRole
): Prisma.TicketQueueWhereInput {
  const visibility = ticketVisibilityWhere(userId, role);
  return {
    organizationId,
    ...(role === 'OWNER' || role === 'ADMIN'
      ? {}
      : {
          OR: [
            { agents: { some: { userId } } },
            { team: { members: { some: { userId } } } },
            { tickets: { some: visibility } },
          ],
        }),
  };
}
