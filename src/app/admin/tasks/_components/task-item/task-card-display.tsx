'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CheckCircle2,
  Circle,
  Clock3,
  Loader2,
  Pencil,
  Tag,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  TaskPatch,
  TaskPriority,
  TaskProjectOption,
  TaskWithRelations,
} from '@/types/tasks';

interface TaskCardDisplayProps {
  task: TaskWithRelations;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEditStart: () => void;
  onStatusChange: (status: string) => void;
  onPatch: (patch: TaskPatch) => Promise<void>;
  onOptimisticPatch: (patch: TaskPatch) => void;
  projects: TaskProjectOption[];
  onDelete: () => void;
  isDeleting: boolean;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const priorityLabels: Record<TaskPriority, string> = {
  low: 'Baixa',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

const priorityClasses: Record<TaskPriority, string> = {
  low: 'border-[#303036] bg-[#202024] text-[#9b9ba3]',
  medium: 'border-[#6f55d9]/25 bg-[#6f55d9]/10 text-[#c9b8ff]',
  high: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  urgent: 'border-red-500/30 bg-red-500/10 text-red-300',
};

function toDateInputValue(value?: Date | string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function formatDate(value?: Date | string | null) {
  if (!value) return 'Sem data';
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

function parseTags(value: string) {
  return value
    .split(/[,\s]+/)
    .map((tag) => tag.replace(/^#/, '').trim())
    .filter(Boolean);
}

export const TaskCardDisplay = memo(function TaskCardDisplay({
  task,
  isSelected,
  onToggleSelect,
  onEditStart,
  onStatusChange,
  onPatch,
  onOptimisticPatch,
  projects,
  onDelete,
  isDeleting,
}: TaskCardDisplayProps) {
  const [editingField, setEditingField] = useState<
    'title' | 'description' | 'tags' | null
  >(null);
  const [draftTitle, setDraftTitle] = useState(task.title);
  const [draftDescription, setDraftDescription] = useState(
    task.description || ''
  );
  const [draftTags, setDraftTags] = useState(task.tags.join(' '));
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const tagsRef = useRef<HTMLInputElement>(null);

  const isCompleted = task.status === 'completed';
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'completed';
  const isDueToday =
    task.dueDate &&
    new Date(task.dueDate).toDateString() === new Date().toDateString();
  const priority = (task.priority || 'medium') as TaskPriority;
  const projectOptions = useMemo(() => {
    if (
      !task.project ||
      projects.some((project) => project.id === task.project?.id)
    ) {
      return projects;
    }

    return [task.project, ...projects];
  }, [projects, task.project]);

  const completedSubtasks = useMemo(
    () =>
      task.subtasks?.filter((subtask) => subtask.status === 'completed')
        .length || 0,
    [task.subtasks]
  );

  useEffect(() => setDraftTitle(task.title), [task.title]);
  useEffect(
    () => setDraftDescription(task.description || ''),
    [task.description]
  );
  useEffect(() => setDraftTags(task.tags.join(' ')), [task.tags]);

  useEffect(() => {
    if (editingField === 'title') {
      titleRef.current?.focus();
      titleRef.current?.select();
    }
    if (editingField === 'description') {
      descriptionRef.current?.focus();
    }
    if (editingField === 'tags') {
      tagsRef.current?.focus();
      tagsRef.current?.select();
    }
  }, [editingField]);

  useEffect(() => {
    if (saveState !== 'saved') return;
    const timer = window.setTimeout(() => setSaveState('idle'), 1200);
    return () => window.clearTimeout(timer);
  }, [saveState]);

  const commitPatch = async (patch: TaskPatch, rollback?: TaskPatch) => {
    setSaveState('saving');
    try {
      await onPatch(patch);
      setSaveState('saved');
    } catch (error) {
      if (rollback) onOptimisticPatch(rollback);
      console.error('Inline task update failed:', error);
      setSaveState('error');
    }
  };

  const commitTitle = () => {
    const nextTitle = draftTitle.trim();
    if (!nextTitle) {
      setDraftTitle(task.title);
      setEditingField(null);
      return;
    }
    setEditingField(null);
    if (nextTitle !== task.title) {
      void commitPatch({ title: nextTitle }, { title: task.title });
    }
  };

  const commitDescription = () => {
    const nextDescription = draftDescription.trim();
    setEditingField(null);
    if (nextDescription !== (task.description || '')) {
      void commitPatch(
        { description: nextDescription },
        { description: task.description || '' }
      );
    }
  };

  const commitTags = () => {
    const nextTags = parseTags(draftTags);
    setEditingField(null);
    if (nextTags.join('|') !== task.tags.join('|')) {
      void commitPatch({ tags: nextTags }, { tags: task.tags });
    }
  };

  const handleSimpleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    commit: () => void,
    cancel: () => void
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  };

  return (
    <div
      className={cn(
        'group px-3 py-2 transition-colors',
        isOverdue && 'border-l-2 border-l-red-500 bg-red-500/5'
      )}
      onDoubleClick={(event) => {
        if ((event.target as HTMLElement).closest('[data-inline-control]')) {
          return;
        }
        setEditingField('title');
      }}
    >
      <div className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-start gap-2">
        <input
          data-inline-control
          aria-label={`Selecionar ${task.title}`}
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(task.id)}
          onClick={(event) => event.stopPropagation()}
          className="mt-2 h-4 w-4 cursor-pointer rounded border-[#303036] bg-[#2a2a2a] focus:ring-2 focus:ring-[#6f55d9]"
        />

        <button
          data-inline-control
          type="button"
          aria-label={isCompleted ? 'Reabrir tarefa' : 'Concluir tarefa'}
          onClick={(event) => {
            event.stopPropagation();
            onStatusChange(isCompleted ? 'pending' : 'completed');
          }}
          className="mt-1.5 rounded text-[#777780] transition-colors hover:text-green-300 focus:ring-2 focus:ring-green-500/50 focus:outline-none"
        >
          {isCompleted ? (
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </button>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {editingField === 'title' ? (
              <input
                data-inline-control
                ref={titleRef}
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                onBlur={commitTitle}
                onKeyDown={(event) =>
                  handleSimpleKeyDown(event, commitTitle, () => {
                    setDraftTitle(task.title);
                    setEditingField(null);
                  })
                }
                className="min-w-[220px] flex-1 rounded-md border border-[#6f55d9]/40 bg-[#111] px-2 py-1 text-sm font-medium text-white outline-none focus:ring-2 focus:ring-[#6f55d9]/30"
              />
            ) : (
              <button
                data-inline-control
                type="button"
                onClick={() => setEditingField('title')}
                className={cn(
                  'min-w-0 rounded px-1 py-0.5 text-left text-sm font-medium text-white transition-colors outline-none hover:bg-white/5 focus:ring-2 focus:ring-[#6f55d9]/40',
                  isCompleted && 'text-[#777780] line-through'
                )}
              >
                <span className="line-clamp-1">{task.title}</span>
              </button>
            )}

            {isOverdue && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-xs text-red-300">
                <AlertTriangle className="h-3 w-3" />
                Atrasada
              </span>
            )}
            {isDueToday && !isOverdue && (
              <span className="inline-flex items-center rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
                Hoje
              </span>
            )}
          </div>

          <div className="mt-1">
            {editingField === 'description' ? (
              <textarea
                data-inline-control
                ref={descriptionRef}
                value={draftDescription}
                rows={2}
                onChange={(event) => setDraftDescription(event.target.value)}
                onBlur={commitDescription}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setDraftDescription(task.description || '');
                    setEditingField(null);
                  }
                  if (
                    (event.ctrlKey || event.metaKey) &&
                    event.key === 'Enter'
                  ) {
                    event.preventDefault();
                    commitDescription();
                  }
                }}
                className="w-full resize-none rounded-md border border-[#303036] bg-[#111] px-2 py-1 text-sm text-[#f2f2f3] outline-none focus:border-[#6f55d9]/50"
              />
            ) : (
              <button
                data-inline-control
                type="button"
                onClick={() => setEditingField('description')}
                className="line-clamp-1 rounded px-1 py-0.5 text-left text-xs text-[#777780] transition-colors outline-none hover:bg-white/5 hover:text-[#dcddde] focus:ring-2 focus:ring-[#6f55d9]/30"
              >
                {task.description || 'Adicionar descricao'}
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <select
              data-inline-control
              aria-label="Status"
              value={task.status}
              onChange={(event) => onStatusChange(event.target.value)}
              className="h-7 cursor-pointer rounded-md border border-[#2f2f35] bg-[#111] px-2 text-xs text-[#dcddde] outline-none hover:border-[#303036] focus:border-[#6f55d9]"
            >
              <option value="pending">Pendente</option>
              <option value="in-progress">Em andamento</option>
              <option value="completed">Concluido</option>
            </select>

            <select
              data-inline-control
              aria-label="Prioridade"
              value={priority}
              onChange={(event) =>
                void commitPatch(
                  { priority: event.target.value },
                  { priority: task.priority }
                )
              }
              className={cn(
                'h-7 cursor-pointer rounded-md border px-2 text-xs outline-none focus:border-[#6f55d9]',
                priorityClasses[priority] || priorityClasses.medium
              )}
            >
              {Object.entries(priorityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <label
              data-inline-control
              className="inline-flex h-7 items-center gap-1 rounded-md border border-[#2f2f35] bg-[#111] px-2 text-[#9b9ba3] hover:border-[#303036]"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span className="sr-only">Data</span>
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
                    {
                      dueDate: task.dueDate ? new Date(task.dueDate) : null,
                    }
                  )
                }
                className="w-[116px] bg-transparent text-xs text-[#dcddde] outline-none"
              />
            </label>

            <label
              data-inline-control
              className="inline-flex h-7 items-center gap-1 rounded-md border border-[#2f2f35] bg-[#111] px-2 text-[#9b9ba3] hover:border-[#303036]"
            >
              <Clock3 className="h-3.5 w-3.5" />
              <span className="sr-only">Horas estimadas</span>
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
                className="w-12 bg-transparent text-xs text-[#dcddde] outline-none"
              />
              <span>h</span>
            </label>

            <label
              data-inline-control
              className="inline-flex h-7 items-center gap-1 rounded-md border border-[#2f2f35] bg-[#111] px-2 text-[#9b9ba3] hover:border-[#303036]"
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
                className="w-12 bg-transparent text-xs text-[#dcddde] outline-none"
              />
              <span>h</span>
            </label>

            {editingField === 'tags' ? (
              <input
                data-inline-control
                ref={tagsRef}
                value={draftTags}
                onChange={(event) => setDraftTags(event.target.value)}
                onBlur={commitTags}
                onKeyDown={(event) =>
                  handleSimpleKeyDown(event, commitTags, () => {
                    setDraftTags(task.tags.join(' '));
                    setEditingField(null);
                  })
                }
                className="h-7 min-w-[160px] rounded-md border border-[#303036] bg-[#111] px-2 text-xs text-[#f2f2f3] outline-none focus:border-[#6f55d9]/50"
              />
            ) : (
              <button
                data-inline-control
                type="button"
                onClick={() => setEditingField('tags')}
                className="inline-flex h-7 max-w-full items-center gap-1 rounded-md border border-[#2f2f35] bg-[#111] px-2 text-[#9b9ba3] outline-none hover:border-[#303036] hover:text-[#f2f2f3] focus:ring-2 focus:ring-[#6f55d9]/30"
              >
                <Tag className="h-3.5 w-3.5" />
                <span className="truncate">
                  {task.tags.length
                    ? task.tags.map((tag) => `#${tag}`).join(' ')
                    : 'tags'}
                </span>
              </button>
            )}

            {task.project && (
              <span className="sr-only">
                Projeto atual: {task.project.title}
              </span>
            )}

            <label
              data-inline-control
              className="inline-flex h-7 items-center gap-1 rounded-md border border-[#9a8cff]/20 bg-[#9a8cff]/10 px-2 text-[#c9b8ff] hover:border-[#c9b8ff]/40"
            >
              <Briefcase className="h-3.5 w-3.5" />
              <span className="sr-only">Projeto</span>
              <select
                value={task.project?.id || task.projectId || ''}
                onChange={(event) => {
                  const projectId = event.target.value || null;
                  const project =
                    projectOptions.find((item) => item.id === projectId) ||
                    null;

                  void commitPatch(
                    { projectId, project },
                    {
                      projectId: task.project?.id || task.projectId || null,
                      project: task.project || null,
                    }
                  );
                }}
                className="max-w-[170px] cursor-pointer bg-transparent text-xs text-purple-200 outline-none"
              >
                <option value="">Sem projeto</option>
                {projectOptions.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </label>

            {task.subtasks && task.subtasks.length > 0 && (
              <span className="inline-flex h-7 items-center rounded-md border border-[#2f2f35] bg-[#111] px-2 text-[#777780]">
                {completedSubtasks}/{task.subtasks.length} subtasks
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 pt-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <span
            className={cn(
              'min-w-12 text-right text-[11px]',
              saveState === 'error' ? 'text-red-300' : 'text-gray-600'
            )}
            aria-live="polite"
          >
            {saveState === 'saving' && (
              <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />
            )}
            {saveState === 'saved' && 'salvo'}
            {saveState === 'error' && 'erro'}
          </span>

          <Button
            data-inline-control
            size="icon"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              onEditStart();
            }}
            className="h-7 w-7 text-[#777780] hover:text-[#f2f2f3]"
            title="Abrir edicao completa"
          >
            <span className="sr-only">Abrir edicao completa</span>
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          <Button
            data-inline-control
            size="icon"
            variant="ghost"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            disabled={isDeleting}
            className="h-7 w-7 text-[#777780] hover:text-red-300"
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

      {(task.estimatedHours || 0) > 0 && (
        <div className="mt-2 ml-14 h-1 overflow-hidden rounded-full bg-[#19191d]">
          <div
            className="h-full rounded-full bg-[#6f55d9] transition-all duration-300"
            style={{
              width: `${Math.min(((task.actualHours || 0) / (task.estimatedHours || 1)) * 100, 100)}%`,
            }}
          />
        </div>
      )}

      <div className="sr-only">
        Data: {formatDate(task.dueDate)}. Prioridade: {priorityLabels[priority]}
        .
      </div>
    </div>
  );
});
