'use client';

import { Files, Info, Menu, Pin, Search, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ChatChannelDTO } from '@/lib/chat/types';

function channelKind(channel: ChatChannelDTO) {
  if (channel.type === 'DIRECT') return 'Conversa direta';
  if (channel.type === 'PRIVATE') return 'Canal privado';
  if (channel.type === 'TEAM') return channel.team?.name || 'Canal de equipe';
  return 'Organização';
}

export type ChatPanelKind = 'SEARCH' | 'PINS' | 'FILES' | 'INFO' | null;

export function ConversationHeader({
  channel,
  panel,
  onOpenSidebar,
  onPanel,
}: {
  channel: ChatChannelDTO;
  panel: ChatPanelKind;
  onOpenSidebar: () => void;
  onPanel: (panel: ChatPanelKind) => void;
}) {
  function toggle(next: Exclude<ChatPanelKind, null>) {
    onPanel(panel === next ? null : next);
  }
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-2 sm:px-4 dark:border-zinc-800 dark:bg-zinc-950">
      <Button
        size="icon"
        variant="ghost"
        className="md:hidden"
        onClick={onOpenSidebar}
        aria-label="Abrir conversas"
      >
        <Menu />
      </Button>
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
          {channel.type === 'DIRECT' ? channel.name : `# ${channel.name}`}
        </h2>
        <p className="flex items-center gap-1 truncate text-[11px] text-zinc-500">
          <Users className="size-3" /> {channelKind(channel)} ·{' '}
          {channel.memberCount}{' '}
          {channel.memberCount === 1 ? 'membro' : 'membros'}
        </p>
      </div>
      <div className="flex items-center gap-0.5">
        <Button
          size="icon"
          variant={panel === 'SEARCH' ? 'secondary' : 'ghost'}
          onClick={() => toggle('SEARCH')}
          aria-label="Buscar mensagens"
          title="Buscar"
        >
          <Search />
        </Button>
        <Button
          size="icon"
          variant={panel === 'PINS' ? 'secondary' : 'ghost'}
          onClick={() => toggle('PINS')}
          aria-label={`Mensagens fixadas: ${channel.pinnedCount}`}
          title="Fixadas"
        >
          <Pin />
          {channel.pinnedCount ? (
            <span className="absolute -mt-5 ml-5 min-w-4 rounded-full bg-violet-600 px-1 text-[9px] text-white">
              {channel.pinnedCount}
            </span>
          ) : null}
        </Button>
        <Button
          size="icon"
          variant={panel === 'FILES' ? 'secondary' : 'ghost'}
          onClick={() => toggle('FILES')}
          aria-label="Arquivos e mídia"
          title="Arquivos e mídia"
        >
          <Files />
        </Button>
        <Button
          size="icon"
          variant={panel === 'INFO' ? 'secondary' : 'ghost'}
          onClick={() => toggle('INFO')}
          aria-label="Informações da conversa"
          title="Informações"
        >
          <Info />
        </Button>
      </div>
    </header>
  );
}
