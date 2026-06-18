// src/app/(admin)/tasks/_components/task-page-client.tsx
'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useTasks } from '@/hooks/use-tasks';
import { useTaskFilters } from '@/hooks/use-task-filters';
import { useTaskSelection } from '@/hooks/use-task-selection';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

import {
  deleteTasksBulk,
  getProjects,
  getTaskTags,
  updateTaskStatus,
} from '@/app/actions/tasks';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { TaskFiltersBar } from './task-filters-bar';
import { BulkActionsBar } from './bulk-actions-bar';
import { QuickTaskInput } from './quick-task-input';
import { BulkTaskInput } from './bulk-task-input';
import { TaskListView } from './task-list-view';
import { TaskKanbanView } from './task-kanban-view';
import { TaskHeader } from './task-header';
import { mergeTaskTags } from '@/lib/task-tags';
import type {
  TaskPatch,
  TaskProjectOption,
  TaskWithRelations,
} from '@/types/tasks';

type ViewMode = 'list' | 'kanban';

export function TaskPageClient() {
  const { filters, resolvedFilters, updateFilter, resetFilters } =
    useTaskFilters({});
  const {
    tasks,
    stats,
    loading,
    error,
    refetch,
    updateTaskInCache,
    addTasksToCache,
    removeTasksFromCache,
  } = useTasks(resolvedFilters);
  const {
    selectedIds,
    count: selectionCount,
    toggle,
    selectAll,
    clearSelection,
    removeFromSelection,
  } = useTaskSelection();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isQuickInputOpen, setIsQuickInputOpen] = useState(false);
  const [isBulkInputOpen, setIsBulkInputOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [projects, setProjects] = useState<TaskProjectOption[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());

  const loadTags = useCallback(async () => {
    const result = await getTaskTags();
    if (result.success) setAvailableTags(result.data || []);
  }, []);

  useEffect(() => {
    let isMounted = true;

    getProjects().then((result) => {
      if (!isMounted || !result.success) return;
      setProjects(
        (result.data || []).map((project) => ({
          id: project.id,
          title: project.title,
        }))
      );
    });
    void loadTags();

    return () => {
      isMounted = false;
    };
  }, [loadTags]);

  const handleDeleteTasks = useCallback(
    async (ids: string[]) => {
      const uniqueIds = Array.from(new Set(ids));
      if (uniqueIds.length === 0 || deletingIds.size > 0) return;

      setDeletingIds(new Set(uniqueIds));
      const count = uniqueIds.length;

      try {
        const result = await deleteTasksBulk(uniqueIds);
        if (result.deletedIds.length > 0) {
          removeTasksFromCache(result.deletedIds);
          removeFromSelection(result.deletedIds);
        }

        if (result.success) {
          toast.success(
            count === 1
              ? 'Tarefa excluida'
              : `${result.deletedIds.length} tarefas excluidas`
          );
          return;
        }

        if (result.deletedIds.length > 0) {
          toast.error(
            `${result.deletedIds.length} tarefa(s) excluida(s); ${
              result.failedItems?.length || 0
            } falharam.`
          );
        } else {
          toast.error(
            result.failedItems?.[0]?.error ||
              'Nao foi possivel excluir as tarefas.'
          );
        }
      } catch (error) {
        console.error('Error deleting tasks:', error);
        toast.error('Nao foi possivel excluir as tarefas.');
      } finally {
        setDeletingIds(new Set());
      }
    },
    [deletingIds.size, removeFromSelection, removeTasksFromCache]
  );

  // Métodos de ação
  const handleBulkDelete = async () => {
    if (selectionCount === 0 || deletingIds.size > 0) return;
    try {
      await handleDeleteTasks(Array.from(selectedIds));
    } catch (error) {
      console.error('Error in bulk delete:', error);
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    if (selectionCount === 0 || !status) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => updateTaskStatus(id, status))
      );
      clearSelection();
      await refetch();
    } catch (error) {
      console.error('Error in bulk status change:', error);
    }
  };

  const closeQuickInput = useCallback(() => setIsQuickInputOpen(false), []);
  const closeBulkInput = useCallback(() => setIsBulkInputOpen(false), []);
  const handleTaskPatch = useCallback(
    (id: string, patch: TaskPatch) => {
      updateTaskInCache(id, patch);
    },
    [updateTaskInCache]
  );
  const mergeAvailableTags = useCallback((nextTags: string[]) => {
    setAvailableTags((current) => mergeTaskTags([...current, ...nextTags]));
  }, []);

  const handleCreatedTasks = useCallback(
    (createdTasks: TaskWithRelations[]) => {
      addTasksToCache(createdTasks);
      mergeAvailableTags(createdTasks.flatMap((task) => task.tags || []));
    },
    [addTasksToCache, mergeAvailableTags]
  );

  // Atalhos de teclado
  useKeyboardShortcuts({
    onNewTask: () => {
      setIsBulkInputOpen(false);
      setIsQuickInputOpen(true);
    },
    onNewBulkTasks: () => {
      setIsQuickInputOpen(false);
      setIsBulkInputOpen(true);
    },
    onSearchFocus: () => searchInputRef.current?.focus(),
    onSelectAll: () => selectAll(tasks.map((t) => t.id)),
    onClearSelection: clearSelection,
    isBulkDeleteDisabled: selectionCount === 0,
    onBulkDelete: handleBulkDelete,
    onViewChange: setViewMode,
  });

  return (
    <div className="min-w-0 space-y-4">
      <TaskHeader
        stats={stats}
        onNewTask={() => {
          setIsBulkInputOpen(false);
          setIsQuickInputOpen(true);
        }}
        onNewBulkTasks={() => {
          setIsQuickInputOpen(false);
          setIsBulkInputOpen(true);
        }}
      />

      <TaskFiltersBar
        filters={filters}
        onFilterChange={updateFilter}
        onClearFilters={resetFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchInputRef={searchInputRef}
        projects={projects}
        tags={availableTags}
      />

      {selectionCount > 0 && (
        <BulkActionsBar
          count={selectionCount}
          onBulkStatusChange={handleBulkStatusChange}
          onBulkDelete={handleBulkDelete}
          onClearSelection={clearSelection}
          isDeleting={deletingIds.size > 0}
        />
      )}

      {deletingIds.size > 0 && (
        <div
          className="flex items-center gap-2 rounded-lg border border-[#6f55d9]/30 bg-[#6f55d9]/10 px-3 py-2 text-sm text-[#c9b8ff]"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          {deletingIds.size === 1
            ? 'Excluindo tarefa...'
            : `Excluindo ${deletingIds.size} tarefas...`}
        </div>
      )}

      {isQuickInputOpen && (
        <QuickTaskInput
          onClose={closeQuickInput}
          projects={projects}
          tags={availableTags}
          onSuccess={(task) => {
            handleCreatedTasks([task]);
            closeQuickInput();
          }}
        />
      )}

      {isBulkInputOpen && (
        <BulkTaskInput
          onClose={closeBulkInput}
          projects={projects}
          tags={availableTags}
          onSuccess={(createdTasks) => {
            handleCreatedTasks(createdTasks);
            closeBulkInput();
          }}
        />
      )}

      {/* Estado de erro */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-red-400">Erro: {error}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm text-red-400 underline hover:text-red-300"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Estado de loading inicial */}
      {loading && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-[#6f55d9]"></div>
          <div className="text-[#9b9ba3]">Carregando tarefas...</div>
        </div>
      )}

      {/* Lista de tarefas */}
      {!loading &&
        !error &&
        (viewMode === 'list' ? (
          <TaskListView
            tasks={tasks}
            selectedIds={selectedIds}
            onToggleSelect={toggle}
            onSelectAll={selectAll}
            onEditStart={setEditingTaskId}
            editingTaskId={editingTaskId}
            onTaskUpdate={() => {
              setEditingTaskId(null);
              refetch();
            }}
            onTaskPatch={handleTaskPatch}
            onDeleteTasks={handleDeleteTasks}
            deletingIds={deletingIds}
            projects={projects}
            availableTags={availableTags}
            onAvailableTagsChange={mergeAvailableTags}
          />
        ) : (
          <TaskKanbanView
            tasks={tasks}
            onTaskUpdate={() => refetch()}
            onTaskPatch={handleTaskPatch}
            onDeleteTasks={handleDeleteTasks}
            deletingIds={deletingIds}
            projects={projects}
            availableTags={availableTags}
            onAvailableTagsChange={mergeAvailableTags}
          />
        ))}

      {/* Loading overlay para refetch */}
      {loading && tasks.length > 0 && (
        <div className="fixed top-0 right-0 left-0 z-50">
          <div className="h-1 animate-pulse bg-gradient-to-r from-[#6f55d9] to-[#9a8cff]"></div>
        </div>
      )}
    </div>
  );
}
