import type { OrganizationRole, Prisma } from '@prisma/client';

import {
  OrganizationAuthorizationError,
  requireOrganizationMembership,
  requireTeamOperationAccess,
} from '@/lib/organizations/authorization';
import {
  isOrganizationManager,
  isPersonalTaskAssignmentValid,
} from '@/lib/organizations/policy';
import { db } from '@/lib/prisma';
import type { TaskScope } from '@/types/tasks';

export type TaskAccessFilters = {
  organizationId?: string;
  teamId?: string;
  assigneeId?: string;
  scope?: TaskScope;
};

export async function buildTaskAccessWhere(
  userId: string,
  filters: TaskAccessFilters = {}
): Promise<Prisma.TaskWhereInput> {
  const organizationId = filters.organizationId?.trim() || undefined;
  const scope = filters.scope || (organizationId ? 'mine' : 'personal');

  if (!organizationId) {
    if (scope === 'organization' || scope === 'team') {
      throw new OrganizationAuthorizationError();
    }
    return { userId, organizationId: null };
  }

  const membership = await requireOrganizationMembership(
    userId,
    organizationId
  );
  if (filters.teamId && !isOrganizationManager(membership.role)) {
    await requireTeamOperationAccess(userId, organizationId, filters.teamId);
  }

  const organizationWhere: Prisma.TaskWhereInput = {
    organizationId,
    ...(filters.teamId ? { teamId: filters.teamId } : {}),
    ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
  };

  if (scope === 'personal') return { userId, organizationId: null };
  if (scope === 'organization') return organizationWhere;
  if (scope === 'team') {
    if (!filters.teamId) throw new OrganizationAuthorizationError();
    return organizationWhere;
  }

  return {
    OR: [
      { userId, organizationId: null },
      {
        ...organizationWhere,
        OR: [{ assigneeId: userId }, { createdById: userId }, { userId }],
      },
    ],
  };
}

export async function getAccessibleTask(userId: string, taskId: string) {
  if (!taskId) return null;
  return db.task.findFirst({
    where: {
      id: taskId,
      OR: [
        { organizationId: null, userId },
        { organization: { members: { some: { userId } } } },
      ],
    },
  });
}

export async function requireTaskOperationAccess(
  userId: string,
  task: {
    userId: string;
    organizationId: string | null;
    teamId: string | null;
    createdById: string | null;
    assigneeId: string | null;
  }
) {
  if (!task.organizationId) {
    if (task.userId !== userId) throw new OrganizationAuthorizationError();
    return;
  }

  const membership = await requireOrganizationMembership(
    userId,
    task.organizationId
  );
  if (
    isOrganizationManager(membership.role) ||
    task.userId === userId ||
    task.createdById === userId ||
    task.assigneeId === userId
  ) {
    return;
  }

  if (task.teamId) {
    const teamMember = await db.teamMember.findFirst({
      where: {
        organizationId: task.organizationId,
        teamId: task.teamId,
        userId,
      },
      select: { id: true },
    });
    if (teamMember) return;
  }

  throw new OrganizationAuthorizationError();
}

export async function canDeleteTask(
  userId: string,
  task: { userId: string; organizationId: string | null }
) {
  if (!task.organizationId) return task.userId === userId;
  const membership = await requireOrganizationMembership(
    userId,
    task.organizationId
  );
  return task.userId === userId || isOrganizationManager(membership.role);
}

export async function requireTaskAssignmentTargets(input: {
  actorId: string;
  organizationId: string | null;
  teamId?: string | null;
  assigneeId?: string | null;
}) {
  if (!input.organizationId) {
    if (!isPersonalTaskAssignmentValid(input)) {
      throw new OrganizationAuthorizationError();
    }
    return { role: null as OrganizationRole | null };
  }

  const membership = await requireOrganizationMembership(
    input.actorId,
    input.organizationId
  );
  const [team, assignee] = await Promise.all([
    input.teamId
      ? db.team.findFirst({
          where: {
            id: input.teamId,
            organizationId: input.organizationId,
            active: true,
          },
          select: { id: true },
        })
      : null,
    input.assigneeId
      ? db.organizationMember.findFirst({
          where: {
            organizationId: input.organizationId,
            userId: input.assigneeId,
          },
          select: { userId: true },
        })
      : null,
  ]);
  if (input.teamId && !team) throw new OrganizationAuthorizationError();
  if (input.assigneeId && !assignee) throw new OrganizationAuthorizationError();
  return { role: membership.role };
}
