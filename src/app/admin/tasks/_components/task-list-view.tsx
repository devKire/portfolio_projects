// src/app/(admin)/tasks/_components/task-list-view.tsx
'use client';

import { memo } from 'react';
import { EmptyState } from './empty-state';
import { TaskItem } from './task-item';
import type {
  TaskPatch,
  TaskProjectOption,
  TaskWithRelations,
} from '@/types/tasks';

interface TaskListViewProps {
  tasks: TaskWithRelations[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onEditStart: (id: string | null) => void;
  editingTaskId: string | null;
  onTaskUpdate: () => void;
  onTaskPatch: (id: string, patch: TaskPatch) => void;
  onDeleteTasks: (ids: string[]) => Promise<void>;
  deletingIds: Set<string>;
  projects: TaskProjectOption[];
  availableTags: string[];
  onAvailableTagsChange: (tags: string[]) => void;
}

export const TaskListView = memo(function TaskListView({
  tasks,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onEditStart,
  editingTaskId,
  onTaskUpdate,
  onTaskPatch,
  onDeleteTasks,
  deletingIds,
  projects,
  availableTags,
  onAvailableTagsChange,
}: TaskListViewProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        title="Nenhuma tarefa encontrada"
        description="Tente ajustar os filtros ou criar uma nova tarefa."
        actionLabel="Limpar Filtros"
        onAction={() => {}} // Você pode adicionar uma função para limpar filtros
      />
    );
  }

  return (
    <div className="space-y-1">
      {/* Select All Header */}
      <div className="flex items-center gap-3 px-4 py-2 text-sm text-[#9b9ba3]">
        <input
          type="checkbox"
          checked={selectedIds.size === tasks.length && tasks.length > 0}
          onChange={() => {
            if (selectedIds.size === tasks.length) {
              onSelectAll([]);
            } else {
              onSelectAll(tasks.map((t) => t.id));
            }
          }}
          className="h-4 w-4 cursor-pointer rounded border-[#303036] bg-[#2a2a2a]"
        />
        <span>
          {selectedIds.size > 0
            ? `${selectedIds.size} de ${tasks.length} selecionadas`
            : 'Selecionar todas'}
        </span>
      </div>

      {/* Task List */}
      <div className="space-y-1">
        {tasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            isSelected={selectedIds.has(task.id)}
            onToggleSelect={onToggleSelect}
            isEditing={editingTaskId === task.id}
            onEditStart={onEditStart}
            onUpdate={onTaskUpdate}
            onTaskPatch={onTaskPatch}
            onDeleteTasks={onDeleteTasks}
            isDeleting={deletingIds.has(task.id)}
            projects={projects}
            availableTags={availableTags}
            onAvailableTagsChange={onAvailableTagsChange}
          />
        ))}
      </div>
    </div>
  );
});
