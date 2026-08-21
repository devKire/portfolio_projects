'use client';

import {
  Hash,
  Lock,
  MessageCircle,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import type { ChatChannelDTO, ChatWorkspaceDTO } from '@/lib/chat/types';

function ChannelIcon({ type }: { type: ChatChannelDTO['type'] }) {
  if (type === 'PRIVATE') return <Lock className="size-4" />;
  if (type === 'DIRECT') return <MessageCircle className="size-4" />;
  if (type === 'TEAM') return <Users className="size-4" />;
  return <Hash className="size-4" />;
}

function ConversationButton({
  channel,
  active,
  onSelect,
}: {
  channel: ChatChannelDTO;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none ${
        active
          ? 'bg-violet-500/15 text-violet-800 dark:text-violet-200'
          : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <span
        className={
          active ? 'text-violet-600 dark:text-violet-300' : 'text-zinc-500'
        }
      >
        <ChannelIcon type={channel.type} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-sm ${channel.unreadCount ? 'font-semibold' : 'font-medium'}`}
        >
          {channel.name}
        </span>
        {channel.lastMessage ? (
          <span className="block truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            {channel.lastMessage.author.name ||
              `@${channel.lastMessage.author.username}`}
            : {channel.lastMessage.content || 'Arquivo'}
          </span>
        ) : null}
      </span>
      {channel.mentionCount ? (
        <span
          className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-semibold text-white"
          aria-label={`${channel.mentionCount} menções`}
        >
          @{channel.mentionCount}
        </span>
      ) : channel.unreadCount ? (
        <span
          className="min-w-5 rounded-full bg-zinc-900 px-1.5 py-0.5 text-center text-[10px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
          aria-label={`${channel.unreadCount} mensagens não lidas`}
        >
          {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
        </span>
      ) : null}
    </button>
  );
}

export function ConversationSidebar({
  workspace,
  activeChannelId,
  mobileOpen,
  onMobileClose,
  onSelect,
  onNewChannel,
  onNewDirect,
}: {
  workspace: ChatWorkspaceDTO;
  activeChannelId: string | null;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onSelect: (channelId: string) => void;
  onNewChannel: () => void;
  onNewDirect: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? workspace.channels.filter((channel) =>
          channel.name.toLowerCase().includes(normalized)
        )
      : workspace.channels;
  }, [query, workspace.channels]);
  const channels = filtered.filter((channel) => channel.type !== 'DIRECT');
  const directs = filtered.filter((channel) => channel.type === 'DIRECT');
  function select(channelId: string) {
    onSelect(channelId);
    onMobileClose();
  }
  return (
    <aside
      className={`${
        mobileOpen ? 'flex' : 'hidden'
      } absolute inset-0 z-40 w-full flex-col border-r border-zinc-200 bg-zinc-50 md:static md:flex md:w-72 md:shrink-0 dark:border-zinc-800 dark:bg-zinc-950`}
      aria-label="Conversas"
    >
      <div className="flex h-16 items-center gap-2 border-b border-zinc-200 px-3 dark:border-zinc-800">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold">Conversas</h2>
          <p className="truncate text-[11px] text-zinc-500">
            {workspace.organization.name}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="md:hidden"
          onClick={onMobileClose}
          aria-label="Fechar conversas"
        >
          <X />
        </Button>
      </div>
      <div className="p-3 pb-1">
        <label className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 focus-within:border-violet-500 dark:border-zinc-700 dark:bg-zinc-900">
          <Search className="size-4 text-zinc-500" />
          <span className="sr-only">Filtrar conversas</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar conversas"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="mb-5">
          <div className="mb-1 flex items-center justify-between px-2">
            <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
              Canais
            </span>
            {workspace.canCreateChannel ? (
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={onNewChannel}
                aria-label="Criar canal"
                title="Criar canal"
              >
                <Plus />
              </Button>
            ) : null}
          </div>
          <div className="space-y-0.5">
            {channels.map((channel) => (
              <ConversationButton
                key={channel.id}
                channel={channel}
                active={channel.id === activeChannelId}
                onSelect={() => select(channel.id)}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between px-2">
            <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
              Diretas
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={onNewDirect}
              aria-label="Nova conversa direta"
              title="Nova conversa direta"
            >
              <Plus />
            </Button>
          </div>
          <div className="space-y-0.5">
            {directs.map((channel) => (
              <ConversationButton
                key={channel.id}
                channel={channel}
                active={channel.id === activeChannelId}
                onSelect={() => select(channel.id)}
              />
            ))}
            {!directs.length ? (
              <p className="px-2 py-2 text-xs text-zinc-500">
                Nenhuma conversa direta.
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="border-t border-zinc-200 px-3 py-2 text-[11px] text-zinc-500 dark:border-zinc-800">
        {workspace.unreadCount} não lidas · {workspace.mentionCount} menções
      </div>
    </aside>
  );
}
