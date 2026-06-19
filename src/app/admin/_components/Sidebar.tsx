// app/admin/_components/Sidebar.tsx
'use client';

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { TAB_CONFIG } from '../_config/navigation';
import TabButton from './TabButton';
import type { AdminUserSummary } from './AdminPanel';

interface SidebarProps {
  user: AdminUserSummary;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
  variant: 'desktop' | 'mobile';
  onItemClick?: () => void;
}

export default function Sidebar({
  user,
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  onLogout,
  variant = 'desktop',
  onItemClick,
}: SidebarProps) {
  const isMobile = variant === 'mobile';
  const [copied, setCopied] = useState(false);
  const publicPath = `/${user.publicSlug}`;

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    onItemClick?.();
  };

  const copyPublicUrl = async () => {
    await navigator.clipboard.writeText(
      `${window.location.origin}${publicPath}`
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <aside
      className={`flex h-dvh min-h-0 shrink-0 flex-col overflow-hidden border-r border-[#2f2f35] bg-[#19191d] ${isCollapsed && !isMobile ? 'w-16' : 'w-64'} ${isMobile ? 'w-full' : 'sticky top-0'} transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#2f2f35] p-3">
        {(!isCollapsed || isMobile) && (
          <div className="overflow-hidden">
            <h2 className="text-sm font-semibold text-[#f2f2f3]">
              Admin Workspace
            </h2>
            <p className="text-[11px] text-[#777780]">Portfolio OS</p>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={onToggleCollapse}
            className="rounded-md p-1.5 text-[#9b9ba3] transition-colors hover:bg-[#24242a] hover:text-white"
            aria-label={isCollapsed ? 'Expandir' : 'Recolher'}
          >
            {isCollapsed ? (
              <ChevronRight size={18} />
            ) : (
              <ChevronLeft size={18} />
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {TAB_CONFIG.map((tab) => (
            <TabButton
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              isActive={activeTab === tab.id}
              isCollapsed={isCollapsed && !isMobile}
              onClick={() => handleTabClick(tab.id)}
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-[#2f2f35] p-2">
        {(!isCollapsed || isMobile) && (
          <div className="mb-2 rounded-md border border-[#2f2f35] bg-[#202024] p-3">
            <p className="truncate text-sm font-medium text-white">
              {user.name || user.username}
            </p>
            <p className="truncate text-xs text-[#9b9ba3]">
              @{user.username} · {user.email}
            </p>
            <div className="mt-3 flex items-center gap-1">
              <Link
                href={publicPath}
                target="_blank"
                className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-[#303036] px-2 text-xs text-[#c9b8ff] hover:bg-[#24242a] focus:ring-2 focus:ring-[#9a8cff]/40 focus:outline-none"
                title={`Abrir ${publicPath}`}
              >
                <ExternalLink
                  size={14}
                  className="shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">{publicPath}</span>
              </Link>
              <button
                type="button"
                onClick={copyPublicUrl}
                className="flex min-h-10 min-w-10 items-center justify-center rounded-md border border-[#303036] text-[#9b9ba3] hover:bg-[#24242a] hover:text-white focus:ring-2 focus:ring-[#9a8cff]/40 focus:outline-none"
                aria-label="Copiar link público"
                title="Copiar link público"
              >
                {copied ? (
                  <Check size={16} aria-hidden="true" />
                ) : (
                  <Copy size={16} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-300 transition-colors hover:bg-red-500/10 ${isCollapsed && !isMobile ? 'justify-center' : ''} `}
          title="Sair"
        >
          <LogOut size={20} className="flex-shrink-0" />
          {(!isCollapsed || isMobile) && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
