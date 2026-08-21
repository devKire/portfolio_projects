// app/admin/_components/MobileDrawer.tsx
'use client';

import { useClickOutside } from '../_hooks/useClickOutside';
import Sidebar from './Sidebar';
import type { AdminUserSummary } from './AdminPanel';
import type { OrganizationContext } from '@/lib/organizations/context';

interface MobileDrawerProps {
  user: AdminUserSummary;
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  organizationContext: OrganizationContext;
  onOrganizationChange: (organizationId: string) => void;
  isSwitchingOrganization: boolean;
}

export default function MobileDrawer({
  user,
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  onLogout,
  organizationContext,
  onOrganizationChange,
  isSwitchingOrganization,
}: MobileDrawerProps) {
  const drawerRef = useClickOutside<HTMLDivElement>(onClose, isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="animate-slide-in absolute inset-y-0 left-0 w-72"
      >
        <Sidebar
          user={user}
          activeTab={activeTab}
          onTabChange={onTabChange}
          isCollapsed={false}
          onToggleCollapse={() => {}}
          onLogout={onLogout}
          variant="mobile"
          onItemClick={onClose}
          organizationContext={organizationContext}
          onOrganizationChange={onOrganizationChange}
          isSwitchingOrganization={isSwitchingOrganization}
        />
      </div>
    </div>
  );
}
