// src/app/(admin)/tasks/_components/empty-state.tsx
'use client';

import { memo } from 'react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = memo(function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16">
      <div className="mb-4 text-6xl opacity-30">📋</div>
      <h3 className="mb-2 text-lg font-medium text-gray-300">{title}</h3>
      <p className="mb-6 max-w-md text-center text-sm text-gray-500">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="secondary" onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
});
