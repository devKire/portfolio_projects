'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Clock3, Hash, Loader2, Plus, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createTask } from '@/app/actions/tasks';
import { parseQuickTaskInput } from '@/lib/task-quick-add-parser';
import type { TaskProjectOption } from '@/types/tasks';

interface QuickTaskInputProps {
  onClose: () => void;
  onSuccess: () => void;
  projects: TaskProjectOption[];
  tags: string[];
}

function formatPreviewDate(date?: Date) {
  if (!date) return null;
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

export function QuickTaskInput({
  onClose,
  onSuccess,
  projects,
  tags,
}: QuickTaskInputProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const parsed = useMemo(
    () => parseQuickTaskInput(input, projects),
    [input, projects]
  );

  const activeToken = useMemo(() => {
    const cursor = inputRef.current?.selectionStart ?? input.length;
    const beforeCursor = input.slice(0, cursor);
    const match = beforeCursor.match(/(?:^|\s)([#@][^\s]*)$/);
    return match?.[1] || '';
  }, [input]);

  const tagSuggestions = useMemo(() => {
    if (!activeToken.startsWith('#')) return [];
    const query = activeToken.slice(1).toLowerCase();
    return tags
      .filter((tag) => tag.toLowerCase().startsWith(query))
      .filter((tag) => !parsed.tags.includes(tag.toLowerCase()))
      .slice(0, 6);
  }, [activeToken, parsed.tags, tags]);

  const projectSuggestions = useMemo(() => {
    if (!activeToken.startsWith('@')) return [];
    const query = activeToken.slice(1).toLowerCase();
    return projects
      .filter((project) => project.title.toLowerCase().includes(query))
      .slice(0, 6);
  }, [activeToken, projects]);

  const replaceActiveToken = (replacement: string) => {
    const cursor = inputRef.current?.selectionStart ?? input.length;
    const beforeCursor = input.slice(0, cursor);
    const afterCursor = input.slice(cursor);
    const match = beforeCursor.match(/(?:^|\s)([#@][^\s]*)$/);
    if (!match || match.index === undefined) return;

    const tokenStart = match.index + (match[0].startsWith(' ') ? 1 : 0);
    const nextInput =
      `${input.slice(0, tokenStart)}${replacement} ${afterCursor}`.replace(
        /\s+/g,
        ' '
      );
    setInput(nextInput);

    window.requestAnimationFrame(() => {
      const nextCursor = tokenStart + replacement.length + 1;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsed.title.trim()) return;

    setLoading(true);
    setError(null);

    const result = await createTask({
      title: parsed.title,
      status: parsed.status || 'pending',
      priority: parsed.priority || 'medium',
      dueDate: parsed.dueDate,
      estimatedHours: parsed.estimatedHours || 0,
      tags: parsed.tags,
      projectId: parsed.projectId,
    });

    if (result.success) {
      setInput('');
      onSuccess();
    } else {
      setError(result.error || 'Erro ao criar tarefa');
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
      className="animate-in slide-in-from-top-2 mb-4 rounded-lg border border-blue-500/30 bg-[#141414] p-3 shadow-xl shadow-black/20"
    >
      <div className="flex items-center gap-3">
        <Plus className="h-4 w-4 text-blue-300" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Revisar layout amanhã #design !alta 2h"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-10 flex-1 border-none bg-transparent text-sm text-white placeholder-gray-500 outline-none"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={loading}
          className="text-xs text-gray-400"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!parsed.title.trim() || loading}
          className="text-xs"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Criando
            </>
          ) : (
            'Criar'
          )}
        </Button>
      </div>

      {(input.trim() || error) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-7 text-xs">
          {parsed.title && (
            <span className="max-w-full truncate rounded-md bg-gray-900 px-2 py-1 text-gray-300">
              {parsed.title}
            </span>
          )}
          {parsed.dueDate && (
            <span className="inline-flex items-center gap-1 rounded-md border border-gray-800 bg-[#101010] px-2 py-1 text-gray-400">
              <Calendar className="h-3 w-3" />
              {formatPreviewDate(parsed.dueDate)}
            </span>
          )}
          {parsed.priority && (
            <span className="inline-flex items-center rounded-md border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-blue-300">
              {parsed.priority}
            </span>
          )}
          {parsed.estimatedHours !== undefined && (
            <span className="inline-flex items-center gap-1 rounded-md border border-gray-800 bg-[#101010] px-2 py-1 text-gray-400">
              <Clock3 className="h-3 w-3" />
              {parsed.estimatedHours}h
            </span>
          )}
          {parsed.projectLabel && (
            <span className="inline-flex items-center gap-1 rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-1 text-purple-300">
              <Target className="h-3 w-3" />
              {parsed.projectLabel}
            </span>
          )}
          {parsed.unmatchedProjectLabels.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-amber-300"
            >
              @{label} nao encontrado
            </span>
          ))}
          {parsed.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md border border-gray-800 bg-[#101010] px-2 py-1 text-gray-400"
            >
              <Hash className="h-3 w-3" />
              {tag}
            </span>
          ))}
          {error && <span className="text-red-300">{error}</span>}
        </div>
      )}

      {(tagSuggestions.length > 0 || projectSuggestions.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5 pl-7 text-xs">
          {tagSuggestions.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => replaceActiveToken(`#${tag}`)}
              className="rounded-md border border-gray-800 bg-[#101010] px-2 py-1 text-gray-300 hover:border-blue-500/40 hover:text-white"
            >
              #{tag}
            </button>
          ))}
          {projectSuggestions.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() =>
                replaceActiveToken(`@${project.title.replace(/\s+/g, '')}`)
              }
              className="rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-1 text-purple-300 hover:border-purple-400/50"
            >
              @{project.title}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 pl-7 text-[11px] text-gray-600">
        <span>
          <strong className="text-gray-500">#tag</strong> adiciona categoria
        </span>
        <span>
          <strong className="text-gray-500">@projeto</strong> atrela projeto
        </span>
        <span>
          <strong className="text-gray-500">amanha/13-03</strong> define data
        </span>
        <span>
          <strong className="text-gray-500">!alta</strong> define prioridade
        </span>
        <span>
          <strong className="text-gray-500">2h</strong> estima horas
        </span>
      </div>
    </form>
  );
}
