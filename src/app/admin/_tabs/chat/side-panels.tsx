'use client';

import {
  FileText,
  ImageIcon,
  Loader2,
  Pin,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getChatMedia,
  getPinnedChatMessages,
  searchChatMessages,
} from '@/app/actions/chat';
import { Button } from '@/components/ui/button';
import type {
  ChatAttachmentDTO,
  ChatChannelDTO,
  ChatMessageDTO,
  ChatWorkspaceDTO,
} from '@/lib/chat/types';

import { formatChatFileSize, personLabel } from './client';
import type { ChatPanelKind } from './conversation-header';

function resultTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function ResultButton({
  message,
  onNavigate,
}: {
  message: ChatMessageDTO;
  onNavigate: (messageId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(message.id)}
      className="w-full rounded-lg border border-zinc-200 p-3 text-left transition hover:border-violet-400 hover:bg-violet-50/50 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none dark:border-zinc-800 dark:hover:border-violet-600 dark:hover:bg-violet-950/20"
    >
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold">{personLabel(message.author)}</span>
        <time className="text-zinc-500">{resultTime(message.createdAt)}</time>
      </div>
      <p className="mt-1 line-clamp-3 text-sm text-zinc-700 dark:text-zinc-300">
        {message.content ||
          message.attachments[0]?.originalName ||
          'Recurso compartilhado'}
      </p>
      {message.attachments.length ? (
        <span className="mt-1 inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-300">
          <FileText className="size-3" /> {message.attachments.length}{' '}
          arquivo(s)
        </span>
      ) : null}
    </button>
  );
}

function SearchPanel({
  channel,
  workspace,
  onNavigate,
}: {
  channel: ChatChannelDTO;
  workspace: ChatWorkspaceDTO;
  onNavigate: (messageId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [withAttachments, setWithAttachments] = useState(false);
  const [imagesOnly, setImagesOnly] = useState(false);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [results, setResults] = useState<ChatMessageDTO[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRequestRef = useRef(0);

  const runSearch = useCallback(
    async (nextCursor: string | null, append = false) => {
      const requestId = ++searchRequestRef.current;
      setLoading(true);
      setError(null);
      const result = await searchChatMessages({
        channelId: channel.id,
        query,
        authorId: authorId || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
        withAttachments: withAttachments || imagesOnly,
        imagesOnly,
        pinnedOnly,
        cursor: nextCursor,
        limit: 30,
      });
      if (requestId !== searchRequestRef.current) return;
      if (result.success) {
        setResults((current) =>
          append ? [...current, ...result.data.messages] : result.data.messages
        );
        setCursor(result.data.nextCursor);
      } else {
        setError(result.error);
      }
      setLoading(false);
    },
    [
      authorId,
      channel.id,
      dateFrom,
      dateTo,
      imagesOnly,
      pinnedOnly,
      query,
      withAttachments,
    ]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => void runSearch(null, false), 300);
    return () => window.clearTimeout(timeout);
  }, [runSearch]);

  return (
    <div className="space-y-3">
      <label className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 px-2.5 focus-within:border-violet-500 dark:border-zinc-700">
        <Search className="size-4 text-zinc-500" />
        <span className="sr-only">Buscar conteúdo, autor ou arquivo</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Buscar em ${channel.name}`}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-zinc-500">
          De
          <select
            value={authorId}
            onChange={(event) => setAuthorId(event.target.value)}
            className="mt-1 h-8 w-full rounded border border-zinc-200 bg-white px-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">Qualquer autor</option>
            {workspace.members.map((member) => (
              <option key={member.id} value={member.id}>
                {personLabel(member)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-500">
          Período
          <div className="mt-1 flex gap-1">
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-8 min-w-0 flex-1 rounded border border-zinc-200 bg-white px-1 text-[10px] dark:border-zinc-700 dark:bg-zinc-900"
              aria-label="Data inicial"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-8 min-w-0 flex-1 rounded border border-zinc-200 bg-white px-1 text-[10px] dark:border-zinc-700 dark:bg-zinc-900"
              aria-label="Data final"
            />
          </div>
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5 text-xs">
        {[
          [
            'Arquivos',
            withAttachments,
            () => setWithAttachments((value) => !value),
          ],
          ['Imagens', imagesOnly, () => setImagesOnly((value) => !value)],
          ['Fixadas', pinnedOnly, () => setPinnedOnly((value) => !value)],
        ].map(([label, active, toggle]) => (
          <button
            key={String(label)}
            type="button"
            onClick={toggle as () => void}
            className={`rounded-full border px-2.5 py-1 ${active ? 'border-violet-500 bg-violet-500/15 text-violet-700 dark:text-violet-200' : 'border-zinc-200 dark:border-zinc-700'}`}
          >
            {String(label)}
          </button>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-zinc-500">
        {loading ? 'Buscando...' : `${results.length} resultado(s)`}
      </p>
      <div className="space-y-2">
        {results.map((message) => (
          <ResultButton
            key={message.id}
            message={message}
            onNavigate={onNavigate}
          />
        ))}
      </div>
      {cursor ? (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => void runSearch(cursor, true)}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" /> : null} Carregar mais
        </Button>
      ) : null}
    </div>
  );
}

function PinsPanel({
  channelId,
  onNavigate,
}: {
  channelId: string;
  onNavigate: (messageId: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void getPinnedChatMessages(channelId).then((result) => {
      if (!active) return;
      if (result.success) setMessages(result.data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [channelId]);
  if (loading)
    return (
      <p className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="size-4 animate-spin" /> Carregando fixadas...
      </p>
    );
  return messages.length ? (
    <div className="space-y-2">
      {messages.map((message) => (
        <ResultButton
          key={message.id}
          message={message}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  ) : (
    <p className="text-sm text-zinc-500">Nenhuma mensagem fixada.</p>
  );
}

type MediaItem = ChatAttachmentDTO & {
  messageId: string;
  createdAt: string;
  message: {
    content: string;
    author: { id: string; name: string | null; username: string };
  };
};

function FilesPanel({
  channelId,
  onNavigate,
}: {
  channelId: string;
  onNavigate: (messageId: string) => void;
}) {
  const [imagesOnly, setImagesOnly] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(
    async (append = false) => {
      setLoading(true);
      const result = await getChatMedia({
        channelId,
        imagesOnly,
        cursor: append ? cursor : null,
      });
      if (result.success) {
        const next = result.data.attachments as MediaItem[];
        setItems((current) => (append ? [...current, ...next] : next));
        setCursor(result.data.nextCursor);
      }
      setLoading(false);
    },
    [channelId, cursor, imagesOnly]
  );
  useEffect(() => {
    void load(false);
  }, [channelId, imagesOnly]);
  return (
    <div>
      <div className="mb-3 flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setImagesOnly(false)}
          className={`flex-1 rounded px-2 py-1.5 text-xs font-medium ${!imagesOnly ? 'bg-white shadow dark:bg-zinc-800' : ''}`}
        >
          <FileText className="mr-1 inline size-3" /> Arquivos
        </button>
        <button
          type="button"
          onClick={() => setImagesOnly(true)}
          className={`flex-1 rounded px-2 py-1.5 text-xs font-medium ${imagesOnly ? 'bg-white shadow dark:bg-zinc-800' : ''}`}
        >
          <ImageIcon className="mr-1 inline size-3" /> Mídia
        </button>
      </div>
      {loading && !items.length ? (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="size-4 animate-spin" /> Carregando...
        </p>
      ) : null}
      <div className={imagesOnly ? 'grid grid-cols-3 gap-1' : 'space-y-2'}>
        {items.map((item) =>
          imagesOnly ? (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.messageId)}
              className="aspect-square overflow-hidden rounded-lg border border-zinc-200 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none dark:border-zinc-700"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.originalName}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ) : (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.messageId)}
              className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 p-2 text-left hover:border-violet-400 dark:border-zinc-800"
            >
              <FileText className="size-5 shrink-0 text-violet-500" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {item.originalName}
                </span>
                <span className="text-[11px] text-zinc-500">
                  {formatChatFileSize(item.size)} ·{' '}
                  {personLabel(item.message.author)}
                </span>
              </span>
            </button>
          )
        )}
      </div>
      {!items.length && !loading ? (
        <p className="text-sm text-zinc-500">Nenhum arquivo encontrado.</p>
      ) : null}
      {cursor ? (
        <Button
          variant="outline"
          className="mt-3 w-full"
          onClick={() => void load(true)}
          disabled={loading}
        >
          Carregar mais
        </Button>
      ) : null}
    </div>
  );
}

function InfoPanel({ channel }: { channel: ChatChannelDTO }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-zinc-100 p-4 text-center dark:bg-zinc-900">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-600 dark:text-violet-300">
          <Users />
        </span>
        <h4 className="mt-2 font-semibold">{channel.name}</h4>
        <p className="mt-1 text-xs text-zinc-500">
          {channel.description || 'Sem descrição.'}
        </p>
      </div>
      <div>
        <h4 className="mb-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
          Membros · {channel.memberCount}
        </h4>
        <div className="space-y-2">
          {channel.members.map((member) => (
            <div key={member.id} className="flex items-center gap-2 text-sm">
              <span className="flex size-7 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-semibold text-violet-700 dark:text-violet-200">
                {(member.name || member.username).slice(0, 2).toUpperCase()}
              </span>
              <span className="truncate">{personLabel(member)}</span>
            </div>
          ))}
        </div>
        {channel.members.length < channel.memberCount ? (
          <p className="mt-2 text-xs text-zinc-500">
            A lista completa segue a associação atual da organização/equipe.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function ChatSidePanel({
  panel,
  channel,
  workspace,
  onClose,
  onNavigate,
}: {
  panel: Exclude<ChatPanelKind, null>;
  channel: ChatChannelDTO;
  workspace: ChatWorkspaceDTO;
  onClose: () => void;
  onNavigate: (messageId: string) => void;
}) {
  const title =
    panel === 'SEARCH'
      ? 'Buscar mensagens'
      : panel === 'PINS'
        ? 'Mensagens fixadas'
        : panel === 'FILES'
          ? 'Arquivos e mídia'
          : 'Informações';
  const Icon =
    panel === 'SEARCH'
      ? Search
      : panel === 'PINS'
        ? Pin
        : panel === 'FILES'
          ? FileText
          : Users;
  return (
    <aside
      className="absolute inset-y-0 right-0 z-30 flex w-full max-w-sm flex-col border-l border-zinc-200 bg-white shadow-xl sm:w-96 dark:border-zinc-800 dark:bg-zinc-950"
      aria-label={title}
    >
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-zinc-200 px-4 dark:border-zinc-800">
        <Icon className="size-4 text-violet-500" />
        <h3 className="flex-1 font-semibold">{title}</h3>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          aria-label="Fechar painel"
        >
          <X />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {panel === 'SEARCH' ? (
          <SearchPanel
            channel={channel}
            workspace={workspace}
            onNavigate={onNavigate}
          />
        ) : null}
        {panel === 'PINS' ? (
          <PinsPanel channelId={channel.id} onNavigate={onNavigate} />
        ) : null}
        {panel === 'FILES' ? (
          <FilesPanel channelId={channel.id} onNavigate={onNavigate} />
        ) : null}
        {panel === 'INFO' ? <InfoPanel channel={channel} /> : null}
      </div>
    </aside>
  );
}
