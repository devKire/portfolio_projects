// app/admin/_components/AdminLayout.tsx
'use client';

import { ReactNode } from 'react';
import HeaderMobile from './HeaderMobile';
import Sidebar from './Sidebar';
import MobileDrawer from './MobileDrawer';
import type { AdminUserSummary } from './AdminPanel';
import type { OrganizationContext } from '@/lib/organizations/context';

interface AdminLayoutProps {
  children: ReactNode;
  user: AdminUserSummary;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  onCloseMobileMenu: () => void;
  isMobile: boolean;
  organizationContext: OrganizationContext;
  onOrganizationChange: (organizationId: string) => void;
  isSwitchingOrganization: boolean;
}

export default function AdminLayout({
  children,
  user,
  activeTab,
  onTabChange,
  onLogout,
  isSidebarCollapsed,
  onToggleSidebar,
  isMobileMenuOpen,
  onToggleMobileMenu,
  onCloseMobileMenu,
  isMobile,
  organizationContext,
  onOrganizationChange,
  isSwitchingOrganization,
}: AdminLayoutProps) {
  return (
    <div className="flex min-h-dvh min-w-0 bg-[#161619] text-[#dcddde] lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      {/* Sidebar Desktop */}
      <div className="hidden lg:sticky lg:top-0 lg:block lg:h-dvh lg:min-h-0 lg:shrink-0 lg:overflow-hidden">
        <Sidebar
          user={user}
          activeTab={activeTab}
          onTabChange={onTabChange}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={onToggleSidebar}
          onLogout={onLogout}
          variant="desktop"
          organizationContext={organizationContext}
          onOrganizationChange={onOrganizationChange}
          isSwitchingOrganization={isSwitchingOrganization}
        />
      </div>

      {/* Main Area */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header Mobile */}
        <HeaderMobile
          isMenuOpen={isMobileMenuOpen}
          onToggleMenu={onToggleMobileMenu}
          activeTab={activeTab}
          onLogout={onLogout}
          activeOrganizationName={
            organizationContext.organizations.find(
              (item) => item.id === organizationContext.activeOrganizationId
            )?.name || null
          }
        />

        {/* Content */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-3 md:p-4 lg:p-6">
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer
        user={user}
        isOpen={isMobileMenuOpen && isMobile}
        onClose={onCloseMobileMenu}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onLogout={onLogout}
        organizationContext={organizationContext}
        onOrganizationChange={onOrganizationChange}
        isSwitchingOrganization={isSwitchingOrganization}
      />
    </div>
  );
}
