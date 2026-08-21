'use client';

import {
  CalendarDays,
  FileText,
  ImageIcon,
  Paperclip,
  Send,
  SmilePlus,
  TicketCheck,
  X,
} from 'lucide-react';
import {
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Button } from '@/components/ui/button';
import {
  CHAT_ATTACHMENT_ACCEPT,
  CHAT_MAX_ATTACHMENTS,
  CHAT_MAX_FILE_SIZE,
  CHAT_MAX_TOTAL_ATTACHMENT_SIZE,
  CHAT_MESSAGE_MAX_LENGTH,
  CHAT_REACTIONS,
} from '@/lib/chat/config';
import type {
  ChatClientAttachment,
  ChatMessageDTO,
  ChatPersonDTO,
} from '@/lib/chat/types';

import {
  createChatClientAttachment,
  formatChatFileSize,
  personLabel,
} from './client';

export type ComposerSharedResource = {
  type: 'CALENDAR_EVENT' | 'TASK' | 'TICKET' | 'KCS';
  id: string;
  title: string;
};

export type ComposerSendInput = {
  content: string;
  attachments: ChatClientAttachment[];
  resource: ComposerSharedResource | null;
};

function slug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-');
}

function resourceIcon(type: ComposerSharedResource['type']) {
  if (type === 'CALENDAR_EVENT') return CalendarDays;
  if (type === 'TICKET') return TicketCheck;
  return FileText;
}

export function MessageComposer({
  members,
  teams,
  replyTo,
  sharedResource,
  canMentionEveryone,
  placeholder = 'Escreva uma mensagem...',
  onCancelReply,
  onClearResource,
  onOpenResources,
  onSend,
  allowResources = true,
  textareaId,
  autoFocus = false,
}: {
  members: ChatPersonDTO[];
  teams: { id: string; name: string }[];
  replyTo: ChatMessageDTO | null;
  sharedResource: ComposerSharedResource | null;
  canMentionEveryone: boolean;
  placeholder?: string;
  onCancelReply: () => void;
  onClearResource: () => void;
  onOpenResources: () => void;
  onSend: (input: ComposerSendInput) => void;
  allowResources?: boolean;
  textareaId?: string;
  autoFocus?: boolean;
}) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<ChatClientAttachment[]>([]);
  const [addingFiles, setAddingFiles] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mentionQuery = useMemo(() => {
    const beforeCursor = content.slice(0, textareaRef.current?.selectionStart);
    const match = /(?:^|\s)@([a-z0-9._-]*)$/i.exec(beforeCursor);
    return match ? match[1].toLowerCase() : null;
  }, [content]);
  const mentionOptions = useMemo(() => {
    if (mentionQuery === null) return [];
    const users = members
      .filter((member) => {
        const search = `${member.name || ''} ${member.username}`.toLowerCase();
        return search.includes(mentionQuery);
      })
      .slice(0, 5)
      .map((member) => ({
        id: `user:${member.id}`,
        label: personLabel(member),
        detail: `@${member.username}`,
        value: `@${member.username}`,
      }));
    const teamOptions = teams
      .filter((team) => team.name.toLowerCase().includes(mentionQuery))
      .slice(0, 3)
      .map((team) => ({
        id: `team:${team.id}`,
        label: team.name,
        detail: 'Equipe',
        value: `@equipe:${slug(team.name)}`,
      }));
    const everyone =
      canMentionEveryone && 'todos'.includes(mentionQuery)
        ? [
            {
              id: 'everyone',
              label: 'Todos',
              detail: 'Toda a organização',
              value: '@todos',
            },
          ]
        : [];
    return [...users, ...teamOptions, ...everyone];
  }, [canMentionEveryone, members, mentionQuery, teams]);

  async function addFiles(files: File[]) {
    if (!files.length) return;
    setError(null);
    const allowedExtensions = new Set(
      CHAT_ATTACHMENT_ACCEPT.split(',').map((value) => value.slice(1))
    );
    if (
      files.some(
        (file) =>
          !allowedExtensions.has(
            file.name.split('.').pop()?.toLowerCase() || ''
          )
      )
    ) {
      setError('Um ou mais arquivos possuem formato não permitido.');
      return;
    }
    if (attachments.length + files.length > CHAT_MAX_ATTACHMENTS) {
      setError(`Envie no máximo ${CHAT_MAX_ATTACHMENTS} arquivos.`);
      return;
    }
    if (files.some((file) => file.size > CHAT_MAX_FILE_SIZE)) {
      setError('Cada arquivo pode ter no máximo 3 MB.');
      return;
    }
    const total = [...attachments.map((item) => item.file), ...files].reduce(
      (sum, file) => sum + file.size,
      0
    );
    if (total > CHAT_MAX_TOTAL_ATTACHMENT_SIZE) {
      setError('Os anexos podem somar no máximo 8 MB.');
      return;
    }
    setAddingFiles(true);
    const prepared = await Promise.all(files.map(createChatClientAttachment));
    setAttachments((current) => [...current, ...prepared]);
    setAddingFiles(false);
  }

  function removeAttachment(id: string) {
    setAttachments((current) => {
      const target = current.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  function insertMention(value: string) {
    const textarea = textareaRef.current;
    const cursor = textarea?.selectionStart ?? content.length;
    const before = content.slice(0, cursor).replace(/@[^\s@]*$/, value);
    const next = `${before} ${content.slice(cursor)}`;
    setContent(next);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function submit() {
    if (
      (!content.trim() && !attachments.length && !sharedResource) ||
      addingFiles
    ) {
      return;
    }
    const selectedAttachments = attachments;
    onSend({
      content,
      attachments: selectedAttachments,
      resource: sharedResource,
    });
    setContent('');
    setAttachments([]);
    setError(null);
    setEmojiOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') {
      if (replyTo) onCancelReply();
      else if (sharedResource) onClearResource();
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.files).filter((file) =>
      file.type.startsWith('image/')
    );
    if (files.length) {
      event.preventDefault();
      void addFiles(files);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void addFiles(Array.from(event.dataTransfer.files));
  }

  const SharedIcon = sharedResource ? resourceIcon(sharedResource.type) : null;
  return (
    <div
      className="relative border-t border-zinc-200 bg-white p-2 sm:p-3 dark:border-zinc-800 dark:bg-zinc-950"
      onDragEnter={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setDragging(false);
      }}
      onDrop={handleDrop}
    >
      {dragging ? (
        <div className="pointer-events-none absolute inset-2 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-violet-500 bg-violet-500/10 font-medium text-violet-700 backdrop-blur-sm dark:text-violet-200">
          Solte os arquivos aqui
        </div>
      ) : null}
      {replyTo ? (
        <div className="mb-2 flex items-start gap-2 rounded-lg border-l-2 border-violet-500 bg-violet-500/5 px-3 py-2 text-xs">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-violet-700 dark:text-violet-300">
              Respondendo a {personLabel(replyTo.author)}
            </p>
            <p className="truncate text-zinc-600 dark:text-zinc-400">
              {replyTo.content || replyTo.attachments[0]?.originalName}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={onCancelReply}
            aria-label="Cancelar resposta"
          >
            <X />
          </Button>
        </div>
      ) : null}
      {sharedResource && SharedIcon ? (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
          <SharedIcon className="size-4 text-violet-500" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {sharedResource.title}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={onClearResource}
            aria-label="Remover recurso compartilhado"
          >
            <X />
          </Button>
        </div>
      ) : null}
      {attachments.length ? (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {attachment.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={attachment.previewUrl}
                  alt={attachment.file.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="min-w-0 px-2 text-center">
                  <FileText className="mx-auto mb-1 size-5 text-violet-500" />
                  <span className="block truncate text-[11px]">
                    {attachment.file.name}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {formatChatFileSize(attachment.file.size)}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeAttachment(attachment.id)}
                className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                aria-label={`Remover ${attachment.file.name}`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {mentionOptions.length ? (
        <div className="absolute right-3 bottom-full left-3 z-30 mb-1 max-h-64 overflow-auto rounded-xl border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {mentionOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insertMention(option.value)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-zinc-100 focus-visible:bg-zinc-100 focus-visible:outline-none dark:hover:bg-zinc-800 dark:focus-visible:bg-zinc-800"
            >
              <span className="font-medium">{option.label}</span>
              <span className="text-xs text-zinc-500">{option.detail}</span>
            </button>
          ))}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mb-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <div className="rounded-xl border border-zinc-300 bg-white focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-900">
        <textarea
          id={textareaId}
          ref={textareaRef}
          autoFocus={autoFocus}
          value={content}
          onChange={(event) =>
            setContent(event.target.value.slice(0, CHAT_MESSAGE_MAX_LENGTH))
          }
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          rows={2}
          aria-label="Mensagem"
          className="max-h-40 min-h-14 w-full resize-none bg-transparent px-3 pt-3 text-sm outline-none placeholder:text-zinc-500"
        />
        <div className="flex items-center gap-1 border-t border-zinc-200 px-2 py-1.5 dark:border-zinc-800">
          <input
            ref={inputRef}
            type="file"
            accept={CHAT_ATTACHMENT_ACCEPT}
            multiple
            className="sr-only"
            onChange={(event) => {
              void addFiles(Array.from(event.target.files || []));
              event.target.value = '';
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={() => inputRef.current?.click()}
            aria-label="Anexar arquivos"
            title="Anexar arquivos"
          >
            <Paperclip />
          </Button>
          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={() => setEmojiOpen((open) => !open)}
              aria-label="Inserir emoji"
              aria-expanded={emojiOpen}
            >
              <SmilePlus />
            </Button>
            {emojiOpen ? (
              <div className="absolute bottom-10 left-0 z-30 flex rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                {CHAT_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setContent((value) => `${value}${emoji}`);
                      setEmojiOpen(false);
                      textareaRef.current?.focus();
                    }}
                    className="rounded p-1.5 text-lg hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none dark:hover:bg-zinc-800"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {allowResources ? (
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={onOpenResources}
              aria-label="Compartilhar evento, chamado, tarefa ou KCS"
              title="Compartilhar recurso"
            >
              <TicketCheck />
            </Button>
          ) : null}
          <span className="ml-auto hidden text-[11px] text-zinc-500 sm:inline">
            Enter envia · Shift+Enter quebra linha
          </span>
          <Button
            size="sm"
            onClick={submit}
            disabled={
              addingFiles ||
              (!content.trim() && !attachments.length && !sharedResource)
            }
          >
            {addingFiles ? <ImageIcon className="animate-pulse" /> : <Send />}
            <span className="hidden sm:inline">Enviar</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
