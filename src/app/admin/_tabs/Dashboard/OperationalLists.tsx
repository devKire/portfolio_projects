'use client';

import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckSquare2,
  Clock3,
  FileText,
  Headphones,
  History,
  Inbox,
  Star,
} from 'lucide-react';

import type {
  DashboardActivityItem,
  DashboardAttentionItem,
  DashboardNoteItem,
  DashboardUpcomingGroup,
  DashboardWorkItem,
} from '@/types/dashboard';

export function AttentionList({
  items,
  onOpen,
}: {
  items: DashboardAttentionItem[];
  onOpen: (item: DashboardWorkItem) => void;
}) {
  return (
    <Panel
      title="Precisa da sua atenção"
      description="Urgências, atrasos e trabalho sem responsável"
      icon={<AlertTriangle className="h-4 w-4" />}
      className="border-red-500/15"
    >
      {items.length ? (
        <div className="divide-y divide-[#2a2a30]">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onOpen(item)}
              className="group flex w-full items-start gap-3 py-3 text-left first:pt-0 last:pb-0 focus-visible:ring-2 focus-visible:ring-[#9a8cff] focus-visible:outline-none"
            >
              <span className={attentionClasses[item.reason]}>
                {item.reasonLabel}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate text-sm font-medium text-[#e5e5ea] group-hover:text-white">
                    {item.identifier !== 'TASK' && (
                      <span className="mr-1 text-[#9a8cff]">
                        {item.identifier}
                      </span>
                    )}
                    {item.title}
                  </p>
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[#55555d] group-hover:text-[#9a8cff]" />
                </div>
                <p className="mt-1 truncate text-xs text-[#777780]">
                  {item.kind === 'TASK' ? 'Task' : item.queueName || 'Chamado'}
                  {item.teamName ? ` • ${item.teamName}` : ''}
                  {item.assigneeName
                    ? ` • ${item.assigneeName}`
                    : ' • Sem responsável'}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CheckSquare2 className="h-6 w-6" />}
          text="Nenhum item exige atenção imediata com os filtros atuais."
        />
      )}
    </Panel>
  );
}

export function PendingWorkList({
  items,
  onOpen,
  onViewAll,
}: {
  items: DashboardWorkItem[];
  onOpen: (item: DashboardWorkItem) => void;
  onViewAll: () => void;
}) {
  return (
    <Panel
      title="Trabalho pendente"
      description="Fila canônica sem duplicar Ticket e Task vinculada"
      icon={<Inbox className="h-4 w-4" />}
      action={{ label: 'Ver tudo', onClick: onViewAll }}
    >
      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <WorkRow key={item.key} item={item} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Inbox className="h-6 w-6" />}
          text="Nenhum trabalho pendente corresponde aos filtros."
        />
      )}
    </Panel>
  );
}

export function UpcomingTasks({
  groups,
  onOpen,
  onViewAll,
}: {
  groups: DashboardUpcomingGroup[];
  onOpen: (item: DashboardWorkItem) => void;
  onViewAll: () => void;
}) {
  const populated = groups.filter((group) => group.items.length > 0);
  return (
    <Panel
      title="Próximos prazos"
      description="Vencidas, hoje, amanhã e próximos 7 dias"
      icon={<CalendarClock className="h-4 w-4" />}
      action={{ label: 'Abrir Tasks', onClick: onViewAll }}
    >
      {populated.length ? (
        <div className="space-y-4">
          {populated.map((group) => (
            <div key={group.key}>
              <h3
                className={`mb-2 text-[11px] font-semibold tracking-wide uppercase ${
                  group.key === 'overdue'
                    ? 'text-red-300'
                    : group.key === 'today'
                      ? 'text-amber-300'
                      : 'text-[#9b9ba3]'
                }`}
              >
                {group.label} • {group.items.length}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onOpen(item)}
                    className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-2 text-left hover:bg-white/[0.035] focus-visible:ring-2 focus-visible:ring-[#9a8cff] focus-visible:outline-none"
                  >
                    <span className="min-w-0 truncate text-sm text-[#d2d2d9]">
                      {item.title}
                    </span>
                    <span className="shrink-0 text-xs text-[#777780]">
                      {item.dueDate ? formatDate(item.dueDate) : '—'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarClock className="h-6 w-6" />}
          text="Nenhuma Task com prazo próximo."
        />
      )}
    </Panel>
  );
}

export function RecentKnowledge({
  notes,
  onOpen,
  onViewAll,
}: {
  notes: DashboardNoteItem[];
  onOpen: (note: DashboardNoteItem) => void;
  onViewAll: () => void;
}) {
  return (
    <Panel
      title="Notas recentes"
      description="Pessoal e KCS identificados pelo escopo real"
      icon={<FileText className="h-4 w-4" />}
      action={{ label: 'Ver conhecimento', onClick: onViewAll }}
    >
      {notes.length ? (
        <div className="divide-y divide-[#2a2a30]">
          {notes.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => onOpen(note)}
              className="group flex min-h-14 w-full items-center gap-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-[#9a8cff] focus-visible:outline-none"
            >
              <span className="rounded-lg bg-[#6f55d9]/10 p-2 text-[#9a8cff]">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#d8d8de] group-hover:text-white">
                  {note.title}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[#777780]">
                  {note.source === 'KCS'
                    ? `KCS • ${note.organizationName || 'Organização'}`
                    : 'Pessoal'}{' '}
                  • {formatRelative(note.updatedAt)}
                </p>
              </div>
              {note.isFavorite && (
                <Star className="h-4 w-4 fill-amber-400/40 text-amber-300" />
              )}
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          text="Nenhuma nota atualizada neste período."
        />
      )}
    </Panel>
  );
}

export function RecentTickets({
  tickets,
  onOpen,
  onViewAll,
}: {
  tickets: DashboardWorkItem[];
  onOpen: (item: DashboardWorkItem) => void;
  onViewAll: () => void;
}) {
  return (
    <Panel
      title="Chamados recentes"
      description="Urgentes e atualizados no período"
      icon={<Headphones className="h-4 w-4" />}
      action={{ label: 'Ver chamados', onClick: onViewAll }}
    >
      {tickets.length ? (
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <WorkRow key={ticket.key} item={ticket} onOpen={onOpen} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Headphones className="h-6 w-6" />}
          text="Nenhum chamado acessível foi atualizado neste período."
        />
      )}
    </Panel>
  );
}

export function ActivityFeed({
  items,
  onOpen,
}: {
  items: DashboardActivityItem[];
  onOpen: (item: DashboardActivityItem) => void;
}) {
  return (
    <Panel
      title="Atividade recente"
      description="Eventos reais de recursos dentro do acesso atual"
      icon={<History className="h-4 w-4" />}
    >
      {items.length ? (
        <ol className="relative ml-2 border-l border-[#303036]">
          {items.map((item) => (
            <li key={item.id} className="relative pb-4 pl-5 last:pb-0">
              <span className="absolute top-1.5 -left-1.5 h-3 w-3 rounded-full border-2 border-[#19191d] bg-[#7c66df]" />
              <button
                type="button"
                onClick={() => onOpen(item)}
                className="group block w-full rounded text-left focus-visible:ring-2 focus-visible:ring-[#9a8cff] focus-visible:outline-none"
              >
                <p className="text-sm text-[#d2d2d9] group-hover:text-white">
                  {item.actorName ? `${item.actorName}: ` : ''}
                  {item.message}
                </p>
                <p className="mt-0.5 truncate text-xs text-[#777780]">
                  {item.title} • {item.sourceLabel} •{' '}
                  {formatRelative(item.timestamp)}
                </p>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          icon={<History className="h-6 w-6" />}
          text="Nenhuma atividade recente corresponde aos filtros."
        />
      )}
    </Panel>
  );
}

export function Panel({
  title,
  description,
  icon,
  action,
  className = '',
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: { label: string; onClick: () => void };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-[#303036] bg-[#19191d] p-4 sm:p-5 ${className}`}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="rounded-lg bg-[#6f55d9]/10 p-2 text-[#9a8cff]">
            {icon}
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold text-white">{title}</h2>
            <p className="text-xs text-[#777780]">{description}</p>
          </div>
        </div>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-medium text-[#9a8cff] hover:bg-[#6f55d9]/10 hover:text-[#b3a7ff] focus-visible:ring-2 focus-visible:ring-[#9a8cff] focus-visible:outline-none"
          >
            {action.label} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

function WorkRow({
  item,
  onOpen,
}: {
  item: DashboardWorkItem;
  onOpen: (item: DashboardWorkItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="group flex min-h-14 w-full items-center gap-3 rounded-xl border border-[#2a2a30] bg-[#151518] p-3 text-left hover:border-[#44444e] hover:bg-[#1e1e23] focus-visible:ring-2 focus-visible:ring-[#9a8cff] focus-visible:outline-none"
    >
      <span
        className={`rounded-lg p-2 ${
          item.kind === 'TASK'
            ? 'bg-violet-500/10 text-violet-300'
            : 'bg-sky-500/10 text-sky-300'
        }`}
      >
        {item.kind === 'TASK' ? (
          <CheckSquare2 className="h-4 w-4" />
        ) : (
          <Headphones className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-[#777780]">
            {item.identifier}
          </span>
          <p className="truncate text-sm font-medium text-[#d8d8de] group-hover:text-white">
            {item.title}
          </p>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-[#777780]">
          {priorityLabel[item.priority]}
          {item.queueName ? ` • ${item.queueName}` : ''}
          {item.teamName ? ` • ${item.teamName}` : ''}
          {item.assigneeName ? ` • ${item.assigneeName}` : ' • Sem responsável'}
        </p>
      </div>
      <span className="hidden shrink-0 text-[11px] text-[#777780] sm:block">
        {formatRelative(item.updatedAt)}
      </span>
    </button>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-[#303036] px-4 text-center text-[#777780]">
      {icon}
      <p className="mt-2 max-w-sm text-sm">{text}</p>
    </div>
  );
}

function formatRelative(value: string) {
  const milliseconds = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(milliseconds / 60000));
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'ontem' : `há ${days} dias`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

const priorityLabel = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
} as const;

const attentionClasses = {
  URGENT_OVERDUE:
    'mt-0.5 shrink-0 rounded-md bg-red-500/15 px-2 py-1 text-[9px] font-bold tracking-wide text-red-300 uppercase',
  URGENT:
    'mt-0.5 shrink-0 rounded-md bg-red-500/15 px-2 py-1 text-[9px] font-bold tracking-wide text-red-300 uppercase',
  OVERDUE:
    'mt-0.5 shrink-0 rounded-md bg-amber-500/15 px-2 py-1 text-[9px] font-bold tracking-wide text-amber-300 uppercase',
  HIGH: 'mt-0.5 shrink-0 rounded-md bg-orange-500/15 px-2 py-1 text-[9px] font-bold tracking-wide text-orange-300 uppercase',
  UNASSIGNED:
    'mt-0.5 shrink-0 rounded-md bg-sky-500/15 px-2 py-1 text-[9px] font-bold tracking-wide text-sky-300 uppercase',
  DUE_TODAY:
    'mt-0.5 shrink-0 rounded-md bg-violet-500/15 px-2 py-1 text-[9px] font-bold tracking-wide text-violet-300 uppercase',
} as const;
