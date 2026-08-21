import type {
  TicketActivityType,
  TicketPriority,
  TicketStatus,
} from '@prisma/client';

import type { TaskScope, TaskWithRelations } from '@/types/tasks';

export type WorkLane =
  | 'BACKLOG'
  | 'IN_PROGRESS'
  | 'WAITING'
  | 'DONE'
  | 'CLOSED';

export type WorkKind = 'TASK' | 'TICKET';
export type WorkScope = TaskScope;
export type WorkPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TicketActivityRow = {
  id: string;
  type: TicketActivityType;
  message: string | null;
  comment: string | null;
  before: unknown;
  after: unknown;
  createdAt: Date;
  actor: { id: string; name: string | null; username: string } | null;
};

export type TicketRow = {
  id: string;
  organizationId: string;
  linkedTaskId: string | null;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  queueId: string;
  teamId: string | null;
  requesterId: string;
  assigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
  queue: { id: string; name: string; active: boolean };
  team: { id: string; name: string; active: boolean } | null;
  requester: { id: string; name: string | null; username: string };
  assignee: { id: string; name: string | null; username: string } | null;
  activities: TicketActivityRow[];
};

export type QueueRow = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  teamId: string | null;
  team: { id: string; name: string } | null;
  agents: Array<{
    userId: string;
    organizationMember: {
      user: { id: string; name: string | null; username: string };
    };
  }>;
  _count: { tickets: number };
};

export type WorkMember = {
  id: string;
  name: string | null;
  username: string;
  email: string;
};

export type WorkTeam = { id: string; name: string; active: boolean };

export type TicketWorkspace = {
  tickets: TicketRow[];
  queues: QueueRow[];
  stats: Record<string, number>;
  canManageQueues: boolean;
};

type WorkItemBase = {
  key: string;
  id: string;
  kind: WorkKind;
  title: string;
  description: string | null;
  lane: WorkLane;
  priority: WorkPriority;
  organizationId: string | null;
  teamId: string | null;
  teamName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  updatedAt: Date | string;
};

export type TaskWorkItem = WorkItemBase & {
  kind: 'TASK';
  task: TaskWithRelations;
  projectId: string | null;
  projectName: string | null;
  tags: string[];
};

export type TicketWorkItem = WorkItemBase & {
  kind: 'TICKET';
  ticket: TicketRow;
  queueId: string;
  queueName: string;
  requesterId: string;
  requesterName: string;
  linkedTaskId: string | null;
};

export type WorkItem = TaskWorkItem | TicketWorkItem;

export type WorkItemFilters = {
  search?: string;
  kind?: WorkKind;
  lane?: WorkLane;
  priority?: WorkPriority;
  teamId?: string;
  assigneeId?: string;
  queueId?: string;
  projectId?: string;
  tag?: string;
  dueDateRange?: 'today' | 'week' | 'overdue' | 'none';
};

export type WorkManagerIntent = {
  scope?: WorkScope;
  kind?: WorkKind;
  lane?: WorkLane;
  priority?: WorkPriority;
  teamId?: string;
  assigneeId?: string;
  queueId?: string;
  projectId?: string;
  dueDateRange?: WorkItemFilters['dueDateRange'];
  itemKey?: string;
  view?: 'list' | 'kanban';
};

export type WorkWorkspace = {
  items: WorkItem[];
  queues: QueueRow[];
  canManageQueues: boolean;
  collaboration: {
    teams: Array<{ id: string; name: string }>;
    members: Array<{
      role: string;
      user: WorkMember;
    }>;
  };
};
