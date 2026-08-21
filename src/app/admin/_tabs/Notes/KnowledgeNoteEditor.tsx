'use client';

import type { NoteStatus } from '@prisma/client';
import { Eye, Pencil, Columns2 } from 'lucide-react';
import {
  useMemo,
  useRef,
  useState,
  type ClipboardEventHandler,
  type KeyboardEventHandler,
  type ReactNode,
  type Ref,
} from 'react';

import type { KnowledgeScope } from '@/types/knowledge';

import {
  MarkdownPreview,
  type PreviewAttachment,
  type PreviewNote,
} from './MarkdownPreview';
import {
  estimateCursorPosition,
  parseWikilinkAtCursor,
  WikiLinkAutocomplete,
  type WikiLinkSuggestion,
} from './WikiLinkAutocomplete';

export type KnowledgeEditorMode = 'edit' | 'preview' | 'split';

type KnowledgeEditorNote = PreviewNote & { content?: string };

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (!ref) return;
  if (typeof ref === 'function') ref(value);
  else ref.current = value;
}

export function KnowledgeNoteEditor({
  scope,
  title,
  content,
  status,
  tags,
  mode,
  readOnly,
  notes,
  currentNote,
  attachments,
  metadataSlot,
  actionsSlot,
  autocomplete,
  onTitleChange,
  onContentChange,
  onStatusChange,
  onTagsChange,
  onModeChange,
  onOpenWikiLink,
  onToggleTask,
  textareaRef,
  onEditorKeyDown,
  onEditorPaste,
  onEditorSelect,
  onEditorClick,
  onEditorKeyUp,
  showModeSwitcher = true,
}: {
  scope: KnowledgeScope;
  title: string;
  content: string;
  status: NoteStatus;
  tags?: string;
  mode: KnowledgeEditorMode;
  readOnly: boolean;
  notes: KnowledgeEditorNote[];
  currentNote: PreviewNote;
  attachments: PreviewAttachment[];
  metadataSlot?: ReactNode;
  actionsSlot?: ReactNode;
  autocomplete?: ReactNode;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onStatusChange: (status: NoteStatus) => void;
  onTagsChange?: (value: string) => void;
  onModeChange: (mode: KnowledgeEditorMode) => void;
  onOpenWikiLink: (idOrSlug: string, anchor?: string) => void;
  onToggleTask?: (lineIndex: number) => void;
  textareaRef?: Ref<HTMLTextAreaElement>;
  onEditorKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
  onEditorPaste?: ClipboardEventHandler<HTMLTextAreaElement>;
  onEditorSelect?: React.FormEventHandler<HTMLTextAreaElement>;
  onEditorClick?: React.MouseEventHandler<HTMLTextAreaElement>;
  onEditorKeyUp?: KeyboardEventHandler<HTMLTextAreaElement>;
  showModeSwitcher?: boolean;
}) {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [autocompleteBlocked, setAutocompleteBlocked] = useState(false);
  const effectiveMode = readOnly ? 'preview' : mode;
  const parsedLink = useMemo(
    () => parseWikilinkAtCursor(content, cursorPosition),
    [content, cursorPosition]
  );
  const suggestions = useMemo<WikiLinkSuggestion[]>(() => {
    if (!parsedLink || parsedLink.mode !== 'search') return [];
    const query = parsedLink.query.trim().toLocaleLowerCase();
    return notes
      .filter(
        (note) =>
          !query ||
          note.title.toLocaleLowerCase().includes(query) ||
          note.slug.toLocaleLowerCase().includes(query) ||
          note.filePath?.toLocaleLowerCase().includes(query)
      )
      .slice(0, 24)
      .map((note) => ({
        id: note.id,
        label: note.title,
        value: note.title,
        type: 'note' as const,
        detail: note.folderPath || 'Raiz',
      }));
  }, [notes, parsedLink]);
  const showBuiltInAutocomplete =
    !autocomplete &&
    !readOnly &&
    !autocompleteBlocked &&
    Boolean(parsedLink?.isInside) &&
    suggestions.length > 0;
  const autocompletePosition = internalRef.current
    ? estimateCursorPosition(internalRef.current)
    : { top: 0, left: 0 };

  const selectSuggestion = (index: number) => {
    const suggestion = suggestions[index];
    if (!suggestion || !parsedLink) return;
    const replacement = `[[${suggestion.value}]]`;
    const nextContent = `${content.slice(0, parsedLink.startPos)}${replacement}${content.slice(parsedLink.endPos)}`;
    const nextCursor = parsedLink.startPos + replacement.length;
    onContentChange(nextContent);
    setAutocompleteBlocked(true);
    window.requestAnimationFrame(() => {
      internalRef.current?.focus();
      internalRef.current?.setSelectionRange(nextCursor, nextCursor);
      setCursorPosition(nextCursor);
    });
  };

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (showBuiltInAutocomplete) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedSuggestion((current) => {
          const direction = event.key === 'ArrowDown' ? 1 : -1;
          return (
            (current + direction + suggestions.length) % suggestions.length
          );
        });
        return;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        selectSuggestion(selectedSuggestion);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setAutocompleteBlocked(true);
        return;
      }
    }
    onEditorKeyDown?.(event);
  };

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      data-knowledge-scope={scope.type}
    >
      <div className="grid shrink-0 gap-2 border-b border-[#2f2f35] p-3 lg:grid-cols-[minmax(220px,1fr)_auto_auto_auto] lg:items-center">
        <input
          value={title}
          readOnly={readOnly}
          onChange={(event) => onTitleChange(event.target.value)}
          className="h-10 min-w-0 bg-transparent px-3 text-xl font-semibold text-[#f2f2f3] outline-none read-only:cursor-default"
          aria-label="Título da nota"
        />
        {metadataSlot}
        <select
          value={status}
          disabled={readOnly}
          onChange={(event) => onStatusChange(event.target.value as NoteStatus)}
          className="h-10 rounded border border-[#303036] bg-[#19191d] px-2 text-xs text-white outline-none disabled:cursor-default disabled:opacity-80"
          aria-label="Status da nota"
        >
          <option value="DRAFT">Rascunho</option>
          <option value="PUBLISHED">Publicada</option>
          <option value="ARCHIVED">Arquivada</option>
        </select>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {!readOnly &&
            showModeSwitcher &&
            (['edit', 'preview', 'split'] as KnowledgeEditorMode[]).map(
              (item) => {
                const Icon =
                  item === 'edit' ? Pencil : item === 'split' ? Columns2 : Eye;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onModeChange(item)}
                    className={`flex h-9 items-center gap-1 rounded-md border px-2 text-xs ${mode === item ? 'border-[#6f55d9]/50 bg-[#34245f] text-[#d7ccff]' : 'border-[#303036] text-[#b9b9c1]'}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item === 'edit'
                      ? 'Editar'
                      : item === 'split'
                        ? 'Split'
                        : 'Preview'}
                  </button>
                );
              }
            )}
          {actionsSlot}
        </div>
      </div>

      {tags !== undefined && (
        <input
          value={tags}
          readOnly={readOnly}
          onChange={(event) => onTagsChange?.(event.target.value)}
          placeholder="Tags separadas por vírgula"
          className="h-9 shrink-0 border-b border-[#303036] bg-[#161619] px-4 text-xs text-[#b9b9c1] outline-none read-only:cursor-default"
          aria-label="Tags da nota"
        />
      )}

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {(effectiveMode === 'edit' || effectiveMode === 'split') && (
          <textarea
            ref={(element) => {
              internalRef.current = element;
              if (element) assignRef(textareaRef, element);
            }}
            value={content}
            readOnly={readOnly}
            onChange={(event) => {
              onContentChange(event.target.value);
              setCursorPosition(event.target.selectionStart);
              setAutocompleteBlocked(false);
            }}
            onSelect={(event) => {
              setCursorPosition(event.currentTarget.selectionStart);
              onEditorSelect?.(event);
            }}
            onClick={(event) => {
              setCursorPosition(event.currentTarget.selectionStart);
              onEditorClick?.(event);
            }}
            onKeyUp={(event) => {
              setCursorPosition(event.currentTarget.selectionStart);
              onEditorKeyUp?.(event);
            }}
            onKeyDown={handleKeyDown}
            onPaste={onEditorPaste}
            spellCheck
            className={`${effectiveMode === 'split' ? 'w-1/2 border-r border-[#2f2f35]' : 'w-full'} h-full min-h-0 resize-none overflow-y-auto bg-[#1e1e22] px-8 py-7 font-mono text-sm leading-6 text-[#dcddde] outline-none placeholder:text-[#777780]`}
            placeholder="# Título\n\n[[Wiki Link]]\n- [ ] Task sincronizada"
          />
        )}
        {autocomplete}
        {showBuiltInAutocomplete && (
          <WikiLinkAutocomplete
            suggestions={suggestions}
            selectedIndex={selectedSuggestion}
            position={autocompletePosition}
            title="Notas do mesmo espaço"
            onSelect={selectSuggestion}
            onMouseEnter={setSelectedSuggestion}
          />
        )}
        {(effectiveMode === 'preview' || effectiveMode === 'split') && (
          <div
            className={`${effectiveMode === 'split' ? 'w-1/2' : 'w-full'} h-full min-h-0 min-w-0 overflow-x-hidden overflow-y-auto`}
          >
            <MarkdownPreview
              content={content}
              notes={notes}
              currentNote={currentNote}
              attachments={attachments}
              onOpenWikiLink={onOpenWikiLink}
              onToggleTask={readOnly ? undefined : onToggleTask}
            />
          </div>
        )}
      </div>
    </div>
  );
}
