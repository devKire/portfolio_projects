// src/app/(admin)/tasks/_components/task-filters-bar.tsx
'use client';

import { memo, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TaskFilters } from '@/lib/task-service';

interface TaskFiltersBarProps {
  filters: TaskFilters;
  onFilterChange: (
    key: keyof TaskFilters,
    value: string | boolean | undefined
  ) => void;
  viewMode: 'list' | 'kanban';
  onViewModeChange: (mode: 'list' | 'kanban') => void;
  // CORRIGIDO: Aceitar null no RefObject
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export const TaskFiltersBar = memo(function TaskFiltersBar({
  filters,
  onFilterChange,
  viewMode,
  onViewModeChange,
  searchInputRef,
}: TaskFiltersBarProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);

  useEffect(() => {
    // Carregar projetos para o filtro
    import('@/app/actions/tasks').then(({ getProjects }) => {
      getProjects().then((result) => {
        if (result.success) setProjects(result.data || []);
      });
    });
  }, []);

  useEffect(() => {
    if (filters.projectId) {
      import('@/app/actions/tasks').then(({ getSprints }) => {
        getSprints(filters.projectId).then((result) => {
          if (result.success) setSprints(result.data || []);
        });
      });
    } else {
      setSprints([]);
    }
  }, [filters.projectId]);

  const quickFilters = [
    { label: 'Alta Prioridade', filter: { priority: 'high' } },
    { label: 'Urgentes', filter: { priority: 'urgent' } },
    { label: 'Vence Hoje', filter: { dueDateRange: 'today' } },
    { label: 'Atrasadas', filter: { dueDateRange: 'overdue' } },
    { label: 'Esta Semana', filter: { dueDateRange: 'week' } },
  ];

  return (
    <div className="space-y-4">
      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((qf) => (
          <Button
            key={qf.label}
            variant="secondary"
            size="sm"
            onClick={() => {
              // Reset other quick filters
              quickFilters.forEach((f) => {
                const key = Object.keys(f.filter)[0];
                onFilterChange(key as keyof TaskFilters, undefined);
              });
              // Apply this filter
              Object.entries(qf.filter).forEach(([key, value]) => {
                onFilterChange(key as keyof TaskFilters, value);
              });
            }}
            className="border border-gray-700 bg-[#1e1e1e] text-xs text-gray-400 transition-colors hover:border-gray-600 hover:text-white"
          >
            {qf.label}
          </Button>
        ))}
      </div>

      {/* Main Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-gray-500">
            🔍
          </span>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar tarefas... (Ctrl+K)"
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-[#1a1a1a] py-2 pr-4 pl-9 text-sm text-white placeholder-gray-500 transition-colors focus:border-blue-500 focus:outline-none"
          />
        </div>

        <select
          value={filters.status || ''}
          onChange={(e) =>
            onFilterChange('status', e.target.value || undefined)
          }
          className="rounded-lg border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">Todos os Status</option>
          <option value="pending">Pendente</option>
          <option value="in-progress">Em Andamento</option>
          <option value="completed">Concluído</option>
        </select>

        <select
          value={filters.priority || ''}
          onChange={(e) =>
            onFilterChange('priority', e.target.value || undefined)
          }
          className="rounded-lg border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">Todas Prioridades</option>
          <option value="low">Baixa</option>
          <option value="medium">Média</option>
          <option value="high">Alta</option>
          <option value="urgent">Urgente</option>
        </select>

        <select
          value={filters.projectId || ''}
          onChange={(e) =>
            onFilterChange('projectId', e.target.value || undefined)
          }
          className="rounded-lg border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">Todos os Projetos</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>

        {sprints.length > 0 && (
          <select
            value={filters.sprintId || ''}
            onChange={(e) =>
              onFilterChange('sprintId', e.target.value || undefined)
            }
            className="rounded-lg border border-gray-700 bg-[#1a1a1a] px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="">Todas as Sprints</option>
            {sprints.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name}
              </option>
            ))}
          </select>
        )}

        {/* View Mode Toggle */}
        <div className="flex overflow-hidden rounded-lg border border-gray-700">
          <button
            onClick={() => onViewModeChange('list')}
            className={`px-3 py-2 text-sm transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
            }`}
          >
            📋 Lista
          </button>
          <button
            onClick={() => onViewModeChange('kanban')}
            className={`px-3 py-2 text-sm transition-colors ${
              viewMode === 'kanban'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
            }`}
          >
            🎯 Kanban
          </button>
        </div>
      </div>
    </div>
  );
});
