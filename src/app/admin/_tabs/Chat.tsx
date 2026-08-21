'use client';

import {
  Archive,
  CalendarPlus,
  Check,
  ChevronLeft,
  Hash,
  Loader2,
  Lock,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Reply,
  Send,
  Share2,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  createChatChannel,
  deleteChatMessage,
  editChatMessage,
  getChatMessages,
  getChatWorkspace,
  getOrCreateDirectConversation,
  markChatChannelRead,
  sendChatMessage,
  type ChatChannelInput,
} from '@/app/actions/chat';
import {
  createCalendarEvent,
  getUpcomingCalendarEvents,
} from '@/app/actions/calendar';
import type { OrganizationContext } from '@/lib/organizations/context';

type OrganizationSummary = OrganizationContext['organizations'][number];

type Person = {
  id: string;
  name: string | null;
  username: string;
  email: string;
};

type Channel = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  type: 'ORGANIZATION' | 'TEAM' | 'PRIVATE' | 'DIRECT';
  teamId: string | null;
  team: { id: string; name: string; active: boolean } | null;
  members: Person[];
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; name: string | null; username: string };
  } | null;
  unreadCount: number;
};

type Workspace = {
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  canCreateChannel: boolean;
  channels: Channel[];
  members: Person[];
  teams: { id: string; name: string }[];
  unreadCount: number;
};

type Message = {
  id: string;
  channelId: string;
  organizationId: string;
  authorId: string;
  content: string;
  replyToId: string | null;
  eventId: string | null;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  author: { id: string; name: string | null; username: string };
  replyTo: {
    id: string;
    content: string;
    deletedAt: string | null;
    author: { id: string; name: string | null; username: string };
  } | null;
  event: {
    id: string;
    title: string;
    startAt: string;
    endAt: string;
    allDay: boolean;
    timezone: string;
    type: string;
    organizationId: string | null;
  } | null;
  _count: { replies: number };
};

type ShareableEvent = {
  id: string;
  title: string;
  occurrenceStartAt: string;
  occurrenceEndAt: string;
  type: string;
};

type ChannelDraft = {
  name: string;
  description: string;
  type: 'ORGANIZATION' | 'TEAM' | 'PRIVATE';
  teamId: string;
  memberIds: string[];
};

type EventDraft = {
  message: Message;
  title: string;
  startAt: string;
  endAt: string;
};

function toLocalInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function channelIcon(type: Channel['type']) {
  if (type === 'PRIVATE') return Lock;
  if (type === 'DIRECT') return MessageCircle;
  if (type === 'TEAM') return Users;
  return Hash;
}

function channelLabel(type: Channel['type']) {
  if (type === 'PRIVATE') return 'Privado';
  if (type === 'DIRECT') return 'Conversa direta';
  if (type === 'TEAM') return 'Equipe';
  return 'Organização';
}

export default function Chat({
  userId,
  organization,
}: {
  userId: string;
  organization: OrganizationSummary | null;
}) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [showChannels, setShowChannels] = useState(true);
  const [channelDraft, setChannelDraft] = useState<ChannelDraft | null>(null);
  const [showDm, setShowDm] = useState(false);
  const [shareEvents, setShareEvents] = useState<ShareableEvent[] | null>(null);
  const [eventDraft, setEventDraft] = useState<EventDraft | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeChannel = useMemo(
    () => workspace?.channels.find((channel) => channel.id === activeChannelId),
    [activeChannelId, workspace]
  );

  const loadWorkspace = useCallback(
    async (preserveChannel = true) => {
      if (!organization) {
        setWorkspace(null);
        setActiveChannelId(null);
        setLoadingWorkspace(false);
        return;
      }
      const result = await getChatWorkspace(organization.id);
      if (!result.success) {
        setError(result.error);
        setLoadingWorkspace(false);
        return;
      }
      const next = result.data as Workspace;
      setWorkspace(next);
      setActiveChannelId((current) => {
        if (
          preserveChannel &&
          next.channels.some((channel) => channel.id === current)
        ) {
          return current;
        }
        return next.channels[0]?.id || null;
      });
      setLoadingWorkspace(false);
    },
    [organization]
  );

  const loadMessages = useCallback(
    async (options: { older?: boolean; silent?: boolean } = {}) => {
      if (!organization || !activeChannelId) return;
      if (!options.silent) setLoadingMessages(true);
      const result = await getChatMessages({
        organizationId: organization.id,
        channelId: activeChannelId,
        cursor: options.older ? cursor : null,
        limit: 40,
      });
      if (!result.success) {
        setError(result.error);
      } else {
        const next = result.data.messages as Message[];
        setMessages((current) => {
          const merged = options.older
            ? [...next, ...current]
            : [...current, ...next];
          return Array.from(
            new Map(merged.map((message) => [message.id, message])).values()
          ).sort(
            (left, right) =>
              new Date(left.createdAt).getTime() -
              new Date(right.createdAt).getTime()
          );
        });
        setCursor((current) =>
          options.older
            ? result.data.nextCursor
            : (current ?? result.data.nextCursor)
        );
        await markChatChannelRead(activeChannelId);
        if (!options.older) void loadWorkspace(true);
      }
      if (!options.silent) setLoadingMessages(false);
    },
    [activeChannelId, cursor, loadWorkspace, organization]
  );

  useEffect(() => {
    setLoadingWorkspace(true);
    void loadWorkspace(false);
  }, [loadWorkspace]);

  useEffect(() => {
    setMessages([]);
    setCursor(null);
    setReplyTo(null);
    setEditing(null);
    if (activeChannelId) void loadMessages();
  }, [activeChannelId]);

  useEffect(() => {
    if (!activeChannelId) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadMessages({ silent: true });
      }
    }, 4_000);
    return () => window.clearInterval(interval);
  }, [activeChannelId, loadMessages]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadWorkspace(true);
    }, 12_000);
    return () => window.clearInterval(interval);
  }, [loadWorkspace]);

  useEffect(() => {
    if (!loadingMessages) {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [loadingMessages, messages.length]);

  async function submitMessage() {
    if (!organization || !activeChannelId) return;
    setPending(true);
    setError(null);
    if (editing) {
      const result = await editChatMessage(editing.id, content);
      if (!result.success) setError(result.error);
      else {
        setEditing(null);
        setContent('');
        await loadMessages({ silent: true });
      }
    } else {
      const result = await sendChatMessage({
        organizationId: organization.id,
        channelId: activeChannelId,
        content,
        replyToId: replyTo?.id || null,
      });
      if (!result.success) setError(result.error);
      else {
        setMessages((current) => [...current, result.data as Message]);
        setContent('');
        setReplyTo(null);
      }
    }
    setPending(false);
  }

  async function createChannel() {
    if (!organization || !channelDraft) return;
    setPending(true);
    const input: ChatChannelInput = {
      organizationId: organization.id,
      name: channelDraft.name,
      description: channelDraft.description,
      type: channelDraft.type,
      teamId: channelDraft.teamId || null,
      memberIds: channelDraft.memberIds,
    };
    const result = await createChatChannel(input);
    if (!result.success) setError(result.error);
    else {
      setChannelDraft(null);
      await loadWorkspace(false);
    }
    setPending(false);
  }

  async function openDm(targetUserId: string) {
    if (!organization) return;
    setPending(true);
    const result = await getOrCreateDirectConversation(
      organization.id,
      targetUserId
    );
    if (!result.success) setError(result.error);
    else {
      await loadWorkspace(true);
      setActiveChannelId(result.data.id);
      setShowDm(false);
      setShowChannels(false);
    }
    setPending(false);
  }

  async function shareEvent(eventId: string) {
    if (!organization || !activeChannelId) return;
    setPending(true);
    const result = await sendChatMessage({
      organizationId: organization.id,
      channelId: activeChannelId,
      content: 'Evento compartilhado',
      eventId,
    });
    if (!result.success) setError(result.error);
    else {
      setMessages((current) => [...current, result.data as Message]);
      setShareEvents(null);
    }
    setPending(false);
  }

  async function openShareEvents() {
    if (!organization) return;
    const result = await getUpcomingCalendarEvents(organization.id, 20);
    if (!result.success) setError(result.error);
    else setShareEvents(result.data as ShareableEvent[]);
  }

  async function createEventFromMessage() {
    if (!organization || !activeChannel || !eventDraft) return;
    setPending(true);
    const visibility =
      activeChannel.type === 'ORGANIZATION'
        ? 'ORGANIZATION'
        : activeChannel.type === 'TEAM'
          ? 'TEAMS'
          : 'INVITE_ONLY';
    const participantIds =
      activeChannel.type === 'PRIVATE' || activeChannel.type === 'DIRECT'
        ? activeChannel.members
            .map((member) => member.id)
            .filter((id) => id !== userId)
        : [];
    const result = await createCalendarEvent({
      title: eventDraft.title,
      description: eventDraft.message.content,
      startAt: new Date(eventDraft.startAt).toISOString(),
      endAt: new Date(eventDraft.endAt).toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      organizationId: organization.id,
      type: 'MEETING',
      visibility,
      participantIds,
      teamIds: activeChannel.teamId ? [activeChannel.teamId] : [],
    });
    if (!result.success) setError(result.error);
    else setEventDraft(null);
    setPending(false);
  }

  if (!organization) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-[#17171b] px-6 py-20 text-center">
        <MessageCircle className="mx-auto h-10 w-10 text-violet-300" />
        <h2 className="mt-4 text-lg font-semibold text-white">
          Chat organizacional
        </h2>
        <p className="mt-2 text-sm text-[#9999a3]">
          Selecione ou crie uma organização para acessar canais e conversas.
        </p>
      </div>
    );
  }

  if (loadingWorkspace) {
    return (
      <div className="flex min-h-96 items-center justify-center rounded-2xl border border-white/10 bg-[#17171b]">
        <Loader2
          className="h-6 w-6 animate-spin text-violet-300"
          aria-label="Carregando Chat"
        />
      </div>
    );
  }

  return (
    <section
      className="flex min-h-[620px] min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#17171b]"
      aria-label={`Chat de ${organization.name}`}
    >
      <aside
        className={`${showChannels ? 'flex' : 'hidden'} w-full shrink-0 flex-col border-r border-white/10 md:flex md:w-80`}
      >
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.16em] text-violet-300 uppercase">
                Chat
              </p>
              <h2 className="truncate font-semibold text-white">
                {organization.name}
              </h2>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setShowDm(true)}
                aria-label="Nova conversa direta"
                className="min-h-10 min-w-10 rounded-lg text-[#c1c1ca] hover:bg-white/[0.06]"
              >
                <UserPlus className="mx-auto h-4 w-4" />
              </button>
              {workspace?.canCreateChannel && (
                <button
                  type="button"
                  onClick={() =>
                    setChannelDraft({
                      name: '',
                      description: '',
                      type: 'ORGANIZATION',
                      teamId: '',
                      memberIds: [],
                    })
                  }
                  aria-label="Novo canal"
                  className="min-h-10 min-w-10 rounded-lg text-[#c1c1ca] hover:bg-white/[0.06]"
                >
                  <Plus className="mx-auto h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
        {error && (
          <div
            role="alert"
            className="m-3 flex justify-between gap-2 rounded-lg bg-red-500/10 p-2 text-xs text-red-100"
          >
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <nav
          className="min-h-0 flex-1 overflow-y-auto p-2"
          aria-label="Canais da organização"
        >
          {workspace?.channels.map((channel) => {
            const Icon = channelIcon(channel.type);
            const active = channel.id === activeChannelId;
            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => {
                  setActiveChannelId(channel.id);
                  setShowChannels(false);
                }}
                className={`mb-1 flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left ${active ? 'bg-violet-500/15 text-white' : 'text-[#b0b0ba] hover:bg-white/[0.05]'}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {channel.name}
                  </span>
                  <span className="block truncate text-[11px] text-[#777780]">
                    {channel.lastMessage
                      ? `${channel.lastMessage.author.name || channel.lastMessage.author.username}: ${channel.lastMessage.content}`
                      : channelLabel(channel.type)}
                  </span>
                </span>
                {channel.unreadCount > 0 && (
                  <span className="min-w-5 rounded-full bg-violet-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
                    {channel.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      <div
        className={`${showChannels ? 'hidden' : 'flex'} min-w-0 flex-1 flex-col md:flex`}
      >
        {activeChannel ? (
          <>
            <header className="flex min-h-16 items-center justify-between gap-3 border-b border-white/10 px-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowChannels(true)}
                  aria-label="Abrir canais"
                  className="min-h-10 min-w-10 rounded-lg text-white md:hidden"
                >
                  <Menu className="mx-auto h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-white">
                    {activeChannel.name}
                  </h3>
                  <p className="truncate text-xs text-[#858590]">
                    {channelLabel(activeChannel.type)}
                    {activeChannel.description
                      ? ` · ${activeChannel.description}`
                      : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void openShareEvents()}
                className="min-h-10 rounded-lg border border-white/10 px-3 text-xs text-white hover:bg-white/[0.05]"
              >
                <Share2 className="mr-2 inline h-4 w-4" />
                Evento
              </button>
            </header>
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5"
            >
              {cursor && (
                <div className="mb-4 text-center">
                  <button
                    type="button"
                    disabled={loadingMessages}
                    onClick={() => void loadMessages({ older: true })}
                    className="min-h-10 rounded-lg border border-white/10 px-3 text-xs text-[#c4c4cc]"
                  >
                    Carregar mensagens anteriores
                  </button>
                </div>
              )}
              {loadingMessages && !messages.length ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-violet-300" />
                </div>
              ) : !messages.length ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <MessageCircle className="h-9 w-9 text-[#666670]" />
                  <p className="mt-3 text-sm text-[#92929c]">
                    Nenhuma mensagem ainda.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => (
                    <MessageRow
                      key={message.id}
                      message={message}
                      own={message.authorId === userId}
                      canModerate={
                        message.authorId === userId ||
                        ['OWNER', 'ADMIN'].includes(workspace?.role || 'MEMBER')
                      }
                      onReply={() => {
                        setReplyTo(
                          message.replyTo
                            ? messages.find(
                                (item) => item.id === message.replyToId
                              ) || message
                            : message
                        );
                        setEditing(null);
                      }}
                      onEdit={() => {
                        setEditing(message);
                        setReplyTo(null);
                        setContent(message.content);
                      }}
                      onDelete={async () => {
                        const result = await deleteChatMessage(message.id);
                        if (!result.success) setError(result.error);
                        else await loadMessages({ silent: true });
                      }}
                      onCreateEvent={() => {
                        const start = new Date();
                        start.setMinutes(
                          Math.ceil(start.getMinutes() / 30) * 30,
                          0,
                          0
                        );
                        const end = new Date(start.getTime() + 60 * 60_000);
                        setEventDraft({
                          message,
                          title: message.content.slice(0, 100),
                          startAt: toLocalInput(start),
                          endAt: toLocalInput(end),
                        });
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
            {(replyTo || editing) && (
              <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-[#b7b7c0]">
                <span className="truncate">
                  {editing
                    ? `Editando: ${editing.content}`
                    : `Respondendo a ${replyTo?.author.name || replyTo?.author.username}: ${replyTo?.content}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setReplyTo(null);
                    setEditing(null);
                    setContent('');
                  }}
                  aria-label="Cancelar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <footer className="border-t border-white/10 p-3 sm:p-4">
              <div className="flex items-end gap-2">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Mensagem</span>
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void submitMessage();
                      }
                    }}
                    rows={2}
                    placeholder="Digite uma mensagem. Use @usuario ou @equipe:nome-da-equipe"
                    className="max-h-36 min-h-12 w-full resize-none rounded-xl border border-white/10 bg-[#202026] px-3 py-2 text-sm text-white outline-none focus:border-violet-400"
                  />
                </label>
                <button
                  type="button"
                  disabled={pending || !content.trim()}
                  onClick={() => void submitMessage()}
                  aria-label={editing ? 'Salvar edição' : 'Enviar mensagem'}
                  className="min-h-12 min-w-12 rounded-xl bg-violet-500 text-white disabled:opacity-40"
                >
                  {pending ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : editing ? (
                    <Check className="mx-auto h-5 w-5" />
                  ) : (
                    <Send className="mx-auto h-5 w-5" />
                  )}
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <MessageCircle className="h-10 w-10 text-[#666670]" />
            <p className="mt-3 text-sm text-[#92929c]">Selecione um canal.</p>
            <button
              type="button"
              onClick={() => setShowChannels(true)}
              className="mt-4 min-h-10 rounded-lg border border-white/10 px-3 text-sm text-white md:hidden"
            >
              Abrir canais
            </button>
          </div>
        )}
      </div>

      {channelDraft && workspace && (
        <ChannelEditor
          draft={channelDraft}
          workspace={workspace}
          pending={pending}
          onChange={setChannelDraft}
          onCancel={() => setChannelDraft(null)}
          onSave={() => void createChannel()}
        />
      )}
      {showDm && workspace && (
        <SimplePicker
          title="Nova conversa direta"
          people={workspace.members.filter((member) => member.id !== userId)}
          pending={pending}
          onClose={() => setShowDm(false)}
          onPick={(id) => void openDm(id)}
        />
      )}
      {shareEvents && (
        <EventPicker
          events={shareEvents}
          pending={pending}
          onClose={() => setShareEvents(null)}
          onPick={(id) => void shareEvent(id)}
        />
      )}
      {eventDraft && (
        <EventFromMessageEditor
          draft={eventDraft}
          pending={pending}
          onChange={setEventDraft}
          onCancel={() => setEventDraft(null)}
          onSave={() => void createEventFromMessage()}
        />
      )}
    </section>
  );
}

function MessageRow({
  message,
  own,
  canModerate,
  onReply,
  onEdit,
  onDelete,
  onCreateEvent,
}: {
  message: Message;
  own: boolean;
  canModerate: boolean;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCreateEvent: () => void;
}) {
  const [menu, setMenu] = useState(false);
  return (
    <article
      className={`group flex gap-3 ${message.replyToId ? 'ml-6 border-l border-white/10 pl-3 sm:ml-12' : ''}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/40 to-sky-500/30 text-xs font-semibold text-white">
        {(message.author.name || message.author.username)
          .slice(0, 2)
          .toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="text-sm text-white">
            {message.author.name || `@${message.author.username}`}
          </strong>
          <time className="text-[11px] text-[#71717b]">
            {new Intl.DateTimeFormat('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              day: '2-digit',
              month: '2-digit',
            }).format(new Date(message.createdAt))}
          </time>
          {message.editedAt && (
            <span className="text-[10px] text-[#71717b]">editada</span>
          )}
        </div>
        {message.replyTo && (
          <div className="mt-1 truncate rounded-lg border-l-2 border-violet-400/50 bg-white/[0.03] px-2 py-1 text-xs text-[#9696a0]">
            {message.replyTo.author.name || message.replyTo.author.username}:{' '}
            {message.replyTo.content}
          </div>
        )}
        <p
          className={`mt-1 text-sm break-words whitespace-pre-wrap ${message.deletedAt ? 'text-[#777780] italic' : 'text-[#d0d0d7]'}`}
        >
          {message.content}
        </p>
        {message.event && (
          <div className="mt-2 rounded-xl border border-sky-400/20 bg-sky-500/10 p-3">
            <div className="flex items-center gap-2 text-sky-200">
              <CalendarPlus className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase">
                Evento compartilhado
              </span>
            </div>
            <p className="mt-2 font-semibold text-white">
              {message.event.title}
            </p>
            <p className="mt-1 text-xs text-[#b7dff0]">
              {new Intl.DateTimeFormat('pt-BR', {
                dateStyle: 'medium',
                timeStyle: message.event.allDay ? undefined : 'short',
              }).format(new Date(message.event.startAt))}
            </p>
          </div>
        )}
        <div className="mt-1 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={onReply}
            aria-label="Responder"
            className="min-h-8 min-w-8 rounded-lg text-[#91919b] hover:bg-white/[0.06] hover:text-white"
          >
            <Reply className="mx-auto h-3.5 w-3.5" />
          </button>
          {!message.deletedAt && (
            <button
              type="button"
              onClick={onCreateEvent}
              aria-label="Criar evento a partir da mensagem"
              className="min-h-8 min-w-8 rounded-lg text-[#91919b] hover:bg-white/[0.06] hover:text-white"
            >
              <CalendarPlus className="mx-auto h-3.5 w-3.5" />
            </button>
          )}
          {(own || canModerate) && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenu((value) => !value)}
                aria-label="Mais opções"
                className="min-h-8 min-w-8 rounded-lg text-[#91919b] hover:bg-white/[0.06] hover:text-white"
              >
                <MoreHorizontal className="mx-auto h-4 w-4" />
              </button>
              {menu && (
                <div className="absolute bottom-9 left-0 z-10 min-w-32 rounded-lg border border-white/10 bg-[#25252b] p-1 shadow-xl">
                  {own && !message.deletedAt && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenu(false);
                        onEdit();
                      }}
                      className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-white hover:bg-white/[0.06]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false);
                      onDelete();
                    }}
                    className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-xs text-red-200 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir
                  </button>
                </div>
              )}
            </div>
          )}{' '}
          {message._count.replies > 0 && (
            <span className="text-[10px] text-[#777780]">
              {message._count.replies} resposta(s)
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function ChannelEditor({
  draft,
  workspace,
  pending,
  onChange,
  onCancel,
  onSave,
}: {
  draft: ChannelDraft;
  workspace: Workspace;
  pending: boolean;
  onChange: (draft: ChannelDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <Modal title="Novo canal" onClose={onCancel}>
      <div className="space-y-4">
        <label className="grid gap-1 text-xs text-[#b7b7c0]">
          Nome
          <input
            value={draft.name}
            onChange={(event) =>
              onChange({ ...draft, name: event.target.value })
            }
            className="chat-input"
          />
        </label>
        <label className="grid gap-1 text-xs text-[#b7b7c0]">
          Tipo
          <select
            value={draft.type}
            onChange={(event) =>
              onChange({
                ...draft,
                type: event.target.value as ChannelDraft['type'],
                teamId: '',
                memberIds: [],
              })
            }
            className="chat-input"
          >
            <option value="ORGANIZATION">Toda organização</option>
            <option value="TEAM">Equipe</option>
            <option value="PRIVATE">Privado</option>
          </select>
        </label>
        {draft.type === 'TEAM' && (
          <label className="grid gap-1 text-xs text-[#b7b7c0]">
            Equipe
            <select
              value={draft.teamId}
              onChange={(event) =>
                onChange({ ...draft, teamId: event.target.value })
              }
              className="chat-input"
            >
              <option value="">Selecione</option>
              {workspace.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {draft.type === 'PRIVATE' && (
          <fieldset>
            <legend className="text-xs text-[#b7b7c0]">Membros</legend>
            <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-white/10 p-2">
              {workspace.members.map((person) => {
                const checked = draft.memberIds.includes(person.id);
                return (
                  <label
                    key={person.id}
                    className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm text-white hover:bg-white/[0.05]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        onChange({
                          ...draft,
                          memberIds: checked
                            ? draft.memberIds.filter((id) => id !== person.id)
                            : [...draft.memberIds, person.id],
                        })
                      }
                      className="accent-violet-500"
                    />
                    {person.name || `@${person.username}`}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        <label className="grid gap-1 text-xs text-[#b7b7c0]">
          Descrição
          <textarea
            value={draft.description}
            onChange={(event) =>
              onChange({ ...draft, description: event.target.value })
            }
            rows={2}
            className="chat-input py-2"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-10 rounded-lg border border-white/10 px-3 text-sm text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={
              pending ||
              draft.name.trim().length < 2 ||
              (draft.type === 'TEAM' && !draft.teamId)
            }
            onClick={onSave}
            className="min-h-10 rounded-lg bg-violet-500 px-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Criar canal
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SimplePicker({
  title,
  people,
  pending,
  onClose,
  onPick,
}: {
  title: string;
  people: Person[];
  pending: boolean;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {people.map((person) => (
          <button
            key={person.id}
            type="button"
            disabled={pending}
            onClick={() => onPick(person.id)}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-white hover:bg-white/[0.06]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/20 text-xs">
              {(person.name || person.username).slice(0, 2).toUpperCase()}
            </div>
            <span>
              <strong className="block text-sm">
                {person.name || person.username}
              </strong>
              <span className="text-xs text-[#858590]">@{person.username}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function EventPicker({
  events,
  pending,
  onClose,
  onPick,
}: {
  events: ShareableEvent[];
  pending: boolean;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  return (
    <Modal title="Compartilhar evento" onClose={onClose}>
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {events.length ? (
          events.map((event) => (
            <button
              key={`${event.id}:${event.occurrenceStartAt}`}
              type="button"
              disabled={pending}
              onClick={() => onPick(event.id)}
              className="w-full rounded-xl border border-white/10 p-3 text-left text-white hover:border-sky-400/40"
            >
              <strong className="block text-sm">{event.title}</strong>
              <span className="mt-1 block text-xs text-[#9c9ca6]">
                {new Intl.DateTimeFormat('pt-BR', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(event.occurrenceStartAt))}
              </span>
            </button>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-[#858590]">
            Nenhum evento futuro disponível.
          </p>
        )}
      </div>
    </Modal>
  );
}

function EventFromMessageEditor({
  draft,
  pending,
  onChange,
  onCancel,
  onSave,
}: {
  draft: EventDraft;
  pending: boolean;
  onChange: (draft: EventDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <Modal title="Criar reunião a partir da mensagem" onClose={onCancel}>
      <div className="space-y-4">
        <p className="rounded-xl bg-white/[0.04] p-3 text-sm text-[#aaaab4]">
          {draft.message.content}
        </p>
        <label className="grid gap-1 text-xs text-[#b7b7c0]">
          Título
          <input
            value={draft.title}
            onChange={(event) =>
              onChange({ ...draft, title: event.target.value })
            }
            className="chat-input"
          />
        </label>
        <label className="grid gap-1 text-xs text-[#b7b7c0]">
          Início
          <input
            type="datetime-local"
            value={draft.startAt}
            onChange={(event) =>
              onChange({ ...draft, startAt: event.target.value })
            }
            className="chat-input"
          />
        </label>
        <label className="grid gap-1 text-xs text-[#b7b7c0]">
          Término
          <input
            type="datetime-local"
            value={draft.endAt}
            onChange={(event) =>
              onChange({ ...draft, endAt: event.target.value })
            }
            className="chat-input"
          />
        </label>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-10 rounded-lg border border-white/10 px-3 text-sm text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={pending || draft.title.trim().length < 2}
            onClick={onSave}
            className="min-h-10 rounded-lg bg-sky-500 px-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Confirmar reunião
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-[#1a1a1f] p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-white">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5 text-[#aaaab4]" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
