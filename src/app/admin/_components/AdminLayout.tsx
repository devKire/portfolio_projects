// app/admin/_components/AdminLayout.tsx
'use client';

import { ReactNode } from 'react';
import HeaderMobile from './HeaderMobile';
import Sidebar from './Sidebar';
import MobileDrawer from './MobileDrawer';

interface AdminLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onCloseMobileMenu: () => void;
  isMobile: boolean;
}

export default function AdminLayout({
  children,
  activeTab,
  onTabChange,
  onLogout,
  isSidebarCollapsed,
  onToggleSidebar,
  isMobileMenuOpen,
  onToggleMobileMenu,
  onCloseMobileMenu,
  isMobile,
}: AdminLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar Desktop */}
      <div className="hidden lg:block">
        <Sidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={onToggleSidebar}
          onLogout={onLogout}
          variant="desktop"
        />
      </div>

      {/* Main Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header Mobile */}
        <HeaderMobile
          isMenuOpen={isMobileMenuOpen}
          onToggleMenu={onToggleMobileMenu}
          activeTab={activeTab}
          onLogout={onLogout}
        />

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isMobileMenuOpen && isMobile}
        onClose={onCloseMobileMenu}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onLogout={onLogout}
      />
    </div>
  );
}
