'use client';

import { Loader2, MessageCircleMore, RefreshCw, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  deleteChatMessage,
  editChatMessage,
  getChatMessageContext,
  getChatMessages,
  getChatWorkspace,
  markChatChannelRead,
  setChatMessagePinned,
  syncChatMessages,
  toggleChatReaction,
} from '@/app/actions/chat';
import { Button } from '@/components/ui/button';
import {
  CHAT_SYNC_INTERVAL_MS,
  CHAT_WORKSPACE_SYNC_INTERVAL_MS,
} from '@/lib/chat/config';
import type { OrganizationContext } from '@/lib/organizations/context';
import type {
  ChatMessageDTO,
  ChatPendingMessage,
  ChatRenderedMessage,
  ChatWorkspaceDTO,
} from '@/lib/chat/types';
import { isPendingChatMessage } from '@/lib/chat/types';

import {
  createPendingChatMessage,
  mergeChatMessages,
  revokeClientAttachments,
  uploadChatMessage,
  type ChatUploadResource,
} from './client';
import { ConversationHeader, type ChatPanelKind } from './conversation-header';
import { ConversationSidebar } from './conversation-sidebar';
import {
  CreateEventFromMessageSheet,
  NewChannelSheet,
  NewDirectSheet,
  ResourcePickerSheet,
} from './dialogs';
import type {
  ComposerSendInput,
  ComposerSharedResource,
} from './message-composer';
import { MessageComposer } from './message-composer';
import { MessageList } from './message-list';
import { ChatSidePanel } from './side-panels';
import { ThreadPanel } from './thread-panel';

type OrganizationSummary = OrganizationContext['organizations'][number];

type MessageNavigationResult = {
  channelId: string;
  targetMessageId: string;
  threadMessageId: string | null;
  messages: ChatMessageDTO[];
};

function mergeRenderedMessages(
  current: ChatRenderedMessage[],
  incoming: ChatMessageDTO[]
) {
  const persisted = current.filter(
    (message): message is ChatMessageDTO => !isPendingChatMessage(message)
  );
  const pending = current.filter(isPendingChatMessage);
  return [...mergeChatMessages(persisted, incoming), ...pending].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}

function optimisticReaction(
  message: ChatMessageDTO,
  emoji: string,
  user: { id: string; name: string | null; username: string }
) {
  const existing = message.reactions.find(
    (reaction) => reaction.emoji === emoji
  );
  if (existing?.reactedByMe) {
    const count = existing.count - 1;
    return {
      ...message,
      reactions: count
        ? message.reactions.map((reaction) =>
            reaction.emoji === emoji
              ? {
                  ...reaction,
                  count,
                  reactedByMe: false,
                  users: reaction.users.filter(
                    (person) => person.id !== user.id
                  ),
                }
              : reaction
          )
        : message.reactions.filter((reaction) => reaction.emoji !== emoji),
    };
  }
  if (existing) {
    return {
      ...message,
      reactions: message.reactions.map((reaction) =>
        reaction.emoji === emoji
          ? {
              ...reaction,
              count: reaction.count + 1,
              reactedByMe: true,
              users: [...reaction.users, user].slice(0, 12),
            }
          : reaction
      ),
    };
  }
  return {
    ...message,
    reactions: [
      ...message.reactions,
      { emoji, count: 1, reactedByMe: true, users: [user] },
    ],
  };
}

function resourceInput(resource: ComposerSharedResource | null) {
  const input: ChatUploadResource = {};
  if (resource?.type === 'CALENDAR_EVENT') input.eventId = resource.id;
  if (resource?.type === 'TASK') input.taskId = resource.id;
  if (resource?.type === 'TICKET') input.ticketId = resource.id;
  if (resource?.type === 'KCS') input.noteId = resource.id;
  return input;
}

export function ChatWorkspace({
  userId,
  organization,
}: {
  userId: string;
  organization: OrganizationSummary | null;
}) {
  const [workspace, setWorkspace] = useState<ChatWorkspaceDTO | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatRenderedMessage[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [panel, setPanel] = useState<ChatPanelKind>(null);
  const [replyTo, setReplyTo] = useState<ChatMessageDTO | null>(null);
  const [threadRoot, setThreadRoot] = useState<ChatMessageDTO | null>(null);
  const [threadTargetId, setThreadTargetId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [newDirectOpen, setNewDirectOpen] = useState(false);
  const [resourcePickerOpen, setResourcePickerOpen] = useState(false);
  const [sharedResource, setSharedResource] =
    useState<ComposerSharedResource | null>(null);
  const [eventMessage, setEventMessage] = useState<ChatMessageDTO | null>(null);
  const syncedAtRef = useRef(new Date(0).toISOString());
  const lastReadMessageRef = useRef<string | null>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const initialLinkHandledRef = useRef(false);
  const activeChannelIdRef = useRef<string | null>(null);
  const pendingByChannelRef = useRef(new Map<string, ChatPendingMessage[]>());
  const pendingNavigationRef = useRef<MessageNavigationResult | null>(null);

  const activeChannel = useMemo(
    () =>
      workspace?.channels.find((channel) => channel.id === activeChannelId) ||
      null,
    [activeChannelId, workspace]
  );
  const currentPerson = useMemo(
    () =>
      workspace?.members.find((member) => member.id === userId) || {
        id: userId,
        name: null,
        username: 'usuario',
      },
    [userId, workspace]
  );
  const manager = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';

  function updatePendingMessage(
    channelId: string,
    messageId: string,
    update: (message: ChatPendingMessage) => ChatPendingMessage
  ) {
    const pending = pendingByChannelRef.current.get(channelId) || [];
    const next = pending.map((message) =>
      message.id === messageId ? update(message) : message
    );
    pendingByChannelRef.current.set(channelId, next);
    if (activeChannelIdRef.current === channelId) {
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId && isPendingChatMessage(message)
            ? update(message)
            : message
        )
      );
    }
  }

  function removePendingMessage(channelId: string, messageId: string) {
    const pending = pendingByChannelRef.current.get(channelId) || [];
    pendingByChannelRef.current.set(
      channelId,
      pending.filter((message) => message.id !== messageId)
    );
  }

  const showNavigationResult = useCallback(
    (result: MessageNavigationResult) => {
      setMessages((current) => mergeRenderedMessages(current, result.messages));
      if (result.threadMessageId) {
        const root = result.messages.find(
          (message) => message.id === result.targetMessageId
        );
        if (root) {
          setPanel(null);
          setThreadRoot(root);
          setThreadTargetId(result.threadMessageId);
        }
        setHighlightedMessageId(null);
      } else {
        setHighlightedMessageId(result.targetMessageId);
      }
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'chat');
      url.searchParams.set('channel', result.channelId);
      url.searchParams.set(
        'message',
        result.threadMessageId || result.targetMessageId
      );
      window.history.replaceState(null, '', url);
      if (highlightTimerRef.current) {
        window.clearTimeout(highlightTimerRef.current);
      }
      highlightTimerRef.current = window.setTimeout(
        () => setHighlightedMessageId(null),
        3_000
      );
    },
    []
  );

  const loadWorkspace = useCallback(
    async (preserve = true) => {
      if (!organization) {
        setWorkspace(null);
        setActiveChannelId(null);
        setLoadingWorkspace(false);
        return null;
      }
      const result = await getChatWorkspace(organization.id);
      if (!result.success) {
        setError(result.error);
        setLoadingWorkspace(false);
        return null;
      }
      setWorkspace(result.data);
      setActiveChannelId((current) => {
        const linkedChannel = new URLSearchParams(window.location.search).get(
          'channel'
        );
        if (
          linkedChannel &&
          result.data.channels.some((channel) => channel.id === linkedChannel)
        ) {
          return linkedChannel;
        }
        if (
          preserve &&
          result.data.channels.some((channel) => channel.id === current)
        ) {
          return current;
        }
        return result.data.channels[0]?.id || null;
      });
      setLoadingWorkspace(false);
      return result.data;
    },
    [organization]
  );

  const loadInitialMessages = useCallback(async () => {
    if (!organization || !activeChannelId) return;
    const requestedChannelId = activeChannelId;
    setLoadingMessages(true);
    setError(null);
    const result = await getChatMessages({
      organizationId: organization.id,
      channelId: activeChannelId,
      limit: 40,
    });
    if (activeChannelIdRef.current !== requestedChannelId) return;
    if (result.success) {
      const pending = pendingByChannelRef.current.get(activeChannelId) || [];
      setMessages([...result.data.messages, ...pending]);
      setCursor(result.data.nextCursor);
      syncedAtRef.current = result.data.syncedAt;
      const navigation = pendingNavigationRef.current;
      if (navigation?.channelId === requestedChannelId) {
        pendingNavigationRef.current = null;
        showNavigationResult(navigation);
      }
    } else {
      setError(result.error);
    }
    setLoadingMessages(false);
  }, [activeChannelId, organization, showNavigationResult]);

  const syncMessages = useCallback(async () => {
    if (!organization || !activeChannelId || loadingMessages) return;
    const requestedChannelId = activeChannelId;
    const result = await syncChatMessages({
      organizationId: organization.id,
      channelId: activeChannelId,
      since: syncedAtRef.current,
    });
    if (activeChannelIdRef.current !== requestedChannelId) return;
    if (result.success) {
      syncedAtRef.current = result.data.syncedAt;
      if (result.data.messages.length) {
        setMessages((current) =>
          mergeRenderedMessages(current, result.data.messages)
        );
      }
    }
  }, [activeChannelId, loadingMessages, organization]);

  useEffect(() => {
    setLoadingWorkspace(true);
    initialLinkHandledRef.current = false;
    void loadWorkspace(false);
  }, [loadWorkspace]);

  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
    setMessages([]);
    setCursor(null);
    setLoadingOlder(false);
    setReplyTo(null);
    setThreadRoot(null);
    setThreadTargetId(null);
    setPanel(null);
    setSharedResource(null);
    lastReadMessageRef.current = null;
    if (activeChannelId) {
      const url = new URL(window.location.href);
      const preserveLinkedMessage =
        !initialLinkHandledRef.current && url.searchParams.has('message');
      url.searchParams.set('tab', 'chat');
      url.searchParams.set('channel', activeChannelId);
      if (!preserveLinkedMessage) url.searchParams.delete('message');
      window.history.replaceState(null, '', url);
      void loadInitialMessages();
    }
  }, [activeChannelId, loadInitialMessages]);

  useEffect(
    () => () => {
      for (const pending of pendingByChannelRef.current.values()) {
        for (const message of pending) {
          revokeClientAttachments(message.pendingFiles);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (loadingMessages || !activeChannelId || initialLinkHandledRef.current) {
      return;
    }
    const messageId = new URLSearchParams(window.location.search).get(
      'message'
    );
    initialLinkHandledRef.current = true;
    if (messageId) void navigateToMessage(messageId);
  }, [activeChannelId, loadingMessages]);

  useEffect(() => {
    if (!activeChannelId) return;
    const messageInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void syncMessages();
    }, CHAT_SYNC_INTERVAL_MS);
    const workspaceInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadWorkspace(true);
    }, CHAT_WORKSPACE_SYNC_INTERVAL_MS);
    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void syncMessages();
        void loadWorkspace(true);
      }
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(messageInterval);
      window.clearInterval(workspaceInterval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [activeChannelId, loadWorkspace, syncMessages]);

  async function loadOlderMessages() {
    if (!organization || !activeChannelId || !cursor || loadingOlder) return;
    const requestedChannelId = activeChannelId;
    setLoadingOlder(true);
    const result = await getChatMessages({
      organizationId: organization.id,
      channelId: activeChannelId,
      cursor,
      limit: 40,
    });
    if (activeChannelIdRef.current !== requestedChannelId) return;
    if (result.success) {
      setMessages((current) =>
        mergeRenderedMessages(current, result.data.messages)
      );
      setCursor(result.data.nextCursor);
    } else {
      toast.error(result.error);
    }
    setLoadingOlder(false);
  }

  function replaceMessage(message: ChatMessageDTO) {
    setMessages((current) =>
      current.map((item) => (item.id === message.id ? message : item))
    );
  }

  function beginSend(
    input: ComposerSendInput,
    options: {
      resource?: ComposerSharedResource | null;
      reply?: ChatMessageDTO | null;
    } = {}
  ) {
    if (!organization || !activeChannel) return;
    const resource =
      options.resource === undefined ? input.resource : options.resource;
    const reply = options.reply === undefined ? replyTo : options.reply;
    const clientNonce = crypto.randomUUID();
    const resourceFields = resourceInput(resource || null);
    const pending = createPendingChatMessage({
      organizationId: organization.id,
      channelId: activeChannel.id,
      clientNonce,
      content: input.content,
      author: currentPerson,
      attachments: input.attachments,
      replyTo: activeChannel.type === 'DIRECT' ? reply : null,
      resource: resourceFields,
    });
    pendingByChannelRef.current.set(activeChannel.id, [
      ...(pendingByChannelRef.current.get(activeChannel.id) || []),
      pending,
    ]);
    setMessages((current) => [...current, pending]);
    setReplyTo(null);
    setSharedResource(null);
    void persistPending(pending);
  }

  async function persistPending(pending: ChatPendingMessage) {
    try {
      const persisted = await uploadChatMessage(
        {
          organizationId: pending.organizationId,
          channelId: pending.channelId,
          content: pending.content,
          replyToId: pending.replyToId,
          clientNonce: pending.clientNonce,
          attachments: pending.pendingFiles,
          ...pending.pendingResource,
        },
        (progress) =>
          updatePendingMessage(pending.channelId, pending.id, (message) => ({
            ...message,
            uploadProgress: progress,
          }))
      );
      revokeClientAttachments(pending.pendingFiles);
      removePendingMessage(pending.channelId, pending.id);
      if (activeChannelIdRef.current === pending.channelId) {
        setMessages((current) =>
          current.map((message) =>
            message.id === pending.id ? persisted : message
          )
        );
      }
      void loadWorkspace(true);
    } catch (sendError) {
      updatePendingMessage(pending.channelId, pending.id, (message) => ({
        ...message,
        clientStatus: 'FAILED',
        error:
          sendError instanceof Error
            ? sendError.message
            : 'Não foi possível enviar.',
      }));
    }
  }

  function retryMessage(message: ChatRenderedMessage) {
    if (!isPendingChatMessage(message)) return;
    const retry = {
      ...message,
      clientStatus: 'SENDING' as const,
      error: null,
    };
    updatePendingMessage(message.channelId, message.id, () => retry);
    void persistPending(retry);
  }

  async function editMessage(message: ChatMessageDTO, content: string) {
    const original = message;
    replaceMessage({
      ...message,
      content: content.trim(),
      editedAt: new Date().toISOString(),
    });
    const result = await editChatMessage(message.id, content);
    if (result.success) replaceMessage(result.data);
    else {
      replaceMessage(original);
      toast.error(result.error);
    }
  }

  async function removeMessage(message: ChatMessageDTO) {
    if (
      !window.confirm(
        'Excluir esta mensagem? O histórico preservará a exclusão.'
      )
    ) {
      return;
    }
    const original = message;
    replaceMessage({
      ...message,
      content: 'Mensagem excluída',
      deletedAt: new Date().toISOString(),
      attachments: [],
      reactions: [],
      sharedResource: null,
      pinnedAt: null,
    });
    const result = await deleteChatMessage(message.id);
    if (!result.success) {
      replaceMessage(original);
      toast.error(result.error);
    } else void loadWorkspace(true);
  }

  async function reactToMessage(message: ChatMessageDTO, emoji: string) {
    const original = message;
    replaceMessage(optimisticReaction(message, emoji, currentPerson));
    const result = await toggleChatReaction(message.id, emoji);
    if (result.success) replaceMessage(result.data);
    else {
      replaceMessage(original);
      toast.error(result.error);
    }
  }

  async function pinMessage(message: ChatMessageDTO, pinned: boolean) {
    const original = message;
    replaceMessage({
      ...message,
      pinnedAt: pinned ? new Date().toISOString() : null,
      pinnedBy: pinned ? currentPerson : null,
    });
    const result = await setChatMessagePinned(message.id, pinned);
    if (result.success) {
      replaceMessage(result.data);
      void loadWorkspace(true);
    } else {
      replaceMessage(original);
      toast.error(result.error);
    }
  }

  async function navigateToMessage(messageId: string) {
    const result = await getChatMessageContext(messageId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    if (result.data.channelId !== activeChannelId) {
      pendingNavigationRef.current = result.data;
      activeChannelIdRef.current = result.data.channelId;
      setActiveChannelId(result.data.channelId);
      return;
    }
    showNavigationResult(result.data);
  }

  function markVisibleRead(lastVisibleMessageId: string | null) {
    if (
      !activeChannelId ||
      !lastVisibleMessageId ||
      lastReadMessageRef.current === lastVisibleMessageId
    ) {
      return;
    }
    lastReadMessageRef.current = lastVisibleMessageId;
    setWorkspace((current) =>
      current
        ? {
            ...current,
            channels: current.channels.map((channel) =>
              channel.id === activeChannelId
                ? { ...channel, unreadCount: 0, mentionCount: 0 }
                : channel
            ),
          }
        : current
    );
    void markChatChannelRead(activeChannelId, lastVisibleMessageId);
  }

  function selectChannel(channelId: string) {
    initialLinkHandledRef.current = true;
    activeChannelIdRef.current = channelId;
    setActiveChannelId(channelId);
  }

  async function channelCreated(channelId: string) {
    setNewChannelOpen(false);
    setNewDirectOpen(false);
    await loadWorkspace(true);
    activeChannelIdRef.current = channelId;
    setActiveChannelId(channelId);
  }

  if (!organization) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 p-8 text-center">
        <div>
          <MessageCircleMore className="mx-auto mb-3 size-8 text-violet-400" />
          <h2 className="font-semibold text-white">Chat organizacional</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Selecione ou crie uma organização para acessar canais e conversas
            diretas.
          </p>
        </div>
      </div>
    );
  }

  if (loadingWorkspace || !workspace) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
        <Loader2 className="size-6 animate-spin text-violet-400" />
        <span className="ml-2 text-sm text-zinc-400">Carregando Chat...</span>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-900 shadow-xl dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
      <ConversationSidebar
        workspace={workspace}
        activeChannelId={activeChannelId}
        mobileOpen={mobileSidebar || !activeChannel}
        onMobileClose={() => setMobileSidebar(false)}
        onSelect={selectChannel}
        onNewChannel={() => setNewChannelOpen(true)}
        onNewDirect={() => setNewDirectOpen(true)}
      />
      <section className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {activeChannel ? (
          <>
            <ConversationHeader
              channel={activeChannel}
              panel={panel}
              onOpenSidebar={() => setMobileSidebar(true)}
              onPanel={(next) => {
                setThreadRoot(null);
                setThreadTargetId(null);
                setPanel(next);
              }}
            />
            {error ? (
              <div
                role="alert"
                className="flex items-center gap-2 border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
              >
                <span className="min-w-0 flex-1">{error}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  onClick={() => setError(null)}
                  aria-label="Fechar erro"
                >
                  <X />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setError(null);
                    void loadInitialMessages();
                  }}
                >
                  <RefreshCw /> Tentar novamente
                </Button>
              </div>
            ) : null}
            <MessageList
              channelId={activeChannel.id}
              channelName={activeChannel.name}
              messages={messages}
              loading={loadingMessages}
              loadingOlder={loadingOlder}
              hasMore={Boolean(cursor)}
              highlightedMessageId={highlightedMessageId}
              currentUserId={userId}
              direct={activeChannel.type === 'DIRECT'}
              canPin={activeChannel.canPin}
              manager={manager}
              onLoadOlder={loadOlderMessages}
              onReachedBottom={markVisibleRead}
              onReply={(message) => {
                if (activeChannel.type === 'DIRECT') setReplyTo(message);
                else {
                  setPanel(null);
                  const root = message.replyToId
                    ? messages.find(
                        (item) =>
                          item.id === message.replyToId &&
                          !isPendingChatMessage(item)
                      )
                    : message;
                  setThreadRoot(
                    (root as ChatMessageDTO | undefined) || message
                  );
                  setThreadTargetId(null);
                }
              }}
              onOpenThread={(message) => {
                setPanel(null);
                setThreadRoot(message);
                setThreadTargetId(null);
              }}
              onNavigate={(messageId) => void navigateToMessage(messageId)}
              onEdit={editMessage}
              onDelete={(message) => void removeMessage(message)}
              onReaction={(message, emoji) =>
                void reactToMessage(message, emoji)
              }
              onPin={(message, pinned) => void pinMessage(message, pinned)}
              onRetry={retryMessage}
              onCreateEvent={setEventMessage}
            />
            <MessageComposer
              key={activeChannel.id}
              members={workspace.members}
              teams={workspace.teams}
              replyTo={replyTo}
              sharedResource={sharedResource}
              canMentionEveryone={manager}
              onCancelReply={() => setReplyTo(null)}
              onClearResource={() => setSharedResource(null)}
              onOpenResources={() => setResourcePickerOpen(true)}
              onSend={beginSend}
            />
            {panel ? (
              <ChatSidePanel
                panel={panel}
                channel={activeChannel}
                workspace={workspace}
                onClose={() => setPanel(null)}
                onNavigate={(messageId) => void navigateToMessage(messageId)}
              />
            ) : null}
            {threadRoot ? (
              <ThreadPanel
                rootMessage={threadRoot}
                initialHighlightId={threadTargetId}
                workspace={workspace}
                currentUserId={userId}
                canPin={activeChannel.canPin}
                manager={manager}
                onClose={() => {
                  setThreadRoot(null);
                  setThreadTargetId(null);
                }}
                onNavigate={(messageId) => void navigateToMessage(messageId)}
                onRootUpdated={(message) => {
                  replaceMessage(message);
                  setThreadRoot(message);
                }}
                onCreateEvent={setEventMessage}
              />
            ) : null}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
            Selecione uma conversa.
          </div>
        )}
      </section>
      <NewChannelSheet
        open={newChannelOpen}
        workspace={workspace}
        onClose={() => setNewChannelOpen(false)}
        onCreated={(channelId) => void channelCreated(channelId)}
      />
      <NewDirectSheet
        open={newDirectOpen}
        workspace={workspace}
        currentUserId={userId}
        onClose={() => setNewDirectOpen(false)}
        onCreated={(channelId) => void channelCreated(channelId)}
      />
      <ResourcePickerSheet
        open={resourcePickerOpen}
        workspace={workspace}
        onClose={() => setResourcePickerOpen(false)}
        onSelect={setSharedResource}
      />
      {activeChannel ? (
        <CreateEventFromMessageSheet
          message={eventMessage}
          channel={activeChannel}
          currentUserId={userId}
          onClose={() => setEventMessage(null)}
          onCreated={(resource) =>
            beginSend(
              {
                content: 'Reunião compartilhada',
                attachments: [],
                resource,
              },
              { resource, reply: null }
            )
          }
        />
      ) : null}
    </div>
  );
}
