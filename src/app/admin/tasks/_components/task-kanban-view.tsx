// src/app/(admin)/tasks/_components/task-kanban-view.tsx
'use client';

import { memo, useState, useCallback } from 'react';

import { updateTaskPositions, updateTaskStatus } from '@/app/actions/tasks';
import { TaskCard } from './task-card-kanban';

interface TaskKanbanViewProps {
  tasks: any[];
  onTaskUpdate: () => void;
}

const columns = [
  { id: 'pending', title: 'Pendente', icon: '📋', color: 'border-gray-700' },
  {
    id: 'in-progress',
    title: 'Em Andamento',
    icon: '🔄',
    color: 'border-blue-500/30',
  },
  {
    id: 'completed',
    title: 'Concluído',
    icon: '✅',
    color: 'border-green-500/30',
  },
] as const;

export const TaskKanbanView = memo(function TaskKanbanView({
  tasks,
  onTaskUpdate,
}: TaskKanbanViewProps) {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const getTasksByStatus = useCallback(
    (status: string) => {
      return tasks
        .filter((task) => task.status === status)
        .sort((a, b) => a.position - b.position);
    },
    [tasks]
  );

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find((t) => t.id === taskId);

    if (task && task.status !== targetStatus) {
      // Primeiro atualiza o status
      await updateTaskStatus(taskId, targetStatus);

      // Depois atualiza as posições em lote
      const columnTasks = getTasksByStatus(targetStatus);
      const updates = columnTasks.map((t, index) => ({
        id: t.id,
        position: index,
      }));

      await updateTaskPositions(updates);

      onTaskUpdate();
    }
  };

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
      {columns.map((column) => {
        const columnTasks = getTasksByStatus(column.id);

        return (
          <div
            key={column.id}
            className={`rounded-lg border ${column.color} min-h-[500px] bg-[#1a1a1a]/50 p-4 transition-colors ${
              dragOverColumn === column.id ? 'border-blue-500 bg-[#1e1e1e]' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{column.icon}</span>
                <h3 className="text-sm font-semibold text-white">
                  {column.title}
                </h3>
              </div>
              <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                {columnTasks.length}
              </span>
            </div>

            <div className="space-y-2">
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <TaskCard task={task} onUpdate={onTaskUpdate} />
                </div>
              ))}

              {columnTasks.length === 0 && (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-800">
                  <p className="text-sm text-gray-600">Arraste tarefas aqui</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});
