// src/app/(admin)/tasks/_components/task-item/task-edit-inline.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { updateTask } from '@/app/actions/tasks';

interface TaskEditInlineProps {
  task: any;
  onCancel: () => void;
  onSuccess: () => void;
}

export function TaskEditInline({
  task,
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
    estimatedHours: task.estimatedHours || 0,
  });
  const [loading, setLoading] = useState(false);
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
      alert('O título é obrigatório');
      return;
    }

    setLoading(true);

    try {
      const result = await updateTask(task.id, {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        estimatedHours: formData.estimatedHours,
      });

      if (result.success) {
        onSuccess();
      } else {
        console.error('Failed to update task:', result.error);
        alert('Erro ao atualizar tarefa');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Erro ao atualizar tarefa');
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
          className="w-full rounded-lg border border-gray-700 bg-[#2a2a2a] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
          className="w-full resize-none rounded-lg border border-gray-700 bg-[#2a2a2a] px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Grid de campos secundários */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, status: e.target.value }))
            }
            className="w-full rounded-lg border border-gray-700 bg-[#2a2a2a] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="pending">📋 Pendente</option>
            <option value="in-progress">🔄 Em Andamento</option>
            <option value="completed">✅ Concluído</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">
            Prioridade
          </label>
          <select
            value={formData.priority}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, priority: e.target.value }))
            }
            className="w-full rounded-lg border border-gray-700 bg-[#2a2a2a] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="low">🔽 Baixa</option>
            <option value="medium">📌 Média</option>
            <option value="high">⚠️ Alta</option>
            <option value="urgent">🚨 Urgente</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">
            Data de Vencimento
          </label>
          <input
            type="date"
            value={formData.dueDate}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
            }
            className="w-full rounded-lg border border-gray-700 bg-[#2a2a2a] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">
            Horas Estimadas
          </label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={formData.estimatedHours}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                estimatedHours: parseFloat(e.target.value) || 0,
              }))
            }
            className="w-full rounded-lg border border-gray-700 bg-[#2a2a2a] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex items-center justify-between border-t border-gray-800 pt-2">
        <div className="text-xs text-gray-500">
          <kbd className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
            Esc
          </kbd>{' '}
          para cancelar •{' '}
          <kbd className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
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
