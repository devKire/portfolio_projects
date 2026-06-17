// src/lib/task-service.ts
import { db } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface TaskFilters {
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
    const where: Prisma.TaskWhereInput = {};

    // Filtros exatos
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.sprintId) where.sprintId = filters.sprintId;
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.tag) where.tags = { has: filters.tag.toLowerCase() };

    // Filtro de busca (backend)
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Filtros inteligentes de data (backend)
    if (filters.dueDateRange) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (filters.dueDateRange === 'today') {
        where.dueDate = {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        };
      } else if (filters.dueDateRange === 'overdue') {
        where.dueDate = { lt: today };
        where.status = { not: 'completed' };
      } else if (filters.dueDateRange === 'week') {
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + 7);
        where.dueDate = { gte: today, lte: endOfWeek };
      }
    }

    // Paginação
    const skip = (page - 1) * limit;

    // Executar queries em paralelo para performance
    const [tasks, totalCount] = await Promise.all([
      db.task.findMany({
        where,
        include: {
          project: { select: { id: true, title: true } },
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

export async function getTaskStats() {
  try {
    const [total, pending, inProgress, completed] = await Promise.all([
      db.task.count(),
      db.task.count({ where: { status: 'pending' } }),
      db.task.count({ where: { status: 'in-progress' } }),
      db.task.count({ where: { status: 'completed' } }),
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
