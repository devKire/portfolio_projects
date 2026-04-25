// app/admin/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import LoadingSpinner from './_components/LoadingSpinner';

// Lazy load do layout principal
const AdminPanel = dynamic(() => import('./_components/AdminPanel'), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});

export default function AdminPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AdminPanel />
    </Suspense>
  );
}
