'use client';

import { Loader2, MessageSquareText, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  deleteChatMessage,
  editChatMessage,
  getChatThread,
  setChatMessagePinned,
  toggleChatReaction,
} from '@/app/actions/chat';
import { Button } from '@/components/ui/button';
import { CHAT_SYNC_INTERVAL_MS } from '@/lib/chat/config';
import type {
  ChatMessageDTO,
  ChatRenderedMessage,
  ChatWorkspaceDTO,
} from '@/lib/chat/types';
import { isPendingChatMessage } from '@/lib/chat/types';

import {
  createPendingChatMessage,
  personLabel,
  revokeClientAttachments,
  uploadChatMessage,
} from './client';
import type { ComposerSendInput } from './message-composer';
import { MessageComposer } from './message-composer';
import { MessageItem } from './message-item';

export function ThreadPanel({
  rootMessage,
  initialHighlightId,
  workspace,
  currentUserId,
  canPin,
  manager,
  onClose,
  onNavigate,
  onRootUpdated,
  onCreateEvent,
}: {
  rootMessage: ChatMessageDTO;
  initialHighlightId: string | null;
  workspace: ChatWorkspaceDTO;
  currentUserId: string;
  canPin: boolean;
  manager: boolean;
  onClose: () => void;
  onNavigate: (messageId: string) => void;
  onRootUpdated: (message: ChatMessageDTO) => void;
  onCreateEvent: (message: ChatMessageDTO) => void;
}) {
  const [root, setRoot] = useState(rootMessage);
  const [replies, setReplies] = useState<ChatRenderedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(initialHighlightId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const onRootUpdatedRef = useRef(onRootUpdated);
  const currentPerson = useMemo(
    () =>
      workspace.members.find((member) => member.id === currentUserId) || {
        id: currentUserId,
        name: null,
        username: 'usuario',
      },
    [currentUserId, workspace.members]
  );

  useEffect(() => {
    onRootUpdatedRef.current = onRootUpdated;
  }, [onRootUpdated]);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      const result = await getChatThread(rootMessage.id);
      if (result.success) {
        setRoot(result.data.root);
        onRootUpdatedRef.current(result.data.root);
        setReplies((current) => {
          const pending = current.filter(isPendingChatMessage);
          return [...result.data.replies, ...pending].sort(
            (left, right) =>
              new Date(left.createdAt).getTime() -
              new Date(right.createdAt).getTime()
          );
        });
      } else {
        setError(result.error);
      }
      setLoading(false);
    },
    [rootMessage.id]
  );

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, CHAT_SYNC_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!highlightedMessageId) return;
    requestAnimationFrame(() =>
      scrollRef.current
        ?.querySelector<HTMLElement>(
          `[data-message-id="${highlightedMessageId}"]`
        )
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    );
    const timeout = window.setTimeout(
      () => setHighlightedMessageId(null),
      3_000
    );
    return () => window.clearTimeout(timeout);
  }, [highlightedMessageId, replies]);

  function navigateWithinThread(messageId: string) {
    if (
      messageId === root.id ||
      replies.some((message) => message.id === messageId)
    ) {
      setHighlightedMessageId(messageId);
      return;
    }
    onNavigate(messageId);
  }

  async function send(input: ComposerSendInput) {
    const clientNonce = crypto.randomUUID();
    const pending = createPendingChatMessage({
      organizationId: root.organizationId,
      channelId: root.channelId,
      clientNonce,
      content: input.content,
      author: currentPerson,
      attachments: input.attachments,
      replyTo: root,
    });
    setReplies((current) => [...current, pending]);
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    );
    try {
      const persisted = await uploadChatMessage(
        {
          organizationId: root.organizationId,
          channelId: root.channelId,
          content: input.content,
          replyToId: root.id,
          clientNonce,
          attachments: input.attachments,
        },
        (progress) =>
          setReplies((current) =>
            current.map((message) =>
              message.id === pending.id && isPendingChatMessage(message)
                ? { ...message, uploadProgress: progress }
                : message
            )
          )
      );
      revokeClientAttachments(input.attachments);
      setReplies((current) =>
        current.map((message) =>
          message.id === pending.id ? persisted : message
        )
      );
      setRoot((value) => ({ ...value, replyCount: value.replyCount + 1 }));
    } catch (sendError) {
      setReplies((current) =>
        current.map((message) =>
          message.id === pending.id && isPendingChatMessage(message)
            ? {
                ...message,
                clientStatus: 'FAILED',
                error:
                  sendError instanceof Error
                    ? sendError.message
                    : 'Falha ao enviar.',
              }
            : message
        )
      );
    }
  }

  async function retry(message: ChatRenderedMessage) {
    if (!isPendingChatMessage(message)) return;
    setReplies((current) =>
      current.map((item) =>
        item.id === message.id
          ? { ...message, clientStatus: 'SENDING', error: null }
          : item
      )
    );
    try {
      const persisted = await uploadChatMessage(
        {
          organizationId: message.organizationId,
          channelId: message.channelId,
          content: message.content,
          replyToId: root.id,
          clientNonce: message.clientNonce,
          attachments: message.pendingFiles,
        },
        (progress) =>
          setReplies((current) =>
            current.map((item) =>
              item.id === message.id && isPendingChatMessage(item)
                ? { ...item, uploadProgress: progress }
                : item
            )
          )
      );
      revokeClientAttachments(message.pendingFiles);
      setReplies((current) =>
        current.map((item) => (item.id === message.id ? persisted : item))
      );
    } catch (retryError) {
      setReplies((current) =>
        current.map((item) =>
          item.id === message.id && isPendingChatMessage(item)
            ? {
                ...item,
                clientStatus: 'FAILED',
                error:
                  retryError instanceof Error
                    ? retryError.message
                    : 'Falha ao enviar.',
              }
            : item
        )
      );
    }
  }

  async function edit(message: ChatMessageDTO, content: string) {
    const result = await editChatMessage(message.id, content);
    if (!result.success) {
      setError(result.error);
      return;
    }
    if (message.id === root.id) {
      setRoot(result.data);
      onRootUpdated(result.data);
    } else {
      setReplies((current) =>
        current.map((item) => (item.id === message.id ? result.data : item))
      );
    }
  }

  async function remove(message: ChatMessageDTO) {
    if (
      !window.confirm(
        'Excluir esta mensagem? O histórico preservará a exclusão.'
      )
    )
      return;
    const result = await deleteChatMessage(message.id);
    if (!result.success) setError(result.error);
    else void load(true);
  }

  async function react(message: ChatMessageDTO, emoji: string) {
    const result = await toggleChatReaction(message.id, emoji);
    if (!result.success) setError(result.error);
    else if (message.id === root.id) {
      setRoot(result.data);
      onRootUpdated(result.data);
    } else {
      setReplies((current) =>
        current.map((item) => (item.id === message.id ? result.data : item))
      );
    }
  }

  async function pin(message: ChatMessageDTO, pinned: boolean) {
    const result = await setChatMessagePinned(message.id, pinned);
    if (!result.success) setError(result.error);
    else if (message.id === root.id) {
      setRoot(result.data);
      onRootUpdated(result.data);
    } else {
      setReplies((current) =>
        current.map((item) => (item.id === message.id ? result.data : item))
      );
    }
  }

  return (
    <aside
      className="absolute inset-y-0 right-0 z-40 flex w-full max-w-lg flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
      aria-label="Thread"
    >
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-zinc-200 px-4 dark:border-zinc-800">
        <MessageSquareText className="size-4 text-violet-500" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Thread</h3>
          <p className="truncate text-[11px] text-zinc-500">
            {personLabel(root.author)}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label="Fechar thread"
        >
          <X />
        </Button>
      </div>
      {error ? (
        <div
          role="alert"
          className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      ) : null}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
            <Loader2 className="size-4 animate-spin" /> Carregando thread...
          </p>
        ) : (
          <>
            <MessageItem
              message={root}
              grouped={false}
              highlighted={highlightedMessageId === root.id}
              currentUserId={currentUserId}
              direct={false}
              canPin={canPin}
              canModerate={root.authorId === currentUserId || manager}
              onReply={() =>
                document.getElementById('chat-thread-composer')?.focus()
              }
              onOpenThread={() => undefined}
              onNavigate={navigateWithinThread}
              onEdit={edit}
              onDelete={remove}
              onReaction={react}
              onPin={pin}
              onRetry={() => undefined}
              onCreateEvent={onCreateEvent}
            />
            <div className="my-3 flex items-center gap-2 px-3 text-xs text-zinc-500">
              <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              {replies.length} respostas
              <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            </div>
            {replies.map((reply, index) => (
              <MessageItem
                key={reply.id}
                message={reply}
                grouped={
                  index > 0 && replies[index - 1]?.authorId === reply.authorId
                }
                highlighted={highlightedMessageId === reply.id}
                currentUserId={currentUserId}
                direct={false}
                canPin={canPin}
                canModerate={reply.authorId === currentUserId || manager}
                onReply={() =>
                  document.getElementById('chat-thread-composer')?.focus()
                }
                onOpenThread={() => undefined}
                onNavigate={navigateWithinThread}
                onEdit={edit}
                onDelete={remove}
                onReaction={react}
                onPin={pin}
                onRetry={retry}
                onCreateEvent={onCreateEvent}
              />
            ))}
          </>
        )}
      </div>
      <MessageComposer
        members={workspace.members}
        teams={workspace.teams}
        replyTo={null}
        sharedResource={null}
        canMentionEveryone={manager}
        onCancelReply={() => undefined}
        onClearResource={() => undefined}
        onOpenResources={() => undefined}
        allowResources={false}
        textareaId="chat-thread-composer"
        autoFocus
        onSend={(input) => void send(input)}
        placeholder="Responder na thread..."
      />
    </aside>
  );
}
