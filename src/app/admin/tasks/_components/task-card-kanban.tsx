// src/app/(admin)/tasks/_components/task-card-kanban.tsx
'use client';

import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { deleteTask } from '@/app/actions/tasks';

interface TaskCardProps {
  task: any;
  onUpdate: () => void;
}

export const TaskCard = memo(function TaskCard({
  task,
  onUpdate,
}: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Excluir esta tarefa?')) {
      await deleteTask(task.id);
      onUpdate();
    }
  };

  const priorityColors = {
    low: 'border-l-gray-500',
    medium: 'border-l-blue-500',
    high: 'border-l-yellow-500',
    urgent: 'border-l-red-500',
  };

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'completed';

  return (
    <div
      className={`group rounded-lg border border-l-2 border-gray-800 bg-[#1e1e1e] p-3 ${
        priorityColors[task.priority as keyof typeof priorityColors] ||
        'border-l-gray-500'
      } relative transition-all hover:border-gray-700 ${
        isOverdue ? 'bg-red-500/5' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="line-clamp-2 flex-1 text-sm font-medium text-white">
          {task.title}
        </h4>

        {isHovered && (
          <Button
            size="sm"
            onClick={handleDelete}
            className="h-6 w-6 p-0 text-xs opacity-60 transition-opacity hover:opacity-100"
          >
            ×
          </Button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {task.tags?.map((tag: string) => (
          <span
            key={tag}
            className="inline-flex items-center rounded bg-gray-800/50 px-1.5 py-0.5 text-xs text-gray-400"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          {task.feature && (
            <span className="text-purple-400">{task.feature.name}</span>
          )}
          {isOverdue && (
            <span className="font-medium text-red-400">Atrasada</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {task.estimatedHours > 0 && <span>{task.estimatedHours}h</span>}
          {task.dueDate && (
            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );
});
