// app/admin/_components/HeaderMobile.tsx
'use client';

import { LogOut, Menu } from 'lucide-react';
import { TAB_CONFIG } from '../_config/navigation';

interface HeaderMobileProps {
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  activeTab: string;
  onLogout: () => void;
  activeOrganizationName: string | null;
}

export default function HeaderMobile({
  isMenuOpen,
  onToggleMenu,
  activeTab,
  onLogout,
  activeOrganizationName,
}: HeaderMobileProps) {
  const currentTab = TAB_CONFIG.find((tab) => tab.id === activeTab);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#2f2f35] bg-[#19191d] p-3 lg:hidden">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMenu}
          className="rounded-md p-2 text-[#9b9ba3] transition-colors hover:bg-[#24242a] hover:text-white"
          aria-label="Menu"
        >
          <Menu size={22} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-medium text-[#f2f2f3]">
            {currentTab?.label || 'Admin'}
          </h1>
          {activeOrganizationName && (
            <p className="truncate text-[10px] text-[#8f8f99]">
              {activeOrganizationName}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={onLogout}
        className="rounded-md p-2 text-red-300 transition-colors hover:bg-red-500/10"
        aria-label="Sair"
      >
        <LogOut size={20} />
      </button>
    </header>
  );
}
