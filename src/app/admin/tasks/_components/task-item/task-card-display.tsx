// src/app/(admin)/tasks/_components/task-item/task-card-display.tsx
'use client';

import { memo } from 'react';
import { Button } from '@/components/ui/button';

interface TaskCardDisplayProps {
  task: any;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEditStart: () => void;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
  isDeleting: boolean;
}

export const TaskCardDisplay = memo(function TaskCardDisplay({
  task,
  isSelected,
  onToggleSelect,
  onEditStart,
  onStatusChange,
  onDelete,
  isDeleting,
}: TaskCardDisplayProps) {
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'completed';
  const isDueToday =
    task.dueDate &&
    new Date(task.dueDate).toDateString() === new Date().toDateString();

  const priorityConfig = {
    low: {
      color: 'text-gray-400',
      bg: 'bg-gray-500/10',
      border: 'border-gray-500/30',
    },
    medium: {
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
    },
    high: {
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
    },
    urgent: {
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
    },
  };

  const priority =
    priorityConfig[task.priority as keyof typeof priorityConfig] ||
    priorityConfig.medium;

  return (
    <div
      className={`p-4 ${isOverdue ? 'border-l-2 border-l-red-500 bg-red-500/5' : ''} transition-all`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox de seleção */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(task.id)}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 h-4 w-4 cursor-pointer rounded border-gray-700 bg-[#2a2a2a] focus:ring-2 focus:ring-blue-500"
        />

        {/* Conteúdo principal */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {/* Título e badges */}
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h4
                  className={`line-clamp-1 font-medium text-white ${
                    task.status === 'completed'
                      ? 'text-gray-500 line-through'
                      : ''
                  }`}
                >
                  {task.title}
                </h4>

                {/* Badges de data */}
                {isOverdue && (
                  <span className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                    ⚠️ Atrasada
                  </span>
                )}
                {isDueToday && !isOverdue && (
                  <span className="inline-flex items-center rounded-full border border-yellow-500/30 bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400">
                    📅 Hoje
                  </span>
                )}
              </div>

              {/* Descrição (se existir) */}
              {task.description && (
                <p className="mb-2 line-clamp-2 text-sm text-gray-400">
                  {task.description}
                </p>
              )}

              {/* Badges de metadados */}
              <div className="mb-2 flex flex-wrap gap-2">
                {/* Priority Badge */}
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priority.color} ${priority.bg} border ${priority.border}`}
                >
                  {task.priority === 'high' && '⚠️ '}
                  {task.priority === 'urgent' && '🚨 '}
                  {task.priority === 'medium' && '📌 '}
                  {task.priority === 'low' && '🔽 '}
                  {task.priority || 'medium'}
                </span>

                {/* Project Badge */}
                {task.project && (
                  <span className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-400">
                    📁 {task.project.title}
                  </span>
                )}

                {/* Feature Badge */}
                {task.feature && (
                  <span className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400">
                    🎯 {task.feature.name}
                  </span>
                )}

                {/* Sprint Badge */}
                {task.sprint && (
                  <span className="inline-flex items-center rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                    🏃 {task.sprint.name}
                  </span>
                )}

                {/* Tags */}
                {task.tags?.map((tag: string) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full border border-gray-700 bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Metadados de tempo e data */}
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                {task.dueDate && (
                  <span
                    className={`flex items-center gap-1 ${isOverdue ? 'text-red-400' : ''}`}
                  >
                    📅 {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                  </span>
                )}
                {task.estimatedHours > 0 && (
                  <span className="flex items-center gap-1">
                    ⏱️ {task.estimatedHours}h est.
                  </span>
                )}
                {task.actualHours > 0 && (
                  <span className="flex items-center gap-1 text-blue-400">
                    ✅ {task.actualHours}h real
                  </span>
                )}
                {task.subtasks?.length > 0 && (
                  <span className="flex items-center gap-1">
                    📋{' '}
                    {
                      task.subtasks.filter((s: any) => s.status === 'completed')
                        .length
                    }
                    /{task.subtasks.length} subtasks
                  </span>
                )}
              </div>
            </div>

            {/* Ações rápidas (visíveis no hover) */}
            <div className="ml-2 flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <select
                value={task.status}
                onChange={(e) => onStatusChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="cursor-pointer rounded border border-gray-700 bg-[#2a2a2a] px-2 py-1 text-xs text-white transition-colors hover:border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="pending">📋 Pendente</option>
                <option value="in-progress">🔄 Em Andamento</option>
                <option value="completed">✅ Concluído</option>
              </select>

              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditStart();
                }}
                className="h-auto px-2 py-1 text-xs"
                title="Editar tarefa"
              >
                ✏️
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                disabled={isDeleting}
                className="h-auto px-2 py-1 text-xs text-red-400 hover:text-red-300"
                title="Excluir tarefa"
              >
                {isDeleting ? '...' : '🗑️'}
              </Button>
            </div>
          </div>

          {/* Barra de progresso (se tiver horas estimadas) */}
          {task.estimatedHours > 0 && (
            <div className="mt-3 border-t border-gray-800 pt-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                    <span>Progresso</span>
                    <span>
                      {Math.round(
                        ((task.actualHours || 0) / task.estimatedHours) * 100
                      )}
                      %
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all duration-300"
                      style={{
                        width: `${Math.min(((task.actualHours || 0) / task.estimatedHours) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
