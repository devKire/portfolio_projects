// src/app/(admin)/tasks/_components/task-shortcuts-hint.tsx
'use client';

import { memo, useState } from 'react';

export const TaskShortcutsHint = memo(function TaskShortcutsHint() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const shortcuts = [
    { key: 'Ctrl+K', action: 'Buscar' },
    { key: 'Ctrl+N', action: 'Nova Tarefa' },
    { key: 'Ctrl+M', action: 'Multiplas Tarefas' },
    { key: 'Ctrl+A', action: 'Selecionar Todas' },
    { key: 'Delete', action: 'Excluir Selecionadas' },
    { key: 'ESC', action: 'Limpar Seleção' },
    { key: '1/2', action: 'Lista/Kanban' },
  ];

  return (
    <div className="fixed right-4 bottom-4 z-40">
      <div className="overflow-hidden rounded-lg border border-[#2f2f35] bg-[#1a1a1a] shadow-xl">
        <div className="flex items-center justify-between border-b border-[#2f2f35] px-4 py-2">
          <span className="text-xs font-medium text-[#9b9ba3]">Atalhos</span>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-600 transition-colors hover:text-[#9b9ba3]"
          >
            ×
          </button>
        </div>
        <div className="space-y-1.5 p-3">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between gap-4 text-xs"
            >
              <kbd className="rounded bg-[#24242a] px-1.5 py-0.5 font-mono text-[10px] text-[#dcddde]">
                {shortcut.key}
              </kbd>
              <span className="text-[#777780]">{shortcut.action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
