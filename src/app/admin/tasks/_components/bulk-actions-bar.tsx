// src/app/(admin)/tasks/_components/bulk-actions-bar.tsx
'use client';

import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';

interface BulkActionsBarProps {
  count: number;
  onBulkStatusChange: (status: string) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

export const BulkActionsBar = memo(function BulkActionsBar({
  count,
  onBulkStatusChange,
  onBulkDelete,
  onClearSelection,
}: BulkActionsBarProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStatusChange = async (status: string) => {
    if (!status) return;
    setIsProcessing(true);
    await onBulkStatusChange(status);
    setIsProcessing(false);
  };

  const handleDelete = async () => {
    if (confirm(`Excluir ${count} tarefa(s)?`)) {
      setIsProcessing(true);
      await onBulkDelete();
      setIsProcessing(false);
    }
  };

  return (
    <div className="animate-in slide-in-from-top-2 flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-blue-400">
          {count} tarefa(s) selecionada(s)
        </span>
        <span className="hidden text-xs text-gray-500 sm:inline">
          Pressione ESC para limpar
        </span>
      </div>
      <div className="flex items-center gap-2">
        <select
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded border border-gray-700 bg-[#2a2a2a] px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
          disabled={isProcessing}
          defaultValue=""
        >
          <option value="" disabled>
            Mudar status...
          </option>
          <option value="pending">📋 Pendente</option>
          <option value="in-progress">🔄 Em Andamento</option>
          <option value="completed">✅ Concluído</option>
        </select>
        <Button
          size="sm"
          onClick={handleDelete}
          disabled={isProcessing}
          className="text-xs"
        >
          🗑️ Excluir
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={onClearSelection}
          className="text-xs"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
});
