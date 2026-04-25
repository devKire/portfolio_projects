// src/app/(admin)/tasks/_components/quick-task-input.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { createTask } from '@/app/actions/tasks';

interface QuickTaskInputProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickTaskInput({ onClose, onSuccess }: QuickTaskInputProps) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus no input quando abrir
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    const result = await createTask({
      title: title.trim(),
      status: 'pending',
      priority: 'medium',
    });

    if (result.success) {
      setTitle('');
      onSuccess();
    } else {
      console.error('Failed to create task:', result.error);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-in slide-in-from-top-2 mb-4 flex items-center gap-3 rounded-lg border border-blue-500/30 bg-[#1a1a1a] p-4"
    >
      <span className="text-lg text-gray-400">+</span>
      <input
        ref={inputRef}
        type="text"
        placeholder="Nova tarefa... (Enter para criar, Esc para cancelar)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        className="flex-1 border-none bg-transparent text-sm text-white placeholder-gray-500 outline-none"
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onClose}
          disabled={loading}
          className="text-xs"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!title.trim() || loading}
          className="text-xs"
        >
          {loading ? 'Criando...' : 'Criar'}
        </Button>
      </div>
    </form>
  );
}
