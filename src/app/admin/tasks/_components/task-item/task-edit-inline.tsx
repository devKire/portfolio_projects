// src/app/(admin)/tasks/_components/task-item/task-edit-inline.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { updateTask } from '@/app/actions/tasks';
import { parseTaskHoursInput } from '@/lib/task-quick-add-parser';
import type { TaskProjectOption, TaskWithRelations } from '@/types/tasks';
import { TaskTagsMenu } from '../task-tags-menu';

interface TaskEditInlineProps {
  task: TaskWithRelations;
  projects: TaskProjectOption[];
  availableTags: string[];
  onAvailableTagsChange: (tags: string[]) => void;
  onCancel: () => void;
  onSuccess: (task: TaskWithRelations) => void;
}

export function TaskEditInline({
  task,
  projects,
  availableTags,
  onAvailableTagsChange,
  onCancel,
  onSuccess,
}: TaskEditInlineProps) {
  const [formData, setFormData] = useState({
    title: task.title || '',
    description: task.description || '',
    status: task.status || 'pending',
    priority: task.priority || 'medium',
    dueDate: task.dueDate
      ? new Date(task.dueDate).toISOString().split('T')[0]
      : '',
    estimatedHours:
      task.estimatedHours === null || task.estimatedHours === undefined
        ? ''
        : String(task.estimatedHours),
    actualHours:
      task.actualHours === null || task.actualHours === undefined
        ? ''
        : String(task.actualHours),
    tags: task.tags || [],
    projectId: task.project?.id || task.projectId || '',
  });
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus no input de título
    inputRef.current?.focus();

    // Seleciona o texto para edição rápida
    inputRef.current?.select();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setFormError('O titulo e obrigatorio.');
      return;
    }

    const hasEstimatedHours = Boolean(formData.estimatedHours.trim());
    const hasActualHours = Boolean(formData.actualHours.trim());
    const parsedEstimatedHours = hasEstimatedHours
      ? parseTaskHoursInput(formData.estimatedHours)
      : null;
    const parsedActualHours = hasActualHours
      ? parseTaskHoursInput(formData.actualHours)
      : null;

    if (
      (hasEstimatedHours &&
        (typeof parsedEstimatedHours !== 'number' ||
          !Number.isFinite(parsedEstimatedHours) ||
          parsedEstimatedHours < 0)) ||
      (hasActualHours &&
        (typeof parsedActualHours !== 'number' ||
          !Number.isFinite(parsedActualHours) ||
          parsedActualHours < 0))
    ) {
      setFormError('Informe horas validas e nao negativas.');
      return;
    }

    const estimatedHours = parsedEstimatedHours ?? null;
    const actualHours = parsedActualHours ?? null;

    setFormError('');
    setLoading(true);

    try {
      const result = await updateTask(task.id, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        estimatedHours,
        actualHours,
        tags: formData.tags,
        projectId: formData.projectId || null,
      });

      if (result.success && result.data) {
        onAvailableTagsChange(formData.tags);
        onSuccess(result.data as TaskWithRelations);
      } else {
        console.error('Failed to update task:', result.error);
        setFormError(result.error || 'Erro ao atualizar tarefa.');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      setFormError('Erro ao atualizar tarefa.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
    // Ctrl+Enter para salvar
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {/* Campo de título (principal) */}
      <div>
        <input
          ref={inputRef}
          type="text"
          value={formData.title}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, title: e.target.value }))
          }
          onKeyDown={handleKeyDown}
          placeholder="Título da tarefa"
          className="w-full rounded-lg border border-[#303036] bg-[#2a2a2a] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#6f55d9] focus:ring-1 focus:ring-[#6f55d9] focus:outline-none"
          required
        />
      </div>

      {/* Campo de descrição */}
      <div>
        <textarea
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
            }
          }}
          placeholder="Descrição (opcional)"
          rows={3}
          className="w-full resize-none rounded-lg border border-[#303036] bg-[#2a2a2a] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-[#6f55d9] focus:ring-1 focus:ring-[#6f55d9] focus:outline-none"
        />
      </div>

      {/* Grid de campos secundários */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-[#9b9ba3]">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, status: e.target.value }))
            }
            className="w-full rounded-lg border border-[#303036] bg-[#2a2a2a] px-3 py-2 text-sm text-white focus:border-[#6f55d9] focus:outline-none"
          >
            <option value="pending">📋 Pendente</option>
            <option value="in-progress">🔄 Em Andamento</option>
            <option value="completed">✅ Concluído</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#9b9ba3]">
            Prioridade
          </label>
          <select
            value={formData.priority}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, priority: e.target.value }))
            }
            className="w-full rounded-lg border border-[#303036] bg-[#2a2a2a] px-3 py-2 text-sm text-white focus:border-[#6f55d9] focus:outline-none"
          >
            <option value="low">🔽 Baixa</option>
            <option value="medium">📌 Média</option>
            <option value="high">⚠️ Alta</option>
            <option value="urgent">🚨 Urgente</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#9b9ba3]">
            Data de Vencimento
          </label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
            }
            className="w-full rounded-lg border border-[#303036] bg-[#2a2a2a] px-3 py-2 text-sm text-white focus:border-[#6f55d9] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#9b9ba3]">
            Horas Estimadas
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={formData.estimatedHours}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                estimatedHours: e.target.value,
              }))
            }
            placeholder="2h ou 30min"
            className="w-full rounded-lg border border-[#303036] bg-[#2a2a2a] px-3 py-2 text-sm text-white focus:border-[#6f55d9] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#9b9ba3]">
            Horas Reais
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={formData.actualHours}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                actualHours: e.target.value,
              }))
            }
            placeholder="1.5h ou 30min"
            className="w-full rounded-lg border border-[#303036] bg-[#2a2a2a] px-3 py-2 text-sm text-white focus:border-[#6f55d9] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#9b9ba3]">
            Projeto
          </label>
          <select
            value={formData.projectId}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, projectId: e.target.value }))
            }
            className="w-full rounded-lg border border-[#303036] bg-[#2a2a2a] px-3 py-2 text-sm text-white focus:border-[#6f55d9] focus:outline-none"
          >
            <option value="">Sem projeto</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-[#9b9ba3]">
            Tags
          </label>
          <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-[#303036] bg-[#2a2a2a] px-2 py-1.5">
            {formData.tags.length > 0 ? (
              formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-[#24242a] px-1.5 py-0.5 text-xs text-[#b8a9ff]"
                >
                  #{tag}
                </span>
              ))
            ) : (
              <span className="text-xs text-[#777780]">Sem tags</span>
            )}
            <TaskTagsMenu
              tags={formData.tags}
              availableTags={availableTags}
              onChange={async (tags) => {
                setFormData((current) => ({ ...current, tags }));
                return true;
              }}
              onAvailableTagsChange={onAvailableTagsChange}
            />
          </div>
        </div>
      </div>

      {formError && (
        <p className="text-sm text-red-300" role="alert">
          {formError}
        </p>
      )}

      {/* Botões de ação */}
      <div className="flex items-center justify-between border-t border-[#2f2f35] pt-2">
        <div className="text-xs text-[#777780]">
          <kbd className="rounded bg-[#24242a] px-1.5 py-0.5 font-mono text-[10px] text-[#9b9ba3]">
            Esc
          </kbd>{' '}
          para cancelar •{' '}
          <kbd className="rounded bg-[#24242a] px-1.5 py-0.5 font-mono text-[10px] text-[#9b9ba3]">
            Ctrl+Enter
          </kbd>{' '}
          para salvar
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={loading}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={loading || !formData.title.trim()}
            className="text-xs"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </form>
  );
}
