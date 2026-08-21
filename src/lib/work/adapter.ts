import type { TicketStatus } from '@prisma/client';

import type { TaskStatus, TaskWithRelations } from '@/types/tasks';
import type {
  TicketRow,
  WorkItem,
  WorkItemFilters,
  WorkLane,
  WorkPriority,
} from '@/types/work';

const priorityRank: Record<WorkPriority, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export function taskStatusToWorkLane(status: string): WorkLane {
  if (status === 'in-progress') return 'IN_PROGRESS';
  if (status === 'completed') return 'DONE';
  return 'BACKLOG';
}

export function ticketStatusToWorkLane(status: TicketStatus): WorkLane {
  if (status === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (status === 'WAITING') return 'WAITING';
  if (status === 'RESOLVED') return 'DONE';
  if (status === 'CLOSED') return 'CLOSED';
  return 'BACKLOG';
}

export function workLaneToTaskStatus(lane: WorkLane): TaskStatus | null {
  if (lane === 'BACKLOG') return 'pending';
  if (lane === 'IN_PROGRESS') return 'in-progress';
  if (lane === 'DONE') return 'completed';
  return null;
}

export function workLaneToTicketStatus(lane: WorkLane): TicketStatus | null {
  if (lane === 'BACKLOG') return 'OPEN';
  if (lane === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (lane === 'WAITING') return 'WAITING';
  if (lane === 'DONE') return 'RESOLVED';
  if (lane === 'CLOSED') return 'CLOSED';
  return null;
}

function normalizePriority(priority: string): WorkPriority {
  const normalized = priority.toUpperCase();
  if (
    normalized === 'LOW' ||
    normalized === 'HIGH' ||
    normalized === 'URGENT'
  ) {
    return normalized;
  }
  return 'MEDIUM';
}

function displayName(user: { name: string | null; username: string } | null) {
  return user ? user.name || `@${user.username}` : null;
}

export function taskToWorkItem(task: TaskWithRelations): WorkItem {
  return {
    key: `TASK:${task.id}`,
    id: task.id,
    kind: 'TASK',
    title: task.title,
    description: task.description || null,
    lane: taskStatusToWorkLane(task.status),
    priority: normalizePriority(task.priority),
    organizationId: task.organizationId || null,
    teamId: task.teamId || null,
    teamName: task.team?.name || null,
    assigneeId: task.assigneeId || null,
    assigneeName: displayName(task.assignee || null),
    updatedAt: task.updatedAt || task.createdAt || new Date(0),
    projectId: task.projectId || null,
    projectName: task.project?.title || null,
    tags: task.tags || [],
    task,
  };
}

export function ticketToWorkItem(ticket: TicketRow): WorkItem {
  return {
    key: `TICKET:${ticket.id}`,
    id: ticket.id,
    kind: 'TICKET',
    title: ticket.title,
    description: ticket.description,
    lane: ticketStatusToWorkLane(ticket.status),
    priority: ticket.priority,
    organizationId: ticket.organizationId,
    teamId: ticket.teamId,
    teamName: ticket.team?.name || null,
    assigneeId: ticket.assigneeId,
    assigneeName: displayName(ticket.assignee),
    updatedAt: ticket.updatedAt,
    queueId: ticket.queueId,
    queueName: ticket.queue.name,
    requesterId: ticket.requesterId,
    requesterName: displayName(ticket.requester) || 'Solicitante',
    linkedTaskId: ticket.linkedTaskId,
    ticket,
  };
}

export function createWorkItems(
  tasks: TaskWithRelations[],
  tickets: TicketRow[]
): WorkItem[] {
  const canonicalTaskIds = new Set(
    tickets
      .map((ticket) => ticket.linkedTaskId)
      .filter((id): id is string => Boolean(id))
  );

  return [
    ...tasks
      .filter((task) => !canonicalTaskIds.has(task.id))
      .map(taskToWorkItem),
    ...tickets.map(ticketToWorkItem),
  ].sort((left, right) => {
    const dateOrder =
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    if (dateOrder !== 0) return dateOrder;
    return priorityRank[right.priority] - priorityRank[left.priority];
  });
}

export function filterWorkItems(items: WorkItem[], filters: WorkItemFilters) {
  const search = filters.search?.trim().toLocaleLowerCase('pt-BR');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  return items.filter((item) => {
    if (filters.kind && item.kind !== filters.kind) return false;
    if (filters.lane && item.lane !== filters.lane) return false;
    if (filters.priority && item.priority !== filters.priority) return false;
    if (filters.teamId && item.teamId !== filters.teamId) return false;
    if (filters.assigneeId && item.assigneeId !== filters.assigneeId) {
      return false;
    }
    if (filters.queueId) {
      if (item.kind !== 'TICKET' || item.queueId !== filters.queueId) {
        return false;
      }
    }
    if (filters.projectId) {
      if (item.kind !== 'TASK' || item.projectId !== filters.projectId) {
        return false;
      }
    }
    if (filters.tag) {
      if (item.kind !== 'TASK' || !item.tags.includes(filters.tag)) {
        return false;
      }
    }
    if (filters.dueDateRange) {
      if (item.kind !== 'TASK') return false;
      const dueDate = item.task.dueDate ? new Date(item.task.dueDate) : null;
      if (filters.dueDateRange === 'none') {
        if (dueDate) return false;
      } else {
        if (!dueDate || Number.isNaN(dueDate.getTime())) return false;
        if (
          filters.dueDateRange === 'today' &&
          (dueDate < today || dueDate >= tomorrow)
        ) {
          return false;
        }
        if (
          filters.dueDateRange === 'week' &&
          (dueDate < today || dueDate > nextWeek)
        ) {
          return false;
        }
        if (
          filters.dueDateRange === 'overdue' &&
          (dueDate >= today || item.task.status === 'completed')
        ) {
          return false;
        }
      }
    }
    if (search) {
      const haystack =
        `${item.title}\n${item.description || ''}`.toLocaleLowerCase('pt-BR');
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}
