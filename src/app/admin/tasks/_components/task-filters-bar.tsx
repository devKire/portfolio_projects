'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Hash,
  KanbanSquare,
  ListChecks,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskFilters } from '@/lib/task-service';
import type { TaskProjectOption } from '@/types/tasks';

type FilterValue = string | string[] | boolean | undefined;

interface TaskFiltersBarProps {
  filters: TaskFilters;
  onFilterChange: (key: keyof TaskFilters, value: FilterValue) => void;
  onClearFilters: () => void;
  viewMode: 'list' | 'kanban';
  onViewModeChange: (mode: 'list' | 'kanban') => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  projects: TaskProjectOption[];
  tags: string[];
}

type FilterOption = {
  value: string;
  label: string;
};

const statusOptions: FilterOption[] = [
  { value: 'pending', label: 'Pendente' },
  { value: 'in-progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluido' },
];

const priorityOptions: FilterOption[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Media' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

function getSelectedValues(single?: string, multiple?: string[]) {
  return multiple && multiple.length > 0 ? multiple : single ? [single] : [];
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function MultiSelectFilter({
  label,
  options,
  values,
  onChange,
  searchable = false,
  emptyLabel = 'Nenhuma opcao',
}: {
  label: string;
  options: FilterOption[];
  values: string[];
  onChange: (values: string[]) => void;
  searchable?: boolean;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = new Set(values);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex h-10 min-w-[128px] items-center justify-between gap-2 rounded-md border px-3 text-sm transition-colors outline-none ${
          values.length
            ? 'border-[#6f55d9]/40 bg-[#2d2940] text-[#c9b8ff]'
            : 'border-[#303036] bg-[#19191d] text-[#9b9ba3] hover:border-[#33333a] hover:text-white'
        }`}
      >
        <span className="truncate">
          {label}
          {values.length > 0 && (
            <span className="ml-1 text-xs opacity-80">({values.length})</span>
          )}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0" />
      </button>

      {open && (
        <div
          data-keyboard-scope="menu"
          className="absolute top-full left-0 z-40 mt-1 w-60 rounded-md border border-[#34343c] bg-[#1b1b1f] p-1 text-xs text-[#dcddde] shadow-2xl"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
            }
          }}
        >
          {searchable && (
            <div className="p-1">
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Pesquisar..."
                className="h-8 w-full rounded border border-[#303036] bg-[#111] px-2 text-xs text-white outline-none placeholder:text-[#777780] focus:border-[#6f55d9]"
              />
            </div>
          )}

          <div className="max-h-64 overflow-y-auto p-1">
            {filteredOptions.length === 0 && (
              <div className="px-2 py-2 text-[#777780]">{emptyLabel}</div>
            )}

            {filteredOptions.map((option) => {
              const checked = selected.has(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={checked}
                  onClick={() => onChange(toggleValue(values, option.value))}
                  className={`flex h-8 w-full items-center gap-2 rounded px-2 text-left outline-none ${
                    checked
                      ? 'bg-[#2d2940] text-[#c9b8ff]'
                      : 'text-[#c9c9d1] hover:bg-[#2a2a30] hover:text-white focus:bg-[#2a2a30] focus:text-white'
                  }`}
                >
                  <Check
                    className={`h-3.5 w-3.5 shrink-0 ${
                      checked ? 'text-[#b8a9ff]' : 'text-transparent'
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export const TaskFiltersBar = memo(function TaskFiltersBar({
  filters,
  onFilterChange,
  onClearFilters,
  viewMode,
  onViewModeChange,
  searchInputRef,
  projects,
  tags,
}: TaskFiltersBarProps) {
  const [sprints, setSprints] = useState<any[]>([]);

  const selectedStatuses = useMemo(
    () => getSelectedValues(filters.status, filters.statuses),
    [filters.status, filters.statuses]
  );
  const selectedPriorities = useMemo(
    () => getSelectedValues(filters.priority, filters.priorities),
    [filters.priority, filters.priorities]
  );
  const selectedProjects = useMemo(
    () => getSelectedValues(filters.projectId, filters.projectIds),
    [filters.projectId, filters.projectIds]
  );
  const selectedTags = useMemo(
    () => getSelectedValues(filters.tag, filters.tags),
    [filters.tag, filters.tags]
  );

  useEffect(() => {
    if (selectedProjects.length === 1) {
      import('@/app/actions/tasks').then(({ getSprints }) => {
        getSprints(selectedProjects[0]).then((result) => {
          if (result.success) setSprints(result.data || []);
        });
      });
    } else {
      setSprints([]);
    }
  }, [selectedProjects]);

  const projectOptions = useMemo(
    () =>
      projects.map((project) => ({
        value: project.id,
        label: project.title,
      })),
    [projects]
  );

  const tagOptions = useMemo(
    () => tags.map((tag) => ({ value: tag, label: `#${tag}` })),
    [tags]
  );

  const activeFilters = useMemo(() => {
    let count = 0;
    if (filters.search?.trim()) count += 1;
    count += selectedStatuses.length;
    count += selectedPriorities.length;
    count += selectedProjects.length;
    count += selectedTags.length;
    if (filters.sprintId) count += 1;
    if (filters.dueDateRange) count += 1;
    if (filters.dueDateFrom || filters.dueDateTo) count += 1;
    if (filters.withoutProject) count += 1;
    if (filters.withoutTags) count += 1;
    return count;
  }, [
    filters.dueDateFrom,
    filters.dueDateRange,
    filters.dueDateTo,
    filters.search,
    filters.sprintId,
    filters.withoutProject,
    filters.withoutTags,
    selectedPriorities.length,
    selectedProjects.length,
    selectedStatuses.length,
    selectedTags.length,
  ]);

  const quickFilters = [
    { label: 'Alta Prioridade', key: 'high', type: 'priority' },
    { label: 'Urgentes', key: 'urgent', type: 'priority' },
    { label: 'Vence Hoje', key: 'today', type: 'date' },
    { label: 'Atrasadas', key: 'overdue', type: 'date' },
    { label: 'Esta Semana', key: 'week', type: 'date' },
  ] as const;

  const clearDueDateInterval = () => {
    onFilterChange('dueDateFrom', undefined);
    onFilterChange('dueDateTo', undefined);
  };

  const renderChip = (
    key: string,
    label: string,
    onRemove: () => void,
    icon?: React.ReactNode
  ) => (
    <span
      key={key}
      className="inline-flex h-7 items-center gap-1 rounded-md border border-[#303036] bg-[#19191d] px-2 text-xs text-[#c9c9d1]"
    >
      {icon}
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="rounded text-[#777780] outline-none hover:text-white focus:text-white"
        aria-label={`Remover filtro ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {quickFilters.map((quickFilter) => {
          const active =
            quickFilter.type === 'priority'
              ? selectedPriorities.includes(quickFilter.key)
              : filters.dueDateRange === quickFilter.key;

          return (
            <Button
              key={quickFilter.label}
              variant="secondary"
              size="sm"
              onClick={() => {
                if (quickFilter.type === 'priority') {
                  onFilterChange(
                    'priorities',
                    toggleValue(selectedPriorities, quickFilter.key)
                  );
                  onFilterChange('priority', undefined);
                  return;
                }

                clearDueDateInterval();
                onFilterChange(
                  'dueDateRange',
                  active ? undefined : quickFilter.key
                );
              }}
              className={`rounded-md border text-xs transition-colors ${
                active
                  ? 'border-[#6f55d9]/40 bg-[#2d2940] text-[#c9b8ff]'
                  : 'border-[#303036] bg-[#202024] text-[#9b9ba3] hover:border-[#33333a] hover:bg-[#24242a] hover:text-white'
              }`}
            >
              {quickFilter.label}
            </Button>
          );
        })}

        {activeFilters > 0 && (
          <div className="ml-auto flex items-center gap-2 text-xs text-[#777780]">
            <span>{activeFilters} filtros</span>
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-md border border-[#303036] px-2 py-1 text-[#9b9ba3] transition-colors outline-none hover:border-[#6f55d9]/40 hover:text-white focus:border-[#6f55d9]/50"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative min-w-[220px] flex-1">
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

        <div className="flex flex-wrap gap-2">
          <MultiSelectFilter
            label="Status"
            options={statusOptions}
            values={selectedStatuses}
            onChange={(values) => {
              onFilterChange('statuses', values);
              onFilterChange('status', undefined);
            }}
          />
          <MultiSelectFilter
            label="Prioridade"
            options={priorityOptions}
            values={selectedPriorities}
            onChange={(values) => {
              onFilterChange('priorities', values);
              onFilterChange('priority', undefined);
            }}
          />
          <MultiSelectFilter
            label="Projetos"
            options={projectOptions}
            values={selectedProjects}
            searchable={projects.length > 6}
            emptyLabel="Nenhum projeto"
            onChange={(values) => {
              onFilterChange('projectIds', values);
              onFilterChange('projectId', undefined);
            }}
          />
          <MultiSelectFilter
            label="Tags"
            options={tagOptions}
            values={selectedTags}
            searchable={tags.length > 6}
            emptyLabel="Nenhuma tag"
            onChange={(values) => {
              onFilterChange('tags', values);
              onFilterChange('tag', undefined);
            }}
          />

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

      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-8 items-center gap-2 rounded-md border border-[#303036] bg-[#19191d] px-2 text-xs text-[#9b9ba3]">
          <span>De</span>
          <input
            type="date"
            value={filters.dueDateFrom || ''}
            onChange={(event) => {
              onFilterChange('dueDateRange', undefined);
              onFilterChange('dueDateFrom', event.target.value || undefined);
            }}
            className="bg-transparent text-[#dcddde] outline-none"
          />
        </label>
        <label className="inline-flex h-8 items-center gap-2 rounded-md border border-[#303036] bg-[#19191d] px-2 text-xs text-[#9b9ba3]">
          <span>Ate</span>
          <input
            type="date"
            value={filters.dueDateTo || ''}
            onChange={(event) => {
              onFilterChange('dueDateRange', undefined);
              onFilterChange('dueDateTo', event.target.value || undefined);
            }}
            className="bg-transparent text-[#dcddde] outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() =>
            onFilterChange('withoutProject', !filters.withoutProject)
          }
          className={`h-8 rounded-md border px-2 text-xs transition-colors outline-none ${
            filters.withoutProject
              ? 'border-[#6f55d9]/40 bg-[#2d2940] text-[#c9b8ff]'
              : 'border-[#303036] bg-[#19191d] text-[#9b9ba3] hover:text-white'
          }`}
        >
          Sem projeto
        </button>
        <button
          type="button"
          onClick={() => onFilterChange('withoutTags', !filters.withoutTags)}
          className={`h-8 rounded-md border px-2 text-xs transition-colors outline-none ${
            filters.withoutTags
              ? 'border-[#6f55d9]/40 bg-[#2d2940] text-[#c9b8ff]'
              : 'border-[#303036] bg-[#19191d] text-[#9b9ba3] hover:text-white'
          }`}
        >
          Sem tag
        </button>

        {selectedTags.length > 1 && (
          <div className="flex overflow-hidden rounded-md border border-[#303036] text-xs">
            <button
              type="button"
              onClick={() => onFilterChange('tagMatchMode', 'any')}
              className={`h-8 px-2 ${
                filters.tagMatchMode !== 'all'
                  ? 'bg-[#2d2940] text-[#c9b8ff]'
                  : 'bg-[#19191d] text-[#9b9ba3] hover:text-white'
              }`}
            >
              Qualquer tag
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('tagMatchMode', 'all')}
              className={`h-8 px-2 ${
                filters.tagMatchMode === 'all'
                  ? 'bg-[#2d2940] text-[#c9b8ff]'
                  : 'bg-[#19191d] text-[#9b9ba3] hover:text-white'
              }`}
            >
              Todas
            </button>
          </div>
        )}
      </div>

      {activeFilters > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedStatuses.map((status) =>
            renderChip(
              `status-${status}`,
              statusOptions.find((option) => option.value === status)?.label ||
                status,
              () =>
                onFilterChange(
                  'statuses',
                  selectedStatuses.filter((item) => item !== status)
                )
            )
          )}
          {selectedPriorities.map((priority) =>
            renderChip(
              `priority-${priority}`,
              priorityOptions.find((option) => option.value === priority)
                ?.label || priority,
              () =>
                onFilterChange(
                  'priorities',
                  selectedPriorities.filter((item) => item !== priority)
                )
            )
          )}
          {selectedProjects.map((projectId) =>
            renderChip(
              `project-${projectId}`,
              projects.find((project) => project.id === projectId)?.title ||
                'Projeto',
              () =>
                onFilterChange(
                  'projectIds',
                  selectedProjects.filter((item) => item !== projectId)
                )
            )
          )}
          {selectedTags.map((tag) =>
            renderChip(
              `tag-${tag}`,
              `#${tag}`,
              () =>
                onFilterChange(
                  'tags',
                  selectedTags.filter((item) => item !== tag)
                ),
              <Hash className="h-3 w-3 text-[#777780]" />
            )
          )}
          {filters.sprintId &&
            renderChip('sprint', 'Sprint', () =>
              onFilterChange('sprintId', undefined)
            )}
          {filters.dueDateRange &&
            renderChip(
              'due-date-range',
              filters.dueDateRange === 'today'
                ? 'Vence hoje'
                : filters.dueDateRange === 'overdue'
                  ? 'Atrasadas'
                  : 'Esta semana',
              () => onFilterChange('dueDateRange', undefined)
            )}
          {(filters.dueDateFrom || filters.dueDateTo) &&
            renderChip(
              'due-date-interval',
              `${filters.dueDateFrom || '...'} -> ${filters.dueDateTo || '...'}`,
              () => {
                onFilterChange('dueDateFrom', undefined);
                onFilterChange('dueDateTo', undefined);
              }
            )}
          {filters.withoutProject &&
            renderChip('without-project', 'Sem projeto', () =>
              onFilterChange('withoutProject', undefined)
            )}
          {filters.withoutTags &&
            renderChip('without-tags', 'Sem tag', () =>
              onFilterChange('withoutTags', undefined)
            )}
        </div>
      )}
    </div>
  );
});
