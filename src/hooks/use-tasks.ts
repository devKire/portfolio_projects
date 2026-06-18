// src/hooks/use-tasks.ts
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { getTasks, getTaskStats } from '@/app/actions/tasks';
import type { TaskFilters } from '@/lib/task-service';
import { taskTagKey } from '@/lib/task-tags';
import type { TaskPatch, TaskWithRelations } from '@/types/tasks';

function getFilterValues(primary?: string, values?: string[]) {
  return values && values.length > 0 ? values : primary ? [primary] : [];
}

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function matchesDueDateRange(
  task: TaskWithRelations,
  range: TaskFilters['dueDateRange']
) {
  if (!range) return true;
  if (!task.dueDate) return false;

  const today = startOfDay(new Date());
  const dueDate = startOfDay(new Date(task.dueDate));

  if (range === 'today') return dueDate.getTime() === today.getTime();
  if (range === 'overdue') {
    return task.status !== 'completed' && dueDate.getTime() < today.getTime();
  }
  if (range === 'week') {
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);
    return dueDate >= today && dueDate <= endOfWeek;
  }

  return true;
}

function matchesDateInterval(task: TaskWithRelations, filters: TaskFilters) {
  if (!filters.dueDateFrom && !filters.dueDateTo) return true;
  if (!task.dueDate) return false;

  const dueDate = startOfDay(new Date(task.dueDate));

  if (filters.dueDateFrom) {
    const start = startOfDay(new Date(`${filters.dueDateFrom}T00:00:00`));
    if (dueDate < start) return false;
  }

  if (filters.dueDateTo) {
    const end = startOfDay(new Date(`${filters.dueDateTo}T00:00:00`));
    if (dueDate > end) return false;
  }

  return true;
}

function applyTaskFilters(
  tasks: TaskWithRelations[],
  currentFilters: TaskFilters
) {
  const statuses = getFilterValues(
    currentFilters.status,
    currentFilters.statuses
  );
  const priorities = getFilterValues(
    currentFilters.priority,
    currentFilters.priorities
  );
  const projectIds = getFilterValues(
    currentFilters.projectId,
    currentFilters.projectIds
  );
  const selectedTagKeys = getFilterValues(
    currentFilters.tag,
    currentFilters.tags
  ).map(taskTagKey);
  const search = currentFilters.search?.trim().toLowerCase();

  return tasks.filter((task) => {
    if (search) {
      const haystack = [
        task.title,
        task.description || '',
        task.project?.title || '',
        ...(task.tags || []),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    if (statuses.length && !statuses.includes(task.status)) return false;
    if (priorities.length && !priorities.includes(task.priority)) return false;
    if (currentFilters.sprintId && task.sprintId !== currentFilters.sprintId) {
      return false;
    }

    if (projectIds.length || currentFilters.withoutProject) {
      const matchesProject =
        Boolean(task.projectId && projectIds.includes(task.projectId)) ||
        Boolean(task.project?.id && projectIds.includes(task.project.id));
      const matchesWithoutProject =
        currentFilters.withoutProject && !task.projectId && !task.project;

      if (!matchesProject && !matchesWithoutProject) return false;
    }

    if (selectedTagKeys.length || currentFilters.withoutTags) {
      const taskTagKeys = (task.tags || []).map(taskTagKey);
      const matchesTags =
        selectedTagKeys.length === 0
          ? false
          : currentFilters.tagMatchMode === 'all'
            ? selectedTagKeys.every((tag) => taskTagKeys.includes(tag))
            : selectedTagKeys.some((tag) => taskTagKeys.includes(tag));
      const matchesWithoutTags =
        currentFilters.withoutTags && taskTagKeys.length === 0;

      if (!matchesTags && !matchesWithoutTags) return false;
    }

    if (!matchesDueDateRange(task, currentFilters.dueDateRange)) return false;
    if (!matchesDateInterval(task, currentFilters)) return false;

    return true;
  });
}

export function useTasks(filters: TaskFilters) {
  const [allTasks, setAllTasks] = useState<TaskWithRelations[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const allTasksRef = useRef<TaskWithRelations[]>([]);

  useEffect(() => {
    allTasksRef.current = allTasks;
  }, [allTasks]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [taskResult, statsResult] = await Promise.all([
        getTasks(),
        getTaskStats(),
      ]);

      if (taskResult.success) {
        setAllTasks(taskResult.data || []);
      } else {
        console.error('❌ Failed to load tasks:', taskResult.error);
        setError(taskResult.error || 'Failed to load tasks');
      }

      if (statsResult.success) {
        setStats(statsResult.data);
      } else {
        console.error('❌ Failed to load stats:', statsResult.error);
      }
    } catch (e) {
      console.error('💥 Unexpected error:', e);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const tasks = useMemo(
    () => applyTaskFilters(allTasks, filters),
    [allTasks, filters]
  );

  const pagination = useMemo(
    () => ({
      page: 1,
      totalPages: Math.ceil(tasks.length / 20),
    }),
    [tasks.length]
  );

  const updateTaskInCache = useCallback((id: string, patch: TaskPatch) => {
    setAllTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, ...patch } : task))
    );
  }, []);

  const addTasksToCache = useCallback((newTasks: TaskWithRelations[]) => {
    if (newTasks.length === 0) return;

    setAllTasks((current) => {
      const existingIds = new Set(current.map((task) => task.id));
      const uniqueTasks = newTasks.filter((task) => !existingIds.has(task.id));
      return [...uniqueTasks, ...current];
    });

    setStats((current: any) => {
      if (!current) return current;
      const nextStats = { ...current };
      for (const task of newTasks) {
        nextStats.total += 1;
        if (task.status === 'pending') nextStats.pending += 1;
        if (task.status === 'in-progress') nextStats.inProgress += 1;
        if (task.status === 'completed') nextStats.completed += 1;
      }
      return nextStats;
    });
  }, []);

  const removeTasksFromCache = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const removedTasks = allTasksRef.current.filter((task) =>
      idSet.has(task.id)
    );

    setAllTasks((current) => current.filter((task) => !idSet.has(task.id)));
    setStats((current: any) => {
      if (!current) return current;
      const nextStats = { ...current };
      for (const task of removedTasks) {
        nextStats.total = Math.max(0, nextStats.total - 1);
        if (task.status === 'pending') {
          nextStats.pending = Math.max(0, nextStats.pending - 1);
        }
        if (task.status === 'in-progress') {
          nextStats.inProgress = Math.max(0, nextStats.inProgress - 1);
        }
        if (task.status === 'completed') {
          nextStats.completed = Math.max(0, nextStats.completed - 1);
        }
      }
      return nextStats;
    });
  }, []);

  return {
    tasks,
    stats,
    loading,
    error,
    pagination,
    updateTaskInCache,
    addTasksToCache,
    removeTasksFromCache,
    refetch: fetchTasks,
  };
}
