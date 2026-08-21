// src/lib/task-service.ts
import { db } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { requireUser } from '@/lib/auth/session';
import { buildTaskAccessWhere } from '@/lib/tasks/access';
import type { TaskScope } from '@/types/tasks';

export interface TaskFilters {
  organizationId?: string;
  teamId?: string;
  assigneeId?: string;
  scope?: TaskScope;
  projectId?: string;
  projectIds?: string[];
  sprintId?: string;
  status?: string;
  statuses?: string[];
  priority?: string;
  priorities?: string[];
  tag?: string;
  tags?: string[];
  tagMatchMode?: 'any' | 'all';
  search?: string;
  dueDateRange?: 'today' | 'week' | 'overdue';
  dueDateFrom?: string;
  dueDateTo?: string;
  withoutProject?: boolean;
  withoutTags?: boolean;
  sort?: 'dueDate' | 'priority' | 'position' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export async function getFilteredTasks(
  filters: TaskFilters = {},
  page = 1,
  limit = 20
) {
  try {
    const user = await requireUser();
    const accessWhere: Prisma.TaskWhereInput = await buildTaskAccessWhere(
      user.id,
      filters
    );
    const filterWhere: Prisma.TaskWhereInput = {};

    // Filtros exatos
    if (filters.projectId) filterWhere.projectId = filters.projectId;
    if (filters.sprintId) filterWhere.sprintId = filters.sprintId;
    if (filters.status) filterWhere.status = filters.status;
    if (filters.priority) filterWhere.priority = filters.priority;
    if (filters.tag) filterWhere.tags = { has: filters.tag.toLowerCase() };

    // Filtro de busca (backend)
    if (filters.search) {
      filterWhere.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Filtros inteligentes de data (backend)
    if (filters.dueDateRange) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (filters.dueDateRange === 'today') {
        filterWhere.dueDate = {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        };
      } else if (filters.dueDateRange === 'overdue') {
        filterWhere.dueDate = { lt: today };
        filterWhere.status = { not: 'completed' };
      } else if (filters.dueDateRange === 'week') {
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + 7);
        filterWhere.dueDate = { gte: today, lte: endOfWeek };
      }
    }

    const where: Prisma.TaskWhereInput = {
      AND: [accessWhere, filterWhere],
    };

    // Paginação
    const skip = (page - 1) * limit;

    // Executar queries em paralelo para performance
    const [tasks, totalCount] = await Promise.all([
      db.task.findMany({
        where,
        include: {
          project: { select: { id: true, title: true } },
          organization: { select: { id: true, name: true } },
          team: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true, username: true } },
          createdBy: { select: { id: true, name: true, username: true } },
          note: { select: { id: true, title: true, slug: true } },
          feature: { select: { id: true, name: true } },
          sprint: { select: { id: true, name: true } },
          subtasks: { select: { id: true, title: true, status: true } },
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      db.task.count({ where }),
    ]);

    return {
      success: true,
      data: tasks,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  } catch (error) {
    console.error('Error fetching filtered tasks:', error);
    return { success: false, error: 'Failed to fetch tasks' };
  }
}

// Tipos para estatísticas (útil para tipar o hook)
export type TaskStats = Awaited<ReturnType<typeof getTaskStats>>['data'];

export async function getTaskStats(filters: TaskFilters = {}) {
  try {
    const user = await requireUser();
    const where = await buildTaskAccessWhere(user.id, filters);
    const [total, pending, inProgress, completed] = await Promise.all([
      db.task.count({ where }),
      db.task.count({ where: { AND: [where, { status: 'pending' }] } }),
      db.task.count({
        where: { AND: [where, { status: 'in-progress' }] },
      }),
      db.task.count({ where: { AND: [where, { status: 'completed' }] } }),
    ]);
    return { success: true, data: { total, pending, inProgress, completed } };
  } catch (error) {
    console.error('Error fetching task stats:', error);
    return { success: false, error: 'Failed to fetch task stats' };
  }
}

// Função otimizada para reordenação (drag and drop)
export async function updateTaskPosition(
  updates: { id: string; position: number }[]
) {
  try {
    const user = await requireUser();
    const ids = Array.from(new Set(updates.map((update) => update.id)));
    const accessibleWhere = await buildTaskAccessWhere(user.id, {
      scope: 'personal',
    });
    const ownedCount = await db.task.count({
      where: { AND: [accessibleWhere, { id: { in: ids } }] },
    });
    if (ownedCount !== ids.length) {
      return { success: false, error: 'Task not found' };
    }

    const updatePromises = updates.map((update) =>
      db.task.update({
        where: { id: update.id },
        data: { position: update.position },
      })
    );
    await Promise.all(updatePromises);
    return { success: true };
  } catch (error) {
    console.error('Error updating task positions:', error);
    return { success: false, error: 'Failed to update positions' };
  }
}
