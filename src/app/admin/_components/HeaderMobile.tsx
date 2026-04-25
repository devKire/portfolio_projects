// app/admin/_components/HeaderMobile.tsx
'use client';

import { LogOut, Menu } from 'lucide-react';
import { TAB_CONFIG } from '../_config/navigation';

interface HeaderMobileProps {
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  activeTab: string;
  onLogout: () => void;
}

export default function HeaderMobile({
  isMenuOpen,
  onToggleMenu,
  activeTab,
  onLogout,
}: HeaderMobileProps) {
  const currentTab = TAB_CONFIG.find((tab) => tab.id === activeTab);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-gray-800 bg-gray-900/95 p-4 backdrop-blur-sm lg:hidden">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMenu}
          className="rounded-lg p-2 transition-colors hover:bg-gray-800"
          aria-label="Menu"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-sm font-medium">{currentTab?.label || 'Admin'}</h1>
      </div>

      <button
        onClick={onLogout}
        className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/10"
        aria-label="Sair"
      >
        <LogOut size={20} />
      </button>
    </header>
  );
}
