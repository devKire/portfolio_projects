'use client';

import type {
  TicketActivityType,
  TicketPriority,
  TicketStatus,
} from '@prisma/client';
import {
  Clock3,
  Headphones,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  UserCheck,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { getOrganizationWorkspace } from '@/app/actions/organizations';
import {
  addTicketComment,
  addTicketQueueAgent,
  assumeTicket,
  createTicket,
  createTicketQueue,
  getTicketWorkspace,
  removeTicketQueueAgent,
  updateTicket,
  updateTicketQueue,
  type TicketFilters,
} from '@/app/actions/tickets';
import type { OrganizationContext } from '@/lib/organizations/context';
import type {
  QueueRow,
  TicketRow,
  TicketWorkspace,
  WorkMember as Member,
  WorkTeam as Team,
} from '@/types/work';

type OrganizationSummary = OrganizationContext['organizations'][number];

const inputClass =
  'h-10 w-full rounded-md border border-[#303036] bg-[#111] px-3 text-sm text-white outline-none placeholder:text-[#666670] focus:border-[#6f55d9]';

const statusLabel: Record<TicketStatus, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  WAITING: 'Aguardando',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
};

const priorityLabel: Record<TicketPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

const statusColors: Record<TicketStatus, string> = {
  OPEN: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  IN_PROGRESS: 'bg-violet-500/10 text-violet-300 border-violet-500/20',
  WAITING: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  RESOLVED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  CLOSED: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
};

export default function Tickets({
  userId,
  organization,
}: {
  userId: string;
  organization: OrganizationSummary | null;
}) {
  const organizationId = organization?.id || null;
  const [workspace, setWorkspace] = useState<TicketWorkspace | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TicketFilters>({ mine: true });
  const [searchDraft, setSearchDraft] = useState('');
  const [loading, setLoading] = useState(Boolean(organizationId));
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) {
      setWorkspace(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [ticketResult, organizationResult] = await Promise.all([
      getTicketWorkspace(organizationId, filters),
      getOrganizationWorkspace(organizationId),
    ]);
    if (ticketResult.success) {
      setWorkspace(ticketResult.data as TicketWorkspace);
      setSelectedId((current) =>
        current &&
        ticketResult.data.tickets.some((ticket) => ticket.id === current)
          ? current
          : ticketResult.data.tickets[0]?.id || null
      );
    } else toast.error(ticketResult.error);
    if (organizationResult.success) {
      setMembers(organizationResult.data.members.map((member) => member.user));
      setTeams(
        organizationResult.data.teams.map((team) => ({
          id: team.id,
          name: team.name,
          active: team.active,
        }))
      );
    }
    setLoading(false);
  }, [filters, organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => workspace?.tickets.find((ticket) => ticket.id === selectedId) || null,
    [selectedId, workspace]
  );

  const run = async (
    key: string,
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string
  ) => {
    setBusy(key);
    const result = await action();
    if (result.success) {
      toast.success(successMessage);
      await load();
    } else toast.error(result.error || 'Não foi possível concluir a operação.');
    setBusy(null);
    return result.success;
  };

  if (!organization) {
    return <EmptyOrganization />;
  }

  if (loading && !workspace) {
    return (
      <div className="flex flex-1 items-center justify-center text-[#9b9ba3]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando chamados...
      </div>
    );
  }

  const activeQueues = workspace?.queues.filter((queue) => queue.active) || [];

  return (
    <section className="min-w-0 space-y-4 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wider text-[#9a8cff] uppercase">
            Help desk • {organization.name}
          </p>
          <h1 className="text-xl font-semibold text-white">Chamados</h1>
          <p className="text-sm text-[#777780]">
            Atendimento, filas e histórico operacional em um único lugar.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(statusLabel) as TicketStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  status: current.status === status ? undefined : status,
                }))
              }
              className={`rounded-md border px-2.5 py-1.5 text-xs ${filters.status === status ? statusColors[status] : 'border-[#303036] bg-[#19191d] text-[#9b9ba3]'}`}
            >
              {statusLabel[status]} {workspace?.stats[status] || 0}
            </button>
          ))}
        </div>
      </header>

      <details className="rounded-xl border border-[#303036] bg-[#1b1b1f] p-4">
        <summary className="cursor-pointer text-sm font-medium text-white">
          Abrir novo chamado
        </summary>
        <form
          action={async (formData) => {
            const success = await run(
              'create-ticket',
              () =>
                createTicket({
                  organizationId: organization.id,
                  queueId: String(formData.get('queueId') || ''),
                  title: String(formData.get('title') || ''),
                  description: String(formData.get('description') || ''),
                  priority: String(
                    formData.get('priority') || 'MEDIUM'
                  ) as TicketPriority,
                  teamId: String(formData.get('teamId') || '') || null,
                  assigneeId: String(formData.get('assigneeId') || '') || null,
                }),
              'Chamado aberto.'
            );
            if (success) (document.activeElement as HTMLElement | null)?.blur();
          }}
          className="mt-4 grid gap-3 lg:grid-cols-2"
        >
          <input
            name="title"
            required
            maxLength={240}
            placeholder="Título"
            className={`${inputClass} lg:col-span-2`}
          />
          <textarea
            name="description"
            required
            maxLength={20000}
            placeholder="Descreva a solicitação"
            className={`${inputClass} min-h-28 py-3 lg:col-span-2`}
          />
          <select name="queueId" required className={inputClass}>
            <option value="">Selecione a fila</option>
            {activeQueues.map((queue) => (
              <option key={queue.id} value={queue.id}>
                {queue.name}
              </option>
            ))}
          </select>
          <select name="priority" defaultValue="MEDIUM" className={inputClass}>
            {(Object.keys(priorityLabel) as TicketPriority[]).map(
              (priority) => (
                <option key={priority} value={priority}>
                  {priorityLabel[priority]}
                </option>
              )
            )}
          </select>
          <select name="teamId" className={inputClass}>
            <option value="">Equipe padrão da fila</option>
            {teams
              .filter((team) => team.active)
              .map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
          </select>
          <select name="assigneeId" className={inputClass}>
            <option value="">Sem responsável</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name || `@${member.username}`}
              </option>
            ))}
          </select>
          <button
            disabled={busy !== null || !activeQueues.length}
            className="flex h-10 w-fit items-center gap-2 rounded-md bg-[#6f55d9] px-4 text-sm text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Abrir chamado
          </button>
          {!activeQueues.length && (
            <p className="text-xs text-amber-300">
              Crie uma fila ativa antes de abrir chamados.
            </p>
          )}
        </form>
      </details>

      <div className="grid min-h-[620px] gap-4 xl:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.28fr)]">
        <div className="flex min-h-0 flex-col rounded-xl border border-[#303036] bg-[#1b1b1f]">
          <div className="space-y-2 border-b border-[#303036] p-3">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setFilters((current) => ({
                  ...current,
                  search: searchDraft.trim() || undefined,
                }));
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="absolute top-3 left-3 h-4 w-4 text-[#777780]" />
                <input
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  placeholder="Buscar chamados"
                  className={`${inputClass} pl-9`}
                />
              </div>
              <button className="rounded-md border border-[#303036] px-3 text-xs text-[#c9b8ff]">
                Buscar
              </button>
            </form>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filters.queueId || ''}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    queueId: event.target.value || undefined,
                  }))
                }
                className={inputClass}
              >
                <option value="">Todas as filas</option>
                {workspace?.queues.map((queue) => (
                  <option key={queue.id} value={queue.id}>
                    {queue.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.priority || ''}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    priority: (event.target.value || undefined) as
                      | TicketPriority
                      | undefined,
                  }))
                }
                className={inputClass}
              >
                <option value="">Prioridades</option>
                {(Object.keys(priorityLabel) as TicketPriority[]).map(
                  (priority) => (
                    <option key={priority} value={priority}>
                      {priorityLabel[priority]}
                    </option>
                  )
                )}
              </select>
              <select
                value={filters.teamId || ''}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    teamId: event.target.value || undefined,
                  }))
                }
                className={inputClass}
              >
                <option value="">Todas as equipes</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <select
                value={filters.assigneeId || ''}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    assigneeId: event.target.value || undefined,
                  }))
                }
                className={inputClass}
              >
                <option value="">Todos os responsáveis</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name || `@${member.username}`}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-[#9b9ba3]">
              <input
                type="checkbox"
                checked={Boolean(filters.mine)}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    mine: event.target.checked || undefined,
                  }))
                }
              />{' '}
              Meus chamados
            </label>
          </div>
          <div className="min-h-0 flex-1 divide-y divide-[#2f2f35] overflow-y-auto">
            {workspace?.tickets.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => setSelectedId(ticket.id)}
                className={`w-full p-3 text-left hover:bg-[#222228] ${selectedId === ticket.id ? 'bg-[#29263a]' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-sm font-medium text-white">
                    {ticket.title}
                  </h3>
                  <span className="shrink-0 text-[10px] text-[#777780]">
                    {formatDate(ticket.updatedAt)}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge className={statusColors[ticket.status]}>
                    {statusLabel[ticket.status]}
                  </Badge>
                  <Badge>{priorityLabel[ticket.priority]}</Badge>
                  <Badge>{ticket.queue.name}</Badge>
                </div>
                <p className="mt-2 truncate text-xs text-[#777780]">
                  {ticket.assignee
                    ? `Responsável: ${ticket.assignee.name || `@${ticket.assignee.username}`}`
                    : 'Não atribuído'}
                </p>
              </button>
            ))}
            {!workspace?.tickets.length && (
              <div className="p-8 text-center text-sm text-[#777780]">
                Nenhum chamado encontrado.
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-[#303036] bg-[#1b1b1f]">
          {selected ? (
            <TicketDetail
              ticket={selected}
              queues={workspace?.queues || []}
              teams={teams}
              members={members}
              userId={userId}
              busy={busy}
              run={run}
              organizationId={organization.id}
            />
          ) : (
            <div className="flex min-h-96 items-center justify-center text-sm text-[#777780]">
              Selecione um chamado.
            </div>
          )}
        </div>
      </div>

      {workspace?.canManageQueues && (
        <QueueManagement
          organizationId={organization.id}
          queues={workspace.queues}
          teams={teams}
          members={members}
          busy={busy}
          run={run}
        />
      )}
    </section>
  );
}

export function TicketDetail({
  ticket,
  queues,
  teams,
  members,
  userId,
  busy,
  run,
  organizationId,
}: {
  ticket: TicketRow;
  queues: QueueRow[];
  teams: Team[];
  members: Member[];
  userId: string;
  busy: string | null;
  organizationId: string;
  run: (
    key: string,
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string
  ) => Promise<boolean>;
}) {
  return (
    <div className="grid h-full min-h-[620px] min-w-0 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 border-b border-[#303036] p-4 lg:border-r lg:border-b-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-[#777780]">
              #{ticket.id.slice(-8)} · aberto por{' '}
              {ticket.requester.name || `@${ticket.requester.username}`}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              {ticket.title}
            </h2>
          </div>
          {ticket.assigneeId !== userId && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void run(
                  `assume-${ticket.id}`,
                  () => assumeTicket(organizationId, ticket.id),
                  'Chamado assumido.'
                )
              }
              className="flex shrink-0 items-center gap-1.5 rounded-md bg-[#292936] px-3 py-2 text-xs text-[#c9b8ff] disabled:opacity-50"
            >
              <UserCheck className="h-3.5 w-3.5" /> Assumir
            </button>
          )}
        </div>
        <div className="mt-5 rounded-lg border border-[#2f2f35] bg-[#161619] p-4 text-sm leading-6 whitespace-pre-wrap text-[#d5d5da]">
          {ticket.description}
        </div>
        <h3 className="mt-6 flex items-center gap-2 text-sm font-medium text-white">
          <Clock3 className="h-4 w-4 text-[#9a8cff]" /> Histórico
        </h3>
        <div className="mt-3 space-y-3">
          {ticket.activities.map((activity) => (
            <div key={activity.id} className="border-l border-[#3a3a43] pl-3">
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <span className="font-medium text-[#c9b8ff]">
                  {activity.actor?.name ||
                    (activity.actor
                      ? `@${activity.actor.username}`
                      : 'Sistema')}
                </span>
                <span className="text-[#777780]">
                  {activity.message || activity.type} ·{' '}
                  {formatDateTime(activity.createdAt)}
                </span>
              </div>
              {activity.comment && (
                <p className="mt-1 text-sm whitespace-pre-wrap text-[#d5d5da]">
                  {activity.comment}
                </p>
              )}
            </div>
          ))}
        </div>
        <form
          action={async (formData) => {
            await run(
              `comment-${ticket.id}`,
              () =>
                addTicketComment(
                  organizationId,
                  ticket.id,
                  String(formData.get('comment') || '')
                ),
              'Comentário adicionado.'
            );
          }}
          className="mt-5 flex gap-2"
        >
          <input
            name="comment"
            required
            maxLength={10000}
            placeholder="Adicionar comentário"
            className={inputClass}
          />
          <button
            disabled={busy !== null}
            className="rounded-md bg-[#6f55d9] px-3 text-white disabled:opacity-50"
            aria-label="Comentar"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        </form>
      </div>
      <aside className="space-y-3 p-4">
        <DetailSelect
          label="Status"
          value={ticket.status}
          onChange={(value) =>
            void run(
              `status-${ticket.id}`,
              () =>
                updateTicket(organizationId, ticket.id, {
                  status: value as TicketStatus,
                }),
              'Status atualizado.'
            )
          }
          options={(Object.keys(statusLabel) as TicketStatus[]).map(
            (value) => ({ value, label: statusLabel[value] })
          )}
        />
        <DetailSelect
          label="Prioridade"
          value={ticket.priority}
          onChange={(value) =>
            void run(
              `priority-${ticket.id}`,
              () =>
                updateTicket(organizationId, ticket.id, {
                  priority: value as TicketPriority,
                }),
              'Prioridade atualizada.'
            )
          }
          options={(Object.keys(priorityLabel) as TicketPriority[]).map(
            (value) => ({ value, label: priorityLabel[value] })
          )}
        />
        <DetailSelect
          label="Fila"
          value={ticket.queueId}
          onChange={(value) =>
            void run(
              `queue-${ticket.id}`,
              () => updateTicket(organizationId, ticket.id, { queueId: value }),
              'Fila atualizada.'
            )
          }
          options={queues
            .filter((queue) => queue.active || queue.id === ticket.queueId)
            .map((queue) => ({ value: queue.id, label: queue.name }))}
        />
        <DetailSelect
          label="Equipe"
          value={ticket.teamId || ''}
          onChange={(value) =>
            void run(
              `team-${ticket.id}`,
              () =>
                updateTicket(organizationId, ticket.id, {
                  teamId: value || null,
                }),
              'Equipe atualizada.'
            )
          }
          options={[
            { value: '', label: 'Sem equipe' },
            ...teams
              .filter((team) => team.active || team.id === ticket.teamId)
              .map((team) => ({ value: team.id, label: team.name })),
          ]}
        />
        <DetailSelect
          label="Responsável"
          value={ticket.assigneeId || ''}
          onChange={(value) =>
            void run(
              `assignee-${ticket.id}`,
              () =>
                updateTicket(organizationId, ticket.id, {
                  assigneeId: value || null,
                }),
              'Responsável atualizado.'
            )
          }
          options={[
            { value: '', label: 'Não atribuído' },
            ...members.map((member) => ({
              value: member.id,
              label: member.name || `@${member.username}`,
            })),
          ]}
        />
      </aside>
    </div>
  );
}

export function QueueManagement({
  organizationId,
  queues,
  teams,
  members,
  busy,
  run,
}: {
  organizationId: string;
  queues: QueueRow[];
  teams: Team[];
  members: Member[];
  busy: string | null;
  run: (
    key: string,
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string
  ) => Promise<boolean>;
}) {
  return (
    <details className="rounded-xl border border-[#303036] bg-[#1b1b1f] p-4">
      <summary className="cursor-pointer text-sm font-medium text-white">
        Administração de filas
      </summary>
      <form
        action={async (formData) => {
          await run(
            'create-queue',
            () =>
              createTicketQueue({
                organizationId,
                name: String(formData.get('name') || ''),
                description: String(formData.get('description') || ''),
                teamId: String(formData.get('teamId') || '') || null,
              }),
            'Fila criada.'
          );
        }}
        className="mt-4 grid gap-2 sm:grid-cols-3"
      >
        <input
          name="name"
          required
          placeholder="Nome da fila"
          className={inputClass}
        />
        <input
          name="description"
          placeholder="Descrição"
          className={inputClass}
        />
        <select name="teamId" className={inputClass}>
          <option value="">Sem equipe padrão</option>
          {teams
            .filter((team) => team.active)
            .map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
        </select>
        <button
          disabled={busy !== null}
          className="h-10 w-fit rounded-md bg-[#6f55d9] px-4 text-sm text-white disabled:opacity-50"
        >
          Criar fila
        </button>
      </form>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {queues.map((queue) => (
          <article
            key={queue.id}
            className={`rounded-lg border border-[#303036] bg-[#161619] p-3 ${queue.active ? '' : 'opacity-60'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-medium text-white">{queue.name}</h3>
                <p className="text-xs text-[#777780]">
                  {queue.team?.name || 'Sem equipe'} · {queue._count.tickets}{' '}
                  chamados
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => {
                    const name = window.prompt('Nome da fila', queue.name);
                    if (!name) return;
                    const description =
                      window.prompt('Descrição', queue.description || '') ??
                      (queue.description || '');
                    void run(
                      `queue-edit-${queue.id}`,
                      () =>
                        updateTicketQueue(organizationId, queue.id, {
                          name,
                          description,
                        }),
                      'Fila atualizada.'
                    );
                  }}
                  className="rounded border border-[#303036] px-2 py-1 text-[11px] text-[#b9b9c1]"
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    void run(
                      `queue-active-${queue.id}`,
                      () =>
                        updateTicketQueue(organizationId, queue.id, {
                          active: !queue.active,
                        }),
                      queue.active ? 'Fila desativada.' : 'Fila reativada.'
                    )
                  }
                  className="rounded border border-[#303036] px-2 py-1 text-[11px] text-[#b9b9c1]"
                >
                  {queue.active ? 'Desativar' : 'Reativar'}
                </button>
              </div>
            </div>
            <select
              value={queue.teamId || ''}
              disabled={busy !== null || !queue.active}
              onChange={(event) =>
                void run(
                  `queue-team-${queue.id}`,
                  () =>
                    updateTicketQueue(organizationId, queue.id, {
                      teamId: event.target.value || null,
                    }),
                  'Equipe responsável atualizada.'
                )
              }
              className="mt-3 h-8 w-full rounded border border-[#303036] bg-[#111] px-2 text-xs text-[#b9b9c1] disabled:opacity-50"
            >
              <option value="">Sem equipe responsável</option>
              {teams
                .filter((team) => team.active || team.id === queue.teamId)
                .map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
            </select>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {queue.agents.map((agent) => (
                <span
                  key={agent.userId}
                  className="inline-flex items-center gap-1 rounded bg-[#292936] px-2 py-1 text-xs text-[#c9b8ff]"
                >
                  {agent.organizationMember.user.name ||
                    `@${agent.organizationMember.user.username}`}
                  <button
                    type="button"
                    onClick={() =>
                      void run(
                        `agent-remove-${queue.id}-${agent.userId}`,
                        () =>
                          removeTicketQueueAgent({
                            organizationId,
                            queueId: queue.id,
                            userId: agent.userId,
                          }),
                        'Agente removido.'
                      )
                    }
                    aria-label="Remover agente"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            {queue.active && (
              <select
                defaultValue=""
                onChange={(event) => {
                  if (!event.target.value) return;
                  void run(
                    `agent-add-${queue.id}`,
                    () =>
                      addTicketQueueAgent({
                        organizationId,
                        queueId: queue.id,
                        userId: event.target.value,
                      }),
                    'Agente adicionado.'
                  );
                  event.target.value = '';
                }}
                className="mt-3 h-8 w-full rounded border border-[#303036] bg-[#111] px-2 text-xs text-[#b9b9c1]"
              >
                <option value="">Adicionar agente...</option>
                {members
                  .filter(
                    (member) =>
                      !queue.agents.some((agent) => agent.userId === member.id)
                  )
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name || `@${member.username}`}
                    </option>
                  ))}
              </select>
            )}
          </article>
        ))}
      </div>
    </details>
  );
}

function DetailSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs text-[#9b9ba3]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} mt-1`}
      >
        {options.map((option) => (
          <option key={option.value || 'empty'} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Badge({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`rounded border border-[#303036] bg-[#202024] px-1.5 py-0.5 text-[10px] text-[#b9b9c1] ${className}`}
    >
      {children}
    </span>
  );
}

function EmptyOrganization() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#3a3a43] p-8 text-center">
      <Headphones className="mb-3 h-8 w-8 text-[#9a8cff]" />
      <h1 className="text-lg font-semibold text-white">
        Selecione uma organização
      </h1>
      <p className="mt-1 text-sm text-[#777780]">
        Chamados e filas sempre pertencem a uma organização autorizada.
      </p>
    </div>
  );
}

function formatDate(value: Date) {
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function formatDateTime(value: Date) {
  return new Date(value).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
