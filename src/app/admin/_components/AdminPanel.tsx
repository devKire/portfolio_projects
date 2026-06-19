// app/admin/_components/AdminPanel.tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logoutUser } from '@/app/actions/auth';
import { useMediaQuery } from '../_hooks/useMediaQuery';
import AdminLayout from './AdminLayout';
import ContentRouter from './ContentRouter';

export type AdminUserSummary = {
  id: string;
  name: string | null;
  username: string;
  email: string;
  publicSlug: string;
};

export default function AdminPanel({ user }: { user: AdminUserSummary }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const isMobile = useMediaQuery('(max-width: 1023px)');

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  }, []);

  const handleLogout = useCallback(async () => {
    await logoutUser();
    setIsMobileMenuOpen(false);
    router.replace('/login');
    router.refresh();
  }, [router]);

  return (
    <AdminLayout
      user={user}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onLogout={handleLogout}
      isSidebarCollapsed={isSidebarCollapsed}
      onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      isMobileMenuOpen={isMobileMenuOpen}
      onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
      isMobile={isMobile}
    >
      <ContentRouter activeTab={activeTab} />
    </AdminLayout>
  );
}
