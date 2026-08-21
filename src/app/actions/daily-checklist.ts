'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { requireUser } from '@/lib/auth/session';
import { db } from '@/lib/prisma';

export interface DailyRoutineInput {
  name: string;
  description?: string;
  color?: string;
  weekdays?: number[];
  isDefault?: boolean;
  duplicateFromRoutineId?: string;
}

export interface DailyChecklistItemInput {
  routineId: string;
  title: string;
  description?: string;
  period: string;
  startTime?: string;
  endTime?: string;
  position?: number;
  isSacred?: boolean;
  active?: boolean;
}

function revalidateChecklist() {
  revalidatePath('/admin');
  revalidatePath('/admin/tasks');
}

function toDayStart(dateInput: string | Date) {
  if (dateInput instanceof Date) {
    return new Date(
      Date.UTC(
        dateInput.getUTCFullYear(),
        dateInput.getUTCMonth(),
        dateInput.getUTCDate()
      )
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    throw new Error('Data inválida.');
  }
  const date = new Date(`${dateInput}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error('Data inválida.');
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildTimeRange(startTime?: string | null, endTime?: string | null) {
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return startTime || endTime || '';
}

function slugify(value: string) {
  const base = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'item';
}

function cleanRoutineInput(input: DailyRoutineInput) {
  const name = input.name.trim().slice(0, 80);
  if (name.length < 2) throw new Error('Nome deve ter ao menos 2 caracteres.');
  const color = input.color?.trim();
  if (color && !/^#[0-9a-f]{6}$/i.test(color)) {
    throw new Error('Cor inválida.');
  }
  const weekdays = Array.from(new Set(input.weekdays || [])).sort();
  if (weekdays.some((weekday) => weekday < 0 || weekday > 6)) {
    throw new Error('Dia da semana inválido.');
  }
  return {
    name,
    description: input.description?.trim().slice(0, 500) || null,
    color: color || null,
    weekdays,
  };
}

function actionError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  console.error(fallback, error);
  return fallback;
}

async function requireOwnedRoutine(
  tx: Prisma.TransactionClient,
  userId: string,
  routineId: string,
  options: { active?: boolean } = {}
) {
  const routine = await tx.dailyRoutine.findFirst({
    where: {
      id: routineId,
      userId,
      ...(options.active === false ? {} : { active: true }),
    },
  });
  if (!routine) throw new Error('Rotina não encontrada.');
  return routine;
}

async function resolveRoutineForDate(
  tx: Prisma.TransactionClient,
  userId: string,
  date: Date
) {
  const existing = await tx.dailyChecklistEntry.findFirst({
    where: { userId, date },
    orderBy: { createdAt: 'asc' },
    select: { routine: true },
  });
  if (existing)
    return { routine: existing.routine, source: 'history' as const };

  const override = await tx.routineDateOverride.findUnique({
    where: { userId_date: { userId, date } },
    include: { routine: true },
  });
  if (override?.routine.active) {
    return { routine: override.routine, source: 'override' as const };
  }

  const schedule = await tx.dailyRoutineSchedule.findUnique({
    where: { userId_weekday: { userId, weekday: date.getUTCDay() } },
    include: { routine: true },
  });
  if (schedule?.routine.active) {
    return { routine: schedule.routine, source: 'schedule' as const };
  }

  const routine = await tx.dailyRoutine.findFirst({
    where: { userId, active: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
  return {
    routine,
    source: routine ? ('default' as const) : ('none' as const),
  };
}

async function materializeRoutineEntries(
  tx: Prisma.TransactionClient,
  userId: string,
  routine: { id: string; name: string },
  date: Date
) {
  const existingCount = await tx.dailyChecklistEntry.count({
    where: { userId, date },
  });
  if (existingCount > 0) return;

  const items = await tx.dailyChecklistItem.findMany({
    where: { userId, routineId: routine.id, active: true },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });
  if (!items.length) return;
  await tx.dailyChecklistEntry.createMany({
    data: items.map((item) => ({
      userId,
      routineId: routine.id,
      itemId: item.id,
      date,
      routineNameSnapshot: routine.name,
      itemTitleSnapshot: item.title,
      itemDescriptionSnapshot: item.description,
      periodSnapshot: item.period,
      timeRangeSnapshot:
        item.timeRange || buildTimeRange(item.startTime, item.endTime),
      startTimeSnapshot: item.startTime,
      endTimeSnapshot: item.endTime,
      positionSnapshot: item.position,
      isSacredSnapshot: item.isSacred,
    })),
    skipDuplicates: true,
  });
}

async function getHistory(userId: string, days: number, selectedDate: Date) {
  const mondayOffset = (selectedDate.getUTCDay() + 6) % 7;
  const start = addDays(selectedDate, -mondayOffset);
  const end = addDays(start, days);
  const entries = await db.dailyChecklistEntry.findMany({
    where: { userId, date: { gte: start, lt: end } },
    select: { date: true, completed: true },
  });
  return Array.from({ length: days }).map((_, index) => {
    const day = addDays(start, index);
    const dayKey = toDateInputValue(day);
    const dayEntries = entries.filter(
      (entry) => toDateInputValue(entry.date) === dayKey
    );
    const completed = dayEntries.filter((entry) => entry.completed).length;
    return {
      date: dayKey,
      completed,
      total: dayEntries.length,
      percentage: dayEntries.length
        ? Math.round((completed / dayEntries.length) * 100)
        : 0,
    };
  });
}

async function createChecklistLog(data: {
  userId: string;
  itemId: string;
  type: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await db.taskActivityLog.create({
    data: {
      userId: data.userId,
      dailyChecklistItemId: data.itemId,
      type: data.type,
      message: data.message,
      metadata: data.metadata,
    },
  });
}

export async function getDailyChecklist(dateInput: string) {
  try {
    const user = await requireUser();
    const date = toDayStart(dateInput);
    const nextDate = addDays(date, 1);
    const resolved = await db.$transaction(async (tx) => {
      const selection = await resolveRoutineForDate(tx, user.id, date);
      if (selection.routine) {
        await materializeRoutineEntries(tx, user.id, selection.routine, date);
      }
      return selection;
    });

    const [entries, routines, logs, history] = await Promise.all([
      db.dailyChecklistEntry.findMany({
        where: { userId: user.id, date },
        orderBy: [{ positionSnapshot: 'asc' }, { createdAt: 'asc' }],
      }),
      db.dailyRoutine.findMany({
        where: { userId: user.id },
        orderBy: [{ active: 'desc' }, { isDefault: 'desc' }, { name: 'asc' }],
        include: {
          schedules: { select: { weekday: true }, orderBy: { weekday: 'asc' } },
          _count: { select: { items: true, entries: true } },
        },
      }),
      db.taskActivityLog.findMany({
        where: { userId: user.id, createdAt: { gte: date, lt: nextDate } },
        include: {
          task: { select: { id: true, title: true } },
          dailyChecklistItem: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      getHistory(user.id, 7, date),
    ]);

    const selectedRoutineId =
      entries[0]?.routineId || resolved.routine?.id || null;
    const items = selectedRoutineId
      ? await db.dailyChecklistItem.findMany({
          where: { userId: user.id, routineId: selectedRoutineId },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        })
      : [];
    const override = await db.routineDateOverride.findUnique({
      where: { userId_date: { userId: user.id, date } },
      select: { routineId: true },
    });
    const checklist = entries.map((entry) => ({
      id: entry.itemId,
      slug: entry.itemId,
      title: entry.itemTitleSnapshot,
      description: entry.itemDescriptionSnapshot,
      period: entry.periodSnapshot,
      startTime: entry.startTimeSnapshot,
      endTime: entry.endTimeSnapshot,
      timeRange: entry.timeRangeSnapshot,
      position: entry.positionSnapshot,
      active: true,
      isSacred: entry.isSacredSnapshot,
      entryId: entry.id,
      completed: entry.completed,
      completedAt: entry.completedAt?.toISOString() || null,
      note: entry.note || '',
    }));
    const completed = checklist.filter((item) => item.completed).length;

    return {
      success: true as const,
      data: {
        date: toDateInputValue(date),
        selectedRoutineId,
        selectedRoutineSource: resolved.source,
        isDateOverride: Boolean(override),
        canChangeRoutine: !entries.some(
          (entry) => entry.completed || Boolean(entry.note?.trim())
        ),
        routines: routines.map((routine) => ({
          id: routine.id,
          name: routine.name,
          description: routine.description,
          color: routine.color,
          reminders: routine.reminders,
          active: routine.active,
          isDefault: routine.isDefault,
          weekdays: routine.schedules.map((schedule) => schedule.weekday),
          itemCount: routine._count.items,
          historyCount: routine._count.entries,
        })),
        checklist,
        items: items.map((item) => ({
          id: item.id,
          routineId: item.routineId,
          slug: item.slug,
          title: item.title,
          description: item.description,
          period: item.period,
          startTime: item.startTime,
          endTime: item.endTime,
          timeRange:
            item.timeRange || buildTimeRange(item.startTime, item.endTime),
          position: item.position,
          active: item.active,
          isSacred: item.isSacred,
        })),
        summary: {
          completed,
          total: checklist.length,
          percentage: checklist.length
            ? Math.round((completed / checklist.length) * 100)
            : 0,
        },
        history,
        logs: logs.map((log) => ({
          id: log.id,
          taskId: log.taskId,
          dailyChecklistItemId: log.dailyChecklistItemId,
          type: log.type,
          message: log.message,
          metadata: log.metadata,
          createdAt: log.createdAt.toISOString(),
          task: log.task,
          dailyChecklistItem: log.dailyChecklistItem,
        })),
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível carregar o checklist.'),
    };
  }
}

export async function createDailyRoutine(input: DailyRoutineInput) {
  try {
    const user = await requireUser();
    const cleaned = cleanRoutineInput(input);
    const routine = await db.$transaction(async (tx) => {
      const count = await tx.dailyRoutine.count({ where: { userId: user.id } });
      const source = input.duplicateFromRoutineId
        ? await tx.dailyRoutine.findFirst({
            where: { id: input.duplicateFromRoutineId, userId: user.id },
            include: { items: { orderBy: { position: 'asc' } } },
          })
        : null;
      if (input.duplicateFromRoutineId && !source) {
        throw new Error('Rotina base não encontrada.');
      }
      const created = await tx.dailyRoutine.create({
        data: {
          userId: user.id,
          name: cleaned.name,
          description: source?.description || cleaned.description,
          color: source?.color || cleaned.color,
          reminders: source?.reminders || [],
          isDefault: count === 0 || Boolean(input.isDefault),
          items: source
            ? {
                create: source.items.map((item) => ({
                  userId: user.id,
                  slug: item.slug,
                  title: item.title,
                  description: item.description,
                  period: item.period,
                  timeRange: item.timeRange,
                  startTime: item.startTime,
                  endTime: item.endTime,
                  position: item.position,
                  active: item.active,
                  isSacred: item.isSacred,
                })),
              }
            : undefined,
        },
      });
      if (created.isDefault) {
        await tx.dailyRoutine.updateMany({
          where: { userId: user.id, id: { not: created.id } },
          data: { isDefault: false },
        });
      }
      if (cleaned.weekdays.length) {
        await tx.dailyRoutineSchedule.deleteMany({
          where: { userId: user.id, weekday: { in: cleaned.weekdays } },
        });
        await tx.dailyRoutineSchedule.createMany({
          data: cleaned.weekdays.map((weekday) => ({
            userId: user.id,
            routineId: created.id,
            weekday,
          })),
        });
      }
      return created;
    });
    revalidateChecklist();
    return { success: true as const, data: routine };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível criar a rotina.'),
    };
  }
}

export async function updateDailyRoutine(
  routineId: string,
  input: DailyRoutineInput
) {
  try {
    const user = await requireUser();
    const cleaned = cleanRoutineInput(input);
    const routine = await db.$transaction(async (tx) => {
      await requireOwnedRoutine(tx, user.id, routineId, { active: false });
      const updated = await tx.dailyRoutine.update({
        where: { id: routineId },
        data: {
          name: cleaned.name,
          description: cleaned.description,
          color: cleaned.color,
        },
      });
      await tx.dailyRoutineSchedule.deleteMany({
        where: { userId: user.id, routineId },
      });
      if (cleaned.weekdays.length) {
        await tx.dailyRoutineSchedule.deleteMany({
          where: { userId: user.id, weekday: { in: cleaned.weekdays } },
        });
        await tx.dailyRoutineSchedule.createMany({
          data: cleaned.weekdays.map((weekday) => ({
            userId: user.id,
            routineId,
            weekday,
          })),
        });
      }
      return updated;
    });
    revalidateChecklist();
    return { success: true as const, data: routine };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível atualizar a rotina.'),
    };
  }
}

export async function duplicateDailyRoutine(routineId: string) {
  try {
    const user = await requireUser();
    const routine = await db.$transaction(async (tx) => {
      const source = await tx.dailyRoutine.findFirst({
        where: { id: routineId, userId: user.id },
        include: { items: { orderBy: { position: 'asc' } } },
      });
      if (!source) throw new Error('Rotina não encontrada.');
      const names = await tx.dailyRoutine.findMany({
        where: { userId: user.id },
        select: { name: true },
      });
      const used = new Set(names.map((item) => item.name));
      const base = `${source.name} — cópia`;
      let name = base;
      let suffix = 2;
      while (used.has(name)) {
        name = `${base} ${suffix}`;
        suffix += 1;
      }
      return tx.dailyRoutine.create({
        data: {
          userId: user.id,
          name,
          description: source.description,
          color: source.color,
          reminders: source.reminders,
          items: {
            create: source.items.map((item) => ({
              userId: user.id,
              slug: item.slug,
              title: item.title,
              description: item.description,
              period: item.period,
              timeRange: item.timeRange,
              startTime: item.startTime,
              endTime: item.endTime,
              position: item.position,
              active: item.active,
              isSacred: item.isSacred,
            })),
          },
        },
      });
    });
    revalidateChecklist();
    return { success: true as const, data: routine };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível duplicar a rotina.'),
    };
  }
}

export async function setDefaultDailyRoutine(routineId: string) {
  try {
    const user = await requireUser();
    await db.$transaction(async (tx) => {
      await requireOwnedRoutine(tx, user.id, routineId);
      await tx.dailyRoutine.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
      await tx.dailyRoutine.update({
        where: { id: routineId },
        data: { isDefault: true },
      });
    });
    revalidateChecklist();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível definir a rotina padrão.'),
    };
  }
}

export async function setDailyRoutineActive(
  routineId: string,
  active: boolean
) {
  try {
    const user = await requireUser();
    await db.$transaction(async (tx) => {
      const routine = await requireOwnedRoutine(tx, user.id, routineId, {
        active: false,
      });
      await tx.dailyRoutine.update({
        where: { id: routineId },
        data: { active, isDefault: active ? routine.isDefault : false },
      });
      if (!active) {
        await tx.dailyRoutineSchedule.deleteMany({
          where: { userId: user.id, routineId },
        });
        await tx.routineDateOverride.deleteMany({
          where: {
            userId: user.id,
            routineId,
            date: { gte: toDayStart(new Date()) },
          },
        });
        if (routine.isDefault) {
          const fallback = await tx.dailyRoutine.findFirst({
            where: { userId: user.id, id: { not: routineId }, active: true },
            orderBy: { createdAt: 'asc' },
          });
          if (fallback) {
            await tx.dailyRoutine.update({
              where: { id: fallback.id },
              data: { isDefault: true },
            });
          }
        }
      }
    });
    revalidateChecklist();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível alterar a rotina.'),
    };
  }
}

export async function deleteDailyRoutine(routineId: string) {
  try {
    const user = await requireUser();
    await db.$transaction(async (tx) => {
      const routine = await requireOwnedRoutine(tx, user.id, routineId, {
        active: false,
      });
      const historyCount = await tx.dailyChecklistEntry.count({
        where: { userId: user.id, routineId },
      });
      if (historyCount > 0) {
        throw new Error(
          'Esta rotina possui histórico. Arquive-a em vez de excluir.'
        );
      }
      await tx.dailyChecklistItem.deleteMany({
        where: { userId: user.id, routineId },
      });
      await tx.dailyRoutine.delete({ where: { id: routineId } });
      if (routine.isDefault) {
        const fallback = await tx.dailyRoutine.findFirst({
          where: { userId: user.id, active: true },
          orderBy: { createdAt: 'asc' },
        });
        if (fallback) {
          await tx.dailyRoutine.update({
            where: { id: fallback.id },
            data: { isDefault: true },
          });
        }
      }
    });
    revalidateChecklist();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível excluir a rotina.'),
    };
  }
}

export async function setRoutineForDate(
  routineId: string | null,
  dateInput: string
) {
  try {
    const user = await requireUser();
    const date = toDayStart(dateInput);
    await db.$transaction(async (tx) => {
      const completedCount = await tx.dailyChecklistEntry.count({
        where: { userId: user.id, date, completed: true },
      });
      if (completedCount > 0) {
        throw new Error(
          'Não é possível trocar a rotina após concluir itens neste dia.'
        );
      }
      await tx.dailyChecklistEntry.deleteMany({
        where: { userId: user.id, date },
      });
      if (!routineId) {
        await tx.routineDateOverride.deleteMany({
          where: { userId: user.id, date },
        });
        const resolved = await resolveRoutineForDate(tx, user.id, date);
        if (resolved.routine) {
          await materializeRoutineEntries(tx, user.id, resolved.routine, date);
        }
        return;
      }
      const routine = await requireOwnedRoutine(tx, user.id, routineId);
      await tx.routineDateOverride.upsert({
        where: { userId_date: { userId: user.id, date } },
        update: { routineId },
        create: { userId: user.id, routineId, date },
      });
      await materializeRoutineEntries(tx, user.id, routine, date);
    });
    revalidateChecklist();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível selecionar a rotina.'),
    };
  }
}

export async function toggleDailyChecklistItem(
  itemId: string,
  dateInput: string,
  completed: boolean
) {
  try {
    const user = await requireUser();
    const date = toDayStart(dateInput);
    const updated = await db.$transaction(async (tx) => {
      const entry = await tx.dailyChecklistEntry.findFirst({
        where: { userId: user.id, itemId, date },
      });
      if (!entry) throw new Error('Item não pertence ao checklist deste dia.');
      const nextEntry = await tx.dailyChecklistEntry.update({
        where: { id: entry.id },
        data: { completed, completedAt: completed ? new Date() : null },
      });
      await tx.taskActivityLog.create({
        data: {
          userId: user.id,
          dailyChecklistItemId: itemId,
          type: completed
            ? 'daily_checklist.completed'
            : 'daily_checklist.uncompleted',
          message: completed
            ? `Checklist concluído: ${entry.itemTitleSnapshot}`
            : `Checklist desmarcado: ${entry.itemTitleSnapshot}`,
          metadata: {
            date: toDateInputValue(date),
            routineId: entry.routineId,
            completed,
          } satisfies Prisma.InputJsonValue,
        },
      });
      return nextEntry;
    });
    revalidateChecklist();
    return { success: true as const, data: updated };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível atualizar o checklist.'),
    };
  }
}

export async function updateDailyRoutineReminders(
  routineId: string,
  reminders: string[]
) {
  try {
    const user = await requireUser();
    const cleaned = reminders
      .map((reminder) => reminder.trim().slice(0, 160))
      .filter(Boolean)
      .slice(0, 20);
    const routine = await db.$transaction(async (tx) => {
      await requireOwnedRoutine(tx, user.id, routineId, { active: false });
      return tx.dailyRoutine.update({
        where: { id: routineId },
        data: { reminders: cleaned },
      });
    });
    revalidateChecklist();
    return { success: true as const, data: routine };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível salvar os lembretes.'),
    };
  }
}

export async function createDailyChecklistItem(data: DailyChecklistItemInput) {
  try {
    const user = await requireUser();
    if (!data.title.trim()) throw new Error('Título é obrigatório.');
    const item = await db.$transaction(async (tx) => {
      await requireOwnedRoutine(tx, user.id, data.routineId, { active: false });
      const position =
        data.position ??
        ((
          await tx.dailyChecklistItem.aggregate({
            where: {
              userId: user.id,
              routineId: data.routineId,
              period: data.period,
            },
            _max: { position: true },
          })
        )._max.position || 0) + 10;
      return tx.dailyChecklistItem.create({
        data: {
          userId: user.id,
          routineId: data.routineId,
          slug: `${slugify(data.title)}-${Date.now()}`,
          title: data.title.trim(),
          description: data.description?.trim() || '',
          period: data.period,
          startTime: data.startTime?.trim() || null,
          endTime: data.endTime?.trim() || null,
          timeRange: buildTimeRange(data.startTime, data.endTime),
          position,
          active: data.active ?? true,
          isSacred: data.isSacred || false,
        },
      });
    });
    await createChecklistLog({
      userId: user.id,
      itemId: item.id,
      type: 'daily_checklist.item_created',
      message: `Item criado: ${item.title}`,
      metadata: { routineId: item.routineId, period: item.period },
    });
    revalidateChecklist();
    return { success: true as const, data: item };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível criar o item.'),
    };
  }
}

export async function updateDailyChecklistItem(
  id: string,
  data: Partial<DailyChecklistItemInput>
) {
  try {
    const user = await requireUser();
    const existing = await db.dailyChecklistItem.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) throw new Error('Item não encontrado.');
    if (data.routineId && data.routineId !== existing.routineId) {
      throw new Error('Mover item entre rotinas não é permitido nesta ação.');
    }
    const nextStartTime =
      data.startTime !== undefined
        ? data.startTime?.trim() || null
        : existing.startTime;
    const nextEndTime =
      data.endTime !== undefined
        ? data.endTime?.trim() || null
        : existing.endTime;
    const updateData: Prisma.DailyChecklistItemUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) {
      updateData.description = data.description.trim();
    }
    if (data.period !== undefined) updateData.period = data.period;
    if (data.startTime !== undefined) updateData.startTime = nextStartTime;
    if (data.endTime !== undefined) updateData.endTime = nextEndTime;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.isSacred !== undefined) updateData.isSacred = data.isSacred;
    if (data.startTime !== undefined || data.endTime !== undefined) {
      updateData.timeRange = buildTimeRange(nextStartTime, nextEndTime);
    }
    const item = await db.dailyChecklistItem.update({
      where: { id },
      data: updateData,
    });
    await createChecklistLog({
      userId: user.id,
      itemId: item.id,
      type: 'daily_checklist.item_updated',
      message: `Item editado: ${item.title}`,
      metadata: { routineId: item.routineId, changed: Object.keys(data) },
    });
    revalidateChecklist();
    return { success: true as const, data: item };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível atualizar o item.'),
    };
  }
}

export async function setDailyChecklistItemActive(id: string, active: boolean) {
  try {
    const user = await requireUser();
    const existing = await db.dailyChecklistItem.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) throw new Error('Item não encontrado.');
    const item = await db.dailyChecklistItem.update({
      where: { id },
      data: { active },
    });
    await createChecklistLog({
      userId: user.id,
      itemId: item.id,
      type: active
        ? 'daily_checklist.item_restored'
        : 'daily_checklist.item_archived',
      message: active
        ? `Item reativado: ${item.title}`
        : `Item arquivado: ${item.title}`,
      metadata: { routineId: item.routineId, active },
    });
    revalidateChecklist();
    return { success: true as const, data: item };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível alterar o item.'),
    };
  }
}

export async function deleteDailyChecklistItem(id: string) {
  try {
    const user = await requireUser();
    await db.$transaction(async (tx) => {
      const item = await tx.dailyChecklistItem.findFirst({
        where: { id, userId: user.id },
      });
      if (!item) throw new Error('Item não encontrado.');
      const historyCount = await tx.dailyChecklistEntry.count({
        where: { userId: user.id, itemId: id },
      });
      if (historyCount > 0) {
        throw new Error(
          'Este item possui histórico. Arquive-o em vez de excluir.'
        );
      }
      await tx.dailyChecklistItem.delete({ where: { id } });
    });
    revalidateChecklist();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível excluir o item.'),
    };
  }
}

export async function moveDailyChecklistItem(
  id: string,
  direction: 'up' | 'down'
) {
  try {
    const user = await requireUser();
    const item = await db.dailyChecklistItem.findFirst({
      where: { id, userId: user.id },
    });
    if (!item) throw new Error('Item não encontrado.');
    const neighbor = await db.dailyChecklistItem.findFirst({
      where: {
        userId: user.id,
        routineId: item.routineId,
        period: item.period,
        active: item.active,
        position:
          direction === 'up' ? { lt: item.position } : { gt: item.position },
      },
      orderBy: { position: direction === 'up' ? 'desc' : 'asc' },
    });
    if (!neighbor) return { success: true as const, data: item };
    await db.$transaction([
      db.dailyChecklistItem.update({
        where: { id: item.id },
        data: { position: neighbor.position },
      }),
      db.dailyChecklistItem.update({
        where: { id: neighbor.id },
        data: { position: item.position },
      }),
    ]);
    await createChecklistLog({
      userId: user.id,
      itemId: item.id,
      type: 'daily_checklist.item_reordered',
      message: `Item reordenado: ${item.title}`,
      metadata: {
        routineId: item.routineId,
        direction,
        from: item.position,
        to: neighbor.position,
      },
    });
    revalidateChecklist();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível reordenar o item.'),
    };
  }
}
