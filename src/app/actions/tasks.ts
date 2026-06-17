'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { BulkTaskInput, BulkTaskResult, TaskPatch } from '@/types/tasks';
import { updateMarkdownTaskStatus } from '@/lib/note-task-sync';
import { mergeTaskTags } from '@/lib/task-tags';

// Types
export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  tags?: string[];
  projectId?: string | null;
  noteId?: string | null;
  noteTaskKey?: string | null;
  featureId?: string | null;
  sprintId?: string | null;
  parentId?: string | null;
}

function normalizeTaskTags(tags?: string[]) {
  return mergeTaskTags(tags || []);
}

export interface CreateFeatureInput {
  name: string;
  description?: string;
  projectId: string;
  priority?: string;
}

export interface CreateSprintInput {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  projectId: string;
  status?: string;
}

async function createTaskActivityLog(data: {
  taskId?: string | null;
  type: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await db.taskActivityLog.create({
      data: {
        taskId: data.taskId || null,
        type: data.type,
        message: data.message,
        metadata: data.metadata,
      },
    });
  } catch (error) {
    console.error('Error creating task activity log:', error);
  }
}

async function syncTaskStatusToNote(task: {
  noteId?: string | null;
  noteTaskKey?: string | null;
  status?: string | null;
}) {
  if (!task.noteId || !task.noteTaskKey || !task.status) return;

  const note = await db.note.findUnique({
    where: { id: task.noteId },
    select: { id: true, content: true },
  });
  if (!note) return;

  const nextContent = updateMarkdownTaskStatus(
    note.content,
    task.noteTaskKey,
    task.status === 'completed'
  );

  if (nextContent !== note.content) {
    await db.note.update({
      where: { id: note.id },
      data: { content: nextContent },
    });
  }
}

export async function createTask(data: CreateTaskInput) {
  try {
    const createData: Prisma.TaskUncheckedCreateInput = {
      title: data.title,
      description: data.description,
      status: data.status || 'pending',
      priority: data.priority || 'medium',
      dueDate: data.dueDate,
      estimatedHours: data.estimatedHours || 0,
      actualHours: data.actualHours || 0,
      tags: normalizeTaskTags(data.tags),
    };

    // Só adicionar se tiver valor válido
    if (data.projectId && data.projectId.trim() !== '') {
      createData.projectId = data.projectId;
    }
    if (data.noteId && data.noteId.trim() !== '') {
      createData.noteId = data.noteId;
      createData.noteTaskKey = data.noteTaskKey || null;
    }
    if (data.featureId && data.featureId.trim() !== '') {
      createData.featureId = data.featureId;
    }
    if (data.sprintId && data.sprintId.trim() !== '') {
      createData.sprintId = data.sprintId;
    }
    if (data.parentId && data.parentId.trim() !== '') {
      createData.parentId = data.parentId;
    }

    const task = await db.task.create({
      data: createData,
      include: {
        project: true,
        note: { select: { id: true, title: true, slug: true } },
        feature: true,
        sprint: true,
      },
    });

    await createTaskActivityLog({
      taskId: task.id,
      type: 'task.created',
      message: `Task criada: ${task.title}`,
      metadata: {
        status: task.status,
        priority: task.priority,
        projectId: task.projectId,
      },
    });

    revalidatePath('/admin/tasks');
    revalidatePath('/admin');
    return { success: true, data: task };
  } catch (error) {
    console.error('Error creating task:', error);
    return { success: false, error: 'Failed to create task' };
  }
}

const validTaskStatuses = new Set(['pending', 'in-progress', 'completed']);
const validTaskPriorities = new Set(['low', 'medium', 'high', 'urgent']);

const taskInclude = {
  project: true,
  note: { select: { id: true, title: true, slug: true } },
  feature: true,
  sprint: true,
  subtasks: true,
} satisfies Prisma.TaskInclude;

export async function createTasksBulk(inputs: BulkTaskInput[]) {
  const results: BulkTaskResult[] = inputs.map((input) => ({
    clientId: input.clientId,
    success: true,
  }));

  if (!Array.isArray(inputs) || inputs.length === 0) {
    return { success: false, results, error: 'Nenhuma tarefa para criar' };
  }

  try {
    const projectIds = Array.from(
      new Set(
        inputs
          .map((input) => input.projectId)
          .filter((projectId): projectId is string => Boolean(projectId))
      )
    );

    const existingProjectIds = new Set(
      (
        await db.project.findMany({
          where: { id: { in: projectIds } },
          select: { id: true },
        })
      ).map((project) => project.id)
    );

    inputs.forEach((input, index) => {
      const errors: string[] = [];
      if (!input.clientId) errors.push('clientId ausente');
      if (!input.title?.trim()) errors.push('Titulo vazio');
      if (input.status && !validTaskStatuses.has(input.status)) {
        errors.push('Status invalido');
      }
      if (input.priority && !validTaskPriorities.has(input.priority)) {
        errors.push('Prioridade invalida');
      }
      if (input.projectId && !existingProjectIds.has(input.projectId)) {
        errors.push('Projeto nao encontrado');
      }
      if (
        input.estimatedHours !== undefined &&
        (!Number.isFinite(input.estimatedHours) || input.estimatedHours < 0)
      ) {
        errors.push('Estimativa invalida');
      }

      if (errors.length) {
        results[index] = {
          clientId: input.clientId || `linha-${index + 1}`,
          success: false,
          error: errors.join(', '),
        };
      }
    });

    if (results.some((result) => !result.success)) {
      return {
        success: false,
        results,
        error: 'Corrija as linhas invalidas antes de criar.',
      };
    }

    const tasks = await db.$transaction(async (tx) => {
      const createdTasks = [];

      for (const input of inputs) {
        const createData: Prisma.TaskUncheckedCreateInput = {
          title: input.title.trim(),
          description: input.description?.trim() || undefined,
          status: input.status || 'pending',
          priority: input.priority || 'medium',
          dueDate: input.dueDate || undefined,
          estimatedHours: input.estimatedHours || 0,
          actualHours: input.actualHours || 0,
          tags: normalizeTaskTags(input.tags),
        };

        if (input.projectId && input.projectId.trim() !== '') {
          createData.projectId = input.projectId;
        }

        const task = await tx.task.create({
          data: createData,
          include: taskInclude,
        });

        await tx.taskActivityLog.create({
          data: {
            taskId: task.id,
            type: 'task.created',
            message: `Task criada: ${task.title}`,
            metadata: {
              status: task.status,
              priority: task.priority,
              projectId: task.projectId,
              bulk: true,
            },
          },
        });

        createdTasks.push(task);
      }

      return createdTasks;
    });

    const taskResults: BulkTaskResult[] = inputs.map((input, index) => ({
      clientId: input.clientId,
      success: true,
      taskId: tasks[index]?.id,
      task: tasks[index],
    }));

    revalidatePath('/admin/tasks');
    revalidatePath('/admin');

    return { success: true, results: taskResults, data: tasks };
  } catch (error) {
    console.error('Error creating tasks in bulk:', error);
    return {
      success: false,
      results: inputs.map((input) => ({
        clientId: input.clientId,
        success: false,
        error: 'Failed to create task',
      })),
      error: 'Failed to create tasks',
    };
  }
}

export async function updateTask(id: string, data: TaskPatch) {
  // Validação do ID
  if (!id || typeof id !== 'string' || id.trim() === '') {
    console.error('Invalid task ID provided to updateTask:', id);
    return { success: false, error: 'Invalid task ID' };
  }

  try {
    const updateData: Prisma.TaskUncheckedUpdateInput = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.status !== undefined) {
      updateData.status = data.status;
      updateData.completedAt = data.status === 'completed' ? new Date() : null;
    }
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.estimatedHours !== undefined)
      updateData.estimatedHours = data.estimatedHours;
    if (data.actualHours !== undefined)
      updateData.actualHours = data.actualHours;
    if (data.tags !== undefined) updateData.tags = normalizeTaskTags(data.tags);

    // Tratar relações
    if (data.projectId !== undefined) {
      updateData.projectId =
        data.projectId && data.projectId.trim() !== '' ? data.projectId : null;
    }
    if (data.noteId !== undefined) {
      updateData.noteId =
        data.noteId && data.noteId.trim() !== '' ? data.noteId : null;
    }
    if (data.noteTaskKey !== undefined) {
      updateData.noteTaskKey = data.noteTaskKey || null;
    }
    if (data.featureId !== undefined) {
      updateData.featureId =
        data.featureId && data.featureId.trim() !== '' ? data.featureId : null;
    }
    if (data.sprintId !== undefined) {
      updateData.sprintId =
        data.sprintId && data.sprintId.trim() !== '' ? data.sprintId : null;
    }

    // Verificar se a task existe antes de atualizar
    const existingTask = await db.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      console.error(`Task with id ${id} not found`);
      return { success: false, error: 'Task not found' };
    }

    const task = await db.task.update({
      where: { id },
      data: updateData,
      include: {
        project: true,
        note: { select: { id: true, title: true, slug: true } },
        feature: true,
        sprint: true,
      },
    });

    if (data.status !== undefined) {
      await syncTaskStatusToNote(task);
    }

    if (data.status !== undefined && data.status !== existingTask.status) {
      await createTaskActivityLog({
        taskId: task.id,
        type:
          data.status === 'completed'
            ? 'task.completed'
            : 'task.status_changed',
        message:
          data.status === 'completed'
            ? `Task concluida: ${task.title}`
            : `Status alterado: ${task.title}`,
        metadata: {
          from: existingTask.status,
          to: data.status,
        },
      });
    }

    revalidatePath('/admin/tasks');
    revalidatePath('/admin');
    return { success: true, data: task };
  } catch (error) {
    console.error('Error updating task:', error);
    return { success: false, error: 'Failed to update task' };
  }
}

export async function deleteTask(id: string) {
  try {
    const task = await db.task.findUnique({
      where: { id },
      select: { id: true, title: true, status: true, projectId: true },
    });

    await db.task.delete({ where: { id } });

    if (task) {
      await createTaskActivityLog({
        taskId: null,
        type: 'task.deleted',
        message: `Task deletada: ${task.title}`,
        metadata: {
          taskId: task.id,
          title: task.title,
          status: task.status,
          projectId: task.projectId,
        },
      });
    }

    revalidatePath('/admin/tasks');
    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    console.error('Error deleting task:', error);
    return { success: false, error: 'Failed to delete task' };
  }
}

// No arquivo app/actions/tasks.ts
export async function updateTaskStatus(id: string, status: string) {
  // Adicione validação do ID
  if (!id || id.trim() === '') {
    console.error('Invalid task ID provided to updateTaskStatus');
    return { success: false, error: 'Invalid task ID' };
  }
  return updateTask(id, { status });
}

// Adicione em src/app/actions/tasks.ts

export async function updateTaskPositions(
  updates: { id: string; position: number }[]
) {
  try {
    // Usa uma transaction para garantir que todas as atualizações sejam feitas atomicamente
    await db.$transaction(
      updates.map(({ id, position }) =>
        db.task.update({
          where: { id },
          data: { position },
        })
      )
    );

    revalidatePath('/admin/tasks');
    return { success: true };
  } catch (error) {
    console.error('Error updating task positions:', error);
    return { success: false, error: 'Failed to update task positions' };
  }
}
// Project Actions - Buscar projetos do portfólio
export async function getProjects(options: { includeInactive?: boolean } = {}) {
  try {
    // Buscar da tabela Project (portfólio)
    const projects = await db.project.findMany({
      where: options.includeInactive ? undefined : { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        featured: true,
        category: true,
        isActive: true,
      },
    });

    return { success: true, data: projects };
  } catch (error) {
    console.error('Error fetching projects:', error);
    return { success: false, error: 'Failed to fetch projects' };
  }
}

export async function getTaskTags() {
  try {
    const tasks = await db.task.findMany({
      select: { tags: true },
    });

    const tags = normalizeTaskTags(tasks.flatMap((task) => task.tags)).sort(
      (first, second) => first.localeCompare(second)
    );

    return { success: true, data: tags };
  } catch (error) {
    console.error('Error fetching task tags:', error);
    return { success: false, error: 'Failed to fetch task tags' };
  }
}
// Feature Actions
export async function getFeatures(projectId?: string) {
  try {
    const where: any = {};
    if (projectId && projectId.trim() !== '') {
      where.projectId = projectId;
    }

    const features = await db.feature.findMany({
      where,
      include: {
        project: true,
        tasks: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, data: features };
  } catch (error) {
    console.error('Error fetching features:', error);
    return { success: false, error: 'Failed to fetch features' };
  }
}

export async function createFeature(data: CreateFeatureInput) {
  try {
    const feature = await db.feature.create({
      data: {
        name: data.name,
        description: data.description,
        projectId: data.projectId,
        priority: data.priority || 'medium',
      },
      include: {
        project: true,
        tasks: true,
      },
    });

    revalidatePath('/admin/tasks');
    return { success: true, data: feature };
  } catch (error) {
    console.error('Error creating feature:', error);
    return { success: false, error: 'Failed to create feature' };
  }
}

export async function updateFeature(
  id: string,
  data: Partial<CreateFeatureInput>
) {
  try {
    const feature = await db.feature.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        priority: data.priority,
      },
    });

    revalidatePath('/admin/tasks');
    return { success: true, data: feature };
  } catch (error) {
    console.error('Error updating feature:', error);
    return { success: false, error: 'Failed to update feature' };
  }
}

export async function deleteFeature(id: string) {
  try {
    await db.feature.delete({ where: { id } });
    revalidatePath('/admin/tasks');
    return { success: true };
  } catch (error) {
    console.error('Error deleting feature:', error);
    return { success: false, error: 'Failed to delete feature' };
  }
}

// Sprint Actions
export async function getSprints(projectId?: string) {
  try {
    const where: any = {};
    if (projectId && projectId.trim() !== '') {
      where.projectId = projectId;
    }

    const sprints = await db.sprint.findMany({
      where,
      include: {
        project: true,
        tasks: true,
      },
      orderBy: { startDate: 'desc' },
    });

    return { success: true, data: sprints };
  } catch (error) {
    console.error('Error fetching sprints:', error);
    return { success: false, error: 'Failed to fetch sprints' };
  }
}

export async function createSprint(data: CreateSprintInput) {
  try {
    const sprint = await db.sprint.create({
      data: {
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        projectId: data.projectId,
        status: data.status || 'planning',
      },
      include: {
        project: true,
        tasks: true,
      },
    });

    revalidatePath('/admin/tasks');
    return { success: true, data: sprint };
  } catch (error) {
    console.error('Error creating sprint:', error);
    return { success: false, error: 'Failed to create sprint' };
  }
}

export async function updateSprint(
  id: string,
  data: Partial<CreateSprintInput>
) {
  try {
    const sprint = await db.sprint.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
      },
    });

    revalidatePath('/admin/tasks');
    return { success: true, data: sprint };
  } catch (error) {
    console.error('Error updating sprint:', error);
    return { success: false, error: 'Failed to update sprint' };
  }
}

export async function deleteSprint(id: string) {
  try {
    await db.sprint.delete({ where: { id } });
    revalidatePath('/admin/tasks');
    return { success: true };
  } catch (error) {
    console.error('Error deleting sprint:', error);
    return { success: false, error: 'Failed to delete sprint' };
  }
}

// Dashboard Stats
export async function getTaskStats() {
  try {
    const [total, pending, inProgress, completed] = await Promise.all([
      db.task.count(),
      db.task.count({ where: { status: 'pending' } }),
      db.task.count({ where: { status: 'in-progress' } }),
      db.task.count({ where: { status: 'completed' } }),
    ]);

    return {
      success: true,
      data: { total, pending, inProgress, completed },
    };
  } catch (error) {
    console.error('Error fetching task stats:', error);
    return { success: false, error: 'Failed to fetch task stats' };
  }
}

// NOVA FUNÇÃO: Versão completa com todos os filtros
export async function getTasksWithFilters(filters?: {
  projectId?: string;
  sprintId?: string;
  status?: string;
  priority?: string;
  tag?: string;
  search?: string;
  dueDateRange?: 'today' | 'week' | 'overdue';
  page?: number;
  limit?: number;
}) {
  try {
    const where: Prisma.TaskWhereInput = {};

    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.sprintId) where.sprintId = filters.sprintId;
    if (filters?.status) where.status = filters.status;
    if (filters?.priority) where.priority = filters.priority;
    if (filters?.tag) where.tags = { has: filters.tag.toLowerCase() };

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Filtros de data
    if (filters?.dueDateRange) {
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

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

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

// Mantenha a função original para compatibilidade
export async function getTasks(filters?: {
  projectId?: string;
  sprintId?: string;
  status?: string;
  tag?: string;
  search?: string;
}) {
  try {
    const where: any = {};

    if (filters?.projectId) where.projectId = filters.projectId;
    if (filters?.sprintId) where.sprintId = filters.sprintId;
    if (filters?.status) where.status = filters.status;
    if (filters?.tag) where.tags = { has: filters.tag.toLowerCase() };
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const tasks = await db.task.findMany({
      where,
      include: {
        project: true,
        note: { select: { id: true, title: true, slug: true } },
        feature: true,
        sprint: true,
        subtasks: true,
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });

    return { success: true, data: tasks };
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return { success: false, error: 'Failed to fetch tasks' };
  }
}
