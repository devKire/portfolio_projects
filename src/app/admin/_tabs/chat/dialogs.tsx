'use client';

import {
  CalendarDays,
  Check,
  FileText,
  Hash,
  Loader2,
  Search,
  TicketCheck,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import {
  createChatChannel,
  getChatShareOptions,
  getOrCreateDirectConversation,
  type ChatChannelInput,
} from '@/app/actions/chat';
import {
  createCalendarEvent,
  getUpcomingCalendarEvents,
} from '@/app/actions/calendar';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type {
  ChatChannelDTO,
  ChatMessageDTO,
  ChatWorkspaceDTO,
} from '@/lib/chat/types';

import { personLabel } from './client';
import type { ComposerSharedResource } from './message-composer';

type ChannelDraft = {
  name: string;
  description: string;
  type: 'ORGANIZATION' | 'TEAM' | 'PRIVATE';
  teamId: string;
  memberIds: string[];
};

export function NewChannelSheet({
  open,
  workspace,
  onClose,
  onCreated,
}: {
  open: boolean;
  workspace: ChatWorkspaceDTO;
  onClose: () => void;
  onCreated: (channelId: string) => void;
}) {
  const [draft, setDraft] = useState<ChannelDraft>({
    name: '',
    description: '',
    type: 'ORGANIZATION',
    teamId: '',
    memberIds: [],
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    setPending(true);
    setError(null);
    const input: ChatChannelInput = {
      organizationId: workspace.organization.id,
      name: draft.name,
      description: draft.description,
      type: draft.type,
      teamId: draft.type === 'TEAM' ? draft.teamId : null,
      memberIds: draft.type === 'PRIVATE' ? draft.memberIds : [],
    };
    const result = await createChatChannel(input);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setDraft({
      name: '',
      description: '',
      type: 'ORGANIZATION',
      teamId: '',
      memberIds: [],
    });
    onCreated(result.data.id);
  }
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Novo canal</SheetTitle>
          <SheetDescription>
            Crie um espaço com acesso derivado da organização, equipe ou membros
            selecionados.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          <label className="block text-sm font-medium">
            Nome
            <input
              value={draft.name}
              onChange={(event) =>
                setDraft((value) => ({ ...value, name: event.target.value }))
              }
              className="mt-1 h-9 w-full rounded-lg border border-zinc-300 bg-transparent px-3 outline-none focus:border-violet-500 dark:border-zinc-700"
            />
          </label>
          <label className="block text-sm font-medium">
            Descrição
            <textarea
              value={draft.description}
              onChange={(event) =>
                setDraft((value) => ({
                  ...value,
                  description: event.target.value,
                }))
              }
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent p-3 outline-none focus:border-violet-500 dark:border-zinc-700"
            />
          </label>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Tipo</legend>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['ORGANIZATION', Hash, 'Organização'],
                  ['TEAM', Users, 'Equipe'],
                  ['PRIVATE', Check, 'Privado'],
                ] as const
              ).map(([type, Icon, label]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDraft((value) => ({ ...value, type }))}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs ${draft.type === type ? 'border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-200' : 'border-zinc-200 dark:border-zinc-700'}`}
                >
                  <Icon className="size-4" />
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          {draft.type === 'TEAM' ? (
            <label className="block text-sm font-medium">
              Equipe
              <select
                value={draft.teamId}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    teamId: event.target.value,
                  }))
                }
                className="mt-1 h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">Selecione</option>
                {workspace.teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {draft.type === 'PRIVATE' ? (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Membros</legend>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">
                {workspace.members.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  >
                    <input
                      type="checkbox"
                      checked={draft.memberIds.includes(member.id)}
                      onChange={() =>
                        setDraft((value) => ({
                          ...value,
                          memberIds: value.memberIds.includes(member.id)
                            ? value.memberIds.filter((id) => id !== member.id)
                            : [...value.memberIds, member.id],
                        }))
                      }
                    />
                    {personLabel(member)}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={
                pending ||
                !draft.name.trim() ||
                (draft.type === 'TEAM' && !draft.teamId)
              }
            >
              {pending ? <Loader2 className="animate-spin" /> : null} Criar
              canal
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function NewDirectSheet({
  open,
  workspace,
  currentUserId,
  onClose,
  onCreated,
}: {
  open: boolean;
  workspace: ChatWorkspaceDTO;
  currentUserId: string;
  onClose: () => void;
  onCreated: (channelId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const members = useMemo(
    () =>
      workspace.members.filter(
        (member) =>
          member.id !== currentUserId &&
          `${member.name || ''} ${member.username} ${member.email || ''}`
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [currentUserId, query, workspace.members]
  );
  async function openDirect(userId: string) {
    setPendingId(userId);
    setError(null);
    const result = await getOrCreateDirectConversation(
      workspace.organization.id,
      userId
    );
    setPendingId(null);
    if (result.success) onCreated(result.data.id);
    else setError(result.error);
  }
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Nova conversa direta</SheetTitle>
          <SheetDescription>
            Somente usuários que compartilham esta organização.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <label className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 px-2.5 dark:border-zinc-700">
            <Search className="size-4 text-zinc-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nome, username ou email"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
          <div className="mt-3 space-y-1">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => void openDirect(member.id)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-violet-500/15 text-xs font-semibold text-violet-700 dark:text-violet-200">
                  {(member.name || member.username).slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {personLabel(member)}
                  </span>
                  <span className="block truncate text-xs text-zinc-500">
                    @{member.username}
                  </span>
                </span>
                {pendingId === member.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

type ResourceOption = ComposerSharedResource & { detail: string };

export function ResourcePickerSheet({
  open,
  workspace,
  onClose,
  onSelect,
}: {
  open: boolean;
  workspace: ChatWorkspaceDTO;
  onClose: () => void;
  onSelect: (resource: ComposerSharedResource) => void;
}) {
  const [options, setOptions] = useState<ResourceOption[]>([]);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'ALL' | ComposerSharedResource['type']>(
    'ALL'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    void Promise.all([
      getUpcomingCalendarEvents(workspace.organization.id, 20),
      getChatShareOptions(workspace.organization.id),
    ]).then(([events, resources]) => {
      if (!events.success) setError(events.error);
      else if (!resources.success) setError(resources.error);
      else {
        setOptions([
          ...events.data.map((event) => ({
            type: 'CALENDAR_EVENT' as const,
            id: event.id,
            title: event.title,
            detail: new Intl.DateTimeFormat('pt-BR', {
              dateStyle: 'short',
              timeStyle: 'short',
            }).format(new Date(event.occurrenceStartAt)),
          })),
          ...resources.data.tasks.map((task) => ({
            type: 'TASK' as const,
            id: task.id,
            title: task.title,
            detail: `${task.status} · ${task.priority}`,
          })),
          ...resources.data.tickets.map((ticket) => ({
            type: 'TICKET' as const,
            id: ticket.id,
            title: ticket.title,
            detail: `${ticket.status} · ${ticket.priority}`,
          })),
          ...resources.data.notes.map((note) => ({
            type: 'KCS' as const,
            id: note.id,
            title: note.title,
            detail: note.folderPath || 'KCS',
          })),
        ]);
      }
      setLoading(false);
    });
  }, [open, workspace.organization.id]);
  const filtered = options.filter(
    (option) =>
      (type === 'ALL' || option.type === type) &&
      `${option.title} ${option.detail}`
        .toLowerCase()
        .includes(query.toLowerCase())
  );
  const icons = {
    CALENDAR_EVENT: CalendarDays,
    TASK: Check,
    TICKET: TicketCheck,
    KCS: FileText,
  };
  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Compartilhar recurso</SheetTitle>
          <SheetDescription>
            O servidor valida se toda a audiência da conversa pode visualizar o
            recurso.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-3 px-4 pb-6">
          <label className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 px-2.5 dark:border-zinc-700">
            <Search className="size-4 text-zinc-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar evento, task, chamado ou KCS"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <div className="flex gap-1 overflow-x-auto">
            {(['ALL', 'CALENDAR_EVENT', 'TASK', 'TICKET', 'KCS'] as const).map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setType(item)}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${type === item ? 'border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-200' : 'border-zinc-200 dark:border-zinc-700'}`}
                >
                  {item === 'ALL'
                    ? 'Todos'
                    : item === 'CALENDAR_EVENT'
                      ? 'Eventos'
                      : item === 'TASK'
                        ? 'Tasks'
                        : item === 'TICKET'
                          ? 'Chamados'
                          : 'KCS'}
                </button>
              )
            )}
          </div>
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="size-4 animate-spin" /> Carregando...
            </p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="space-y-1">
            {filtered.map((option) => {
              const Icon = icons[option.type];
              return (
                <button
                  key={`${option.type}:${option.id}`}
                  type="button"
                  onClick={() => {
                    onSelect(option);
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left hover:border-violet-300 hover:bg-violet-50/50 dark:hover:border-violet-700 dark:hover:bg-violet-950/20"
                >
                  <span className="rounded-lg bg-violet-500/10 p-2 text-violet-600 dark:text-violet-300">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {option.title}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      {option.detail}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function localDateTime(value: Date) {
  const copy = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return copy.toISOString().slice(0, 16);
}

export function CreateEventFromMessageSheet({
  message,
  channel,
  currentUserId,
  onClose,
  onCreated,
}: {
  message: ChatMessageDTO | null;
  channel: ChatChannelDTO;
  currentUserId: string;
  onClose: () => void;
  onCreated: (resource: ComposerSharedResource) => void;
}) {
  const nextHour = new Date();
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState(localDateTime(nextHour));
  const [endAt, setEndAt] = useState(
    localDateTime(new Date(nextHour.getTime() + 60 * 60 * 1000))
  );
  const [meetingUrl, setMeetingUrl] = useState('');
  const [share, setShare] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    setTitle((message.content || 'Reunião de acompanhamento').slice(0, 120));
    setDescription(message.content);
  }, [message]);
  async function submit() {
    setPending(true);
    setError(null);
    const visibility =
      channel.type === 'ORGANIZATION'
        ? 'ORGANIZATION'
        : channel.type === 'TEAM'
          ? 'TEAMS'
          : 'INVITE_ONLY';
    const result = await createCalendarEvent({
      title,
      description,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      organizationId: channel.organizationId,
      meetingUrl,
      type: 'MEETING',
      visibility,
      teamIds:
        channel.type === 'TEAM' && channel.teamId ? [channel.teamId] : [],
      participantIds: ['PRIVATE', 'DIRECT'].includes(channel.type)
        ? channel.members
            .map((member) => member.id)
            .filter((id) => id !== currentUserId)
        : [],
    });
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    if (share)
      onCreated({
        type: 'CALENDAR_EVENT',
        id: result.data.id,
        title: result.data.title,
      });
    onClose();
  }
  return (
    <Sheet open={Boolean(message)} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Criar reunião</SheetTitle>
          <SheetDescription>
            Revise os dados antes de salvar no calendário.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          <label className="block text-sm font-medium">
            Título
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 h-9 w-full rounded-lg border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
            />
          </label>
          <label className="block text-sm font-medium">
            Descrição
            <textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-transparent p-3 dark:border-zinc-700"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm font-medium">
              Início
              <input
                type="datetime-local"
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-zinc-300 bg-transparent px-2 text-xs dark:border-zinc-700"
              />
            </label>
            <label className="text-sm font-medium">
              Fim
              <input
                type="datetime-local"
                value={endAt}
                onChange={(event) => setEndAt(event.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-zinc-300 bg-transparent px-2 text-xs dark:border-zinc-700"
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Link da reunião
            <input
              type="url"
              value={meetingUrl}
              onChange={(event) => setMeetingUrl(event.target.value)}
              placeholder="https://meet.google.com/..."
              className="mt-1 h-9 w-full rounded-lg border border-zinc-300 bg-transparent px-3 dark:border-zinc-700"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={share}
              onChange={(event) => setShare(event.target.checked)}
            />{' '}
            Compartilhar o evento nesta conversa
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={pending || !title.trim() || !startAt || !endAt}
            >
              {pending ? <Loader2 className="animate-spin" /> : null} Criar
              reunião
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
