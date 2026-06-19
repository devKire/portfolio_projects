// app/admin/_components/MobileDrawer.tsx
'use client';

import { useClickOutside } from '../_hooks/useClickOutside';
import Sidebar from './Sidebar';
import type { AdminUserSummary } from './AdminPanel';

interface MobileDrawerProps {
  user: AdminUserSummary;
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export default function MobileDrawer({
  user,
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  onLogout,
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
        />
      </div>
    </div>
  );
}
