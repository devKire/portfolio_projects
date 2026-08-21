'use client';

import {
  CalendarDays,
  FilterX,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useState } from 'react';

import type {
  DashboardFilters,
  OperationalDashboardData,
} from '@/types/dashboard';

const fieldClass =
  'h-10 min-w-0 rounded-lg border border-[#303036] bg-[#111114] px-3 text-sm text-white outline-none transition focus:border-[#6f55d9] focus:ring-2 focus:ring-[#6f55d9]/20 disabled:cursor-not-allowed disabled:opacity-50';

const statusOptions: Record<
  DashboardFilters['type'],
  Array<[string, string]>
> = {
  ALL: [
    ['BACKLOG', 'Aberto / Pendente'],
    ['IN_PROGRESS', 'Em andamento'],
    ['WAITING', 'Aguardando'],
    ['DONE', 'Concluído / Resolvido'],
    ['CLOSED', 'Fechado'],
    ['DRAFT', 'Notas: rascunho'],
    ['PUBLISHED', 'Notas: publicada'],
    ['ARCHIVED', 'Notas: arquivada'],
  ],
  TASK: [
    ['pending', 'Pendente'],
    ['in-progress', 'Em andamento'],
    ['completed', 'Concluída'],
  ],
  TICKET: [
    ['OPEN', 'Aberto'],
    ['IN_PROGRESS', 'Em andamento'],
    ['WAITING', 'Aguardando'],
    ['RESOLVED', 'Resolvido'],
    ['CLOSED', 'Fechado'],
  ],
  NOTE: [
    ['DRAFT', 'Rascunho'],
    ['PUBLISHED', 'Publicada'],
    ['ARCHIVED', 'Arquivada'],
  ],
};

export function DashboardFiltersBar({
  filters,
  options,
  hasOrganization,
  refreshing,
  onChange,
  onReset,
  onRefresh,
}: {
  filters: DashboardFilters;
  options: OperationalDashboardData['options'];
  hasOrganization: boolean;
  refreshing: boolean;
  onChange: (patch: Partial<DashboardFilters>) => void;
  onReset: () => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isNotes = filters.type === 'NOTE';
  const isTickets = filters.type === 'TICKET';
  const isTasks = filters.type === 'TASK';
  const showOrganizationFilters =
    hasOrganization && filters.scope !== 'personal';

  const changeScope = (scope: DashboardFilters['scope']) => {
    onChange({
      scope,
      ...(scope === 'personal' && filters.type === 'TICKET'
        ? { type: 'ALL' as const, status: undefined }
        : {}),
      ...(scope === 'personal'
        ? {
            assigneeId: undefined,
            teamId: undefined,
            queueId: undefined,
          }
        : {}),
    });
  };

  const changeType = (type: DashboardFilters['type']) => {
    onChange({
      type,
      status: undefined,
      ...(type === 'NOTE'
        ? {
            priority: undefined,
            assigneeId: undefined,
            teamId: undefined,
            queueId: undefined,
            projectId: undefined,
          }
        : {}),
      ...(type === 'TICKET' ? { projectId: undefined } : {}),
      ...(type === 'TASK' ? { queueId: undefined } : {}),
    });
  };

  return (
    <section
      aria-label="Filtros do dashboard"
      className="rounded-2xl border border-[#303036] bg-[#18181c] p-3 sm:p-4"
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div
          className="grid grid-cols-3 rounded-lg border border-[#303036] bg-[#111114] p-1"
          aria-label="Escopo do dashboard"
        >
          {(
            [
              ['mine', 'Minha visão'],
              ['personal', 'Pessoal'],
              ['organization', 'Organização'],
            ] as const
          ).map(([scope, label]) => (
            <button
              key={scope}
              type="button"
              disabled={scope === 'organization' && !hasOrganization}
              onClick={() => changeScope(scope)}
              className={`min-h-9 rounded-md px-3 text-xs font-medium transition sm:text-sm ${
                filters.scope === scope
                  ? 'bg-[#6f55d9] text-white shadow-sm'
                  : 'text-[#9b9ba3] hover:bg-white/5 hover:text-white disabled:opacity-35'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Buscar no dashboard</span>
          <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[#777780]" />
          <input
            value={filters.search || ''}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Buscar título, descrição, projeto, tag ou chamado"
            className={`${fieldClass} w-full pl-9`}
          />
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#303036] px-3 text-sm text-[#c7c7cf] hover:border-[#4a4a55] hover:text-white md:hidden"
            aria-expanded={expanded}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filtros
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#303036] px-3 text-sm text-[#c7c7cf] hover:border-[#6f55d9]/60 hover:text-white disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">
              {refreshing ? 'Atualizando' : 'Atualizar'}
            </span>
          </button>
        </div>
      </div>

      <div
        className={`${expanded ? 'grid' : 'hidden'} mt-3 gap-2 border-t border-[#2a2a30] pt-3 md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6`}
      >
        <FilterField label="Período">
          <select
            value={filters.period}
            onChange={(event) =>
              onChange({
                period: event.target.value as DashboardFilters['period'],
              })
            }
            className={`${fieldClass} w-full`}
          >
            <option value="today">Hoje</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="custom">Personalizado</option>
          </select>
        </FilterField>

        <FilterField label="Tipo">
          <select
            value={filters.type}
            onChange={(event) =>
              changeType(event.target.value as DashboardFilters['type'])
            }
            className={`${fieldClass} w-full`}
          >
            <option value="ALL">Todos</option>
            <option value="TASK">Tasks</option>
            <option
              value="TICKET"
              disabled={!hasOrganization || filters.scope === 'personal'}
            >
              Chamados
            </option>
            <option value="NOTE">Notas</option>
          </select>
        </FilterField>

        <FilterField label="Status">
          <select
            value={filters.status || ''}
            onChange={(event) =>
              onChange({ status: event.target.value || undefined })
            }
            className={`${fieldClass} w-full`}
          >
            <option value="">Todos</option>
            {statusOptions[filters.type].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FilterField>

        {!isNotes && (
          <FilterField label="Prioridade">
            <select
              value={filters.priority || ''}
              onChange={(event) =>
                onChange({
                  priority:
                    (event.target.value as DashboardFilters['priority']) ||
                    undefined,
                })
              }
              className={`${fieldClass} w-full`}
            >
              <option value="">Todas</option>
              <option value="LOW">Baixa</option>
              <option value="MEDIUM">Média</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
          </FilterField>
        )}

        {!isNotes && showOrganizationFilters && (
          <FilterField label="Responsável">
            <select
              value={filters.assigneeId || ''}
              onChange={(event) =>
                onChange({ assigneeId: event.target.value || undefined })
              }
              className={`${fieldClass} w-full`}
            >
              <option value="">Todos</option>
              <option value="me">Eu</option>
              <option value="unassigned">Sem responsável</option>
              {options.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </select>
          </FilterField>
        )}

        {!isNotes && showOrganizationFilters && (
          <FilterField label="Equipe">
            <select
              value={filters.teamId || ''}
              onChange={(event) =>
                onChange({ teamId: event.target.value || undefined })
              }
              className={`${fieldClass} w-full`}
            >
              <option value="">Todas</option>
              {options.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.label}
                </option>
              ))}
            </select>
          </FilterField>
        )}

        {!isNotes && !isTasks && showOrganizationFilters && (
          <FilterField label="Fila">
            <select
              value={filters.queueId || ''}
              onChange={(event) =>
                onChange({ queueId: event.target.value || undefined })
              }
              className={`${fieldClass} w-full`}
            >
              <option value="">Todas</option>
              {options.queues.map((queue) => (
                <option key={queue.id} value={queue.id}>
                  {queue.label}
                </option>
              ))}
            </select>
          </FilterField>
        )}

        {!isNotes && !isTickets && (
          <FilterField label="Projeto">
            <select
              value={filters.projectId || ''}
              onChange={(event) =>
                onChange({ projectId: event.target.value || undefined })
              }
              className={`${fieldClass} w-full`}
            >
              <option value="">Todos</option>
              {options.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.label}
                </option>
              ))}
            </select>
          </FilterField>
        )}

        <button
          type="button"
          onClick={onReset}
          className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#303036] text-sm text-[#9b9ba3] hover:border-[#4a4a55] hover:text-white"
        >
          <FilterX className="h-4 w-4" /> Limpar filtros
        </button>
      </div>

      {filters.period === 'custom' && (
        <div className="mt-3 grid gap-2 border-t border-[#2a2a30] pt-3 sm:grid-cols-2 md:max-w-xl">
          <FilterField label="Data inicial">
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[#777780]" />
              <input
                type="date"
                value={filters.dateFrom || ''}
                onChange={(event) => onChange({ dateFrom: event.target.value })}
                className={`${fieldClass} w-full pl-9`}
              />
            </div>
          </FilterField>
          <FilterField label="Data final">
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[#777780]" />
              <input
                type="date"
                value={filters.dateTo || ''}
                onChange={(event) => onChange({ dateTo: event.target.value })}
                className={`${fieldClass} w-full pl-9`}
              />
            </div>
          </FilterField>
        </div>
      )}
    </section>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="min-w-0 space-y-1">
      <span className="block text-[11px] font-medium tracking-wide text-[#8a8a94] uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
