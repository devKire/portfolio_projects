// app/admin/_components/AdminPanel.tsx
'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '../_hooks/useAuth';
import { useMediaQuery } from '../_hooks/useMediaQuery';
import { TAB_CONFIG } from '../_config/navigation';
import AdminLayout from './AdminLayout';
import LoginModal from './LoginModal';
import ContentRouter from './ContentRouter';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { isAuthenticated, isLoading, login, logout } = useAuth();
  const isMobile = useMediaQuery('(max-width: 1023px)');

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setIsMobileMenuOpen(false);
  }, [logout]);

  if (isLoading) return null;
  if (!isAuthenticated) return <LoginModal onLoginSuccess={login} />;

  return (
    <AdminLayout
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
