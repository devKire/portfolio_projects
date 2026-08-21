// app/admin/_components/AdminPanel.tsx
'use client';

import { useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logoutUser } from '@/app/actions/auth';
import {
  getOrganizationContext,
  setActiveOrganization,
} from '@/app/actions/organizations';
import type { OrganizationContext } from '@/lib/organizations/context';
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

export default function AdminPanel({
  user,
  organizationContext: initialOrganizationContext,
}: {
  user: AdminUserSummary;
  organizationContext: OrganizationContext;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [organizationContext, setOrganizationContext] = useState(
    initialOrganizationContext
  );
  const [isSwitchingOrganization, startOrganizationTransition] =
    useTransition();

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

  const refreshOrganizationContext = useCallback(async () => {
    const result = await getOrganizationContext();
    if (result.success) setOrganizationContext(result.data);
  }, []);

  const handleOrganizationChange = useCallback(
    (organizationId: string) => {
      startOrganizationTransition(async () => {
        const result = await setActiveOrganization(organizationId || null);
        if (!result.success) return;
        await refreshOrganizationContext();
        router.refresh();
      });
    },
    [refreshOrganizationContext, router]
  );

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
      organizationContext={organizationContext}
      onOrganizationChange={handleOrganizationChange}
      isSwitchingOrganization={isSwitchingOrganization}
    >
      <ContentRouter
        activeTab={activeTab}
        userId={user.id}
        organizationContext={organizationContext}
        onOrganizationContextChange={refreshOrganizationContext}
        onTabChange={handleTabChange}
      />
    </AdminLayout>
  );
}
