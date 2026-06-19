// app/admin/layout.tsx
import { Metadata } from 'next';
import { requireUser } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Painel administrativo',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">{children}</div>
  );
}
