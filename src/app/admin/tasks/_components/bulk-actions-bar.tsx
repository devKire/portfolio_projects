// src/app/(admin)/tasks/_components/bulk-actions-bar.tsx
'use client';

import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';

interface BulkActionsBarProps {
  count: number;
  onBulkStatusChange: (status: string) => Promise<void>;
  onBulkDelete: () => Promise<void>;
  onClearSelection: () => void;
  isDeleting?: boolean;
}

export const BulkActionsBar = memo(function BulkActionsBar({
  count,
  onBulkStatusChange,
  onBulkDelete,
  onClearSelection,
  isDeleting = false,
}: BulkActionsBarProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState<
    'status' | 'delete' | null
  >(null);

  const handleStatusChange = async (status: string) => {
    if (!status) return;
    setIsProcessing(true);
    setProcessingAction('status');
    try {
      await onBulkStatusChange(status);
    } finally {
      setIsProcessing(false);
      setProcessingAction(null);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Excluir ${count} tarefa(s)?`)) {
      setIsProcessing(true);
      setProcessingAction('delete');
      try {
        await onBulkDelete();
      } finally {
        setIsProcessing(false);
        setProcessingAction(null);
      }
    }
  };

  const disabled = isProcessing || isDeleting;

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
          disabled={disabled}
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
          disabled={disabled}
          className="gap-1.5 text-xs"
        >
          {processingAction === 'delete' || isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          {processingAction === 'delete' || isDeleting
            ? `Excluindo ${count} tarefa${count === 1 ? '' : 's'}...`
            : 'Excluir'}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={onClearSelection}
          disabled={disabled}
          className="text-xs"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
});
