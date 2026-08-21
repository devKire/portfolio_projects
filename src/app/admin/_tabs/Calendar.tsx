'use client';

import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Edit3,
  Link2,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createCalendarEvent,
  deleteCalendarEvent,
  duplicateCalendarEvent,
  getCalendarEvents,
  getCalendarOptions,
  respondCalendarInvitation,
  updateCalendarEvent,
  type CalendarEventInput,
  type CalendarFilter,
} from '@/app/actions/calendar';
import type { OrganizationContext } from '@/lib/organizations/context';

const VIEW_OPTIONS = ['month', 'week', 'agenda'] as const;
type CalendarView = (typeof VIEW_OPTIONS)[number];

type OrganizationSummary = OrganizationContext['organizations'][number];

type CalendarEventView = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  occurrenceKey: string;
  occurrenceStartAt: string;
  occurrenceEndAt: string;
  allDay: boolean;
  timezone: string;
  creatorId: string;
  organizationId: string | null;
  location: string | null;
  meetingUrl: string | null;
  type: 'EVENT' | 'MEETING' | 'REMINDER' | 'FOCUS';
  visibility: 'INVITE_ONLY' | 'ORGANIZATION' | 'TEAMS';
  status: 'CONFIRMED' | 'CANCELLED';
  recurrenceFrequency: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  recurrenceInterval: number;
  recurrenceWeekdays: number[];
  recurrenceUntil: string | null;
  taskId: string | null;
  ticketId: string | null;
  projectId: string | null;
  creator: { id: string; name: string | null; username: string; email: string };
  participants: {
    id: string;
    userId: string;
    response: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';
    user: { id: string; name: string | null; username: string; email: string };
  }[];
  teams: { teamId: string; team: { id: string; name: string } }[];
  task: { id: string; title: string; organizationId: string | null } | null;
  ticket: { id: string; title: string; organizationId: string } | null;
  project: { id: string; title: string; userId: string } | null;
};

type CalendarOptions = {
  users: PersonOption[];
  organizationUsers: PersonOption[];
  teams: { id: string; name: string }[];
  tasks: { id: string; title: string; organizationId: string | null }[];
  tickets: { id: string; title: string; organizationId: string }[];
  projects: { id: string; title: string }[];
};

type PersonOption = {
  id: string;
  name: string | null;
  username: string;
  email: string;
};

type EditorDraft = CalendarEventInput & { id?: string };

const FILTERS: { id: CalendarFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'mine', label: 'Meus eventos' },
  { id: 'invites', label: 'Convites' },
  { id: 'organization', label: 'Organização' },
  { id: 'team', label: 'Equipe' },
  { id: 'meetings', label: 'Reuniões' },
  { id: 'events', label: 'Eventos' },
];

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function startOfWeek(date: Date) {
  return addDays(startOfDay(date), -date.getDay());
}

function rangeFor(view: CalendarView, cursor: Date) {
  if (view === 'month') {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = startOfWeek(first);
    return { start, end: addDays(start, 42) };
  }
  if (view === 'week') {
    const start = startOfWeek(cursor);
    return { start, end: addDays(start, 7) };
  }
  const start = startOfDay(cursor);
  return { start, end: addDays(start, 45) };
}

function dateKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function toLocalInput(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function newDraft(date: Date, organizationId?: string | null): EditorDraft {
  const start = new Date(date);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(10, 0, 0, 0);
  return {
    title: '',
    description: '',
    startAt: toLocalInput(start),
    endAt: toLocalInput(end),
    allDay: false,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    organizationId: organizationId || null,
    location: '',
    meetingUrl: '',
    type: 'EVENT',
    visibility: 'INVITE_ONLY',
    participantIds: [],
    teamIds: [],
    recurrenceFrequency: 'NONE',
    recurrenceInterval: 1,
    recurrenceWeekdays: [],
    recurrenceUntil: null,
    taskId: null,
    ticketId: null,
    projectId: null,
  };
}

function editDraft(event: CalendarEventView): EditorDraft {
  return {
    id: event.id,
    title: event.title,
    description: event.description || '',
    startAt: toLocalInput(event.startAt),
    endAt: toLocalInput(event.endAt),
    allDay: event.allDay,
    timezone: event.timezone,
    organizationId: event.organizationId,
    location: event.location || '',
    meetingUrl: event.meetingUrl || '',
    type: event.type,
    visibility: event.visibility,
    participantIds: event.participants.map((participant) => participant.userId),
    teamIds: event.teams.map((team) => team.teamId),
    recurrenceFrequency: event.recurrenceFrequency,
    recurrenceInterval: event.recurrenceInterval,
    recurrenceWeekdays: event.recurrenceWeekdays,
    recurrenceUntil: event.recurrenceUntil
      ? dateKey(event.recurrenceUntil)
      : null,
    taskId: event.taskId,
    ticketId: event.ticketId,
    projectId: event.projectId,
  };
}

function eventKind(event: CalendarEventView) {
  if (event.type === 'MEETING') return 'Reunião';
  if (event.type === 'FOCUS') return 'Foco';
  if (event.type === 'REMINDER') return 'Lembrete';
  if (event.visibility === 'TEAMS') return 'Equipe';
  if (event.organizationId) return 'Organização';
  return 'Pessoal';
}

function eventTone(event: CalendarEventView) {
  if (event.type === 'MEETING')
    return 'border-sky-400/30 bg-sky-500/15 text-sky-100';
  if (event.type === 'FOCUS')
    return 'border-amber-400/30 bg-amber-500/15 text-amber-100';
  if (event.visibility === 'TEAMS')
    return 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100';
  if (event.organizationId)
    return 'border-violet-400/30 bg-violet-500/15 text-violet-100';
  return 'border-white/15 bg-white/[0.06] text-white';
}

export default function Calendar({
  userId,
  organization,
}: {
  userId: string;
  organization: OrganizationSummary | null;
}) {
  const [view, setView] = useState<CalendarView>('month');
  const [cursor, setCursor] = useState(new Date());
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const [search, setSearch] = useState('');
  const [events, setEvents] = useState<CalendarEventView[]>([]);
  const [options, setOptions] = useState<CalendarOptions | null>(null);
  const [selected, setSelected] = useState<CalendarEventView | null>(null);
  const [editor, setEditor] = useState<EditorDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visibleRange = useMemo(() => rangeFor(view, cursor), [cursor, view]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [eventsResult, optionsResult] = await Promise.all([
      getCalendarEvents({
        rangeStart: visibleRange.start.toISOString(),
        rangeEnd: visibleRange.end.toISOString(),
        organizationId: organization?.id || null,
        filter,
        search,
      }),
      getCalendarOptions(organization?.id || null),
    ]);
    if (eventsResult.success)
      setEvents(eventsResult.data as CalendarEventView[]);
    else setError(eventsResult.error);
    if (optionsResult.success)
      setOptions(optionsResult.data as CalendarOptions);
    else setError(optionsResult.error);
    setLoading(false);
  }, [filter, organization?.id, search, visibleRange.end, visibleRange.start]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 150);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function saveEvent() {
    if (!editor) return;
    setPending(true);
    setError(null);
    const payload: CalendarEventInput = {
      ...editor,
      startAt: new Date(editor.startAt).toISOString(),
      endAt: new Date(editor.endAt).toISOString(),
      recurrenceUntil: editor.recurrenceUntil
        ? new Date(`${editor.recurrenceUntil}T23:59:59`).toISOString()
        : null,
    };
    const result = editor.id
      ? await updateCalendarEvent(editor.id, payload)
      : await createCalendarEvent(payload);
    if (!result.success) setError(result.error);
    else {
      setEditor(null);
      await load();
    }
    setPending(false);
  }

  async function removeEvent(eventId: string) {
    setPending(true);
    const result = await deleteCalendarEvent(eventId);
    if (!result.success) setError(result.error);
    else {
      setSelected(null);
      await load();
    }
    setPending(false);
  }

  async function duplicateEvent(eventId: string) {
    setPending(true);
    const result = await duplicateCalendarEvent(eventId);
    if (!result.success) setError(result.error);
    else await load();
    setPending(false);
  }

  function moveCursor(direction: number) {
    const next = new Date(cursor);
    if (view === 'month') next.setMonth(next.getMonth() + direction);
    else if (view === 'week') next.setDate(next.getDate() + 7 * direction);
    else next.setDate(next.getDate() + 30 * direction);
    setCursor(next);
  }

  const heading = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(cursor);

  return (
    <section className="min-w-0 space-y-4" aria-labelledby="calendar-title">
      <header className="rounded-2xl border border-white/10 bg-[#17171b] p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sky-300">
              <CalendarDays className="h-5 w-5" />
              <span className="text-xs font-semibold tracking-[0.18em] uppercase">
                Agenda e reuniões
              </span>
            </div>
            <h2
              id="calendar-title"
              className="mt-1 text-xl font-semibold text-white"
            >
              Calendário
            </h2>
            <p className="mt-1 text-sm text-[#9c9ca6] capitalize">
              {heading}
              {organization ? ` · ${organization.name}` : ' · Pessoal'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCursor(new Date())}
              className="min-h-11 rounded-xl border border-white/10 px-3 text-sm text-white hover:bg-white/[0.06]"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => moveCursor(-1)}
              aria-label="Período anterior"
              className="min-h-11 min-w-11 rounded-xl border border-white/10 text-white"
            >
              <ChevronLeft className="mx-auto h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => moveCursor(1)}
              aria-label="Próximo período"
              className="min-h-11 min-w-11 rounded-xl border border-white/10 text-white"
            >
              <ChevronRight className="mx-auto h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setEditor(newDraft(new Date(), organization?.id))}
              className="min-h-11 rounded-xl bg-sky-500 px-4 text-sm font-semibold text-white hover:bg-sky-400"
            >
              <Plus className="mr-2 inline h-4 w-4" />
              Novo evento
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Visualização do calendário"
          >
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={view === option}
                onClick={() => setView(option)}
                className={`min-h-10 rounded-xl px-3 text-sm font-medium ${view === option ? 'bg-white text-black' : 'border border-white/10 text-[#c0c0c8]'}`}
              >
                {option === 'month'
                  ? 'Mês'
                  : option === 'week'
                    ? 'Semana'
                    : 'Agenda'}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative min-w-52">
              <span className="sr-only">Pesquisar eventos</span>
              <Search className="pointer-events-none absolute top-3 left-3 h-4 w-4 text-[#777780]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar eventos"
                className="min-h-10 w-full rounded-xl border border-white/10 bg-[#202026] pr-3 pl-9 text-sm text-white outline-none focus:border-sky-400"
              />
            </label>
            <select
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as CalendarFilter)
              }
              aria-label="Filtrar calendário"
              className="min-h-10 rounded-xl border border-white/10 bg-[#202026] px-3 text-sm text-white"
            >
              {FILTERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && (
          <div
            role="alert"
            className="mt-4 flex justify-between gap-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-100"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Fechar erro"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </header>

      <div className="rounded-2xl border border-white/10 bg-[#17171b] p-2 sm:p-4">
        {loading ? (
          <div className="flex min-h-96 items-center justify-center">
            <Loader2
              className="h-6 w-6 animate-spin text-sky-300"
              aria-label="Carregando calendário"
            />
          </div>
        ) : view === 'month' ? (
          <MonthView
            range={visibleRange}
            cursor={cursor}
            events={events}
            onCreate={(date) => setEditor(newDraft(date, organization?.id))}
            onSelect={setSelected}
          />
        ) : view === 'week' ? (
          <WeekView
            range={visibleRange}
            events={events}
            onCreate={(date) => setEditor(newDraft(date, organization?.id))}
            onSelect={setSelected}
          />
        ) : (
          <AgendaView events={events} onSelect={setSelected} />
        )}
      </div>

      {editor && options && (
        <EventEditor
          draft={editor}
          options={options}
          activeOrganizationId={organization?.id || null}
          pending={pending}
          onChange={setEditor}
          onCancel={() => setEditor(null)}
          onSave={() => void saveEvent()}
        />
      )}
      {selected && (
        <EventDetails
          event={selected}
          userId={userId}
          canManage={
            selected.creatorId === userId ||
            Boolean(
              organization && ['OWNER', 'ADMIN'].includes(organization.role)
            )
          }
          pending={pending}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditor(editDraft(selected));
            setSelected(null);
          }}
          onDelete={() => void removeEvent(selected.id)}
          onDuplicate={() => void duplicateEvent(selected.id)}
          onRespond={async (response) => {
            setPending(true);
            const result = await respondCalendarInvitation(
              selected.id,
              response
            );
            if (!result.success) setError(result.error);
            else {
              setSelected(null);
              await load();
            }
            setPending(false);
          }}
        />
      )}
    </section>
  );
}

function MonthView({
  range,
  cursor,
  events,
  onCreate,
  onSelect,
}: {
  range: { start: Date; end: Date };
  cursor: Date;
  events: CalendarEventView[];
  onCreate: (date: Date) => void;
  onSelect: (event: CalendarEventView) => void;
}) {
  const days = Array.from({ length: 42 }, (_, index) =>
    addDays(range.start, index)
  );
  return (
    <div>
      <div className="grid grid-cols-7 text-center text-[10px] font-semibold tracking-wide text-[#858590] uppercase sm:text-xs">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
          <div key={day} className="py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-white/10">
        {days.map((day) => {
          const key = dateKey(day);
          const dayEvents = events.filter(
            (event) => dateKey(event.occurrenceStartAt) === key
          );
          const currentMonth = day.getMonth() === cursor.getMonth();
          return (
            <div
              key={key}
              className={`min-h-24 border-r border-b border-white/[0.07] p-1 sm:min-h-32 sm:p-2 ${currentMonth ? 'bg-[#1b1b20]' : 'bg-[#151519] text-[#666670]'}`}
            >
              <button
                type="button"
                onClick={() => onCreate(day)}
                className="flex min-h-8 w-full items-center justify-between rounded-md px-1 text-left text-xs font-medium hover:bg-white/[0.06]"
                aria-label={`Criar evento em ${key}`}
              >
                <span>{day.getDate()}</span>
                {key === dateKey(new Date()) && (
                  <span
                    className="h-2 w-2 rounded-full bg-sky-400"
                    aria-label="Hoje"
                  />
                )}
              </button>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    key={event.occurrenceKey}
                    type="button"
                    onClick={() => onSelect(event)}
                    className={`block w-full truncate rounded border px-1 py-1 text-left text-[9px] sm:text-[11px] ${eventTone(event)}`}
                  >
                    <span className="hidden sm:inline">
                      {event.allDay
                        ? ''
                        : new Intl.DateTimeFormat('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          }).format(new Date(event.occurrenceStartAt)) + ' '}
                    </span>
                    {event.title}
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <span className="block px-1 text-[10px] text-[#8f8f99]">
                    +{dayEvents.length - 3}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  range,
  events,
  onCreate,
  onSelect,
}: {
  range: { start: Date; end: Date };
  events: CalendarEventView[];
  onCreate: (date: Date) => void;
  onSelect: (event: CalendarEventView) => void;
}) {
  const days = Array.from({ length: 7 }, (_, index) =>
    addDays(range.start, index)
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
      {days.map((day) => {
        const key = dateKey(day);
        const dayEvents = events.filter(
          (event) => dateKey(event.occurrenceStartAt) === key
        );
        return (
          <section
            key={key}
            className="min-h-44 rounded-xl border border-white/10 bg-[#1b1b20] p-3"
          >
            <button
              type="button"
              onClick={() => onCreate(day)}
              className="w-full rounded-lg py-2 text-left hover:bg-white/[0.05]"
            >
              <span className="block text-xs text-[#8f8f99]">
                {new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(
                  day
                )}
              </span>
              <strong className="text-lg text-white">{day.getDate()}</strong>
            </button>
            <div className="mt-2 space-y-2">
              {dayEvents.map((event) => (
                <button
                  key={event.occurrenceKey}
                  type="button"
                  onClick={() => onSelect(event)}
                  className={`w-full rounded-lg border p-2 text-left text-xs ${eventTone(event)}`}
                >
                  <span className="block font-semibold">{event.title}</span>
                  <span className="mt-1 block opacity-80">
                    {event.allDay
                      ? 'Dia inteiro'
                      : new Intl.DateTimeFormat('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(event.occurrenceStartAt))}
                  </span>
                  <span className="mt-1 block text-[10px] uppercase opacity-70">
                    {eventKind(event)}
                  </span>
                </button>
              ))}
              {!dayEvents.length && (
                <p className="py-6 text-center text-xs text-[#686872]">
                  Sem eventos
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function AgendaView({
  events,
  onSelect,
}: {
  events: CalendarEventView[];
  onSelect: (event: CalendarEventView) => void;
}) {
  const grouped = new Map<string, CalendarEventView[]>();
  for (const event of events) {
    const key = dateKey(event.occurrenceStartAt);
    grouped.set(key, [...(grouped.get(key) || []), event]);
  }
  if (!events.length)
    return (
      <div className="py-20 text-center text-sm text-[#8f8f99]">
        Nenhum evento neste intervalo.
      </div>
    );
  return (
    <div className="space-y-6 p-2">
      {Array.from(grouped.entries()).map(([key, dayEvents]) => (
        <section key={key}>
          <h3 className="mb-2 text-sm font-semibold text-white capitalize">
            {new Intl.DateTimeFormat('pt-BR', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
            }).format(new Date(`${key}T12:00:00`))}
          </h3>
          <div className="space-y-2">
            {dayEvents.map((event) => (
              <button
                key={event.occurrenceKey}
                type="button"
                onClick={() => onSelect(event)}
                className={`flex min-h-16 w-full items-center gap-3 rounded-xl border p-3 text-left ${eventTone(event)}`}
              >
                <div className="w-14 shrink-0 text-center text-xs font-semibold">
                  {event.allDay
                    ? 'Todo dia'
                    : new Intl.DateTimeFormat('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(event.occurrenceStartAt))}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {event.title}
                  </span>
                  <span className="mt-1 block truncate text-xs opacity-75">
                    {eventKind(event)}
                    {event.teams.length
                      ? ` · ${event.teams.map((team) => team.team.name).join(', ')}`
                      : ''}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function EventEditor({
  draft,
  options,
  activeOrganizationId,
  pending,
  onChange,
  onCancel,
  onSave,
}: {
  draft: EditorDraft;
  options: CalendarOptions;
  activeOrganizationId: string | null;
  pending: boolean;
  onChange: (draft: EditorDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const participants = draft.organizationId
    ? options.organizationUsers
    : options.users;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-editor-title"
    >
      <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl border border-white/10 bg-[#17171b] p-4 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3
            id="event-editor-title"
            className="text-lg font-semibold text-white"
          >
            {draft.id ? 'Editar evento' : 'Novo evento'}
          </h3>
          <button type="button" onClick={onCancel} aria-label="Fechar">
            <X className="h-5 w-5 text-[#aaaab4]" />
          </button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Título" className="md:col-span-2">
            <input
              value={draft.title}
              onChange={(event) =>
                onChange({ ...draft, title: event.target.value })
              }
              className="input-calendar"
            />
          </Field>
          <Field label="Tipo">
            <select
              value={draft.type}
              onChange={(event) =>
                onChange({
                  ...draft,
                  type: event.target.value as EditorDraft['type'],
                })
              }
              className="input-calendar"
            >
              <option value="EVENT">Evento</option>
              <option value="MEETING">Reunião</option>
              <option value="REMINDER">Lembrete</option>
              <option value="FOCUS">Foco</option>
            </select>
          </Field>
          <Field label="Escopo">
            <select
              value={draft.organizationId ? 'organization' : 'personal'}
              onChange={(event) =>
                onChange({
                  ...draft,
                  organizationId:
                    event.target.value === 'organization'
                      ? activeOrganizationId
                      : null,
                  visibility: 'INVITE_ONLY',
                  teamIds: [],
                  projectId:
                    event.target.value === 'organization'
                      ? null
                      : draft.projectId,
                })
              }
              className="input-calendar"
            >
              <option value="personal">Pessoal</option>
              {activeOrganizationId && (
                <option value="organization">Organização ativa</option>
              )}
            </select>
          </Field>
          <Field label="Início">
            <input
              type="datetime-local"
              value={draft.startAt}
              onChange={(event) =>
                onChange({ ...draft, startAt: event.target.value })
              }
              className="input-calendar"
            />
          </Field>
          <Field label="Término">
            <input
              type="datetime-local"
              value={draft.endAt}
              onChange={(event) =>
                onChange({ ...draft, endAt: event.target.value })
              }
              className="input-calendar"
            />
          </Field>
          <Field label="Timezone">
            <input
              value={draft.timezone}
              onChange={(event) =>
                onChange({ ...draft, timezone: event.target.value })
              }
              className="input-calendar"
            />
          </Field>
          {draft.organizationId && (
            <Field label="Visibilidade">
              <select
                value={draft.visibility}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    visibility: event.target.value as EditorDraft['visibility'],
                    teamIds:
                      event.target.value === 'TEAMS' ? draft.teamIds : [],
                  })
                }
                className="input-calendar"
              >
                <option value="INVITE_ONLY">Somente convidados</option>
                <option value="ORGANIZATION">Toda organização</option>
                <option value="TEAMS">Equipes selecionadas</option>
              </select>
            </Field>
          )}
          <Field label="Local">
            <input
              value={draft.location || ''}
              onChange={(event) =>
                onChange({ ...draft, location: event.target.value })
              }
              className="input-calendar"
            />
          </Field>
          <Field label="Link da reunião">
            <input
              type="url"
              value={draft.meetingUrl || ''}
              onChange={(event) =>
                onChange({ ...draft, meetingUrl: event.target.value })
              }
              placeholder="https://"
              className="input-calendar"
            />
          </Field>
          <Field label="Descrição" className="md:col-span-2">
            <textarea
              value={draft.description || ''}
              onChange={(event) =>
                onChange({ ...draft, description: event.target.value })
              }
              rows={3}
              className="input-calendar py-2"
            />
          </Field>
          <Field label="Repetir">
            <select
              value={draft.recurrenceFrequency}
              onChange={(event) =>
                onChange({
                  ...draft,
                  recurrenceFrequency: event.target
                    .value as EditorDraft['recurrenceFrequency'],
                })
              }
              className="input-calendar"
            >
              <option value="NONE">Não repetir</option>
              <option value="DAILY">Todos os dias</option>
              <option value="WEEKLY">Toda semana / dias específicos</option>
              <option value="MONTHLY">Todo mês</option>
            </select>
          </Field>
          {draft.recurrenceFrequency !== 'NONE' && (
            <Field label="Até">
              <input
                type="date"
                value={draft.recurrenceUntil || ''}
                onChange={(event) =>
                  onChange({
                    ...draft,
                    recurrenceUntil: event.target.value || null,
                  })
                }
                className="input-calendar"
              />
            </Field>
          )}
          {draft.recurrenceFrequency === 'WEEKLY' && (
            <fieldset className="md:col-span-2">
              <legend className="text-xs font-medium text-[#b7b7c0]">
                Dias específicos
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(
                  (label, weekday) => {
                    const checked =
                      draft.recurrenceWeekdays?.includes(weekday) || false;
                    return (
                      <label
                        key={label}
                        className={`min-h-10 cursor-pointer rounded-xl border px-3 py-2 text-sm ${checked ? 'border-sky-400 bg-sky-500/15 text-white' : 'border-white/10 text-[#aaaab4]'}`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() =>
                            onChange({
                              ...draft,
                              recurrenceWeekdays: checked
                                ? draft.recurrenceWeekdays?.filter(
                                    (value) => value !== weekday
                                  )
                                : [
                                    ...(draft.recurrenceWeekdays || []),
                                    weekday,
                                  ],
                            })
                          }
                        />
                        {label}
                      </label>
                    );
                  }
                )}
              </div>
            </fieldset>
          )}
          {draft.visibility === 'TEAMS' && (
            <ChoiceList
              label="Equipes"
              options={options.teams.map((team) => ({
                id: team.id,
                label: team.name,
              }))}
              selected={draft.teamIds || []}
              onChange={(teamIds) => onChange({ ...draft, teamIds })}
            />
          )}
          <ChoiceList
            label="Participantes"
            options={participants.map((person) => ({
              id: person.id,
              label: `${person.name || person.username} · @${person.username}`,
            }))}
            selected={draft.participantIds || []}
            onChange={(participantIds) =>
              onChange({ ...draft, participantIds })
            }
          />
          <Field label="Vincular Task">
            <select
              value={draft.taskId || ''}
              onChange={(event) =>
                onChange({ ...draft, taskId: event.target.value || null })
              }
              className="input-calendar"
            >
              <option value="">Nenhuma</option>
              {options.tasks
                .filter((task) =>
                  draft.organizationId
                    ? task.organizationId === draft.organizationId
                    : task.organizationId === null
                )
                .map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
            </select>
          </Field>
          {draft.organizationId ? (
            <Field label="Vincular Ticket">
              <select
                value={draft.ticketId || ''}
                onChange={(event) =>
                  onChange({ ...draft, ticketId: event.target.value || null })
                }
                className="input-calendar"
              >
                <option value="">Nenhum</option>
                {options.tickets.map((ticket) => (
                  <option key={ticket.id} value={ticket.id}>
                    {ticket.title}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Vincular Projeto">
              <select
                value={draft.projectId || ''}
                onChange={(event) =>
                  onChange({ ...draft, projectId: event.target.value || null })
                }
                className="input-calendar"
              >
                <option value="">Nenhum</option>
                {options.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
        <label className="mt-4 flex min-h-10 items-center gap-2 text-sm text-[#c0c0c8]">
          <input
            type="checkbox"
            checked={Boolean(draft.allDay)}
            onChange={(event) =>
              onChange({ ...draft, allDay: event.target.checked })
            }
            className="h-4 w-4 accent-sky-500"
          />
          Evento de dia inteiro
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-white/10 px-4 text-sm text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending || draft.title.trim().length < 2}
            onClick={onSave}
            className="min-h-11 rounded-xl bg-sky-500 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="mr-2 inline h-4 w-4" />
                Salvar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`grid gap-1 text-xs font-medium text-[#b7b7c0] ${className || ''}`}
    >
      {label}
      {children}
    </label>
  );
}

function ChoiceList({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <fieldset className="md:col-span-2">
      <legend className="text-xs font-medium text-[#b7b7c0]">{label}</legend>
      <div className="mt-2 max-h-36 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-[#202026] p-2">
        {options.length ? (
          options.map((option) => {
            const checked = selected.includes(option.id);
            return (
              <label
                key={option.id}
                className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-white hover:bg-white/[0.05]"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onChange(
                      checked
                        ? selected.filter((id) => id !== option.id)
                        : [...selected, option.id]
                    )
                  }
                  className="h-4 w-4 accent-sky-500"
                />
                <span className="truncate">{option.label}</span>
              </label>
            );
          })
        ) : (
          <p className="px-2 py-3 text-sm text-[#858590]">
            Nenhuma opção disponível.
          </p>
        )}
      </div>
    </fieldset>
  );
}

function EventDetails({
  event,
  userId,
  canManage,
  pending,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  onRespond,
}: {
  event: CalendarEventView;
  userId: string;
  canManage: boolean;
  pending: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRespond: (response: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE') => void;
}) {
  const participant = event.participants.find((item) => item.userId === userId);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-details-title"
    >
      <article className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-white/10 bg-[#17171b] p-5 sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span
              className={`inline-flex rounded-full border px-2 py-1 text-xs ${eventTone(event)}`}
            >
              {eventKind(event)}
            </span>
            <h3
              id="event-details-title"
              className="mt-3 text-xl font-semibold text-white"
            >
              {event.title}
            </h3>
            <p className="mt-1 text-sm text-[#9c9ca6]">
              Criado por {event.creator.name || `@${event.creator.username}`}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5 text-[#aaaab4]" />
          </button>
        </div>
        <div className="mt-5 space-y-3 text-sm text-[#c4c4cc]">
          <p className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-sky-300" />
            {new Intl.DateTimeFormat('pt-BR', {
              dateStyle: 'full',
              timeStyle: event.allDay ? undefined : 'short',
            }).format(new Date(event.occurrenceStartAt))}
          </p>
          {event.location && (
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sky-300" />
              {event.location}
            </p>
          )}
          {event.meetingUrl && (
            <a
              href={event.meetingUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-sky-300 underline underline-offset-4"
            >
              <Video className="h-4 w-4" />
              Abrir reunião
            </a>
          )}
          {event.description && (
            <p className="rounded-xl bg-white/[0.04] p-3 whitespace-pre-wrap">
              {event.description}
            </p>
          )}
          <p className="flex items-center gap-2">
            <Users className="h-4 w-4 text-sky-300" />
            {event.participants.length} participante(s)
            {event.teams.length
              ? ` · ${event.teams.map((team) => team.team.name).join(', ')}`
              : ''}
          </p>
          {(event.task || event.ticket || event.project) && (
            <p className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-sky-300" />
              {event.task?.title || event.ticket?.title || event.project?.title}
            </p>
          )}
        </div>
        {participant && (
          <div className="mt-5 rounded-xl border border-white/10 p-3">
            <p className="text-sm text-[#c4c4cc]">
              Sua resposta: {participant.response}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => onRespond('ACCEPTED')}
                className="min-h-10 rounded-lg bg-emerald-500/20 px-3 text-sm text-emerald-100"
              >
                Aceitar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => onRespond('TENTATIVE')}
                className="min-h-10 rounded-lg bg-amber-500/20 px-3 text-sm text-amber-100"
              >
                Talvez
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => onRespond('DECLINED')}
                className="min-h-10 rounded-lg bg-red-500/20 px-3 text-sm text-red-100"
              >
                Recusar
              </button>
            </div>
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onDuplicate}
            className="min-h-10 rounded-lg border border-white/10 px-3 text-sm text-white"
          >
            <Copy className="mr-2 inline h-4 w-4" />
            Duplicar
          </button>
          {canManage && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={onEdit}
                className="min-h-10 rounded-lg border border-white/10 px-3 text-sm text-white"
              >
                <Edit3 className="mr-2 inline h-4 w-4" />
                Editar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={onDelete}
                className="min-h-10 rounded-lg border border-red-400/20 px-3 text-sm text-red-200"
              >
                <Trash2 className="mr-2 inline h-4 w-4" />
                Excluir
              </button>
            </>
          )}
        </div>
      </article>
    </div>
  );
}
