import type { NoteStatus, TicketStatus } from '@prisma/client';

import type {
  DashboardComparison,
  DashboardFilters,
  DashboardItemType,
  DashboardPeriod,
} from '@/types/dashboard';
import type { WorkLane, WorkPriority } from '@/types/work';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CUSTOM_RANGE_MS = 366 * DAY_MS;
const PERIODS = new Set<DashboardPeriod>([
  'today',
  '7d',
  '30d',
  '90d',
  'custom',
]);
const SCOPES = new Set(['mine', 'personal', 'organization']);
const ITEM_TYPES = new Set<DashboardItemType>([
  'ALL',
  'TASK',
  'TICKET',
  'NOTE',
]);
const PRIORITIES = new Set<WorkPriority>(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
const TASK_STATUSES = new Set(['pending', 'in-progress', 'completed']);
const TICKET_STATUSES = new Set<TicketStatus>([
  'OPEN',
  'IN_PROGRESS',
  'WAITING',
  'RESOLVED',
  'CLOSED',
]);
const NOTE_STATUSES = new Set<NoteStatus>(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
const WORK_LANES = new Set<WorkLane>([
  'BACKLOG',
  'IN_PROGRESS',
  'WAITING',
  'DONE',
  'CLOSED',
]);

function cleanId(value?: string | null) {
  const cleaned = value?.trim().slice(0, 128);
  return cleaned || undefined;
}

function parseLocalDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Data personalizada inválida.');
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Data personalizada inválida.');
  }
  return date;
}

function startOfLocalDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function normalizeDashboardFilters(
  input: Partial<DashboardFilters>,
  now = new Date()
) {
  const scope = SCOPES.has(input.scope || '') ? input.scope! : 'mine';
  const requestedPeriod = input.period;
  const period: DashboardPeriod =
    requestedPeriod && PERIODS.has(requestedPeriod) ? requestedPeriod : '30d';
  const type = ITEM_TYPES.has(input.type || 'ALL') ? input.type! : 'ALL';
  const priority = PRIORITIES.has(input.priority as WorkPriority)
    ? input.priority
    : undefined;
  const status = input.status?.trim().slice(0, 32) || undefined;

  if (status && !isStatusCompatible(type, status)) {
    throw new Error('Status incompatível com o tipo selecionado.');
  }

  const range = resolveDashboardPeriod(
    period,
    input.dateFrom,
    input.dateTo,
    now
  );

  return {
    filters: {
      organizationId: cleanId(input.organizationId) || null,
      scope,
      period,
      dateFrom: range.start.toISOString(),
      dateTo: range.end.toISOString(),
      type,
      status,
      priority,
      assigneeId: cleanId(input.assigneeId),
      teamId: cleanId(input.teamId),
      queueId: cleanId(input.queueId),
      projectId: cleanId(input.projectId),
      search: input.search?.trim().slice(0, 160) || undefined,
    } satisfies DashboardFilters,
    range,
  };
}

export function resolveDashboardPeriod(
  period: DashboardPeriod,
  dateFrom: string | undefined,
  dateTo: string | undefined,
  now = new Date()
) {
  let start: Date;
  let end: Date;

  if (period === 'custom') {
    if (!dateFrom || !dateTo) {
      throw new Error('Informe as duas datas do período personalizado.');
    }
    start = parseLocalDate(dateFrom);
    end = new Date(parseLocalDate(dateTo).getTime() + DAY_MS);
  } else {
    end = now;
    const days = period === 'today' ? 1 : Number.parseInt(period, 10);
    start = startOfLocalDay(new Date(now.getTime() - (days - 1) * DAY_MS));
  }

  const duration = end.getTime() - start.getTime();
  if (duration <= 0 || duration > MAX_CUSTOM_RANGE_MS) {
    throw new Error('O período deve ter entre 1 e 366 dias.');
  }

  const previousEnd = new Date(start);
  const previousStart = new Date(previousEnd.getTime() - duration);
  return { start, end, previousStart, previousEnd };
}

export function calculateDashboardComparison(
  current: number,
  previous: number
): DashboardComparison {
  return {
    current,
    previous,
    changePercent:
      previous === 0
        ? null
        : Math.round(((current - previous) / previous) * 1000) / 10,
  };
}

export function taskStatusesForDashboard(status?: string) {
  if (!status) return undefined;
  if (TASK_STATUSES.has(status)) return [status];
  if (status === 'BACKLOG' || status === 'OPEN') return ['pending'];
  if (status === 'IN_PROGRESS') return ['in-progress'];
  if (status === 'DONE' || status === 'RESOLVED') return ['completed'];
  return [];
}

export function ticketStatusesForDashboard(
  status?: string
): TicketStatus[] | undefined {
  if (!status) return undefined;
  if (TICKET_STATUSES.has(status as TicketStatus)) {
    return [status as TicketStatus];
  }
  if (status === 'BACKLOG' || status === 'pending') return ['OPEN'];
  if (status === 'DONE' || status === 'completed') return ['RESOLVED'];
  return [];
}

export function noteStatusesForDashboard(
  status?: string
): NoteStatus[] | undefined {
  if (!status) return undefined;
  return NOTE_STATUSES.has(status as NoteStatus) ? [status as NoteStatus] : [];
}

function isStatusCompatible(type: DashboardItemType, status: string) {
  if (type === 'TASK') {
    return TASK_STATUSES.has(status) || WORK_LANES.has(status as WorkLane);
  }
  if (type === 'TICKET') {
    return TICKET_STATUSES.has(status as TicketStatus);
  }
  if (type === 'NOTE') return NOTE_STATUSES.has(status as NoteStatus);
  return (
    WORK_LANES.has(status as WorkLane) ||
    TASK_STATUSES.has(status) ||
    TICKET_STATUSES.has(status as TicketStatus) ||
    NOTE_STATUSES.has(status as NoteStatus)
  );
}

export function buildTimelineBuckets(start: Date, end: Date, maxBuckets = 12) {
  const duration = end.getTime() - start.getTime();
  const totalDays = Math.max(1, Math.ceil(duration / DAY_MS));
  const bucketDays = Math.max(1, Math.ceil(totalDays / maxBuckets));
  const bucketMs = bucketDays * DAY_MS;
  const buckets: Array<{ start: Date; end: Date; key: string; label: string }> =
    [];

  for (
    let cursor = start.getTime();
    cursor < end.getTime();
    cursor += bucketMs
  ) {
    const bucketStart = new Date(cursor);
    const bucketEnd = new Date(Math.min(cursor + bucketMs, end.getTime()));
    buckets.push({
      start: bucketStart,
      end: bucketEnd,
      key: bucketStart.toISOString(),
      label: new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }).format(bucketStart),
    });
  }

  return buckets;
}
