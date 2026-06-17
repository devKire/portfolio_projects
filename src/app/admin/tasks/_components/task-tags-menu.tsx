'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Hash, Loader2, Plus, X } from 'lucide-react';
import {
  haveSameTaskTags,
  mergeTaskTags,
  normalizeTaskTag,
  taskTagKey,
} from '@/lib/task-tags';

interface TaskTagsMenuProps {
  tags: string[];
  availableTags: string[];
  controlAttribute?: 'data-inline-control' | 'data-kanban-control';
  onChange: (tags: string[]) => Promise<boolean>;
  onAvailableTagsChange?: (tags: string[]) => void;
}

export const TaskTagsMenu = memo(function TaskTagsMenu({
  tags,
  availableTags,
  controlAttribute = 'data-inline-control',
  onChange,
  onAvailableTagsChange,
}: TaskTagsMenuProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [draftTags, setDraftTags] = useState(tags);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const controlProps =
    controlAttribute === 'data-kanban-control'
      ? { 'data-kanban-control': true }
      : { 'data-inline-control': true };

  useEffect(() => {
    if (!open) setDraftTags(tags);
  }, [open, tags]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => searchRef.current?.focus());

    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      setQuery('');
      setError(null);
    };

    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const allTags = useMemo(
    () => mergeTaskTags([...availableTags, ...tags, ...draftTags]),
    [availableTags, draftTags, tags]
  );

  const draftKeys = useMemo(
    () => new Set(draftTags.map(taskTagKey)),
    [draftTags]
  );

  const filteredTags = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return allTags;
    return allTags.filter((tag) => tag.toLowerCase().includes(normalizedQuery));
  }, [allTags, query]);

  const normalizedQueryTag = normalizeTaskTag(query);
  const canCreate =
    normalizedQueryTag &&
    !allTags.some((tag) => taskTagKey(tag) === taskTagKey(normalizedQueryTag));

  const toggleTag = useCallback((tag: string) => {
    setDraftTags((current) => {
      const key = taskTagKey(tag);
      if (current.some((item) => taskTagKey(item) === key)) {
        return current.filter((item) => taskTagKey(item) !== key);
      }
      return mergeTaskTags([...current, tag]);
    });
  }, []);

  const saveTags = async () => {
    const nextTags = mergeTaskTags(draftTags);
    if (haveSameTaskTags(nextTags, tags)) {
      setOpen(false);
      setQuery('');
      return;
    }

    setSaving(true);
    setError(null);
    const success = await onChange(nextTags);
    setSaving(false);

    if (success) {
      onAvailableTagsChange?.(nextTags);
      setOpen(false);
      setQuery('');
      return;
    }

    setError('Nao foi possivel salvar tags.');
  };

  const menuItems = () => {
    if (!rootRef.current) return [];
    return Array.from(
      rootRef.current.querySelectorAll<HTMLButtonElement>(
        '[role="menuitemcheckbox"], [role="menuitem"]'
      )
    );
  };

  const focusRelativeItem = (direction: -1 | 1) => {
    const items = menuItems();
    if (!items.length) return;
    const currentIndex = items.indexOf(
      document.activeElement as HTMLButtonElement
    );
    const nextIndex =
      currentIndex === -1
        ? 0
        : (currentIndex + direction + items.length) % items.length;
    items[nextIndex]?.focus();
  };

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        {...controlProps}
        type="button"
        aria-label="Editar tags"
        title="Editar tags"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#2f2f35] bg-[#111] text-[#777780] transition-colors outline-none hover:border-[#6f55d9]/40 hover:text-[#c9b8ff] focus:ring-2 focus:ring-[#6f55d9]/30"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          data-keyboard-scope="menu"
          className="absolute top-full right-0 z-50 mt-1 w-72 rounded-md border border-[#34343c] bg-[#1b1b1f] p-2 text-xs text-[#dcddde] shadow-2xl"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              setQuery('');
              setError(null);
              return;
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              focusRelativeItem(1);
              return;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              focusRelativeItem(-1);
              return;
            }
            if (event.key === 'Enter' && event.target === searchRef.current) {
              event.preventDefault();
              if (canCreate) {
                toggleTag(normalizedQueryTag);
                setQuery('');
              }
            }
          }}
        >
          <div className="relative">
            <Hash className="absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-[#777780]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar ou criar tag"
              className="h-8 w-full rounded border border-[#303036] bg-[#111] pr-2 pl-7 text-xs text-white outline-none placeholder:text-[#777780] focus:border-[#6f55d9]"
            />
          </div>

          <div className="mt-2 max-h-56 overflow-y-auto">
            {filteredTags.map((tag) => {
              const checked = draftKeys.has(taskTagKey(tag));
              return (
                <button
                  key={tag}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={checked}
                  onClick={() => toggleTag(tag)}
                  className={`flex h-8 w-full items-center gap-2 rounded px-2 text-left outline-none ${
                    checked
                      ? 'bg-[#2d2940] text-[#c9b8ff]'
                      : 'text-[#c9c9d1] hover:bg-[#2a2a30] hover:text-white focus:bg-[#2a2a30] focus:text-white'
                  }`}
                >
                  <Check
                    className={`h-3.5 w-3.5 shrink-0 ${
                      checked ? 'text-[#b8a9ff]' : 'text-transparent'
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate">#{tag}</span>
                </button>
              );
            })}

            {filteredTags.length === 0 && !canCreate && (
              <div className="px-2 py-3 text-[#777780]">
                Nenhuma tag encontrada.
              </div>
            )}
          </div>

          {canCreate && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                toggleTag(normalizedQueryTag);
                setQuery('');
              }}
              className="mt-1 flex h-8 w-full items-center gap-2 rounded px-2 text-left text-[#c9b8ff] outline-none hover:bg-[#2a2a30] focus:bg-[#2a2a30]"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar #{normalizedQueryTag}
            </button>
          )}

          {draftTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {draftTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded border border-[#303036] bg-[#111] px-1.5 py-0.5 text-[#9b9ba3]"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="rounded text-[#777780] hover:text-white"
                    aria-label={`Remover tag ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {error && <div className="mt-2 text-red-300">{error}</div>}

          <div className="mt-2 flex items-center justify-end gap-2 border-t border-[#303036] pt-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setDraftTags(tags);
                setQuery('');
                setError(null);
              }}
              disabled={saving}
              className="h-7 rounded-md px-2 text-[#9b9ba3] outline-none hover:bg-[#2a2a30] hover:text-white focus:bg-[#2a2a30]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={saveTags}
              disabled={saving}
              className="inline-flex h-7 items-center gap-1 rounded-md bg-[#6f55d9] px-2 text-white outline-none hover:bg-[#7c66df] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
