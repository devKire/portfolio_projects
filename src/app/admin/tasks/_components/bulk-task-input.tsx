'use client';

import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock3,
  Hash,
  Loader2,
  Plus,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createTasksBulk } from '@/app/actions/tasks';
import { parseQuickTaskInput } from '@/lib/task-quick-add-parser';
import { taskTagKey } from '@/lib/task-tags';
import type {
  BulkTaskInput as BulkTaskCreateInput,
  TaskProjectOption,
  TaskWithRelations,
} from '@/types/tasks';

interface BulkTaskInputProps {
  onClose: () => void;
  onSuccess: (tasks: TaskWithRelations[]) => void;
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

function formatHours(hours?: number) {
  if (hours === undefined) return null;
  return `${hours}h`;
}

export function BulkTaskInput({
  onClose,
  onSuccess,
  projects,
  tags,
}: BulkTaskInputProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const existingTagKeys = useMemo(() => new Set(tags.map(taskTagKey)), [tags]);

  const previewRows = useMemo(
    () =>
      text
        .split(/\r?\n/)
        .map((raw, index) => {
          const line = raw.trim();
          if (!line) return null;
          const parsed = parseQuickTaskInput(line, projects);
          const clientId = `line-${index + 1}`;
          const errors: string[] = [];

          if (!parsed.title.trim()) errors.push('titulo vazio');
          if (parsed.unmatchedProjectLabels.length) {
            errors.push(
              `projeto nao encontrado: ${parsed.unmatchedProjectLabels.join(', ')}`
            );
          }
          if (parsed.invalidDateTokens.length) {
            errors.push(
              `data invalida: ${parsed.invalidDateTokens.join(', ')}`
            );
          }
          if (serverErrors[clientId]) errors.push(serverErrors[clientId]);

          const newTags = parsed.tags.filter(
            (tag) => !existingTagKeys.has(taskTagKey(tag))
          );

          return {
            clientId,
            lineNumber: index + 1,
            raw,
            parsed,
            errors,
            newTags,
          };
        })
        .filter(Boolean) as Array<{
        clientId: string;
        lineNumber: number;
        raw: string;
        parsed: ReturnType<typeof parseQuickTaskInput>;
        errors: string[];
        newTags: string[];
      }>,
    [existingTagKeys, projects, serverErrors, text]
  );

  const invalidRows = previewRows.filter((row) => row.errors.length > 0);
  const validRows = previewRows.filter((row) => row.errors.length === 0);

  const requestClose = () => {
    if (text.trim() && !confirm('Descartar tarefas em lote?')) return;
    onClose();
  };

  const insertLineBelow = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const cursor = editor.selectionStart;
    const lineEnd = text.indexOf('\n', cursor);
    const insertAt = lineEnd === -1 ? text.length : lineEnd;
    const nextText = `${text.slice(0, insertAt)}\n${text.slice(insertAt)}`;
    setText(nextText);

    window.requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(insertAt + 1, insertAt + 1);
    });
  };

  const handleCreateAll = async () => {
    setServerErrors({});
    setError(null);

    if (previewRows.length === 0) {
      setError('Adicione ao menos uma linha.');
      return;
    }

    if (invalidRows.length > 0) {
      setError('Corrija as linhas invalidas antes de criar.');
      return;
    }

    const inputs: BulkTaskCreateInput[] = validRows.map((row) => ({
      clientId: row.clientId,
      title: row.parsed.title,
      status: row.parsed.status || 'pending',
      priority: row.parsed.priority || 'medium',
      dueDate: row.parsed.dueDate || null,
      estimatedHours: row.parsed.estimatedHours || 0,
      tags: row.parsed.tags,
      projectId: row.parsed.projectId || null,
    }));

    setLoading(true);
    const result = await createTasksBulk(inputs);
    setLoading(false);

    if (result.success) {
      setText('');
      onSuccess((result.data || []) as TaskWithRelations[]);
      return;
    }

    const nextErrors: Record<string, string> = {};
    for (const item of result.results || []) {
      if (!item.success && item.error) nextErrors[item.clientId] = item.error;
    }
    setServerErrors(nextErrors);
    setError(result.error || 'Nao foi possivel criar as tarefas.');
  };

  return (
    <section
      data-keyboard-scope="bulk-editor"
      className="animate-in slide-in-from-top-2 mb-4 rounded-lg border border-[#6f55d9]/30 bg-[#141414] p-3 shadow-xl shadow-black/20"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <Plus className="h-4 w-4 text-[#c9b8ff]" />
          Multiplas tarefas
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={requestClose}
            disabled={loading}
            className="text-xs text-[#9b9ba3]"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleCreateAll}
            disabled={
              loading || validRows.length === 0 || invalidRows.length > 0
            }
            className="text-xs"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Criando
              </>
            ) : (
              'Criar todas'
            )}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <textarea
          ref={editorRef}
          data-editor
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setServerErrors({});
            setError(null);
          }}
          onKeyDown={(event) => {
            if (
              (event.ctrlKey || event.metaKey) &&
              event.shiftKey &&
              event.key === 'Enter'
            ) {
              event.preventDefault();
              void handleCreateAll();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              insertLineBelow();
              return;
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              requestClose();
            }
          }}
          placeholder={
            'Tarefa 1 #tag @NeodoxaDelivery amanha !alta 1h\nTarefa 2 #frontend #bug hoje !media `30min`'
          }
          className="min-h-[180px] resize-y rounded-md border border-[#303036] bg-[#101010] p-3 font-mono text-sm text-white outline-none placeholder:text-[#55555d] focus:border-[#6f55d9]"
        />

        <div className="rounded-md border border-[#303036] bg-[#101010]">
          <div className="flex items-center justify-between border-b border-[#303036] px-3 py-2">
            <span className="text-xs font-medium text-[#9b9ba3]">Preview</span>
            <span className="text-[11px] text-[#777780]">
              {validRows.length}/{previewRows.length} validas
            </span>
          </div>
          <div className="max-h-[260px] space-y-2 overflow-y-auto p-2">
            {previewRows.length === 0 && (
              <div className="px-1 py-4 text-xs text-[#777780]">
                Uma tarefa por linha.
              </div>
            )}

            {previewRows.map((row) => (
              <div
                key={row.clientId}
                className={`rounded-md border p-2 ${
                  row.errors.length
                    ? 'border-amber-500/25 bg-amber-500/5'
                    : 'border-[#2f2f35] bg-[#141414]'
                }`}
              >
                <div className="flex items-start gap-2">
                  {row.errors.length ? (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-white">
                      {row.parsed.title || `Linha ${row.lineNumber}`}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {row.parsed.projectLabel && (
                        <span className="inline-flex items-center gap-1 rounded border border-[#9a8cff]/20 bg-[#9a8cff]/10 px-1.5 py-0.5 text-[11px] text-[#c9b8ff]">
                          <Target className="h-3 w-3" />
                          {row.parsed.projectLabel}
                        </span>
                      )}
                      {row.parsed.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded border border-[#303036] bg-[#101010] px-1.5 py-0.5 text-[11px] text-[#9b9ba3]"
                        >
                          <Hash className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                      {row.newTags.map((tag) => (
                        <span
                          key={`new-${tag}`}
                          className="rounded border border-[#6f55d9]/30 bg-[#6f55d9]/10 px-1.5 py-0.5 text-[11px] text-[#c9b8ff]"
                        >
                          nova tag: {tag}
                        </span>
                      ))}
                      {row.parsed.dueDate && (
                        <span className="inline-flex items-center gap-1 rounded border border-[#303036] bg-[#101010] px-1.5 py-0.5 text-[11px] text-[#9b9ba3]">
                          <Calendar className="h-3 w-3" />
                          {formatPreviewDate(row.parsed.dueDate)}
                        </span>
                      )}
                      {row.parsed.priority && (
                        <span className="rounded border border-[#6f55d9]/20 bg-[#6f55d9]/10 px-1.5 py-0.5 text-[11px] text-[#c9b8ff]">
                          {row.parsed.priority}
                        </span>
                      )}
                      {row.parsed.status && (
                        <span className="rounded border border-[#303036] bg-[#101010] px-1.5 py-0.5 text-[11px] text-[#9b9ba3]">
                          {row.parsed.status}
                        </span>
                      )}
                      {row.parsed.estimatedHours !== undefined && (
                        <span className="inline-flex items-center gap-1 rounded border border-[#303036] bg-[#101010] px-1.5 py-0.5 text-[11px] text-[#9b9ba3]">
                          <Clock3 className="h-3 w-3" />
                          {formatHours(row.parsed.estimatedHours)}
                        </span>
                      )}
                    </div>
                    {row.errors.length > 0 && (
                      <div className="mt-1 text-[11px] text-amber-300">
                        {row.errors.join(' • ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-600">
        <span>Ctrl+Enter nova linha</span>
        <span>Ctrl+Shift+Enter criar todas</span>
        <span>Esc cancelar</span>
        <span>Ctrl+A seleciona o texto</span>
      </div>

      {error && <div className="mt-2 text-xs text-red-300">{error}</div>}
    </section>
  );
}
