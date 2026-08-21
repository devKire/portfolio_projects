import type {
  NoteStatus,
  OrganizationRole,
  TicketStatus,
} from '@prisma/client';

import type { WorkKind, WorkLane, WorkPriority } from '@/types/work';

export type DashboardScope = 'mine' | 'personal' | 'organization';
export type DashboardPeriod = 'today' | '7d' | '30d' | '90d' | 'custom';
export type DashboardItemType = 'ALL' | 'TASK' | 'TICKET' | 'NOTE';
export type DashboardAssignee = 'me' | 'unassigned' | string;

export type DashboardFilters = {
  organizationId?: string | null;
  scope: DashboardScope;
  period: DashboardPeriod;
  dateFrom?: string;
  dateTo?: string;
  type: DashboardItemType;
  status?: string;
  priority?: WorkPriority;
  assigneeId?: DashboardAssignee;
  teamId?: string;
  queueId?: string;
  projectId?: string;
  search?: string;
};

export type DashboardComparison = {
  current: number;
  previous: number;
  changePercent: number | null;
};

export type DashboardFilterOption = {
  id: string;
  label: string;
};

export type DashboardSummary = {
  pendingWork: number;
  overdueTasks: number;
  dueTodayTasks: number;
  openTickets: number;
  unassignedTickets: number;
  inProgressWork: number;
  completedInPeriod: number;
  urgentWork: number;
  knowledgeTotal: number;
  knowledgeUpdatedInPeriod: number;
  comparisons: {
    createdWork: DashboardComparison;
    completedWork: DashboardComparison;
    notesCreated: DashboardComparison;
  };
};

export type TaskDashboardStats = {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  completedInPeriod: number;
  overdue: number;
  dueToday: number;
  dueNextSevenDays: number;
  urgent: number;
  high: number;
  unassigned: number;
  mine: number;
  personal: number;
  organizational: number;
  estimatedHours: number;
  actualHours: number;
  completionRate: number | null;
};

export type TicketDashboardStats = Record<TicketStatus, number> & {
  urgent: number;
  unassigned: number;
  assignedToMe: number;
  requestedByMe: number;
  createdInPeriod: number;
  resolvedInPeriod: number;
  closedInPeriod: number;
  averageResolutionMinutes: number | null;
};

export type NoteDashboardStats = {
  total: number;
  draft: number;
  published: number;
  archived: number;
  favorites: number;
  createdInPeriod: number;
  updatedInPeriod: number;
  folders: number;
};

export type WorkStatusPoint = {
  lane: WorkLane;
  label: string;
  tasks: number;
  tickets: number;
  total: number;
};

export type PriorityPoint = {
  priority: WorkPriority;
  label: string;
  tasks: number;
  tickets: number;
  total: number;
};

export type TimelinePoint = {
  key: string;
  label: string;
  created: number;
  completed: number;
  notes: number;
};

export type QueueStat = {
  id: string;
  name: string;
  open: number;
  inProgress: number;
  waiting: number;
  resolved: number;
  total: number;
};

export type WorkloadPoint = {
  id: string;
  name: string;
  tasks: number;
  tickets: number;
  urgent: number;
  total: number;
};

export type DashboardWorkItem = {
  key: string;
  id: string;
  kind: WorkKind;
  title: string;
  identifier: string;
  priority: WorkPriority;
  lane: WorkLane;
  dueDate: string | null;
  queueId: string | null;
  queueName: string | null;
  teamId: string | null;
  teamName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  updatedAt: string;
};

export type AttentionReason =
  | 'URGENT_OVERDUE'
  | 'URGENT'
  | 'OVERDUE'
  | 'HIGH'
  | 'UNASSIGNED'
  | 'DUE_TODAY';

export type DashboardAttentionItem = DashboardWorkItem & {
  reason: AttentionReason;
  reasonLabel: string;
  score: number;
};

export type DashboardUpcomingGroup = {
  key: 'overdue' | 'today' | 'tomorrow' | 'week';
  label: string;
  items: DashboardWorkItem[];
};

export type DashboardNoteItem = {
  id: string;
  title: string;
  status: NoteStatus;
  isFavorite: boolean;
  source: 'PERSONAL' | 'KCS';
  organizationId: string | null;
  organizationName: string | null;
  updatedAt: string;
};

export type DashboardActivityItem = {
  id: string;
  kind: 'TASK' | 'TICKET' | 'NOTE';
  itemId: string;
  title: string;
  message: string;
  actorName: string | null;
  sourceLabel: string;
  timestamp: string;
};

export type PortfolioAnalytics = {
  available: boolean;
  portfolioViews: number;
  projectsCount: number;
  socialInteractions: number;
  linkedinFollowers: number;
  githubFollowers: number;
  viewsComparison: DashboardComparison;
};

export type OperationalDashboardData = {
  meta: {
    generatedAt: string;
    scope: DashboardScope;
    organization: {
      id: string;
      name: string;
      role: OrganizationRole;
    } | null;
    period: {
      start: string;
      end: string;
      previousStart: string;
      previousEnd: string;
    };
  };
  options: {
    members: DashboardFilterOption[];
    teams: DashboardFilterOption[];
    queues: DashboardFilterOption[];
    projects: DashboardFilterOption[];
  };
  summary: DashboardSummary;
  tasks: TaskDashboardStats;
  tickets: TicketDashboardStats;
  notes: NoteDashboardStats;
  workByStatus: WorkStatusPoint[];
  workByPriority: PriorityPoint[];
  timeline: TimelinePoint[];
  queueStats: QueueStat[];
  memberWorkload: WorkloadPoint[];
  teamWorkload: WorkloadPoint[];
  attentionItems: DashboardAttentionItem[];
  pendingWork: DashboardWorkItem[];
  upcomingTasks: DashboardUpcomingGroup[];
  recentTickets: DashboardWorkItem[];
  recentNotes: DashboardNoteItem[];
  recentActivity: DashboardActivityItem[];
  portfolio: PortfolioAnalytics;
};

export type ValidatedDashboardFilters = DashboardFilters & {
  dateFrom: string;
  dateTo: string;
};
