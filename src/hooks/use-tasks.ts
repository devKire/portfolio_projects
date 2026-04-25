// src/hooks/use-tasks.ts
import { useState, useCallback, useEffect } from 'react';
import { getTasks, getTaskStats } from '@/app/actions/tasks';
import type { TaskFilters } from '@/lib/task-service';

export function useTasks(filters: TaskFilters) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  const fetchTasks = useCallback(
    async (currentFilters: TaskFilters, page = 1) => {
      console.log('🔄 Fetching tasks with filters:', currentFilters);

      setLoading(true);
      setError(null);

      try {
        const [taskResult, statsResult] = await Promise.all([
          getTasks({
            projectId: currentFilters.projectId,
            sprintId: currentFilters.sprintId,
            status: currentFilters.status,
            search: currentFilters.search,
          }),
          getTaskStats(),
        ]);

        console.log('📦 Task result:', taskResult);
        console.log('📊 Stats result:', statsResult);

        if (taskResult.success) {
          let filteredTasks = taskResult.data || [];

          // Aplicar filtros adicionais no frontend
          if (currentFilters.priority) {
            filteredTasks = filteredTasks.filter(
              (t: any) => t.priority === currentFilters.priority
            );
          }

          if (currentFilters.dueDateRange) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (currentFilters.dueDateRange === 'today') {
              filteredTasks = filteredTasks.filter((t: any) => {
                if (!t.dueDate) return false;
                const dueDate = new Date(t.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                return dueDate.getTime() === today.getTime();
              });
            } else if (currentFilters.dueDateRange === 'overdue') {
              filteredTasks = filteredTasks.filter((t: any) => {
                if (!t.dueDate || t.status === 'completed') return false;
                return new Date(t.dueDate) < today;
              });
            } else if (currentFilters.dueDateRange === 'week') {
              const endOfWeek = new Date(today);
              endOfWeek.setDate(today.getDate() + 7);
              filteredTasks = filteredTasks.filter((t: any) => {
                if (!t.dueDate) return false;
                const dueDate = new Date(t.dueDate);
                return dueDate >= today && dueDate <= endOfWeek;
              });
            }
          }

          console.log('✅ Filtered tasks count:', filteredTasks.length);

          setTasks(filteredTasks);
          setPagination({
            page,
            totalPages: Math.ceil(filteredTasks.length / 20),
          });
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
    },
    []
  );

  // Efeito para carregar dados quando os filtros mudarem
  useEffect(() => {
    console.log('🎯 Effect triggered with filters:', filters);
    fetchTasks(filters);
  }, [
    filters.projectId,
    filters.sprintId,
    filters.status,
    filters.priority,
    filters.search,
    filters.dueDateRange,
    fetchTasks,
  ]);

  return {
    tasks,
    stats,
    loading,
    error,
    pagination,
    refetch: () => fetchTasks(filters),
  };
}
