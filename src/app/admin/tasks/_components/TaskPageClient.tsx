// src/app/(admin)/tasks/_components/task-page-client.tsx
'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useTasks } from '@/hooks/use-tasks';
import { useTaskFilters } from '@/hooks/use-task-filters';
import { useTaskSelection } from '@/hooks/use-task-selection';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

import {
  deleteTask,
  getProjects,
  getTaskTags,
  updateTaskStatus,
} from '@/app/actions/tasks';
import { TaskFiltersBar } from './task-filters-bar';
import { BulkActionsBar } from './bulk-actions-bar';
import { QuickTaskInput } from './quick-task-input';
import { TaskListView } from './task-list-view';
import { TaskKanbanView } from './task-kanban-view';
import { TaskHeader } from './task-header';
import { DailyChecklistCard } from './daily-checklist-card';
import type { TaskPatch, TaskProjectOption } from '@/types/tasks';

type ViewMode = 'list' | 'kanban';

export function TaskPageClient() {
  const { filters, resolvedFilters, updateFilter } = useTaskFilters({});
  const { tasks, stats, loading, error, refetch, updateTaskInCache } =
    useTasks(resolvedFilters);
  const {
    selectedIds,
    count: selectionCount,
    toggle,
    selectAll,
    clearSelection,
  } = useTaskSelection();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isQuickInputOpen, setIsQuickInputOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [projects, setProjects] = useState<TaskProjectOption[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

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

  // Debug para ver o que está acontecendo
  useEffect(() => {
    console.log('📋 Current state:', {
      tasksCount: tasks.length,
      loading,
      error,
      filtersCount: Object.keys(resolvedFilters).filter(
        (k) => resolvedFilters[k as keyof typeof resolvedFilters]
      ).length,
      stats,
    });
  }, [tasks, loading, error, resolvedFilters, stats]);

  // Métodos de ação
  const handleBulkDelete = async () => {
    if (selectionCount === 0) return;
    try {
      await Promise.all(Array.from(selectedIds).map((id) => deleteTask(id)));
      clearSelection();
      refetch();
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
      refetch();
    } catch (error) {
      console.error('Error in bulk status change:', error);
    }
  };

  const closeQuickInput = useCallback(() => setIsQuickInputOpen(false), []);
  const handleTaskPatch = useCallback(
    (id: string, patch: TaskPatch) => {
      updateTaskInCache(id, patch);
    },
    [updateTaskInCache]
  );

  // Atalhos de teclado
  useKeyboardShortcuts({
    onNewTask: () => setIsQuickInputOpen(true),
    onSearchFocus: () => searchInputRef.current?.focus(),
    onSelectAll: () => selectAll(tasks.map((t) => t.id)),
    onClearSelection: clearSelection,
    isBulkDeleteDisabled: selectionCount === 0,
    onBulkDelete: handleBulkDelete,
    onViewChange: setViewMode,
  });

  return (
    <div className="min-h-screen space-y-6 bg-[#0a0a0a] p-8">
      <TaskHeader stats={stats} onNewTask={() => setIsQuickInputOpen(true)} />

      <TaskFiltersBar
        filters={filters}
        onFilterChange={updateFilter}
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
        />
      )}

      {isQuickInputOpen && (
        <QuickTaskInput
          onClose={closeQuickInput}
          projects={projects}
          tags={availableTags}
          onSuccess={() => {
            closeQuickInput();
            refetch();
            void loadTags();
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
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
          <div className="text-gray-400">Carregando tarefas...</div>
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
            projects={projects}
          />
        ) : (
          <TaskKanbanView
            tasks={tasks}
            onTaskUpdate={() => refetch()}
            onTaskPatch={handleTaskPatch}
            projects={projects}
          />
        ))}

      {!loading && !error && <DailyChecklistCard />}

      {/* Loading overlay para refetch */}
      {loading && tasks.length > 0 && (
        <div className="fixed top-0 right-0 left-0 z-50">
          <div className="h-1 animate-pulse bg-gradient-to-r from-blue-500 to-purple-500"></div>
        </div>
      )}
    </div>
  );
}
