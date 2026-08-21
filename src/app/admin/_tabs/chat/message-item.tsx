'use client';

import {
  CalendarDays,
  Check,
  CheckCheck,
  Clipboard,
  CornerUpRight,
  Ellipsis,
  FileText,
  Link2,
  Loader2,
  MessageSquareText,
  Pencil,
  Pin,
  PinOff,
  RefreshCw,
  Reply,
  SmilePlus,
  TicketCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { CHAT_REACTIONS } from '@/lib/chat/config';
import type { ChatMessageDTO, ChatRenderedMessage } from '@/lib/chat/types';
import { isPendingChatMessage } from '@/lib/chat/types';

import { chatInitials, personLabel } from './client';
import { MessageAttachments } from './message-attachments';
import { MessageContent } from './message-content';

function timeLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function SharedResourceCard({ message }: { message: ChatMessageDTO }) {
  const resource = message.sharedResource;
  if (!resource) return null;
  const Icon =
    resource.type === 'CALENDAR_EVENT'
      ? CalendarDays
      : resource.type === 'TICKET'
        ? TicketCheck
        : FileText;
  const params = new URLSearchParams();
  if (resource.type === 'CALENDAR_EVENT') {
    params.set('tab', 'calendar');
    params.set('event', resource.id);
  } else if (resource.type === 'KCS') {
    params.set('tab', 'kcs');
    params.set('note', resource.id);
  } else {
    params.set('tab', 'work');
    params.set(resource.type === 'TASK' ? 'task' : 'ticket', resource.id);
  }
  return (
    <a
      href={`/admin?${params.toString()}`}
      className="mt-2 flex max-w-lg items-center gap-3 rounded-xl border border-violet-300/60 bg-violet-50/60 p-3 transition hover:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none dark:border-violet-800 dark:bg-violet-950/20"
    >
      <span className="rounded-lg bg-violet-500/15 p-2 text-violet-600 dark:text-violet-300">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold tracking-wider text-violet-600 uppercase dark:text-violet-300">
          {resource.type === 'CALENDAR_EVENT'
            ? 'Calendário'
            : resource.type === 'TICKET'
              ? 'Chamado'
              : resource.type === 'TASK'
                ? 'Task'
                : 'KCS'}
        </span>
        <span className="block truncate text-sm font-semibold">
          {resource.title}
        </span>
        <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
          {resource.subtitle}
        </span>
      </span>
      <CornerUpRight className="size-4 text-zinc-500" />
    </a>
  );
}

function ReactionPicker({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-0 bottom-full z-30 mb-1 flex rounded-lg border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
      {CHAT_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="rounded p-1.5 text-lg hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none dark:hover:bg-zinc-800"
          aria-label={`Reagir com ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export function MessageItem({
  message,
  grouped,
  highlighted,
  currentUserId,
  direct,
  canPin,
  canModerate,
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
  message: ChatRenderedMessage;
  grouped: boolean;
  highlighted: boolean;
  currentUserId: string;
  direct: boolean;
  canPin: boolean;
  canModerate: boolean;
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
  const pending = isPendingChatMessage(message);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const mine = message.authorId === currentUserId;
  const deleted = Boolean(message.deletedAt);

  async function saveEdit() {
    await onEdit(message, editContent);
    setEditing(false);
  }

  async function copyLink() {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'chat');
    url.searchParams.set('channel', message.channelId);
    url.searchParams.set('message', message.id);
    await navigator.clipboard.writeText(url.toString());
    setMenuOpen(false);
  }

  return (
    <article
      id={`chat-message-${message.id}`}
      data-message-id={message.id}
      className={`group/message relative flex gap-2 rounded-xl px-2 transition-colors sm:gap-3 sm:px-3 ${
        grouped ? 'pt-0.5 pb-0.5' : 'mt-2 pt-2 pb-0.5'
      } ${
        highlighted
          ? 'bg-violet-500/20 ring-2 ring-violet-500/50'
          : 'hover:bg-zinc-100/70 dark:hover:bg-zinc-900/70'
      }`}
    >
      <div className="w-8 shrink-0 sm:w-9">
        {!grouped ? (
          <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[11px] font-semibold text-white sm:size-9">
            {chatInitials(message.author)}
          </div>
        ) : (
          <span className="invisible text-[10px] text-zinc-500 group-hover/message:visible">
            {timeLabel(message.createdAt)}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 pb-1">
        {!grouped ? (
          <div className="mb-0.5 flex min-w-0 items-baseline gap-2">
            <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              {personLabel(message.author)}
            </span>
            <time
              className="shrink-0 text-[11px] text-zinc-500"
              dateTime={message.createdAt}
            >
              {timeLabel(message.createdAt)}
            </time>
            {message.editedAt && !deleted ? (
              <span className="text-[10px] text-zinc-500">(editada)</span>
            ) : null}
            {message.pinnedAt ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                <Pin className="size-3" /> Fixada
              </span>
            ) : null}
          </div>
        ) : null}

        {message.replyTo ? (
          <button
            type="button"
            onClick={() => onNavigate(message.replyTo?.id || '')}
            className="mb-1 block max-w-full rounded border-l-2 border-violet-400 bg-zinc-100 px-2 py-1 text-left text-xs hover:bg-violet-50 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none dark:bg-zinc-900 dark:hover:bg-violet-950/30"
          >
            <span className="font-semibold text-violet-700 dark:text-violet-300">
              {personLabel(message.replyTo.author)}
            </span>
            <span className="ml-2 text-zinc-600 dark:text-zinc-400">
              {message.replyTo.attachment
                ? `Arquivo: ${message.replyTo.attachment.fileName}`
                : message.replyTo.content}
            </span>
          </button>
        ) : null}

        {deleted ? (
          <p className="flex items-center gap-2 text-sm text-zinc-500 italic">
            <Trash2 className="size-3.5" />{' '}
            {mine
              ? 'Você excluiu esta mensagem'
              : `${personLabel(message.author)} excluiu esta mensagem`}
          </p>
        ) : editing ? (
          <div className="space-y-2">
            <textarea
              autoFocus
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setEditing(false);
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void saveEdit();
                }
              }}
              className="min-h-20 w-full rounded-lg border border-violet-400 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/30 dark:bg-zinc-900"
              aria-label="Editar mensagem"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void saveEdit()}>
                <Check /> Salvar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
              >
                <X /> Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <>
            {message.content ? (
              <MessageContent content={message.content} />
            ) : null}
            <MessageAttachments attachments={message.attachments} />
            <SharedResourceCard message={message} />
          </>
        )}

        {!deleted && message.reactions.length ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                type="button"
                onClick={() => onReaction(message, reaction.emoji)}
                title={reaction.users.map(personLabel).join(', ')}
                className={`rounded-full border px-2 py-0.5 text-xs transition focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none ${
                  reaction.reactedByMe
                    ? 'border-violet-400 bg-violet-500/15 text-violet-700 dark:text-violet-200'
                    : 'border-zinc-200 bg-zinc-100 hover:border-violet-300 dark:border-zinc-700 dark:bg-zinc-900'
                }`}
                aria-label={`${reaction.emoji}, ${reaction.count} reações. ${reaction.users.map(personLabel).join(', ')}`}
              >
                {reaction.emoji} {reaction.count}
              </button>
            ))}
          </div>
        ) : null}

        {!deleted && !direct && message.replyCount > 0 ? (
          <button
            type="button"
            onClick={() => onOpenThread(message)}
            className="mt-1.5 inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-xs font-medium text-violet-700 hover:bg-violet-500/10 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none dark:text-violet-300"
          >
            <MessageSquareText className="size-3.5" />
            {message.replyCount}{' '}
            {message.replyCount === 1 ? 'resposta' : 'respostas'}
          </button>
        ) : null}

        {pending ? (
          <div className="mt-1 text-[11px]">
            {message.clientStatus === 'SENDING' ? (
              <div className="flex max-w-xs items-center gap-2 text-zinc-500">
                <Loader2 className="size-3 animate-spin" />
                <span>
                  {message.attachments.length
                    ? `Enviando... ${message.uploadProgress}%`
                    : 'Enviando...'}
                </span>
                {message.attachments.length ? (
                  <span className="h-1 flex-1 overflow-hidden rounded bg-zinc-200 dark:bg-zinc-800">
                    <span
                      className="block h-full bg-violet-500"
                      style={{ width: `${message.uploadProgress}%` }}
                    />
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-red-600 dark:text-red-400">
                <span>Não foi possível enviar: {message.error}</span>
                <button
                  type="button"
                  onClick={() => onRetry(message)}
                  className="inline-flex items-center gap-1 font-semibold underline underline-offset-2"
                >
                  <RefreshCw className="size-3" /> Tentar novamente
                </button>
              </div>
            )}
          </div>
        ) : mine && direct ? (
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-500">
            {message.readByOthers ? (
              <CheckCheck className="size-3 text-violet-500" />
            ) : (
              <Check className="size-3" />
            )}
            {message.readByOthers ? 'Lida' : 'Enviada'}
          </div>
        ) : null}
      </div>

      {!deleted && !pending ? (
        <div className="absolute top-0.5 right-2 flex rounded-lg border border-zinc-200 bg-white p-0.5 opacity-100 shadow-sm sm:opacity-0 sm:group-focus-within/message:opacity-100 sm:group-hover/message:opacity-100 dark:border-zinc-700 dark:bg-zinc-900">
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => onReply(message)}
            aria-label="Responder"
            title="Responder"
          >
            <Reply />
          </Button>
          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => setReactionsOpen((open) => !open)}
              aria-label="Reagir"
              aria-expanded={reactionsOpen}
            >
              <SmilePlus />
            </Button>
            {reactionsOpen ? (
              <ReactionPicker
                onSelect={(emoji) => onReaction(message, emoji)}
                onClose={() => setReactionsOpen(false)}
              />
            ) : null}
          </div>
          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Mais ações"
              aria-expanded={menuOpen}
            >
              <Ellipsis />
            </Button>
            {menuOpen ? (
              <div className="absolute top-8 right-0 z-30 w-52 rounded-lg border border-zinc-200 bg-white p-1 text-sm shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                {message.canEdit ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <Pencil className="size-4" /> Editar
                  </button>
                ) : null}
                {canPin ? (
                  <button
                    type="button"
                    onClick={() => {
                      onPin(message, !message.pinnedAt);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {message.pinnedAt ? (
                      <PinOff className="size-4" />
                    ) : (
                      <Pin className="size-4" />
                    )}{' '}
                    {message.pinnedAt ? 'Desafixar' : 'Fixar'}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(message.content);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Clipboard className="size-4" /> Copiar texto
                </button>
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="flex w-full items-center gap-2 rounded px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <Link2 className="size-4" /> Copiar link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onCreateEvent(message);
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded px-2 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <CalendarDays className="size-4" /> Criar reunião
                </button>
                {canModerate ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(message);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="size-4" /> Excluir
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
