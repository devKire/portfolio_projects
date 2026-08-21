'use client';

import {
  AlertTriangle,
  BookOpenText,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileText,
  Headphones,
  ListTodo,
  UserRoundX,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type {
  DashboardComparison,
  DashboardFilters,
  OperationalDashboardData,
} from '@/types/dashboard';
import type { WorkManagerIntent } from '@/types/work';

type CardTone = 'neutral' | 'danger' | 'warning' | 'success' | 'info';

type SummaryCard = {
  id: string;
  label: string;
  value: number;
  detail: string;
  icon: LucideIcon;
  tone: CardTone;
  comparison?: DashboardComparison;
  action?: () => void;
};

export function DashboardSummary({
  data,
  filters,
  onOpenWork,
  onOpenKnowledge,
}: {
  data: OperationalDashboardData;
  filters: DashboardFilters;
  onOpenWork: (intent: WorkManagerIntent) => void;
  onOpenKnowledge: () => void;
}) {
  const cards = buildCards(data, filters, onOpenWork, onOpenKnowledge);

  return (
    <section aria-labelledby="dashboard-summary-title">
      <h2 id="dashboard-summary-title" className="sr-only">
        Indicadores principais
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-8">
        {cards.map((card) => {
          const Icon = card.icon;
          const content = (
            <>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-medium tracking-wide text-[#9b9ba3] uppercase">
                  {card.label}
                </span>
                <span
                  className={`rounded-lg p-2 ${toneClasses[card.tone].icon}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <div className="mt-3 flex items-end justify-between gap-2">
                <strong className="text-2xl font-semibold text-white tabular-nums sm:text-3xl">
                  {card.value.toLocaleString('pt-BR')}
                </strong>
                {card.comparison && (
                  <ComparisonBadge comparison={card.comparison} />
                )}
              </div>
              <p className="mt-1 min-h-8 text-xs leading-4 text-[#777780]">
                {card.detail}
              </p>
            </>
          );

          const className = `min-w-0 rounded-xl border p-3 text-left transition sm:p-4 ${
            toneClasses[card.tone].card
          } ${card.action ? 'cursor-pointer hover:-translate-y-0.5 hover:border-[#6f55d9]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9a8cff]' : ''}`;

          return card.action ? (
            <button
              key={card.id}
              type="button"
              onClick={card.action}
              className={className}
              aria-label={`${card.label}: ${card.value}. ${card.detail}`}
            >
              {content}
            </button>
          ) : (
            <article key={card.id} className={className}>
              {content}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function buildCards(
  data: OperationalDashboardData,
  filters: DashboardFilters,
  onOpenWork: (intent: WorkManagerIntent) => void,
  onOpenKnowledge: () => void
): SummaryCard[] {
  const scope = filters.scope;
  if (filters.type === 'NOTE') {
    return [
      {
        id: 'notes-total',
        label: 'Base de conhecimento',
        value: data.notes.total,
        detail: `${data.notes.folders} pasta(s) neste escopo`,
        icon: BookOpenText,
        tone: 'info',
        action: onOpenKnowledge,
      },
      {
        id: 'notes-updated',
        label: 'Atualizadas',
        value: data.notes.updatedInPeriod,
        detail: 'no período selecionado',
        icon: Clock3,
        tone: 'info',
        action: onOpenKnowledge,
      },
      {
        id: 'notes-created',
        label: 'Criadas',
        value: data.notes.createdInPeriod,
        detail: 'comparação com período anterior',
        icon: FileText,
        tone: 'success',
        comparison: data.summary.comparisons.notesCreated,
        action: onOpenKnowledge,
      },
      {
        id: 'notes-draft',
        label: 'Rascunhos',
        value: data.notes.draft,
        detail: 'conteúdo em elaboração',
        icon: CircleDot,
        tone: 'neutral',
        action: onOpenKnowledge,
      },
      {
        id: 'notes-published',
        label: 'Publicadas',
        value: data.notes.published,
        detail: 'disponíveis no escopo',
        icon: CheckCircle2,
        tone: 'success',
        action: onOpenKnowledge,
      },
      {
        id: 'notes-archived',
        label: 'Arquivadas',
        value: data.notes.archived,
        detail: 'mantidas para consulta',
        icon: FileText,
        tone: 'neutral',
        action: onOpenKnowledge,
      },
      {
        id: 'notes-favorite',
        label: 'Favoritas',
        value: data.notes.favorites,
        detail: 'marcadas neste escopo',
        icon: BookOpenText,
        tone: 'warning',
        action: onOpenKnowledge,
      },
      {
        id: 'notes-folders',
        label: 'Pastas',
        value: data.notes.folders,
        detail:
          scope === 'organization' ? 'estrutura KCS' : 'estrutura visível',
        icon: ListTodo,
        tone: 'neutral',
        action: onOpenKnowledge,
      },
    ];
  }

  if (filters.type === 'TICKET') {
    return [
      ticketCard(
        'ticket-open',
        'Abertos',
        data.tickets.OPEN,
        'OPEN',
        data,
        scope,
        onOpenWork
      ),
      ticketCard(
        'ticket-progress',
        'Em andamento',
        data.tickets.IN_PROGRESS,
        'IN_PROGRESS',
        data,
        scope,
        onOpenWork
      ),
      ticketCard(
        'ticket-waiting',
        'Aguardando',
        data.tickets.WAITING,
        'WAITING',
        data,
        scope,
        onOpenWork
      ),
      {
        id: 'ticket-urgent',
        label: 'Urgentes',
        value: data.tickets.urgent,
        detail: 'chamados ativos',
        icon: AlertTriangle,
        tone: 'danger',
        action: () => onOpenWork({ scope, kind: 'TICKET', priority: 'URGENT' }),
      },
      {
        id: 'ticket-unassigned',
        label: 'Sem responsável',
        value: data.tickets.unassigned,
        detail: 'chamados ativos',
        icon: UserRoundX,
        tone: 'warning',
        action: () =>
          onOpenWork({ scope, kind: 'TICKET', assigneeId: 'unassigned' }),
      },
      {
        id: 'ticket-resolved',
        label: 'Resolvidos',
        value: data.tickets.resolvedInPeriod,
        detail: 'no período selecionado',
        icon: CheckCircle2,
        tone: 'success',
        comparison: data.summary.comparisons.completedWork,
        action: () => onOpenWork({ scope, kind: 'TICKET', lane: 'DONE' }),
      },
      {
        id: 'ticket-mine',
        label: 'Atribuídos a mim',
        value: data.tickets.assignedToMe,
        detail: 'dentro do acesso atual',
        icon: Headphones,
        tone: 'info',
        action: () => onOpenWork({ scope: 'mine', kind: 'TICKET' }),
      },
      {
        id: 'ticket-requested',
        label: 'Solicitados por mim',
        value: data.tickets.requestedByMe,
        detail: 'dentro do acesso atual',
        icon: Headphones,
        tone: 'neutral',
        action: () => onOpenWork({ scope: 'mine', kind: 'TICKET' }),
      },
    ];
  }

  if (filters.type === 'TASK') {
    return [
      {
        id: 'task-pending',
        label: 'Pendentes',
        value: data.tasks.pending,
        detail: 'tasks ainda não iniciadas',
        icon: ListTodo,
        tone: 'neutral',
        action: () => onOpenWork({ scope, kind: 'TASK', lane: 'BACKLOG' }),
      },
      {
        id: 'task-progress',
        label: 'Em andamento',
        value: data.tasks.inProgress,
        detail: 'tasks em execução',
        icon: CircleDot,
        tone: 'info',
        action: () => onOpenWork({ scope, kind: 'TASK', lane: 'IN_PROGRESS' }),
      },
      {
        id: 'task-overdue',
        label: 'Vencidas',
        value: data.tasks.overdue,
        detail: `${data.tasks.urgent} urgente(s) ativas`,
        icon: AlertTriangle,
        tone: 'danger',
        action: () =>
          onOpenWork({ scope, kind: 'TASK', dueDateRange: 'overdue' }),
      },
      {
        id: 'task-today',
        label: 'Vencem hoje',
        value: data.tasks.dueToday,
        detail: `${data.tasks.dueNextSevenDays} nos próximos 7 dias`,
        icon: Clock3,
        tone: 'warning',
        action: () =>
          onOpenWork({ scope, kind: 'TASK', dueDateRange: 'today' }),
      },
      {
        id: 'task-completed',
        label: 'Concluídas',
        value: data.tasks.completedInPeriod,
        detail: 'no período selecionado',
        icon: CheckCircle2,
        tone: 'success',
        comparison: data.summary.comparisons.completedWork,
        action: () => onOpenWork({ scope, kind: 'TASK', lane: 'DONE' }),
      },
      {
        id: 'task-urgent',
        label: 'Urgentes',
        value: data.tasks.urgent,
        detail: `${data.tasks.high} de prioridade alta`,
        icon: AlertTriangle,
        tone: 'danger',
        action: () => onOpenWork({ scope, kind: 'TASK', priority: 'URGENT' }),
      },
      {
        id: 'task-unassigned',
        label: 'Sem responsável',
        value: data.tasks.unassigned,
        detail: 'tasks ativas',
        icon: UserRoundX,
        tone: 'warning',
        action: () =>
          onOpenWork({ scope, kind: 'TASK', assigneeId: 'unassigned' }),
      },
      {
        id: 'task-mine',
        label: 'Minhas tasks',
        value: data.tasks.mine,
        detail: `${data.tasks.personal} pessoais • ${data.tasks.organizational} organizacionais`,
        icon: ListTodo,
        tone: 'info',
        action: () => onOpenWork({ scope: 'mine', kind: 'TASK' }),
      },
    ];
  }

  return [
    {
      id: 'pending-work',
      label: 'Trabalho pendente',
      value: data.summary.pendingWork,
      detail: 'Tasks + chamados ativos',
      icon: ListTodo,
      tone: 'neutral',
      action: () => onOpenWork({ scope }),
    },
    {
      id: 'overdue',
      label: 'Tarefas vencidas',
      value: data.summary.overdueTasks,
      detail: `${data.summary.dueTodayTasks} vencem hoje`,
      icon: AlertTriangle,
      tone: 'danger',
      action: () =>
        onOpenWork({ scope, kind: 'TASK', dueDateRange: 'overdue' }),
    },
    {
      id: 'tickets-open',
      label: 'Chamados abertos',
      value: data.summary.openTickets,
      detail: `${data.summary.unassignedTickets} sem responsável`,
      icon: Headphones,
      tone: 'info',
      action: () => onOpenWork({ scope, kind: 'TICKET', lane: 'BACKLOG' }),
    },
    {
      id: 'in-progress',
      label: 'Em andamento',
      value: data.summary.inProgressWork,
      detail: 'Tasks + chamados',
      icon: CircleDot,
      tone: 'info',
      action: () => onOpenWork({ scope, lane: 'IN_PROGRESS' }),
    },
    {
      id: 'completed',
      label: 'Finalizados',
      value: data.summary.completedInPeriod,
      detail: 'no período selecionado',
      icon: CheckCircle2,
      tone: 'success',
      comparison: data.summary.comparisons.completedWork,
      action: () => onOpenWork({ scope, lane: 'DONE' }),
    },
    {
      id: 'knowledge',
      label: 'Conhecimento',
      value: data.summary.knowledgeTotal,
      detail: `${data.summary.knowledgeUpdatedInPeriod} atualizadas no período`,
      icon: BookOpenText,
      tone: 'neutral',
      action: onOpenKnowledge,
    },
    {
      id: 'urgent',
      label: 'Urgentes',
      value: data.summary.urgentWork,
      detail: 'trabalho ativo',
      icon: AlertTriangle,
      tone: 'danger',
      action: () => onOpenWork({ scope, priority: 'URGENT' }),
    },
    {
      id: 'unassigned',
      label: 'Sem responsável',
      value: data.tasks.unassigned + data.tickets.unassigned,
      detail: 'itens ativos',
      icon: UserRoundX,
      tone: 'warning',
      action: () => onOpenWork({ scope, assigneeId: 'unassigned' }),
    },
  ];
}

function ticketCard(
  id: string,
  label: string,
  value: number,
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING',
  data: OperationalDashboardData,
  scope: DashboardFilters['scope'],
  onOpenWork: (intent: WorkManagerIntent) => void
): SummaryCard {
  const lane =
    status === 'OPEN'
      ? 'BACKLOG'
      : status === 'WAITING'
        ? 'WAITING'
        : 'IN_PROGRESS';
  return {
    id,
    label,
    value,
    detail: `${data.tickets.createdInPeriod} novo(s) no período`,
    icon: Headphones,
    tone: status === 'WAITING' ? 'warning' : 'info',
    action: () => onOpenWork({ scope, kind: 'TICKET', lane }),
  };
}

function ComparisonBadge({ comparison }: { comparison: DashboardComparison }) {
  if (comparison.changePercent === null) {
    return (
      <span
        className="text-xs text-[#777780]"
        title="Sem base anterior suficiente"
      >
        —
      </span>
    );
  }
  const positive = comparison.changePercent > 0;
  const negative = comparison.changePercent < 0;
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-medium tabular-nums ${
        positive
          ? 'bg-emerald-500/10 text-emerald-300'
          : negative
            ? 'bg-red-500/10 text-red-300'
            : 'bg-white/5 text-[#9b9ba3]'
      }`}
      title={`${comparison.current} no período atual, ${comparison.previous} no anterior`}
    >
      {positive ? '+' : ''}
      {comparison.changePercent}%
    </span>
  );
}

const toneClasses: Record<CardTone, { card: string; icon: string }> = {
  neutral: {
    card: 'border-[#303036] bg-[#1b1b20]',
    icon: 'bg-white/5 text-[#b2b2bc]',
  },
  danger: {
    card: 'border-red-500/20 bg-red-500/[0.045]',
    icon: 'bg-red-500/10 text-red-300',
  },
  warning: {
    card: 'border-amber-500/20 bg-amber-500/[0.04]',
    icon: 'bg-amber-500/10 text-amber-300',
  },
  success: {
    card: 'border-emerald-500/20 bg-emerald-500/[0.04]',
    icon: 'bg-emerald-500/10 text-emerald-300',
  },
  info: {
    card: 'border-violet-500/20 bg-violet-500/[0.045]',
    icon: 'bg-violet-500/10 text-violet-300',
  },
};
