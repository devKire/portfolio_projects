'use server';

import { getTasks, getTaskCollaborationOptions } from '@/app/actions/tasks';
import { getTicketWorkspace } from '@/app/actions/tickets';
import { updateTaskStatus } from '@/app/actions/tasks';
import { updateTicket } from '@/app/actions/tickets';
import {
  createWorkItems,
  workLaneToTaskStatus,
  workLaneToTicketStatus,
} from '@/lib/work/adapter';
import type { TaskScope, TaskWithRelations } from '@/types/tasks';
import type {
  TicketRow,
  TicketWorkspace,
  WorkLane,
  WorkWorkspace,
} from '@/types/work';

export async function getWorkWorkspace(input: {
  organizationId: string | null;
  scope?: TaskScope;
  teamId?: string;
  assigneeId?: string;
}) {
  const organizationId = input.organizationId?.trim() || null;
  const scope = input.scope || (organizationId ? 'mine' : 'personal');
  const taskPromise = getTasks({
    organizationId: organizationId || undefined,
    scope,
    teamId: input.teamId,
    assigneeId: input.assigneeId,
  });
  const ticketPromise =
    organizationId && scope !== 'personal'
      ? getTicketWorkspace(organizationId, {
          mine: scope === 'mine' || undefined,
          teamId: scope === 'team' ? input.teamId : undefined,
          assigneeId: input.assigneeId,
        })
      : Promise.resolve({
          success: true as const,
          data: {
            tickets: [],
            queues: [],
            stats: {},
            canManageQueues: false,
          } satisfies TicketWorkspace,
        });
  const collaborationPromise = organizationId
    ? getTaskCollaborationOptions(organizationId)
    : Promise.resolve({
        success: true as const,
        data: { teams: [], members: [] },
      });

  const [taskResult, ticketResult, collaborationResult] = await Promise.all([
    taskPromise,
    ticketPromise,
    collaborationPromise,
  ]);
  if (!taskResult.success) {
    return {
      success: false as const,
      error: taskResult.error || 'Não foi possível carregar as tarefas.',
    };
  }
  if (!ticketResult.success) {
    return {
      success: false as const,
      error: ticketResult.error || 'Não foi possível carregar os chamados.',
    };
  }
  if (!collaborationResult.success) {
    return {
      success: false as const,
      error:
        collaborationResult.error ||
        'Não foi possível carregar as opções de colaboração.',
    };
  }

  const workspace: WorkWorkspace = {
    items: createWorkItems(
      (taskResult.data || []) as TaskWithRelations[],
      ticketResult.data.tickets as TicketRow[]
    ),
    queues: ticketResult.data.queues as TicketWorkspace['queues'],
    canManageQueues: ticketResult.data.canManageQueues,
    collaboration: collaborationResult.data,
  };
  return { success: true as const, data: workspace };
}

export async function updateWorkItemLane(input: {
  kind: 'TASK' | 'TICKET';
  id: string;
  organizationId: string | null;
  lane: WorkLane;
}) {
  if (input.kind === 'TASK') {
    const status = workLaneToTaskStatus(input.lane);
    if (!status) {
      return {
        success: false as const,
        error: 'Esta coluna não é compatível com tarefas.',
      };
    }
    return updateTaskStatus(input.id, status);
  }

  const status = workLaneToTicketStatus(input.lane);
  if (!status || !input.organizationId) {
    return {
      success: false as const,
      error: 'Destino inválido para o chamado.',
    };
  }
  return updateTicket(input.organizationId, input.id, { status });
}
