'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { Briefcase, Calendar, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { deleteTask, updateTask } from '@/app/actions/tasks';
import { cn } from '@/lib/utils';
import type {
  TaskPatch,
  TaskPriority,
  TaskProjectOption,
  TaskWithRelations,
} from '@/types/tasks';

interface TaskCardProps {
  task: TaskWithRelations;
  onUpdate: () => void;
  onTaskPatch: (patch: TaskPatch) => void;
  projects: TaskProjectOption[];
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'border-l-gray-500',
  medium: 'border-l-blue-500',
  high: 'border-l-yellow-500',
  urgent: 'border-l-red-500',
};

function toDateInputValue(value?: Date | string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export const TaskCard = memo(function TaskCard({
  task,
  onUpdate,
  onTaskPatch,
  projects,
}: TaskCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraftTitle(task.title), [task.title]);
  useEffect(() => {
    if (!isEditingTitle) return;
    titleRef.current?.focus();
    titleRef.current?.select();
  }, [isEditingTitle]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Excluir esta tarefa?')) {
      await deleteTask(task.id);
      onUpdate();
    }
  };

  const commitPatch = async (patch: TaskPatch, rollback?: TaskPatch) => {
    onTaskPatch(patch);
    setSaving(true);
    const result = await updateTask(task.id, patch);
    setSaving(false);
    if (result.success) {
      onUpdate();
      return;
    }
    if (rollback) onTaskPatch(rollback);
  };

  const commitTitle = () => {
    const nextTitle = draftTitle.trim();
    setIsEditingTitle(false);
    if (!nextTitle) {
      setDraftTitle(task.title);
      return;
    }
    if (nextTitle !== task.title) {
      void commitPatch({ title: nextTitle }, { title: task.title });
    }
  };

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'completed';
  const priority = (task.priority || 'medium') as TaskPriority;
  const projectOptions =
    task.project && !projects.some((project) => project.id === task.project?.id)
      ? [task.project, ...projects]
      : projects;

  return (
    <div
      className={cn(
        'group relative rounded-lg border border-l-2 border-gray-800 bg-[#1e1e1e] p-3 transition-colors hover:border-gray-700',
        priorityColors[priority] || priorityColors.medium,
        isOverdue && 'bg-red-500/5'
      )}
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest('[data-kanban-control]')) {
          return;
        }
        setIsEditingTitle(true);
      }}
    >
      <div className="flex items-start justify-between gap-2">
        {isEditingTitle ? (
          <input
            data-kanban-control
            ref={titleRef}
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitTitle();
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                setDraftTitle(task.title);
                setIsEditingTitle(false);
              }
            }}
            className="min-w-0 flex-1 rounded-md border border-blue-500/40 bg-[#111] px-2 py-1 text-sm font-medium text-white outline-none"
          />
        ) : (
          <button
            data-kanban-control
            type="button"
            onClick={() => setIsEditingTitle(true)}
            className={cn(
              'line-clamp-2 flex-1 rounded px-1 py-0.5 text-left text-sm font-medium text-white outline-none hover:bg-white/5 focus:ring-2 focus:ring-blue-500/30',
              task.status === 'completed' && 'text-gray-500 line-through'
            )}
          >
            {task.title}
          </button>
        )}

        <Button
          data-kanban-control
          size="icon"
          variant="ghost"
          onClick={handleDelete}
          className="h-6 w-6 text-gray-500 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:text-red-300"
        >
          <span className="sr-only">Excluir tarefa</span>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {task.tags?.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded bg-gray-800/50 px-1.5 py-0.5 text-xs text-gray-400"
          >
            #{tag}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
        <select
          data-kanban-control
          value={priority}
          onChange={(event) =>
            void commitPatch(
              { priority: event.target.value },
              { priority: task.priority }
            )
          }
          className="h-7 rounded-md border border-gray-800 bg-[#111] px-2 text-xs text-gray-300 outline-none focus:border-blue-500"
        >
          <option value="low">Baixa</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
          <option value="urgent">Urgente</option>
        </select>

        <label
          data-kanban-control
          className="inline-flex h-7 items-center gap-1 rounded-md border border-gray-800 bg-[#111] px-2"
        >
          <Calendar className="h-3.5 w-3.5" />
          <input
            type="date"
            value={toDateInputValue(task.dueDate)}
            onChange={(event) =>
              void commitPatch(
                {
                  dueDate: event.target.value
                    ? new Date(`${event.target.value}T00:00:00`)
                    : null,
                },
                { dueDate: task.dueDate ? new Date(task.dueDate) : null }
              )
            }
            className="w-[104px] bg-transparent text-xs text-gray-300 outline-none"
          />
        </label>

        <label
          data-kanban-control
          className="inline-flex h-7 items-center gap-1 rounded-md border border-gray-800 bg-[#111] px-2"
        >
          <input
            type="number"
            min="0"
            step="0.25"
            value={task.estimatedHours || 0}
            onChange={(event) =>
              void commitPatch(
                { estimatedHours: Number(event.target.value) || 0 },
                { estimatedHours: task.estimatedHours || 0 }
              )
            }
            className="w-10 bg-transparent text-xs text-gray-300 outline-none"
          />
          <span>h</span>
        </label>

        <label
          data-kanban-control
          className="inline-flex h-7 items-center gap-1 rounded-md border border-purple-500/20 bg-purple-500/10 px-2 text-purple-300"
        >
          <Briefcase className="h-3.5 w-3.5" />
          <select
            value={task.project?.id || task.projectId || ''}
            onChange={(event) => {
              const projectId = event.target.value || null;
              const project =
                projectOptions.find((item) => item.id === projectId) || null;

              void commitPatch(
                { projectId, project },
                {
                  projectId: task.project?.id || task.projectId || null,
                  project: task.project || null,
                }
              );
            }}
            className="max-w-[130px] bg-transparent text-xs text-purple-200 outline-none"
          >
            <option value="">Sem projeto</option>
            {projectOptions.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </label>

        {task.feature && (
          <span className="text-purple-300">{task.feature.name}</span>
        )}
        {isOverdue && (
          <span className="font-medium text-red-300">Atrasada</span>
        )}
        {saving && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />
        )}
      </div>
    </div>
  );
});
