'use client';

import {
  AlertCircle,
  Building2,
  CalendarDays,
  Clock3,
  MessageCircle,
  RotateCcw,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getUpcomingCalendarEvents } from '@/app/actions/calendar';
import { getChatUnreadCount } from '@/app/actions/chat';
import { getOperationalDashboard } from '@/app/actions/dashboard';
import type { OrganizationContext } from '@/lib/organizations/context';
import type {
  DashboardActivityItem,
  DashboardFilters,
  DashboardNoteItem,
  DashboardWorkItem,
  OperationalDashboardData,
} from '@/types/dashboard';
import type { WorkManagerIntent } from '@/types/work';
import { DashboardCharts } from './Dashboard/DashboardCharts';
import { DashboardFiltersBar } from './Dashboard/DashboardFilters';
import { DashboardSummary } from './Dashboard/DashboardSummary';
import {
  PortfolioPanel,
  ProductivityPanel,
  QueueBreakdown,
  WorkloadBreakdown,
} from './Dashboard/OperationalBreakdowns';
import {
  ActivityFeed,
  AttentionList,
  PendingWorkList,
  RecentKnowledge,
  RecentTickets,
  UpcomingTasks,
} from './Dashboard/OperationalLists';

type OrganizationSummary = OrganizationContext['organizations'][number];

export default function Dashboard({
  organizationContext,
  onOpenWork,
  onOpenKnowledge,
  onOpenModule,
}: {
  userId: string;
  organizationContext: OrganizationContext;
  onOpenWork: (intent: WorkManagerIntent) => void;
  onOpenKnowledge: (tab: 'notes' | 'kcs') => void;
  onOpenModule: (tab: 'calendar' | 'chat') => void;
}) {
  const activeOrganization =
    organizationContext.organizations.find(
      (organization) =>
        organization.id === organizationContext.activeOrganizationId
    ) || null;
  const [filters, setFilters] = useState<DashboardFilters>(() =>
    defaultFilters(activeOrganization)
  );
  const [data, setData] = useState<OperationalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clock, setClock] = useState(() => Date.now());
  const [upcomingEvents, setUpcomingEvents] = useState<
    {
      id: string;
      title: string;
      occurrenceStartAt: string;
      type: string;
      organizationId: string | null;
      teams: { team: { name: string } }[];
      participants: { id: string }[];
    }[]
  >([]);
  const [chatUnread, setChatUnread] = useState<number | null>(null);
  const requestId = useRef(0);
  const dataRef = useRef<OperationalDashboardData | null>(null);
  const previousOrganizationId = useRef(activeOrganization?.id || null);

  useEffect(() => {
    const organizationId = activeOrganization?.id || null;
    if (previousOrganizationId.current === organizationId) return;
    previousOrganizationId.current = organizationId;
    requestId.current += 1;
    dataRef.current = null;
    setData(null);
    setError(null);
    setLoading(true);
    setFilters(defaultFilters(activeOrganization));
  }, [activeOrganization]);

  useEffect(() => {
    const interval = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const load = useCallback(
    async (currentFilters: DashboardFilters, manual = false) => {
      if (
        currentFilters.period === 'custom' &&
        (!currentFilters.dateFrom || !currentFilters.dateTo)
      ) {
        return;
      }
      const currentRequest = ++requestId.current;
      if (dataRef.current) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const result = await getOperationalDashboard(currentFilters);
      if (currentRequest !== requestId.current) return;
      if (result.success) {
        dataRef.current = result.data;
        setData(result.data);
        setClock(Date.now());
      } else {
        setError(result.error);
      }
      setLoading(false);
      setRefreshing(false);

      if (manual && !result.success) {
        dataRef.current = null;
        setData(null);
      }
    },
    []
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(filters), 280);
    return () => window.clearTimeout(timeout);
  }, [filters, load]);

  const loadCollaboration = useCallback(async () => {
    const [calendarResult, chatResult] = await Promise.all([
      getUpcomingCalendarEvents(activeOrganization?.id || null, 8),
      activeOrganization
        ? getChatUnreadCount(activeOrganization.id)
        : Promise.resolve({ success: true as const, data: null }),
    ]);
    if (calendarResult.success) {
      setUpcomingEvents(calendarResult.data as typeof upcomingEvents);
    }
    if (chatResult.success) setChatUnread(chatResult.data);
  }, [activeOrganization?.id]);

  useEffect(() => {
    void loadCollaboration();
  }, [loadCollaboration]);

  const updateFilters = useCallback((patch: Partial<DashboardFilters>) => {
    setFilters((current) => {
      const next = { ...current, ...patch };
      if (patch.period === 'custom' && !current.dateFrom) {
        const end = new Date();
        const start = new Date(end);
        start.setDate(end.getDate() - 29);
        next.dateFrom = toDateInput(start);
        next.dateTo = toDateInput(end);
      }
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters(activeOrganization));
  }, [activeOrganization]);

  const operationalScope = filters.scope;
  const openWork = useCallback(
    (intent: WorkManagerIntent) =>
      onOpenWork({
        ...intent,
        scope: intent.scope || operationalScope,
      }),
    [onOpenWork, operationalScope]
  );
  const openWorkItem = useCallback(
    (item: DashboardWorkItem) =>
      openWork({
        kind: item.kind,
        itemKey: item.key,
      }),
    [openWork]
  );
  const openKnowledge = useCallback(
    (note?: DashboardNoteItem) => {
      if (note) {
        onOpenKnowledge(note.source === 'KCS' ? 'kcs' : 'notes');
        return;
      }
      onOpenKnowledge(filters.scope === 'organization' ? 'kcs' : 'notes');
    },
    [filters.scope, onOpenKnowledge]
  );
  const openActivity = useCallback(
    (activity: DashboardActivityItem) => {
      if (activity.kind === 'NOTE') {
        onOpenKnowledge(
          activity.sourceLabel.startsWith('KCS') ? 'kcs' : 'notes'
        );
        return;
      }
      openWork({
        kind: activity.kind,
        itemKey: `${activity.kind}:${activity.itemId}`,
      });
    },
    [onOpenKnowledge, openWork]
  );

  const hasResults = useMemo(() => {
    if (!data) return false;
    return Boolean(
      data.summary.pendingWork ||
      data.summary.completedInPeriod ||
      data.notes.total ||
      data.recentActivity.length
    );
  }, [data]);

  if (loading && !data) return <DashboardSkeleton />;

  if (error && !data) {
    return (
      <div className="flex min-h-[420px] items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-300" />
          <h1 className="mt-3 text-lg font-semibold text-white">
            Não foi possível carregar o Dashboard
          </h1>
          <p className="mt-2 text-sm text-[#9b9ba3]">{error}</p>
          <button
            type="button"
            onClick={() => void load(filters, true)}
            className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#6f55d9] px-4 text-sm font-medium text-white hover:bg-[#7c61e8]"
          >
            <RotateCcw className="h-4 w-4" /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const showWork = filters.type !== 'NOTE';
  const showTickets =
    filters.scope !== 'personal' &&
    filters.type !== 'TASK' &&
    filters.type !== 'NOTE';
  const showTasks = filters.type !== 'TICKET' && filters.type !== 'NOTE';
  const showOrganization =
    filters.scope !== 'personal' && Boolean(activeOrganization);

  return (
    <main className="min-w-0 space-y-4 pb-8 sm:space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium tracking-wide text-[#9a8cff] uppercase">
            <span>Central operacional</span>
            {activeOrganization && (
              <>
                <span className="text-[#55555d]">•</span>
                <span className="inline-flex items-center gap-1 normal-case">
                  <Building2 className="h-3.5 w-3.5" />
                  {activeOrganization.name}
                </span>
              </>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[#8a8a94]">
            Pendências, gargalos, conhecimento e atividade em uma visão segura
            do workspace.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-[#777780]">
          <Clock3 className="h-3.5 w-3.5" />
          Atualizado {formatUpdatedAt(data.meta.generatedAt, clock)}
        </div>
      </header>

      <DashboardFiltersBar
        filters={filters}
        options={data.options}
        hasOrganization={Boolean(activeOrganization)}
        refreshing={refreshing}
        onChange={updateFilters}
        onReset={resetFilters}
        onRefresh={() => void load(filters, true)}
      />

      {refreshing && (
        <div className="fixed top-0 right-0 left-0 z-50 h-1 animate-pulse bg-gradient-to-r from-[#6f55d9] via-[#9a8cff] to-sky-400" />
      )}

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.04] px-4 py-3 text-sm text-red-200">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load(filters, true)}
            className="shrink-0 font-medium underline underline-offset-2"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <DashboardSummary
        data={data}
        filters={filters}
        onOpenWork={openWork}
        onOpenKnowledge={() => openKnowledge()}
      />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.6fr)]">
        <section className="rounded-2xl border border-[#303036] bg-[#19191d] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sky-300">
                <CalendarDays className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase">
                  Próximos eventos
                </span>
              </div>
              <h2 className="mt-1 font-semibold text-white">
                Agenda do workspace
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onOpenModule('calendar')}
              className="min-h-10 rounded-lg border border-white/10 px-3 text-xs text-white hover:bg-white/[0.05]"
            >
              Abrir calendário
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {upcomingEvents.length ? (
              upcomingEvents.slice(0, 5).map((event) => (
                <button
                  key={`${event.id}:${event.occurrenceStartAt}`}
                  type="button"
                  onClick={() => onOpenModule('calendar')}
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-left hover:border-sky-400/30"
                >
                  <span className="w-14 shrink-0 text-center text-xs font-semibold text-sky-200">
                    {new Intl.DateTimeFormat('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(new Date(event.occurrenceStartAt))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">
                      {event.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-[#858590]">
                      {event.type === 'MEETING'
                        ? 'Reunião'
                        : event.organizationId
                          ? 'Organização'
                          : 'Pessoal'}
                      {event.teams.length
                        ? ` · ${event.teams.map((team) => team.team.name).join(', ')}`
                        : ''}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-[#858590]">
                Nenhum evento futuro visível.
              </p>
            )}
          </div>
          {upcomingEvents.find((event) => event.type === 'MEETING') && (
            <p className="mt-3 text-xs text-[#92929c]">
              Próxima reunião:{' '}
              <strong className="text-[#d0d0d7]">
                {
                  upcomingEvents.find((event) => event.type === 'MEETING')
                    ?.title
                }
              </strong>
            </p>
          )}
        </section>
        <section className="rounded-2xl border border-[#303036] bg-[#19191d] p-4 sm:p-5">
          <div className="flex items-center gap-2 text-violet-300">
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase">Chat</span>
          </div>
          <h2 className="mt-2 font-semibold text-white">Mensagens não lidas</h2>
          {activeOrganization ? (
            <>
              <p className="mt-5 text-4xl font-semibold text-white">
                {chatUnread ?? '—'}
              </p>
              <p className="mt-1 text-sm text-[#858590]">
                {activeOrganization.name}
              </p>
              <button
                type="button"
                onClick={() => onOpenModule('chat')}
                className="mt-5 min-h-10 w-full rounded-lg bg-violet-500 px-3 text-sm font-semibold text-white hover:bg-violet-400"
              >
                Abrir Chat
              </button>
            </>
          ) : (
            <p className="mt-5 text-sm text-[#858590]">
              Selecione uma organização para acessar o Chat.
            </p>
          )}
        </section>
      </div>

      {!hasResults && (
        <section className="rounded-2xl border border-dashed border-[#3a3a43] bg-[#18181c] p-8 text-center">
          <p className="text-sm font-medium text-[#c7c7cf]">
            Nenhum item corresponde aos filtros atuais.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#3a3a43] px-4 text-sm text-[#9a8cff] hover:bg-[#6f55d9]/10"
          >
            <RotateCcw className="h-4 w-4" /> Limpar filtros
          </button>
        </section>
      )}

      {showWork && (
        <AttentionList items={data.attentionItems} onOpen={openWorkItem} />
      )}

      <DashboardCharts
        status={data.workByStatus}
        priority={data.workByPriority}
        timeline={data.timeline}
        showNotes={filters.type === 'ALL' || filters.type === 'NOTE'}
        showWorkBreakdowns={showWork}
        onStatus={(lane) => openWork({ lane })}
        onPriority={(priority) => openWork({ priority })}
      />

      {showWork && (
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <PendingWorkList
            items={data.pendingWork}
            onOpen={openWorkItem}
            onViewAll={() => openWork({})}
          />
          {showTasks ? (
            <UpcomingTasks
              groups={data.upcomingTasks}
              onOpen={openWorkItem}
              onViewAll={() => openWork({ kind: 'TASK', dueDateRange: 'week' })}
            />
          ) : (
            <RecentTickets
              tickets={data.recentTickets}
              onOpen={openWorkItem}
              onViewAll={() => openWork({ kind: 'TICKET' })}
            />
          )}
        </div>
      )}

      {showOrganization && showTickets && (
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <QueueBreakdown
            queues={data.queueStats}
            onOpen={(queueId) =>
              openWork({ kind: 'TICKET', queueId, scope: 'organization' })
            }
          />
          <WorkloadBreakdown
            members={data.memberWorkload}
            teams={data.teamWorkload}
            onMember={(assigneeId) => openWork({ assigneeId })}
            onTeam={(teamId) => openWork({ teamId })}
          />
        </div>
      )}

      {showWork && <ProductivityPanel data={data} />}

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <RecentKnowledge
          notes={data.recentNotes}
          onOpen={openKnowledge}
          onViewAll={() => openKnowledge()}
        />
        {showTickets ? (
          <RecentTickets
            tickets={data.recentTickets}
            onOpen={openWorkItem}
            onViewAll={() => openWork({ kind: 'TICKET' })}
          />
        ) : (
          <ActivityFeed items={data.recentActivity} onOpen={openActivity} />
        )}
      </div>

      {showTickets && (
        <ActivityFeed items={data.recentActivity} onOpen={openActivity} />
      )}

      <PortfolioPanel portfolio={data.portfolio} />
    </main>
  );
}

function defaultFilters(
  organization: OrganizationSummary | null
): DashboardFilters {
  return {
    organizationId: organization?.id || null,
    scope: organization ? 'mine' : 'personal',
    period: '30d',
    type: 'ALL',
  };
}

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatUpdatedAt(value: string, now: number) {
  const minutes = Math.max(
    0,
    Math.floor((now - new Date(value).getTime()) / 60_000)
  );
  if (minutes < 1) return 'agora';
  if (minutes === 1) return 'há 1 min';
  if (minutes < 60) return `há ${minutes} min`;
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-5" aria-label="Carregando Dashboard">
      <div className="space-y-2">
        <div className="h-4 w-40 rounded bg-white/5" />
        <div className="h-8 w-56 rounded bg-white/5" />
      </div>
      <div className="h-28 rounded-2xl border border-[#303036] bg-[#18181c]" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-8">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="h-32 rounded-xl border border-[#303036] bg-[#1b1b20]"
          />
        ))}
      </div>
      <div className="h-72 rounded-2xl border border-[#303036] bg-[#19191d]" />
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="h-72 rounded-2xl border border-[#303036] bg-[#19191d]" />
        <div className="h-72 rounded-2xl border border-[#303036] bg-[#19191d]" />
      </div>
    </div>
  );
}
