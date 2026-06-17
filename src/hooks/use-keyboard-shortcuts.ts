// src/hooks/use-keyboard-shortcuts.ts
import { useEffect } from 'react';
import { hasKeyboardScope, isEditableTarget } from '@/lib/keyboard';

interface ShortcutConfig {
  onNewTask: () => void;
  onNewBulkTasks: () => void;
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
      const key = e.key.toLowerCase();
      const isEditing = isEditableTarget(e.target);
      const isScoped = hasKeyboardScope(e.target);

      if (isEditing || isScoped) return;

      if (isCtrlOrCmd && key === 'k' && !e.repeat) {
        e.preventDefault();
        config.onSearchFocus();
      }
      if (isCtrlOrCmd && key === 'n' && !e.repeat) {
        e.preventDefault();
        config.onNewTask();
      }
      if (isCtrlOrCmd && key === 'm' && !e.repeat) {
        e.preventDefault();
        config.onNewBulkTasks();
      }
      if (isCtrlOrCmd && key === 'a' && !e.repeat) {
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
