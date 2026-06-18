// src/app/(admin)/tasks/_components/task-item/index.tsx
'use client';

import { memo, useCallback } from 'react';
import { TaskCardDisplay } from './task-card-display';
import { TaskEditInline } from './task-edit-inline';
import { updateTaskStatus, updateTask } from '@/app/actions/tasks';
import type {
  TaskPatch,
  TaskProjectOption,
  TaskWithRelations,
} from '@/types/tasks';

interface TaskItemProps {
  task: TaskWithRelations;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  isEditing: boolean;
  onEditStart: (id: string | null) => void;
  onUpdate: () => void;
  onTaskPatch: (id: string, patch: TaskPatch) => void;
  onDeleteTasks: (ids: string[]) => Promise<void>;
  isDeleting: boolean;
  projects: TaskProjectOption[];
  availableTags: string[];
  onAvailableTagsChange: (tags: string[]) => void;
}

export const TaskItem = memo(function TaskItem({
  task,
  isSelected,
  onToggleSelect,
  isEditing,
  onEditStart,
  onUpdate,
  onTaskPatch,
  onDeleteTasks,
  isDeleting,
  projects,
  availableTags,
  onAvailableTagsChange,
}: TaskItemProps) {
  const handleDelete = useCallback(async () => {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      await onDeleteTasks([task.id]);
    }
  }, [onDeleteTasks, task.id]);

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      const previousStatus = task.status;
      onTaskPatch(task.id, { status: newStatus });
      try {
        const result = await updateTaskStatus(task.id, newStatus);
        if (result.success) {
          onUpdate();
        } else {
          onTaskPatch(task.id, { status: previousStatus });
          console.error('Failed to update status:', result.error);
          alert('Erro ao atualizar status');
        }
      } catch (error) {
        onTaskPatch(task.id, { status: previousStatus });
        console.error('Error updating status:', error);
        alert('Erro ao atualizar status');
      }
    },
    [task.id, task.status, onTaskPatch, onUpdate]
  );

  const handlePatch = useCallback(
    async (patch: TaskPatch) => {
      onTaskPatch(task.id, patch);
      const result = await updateTask(task.id, patch);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update task');
      }
      if (result.data) {
        onTaskPatch(task.id, result.data as TaskPatch);
      }
    },
    [task.id, onTaskPatch]
  );

  const handleEditSuccess = useCallback(
    (updatedTask: TaskWithRelations) => {
      onTaskPatch(task.id, updatedTask as unknown as TaskPatch);
      onAvailableTagsChange(updatedTask.tags || []);
      onEditStart(null);
    },
    [onAvailableTagsChange, onEditStart, onTaskPatch, task.id]
  );

  const handleEditCancel = useCallback(() => {
    onEditStart(null);
  }, [onEditStart]);

  // Se não tem task válida, não renderiza
  if (!task || !task.id) {
    console.error('TaskItem: Invalid task object', task);
    return null;
  }

  return (
    <div
      className={`relative rounded-lg transition-all duration-200 ${
        isSelected
          ? 'border border-[#6f55d9]/30 bg-[#6f55d9]/10'
          : 'border border-[#2f2f35] bg-[#1a1a1a] hover:border-[#303036]'
      } ${task.status === 'completed' ? 'opacity-75' : ''} ${
        isEditing ? 'ring-2 ring-[#6f55d9]/50' : ''
      }`}
    >
      {isEditing ? (
        <TaskEditInline
          task={task}
          projects={projects}
          availableTags={availableTags}
          onAvailableTagsChange={onAvailableTagsChange}
          onCancel={handleEditCancel}
          onSuccess={handleEditSuccess}
        />
      ) : (
        <TaskCardDisplay
          task={task}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
          onEditStart={() => onEditStart(task.id)}
          onStatusChange={handleStatusChange}
          onPatch={handlePatch}
          onOptimisticPatch={(patch) => onTaskPatch(task.id, patch)}
          projects={projects}
          availableTags={availableTags}
          onAvailableTagsChange={onAvailableTagsChange}
          onDelete={handleDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
});
