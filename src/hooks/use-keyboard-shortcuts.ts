// src/hooks/use-keyboard-shortcuts.ts
import { useEffect } from 'react';

interface ShortcutConfig {
  onNewTask: () => void;
  onSearchFocus: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  isBulkDeleteDisabled: boolean;
  onBulkDelete: () => void;
  onViewChange: (mode: 'list' | 'kanban') => void;
}

export function useKeyboardShortcuts(config: ShortcutConfig) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd && e.key === 'k') {
        e.preventDefault();
        config.onSearchFocus();
      }
      if (isCtrlOrCmd && e.key === 'n') {
        e.preventDefault();
        config.onNewTask();
      }
      if (isCtrlOrCmd && e.key === 'a') {
        e.preventDefault();
        config.onSelectAll();
      }
      if (e.key === 'Delete' && !config.isBulkDeleteDisabled) {
        e.preventDefault();
        config.onBulkDelete();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        config.onClearSelection();
      }
      // 1 e 2 para views
      if (e.key === '1') config.onViewChange('list');
      if (e.key === '2') config.onViewChange('kanban');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config]);
}
