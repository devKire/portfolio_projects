'use client';

import {
  BarChart3,
  Clock4,
  FolderKanban,
  Gauge,
  Globe2,
  Headphones,
  UsersRound,
} from 'lucide-react';

import type {
  OperationalDashboardData,
  PortfolioAnalytics,
  QueueStat,
  WorkloadPoint,
} from '@/types/dashboard';
import { Panel } from './OperationalLists';

export function QueueBreakdown({
  queues,
  onOpen,
}: {
  queues: QueueStat[];
  onOpen: (queueId: string) => void;
}) {
  const maximum = Math.max(1, ...queues.map((queue) => queue.total));
  return (
    <Panel
      title="Chamados por fila"
      description="Somente filas e chamados dentro do acesso atual"
      icon={<Headphones className="h-4 w-4" />}
    >
      {queues.length ? (
        <div className="space-y-4">
          {queues.map((queue) => (
            <button
              key={queue.id}
              type="button"
              onClick={() => onOpen(queue.id)}
              className="group block w-full rounded-lg text-left focus-visible:ring-2 focus-visible:ring-[#9a8cff] focus-visible:outline-none"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-medium text-[#d8d8de] group-hover:text-white">
                  {queue.name}
                </span>
                <strong className="text-sm text-white tabular-nums">
                  {queue.total}
                </strong>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#111114]">
                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{ width: `${(queue.total / maximum) * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-[#777780]">
                {queue.open} abertos • {queue.inProgress} em andamento •{' '}
                {queue.waiting} aguardando • {queue.resolved} resolvidos
              </p>
            </button>
          ))}
        </div>
      ) : (
        <Empty text="Nenhum chamado acessível está distribuído em filas." />
      )}
    </Panel>
  );
}

export function WorkloadBreakdown({
  members,
  teams,
  onMember,
  onTeam,
}: {
  members: WorkloadPoint[];
  teams: WorkloadPoint[];
  onMember: (memberId: string) => void;
  onTeam: (teamId: string) => void;
}) {
  return (
    <Panel
      title="Carga da organização"
      description="Trabalho ativo por responsável e equipe"
      icon={<UsersRound className="h-4 w-4" />}
    >
      {members.length || teams.length ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <WorkloadColumn
            title="Responsáveis"
            items={members}
            onOpen={onMember}
          />
          <WorkloadColumn title="Equipes" items={teams} onOpen={onTeam} />
        </div>
      ) : (
        <Empty text="Nenhuma carga ativa corresponde aos filtros atuais." />
      )}
    </Panel>
  );
}

function WorkloadColumn({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: WorkloadPoint[];
  onOpen: (id: string) => void;
}) {
  const maximum = Math.max(1, ...items.map((item) => item.total));
  return (
    <div>
      <h3 className="mb-3 text-[11px] font-semibold tracking-wide text-[#8a8a94] uppercase">
        {title}
      </h3>
      <div className="space-y-3">
        {items.slice(0, 8).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpen(item.id)}
            className="group block w-full rounded-lg text-left focus-visible:ring-2 focus-visible:ring-[#9a8cff] focus-visible:outline-none"
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium text-[#cfcfd6] group-hover:text-white">
                {item.name}
              </span>
              <span className="shrink-0 text-[#9b9ba3] tabular-nums">
                {item.total}
              </span>
            </div>
            <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-[#111114]">
              {item.tasks > 0 && (
                <span
                  className="bg-[#7c66df]"
                  style={{ width: `${(item.tasks / maximum) * 100}%` }}
                />
              )}
              {item.tickets > 0 && (
                <span
                  className="bg-sky-500"
                  style={{ width: `${(item.tickets / maximum) * 100}%` }}
                />
              )}
            </div>
            <p className="mt-1 text-[10px] text-[#777780]">
              {item.tasks} Tasks • {item.tickets} chamados
              {item.urgent ? ` • ${item.urgent} urgentes` : ''}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProductivityPanel({
  data,
}: {
  data: OperationalDashboardData;
}) {
  const variance = data.tasks.actualHours - data.tasks.estimatedHours;
  return (
    <Panel
      title="Produtividade"
      description="Indicadores calculados somente a partir dos dados registrados"
      icon={<Gauge className="h-4 w-4" />}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Tasks concluídas"
          value={data.tasks.completedInPeriod.toLocaleString('pt-BR')}
          detail="no período"
        />
        <Metric
          label="Taxa de conclusão"
          value={
            data.tasks.completionRate === null
              ? '—'
              : `${data.tasks.completionRate}%`
          }
          detail="concluídas entre as Tasks criadas no período"
        />
        <Metric
          label="Chamados resolvidos"
          value={data.tickets.resolvedInPeriod.toLocaleString('pt-BR')}
          detail="usa resolvedAt"
        />
        <Metric
          label="Tempo médio de resolução"
          value={formatDuration(data.tickets.averageResolutionMinutes)}
          detail="resolvedAt − createdAt"
        />
      </div>
      <div className="mt-4 grid gap-3 border-t border-[#2a2a30] pt-4 sm:grid-cols-3">
        <HourMetric
          label="Horas estimadas"
          value={data.tasks.estimatedHours}
          icon={<Clock4 className="h-4 w-4" />}
        />
        <HourMetric
          label="Horas realizadas"
          value={data.tasks.actualHours}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <HourMetric
          label="Diferença"
          value={variance}
          signed
          icon={<FolderKanban className="h-4 w-4" />}
        />
      </div>
    </Panel>
  );
}

export function PortfolioPanel({
  portfolio,
}: {
  portfolio: PortfolioAnalytics;
}) {
  return (
    <Panel
      title="Portfólio público"
      description="Analytics preservado como contexto secundário"
      icon={<Globe2 className="h-4 w-4" />}
    >
      {portfolio.available ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Metric
            label="Visualizações"
            value={portfolio.portfolioViews.toLocaleString('pt-BR')}
            detail={formatComparison(portfolio.viewsComparison.changePercent)}
          />
          <Metric
            label="Projetos públicos"
            value={portfolio.projectsCount.toLocaleString('pt-BR')}
            detail="ativos"
          />
          <Metric
            label="Interações sociais"
            value={portfolio.socialInteractions.toLocaleString('pt-BR')}
            detail="no período"
          />
          <Metric
            label="LinkedIn"
            value={portfolio.linkedinFollowers.toLocaleString('pt-BR')}
            detail="seguidores registrados"
          />
          <Metric
            label="GitHub"
            value={portfolio.githubFollowers.toLocaleString('pt-BR')}
            detail="seguidores registrados"
          />
        </div>
      ) : (
        <Empty text="Nenhum portfólio público está configurado para este usuário." />
      )}
    </Panel>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-[#2a2a30] bg-[#151518] p-3">
      <p className="text-[10px] font-medium tracking-wide text-[#777780] uppercase">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold text-white tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-[10px] leading-4 text-[#777780]">{detail}</p>
    </div>
  );
}

function HourMetric({
  label,
  value,
  icon,
  signed = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  signed?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#151518] p-3">
      <span className="rounded-lg bg-white/5 p-2 text-[#9a8cff]">{icon}</span>
      <div>
        <p className="text-[10px] text-[#777780]">{label}</p>
        <p className="font-semibold text-white tabular-nums">
          {signed && value > 0 ? '+' : ''}
          {formatHours(value)}
        </p>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-[#303036] px-4 text-center text-sm text-[#777780]">
      {text}
    </div>
  );
}

function formatHours(value: number) {
  return `${Math.round(value * 10) / 10}h`;
}

function formatDuration(minutes: number | null) {
  if (minutes === null) return '—';
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${mins}min`;
  return `${mins}min`;
}

function formatComparison(change: number | null) {
  if (change === null) return '— vs período anterior';
  if (change === 0) return 'sem alteração';
  return `${change > 0 ? '+' : ''}${change}% vs período anterior`;
}
