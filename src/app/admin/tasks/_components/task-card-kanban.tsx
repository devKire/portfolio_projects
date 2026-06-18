'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { Briefcase, Calendar, Copy, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateTask } from '@/app/actions/tasks';
import { cn } from '@/lib/utils';
import { haveSameTaskTags } from '@/lib/task-tags';
import { TaskTagsMenu } from './task-tags-menu';
import { copyTaskAsQuickAdd } from '@/lib/copy-task-quick-add';
import { toast } from 'sonner';
import type {
  TaskPatch,
  TaskPriority,
  TaskProjectOption,
  TaskWithRelations,
} from '@/types/tasks';

interface TaskCardProps {
  task: TaskWithRelations;
  onTaskPatch: (patch: TaskPatch) => void;
  onDeleteTasks: (ids: string[]) => Promise<void>;
  isDeleting: boolean;
  projects: TaskProjectOption[];
  availableTags: string[];
  onAvailableTagsChange: (tags: string[]) => void;
}

const priorityColors: Record<TaskPriority, string> = {
  low: 'border-l-gray-500',
  medium: 'border-l-[#6f55d9]',
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
  onTaskPatch,
  onDeleteTasks,
  isDeleting,
  projects,
  availableTags,
  onAvailableTagsChange,
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
      await onDeleteTasks([task.id]);
    }
  };

  const handleCopy = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await copyTaskAsQuickAdd(task);
      toast.success('Task copiada');
    } catch (error) {
      console.error('Failed to copy task:', error);
      toast.error('Erro ao copiar');
    }
  };

  const commitPatch = async (patch: TaskPatch, rollback?: TaskPatch) => {
    onTaskPatch(patch);
    setSaving(true);
    try {
      const result = await updateTask(task.id, patch);
      if (result.success) {
        if (result.data) onTaskPatch(result.data as TaskPatch);
        return true;
      }
      if (rollback) onTaskPatch(rollback);
      return false;
    } catch (error) {
      if (rollback) onTaskPatch(rollback);
      console.error('Kanban task update failed:', error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleTagsChange = async (nextTags: string[]) => {
    if (haveSameTaskTags(nextTags, task.tags)) return true;
    const success = await commitPatch({ tags: nextTags }, { tags: task.tags });
    if (success) onAvailableTagsChange(nextTags);
    return success;
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
        'group relative rounded-lg border border-l-2 border-[#2f2f35] bg-[#1e1e1e] p-3 transition-colors hover:border-[#303036]',
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
            className="min-w-0 flex-1 rounded-md border border-[#6f55d9]/40 bg-[#111] px-2 py-1 text-sm font-medium text-white outline-none"
          />
        ) : (
          <button
            data-kanban-control
            type="button"
            onClick={() => setIsEditingTitle(true)}
            className={cn(
              'line-clamp-2 flex-1 rounded px-1 py-0.5 text-left text-sm font-medium text-white outline-none hover:bg-white/5 focus:ring-2 focus:ring-[#6f55d9]/30',
              task.status === 'completed' && 'text-[#777780] line-through'
            )}
          >
            {task.title}
          </button>
        )}

        <div className="flex items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <Button
            data-kanban-control
            size="icon"
            variant="ghost"
            onClick={handleCopy}
            className="h-6 w-6 text-[#777780] hover:text-[#f2f2f3]"
            title="Copiar no formato Quick Add"
            aria-label="Copiar tarefa no formato Quick Add"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            data-kanban-control
            size="icon"
            variant="ghost"
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-6 w-6 text-[#777780] hover:text-red-300"
            title="Excluir tarefa"
          >
            <span className="sr-only">Excluir tarefa</span>
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      <div
        data-kanban-control
        className="mt-2 flex flex-wrap items-center gap-1"
      >
        {task.tags?.length ? (
          task.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded bg-[#24242a] px-1.5 py-0.5 text-xs text-[#9b9ba3]"
            >
              #{tag}
            </span>
          ))
        ) : (
          <span className="text-xs text-[#777780]">sem tag</span>
        )}
        <TaskTagsMenu
          tags={task.tags || []}
          availableTags={availableTags}
          controlAttribute="data-kanban-control"
          onChange={handleTagsChange}
          onAvailableTagsChange={onAvailableTagsChange}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-[#777780]">
        <select
          data-kanban-control
          value={priority}
          onChange={(event) =>
            void commitPatch(
              { priority: event.target.value },
              { priority: task.priority }
            )
          }
          className="h-7 rounded-md border border-[#2f2f35] bg-[#111] px-2 text-xs text-[#dcddde] outline-none focus:border-[#6f55d9]"
        >
          <option value="low">Baixa</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
          <option value="urgent">Urgente</option>
        </select>

        <label
          data-kanban-control
          className="inline-flex h-7 items-center gap-1 rounded-md border border-[#2f2f35] bg-[#111] px-2"
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
            className="w-[104px] bg-transparent text-xs text-[#dcddde] outline-none"
          />
        </label>

        <label
          data-kanban-control
          className="inline-flex h-7 items-center gap-1 rounded-md border border-[#2f2f35] bg-[#111] px-2"
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
            className="w-10 bg-transparent text-xs text-[#dcddde] outline-none"
          />
          <span>h</span>
        </label>

        <label
          data-kanban-control
          className="inline-flex h-7 items-center gap-1 rounded-md border border-[#2f2f35] bg-[#111] px-2"
        >
          <span className="text-[10px] font-medium">real</span>
          <input
            type="number"
            min="0"
            step="0.25"
            value={task.actualHours || 0}
            onChange={(event) =>
              void commitPatch(
                { actualHours: Number(event.target.value) || 0 },
                { actualHours: task.actualHours || 0 }
              )
            }
            className="w-10 bg-transparent text-xs text-[#dcddde] outline-none"
          />
          <span>h</span>
        </label>

        <label
          data-kanban-control
          className="inline-flex h-7 items-center gap-1 rounded-md border border-[#9a8cff]/20 bg-[#9a8cff]/10 px-2 text-[#c9b8ff]"
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
          <span className="text-[#c9b8ff]">{task.feature.name}</span>
        )}
        {isOverdue && (
          <span className="font-medium text-red-300">Atrasada</span>
        )}
        {saving && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[#777780]" />
        )}
      </div>
    </div>
  );
});
