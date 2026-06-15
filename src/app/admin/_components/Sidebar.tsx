// app/admin/_components/Sidebar.tsx
'use client';

import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { TAB_CONFIG } from '../_config/navigation';
import TabButton from './TabButton';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
  variant: 'desktop' | 'mobile';
  onItemClick?: () => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  onLogout,
  variant = 'desktop',
  onItemClick,
}: SidebarProps) {
  const isMobile = variant === 'mobile';

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    onItemClick?.();
  };

  return (
    <aside
      className={`flex h-screen flex-col border-r border-[#2f2f35] bg-[#19191d] ${isCollapsed && !isMobile ? 'w-16' : 'w-64'} ${isMobile ? 'w-full' : ''} transition-all duration-300`}
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
