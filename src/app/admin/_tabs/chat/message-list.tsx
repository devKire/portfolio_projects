'use client';

import { ArrowDown, Loader2, MessageCircleMore } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { CHAT_SCROLL_THRESHOLD_PX } from '@/lib/chat/config';
import type { ChatMessageDTO, ChatRenderedMessage } from '@/lib/chat/types';

import { MessageItem } from './message-item';

function dayKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey(value) === dayKey(today.toISOString())) return 'Hoje';
  if (dayKey(value) === dayKey(yesterday.toISOString())) return 'Ontem';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  }).format(date);
}

function shouldGroup(
  previous: ChatRenderedMessage | undefined,
  current: ChatRenderedMessage
) {
  if (!previous || previous.authorId !== current.authorId) return false;
  if (dayKey(previous.createdAt) !== dayKey(current.createdAt)) return false;
  return (
    new Date(current.createdAt).getTime() -
      new Date(previous.createdAt).getTime() <
    5 * 60 * 1000
  );
}

export function MessageList({
  channelId,
  channelName,
  messages,
  loading,
  loadingOlder,
  hasMore,
  highlightedMessageId,
  currentUserId,
  direct,
  canPin,
  manager,
  onLoadOlder,
  onReachedBottom,
  onReply,
  onOpenThread,
  onNavigate,
  onEdit,
  onDelete,
  onReaction,
  onPin,
  onRetry,
  onCreateEvent,
}: {
  channelId: string;
  channelName: string;
  messages: ChatRenderedMessage[];
  loading: boolean;
  loadingOlder: boolean;
  hasMore: boolean;
  highlightedMessageId: string | null;
  currentUserId: string;
  direct: boolean;
  canPin: boolean;
  manager: boolean;
  onLoadOlder: () => Promise<void>;
  onReachedBottom: (lastVisibleMessageId: string | null) => void;
  onReply: (message: ChatMessageDTO) => void;
  onOpenThread: (message: ChatMessageDTO) => void;
  onNavigate: (messageId: string) => void;
  onEdit: (message: ChatMessageDTO, content: string) => Promise<void>;
  onDelete: (message: ChatMessageDTO) => void;
  onReaction: (message: ChatMessageDTO, emoji: string) => void;
  onPin: (message: ChatMessageDTO, pinned: boolean) => void;
  onRetry: (message: ChatRenderedMessage) => void;
  onCreateEvent: (message: ChatMessageDTO) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const nearBottomRef = useRef(true);
  const previousIdsRef = useRef(new Set<string>());
  const loadingOlderRef = useRef(false);
  const [newCount, setNewCount] = useState(0);
  const [nearBottom, setNearBottom] = useState(true);

  const persistedMessages = useMemo(
    () => messages.filter((message) => !message.id.startsWith('temp:')),
    [messages]
  );

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      const container = containerRef.current;
      if (!container) return;
      container.scrollTo({ top: container.scrollHeight, behavior });
      nearBottomRef.current = true;
      setNearBottom(true);
      setNewCount(0);
      const last = persistedMessages.at(-1);
      onReachedBottom(last?.id || null);
    },
    [onReachedBottom, persistedMessages]
  );

  useEffect(() => {
    initializedRef.current = false;
    nearBottomRef.current = true;
    setNearBottom(true);
    previousIdsRef.current = new Set();
    setNewCount(0);
  }, [channelId]);

  useEffect(() => {
    if (loading) return;
    const incomingIds = messages
      .filter((message) => !previousIdsRef.current.has(message.id))
      .map((message) => message.id);
    previousIdsRef.current = new Set(messages.map((message) => message.id));
    if (!initializedRef.current) {
      initializedRef.current = true;
      requestAnimationFrame(() => scrollToBottom('auto'));
      return;
    }
    if (!incomingIds.length) return;
    if (nearBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom('smooth'));
    } else {
      const incomingIdSet = new Set(incomingIds);
      const remoteCount = messages.filter(
        (message) =>
          incomingIdSet.has(message.id) &&
          !message.id.startsWith('temp:') &&
          message.authorId !== currentUserId
      ).length;
      if (remoteCount) setNewCount((count) => count + remoteCount);
    }
  }, [loading, messages, scrollToBottom]);

  useEffect(() => {
    if (!highlightedMessageId) return;
    requestAnimationFrame(() => {
      document
        .getElementById(`chat-message-${highlightedMessageId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [highlightedMessageId, messages]);

  async function loadOlderPreservingPosition() {
    const container = containerRef.current;
    if (!container || loadingOlderRef.current || !hasMore) return;
    loadingOlderRef.current = true;
    const previousHeight = container.scrollHeight;
    const previousTop = container.scrollTop;
    await onLoadOlder();
    requestAnimationFrame(() => {
      const nextContainer = containerRef.current;
      if (nextContainer) {
        nextContainer.scrollTop =
          previousTop + (nextContainer.scrollHeight - previousHeight);
      }
      loadingOlderRef.current = false;
    });
  }

  function handleScroll() {
    const container = containerRef.current;
    if (!container) return;
    if (container.scrollTop < 100 && hasMore) {
      void loadOlderPreservingPosition();
    }
    const distance =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const nearBottom = distance <= CHAT_SCROLL_THRESHOLD_PX;
    nearBottomRef.current = nearBottom;
    setNearBottom(nearBottom);
    if (nearBottom) {
      setNewCount(0);
      const last = persistedMessages.at(-1);
      onReachedBottom(last?.id || null);
    }
  }

  if (loading) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col justify-end gap-4 overflow-hidden p-4"
        aria-label="Carregando mensagens"
      >
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="flex animate-pulse gap-3">
            <div className="size-9 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="absolute inset-0 overflow-y-auto overscroll-contain px-1 py-3 sm:px-2"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {loadingOlder ? (
          <div className="flex justify-center py-2 text-xs text-zinc-500">
            <Loader2 className="mr-2 size-4 animate-spin" /> Carregando
            mensagens anteriores
          </div>
        ) : hasMore ? (
          <div className="flex justify-center py-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void loadOlderPreservingPosition()}
            >
              Carregar anteriores
            </Button>
          </div>
        ) : null}
        {!messages.length ? (
          <div className="flex min-h-full items-center justify-center p-6 text-center">
            <div className="max-w-sm">
              <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <MessageCircleMore className="size-6" />
              </span>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Este é o início de{' '}
                {direct ? 'uma conversa' : `# ${channelName}`}
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Compartilhe atualizações, arquivos e decisões com segurança.
              </p>
            </div>
          </div>
        ) : null}
        {messages.map((message, index) => {
          const previous = messages[index - 1];
          const showDay =
            !previous ||
            dayKey(previous.createdAt) !== dayKey(message.createdAt);
          const dto = message as ChatMessageDTO;
          return (
            <div key={message.id}>
              {showDay ? (
                <div
                  className="sticky top-1 z-10 my-4 flex items-center gap-3 px-2"
                  aria-label={dayLabel(message.createdAt)}
                >
                  <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                  <span className="rounded-full border border-zinc-200 bg-white/95 px-3 py-1 text-[11px] font-medium text-zinc-500 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-950/95 dark:text-zinc-400">
                    {dayLabel(message.createdAt)}
                  </span>
                  <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                </div>
              ) : null}
              <MessageItem
                message={message}
                grouped={shouldGroup(previous, message)}
                highlighted={highlightedMessageId === message.id}
                currentUserId={currentUserId}
                direct={direct}
                canPin={canPin}
                canModerate={
                  message.authorId === currentUserId || (manager && !direct)
                }
                onReply={onReply}
                onOpenThread={onOpenThread}
                onNavigate={onNavigate}
                onEdit={onEdit}
                onDelete={onDelete}
                onReaction={onReaction}
                onPin={onPin}
                onRetry={onRetry}
                onCreateEvent={onCreateEvent}
              />
            </div>
          );
        })}
        <div className="h-2" />
      </div>
      {!nearBottom || newCount ? (
        <Button
          size="sm"
          className="absolute right-4 bottom-3 z-20 rounded-full shadow-lg"
          onClick={() => scrollToBottom()}
        >
          <ArrowDown />
          {newCount
            ? `${newCount} nova${newCount > 1 ? 's' : ''}`
            : 'Voltar ao final'}
        </Button>
      ) : null}
    </div>
  );
}
