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
    <div className="animate-in slide-in-from-top-2 flex items-center justify-between rounded-lg border border-[#6f55d9]/30 bg-[#6f55d9]/10 p-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-[#9a8cff]">
          {count} tarefa(s) selecionada(s)
        </span>
        <span className="hidden text-xs text-[#777780] sm:inline">
          Pressione ESC para limpar
        </span>
      </div>
      <div className="flex items-center gap-2">
        <select
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded border border-[#303036] bg-[#2a2a2a] px-2 py-1 text-sm text-white focus:border-[#6f55d9] focus:outline-none"
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
