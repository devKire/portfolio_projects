// src/app/(admin)/tasks/_components/task-filters-bar.tsx
'use client';

import { memo, useEffect, useState } from 'react';
import { KanbanSquare, ListChecks, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskFilters } from '@/lib/task-service';
import type { TaskProjectOption } from '@/types/tasks';

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
  projects: TaskProjectOption[];
  tags: string[];
}

export const TaskFiltersBar = memo(function TaskFiltersBar({
  filters,
  onFilterChange,
  viewMode,
  onViewModeChange,
  searchInputRef,
  projects,
  tags,
}: TaskFiltersBarProps) {
  const [sprints, setSprints] = useState<any[]>([]);

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
            className="rounded-md border border-[#303036] bg-[#202024] text-xs text-[#9b9ba3] transition-colors hover:border-[#33333a] hover:bg-[#24242a] hover:text-white"
          >
            {qf.label}
          </Button>
        ))}
      </div>

      {/* Main Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#777780]" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar tarefas... (Ctrl+K)"
            value={filters.search || ''}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="h-10 w-full rounded-md border border-[#303036] bg-[#19191d] pr-3 pl-9 text-sm text-white transition-colors outline-none placeholder:text-[#777780] focus:border-[#6f55d9]"
          />
        </div>

        <select
          value={filters.status || ''}
          onChange={(e) =>
            onFilterChange('status', e.target.value || undefined)
          }
          className="h-10 rounded-md border border-[#303036] bg-[#19191d] px-3 text-sm text-white outline-none focus:border-[#6f55d9]"
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
          className="h-10 rounded-md border border-[#303036] bg-[#19191d] px-3 text-sm text-white outline-none focus:border-[#6f55d9]"
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
          className="h-10 rounded-md border border-[#303036] bg-[#19191d] px-3 text-sm text-white outline-none focus:border-[#6f55d9]"
        >
          <option value="">Todos os Projetos</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>

        <select
          value={filters.tag || ''}
          onChange={(e) => onFilterChange('tag', e.target.value || undefined)}
          className="h-10 rounded-md border border-[#303036] bg-[#19191d] px-3 text-sm text-white outline-none focus:border-[#6f55d9]"
        >
          <option value="">Todas Tags</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              #{tag}
            </option>
          ))}
        </select>

        {sprints.length > 0 && (
          <select
            value={filters.sprintId || ''}
            onChange={(e) =>
              onFilterChange('sprintId', e.target.value || undefined)
            }
            className="h-10 rounded-md border border-[#303036] bg-[#19191d] px-3 text-sm text-white outline-none focus:border-[#6f55d9]"
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
        <div className="flex overflow-hidden rounded-md border border-[#303036]">
          <button
            onClick={() => onViewModeChange('list')}
            className={`px-3 py-2 text-sm transition-colors ${
              viewMode === 'list'
                ? 'bg-[#2d2940] text-[#c9b8ff]'
                : 'bg-[#19191d] text-[#9b9ba3] hover:bg-[#24242a] hover:text-white'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5" />
              Lista
            </span>
          </button>
          <button
            onClick={() => onViewModeChange('kanban')}
            className={`px-3 py-2 text-sm transition-colors ${
              viewMode === 'kanban'
                ? 'bg-[#2d2940] text-[#c9b8ff]'
                : 'bg-[#19191d] text-[#9b9ba3] hover:bg-[#24242a] hover:text-white'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <KanbanSquare className="h-3.5 w-3.5" />
              Kanban
            </span>
          </button>
        </div>
      </div>
    </div>
  );
});
