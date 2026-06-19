'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/prisma';
import { DAILY_CHECKLIST_ITEMS } from '@/lib/daily-checklist-items';
import { requireUser } from '@/lib/auth/session';

export interface DailyChecklistItemInput {
  title: string;
  description?: string;
  period: string;
  startTime?: string;
  endTime?: string;
  position?: number;
  isSacred?: boolean;
  active?: boolean;
}

function toDayStart(dateInput: string | Date) {
  const date =
    typeof dateInput === 'string'
      ? new Date(`${dateInput}T00:00:00`)
      : new Date(dateInput);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
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

  return base || `item-${Date.now()}`;
}

async function ensureDailyChecklistItems(userId: string) {
  const existing = await db.dailyChecklistItem.findMany({
    where: {
      userId,
      slug: { in: DAILY_CHECKLIST_ITEMS.map((item) => item.slug) },
    },
    select: { slug: true },
  });
  const existingSlugs = new Set(existing.map((item) => item.slug));
  const missingItems = DAILY_CHECKLIST_ITEMS.filter(
    (item) => !existingSlugs.has(item.slug)
  );

  if (missingItems.length === 0) return;

  await db.dailyChecklistItem.createMany({
    data: missingItems.map((item) => ({
      userId,
      slug: item.slug,
      title: item.title,
      description: item.description,
      period: item.period,
      timeRange: item.timeRange,
      startTime: item.startTime,
      endTime: item.endTime,
      position: item.position,
      isSacred: item.isSacred || false,
    })),
    skipDuplicates: true,
  });
}

async function getHistory(userId: string, days: number, selectedDate: Date) {
  const start = addDays(selectedDate, -(days - 1));
  const end = addDays(selectedDate, 1);

  const [itemsCount, entries] = await Promise.all([
    db.dailyChecklistItem.count({ where: { userId, active: true } }),
    db.dailyChecklistEntry.findMany({
      where: {
        userId,
        date: { gte: start, lt: end },
      },
      select: {
        date: true,
        completed: true,
      },
    }),
  ]);

  return Array.from({ length: days }).map((_, index) => {
    const day = addDays(start, index);
    const dayKey = toDateInputValue(day);
    const completed = entries.filter(
      (entry) => toDateInputValue(entry.date) === dayKey && entry.completed
    ).length;

    return {
      date: dayKey,
      completed,
      total: itemsCount,
      percentage: itemsCount ? Math.round((completed / itemsCount) * 100) : 0,
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
    await ensureDailyChecklistItems(user.id);

    const date = toDayStart(dateInput);
    const nextDate = addDays(date, 1);

    const entriesForDate = db.dailyChecklistEntry.findMany({
      where: { userId: user.id, date },
    });

    const [entries, logs, history] = await Promise.all([
      entriesForDate,
      db.taskActivityLog.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: date, lt: nextDate },
        },
        include: {
          task: { select: { id: true, title: true } },
          dailyChecklistItem: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      getHistory(user.id, 7, date),
    ]);

    const entryItemIds = entries.map((entry) => entry.itemId);
    const items = await db.dailyChecklistItem.findMany({
      where: {
        userId: user.id,
        OR: [{ active: true }, { id: { in: entryItemIds } }],
      },
      orderBy: [{ position: 'asc' }],
    });

    const allItems = await db.dailyChecklistItem.findMany({
      where: { userId: user.id },
      orderBy: [{ position: 'asc' }],
    });

    const entriesByItemId = new Map(
      entries.map((entry) => [entry.itemId, entry])
    );
    const checklist = items.map((item) => {
      const entry = entriesByItemId.get(item.id);
      return {
        id: item.id,
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
        entryId: entry?.id || null,
        completed: entry?.completed || false,
        completedAt: entry?.completedAt?.toISOString() || null,
        note: entry?.note || '',
      };
    });

    const completed = checklist.filter((item) => item.completed).length;
    const total = checklist.length;

    return {
      success: true,
      data: {
        date: toDateInputValue(date),
        checklist,
        items: allItems.map((item) => ({
          id: item.id,
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
          total,
          percentage: total ? Math.round((completed / total) * 100) : 0,
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
    console.error('Error fetching daily checklist:', error);
    return { success: false, error: 'Failed to fetch daily checklist' };
  }
}

export async function toggleDailyChecklistItem(
  itemId: string,
  dateInput: string,
  completed: boolean
) {
  if (!itemId || !dateInput) {
    return { success: false, error: 'Invalid checklist update' };
  }

  try {
    const user = await requireUser();
    const date = toDayStart(dateInput);
    const item = await db.dailyChecklistItem.findFirst({
      where: { id: itemId, userId: user.id },
      select: { id: true, title: true },
    });

    if (!item) {
      return { success: false, error: 'Checklist item not found' };
    }

    const entry = await db.dailyChecklistEntry.upsert({
      where: {
        userId_itemId_date: {
          userId: user.id,
          itemId,
          date,
        },
      },
      update: {
        completed,
        completedAt: completed ? new Date() : null,
      },
      create: {
        userId: user.id,
        itemId,
        date,
        completed,
        completedAt: completed ? new Date() : null,
      },
    });

    await createChecklistLog({
      userId: user.id,
      itemId,
      type: completed
        ? 'daily_checklist.completed'
        : 'daily_checklist.uncompleted',
      message: completed
        ? `Checklist concluido: ${item.title}`
        : `Checklist desmarcado: ${item.title}`,
      metadata: {
        date: toDateInputValue(date),
        completed,
      } satisfies Prisma.InputJsonValue,
    });

    revalidatePath('/admin/tasks');
    return { success: true, data: entry };
  } catch (error) {
    console.error('Error toggling daily checklist item:', error);
    return { success: false, error: 'Failed to update checklist item' };
  }
}

export async function createDailyChecklistItem(data: DailyChecklistItemInput) {
  if (!data.title.trim()) {
    return { success: false, error: 'Title is required' };
  }

  try {
    const user = await requireUser();
    const position =
      data.position ??
      ((
        await db.dailyChecklistItem.aggregate({
          where: { userId: user.id, period: data.period },
          _max: { position: true },
        })
      )._max.position || 0) + 10;

    const item = await db.dailyChecklistItem.create({
      data: {
        userId: user.id,
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

    await createChecklistLog({
      userId: user.id,
      itemId: item.id,
      type: 'daily_checklist.item_created',
      message: `Item criado: ${item.title}`,
      metadata: { period: item.period, position: item.position },
    });

    revalidatePath('/admin/tasks');
    return { success: true, data: item };
  } catch (error) {
    console.error('Error creating daily checklist item:', error);
    return { success: false, error: 'Failed to create checklist item' };
  }
}

export async function updateDailyChecklistItem(
  id: string,
  data: Partial<DailyChecklistItemInput>
) {
  if (!id) return { success: false, error: 'Invalid checklist item' };

  try {
    const user = await requireUser();
    const existing = await db.dailyChecklistItem.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return { success: false, error: 'Checklist item not found' };

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
    if (data.description !== undefined)
      updateData.description = data.description.trim();
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
      metadata: {
        changed: Object.keys(data),
        from: {
          title: existing.title,
          period: existing.period,
          position: existing.position,
          active: existing.active,
        },
        to: {
          title: item.title,
          period: item.period,
          position: item.position,
          active: item.active,
        },
      } satisfies Prisma.InputJsonValue,
    });

    revalidatePath('/admin/tasks');
    return { success: true, data: item };
  } catch (error) {
    console.error('Error updating daily checklist item:', error);
    return { success: false, error: 'Failed to update checklist item' };
  }
}

export async function setDailyChecklistItemActive(id: string, active: boolean) {
  try {
    const user = await requireUser();
    const existing = await db.dailyChecklistItem.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) return { success: false, error: 'Checklist item not found' };

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
      metadata: {
        from: existing.active,
        to: active,
      } satisfies Prisma.InputJsonValue,
    });

    revalidatePath('/admin/tasks');
    return { success: true, data: item };
  } catch (error) {
    console.error('Error archiving daily checklist item:', error);
    return { success: false, error: 'Failed to archive checklist item' };
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
    if (!item) return { success: false, error: 'Checklist item not found' };

    const neighbor = await db.dailyChecklistItem.findFirst({
      where: {
        userId: user.id,
        period: item.period,
        active: item.active,
        position:
          direction === 'up' ? { lt: item.position } : { gt: item.position },
      },
      orderBy: {
        position: direction === 'up' ? 'desc' : 'asc',
      },
    });

    if (!neighbor) return { success: true, data: item };

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
        direction,
        from: item.position,
        to: neighbor.position,
      } satisfies Prisma.InputJsonValue,
    });

    revalidatePath('/admin/tasks');
    return { success: true };
  } catch (error) {
    console.error('Error moving daily checklist item:', error);
    return { success: false, error: 'Failed to reorder checklist item' };
  }
}
