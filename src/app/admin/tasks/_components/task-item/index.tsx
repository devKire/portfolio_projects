// src/app/(admin)/tasks/_components/task-item/index.tsx
'use client';

import { memo, useState, useCallback } from 'react';
import { TaskCardDisplay } from './task-card-display';
import { TaskEditInline } from './task-edit-inline';
import { updateTaskStatus, deleteTask } from '@/app/actions/tasks';

interface TaskItemProps {
  task: any;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  isEditing: boolean;
  onEditStart: (id: string | null) => void;
  onUpdate: () => void;
}

export const TaskItem = memo(function TaskItem({
  task,
  isSelected,
  onToggleSelect,
  isEditing,
  onEditStart,
  onUpdate,
}: TaskItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      setIsDeleting(true);
      try {
        const result = await deleteTask(task.id);
        if (result.success) {
          onUpdate();
        } else {
          console.error('Failed to delete task:', result.error);
          alert('Erro ao excluir tarefa');
        }
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('Erro ao excluir tarefa');
      } finally {
        setIsDeleting(false);
      }
    }
  }, [task.id, onUpdate]);

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      try {
        const result = await updateTaskStatus(task.id, newStatus);
        if (result.success) {
          onUpdate();
        } else {
          console.error('Failed to update status:', result.error);
          alert('Erro ao atualizar status');
        }
      } catch (error) {
        console.error('Error updating status:', error);
        alert('Erro ao atualizar status');
      }
    },
    [task.id, onUpdate]
  );

  const handleEditSuccess = useCallback(() => {
    onEditStart(null);
    onUpdate();
  }, [onEditStart, onUpdate]);

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
          ? 'border border-blue-500/30 bg-blue-500/10'
          : 'border border-gray-800 bg-[#1a1a1a] hover:border-gray-700'
      } ${task.status === 'completed' ? 'opacity-75' : ''} ${
        isEditing ? 'ring-2 ring-blue-500/50' : ''
      }`}
    >
      {isEditing ? (
        <TaskEditInline
          task={task}
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
          onDelete={handleDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
});
