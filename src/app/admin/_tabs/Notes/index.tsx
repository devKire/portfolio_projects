'use client';

import {
  Archive,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Command,
  Copy,
  Edit3,
  FileArchive,
  FileText,
  Folder,
  FolderInput,
  FolderPlus,
  FolderOpen,
  GitBranch,
  GripVertical,
  Hash,
  Inbox,
  LayoutPanelTop,
  Link2,
  Loader2,
  MoreHorizontal,
  PanelLeftClose,
  PanelRightClose,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  RotateCcw,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent as ReactClipboardEvent,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';

import {
  createNoteAttachment,
  createNoteFolder,
  createNote,
  deleteTrashItemsPermanently,
  emptyTrash,
  getNote,
  getNotes,
  getNoteTags,
  getProjectsForNotes,
  moveNoteFolder,
  moveNoteFolderToTrash,
  moveNoteToFolder,
  moveNoteToTrash,
  renameNote,
  renameNoteFolder,
  reorderNoteFolders,
  reorderNotes,
  restoreAllTrash,
  restoreTrashItems,
  toggleFavorite,
  updateNote,
  type NoteFormInput,
} from '@/app/actions/notes';
import { createTask } from '@/app/actions/tasks';
import {
  inferNoteTitleFromPath,
  resolveWikiLinkTarget,
  slugifyNote,
} from '@/lib/notes';
import { isEditableTarget } from '@/lib/keyboard';

import {
  MarkdownPreview,
  type PreviewAttachment,
  type PreviewNote,
} from './MarkdownPreview';
import { useAutoSave, type SaveStatus } from './useAutoSave';
import {
  WikiLinkAutocomplete,
  parseWikilinkAtCursor,
  estimateCursorPosition,
  type WikiLinkSuggestion,
} from './WikiLinkAutocomplete';

const GraphFlow = dynamic(
  () => import('./GraphFlow').then((mod) => mod.GraphFlow),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-[#8f8f98]">
        Carregando graph...
      </div>
    ),
  }
);

type NoteStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
type NoteVisibility = 'PRIVATE' | 'PUBLIC';
type WorkspaceMode = 'edit' | 'preview' | 'split' | 'graph';
type LibraryScope =
  | 'all'
  | 'favorites'
  | 'recent'
  | 'tags'
  | 'projects'
  | 'trash';

type NoteListItem = {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  visibility: NoteVisibility;
  status: NoteStatus;
  isFavorite: boolean;
  viewCount: number;
  fileName?: string | null;
  filePath?: string | null;
  folderPath?: string | null;
  folderName?: string | null;
  folderId?: string | null;
  extension?: string | null;
  importedAt?: Date | string | null;
  position?: number;
  projectId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  project: { id: string; title: string } | null;
  tags: { id: string; name: string; slug: string }[];
  outgoing?: {
    id: string;
    targetSlug: string;
    targetTitle: string;
    targetExists: boolean;
    targetNote: { id: string; title: string; slug: string } | null;
  }[];
  _count?: { incoming: number; outgoing: number };
};

type NoteDetail = NoteListItem & {
  outgoing: {
    id: string;
    targetSlug: string;
    targetTitle: string;
    alias: string | null;
    targetExists: boolean;
    targetNote: { id: string; title: string; slug: string } | null;
  }[];
  incoming: {
    id: string;
    sourceNote: { id: string; title: string; slug: string } | null;
  }[];
  tasks?: {
    id: string;
    title: string;
    status: string;
    noteTaskKey: string | null;
  }[];
};

type ProjectOption = { id: string; title: string };
type TagOption = { name: string; slug: string; count: number };
type FolderSummary = {
  id: string;
  path: string;
  name: string;
  parentId: string | null;
  position: number;
  count: number;
};
type TrashFolderSummary = FolderSummary & {
  trashPath?: string;
  deletedAt?: Date | string | null;
  trashedAt?: Date | string | null;
};
type FolderNode = {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  position: number;
  count: number;
  children: FolderNode[];
};
type FolderMenuTarget = string | 'root' | 'unfiled' | null;
type FolderTarget = Pick<FolderNode, 'id' | 'name' | 'path'> | null;
type FolderContextMenuState = {
  targetId: FolderMenuTarget;
  x: number;
  y: number;
};
type NoteContextMenuState = {
  noteId: string;
  x: number;
  y: number;
};
type NoteFeedback = {
  message: string;
  tone: 'success' | 'error' | 'info';
} | null;
type NoteHistoryEntry = {
  id: string;
  title: string;
};
type ImportSummary = {
  imported: number;
  updated: number;
  ignored: number;
  folders: number;
  attachments: number;
  attachmentsCreated?: number;
  attachmentsUpdated?: number;
  attachmentsIgnored?: number;
  imagesImported?: number;
  otherAttachmentsImported?: number;
  partialErrors?: string[];
  totalNotes: number;
};
type ConfirmState = {
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'danger' | 'default';
  pendingLabel?: string;
  onConfirm: () => Promise<void>;
};
type TrashRow =
  | { type: 'folder'; id: string; key: string; folder: TrashFolderSummary }
  | { type: 'note'; id: string; key: string; note: NoteListItem };

const MAX_VAULT_ZIP_SIZE = 50 * 1024 * 1024;
const NOTE_HISTORY_STORAGE_KEY = 'knowledge-vault-note-history';
const MAX_NOTE_HISTORY = 5;
const ZIP_MIME_TYPES = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
  '',
]);

const emptyDraft = (): NoteFormInput => ({
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  visibility: 'PRIVATE',
  status: 'DRAFT',
  tags: [],
  projectId: null,
});

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatObsidianTimestamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function extensionFromMime(mimeType: string) {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/gif') return 'gif';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/svg+xml') return 'svg';
  return 'png';
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('invalid-result'));
    reader.onerror = () => reject(reader.error || new Error('read-error'));
    reader.readAsDataURL(file);
  });
}

function useDebouncedValue(value: string, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);
  return debounced;
}

function statusLabel(status: NoteStatus) {
  return {
    DRAFT: 'Draft',
    PUBLISHED: 'Published',
    ARCHIVED: 'Archived',
  }[status];
}

function buildFolderTree(folders: FolderSummary[]) {
  const byId = new Map<string, FolderNode>();
  const root: FolderNode[] = [];

  folders.forEach((folder) => {
    byId.set(folder.id, { ...folder, children: [] });
  });

  byId.forEach((node) => {
    const parent = node.parentId ? byId.get(node.parentId) : null;
    if (parent) parent.children.push(node);
    else root.push(node);
  });

  const sortNodes = (nodes: FolderNode[]) => {
    nodes.sort(
      (a, b) => a.position - b.position || a.name.localeCompare(b.name)
    );
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(root);

  return root;
}

function noteToDraft(note: NoteDetail | NoteListItem): NoteFormInput {
  return {
    title: note.title,
    slug: note.slug,
    content: note.content,
    excerpt: note.excerpt || '',
    visibility: note.visibility,
    status: note.status,
    tags: note.tags.map((tag) => tag.name),
    projectId: note.projectId,
    folderId: note.folderId || null,
    folderPath: note.folderPath || null,
    folderName: note.folderName || null,
  };
}

function cleanMarkdownInline(value: string) {
  return value
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, '$2$1')
    .replace(/[*_`~=#]/g, '')
    .trim();
}

function extractMarkdownHeadings(content: string) {
  return content
    .split('\n')
    .map((line) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (!match) return null;
      const title = cleanMarkdownInline(match[2]);
      if (!title) return null;
      return {
        id: `${match[1].length}-${slugifyNote(title) || title}`,
        level: match[1].length,
        title,
      };
    })
    .filter(Boolean) as { id: string; level: number; title: string }[];
}

function extractMarkdownBlockRefs(content: string) {
  const refs = new Map<string, string>();
  const regex = /(?:^|\s)\^([A-Za-z0-9][A-Za-z0-9_-]*)\s*$/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const id = match[1];
    const lineStart = content.lastIndexOf('\n', match.index) + 1;
    const lineEnd = content.indexOf('\n', match.index);
    const line = content
      .slice(lineStart, lineEnd === -1 ? content.length : lineEnd)
      .replace(`^${id}`, '')
      .trim();
    refs.set(id, line || `^${id}`);
  }

  return Array.from(refs.entries()).map(([id, preview]) => ({ id, preview }));
}

function nextUntitledNoteTitle(
  notes: PreviewNote[],
  folderId: string | null | undefined
) {
  const existingTitles = new Set(
    notes
      .filter((note) => (note.folderId || null) === (folderId || null))
      .map((note) => note.title.trim().toLowerCase())
  );
  let title = 'Nova Nota';
  let counter = 1;

  while (existingTitles.has(title.toLowerCase())) {
    counter += 1;
    title = `Nova Nota ${counter}`;
  }

  return title;
}

function folderLabelFromFilePath(filePath?: string | null) {
  if (!filePath) return 'raiz';
  return filePath.split('/').slice(0, -1).join('/') || 'raiz';
}

function buildNoteFilePath(
  folderPath: string | null,
  fileName?: string | null
) {
  if (!fileName) return null;
  return folderPath ? `${folderPath}/${fileName}` : fileName;
}

function joinFolderPath(parentPath: string | null | undefined, name: string) {
  return parentPath ? `${parentPath}/${name}` : name;
}

function folderNameFromPath(path: string | null | undefined) {
  if (!path) return null;
  return path.split('/').filter(Boolean).at(-1) || null;
}

function replaceFolderPrefix(
  value: string | null | undefined,
  oldPath: string,
  nextPath: string
) {
  if (!value) return null;
  return value === oldPath
    ? nextPath
    : value.replace(`${oldPath}/`, `${nextPath}/`);
}

function getUsefulNotePath(note: NoteListItem) {
  if (note.filePath) return note.filePath;
  if (note.fileName) {
    return note.folderPath
      ? `${note.folderPath}/${note.fileName}`
      : note.fileName;
  }
  return note.title || note.slug;
}

function shouldKeepNoteInCurrentList({
  scope,
  activeFolder,
  nextFolderPath,
  nextFavorite,
  nextStatus,
}: {
  scope: LibraryScope;
  activeFolder: string | null | undefined;
  nextFolderPath: string | null;
  nextFavorite: boolean;
  nextStatus: NoteStatus;
}) {
  if (scope === 'trash') return nextStatus === 'ARCHIVED';
  if (nextStatus === 'ARCHIVED') return false;
  if (scope === 'favorites' && !nextFavorite) return false;
  if (activeFolder !== undefined && activeFolder !== nextFolderPath) {
    return false;
  }
  return true;
}

function FolderTree({
  nodes,
  activeFolder,
  expanded,
  menuFolderId,
  editingFolderId,
  editingName,
  dropFolderId,
  onToggle,
  onSelect,
  onMenu,
  onStartCreate,
  onStartRename,
  onEditingNameChange,
  onSaveRename,
  onCancelRename,
  onDelete,
  onMoveFolder,
  onMoveNote,
  onReorder,
  onDropState,
  onCreateNote,
}: {
  nodes: FolderNode[];
  activeFolder: string | null | undefined;
  expanded: Set<string>;
  menuFolderId: FolderMenuTarget;
  editingFolderId: string | null;
  editingName: string;
  dropFolderId: string | null;
  onToggle: (path: string) => void;
  onSelect: (folder: FolderNode) => void;
  onMenu: (
    folderId: FolderMenuTarget,
    event?: { clientX: number; clientY: number }
  ) => void;
  onStartCreate: (parentId: string | null) => void;
  onStartRename: (folder: FolderNode) => void;
  onEditingNameChange: (value: string) => void;
  onSaveRename: (folder: FolderNode) => void;
  onCancelRename: () => void;
  onDelete: (folder: FolderNode) => void;
  onMoveFolder: (folderId: string, parentId: string | null) => void;
  onMoveNote: (noteId: string, folderId: string | null) => void;
  onReorder: (folder: FolderNode, direction: -1 | 1) => void;
  onDropState: (folderId: string | null) => void;
  onCreateNote: (folder: FolderTarget) => void;
}) {
  const handleDrop = (event: ReactDragEvent, folder: FolderNode) => {
    event.preventDefault();
    event.stopPropagation();
    onDropState(null);
    const noteId = event.dataTransfer.getData('application/x-note-id');
    const folderId = event.dataTransfer.getData('application/x-folder-id');
    if (noteId) onMoveNote(noteId, folder.id);
    else if (folderId) onMoveFolder(folderId, folder.id);
  };

  return (
    <div className="space-y-0.5">
      {nodes.map((node) => {
        const isExpanded = expanded.has(node.path);
        const hasChildren = node.children.length > 0;
        const isEditing = editingFolderId === node.id;
        const isDropTarget = dropFolderId === node.id;
        return (
          <div key={node.path}>
            <div
              className={`group flex items-center gap-1 rounded ${isDropTarget ? 'bg-[#34245f] ring-1 ring-[#8f7cff]' : ''}`}
              draggable={!isEditing}
              onDragStart={(event) => {
                event.dataTransfer.setData('application/x-folder-id', node.id);
                event.dataTransfer.effectAllowed = 'move';
                onMenu(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                onDropState(node.id);
              }}
              onDragLeave={() => onDropState(null)}
              onDrop={(event) => handleDrop(event, node)}
              onContextMenu={(event) => {
                event.preventDefault();
                onMenu(menuFolderId === node.id ? null : node.id, event);
              }}
            >
              <button
                type="button"
                onClick={() => hasChildren && onToggle(node.path)}
                className="grid h-6 w-6 shrink-0 place-items-center rounded text-[#777780] hover:bg-[#24242a]"
                aria-label={isExpanded ? 'Recolher pasta' : 'Expandir pasta'}
              >
                {hasChildren ? (
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
                  />
                ) : null}
              </button>
              {isEditing ? (
                <div className="flex min-w-0 flex-1 items-center gap-1 rounded bg-[#202024] px-1 py-1">
                  <input
                    value={editingName}
                    onChange={(event) =>
                      onEditingNameChange(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') onSaveRename(node);
                      if (event.key === 'Escape') onCancelRename();
                    }}
                    autoFocus
                    className="h-7 min-w-0 flex-1 rounded border border-[#3a3a42] bg-[#151518] px-2 text-xs text-[#f2f2f3] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => onSaveRename(node)}
                    className="grid h-7 w-7 place-items-center rounded text-emerald-200 hover:bg-emerald-500/10"
                    aria-label="Salvar nome"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onCancelRename}
                    className="grid h-7 w-7 place-items-center rounded text-[#9b9ba3] hover:bg-[#2a2a30]"
                    aria-label="Cancelar renomeacao"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onSelect(node)}
                    className={`flex min-w-0 flex-1 items-center justify-between rounded px-2 py-1.5 text-xs ${activeFolder === node.path ? 'bg-[#2d2940] text-[#c9b8ff]' : 'text-[#9b9ba3] hover:bg-[#24242a] hover:text-white'}`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <GripVertical className="hidden h-3.5 w-3.5 shrink-0 text-[#5f5f68] group-hover:block" />
                      {isExpanded ? (
                        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <Folder className="h-3.5 w-3.5 shrink-0" />
                      )}
                      <span className="truncate">{node.name}</span>
                    </span>
                    <span className="ml-2 text-[11px] text-[#777780]">
                      {node.count}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) =>
                      onMenu(menuFolderId === node.id ? null : node.id, event)
                    }
                    className="grid h-7 w-7 shrink-0 place-items-center rounded text-[#777780] opacity-0 group-hover:opacity-100 hover:bg-[#24242a] hover:text-white focus:opacity-100"
                    aria-label="Acoes da pasta"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
            {hasChildren && isExpanded && (
              <div className="ml-5 border-l border-[#2f2f35] pl-1">
                <FolderTree
                  nodes={node.children}
                  activeFolder={activeFolder}
                  expanded={expanded}
                  menuFolderId={menuFolderId}
                  editingFolderId={editingFolderId}
                  editingName={editingName}
                  dropFolderId={dropFolderId}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  onMenu={onMenu}
                  onStartCreate={onStartCreate}
                  onStartRename={onStartRename}
                  onEditingNameChange={onEditingNameChange}
                  onSaveRename={onSaveRename}
                  onCancelRename={onCancelRename}
                  onDelete={onDelete}
                  onMoveFolder={onMoveFolder}
                  onMoveNote={onMoveNote}
                  onReorder={onReorder}
                  onDropState={onDropState}
                  onCreateNote={onCreateNote}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NoteContextMenu({
  state,
  note,
  folderTree,
  onClose,
  onRename,
  onToggleFavorite,
  onMoveToFolder,
  onCopyPath,
  onMoveToTrash,
}: {
  state: NoteContextMenuState | null;
  note: NoteListItem | null;
  folderTree: FolderNode[];
  onClose: () => void;
  onRename: (note: NoteListItem) => void;
  onToggleFavorite: (note: NoteListItem) => void;
  onMoveToFolder: (note: NoteListItem, folder: FolderTarget) => void;
  onCopyPath: (note: NoteListItem) => void;
  onMoveToTrash: (note: NoteListItem) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ left: 0, top: 0 });
  const [moveOpen, setMoveOpen] = useState(false);
  const [submenuSide, setSubmenuSide] = useState<'left' | 'right'>('right');

  const focusFirstItem = useCallback(() => {
    const first = menuRef.current?.querySelector<HTMLButtonElement>(
      '[role="menuitem"]:not(:disabled)'
    );
    first?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!state || !menuRef.current) return;
    const margin = 8;
    const rect = menuRef.current.getBoundingClientRect();
    setCoords({
      left: Math.max(
        margin,
        Math.min(state.x, window.innerWidth - rect.width - margin)
      ),
      top: Math.max(
        margin,
        Math.min(state.y, window.innerHeight - rect.height - margin)
      ),
    });
  }, [state]);

  useEffect(() => {
    if (!state) return;
    setMoveOpen(false);
    window.requestAnimationFrame(focusFirstItem);
  }, [focusFirstItem, state]);

  useLayoutEffect(() => {
    if (!moveOpen || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const submenuWidth = 260;
    setSubmenuSide(
      window.innerWidth - rect.right < submenuWidth && rect.left > submenuWidth
        ? 'left'
        : 'right'
    );
  }, [moveOpen]);

  useEffect(() => {
    if (!state) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose, state]);

  const getMenuItems = useCallback(() => {
    if (!menuRef.current) return [];
    return Array.from(
      menuRef.current.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)'
      )
    );
  }, []);

  const focusRelativeItem = useCallback(
    (direction: -1 | 1) => {
      const items = getMenuItems();
      if (!items.length) return;
      const currentIndex = items.indexOf(
        document.activeElement as HTMLButtonElement
      );
      const nextIndex =
        currentIndex === -1
          ? 0
          : (currentIndex + direction + items.length) % items.length;
      items[nextIndex]?.focus();
    },
    [getMenuItems]
  );

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
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
    if (event.key === 'ArrowRight') {
      const active = document.activeElement as HTMLElement | null;
      if (active?.dataset.contextAction === 'move') {
        event.preventDefault();
        setMoveOpen(true);
      }
      return;
    }
    if (event.key === 'ArrowLeft' && moveOpen) {
      event.preventDefault();
      setMoveOpen(false);
      menuRef.current
        ?.querySelector<HTMLButtonElement>('[data-context-action="move"]')
        ?.focus();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      (document.activeElement as HTMLButtonElement | null)?.click();
    }
  };

  if (!state || !note) return null;

  const runAction = (action: () => void) => {
    onClose();
    action();
  };
  const isUnfiled = !note.folderId && !note.folderPath;

  const renderFolderItems = (nodes: FolderNode[], depth = 0): ReactNode =>
    nodes.map((folder) => {
      const isCurrent =
        note.folderId === folder.id || note.folderPath === folder.path;
      return (
        <div key={folder.id}>
          <button
            type="button"
            role="menuitem"
            disabled={isCurrent}
            onClick={() =>
              !isCurrent && runAction(() => onMoveToFolder(note, folder))
            }
            className={`flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs outline-none ${
              isCurrent
                ? 'cursor-default bg-[#2d2940] text-[#c9b8ff]'
                : 'text-[#c9c9d1] hover:bg-[#2a2a30] hover:text-white focus:bg-[#2a2a30] focus:text-white'
            }`}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
          >
            {isCurrent ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-[#b8a9ff]" />
            ) : (
              <Folder className="h-3.5 w-3.5 shrink-0 text-[#8f8f98]" />
            )}
            <span className="min-w-0 flex-1 truncate">{folder.name}</span>
            {folder.count > 0 && (
              <span className="text-[10px] text-[#777780]">{folder.count}</span>
            )}
          </button>
          {folder.children.length > 0 &&
            renderFolderItems(folder.children, depth + 1)}
        </div>
      );
    });

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Acoes da nota ${note.title}`}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed z-50 w-56 rounded-md border border-[#34343c] bg-[#1b1b1f] p-1 text-xs text-[#dcddde] shadow-2xl outline-none"
      style={{ left: coords.left, top: coords.top }}
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => runAction(() => onRename(note))}
        className="flex h-8 w-full items-center gap-2 rounded px-2 text-left outline-none hover:bg-[#2a2a30] focus:bg-[#2a2a30]"
      >
        <Edit3 className="h-3.5 w-3.5 text-[#9a8cff]" />
        Renomear
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => runAction(() => onToggleFavorite(note))}
        className="flex h-8 w-full items-center gap-2 rounded px-2 text-left outline-none hover:bg-[#2a2a30] focus:bg-[#2a2a30]"
      >
        <Star
          className={`h-3.5 w-3.5 ${
            note.isFavorite ? 'fill-[#d6a94a] text-[#d6a94a]' : 'text-[#9a8cff]'
          }`}
        />
        {note.isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
      </button>
      <div
        className="relative"
        onMouseEnter={() => setMoveOpen(true)}
        onMouseLeave={() => setMoveOpen(false)}
      >
        <button
          type="button"
          role="menuitem"
          data-context-action="move"
          aria-haspopup="menu"
          aria-expanded={moveOpen}
          onClick={() => setMoveOpen((value) => !value)}
          className="flex h-8 w-full items-center gap-2 rounded px-2 text-left outline-none hover:bg-[#2a2a30] focus:bg-[#2a2a30]"
        >
          <FolderOpen className="h-3.5 w-3.5 text-[#9a8cff]" />
          <span className="flex-1">Mover para</span>
          <ChevronRight className="h-3.5 w-3.5 text-[#777780]" />
        </button>
        {moveOpen && (
          <div
            role="menu"
            aria-label="Mover nota para pasta"
            className={`absolute top-0 z-50 w-64 overflow-y-auto rounded-md border border-[#34343c] bg-[#1b1b1f] p-1 shadow-2xl ${
              submenuSide === 'left' ? 'right-full mr-1' : 'left-full ml-1'
            }`}
            style={{ maxHeight: 'min(20rem, calc(100vh - 1rem))' }}
          >
            <button
              type="button"
              role="menuitem"
              disabled={isUnfiled}
              onClick={() =>
                !isUnfiled && runAction(() => onMoveToFolder(note, null))
              }
              className={`flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs outline-none ${
                isUnfiled
                  ? 'cursor-default bg-[#2d2940] text-[#c9b8ff]'
                  : 'text-[#c9c9d1] hover:bg-[#2a2a30] hover:text-white focus:bg-[#2a2a30] focus:text-white'
              }`}
            >
              {isUnfiled ? (
                <Check className="h-3.5 w-3.5 text-[#b8a9ff]" />
              ) : (
                <FileText className="h-3.5 w-3.5 text-[#8f8f98]" />
              )}
              Sem Pasta
            </button>
            {folderTree.length > 0 ? (
              renderFolderItems(folderTree)
            ) : (
              <div className="px-2 py-2 text-xs text-[#777780]">
                Nenhuma pasta criada.
              </div>
            )}
          </div>
        )}
      </div>
      <button
        type="button"
        role="menuitem"
        onClick={() => runAction(() => onCopyPath(note))}
        className="flex h-8 w-full items-center gap-2 rounded px-2 text-left outline-none hover:bg-[#2a2a30] focus:bg-[#2a2a30]"
      >
        <Copy className="h-3.5 w-3.5 text-[#9a8cff]" />
        Copiar caminho
      </button>
      <div className="my-1 border-t border-[#303036]" />
      <button
        type="button"
        role="menuitem"
        onClick={() => runAction(() => onMoveToTrash(note))}
        className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-red-200 outline-none hover:bg-red-500/10 focus:bg-red-500/10"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Mover para a lixeira
      </button>
    </div>
  );
}

function FolderContextMenu({
  state,
  folder,
  folderTree,
  onClose,
  onCreateNote,
  onCreateFolder,
  onRename,
  onMoveFolder,
  onCopyPath,
  onMoveToTrash,
}: {
  state: FolderContextMenuState | null;
  folder: FolderNode | null;
  folderTree: FolderNode[];
  onClose: () => void;
  onCreateNote: (folder: FolderTarget) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRename: (folder: FolderNode) => void;
  onMoveFolder: (folderId: string, parentId: string | null) => void;
  onCopyPath: (folder: FolderNode) => void;
  onMoveToTrash: (folder: FolderNode) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ left: 0, top: 0 });
  const [moveOpen, setMoveOpen] = useState(false);
  const [submenuSide, setSubmenuSide] = useState<'left' | 'right'>('right');

  const targetId = state?.targetId || null;
  const isRoot = targetId === 'root';
  const isUnfiled = targetId === 'unfiled';
  const canEditFolder = Boolean(folder && !isRoot && !isUnfiled);

  const focusFirstItem = useCallback(() => {
    menuRef.current
      ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
      ?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!state || !menuRef.current) return;
    const margin = 8;
    const rect = menuRef.current.getBoundingClientRect();
    setCoords({
      left: Math.max(
        margin,
        Math.min(state.x, window.innerWidth - rect.width - margin)
      ),
      top: Math.max(
        margin,
        Math.min(state.y, window.innerHeight - rect.height - margin)
      ),
    });
  }, [state]);

  useEffect(() => {
    if (!state) return;
    setMoveOpen(false);
    window.requestAnimationFrame(focusFirstItem);
  }, [focusFirstItem, state]);

  useLayoutEffect(() => {
    if (!moveOpen || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const submenuWidth = 260;
    setSubmenuSide(
      window.innerWidth - rect.right < submenuWidth && rect.left > submenuWidth
        ? 'left'
        : 'right'
    );
  }, [moveOpen]);

  useEffect(() => {
    if (!state) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [onClose, state]);

  const getMenuItems = useCallback(() => {
    if (!menuRef.current) return [];
    return Array.from(
      menuRef.current.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)'
      )
    );
  }, []);

  const focusRelativeItem = useCallback(
    (direction: -1 | 1) => {
      const items = getMenuItems();
      if (!items.length) return;
      const currentIndex = items.indexOf(
        document.activeElement as HTMLButtonElement
      );
      const nextIndex =
        currentIndex === -1
          ? 0
          : (currentIndex + direction + items.length) % items.length;
      items[nextIndex]?.focus();
    },
    [getMenuItems]
  );

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
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
    if (event.key === 'ArrowRight') {
      const active = document.activeElement as HTMLElement | null;
      if (active?.dataset.contextAction === 'move-folder') {
        event.preventDefault();
        setMoveOpen(true);
      }
      return;
    }
    if (event.key === 'ArrowLeft' && moveOpen) {
      event.preventDefault();
      setMoveOpen(false);
      menuRef.current
        ?.querySelector<HTMLButtonElement>(
          '[data-context-action="move-folder"]'
        )
        ?.focus();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      (document.activeElement as HTMLButtonElement | null)?.click();
    }
  };

  if (!state || (!folder && !isRoot && !isUnfiled)) return null;

  const runAction = (action: () => void) => {
    onClose();
    action();
  };

  const isMoveTargetDisabled = (target: FolderNode) => {
    if (!folder) return false;
    return (
      target.id === folder.id ||
      target.path === folder.path ||
      target.path.startsWith(`${folder.path}/`)
    );
  };

  const renderFolderItems = (nodes: FolderNode[], depth = 0): ReactNode =>
    nodes.map((target) => {
      const disabled = isMoveTargetDisabled(target);
      return (
        <div key={target.id}>
          <button
            type="button"
            role="menuitem"
            disabled={disabled}
            onClick={() =>
              folder &&
              !disabled &&
              runAction(() => onMoveFolder(folder.id, target.id))
            }
            className={`flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs outline-none ${
              disabled
                ? 'cursor-default text-[#5f5f68]'
                : 'text-[#c9c9d1] hover:bg-[#2a2a30] hover:text-white focus:bg-[#2a2a30] focus:text-white'
            }`}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
          >
            <Folder className="h-3.5 w-3.5 shrink-0 text-[#8f8f98]" />
            <span className="min-w-0 flex-1 truncate">{target.name}</span>
          </button>
          {target.children.length > 0 &&
            renderFolderItems(target.children, depth + 1)}
        </div>
      );
    });

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Acoes da pasta"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed z-50 w-60 rounded-md border border-[#34343c] bg-[#1b1b1f] p-1 text-xs text-[#dcddde] shadow-2xl outline-none"
      style={{ left: coords.left, top: coords.top }}
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => runAction(() => onCreateNote(folder))}
        className="flex h-8 w-full items-center gap-2 rounded px-2 text-left outline-none hover:bg-[#2a2a30] focus:bg-[#2a2a30]"
      >
        <FileText className="h-3.5 w-3.5 text-[#9a8cff]" />
        {isUnfiled ? 'Nova nota em Sem Pasta' : 'Nova nota nesta pasta'}
      </button>
      {!isUnfiled && (
        <button
          type="button"
          role="menuitem"
          onClick={() => runAction(() => onCreateFolder(folder?.id || null))}
          className="flex h-8 w-full items-center gap-2 rounded px-2 text-left outline-none hover:bg-[#2a2a30] focus:bg-[#2a2a30]"
        >
          <FolderPlus className="h-3.5 w-3.5 text-[#9a8cff]" />
          {isRoot ? 'Nova pasta na raiz' : 'Nova subpasta'}
        </button>
      )}
      {canEditFolder && folder && (
        <>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(() => onRename(folder))}
            className="flex h-8 w-full items-center gap-2 rounded px-2 text-left outline-none hover:bg-[#2a2a30] focus:bg-[#2a2a30]"
          >
            <Edit3 className="h-3.5 w-3.5 text-[#9a8cff]" />
            Renomear
          </button>
          <div
            className="relative"
            onMouseEnter={() => setMoveOpen(true)}
            onMouseLeave={() => setMoveOpen(false)}
          >
            <button
              type="button"
              role="menuitem"
              data-context-action="move-folder"
              aria-haspopup="menu"
              aria-expanded={moveOpen}
              onClick={() => setMoveOpen((value) => !value)}
              className="flex h-8 w-full items-center gap-2 rounded px-2 text-left outline-none hover:bg-[#2a2a30] focus:bg-[#2a2a30]"
            >
              <FolderInput className="h-3.5 w-3.5 text-[#9a8cff]" />
              <span className="flex-1">Mover para</span>
              <ChevronRight className="h-3.5 w-3.5 text-[#777780]" />
            </button>
            {moveOpen && (
              <div
                role="menu"
                aria-label="Mover pasta"
                className={`absolute top-0 z-50 w-64 overflow-y-auto rounded-md border border-[#34343c] bg-[#1b1b1f] p-1 shadow-2xl ${
                  submenuSide === 'left' ? 'right-full mr-1' : 'left-full ml-1'
                }`}
                style={{ maxHeight: 'min(20rem, calc(100vh - 1rem))' }}
              >
                <button
                  type="button"
                  role="menuitem"
                  disabled={!folder.parentId}
                  onClick={() =>
                    folder.parentId &&
                    runAction(() => onMoveFolder(folder.id, null))
                  }
                  className={`flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs outline-none ${
                    !folder.parentId
                      ? 'cursor-default bg-[#2d2940] text-[#c9b8ff]'
                      : 'text-[#c9c9d1] hover:bg-[#2a2a30] hover:text-white focus:bg-[#2a2a30]'
                  }`}
                >
                  <Inbox className="h-3.5 w-3.5 text-[#8f8f98]" />
                  Raiz
                </button>
                {renderFolderItems(folderTree)}
              </div>
            )}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(() => onCopyPath(folder))}
            className="flex h-8 w-full items-center gap-2 rounded px-2 text-left outline-none hover:bg-[#2a2a30] focus:bg-[#2a2a30]"
          >
            <Copy className="h-3.5 w-3.5 text-[#9a8cff]" />
            Copiar caminho
          </button>
          <div className="my-1 border-t border-[#303036]" />
          <button
            type="button"
            role="menuitem"
            onClick={() => runAction(() => onMoveToTrash(folder))}
            className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-red-200 outline-none hover:bg-red-500/10 focus:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Mover para a lixeira
          </button>
        </>
      )}
    </div>
  );
}

function ConfirmDialog({
  state,
  pending,
  onCancel,
}: {
  state: ConfirmState | null;
  pending: boolean;
  onCancel: () => void;
}) {
  if (!state) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notes-confirm-title"
        className="w-full max-w-md rounded-lg border border-[#34343c] bg-[#202024] shadow-2xl"
      >
        <div className="flex items-start gap-3 border-b border-[#303036] p-4">
          <div
            className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded ${
              state.tone === 'danger'
                ? 'bg-red-500/10 text-red-200'
                : 'bg-[#34245f] text-[#d7ccff]'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2
              id="notes-confirm-title"
              className="text-sm font-semibold text-[#f2f2f3]"
            >
              {state.title}
            </h2>
            <p className="mt-1 text-sm leading-5 text-[#b8b8bf]">
              {state.description}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-md border border-[#34343c] px-3 py-2 text-sm text-[#dcddde] hover:bg-[#2a2a30] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void state.onConfirm()}
            disabled={pending}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white disabled:opacity-50 ${
              state.tone === 'danger'
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-[#6f55d9] hover:bg-[#7c66df]'
            }`}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {pending
              ? state.pendingLabel || 'Processando...'
              : state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommandPalette({
  open,
  notes,
  onClose,
  onNewNote,
  onOpenNote,
  onOpenGraph,
  onCreateTask,
}: {
  open: boolean;
  notes: NoteListItem[];
  onClose: () => void;
  onNewNote: () => void;
  onOpenNote: (note: NoteListItem) => void;
  onOpenGraph: () => void;
  onCreateTask: (title: string) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  const matches = notes
    .filter((note) => note.title.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);
  const commands = [
    { label: 'Nova nota', hint: 'Ctrl B', action: onNewNote, icon: Plus },
    {
      label: 'Abrir Graph',
      hint: 'Graph View',
      action: onOpenGraph,
      icon: GitBranch,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto mt-24 w-full max-w-2xl overflow-hidden rounded-lg border border-[#33333a] bg-[#1e1e22] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[#303036] px-4">
          <Command className="h-4 w-4 text-[#9a8cff]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={async (event) => {
              if (event.key === 'Escape') onClose();
              if (
                event.key === 'Enter' &&
                query.trim() &&
                matches.length === 0
              ) {
                await onCreateTask(query.trim());
                onClose();
              }
            }}
            placeholder="Buscar nota, criar tarefa ou executar comando..."
            className="h-14 flex-1 bg-transparent text-sm text-[#f2f2f3] outline-none placeholder:text-[#777780]"
          />
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {commands.map((command) => {
            const Icon = command.icon;
            return (
              <button
                key={command.label}
                type="button"
                onClick={() => {
                  command.action();
                  onClose();
                }}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-[#dcddde] hover:bg-[#2a2a30]"
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-[#9a8cff]" />
                  {command.label}
                </span>
                <span className="text-xs text-[#777780]">{command.hint}</span>
              </button>
            );
          })}
          {matches.map((note) => (
            <button
              key={note.id}
              type="button"
              onClick={() => {
                onOpenNote(note);
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-[#dcddde] hover:bg-[#2a2a30]"
            >
              <FileText className="h-4 w-4 text-[#8f8f98]" />
              <span>{note.title}</span>
            </button>
          ))}
          {query.trim() && matches.length === 0 && (
            <div className="px-3 py-3 text-sm text-[#8f8f98]">
              Enter cria uma task:{' '}
              <span className="text-[#dcddde]">{query}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GraphView({
  notes,
  onOpenNote,
}: {
  notes: NoteListItem[];
  onOpenNote: (note: NoteListItem) => void;
}) {
  return (
    <div className="h-full overflow-hidden rounded-md border border-[#2f2f35] bg-[#161619]">
      <GraphFlow
        notes={notes}
        onOpenNote={(graphNote) => {
          const note = notes.find((item) => item.id === graphNote.id);
          if (note) onOpenNote(note);
        }}
      />
    </div>
  );
}

export default function Notes() {
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [selectedNote, setSelectedNote] = useState<NoteDetail | null>(null);
  const [draft, setDraft] = useState<NoteFormInput>(emptyDraft);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [folders, setFolders] = useState<FolderSummary[]>([]);
  const [trashedFolders, setTrashedFolders] = useState<TrashFolderSummary[]>(
    []
  );
  const [attachments, setAttachments] = useState<PreviewAttachment[]>([]);
  const [linkableNotes, setLinkableNotes] = useState<PreviewNote[]>([]);
  const [unfiledCount, setUnfiledCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [trashCount, setTrashCount] = useState(0);
  const [scope, setScope] = useState<LibraryScope>('all');
  const [activeTag, setActiveTag] = useState('');
  const [activeProject, setActiveProject] = useState('');
  const [activeFolder, setActiveFolder] = useState<string | null | undefined>(
    undefined
  );
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => new Set()
  );
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<WorkspaceMode>('preview');
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notesListCollapsed, setNotesListCollapsed] = useState(false);
  const [notesListLayoutLoaded, setNotesListLayoutLoaded] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<SaveStatus>('idle');
  const [importing, setImporting] = useState(false);
  const [selectedZip, setSelectedZip] = useState<File | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(
    null
  );
  const [folderFormParentId, setFolderFormParentId] = useState<
    string | null | undefined
  >(undefined);
  const [folderName, setFolderName] = useState('');
  const [folderSaving, setFolderSaving] = useState(false);
  const [folderContextMenu, setFolderContextMenu] =
    useState<FolderContextMenuState | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [dropFolderId, setDropFolderId] = useState<string | null>(null);
  const [noteContextMenu, setNoteContextMenu] =
    useState<NoteContextMenuState | null>(null);
  const [renamingNoteId, setRenamingNoteId] = useState<string | null>(null);
  const [renamingTitle, setRenamingTitle] = useState('');
  const [noteFeedback, setNoteFeedback] = useState<NoteFeedback>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);
  const [trashSelection, setTrashSelection] = useState<Set<string>>(
    () => new Set()
  );
  const [lastTrashSelectionIndex, setLastTrashSelectionIndex] = useState<
    number | null
  >(null);
  const [pasteUploading, setPasteUploading] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<
    NoteHistoryEntry[]
  >([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [pendingWikiAnchor, setPendingWikiAnchor] = useState<{
    noteId: string;
    anchor: string;
  } | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameCommitRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const selectedNoteRef = useRef(selectedNote);
  selectedNoteRef.current = selectedNote;
  const historyNavigationTargetRef = useRef<string | null>(null);
  const noteHistoryCacheRef = useRef(new Map<string, NoteDetail>());
  const previousOpenedNoteIdRef = useRef<string | null>(null);
  const [error, setError] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    if (!renamingNoteId) return;
    window.requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
  }, [renamingNoteId]);

  useEffect(() => {
    if (!noteFeedback) return;
    const timeout = window.setTimeout(() => setNoteFeedback(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [noteFeedback]);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(NOTE_HISTORY_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      if (Array.isArray(parsed)) {
        setNavigationHistory(
          parsed
            .filter((entry): entry is NoteHistoryEntry =>
              Boolean(
                entry &&
                typeof entry.id === 'string' &&
                typeof entry.title === 'string'
              )
            )
            .slice(-MAX_NOTE_HISTORY)
        );
      }
    } catch {
      setNavigationHistory([]);
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!historyLoaded) return;
    try {
      window.sessionStorage.setItem(
        NOTE_HISTORY_STORAGE_KEY,
        JSON.stringify(navigationHistory.slice(-MAX_NOTE_HISTORY))
      );
    } catch {
      // sessionStorage can be unavailable in restricted browser contexts.
    }
  }, [historyLoaded, navigationHistory]);

  useEffect(() => {
    const noteId = selectedNote?.id || null;
    if (previousOpenedNoteIdRef.current === noteId) return;
    previousOpenedNoteIdRef.current = noteId;
    if (!noteId) return;
    setMode('preview');
    setRightCollapsed(true);
  }, [selectedNote?.id]);

  useEffect(() => {
    if (!selectedNote) return;
    noteHistoryCacheRef.current.set(selectedNote.id, selectedNote);
  }, [selectedNote]);

  useEffect(() => {
    if (!historyLoaded || !selectedNote) return;

    if (historyNavigationTargetRef.current === selectedNote.id) {
      historyNavigationTargetRef.current = null;
      return;
    }

    setNavigationHistory((current) => {
      const last = current.at(-1);
      if (last?.id === selectedNote.id) {
        if (last.title === selectedNote.title) return current;
        return [
          ...current.slice(0, -1),
          { id: selectedNote.id, title: selectedNote.title },
        ];
      }

      return [
        ...current,
        { id: selectedNote.id, title: selectedNote.title },
      ].slice(-MAX_NOTE_HISTORY);
    });
  }, [historyLoaded, selectedNote?.id, selectedNote?.title]);

  useEffect(() => {
    if (!selectedNote) return;
    setNavigationHistory((current) =>
      current.map((entry) =>
        entry.id === selectedNote.id
          ? { ...entry, title: selectedNote.title }
          : entry
      )
    );
  }, [selectedNote?.id, selectedNote?.title]);

  useEffect(() => {
    if (
      !pendingWikiAnchor ||
      selectedNote?.id !== pendingWikiAnchor.noteId ||
      (mode !== 'preview' && mode !== 'split')
    ) {
      return;
    }

    let cancelled = false;
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (cancelled) return;
        const wanted = pendingWikiAnchor.anchor.trim().toLocaleLowerCase();
        const wantedSlug = slugifyNote(wanted.replace(/^\^/, ''));
        const target = Array.from(
          document.querySelectorAll<HTMLElement>('[data-wiki-anchor]')
        ).find((element) => {
          const anchor =
            element.dataset.wikiAnchor?.trim().toLocaleLowerCase() || '';
          if (anchor === wanted) return true;
          return (
            !wanted.startsWith('^') &&
            slugifyNote(anchor.replace(/^\^/, '')) === wantedSlug
          );
        });
        target?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        setPendingWikiAnchor(null);
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [draft.content, mode, pendingWikiAnchor, selectedNote?.id]);

  const draftKey = JSON.stringify({
    title: draft.title,
    content: draft.content,
    excerpt: draft.excerpt,
    visibility: draft.visibility,
    status: draft.status,
    tags: draft.tags,
    projectId: draft.projectId,
    folderId: draft.folderId,
  });
  const autoSave = useAutoSave(draftKey, selectedNote?.id, 1000);

  const loadRef = useRef<() => Promise<void>>(async () => {});
  const mergeSavedNote = useCallback((detail: NoteDetail) => {
    setNotes((current) =>
      current.map((note) =>
        note.id === detail.id
          ? {
              ...note,
              title: detail.title,
              slug: detail.slug,
              content: detail.content,
              excerpt: detail.excerpt,
              visibility: detail.visibility,
              status: detail.status,
              isFavorite: detail.isFavorite,
              viewCount: detail.viewCount,
              fileName: detail.fileName,
              filePath: detail.filePath,
              folderPath: detail.folderPath,
              folderName: detail.folderName,
              folderId: detail.folderId,
              extension: detail.extension,
              projectId: detail.projectId,
              project: detail.project,
              tags: detail.tags,
              outgoing: detail.outgoing,
              updatedAt: detail.updatedAt,
            }
          : note
      )
    );
    setLinkableNotes((current) =>
      current.map((note) =>
        note.id === detail.id
          ? {
              ...note,
              title: detail.title,
              slug: detail.slug,
              filePath: detail.filePath,
              folderId: detail.folderId,
              folderPath: detail.folderPath,
            }
          : note
      )
    );
  }, []);

  const saveNoteFromRef = useCallback(async () => {
    const currentDraft = draftRef.current;
    const currentSelected = selectedNoteRef.current;
    if (!currentSelected) return false;
    setSaving(true);
    const result = await updateNote(currentSelected.id, currentDraft);
    if (result.success) {
      const payload = result as { success: true; data: { note: NoteDetail } };
      const detail = payload.data.note;
      if (selectedNoteRef.current?.id === currentSelected.id) {
        setSelectedNote((current) =>
          current?.id === detail.id
            ? { ...detail, content: currentDraft.content }
            : current
        );
        setDraft((current) => ({
          ...current,
          slug: detail.slug,
        }));
      }
      mergeSavedNote({ ...detail, content: currentDraft.content });
      setSaving(false);
      return true;
    } else {
      const payload = result as { success: false; error: string };
      setError(payload.error || 'Nao foi possivel salvar.');
      setSaving(false);
      return false;
    }
  }, [mergeSavedNote]);

  useEffect(() => {
    autoSave.onStatusChange(setAutoSaveStatus);
  }, [autoSave]);

  useEffect(() => {
    autoSave.registerSave(saveNoteFromRef);
  }, [autoSave, saveNoteFromRef]);

  const previousAutoSaveNoteIdRef = useRef<string | null | undefined>(
    undefined
  );
  useEffect(() => {
    const noteId = selectedNote?.id || null;
    if (previousAutoSaveNoteIdRef.current === noteId) return;
    previousAutoSaveNoteIdRef.current = noteId;
    autoSave.markSaved(noteId ? 'saved' : 'idle', draftKey);
  }, [autoSave, selectedNote?.id, draftKey]);

  const [wikilinkBlocked, setWikilinkBlocked] = useState(false);
  const [autocompleteSelectedIndex, setAutocompleteSelectedIndex] = useState(0);
  const [cachedNoteContents, setCachedNoteContents] = useState<
    Record<string, string>
  >({});

  const wikilinkParse = useMemo(
    () => parseWikilinkAtCursor(draft.content, cursorPos),
    [draft.content, cursorPos]
  );

  const noteContentById = useMemo(() => {
    const map = new Map<string, string>();
    notes.forEach((note) => map.set(note.id, note.content));
    if (selectedNote) map.set(selectedNote.id, selectedNote.content);
    Object.entries(cachedNoteContents).forEach(([id, content]) => {
      map.set(id, content);
    });
    return map;
  }, [cachedNoteContents, notes, selectedNote]);

  const wikilinkTargetNote = useMemo(() => {
    if (
      !wikilinkParse ||
      (wikilinkParse.mode !== 'heading' && wikilinkParse.mode !== 'block')
    ) {
      return null;
    }

    const target = wikilinkParse.target.trim();
    if (!target && selectedNote) {
      return {
        id: selectedNote.id,
        title: selectedNote.title,
        slug: selectedNote.slug,
        filePath: selectedNote.filePath,
        folderId: selectedNote.folderId,
        folderPath: selectedNote.folderPath,
      };
    }

    const resolution = resolveWikiLinkTarget(
      target,
      linkableNotes,
      selectedNote?.folderPath
    );
    return resolution.status === 'resolved' ? resolution.note : null;
  }, [linkableNotes, selectedNote, wikilinkParse]);

  useEffect(() => {
    if (!wikilinkTargetNote || noteContentById.has(wikilinkTargetNote.id)) {
      return;
    }

    let cancelled = false;
    void getNote(wikilinkTargetNote.id).then((result) => {
      if (cancelled || !result.success || !result.data) return;
      const detail = result.data.note as NoteDetail;
      setCachedNoteContents((current) => ({
        ...current,
        [detail.id]: detail.content,
      }));
    });

    return () => {
      cancelled = true;
    };
  }, [noteContentById, wikilinkTargetNote]);

  const autocompleteSuggestions = useMemo<WikiLinkSuggestion[]>(() => {
    if (!wikilinkParse || wikilinkParse.mode === 'alias') return [];

    if (wikilinkParse.mode === 'search') {
      const q = wikilinkParse.query.trim().toLowerCase();
      const matchedNotes = (
        q
          ? linkableNotes.filter(
              (note) =>
                note.title.toLowerCase().includes(q) ||
                note.slug.toLowerCase().includes(q) ||
                note.filePath?.toLowerCase().includes(q)
            )
          : linkableNotes
      ).slice(0, 24);

      const suggestions: WikiLinkSuggestion[] = matchedNotes.map((note) => ({
        id: `note-${note.id}`,
        label: note.title,
        value: note.title,
        type: 'note',
        detail: note.folderPath || folderLabelFromFilePath(note.filePath),
      }));

      const hasExactMatch = linkableNotes.some(
        (note) =>
          note.title.toLowerCase() === q ||
          note.slug.toLowerCase() === slugifyNote(q)
      );
      if (q && !hasExactMatch) {
        suggestions.push({
          id: `unresolved-${q}`,
          label: wikilinkParse.query.trim(),
          value: wikilinkParse.query.trim(),
          type: 'unresolved',
          detail: 'unresolved',
          unresolved: true,
        });
      }

      return suggestions.slice(0, 25);
    }

    if (!wikilinkTargetNote) return [];
    const content = noteContentById.get(wikilinkTargetNote.id);
    if (!content) return [];

    const q = wikilinkParse.query.trim().toLowerCase();

    if (wikilinkParse.mode === 'heading') {
      return extractMarkdownHeadings(content)
        .filter((heading) => !q || heading.title.toLowerCase().includes(q))
        .slice(0, 24)
        .map((heading) => ({
          id: `heading-${wikilinkTargetNote.id}-${heading.id}`,
          label: heading.title,
          value: heading.title,
          type: 'heading',
          detail: `H${heading.level}`,
        }));
    }

    return extractMarkdownBlockRefs(content)
      .filter(
        (block) =>
          !q ||
          block.id.toLowerCase().includes(q) ||
          block.preview.toLowerCase().includes(q)
      )
      .slice(0, 24)
      .map((block) => ({
        id: `block-${wikilinkTargetNote.id}-${block.id}`,
        label: `^${block.id}`,
        value: block.id,
        type: 'block',
        detail: block.preview,
      }));
  }, [linkableNotes, noteContentById, wikilinkParse, wikilinkTargetNote]);

  useEffect(() => {
    setAutocompleteSelectedIndex(0);
  }, [wikilinkParse?.mode, wikilinkParse?.query, wikilinkParse?.target]);

  const isAutocompleteOpen =
    !wikilinkBlocked &&
    wikilinkParse !== null &&
    wikilinkParse.isInside &&
    wikilinkParse.mode !== 'alias' &&
    autocompleteSuggestions.length > 0;

  const autocompletePosition = useMemo(() => {
    if (!isAutocompleteOpen || !textareaRef.current) return { top: 0, left: 0 };
    return estimateCursorPosition(textareaRef.current);
  }, [isAutocompleteOpen, cursorPos, textareaRef]);

  const handleAutocompleteSelect = useCallback(
    (index: number) => {
      if (!wikilinkParse) return;
      const suggestion = autocompleteSuggestions[index];
      if (!suggestion) return;
      const before = draft.content.slice(0, wikilinkParse.startPos);
      const after = draft.content.slice(wikilinkParse.endPos);
      const targetTitle =
        wikilinkTargetNote?.title || wikilinkParse.target.trim();
      let replacement = '';
      let cursorOffset: number | null = null;

      if (suggestion.type === 'heading') {
        replacement = `[[${targetTitle}#${suggestion.value}]]`;
      } else if (suggestion.type === 'block') {
        replacement = `[[${targetTitle}#^${suggestion.value}]]`;
      } else if (wikilinkParse.alias !== undefined) {
        replacement = `[[${suggestion.value}|${wikilinkParse.alias}]]`;
        if (!wikilinkParse.alias) {
          cursorOffset = `[[${suggestion.value}|`.length;
        }
      } else {
        replacement = `[[${suggestion.value}]]`;
      }

      setDraft((prev) => ({ ...prev, content: before + replacement + after }));
      setWikilinkBlocked(true);
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) {
          const newPos =
            wikilinkParse.startPos + (cursorOffset ?? replacement.length);
          ta.selectionStart = newPos;
          ta.selectionEnd = newPos;
          setCursorPos(newPos);
        }
      });
    },
    [autocompleteSuggestions, draft.content, wikilinkParse, wikilinkTargetNote]
  );

  const handleCreateNoteInFolder = async (folder: FolderTarget) => {
    const title = nextUntitledNoteTitle(linkableNotes, folder?.id || null);
    const slug = slugifyNote(title);
    const result = await createNote({
      title,
      slug,
      content: '',
      excerpt: '',
      visibility: 'PRIVATE',
      status: 'DRAFT',
      tags: [],
      projectId: null,
      folderId: folder?.id || null,
      folderPath: folder?.path || null,
      folderName: folder?.name || null,
    });
    if (result.success && result.data) {
      const detail = result.data.note as NoteDetail;
      setSelectedNote(detail);
      setDraft(noteToDraft(detail));
      setScope('all');
      setActiveFolder(folder?.path || null);
      setFolderContextMenu(null);
      await load();
    } else {
      setError(result.error || 'Nao foi possivel criar a nota.');
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [noteResult, tagResult, projectResult] = await Promise.all([
      getNotes({
        search: debouncedSearch,
        status: scope === 'trash' ? 'ARCHIVED' : 'ALL',
        tag: activeTag,
        projectId: activeProject,
        favorite: scope === 'favorites' ? true : undefined,
        folderPath: activeFolder,
      }),
      getNoteTags(),
      getProjectsForNotes(),
    ]);
    if (noteResult.success && noteResult.data) {
      setNotes(noteResult.data.notes as NoteListItem[]);
      setFolders(noteResult.data.folders as FolderSummary[]);
      setTrashedFolders(
        (noteResult.data.trashedFolders || []) as TrashFolderSummary[]
      );
      setAttachments(noteResult.data.attachments as PreviewAttachment[]);
      setLinkableNotes(noteResult.data.linkableNotes as PreviewNote[]);
      setUnfiledCount(noteResult.data.unfiledCount || 0);
      setTotalCount(noteResult.data.stats.total || 0);
      setFavoriteCount(noteResult.data.stats.favorites || 0);
      setTrashCount(
        (noteResult.data.stats.byStatus?.ARCHIVED || 0) +
          (noteResult.data.trashFolderCount || 0)
      );
    } else setError(noteResult.error || 'Nao foi possivel carregar notas.');
    if (tagResult.success) setTags(tagResult.data);
    if (projectResult.success) setProjects(projectResult.data);
    setLoading(false);
  }, [activeFolder, activeProject, activeTag, debouncedSearch, scope]);

  loadRef.current = load;

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    try {
      setNotesListCollapsed(
        window.localStorage.getItem('knowledge-vault-notes-collapsed') ===
          'true'
      );
    } catch {
      setNotesListCollapsed(false);
    } finally {
      setNotesListLayoutLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!notesListLayoutLoaded) return;
    try {
      window.localStorage.setItem(
        'knowledge-vault-notes-collapsed',
        String(notesListCollapsed)
      );
    } catch {
      // localStorage can be unavailable in restricted browser contexts.
    }
  }, [notesListCollapsed, notesListLayoutLoaded]);

  useEffect(() => {
    setFolderContextMenu(null);
    setNoteContextMenu(null);
  }, [activeFolder, activeProject, activeTag, scope]);

  useEffect(() => {
    if (scope !== 'trash') {
      setTrashSelection(new Set());
      setLastTrashSelectionIndex(null);
    }
  }, [scope]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.repeat) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
        startNewNote();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const filteredNotes = useMemo(() => {
    if (scope === 'recent')
      return [...notes].sort(
        (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
      );
    return notes;
  }, [notes, scope]);
  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);
  const folderById = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders]
  );
  const menuFolderId = folderContextMenu?.targetId || null;
  const folderContextTarget = useMemo(() => {
    const targetId = folderContextMenu?.targetId;
    if (!targetId || targetId === 'root' || targetId === 'unfiled') return null;
    return (
      folderTree
        .flatMap(function flatten(node): FolderNode[] {
          return [node, ...node.children.flatMap(flatten)];
        })
        .find((folder) => folder.id === targetId) || null
    );
  }, [folderContextMenu?.targetId, folderTree]);
  const trashRows = useMemo<TrashRow[]>(() => {
    if (scope !== 'trash') return [];
    return [
      ...trashedFolders.map((folder) => ({
        type: 'folder' as const,
        id: folder.id,
        key: `folder:${folder.id}`,
        folder,
      })),
      ...filteredNotes.map((note) => ({
        type: 'note' as const,
        id: note.id,
        key: `note:${note.id}`,
        note,
      })),
    ];
  }, [filteredNotes, scope, trashedFolders]);
  const selectedTrashRows = useMemo(
    () => trashRows.filter((row) => trashSelection.has(row.key)),
    [trashRows, trashSelection]
  );
  useEffect(() => {
    if (scope !== 'trash') return;
    const available = new Set(trashRows.map((row) => row.key));
    setTrashSelection((current) => {
      const next = new Set(
        Array.from(current).filter((key) => available.has(key))
      );
      return next.size === current.size ? current : next;
    });
  }, [scope, trashRows]);
  const contextMenuNote = useMemo(() => {
    if (!noteContextMenu) return null;
    return (
      notes.find((note) => note.id === noteContextMenu.noteId) ||
      (selectedNote?.id === noteContextMenu.noteId ? selectedNote : null)
    );
  }, [noteContextMenu, notes, selectedNote]);

  const openNoteContextMenu = (
    event: ReactMouseEvent<HTMLDivElement>,
    note: NoteListItem
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setFolderContextMenu(null);
    setNoteContextMenu({
      noteId: note.id,
      x: event.clientX,
      y: event.clientY,
    });
  };

  const openFolderContextMenu = (
    targetId: FolderMenuTarget,
    event?: { clientX: number; clientY: number }
  ) => {
    setNoteContextMenu(null);
    if (!targetId) {
      setFolderContextMenu(null);
      return;
    }
    setFolderContextMenu({
      targetId,
      x: event?.clientX ?? 16,
      y: event?.clientY ?? 16,
    });
  };

  const runConfirmed = (state: ConfirmState) => {
    setConfirmState({
      ...state,
      onConfirm: async () => {
        setConfirmPending(true);
        try {
          await state.onConfirm();
          setConfirmState(null);
        } finally {
          setConfirmPending(false);
        }
      },
    });
  };

  const startCreateFolder = (parentId: string | null = null) => {
    setFolderFormParentId(parentId);
    setFolderName('');
    setFolderContextMenu(null);
  };

  const saveFolder = async () => {
    setError('');
    const name = folderName.trim();
    if (!name) {
      setError('Informe um nome para a pasta.');
      return;
    }
    const parent = folderFormParentId
      ? folderById.get(folderFormParentId)
      : null;
    if (folderFormParentId && !parent) {
      setError('Pasta pai nao encontrada.');
      return;
    }
    const previousFolders = folders;
    const tempId = `temp-${Date.now()}`;
    const path = joinFolderPath(parent?.path, name);
    const optimisticFolder: FolderSummary = {
      id: tempId,
      name,
      path,
      parentId: parent?.id || null,
      position: folders.filter(
        (folder) => folder.parentId === (parent?.id || null)
      ).length,
      count: 0,
    };

    setFolderSaving(true);
    setFolders((current) => [...current, optimisticFolder]);
    setFolderFormParentId(undefined);
    setFolderName('');
    setScope('all');
    setActiveFolder(path);
    setExpandedFolders((current) => {
      const next = new Set(current);
      path
        .split('/')
        .slice(0, -1)
        .forEach((_, index, parts) => {
          next.add(parts.slice(0, index + 1).join('/'));
        });
      return next;
    });

    const result = await createNoteFolder({
      name,
      parentId: folderFormParentId ?? null,
    });
    if (result.success && result.data) {
      const folder = result.data.folder as {
        id: string;
        path: string;
        name: string;
        parentId: string | null;
        position: number;
      };
      setFolders((current) =>
        current.map((item) =>
          item.id === tempId
            ? {
                id: folder.id,
                path: folder.path,
                name: folder.name,
                parentId: folder.parentId,
                position: folder.position,
                count: 0,
              }
            : item
        )
      );
      setActiveFolder(folder.path);
    } else {
      setFolders(previousFolders);
      setActiveFolder(parent?.path);
      setError(result.error || 'Nao foi possivel criar a pasta.');
    }
    setFolderSaving(false);
  };

  const saveFolderRename = async (folder: FolderNode) => {
    setError('');
    const nextName = editingFolderName.trim();
    if (!nextName) {
      setError('Informe um nome de pasta valido.');
      return;
    }
    const previousPath = folder.path;
    const parent = folder.parentId ? folderById.get(folder.parentId) : null;
    const optimisticPath = joinFolderPath(parent?.path, nextName);
    const previousFolders = folders;
    const previousNotes = notes;
    const previousSelected = selectedNote;
    const previousLinkableNotes = linkableNotes;
    const previousAttachments = attachments;
    const previousActiveFolder = activeFolder;
    const patchPath = (path?: string | null) =>
      path && (path === previousPath || path.startsWith(`${previousPath}/`))
        ? replaceFolderPrefix(path, previousPath, optimisticPath)
        : path || null;

    setFolders((current) =>
      current.map((item) => {
        const nextPath = patchPath(item.path);
        return nextPath
          ? {
              ...item,
              name:
                item.id === folder.id
                  ? nextName
                  : folderNameFromPath(nextPath) || item.name,
              path: nextPath,
            }
          : item;
      })
    );
    setNotes((current) =>
      current.map((note) => {
        const folderPath = patchPath(note.folderPath);
        return folderPath !== (note.folderPath || null)
          ? {
              ...note,
              folderPath,
              folderName: folderNameFromPath(folderPath),
              filePath: buildNoteFilePath(folderPath, note.fileName),
            }
          : note;
      })
    );
    setLinkableNotes((current) =>
      current.map((note) => {
        const folderPath = patchPath(note.folderPath);
        return folderPath !== (note.folderPath || null)
          ? {
              ...note,
              folderPath,
              filePath: buildNoteFilePath(
                folderPath,
                note.filePath?.split('/').at(-1)
              ),
            }
          : note;
      })
    );
    setAttachments((current) =>
      current.map((attachment) => {
        const folderPath = patchPath(attachment.folderPath);
        return folderPath !== (attachment.folderPath || null)
          ? {
              ...attachment,
              folderPath,
              filePath:
                buildNoteFilePath(folderPath, attachment.fileName) ||
                attachment.fileName,
            }
          : attachment;
      })
    );
    setSelectedNote((current) => {
      if (!current) return current;
      const folderPath = patchPath(current.folderPath);
      return folderPath !== (current.folderPath || null)
        ? {
            ...current,
            folderPath,
            folderName: folderNameFromPath(folderPath),
            filePath: buildNoteFilePath(folderPath, current.fileName),
          }
        : current;
    });
    setEditingFolderId(null);
    setFolderContextMenu(null);
    if (
      activeFolder === previousPath ||
      activeFolder?.startsWith(`${previousPath}/`)
    ) {
      setActiveFolder(
        activeFolder === previousPath
          ? optimisticPath
          : activeFolder.replace(`${previousPath}/`, `${optimisticPath}/`)
      );
    }

    const result = await renameNoteFolder(folder.id, editingFolderName);
    if (result.success && result.data) {
      setNoteFeedback({ message: 'Pasta renomeada', tone: 'success' });
    } else {
      setFolders(previousFolders);
      setNotes(previousNotes);
      setSelectedNote(previousSelected);
      setLinkableNotes(previousLinkableNotes);
      setAttachments(previousAttachments);
      setActiveFolder(previousActiveFolder);
      setError(result.error || 'Nao foi possivel renomear a pasta.');
    }
  };

  const handleDeleteFolder = async (folder: FolderNode) => {
    runConfirmed({
      title: 'Mover pasta para a lixeira?',
      description:
        'A pasta, subpastas e notas dentro dela irão para a Lixeira. Nada será excluído permanentemente agora.',
      confirmLabel: 'Mover para lixeira',
      pendingLabel: 'Movendo...',
      tone: 'danger',
      onConfirm: async () => {
        setError('');
        const affectedFolders = folders.filter(
          (item) =>
            item.id === folder.id || item.path.startsWith(`${folder.path}/`)
        );
        const affectedNotes = notes.filter((note) =>
          note.folderPath
            ? note.folderPath === folder.path ||
              note.folderPath.startsWith(`${folder.path}/`)
            : false
        );
        const previousFolders = folders;
        const previousTrashedFolders = trashedFolders;
        const previousNotes = notes;
        const previousSelected = selectedNote;
        const previousDraft = draft;
        const previousTotalCount = totalCount;
        const previousFavoriteCount = favoriteCount;
        const previousTrashCount = trashCount;

        setFolders((current) =>
          current.filter(
            (item) =>
              item.id !== folder.id && !item.path.startsWith(`${folder.path}/`)
          )
        );
        setTrashedFolders((current) => [
          ...affectedFolders.map((item) => ({
            ...item,
            deletedAt: new Date().toISOString(),
            trashedAt: new Date().toISOString(),
          })),
          ...current,
        ]);
        setNotes((current) =>
          current.filter(
            (note) =>
              !note.folderPath ||
              (note.folderPath !== folder.path &&
                !note.folderPath.startsWith(`${folder.path}/`))
          )
        );
        setTotalCount((count) => Math.max(0, count - affectedNotes.length));
        setFavoriteCount((count) =>
          Math.max(
            0,
            count - affectedNotes.filter((note) => note.isFavorite).length
          )
        );
        setTrashCount(
          (count) => count + affectedFolders.length + affectedNotes.length
        );
        if (
          selectedNote &&
          selectedNote.folderPath &&
          (selectedNote.folderPath === folder.path ||
            selectedNote.folderPath.startsWith(`${folder.path}/`))
        ) {
          setSelectedNote(null);
          setDraft(emptyDraft());
        }
        if (
          activeFolder === folder.path ||
          activeFolder?.startsWith(`${folder.path}/`)
        )
          setActiveFolder(undefined);
        setFolderContextMenu(null);

        const result = await moveNoteFolderToTrash(folder.id);
        if (result.success) {
          setNoteFeedback({
            message: 'Pasta movida para a lixeira',
            tone: 'success',
          });
        } else {
          setFolders(previousFolders);
          setTrashedFolders(previousTrashedFolders);
          setNotes(previousNotes);
          setSelectedNote(previousSelected);
          setDraft(previousDraft);
          setTotalCount(previousTotalCount);
          setFavoriteCount(previousFavoriteCount);
          setTrashCount(previousTrashCount);
          setError(result.error || 'Nao foi possivel mover a pasta.');
        }
      },
    });
  };

  const handleMoveFolder = async (
    folderId: string,
    parentId: string | null
  ) => {
    setError('');
    const folder = folderById.get(folderId);
    const previousPath = folder?.path;
    const parent = parentId ? folderById.get(parentId) : null;
    if (!folder || (parentId && !parent)) {
      setError('Pasta destino nao encontrada.');
      return;
    }
    if (
      parent?.path === folder.path ||
      parent?.path.startsWith(`${folder.path}/`)
    ) {
      setError('Uma pasta nao pode ser movida para dentro de uma descendente.');
      return;
    }
    const optimisticPath = joinFolderPath(parent?.path, folder.name);
    const previousFolders = folders;
    const previousNotes = notes;
    const previousSelected = selectedNote;
    const previousLinkableNotes = linkableNotes;
    const previousAttachments = attachments;
    const previousActiveFolder = activeFolder;
    const patchPath = (path?: string | null) =>
      previousPath &&
      path &&
      (path === previousPath || path.startsWith(`${previousPath}/`))
        ? replaceFolderPrefix(path, previousPath, optimisticPath)
        : path || null;

    setFolders((current) =>
      current.map((item) => {
        const nextPath = patchPath(item.path);
        if (!nextPath) return item;
        return {
          ...item,
          path: nextPath,
          parentId: item.id === folderId ? parentId : item.parentId,
        };
      })
    );
    setNotes((current) =>
      current.map((note) => {
        const folderPath = patchPath(note.folderPath);
        return folderPath !== (note.folderPath || null)
          ? {
              ...note,
              folderPath,
              folderName: folderNameFromPath(folderPath),
              filePath: buildNoteFilePath(folderPath, note.fileName),
            }
          : note;
      })
    );
    setLinkableNotes((current) =>
      current.map((note) => {
        const folderPath = patchPath(note.folderPath);
        return folderPath !== (note.folderPath || null)
          ? {
              ...note,
              folderPath,
              filePath: note.filePath
                ? buildNoteFilePath(folderPath, note.filePath.split('/').at(-1))
                : note.filePath,
            }
          : note;
      })
    );
    setAttachments((current) =>
      current.map((attachment) => {
        const folderPath = patchPath(attachment.folderPath);
        return folderPath !== (attachment.folderPath || null)
          ? {
              ...attachment,
              folderPath,
              filePath:
                buildNoteFilePath(folderPath, attachment.fileName) ||
                attachment.fileName,
            }
          : attachment;
      })
    );
    setSelectedNote((current) => {
      if (!current) return current;
      const folderPath = patchPath(current.folderPath);
      return folderPath !== (current.folderPath || null)
        ? {
            ...current,
            folderPath,
            folderName: folderNameFromPath(folderPath),
            filePath: buildNoteFilePath(folderPath, current.fileName),
          }
        : current;
    });
    if (
      previousPath &&
      (activeFolder === previousPath ||
        activeFolder?.startsWith(`${previousPath}/`))
    ) {
      setActiveFolder(
        activeFolder === previousPath
          ? optimisticPath
          : activeFolder.replace(`${previousPath}/`, `${optimisticPath}/`)
      );
    }
    setFolderContextMenu(null);

    const result = await moveNoteFolder(folderId, parentId);
    if (result.success && result.data) {
      setNoteFeedback({ message: 'Pasta movida', tone: 'success' });
    } else {
      setFolders(previousFolders);
      setNotes(previousNotes);
      setSelectedNote(previousSelected);
      setLinkableNotes(previousLinkableNotes);
      setAttachments(previousAttachments);
      setActiveFolder(previousActiveFolder);
      setError(result.error || 'Nao foi possivel mover a pasta.');
    }
  };

  const handleMoveNote = async (noteId: string, folderId: string | null) => {
    setError('');
    const targetFolder = folderId ? folderById.get(folderId) : null;
    if (folderId && !targetFolder) {
      setError('Pasta destino nao encontrada.');
      return;
    }

    const note =
      notes.find((item) => item.id === noteId) ||
      (selectedNote?.id === noteId ? selectedNote : null);
    if (!note) return;

    const nextFolderId = targetFolder?.id || null;
    if ((note.folderId || null) === nextFolderId) return;

    const previousNotes = notes;
    const previousSelected = selectedNote;
    const previousLinkableNotes = linkableNotes;
    const previousFolders = folders;
    const previousUnfiledCount = unfiledCount;
    const nextFolderPath = targetFolder?.path || null;
    const nextPatch = {
      folderId: nextFolderId,
      folderPath: nextFolderPath,
      folderName: targetFolder?.name || null,
      filePath: buildNoteFilePath(nextFolderPath, note.fileName),
    };

    setNotes((current) =>
      current
        .map((item) => (item.id === noteId ? { ...item, ...nextPatch } : item))
        .filter((item) =>
          item.id !== noteId
            ? true
            : shouldKeepNoteInCurrentList({
                scope,
                activeFolder,
                nextFolderPath,
                nextFavorite: item.isFavorite,
                nextStatus: item.status,
              })
        )
    );
    setLinkableNotes((current) =>
      current.map((item) =>
        item.id === noteId
          ? {
              ...item,
              folderId: nextPatch.folderId,
              folderPath: nextPatch.folderPath,
              filePath: nextPatch.filePath,
            }
          : item
      )
    );
    setSelectedNote((current) =>
      current?.id === noteId ? { ...current, ...nextPatch } : current
    );
    if (selectedNote?.id === noteId) {
      setDraft((current) => ({
        ...current,
        folderId: nextPatch.folderId,
        folderPath: nextPatch.folderPath,
        folderName: nextPatch.folderName,
      }));
    }
    setFolders((current) =>
      current.map((folder) => {
        if (folder.id === (note.folderId || null)) {
          return { ...folder, count: Math.max(0, folder.count - 1) };
        }
        if (folder.id === nextFolderId) {
          return { ...folder, count: folder.count + 1 };
        }
        return folder;
      })
    );
    if (!note.folderId && nextFolderId) {
      setUnfiledCount((count) => Math.max(0, count - 1));
    } else if (note.folderId && !nextFolderId) {
      setUnfiledCount((count) => count + 1);
    }

    const result = await moveNoteToFolder(noteId, folderId);
    if (result.success && result.data) {
      const detail = (result.data as { note: NoteDetail }).note;
      if (selectedNoteRef.current?.id === noteId) {
        setSelectedNote((current) =>
          current?.id === noteId
            ? { ...detail, content: current.content }
            : current
        );
      }
      mergeSavedNote({
        ...detail,
        content:
          selectedNoteRef.current?.id === noteId
            ? draftRef.current.content
            : detail.content,
      });
    } else {
      setNotes(previousNotes);
      setSelectedNote(previousSelected);
      setLinkableNotes(previousLinkableNotes);
      setFolders(previousFolders);
      setUnfiledCount(previousUnfiledCount);
      setError(result.error || 'Nao foi possivel mover a nota.');
    }
  };

  const handleToggleNoteFavorite = async (note: NoteListItem) => {
    setError('');
    const previousNotes = notes;
    const previousSelected = selectedNote;
    const previousFavoriteCount = favoriteCount;
    const nextFavorite = !note.isFavorite;

    setNotes((current) =>
      current
        .map((item) =>
          item.id === note.id ? { ...item, isFavorite: nextFavorite } : item
        )
        .filter((item) =>
          item.id !== note.id
            ? true
            : shouldKeepNoteInCurrentList({
                scope,
                activeFolder,
                nextFolderPath: item.folderPath || null,
                nextFavorite,
                nextStatus: item.status,
              })
        )
    );
    setSelectedNote((current) =>
      current?.id === note.id
        ? { ...current, isFavorite: nextFavorite }
        : current
    );
    setFavoriteCount((count) => Math.max(0, count + (nextFavorite ? 1 : -1)));

    const result = await toggleFavorite(note.id);
    if (result.success && result.data) {
      const actualFavorite = result.data.isFavorite;
      if (actualFavorite !== nextFavorite) {
        setFavoriteCount((count) =>
          Math.max(0, count + (actualFavorite ? 1 : -1))
        );
        setNotes((current) =>
          current.map((item) =>
            item.id === note.id ? { ...item, isFavorite: actualFavorite } : item
          )
        );
        setSelectedNote((current) =>
          current?.id === note.id
            ? { ...current, isFavorite: actualFavorite }
            : current
        );
      }
    } else {
      setNotes(previousNotes);
      setSelectedNote(previousSelected);
      setFavoriteCount(previousFavoriteCount);
      setError(result.error || 'Nao foi possivel favoritar a nota.');
    }
  };

  const handleMoveNoteToTrash = async (note: NoteListItem) => {
    if (note.status === 'ARCHIVED') return;
    setError('');
    const previousNotes = notes;
    const previousSelected = selectedNote;
    const previousDraft = draft;
    const previousTotalCount = totalCount;
    const previousFavoriteCount = favoriteCount;
    const previousTrashCount = trashCount;
    const previousUnfiledCount = unfiledCount;
    const previousFolders = folders;

    setNotes((current) => current.filter((item) => item.id !== note.id));
    if (selectedNote?.id === note.id) {
      setSelectedNote(null);
      setDraft(emptyDraft());
    }
    setTotalCount((count) => Math.max(0, count - 1));
    if (note.isFavorite) {
      setFavoriteCount((count) => Math.max(0, count - 1));
    }
    setTrashCount((count) => count + 1);
    if (!note.folderId) {
      setUnfiledCount((count) => Math.max(0, count - 1));
    } else {
      setFolders((current) =>
        current.map((folder) =>
          folder.id === note.folderId
            ? { ...folder, count: Math.max(0, folder.count - 1) }
            : folder
        )
      );
    }

    const result = await moveNoteToTrash(note.id);
    if (!result.success) {
      setNotes(previousNotes);
      setSelectedNote(previousSelected);
      setDraft(previousDraft);
      setTotalCount(previousTotalCount);
      setFavoriteCount(previousFavoriteCount);
      setTrashCount(previousTrashCount);
      setUnfiledCount(previousUnfiledCount);
      setFolders(previousFolders);
      setError(result.error || 'Nao foi possivel mover para a lixeira.');
    }
  };

  const getTrashPayload = (rows: TrashRow[]) => ({
    noteIds: rows
      .filter(
        (row): row is Extract<TrashRow, { type: 'note' }> => row.type === 'note'
      )
      .map((row) => row.id),
    folderIds: rows
      .filter(
        (row): row is Extract<TrashRow, { type: 'folder' }> =>
          row.type === 'folder'
      )
      .map((row) => row.id),
  });

  const getAffectedTrashRows = (rows: TrashRow[]) => {
    const selectedFolderPaths = rows
      .filter(
        (row): row is Extract<TrashRow, { type: 'folder' }> =>
          row.type === 'folder'
      )
      .map((row) => row.folder.path);
    return trashRows.filter((row) => {
      if (rows.some((selected) => selected.key === row.key)) return true;
      if (selectedFolderPaths.length === 0) return false;
      const path =
        row.type === 'folder' ? row.folder.path : row.note.folderPath || null;
      return selectedFolderPaths.some(
        (folderPath) =>
          path === folderPath || Boolean(path?.startsWith(`${folderPath}/`))
      );
    });
  };

  const removeTrashRowsOptimistically = (
    rows: TrashRow[],
    restored: boolean
  ) => {
    const affected = getAffectedTrashRows(rows);
    const affectedKeys = new Set(affected.map((row) => row.key));
    const affectedNoteIds = new Set(
      affected
        .filter(
          (row): row is Extract<TrashRow, { type: 'note' }> =>
            row.type === 'note'
        )
        .map((row) => row.id)
    );
    const affectedFolderIds = new Set(
      affected
        .filter(
          (row): row is Extract<TrashRow, { type: 'folder' }> =>
            row.type === 'folder'
        )
        .map((row) => row.id)
    );

    setNotes((current) =>
      current.filter((note) => !affectedNoteIds.has(note.id))
    );
    setTrashedFolders((current) =>
      current.filter((folder) => !affectedFolderIds.has(folder.id))
    );
    setTrashSelection((current) => {
      const next = new Set(current);
      affectedKeys.forEach((key) => next.delete(key));
      return next;
    });
    setTrashCount((count) => Math.max(0, count - affected.length));
    if (restored) {
      const restoredNotes = affected.filter(
        (row) => row.type === 'note'
      ).length;
      setTotalCount((count) => count + restoredNotes);
    }
  };

  const handleTrashRowSelection = (
    row: TrashRow,
    index: number,
    event: ReactMouseEvent<HTMLInputElement>
  ) => {
    event.stopPropagation();
    setTrashSelection((current) => {
      const next = new Set(current);
      if (event.shiftKey && lastTrashSelectionIndex !== null) {
        const start = Math.min(lastTrashSelectionIndex, index);
        const end = Math.max(lastTrashSelectionIndex, index);
        trashRows.slice(start, end + 1).forEach((item) => next.add(item.key));
      } else if (next.has(row.key)) {
        next.delete(row.key);
      } else {
        next.add(row.key);
      }
      return next;
    });
    setLastTrashSelectionIndex(index);
  };

  const restoreTrashRows = async (rows: TrashRow[]) => {
    if (!rows.length) return;
    const previousNotes = notes;
    const previousTrashedFolders = trashedFolders;
    const previousTrashCount = trashCount;
    const previousTotalCount = totalCount;
    const previousSelection = trashSelection;
    removeTrashRowsOptimistically(rows, true);
    const result = await restoreTrashItems(getTrashPayload(rows));
    if (result.success) {
      setNoteFeedback({ message: 'Itens restaurados', tone: 'success' });
    } else {
      setNotes(previousNotes);
      setTrashedFolders(previousTrashedFolders);
      setTrashCount(previousTrashCount);
      setTotalCount(previousTotalCount);
      setTrashSelection(previousSelection);
      setError(result.error || 'Nao foi possivel restaurar os itens.');
    }
  };

  const permanentlyDeleteTrashRows = async (rows: TrashRow[]) => {
    if (!rows.length) return;
    const previousNotes = notes;
    const previousTrashedFolders = trashedFolders;
    const previousTrashCount = trashCount;
    const previousSelection = trashSelection;
    removeTrashRowsOptimistically(rows, false);
    const result = await deleteTrashItemsPermanently(getTrashPayload(rows));
    if (result.success) {
      setNoteFeedback({
        message: 'Itens excluidos permanentemente',
        tone: 'success',
      });
    } else {
      setNotes(previousNotes);
      setTrashedFolders(previousTrashedFolders);
      setTrashCount(previousTrashCount);
      setTrashSelection(previousSelection);
      setError(result.error || 'Nao foi possivel excluir os itens.');
    }
  };

  const confirmRestoreSelectedTrash = () => {
    void restoreTrashRows(selectedTrashRows);
  };

  const confirmDeleteSelectedTrash = () => {
    const affected = getAffectedTrashRows(selectedTrashRows);
    runConfirmed({
      title: 'Excluir permanentemente?',
      description: `${affected.length} item(ns) serão excluídos permanentemente. Esta ação não poderá ser desfeita.`,
      confirmLabel: 'Excluir permanentemente',
      pendingLabel: 'Excluindo...',
      tone: 'danger',
      onConfirm: async () => permanentlyDeleteTrashRows(selectedTrashRows),
    });
  };

  const confirmRestoreAllTrash = () => {
    const previousNotes = notes;
    const previousTrashedFolders = trashedFolders;
    const previousTrashCount = trashCount;
    const previousTotalCount = totalCount;
    const previousSelection = trashSelection;
    const rows = trashRows;
    setNoteFeedback({ message: 'Restaurando lixeira...', tone: 'info' });
    removeTrashRowsOptimistically(rows, true);
    setNotes([]);
    setTrashedFolders([]);
    setTrashCount(0);
    void restoreAllTrash().then((result) => {
      if (result.success) {
        setTotalCount(
          previousTotalCount +
            ((result.data as { notes?: number } | undefined)?.notes || 0)
        );
        setNoteFeedback({ message: 'Lixeira restaurada', tone: 'success' });
      } else {
        setNotes(previousNotes);
        setTrashedFolders(previousTrashedFolders);
        setTrashCount(previousTrashCount);
        setTotalCount(previousTotalCount);
        setTrashSelection(previousSelection);
        setError(result.error || 'Nao foi possivel restaurar a lixeira.');
      }
    });
  };

  const confirmEmptyTrash = () => {
    runConfirmed({
      title: 'Esvaziar lixeira?',
      description: `${trashRows.length} item(ns) serão excluídos permanentemente. Esta ação não poderá ser desfeita.`,
      confirmLabel: 'Esvaziar lixeira',
      pendingLabel: 'Esvaziando...',
      tone: 'danger',
      onConfirm: async () => {
        const previousNotes = notes;
        const previousTrashedFolders = trashedFolders;
        const previousTrashCount = trashCount;
        const previousSelection = trashSelection;
        setNoteFeedback({ message: 'Esvaziando lixeira...', tone: 'info' });
        removeTrashRowsOptimistically(trashRows, false);
        setNotes([]);
        setTrashedFolders([]);
        setTrashCount(0);
        const result = await emptyTrash();
        if (result.success) {
          setNoteFeedback({ message: 'Lixeira esvaziada', tone: 'success' });
        } else {
          setNotes(previousNotes);
          setTrashedFolders(previousTrashedFolders);
          setTrashCount(previousTrashCount);
          setTrashSelection(previousSelection);
          setError(result.error || 'Nao foi possivel esvaziar a lixeira.');
        }
      },
    });
  };

  const startNoteRename = (note: NoteListItem) => {
    renameCommitRef.current = false;
    setError('');
    setRenamingNoteId(note.id);
    setRenamingTitle(note.title);
  };

  const cancelNoteRename = () => {
    renameCommitRef.current = false;
    setRenamingNoteId(null);
    setRenamingTitle('');
  };

  const saveNoteRename = async (note: NoteListItem) => {
    if (renameCommitRef.current) return;
    const title = renamingTitle.trim();
    if (!title) {
      setError('Informe um titulo.');
      window.requestAnimationFrame(() => renameInputRef.current?.focus());
      return;
    }
    if (title === note.title) {
      cancelNoteRename();
      return;
    }

    renameCommitRef.current = true;
    setError('');
    const result = await renameNote(note.id, title);
    if (result.success && result.data) {
      const detail = (result.data as { note: NoteDetail }).note;
      const content =
        selectedNoteRef.current?.id === detail.id
          ? draftRef.current.content
          : detail.content;
      mergeSavedNote({ ...detail, content });
      if (selectedNoteRef.current?.id === detail.id) {
        setSelectedNote((current) =>
          current?.id === detail.id ? { ...detail, content } : current
        );
        setDraft((current) => ({
          ...current,
          title: detail.title,
          slug: detail.slug,
          folderId: detail.folderId || null,
          folderPath: detail.folderPath || null,
          folderName: detail.folderName || null,
        }));
      }
      cancelNoteRename();
    } else {
      renameCommitRef.current = false;
      setError(result.error || 'Nao foi possivel renomear a nota.');
      window.requestAnimationFrame(() => renameInputRef.current?.focus());
    }
  };

  const copyNotePath = async (note: NoteListItem) => {
    const path = getUsefulNotePath(note);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard');
      await navigator.clipboard.writeText(path);
      setNoteFeedback({ message: 'Caminho copiado', tone: 'success' });
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = path;
        textarea.setAttribute('readonly', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!copied) throw new Error('copy');
        setNoteFeedback({ message: 'Caminho copiado', tone: 'success' });
      } catch {
        setNoteFeedback({
          message: 'Nao foi possivel copiar',
          tone: 'error',
        });
      }
    }
  };

  const reorderFolder = async (folder: FolderNode, direction: -1 | 1) => {
    const siblings = folders
      .filter((item) => item.parentId === folder.parentId)
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));
    const index = siblings.findIndex((item) => item.id === folder.id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) return;
    const next = [...siblings];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    const result = await reorderNoteFolders(next.map((item) => item.id));
    if (result.success) await load();
    else setError(result.error || 'Nao foi possivel reordenar pastas.');
  };

  const reorderNote = async (note: NoteListItem, direction: -1 | 1) => {
    const siblings = filteredNotes.filter(
      (item) => (item.folderId || null) === (note.folderId || null)
    );
    const index = siblings.findIndex((item) => item.id === note.id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= siblings.length) return;
    const next = [...siblings];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    const result = await reorderNotes(next.map((item) => item.id));
    if (result.success) await load();
    else setError(result.error || 'Nao foi possivel reordenar notas.');
  };

  const openHistoryEntry = async (
    entry: NoteHistoryEntry,
    historyIndex: number
  ) => {
    if (selectedNote?.id === entry.id) {
      setNavigationHistory((current) => current.slice(0, historyIndex + 1));
      return;
    }

    if (selectedNote && autoSave.hasPendingChanges()) {
      setWikilinkBlocked(true);
      const saved = await autoSave.triggerSave();
      if (!saved) return;
    }

    let detail = noteHistoryCacheRef.current.get(entry.id) || null;
    if (!detail) {
      const result = await getNote(entry.id);
      if (!result.success || !result.data) {
        setError(result.error || 'Nao foi possivel abrir nota.');
        return;
      }
      detail = result.data.note as NoteDetail;
    }

    historyNavigationTargetRef.current = detail.id;
    setNavigationHistory((current) => current.slice(0, historyIndex + 1));
    setSelectedNote(detail);
    setDraft(noteToDraft(detail));
  };

  const openPreviousNote = async () => {
    if (navigationHistory.length < 2) return;
    const previousIndex = navigationHistory.length - 2;
    await openHistoryEntry(navigationHistory[previousIndex], previousIndex);
  };

  const openNote = async (note: NoteListItem) => {
    if (
      selectedNote &&
      selectedNote.id !== note.id &&
      autoSave.hasPendingChanges()
    ) {
      setWikilinkBlocked(true);
      const saved = await autoSave.triggerSave();
      if (!saved) return;
    }
    const result = await getNote(note.id, { incrementView: true });
    if (!result.success || !result.data) {
      setError(result.error || 'Nao foi possivel abrir nota.');
      return;
    }
    const detail = result.data.note as NoteDetail;
    setSelectedNote(detail);
    setDraft(noteToDraft(detail));
  };

  function startNewNote() {
    setSelectedNote(null);
    setDraft(emptyDraft());
    setQuickCaptureOpen(true);
  }

  const saveNote = async (options: { closeModal?: boolean } = {}) => {
    setSaving(true);
    const result = selectedNote
      ? await updateNote(selectedNote.id, draft)
      : await createNote(draft);
    if (result.success) {
      const payload = result as { success: true; data: { note: NoteDetail } };
      const detail = payload.data.note;
      setSelectedNote(detail);
      setDraft(noteToDraft(detail));
      if (options.closeModal) setQuickCaptureOpen(false);
      await load();
    } else {
      const payload = result as { success: false; error: string };
      setError(payload.error || 'Nao foi possivel salvar.');
    }
    setSaving(false);
  };

  const openWikiLink = async (idOrSlug: string, anchor?: string) => {
    const note = notes.find(
      (item) => item.id === idOrSlug || item.slug === idOrSlug
    );
    if (note) {
      if (anchor) {
        setPendingWikiAnchor({ noteId: note.id, anchor });
      }
      await openNote(note);
      return;
    }
    if (selectedNote && autoSave.hasPendingChanges()) {
      const saved = await autoSave.triggerSave();
      if (!saved) return;
    }
    const result = await getNote(idOrSlug, { incrementView: true });
    if (result.success && result.data) {
      const detail = result.data.note as NoteDetail;
      if (anchor) {
        setPendingWikiAnchor({ noteId: detail.id, anchor });
      }
      setSelectedNote(detail);
      setDraft(noteToDraft(detail));
    }
  };

  const importZip = async (file: File | null) => {
    setImportSummary(null);
    setError('');

    if (!file) {
      setSelectedZip(null);
      return;
    }

    setSelectedZip(file);

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Selecione um arquivo com extensao .zip.');
      return;
    }

    if (!ZIP_MIME_TYPES.has(file.type)) {
      setError('O arquivo selecionado nao parece ser um ZIP valido.');
      return;
    }

    if (file.size > MAX_VAULT_ZIP_SIZE) {
      setError(
        `O ZIP excede o limite de ${formatFileSize(MAX_VAULT_ZIP_SIZE)}.`
      );
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);

    try {
      const response = await fetch('/api/notes/import-vault', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Nao foi possivel importar o vault.');
        return;
      }

      setImportSummary(result.data as ImportSummary);
      await load();
    } catch {
      setError('Nao foi possivel enviar o ZIP. Tente novamente.');
    } finally {
      setImporting(false);
    }
  };

  const handleEditorPaste = async (
    event: ReactClipboardEvent<HTMLTextAreaElement>
  ) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) =>
      item.type.startsWith('image/')
    );
    if (!imageItem) return;

    const file = imageItem.getAsFile();
    if (!file) return;

    event.preventDefault();
    const textarea = event.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const extension = extensionFromMime(file.type);
    const fileName = `Pasted image ${formatObsidianTimestamp()}.${extension}`;

    setPasteUploading(true);
    setNoteFeedback({ message: 'Enviando imagem...', tone: 'info' });

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const result = await createNoteAttachment({
        fileName,
        dataUrl,
        mimeType: file.type,
        size: file.size,
        folderPath: null,
      });

      if (!result.success || !result.data) {
        setNoteFeedback({
          message: result.error || 'Nao foi possivel enviar a imagem',
          tone: 'error',
        });
        return;
      }

      const attachment = result.data.attachment as PreviewAttachment;
      const link = `![[${attachment.fileName}]]`;
      setAttachments((current) => {
        const withoutDuplicate = current.filter(
          (item) => item.id !== attachment.id
        );
        return [...withoutDuplicate, attachment];
      });
      setDraft((current) => ({
        ...current,
        content: `${current.content.slice(0, start)}${link}${current.content.slice(end)}`,
      }));
      setWikilinkBlocked(true);
      setNoteFeedback({ message: 'Imagem anexada', tone: 'success' });
      window.requestAnimationFrame(() => {
        textarea.focus();
        const nextCursor = start + link.length;
        textarea.selectionStart = nextCursor;
        textarea.selectionEnd = nextCursor;
        setCursorPos(nextCursor);
      });
    } catch {
      setNoteFeedback({
        message: 'Nao foi possivel ler a imagem da area de transferencia',
        tone: 'error',
      });
    } finally {
      setPasteUploading(false);
    }
  };

  const handleEditorKeyDown = (
    event: ReactKeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (isAutocompleteOpen) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setAutocompleteSelectedIndex((prev) =>
            prev < autocompleteSuggestions.length - 1 ? prev + 1 : 0
          );
          return;
        case 'ArrowUp':
          event.preventDefault();
          setAutocompleteSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : autocompleteSuggestions.length - 1
          );
          return;
        case 'Enter':
        case 'Tab':
          event.preventDefault();
          handleAutocompleteSelect(autocompleteSelectedIndex);
          return;
        case 'Escape':
          event.preventDefault();
          setWikilinkBlocked(true);
          return;
      }
    }

    const textarea = event.currentTarget;
    const wrapSelection = (before: string, after = before) => {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = draft.content.slice(start, end);
      const nextContent = `${draft.content.slice(0, start)}${before}${selected}${after}${draft.content.slice(end)}`;
      event.preventDefault();
      setDraft((current) => ({ ...current, content: nextContent }));
      window.requestAnimationFrame(() => {
        textarea.selectionStart = start + before.length;
        textarea.selectionEnd = end + before.length;
      });
    };

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b')
      wrapSelection('**');
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'i')
      wrapSelection('*');
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')
      wrapSelection('[', '](url)');
    if (event.key === 'Escape' && !isAutocompleteOpen) textarea.blur();
  };

  const navItems = [
    {
      id: 'all',
      label: 'Todas as Notas',
      icon: Inbox,
      count: totalCount || notes.length,
    },
    {
      id: 'favorites',
      label: 'Favoritas',
      icon: Star,
      count: favoriteCount,
    },
    { id: 'recent', label: 'Recentes', icon: Clock3, count: notes.length },
    { id: 'tags', label: 'Tags', icon: Hash, count: tags.length },
    {
      id: 'projects',
      label: 'Projetos',
      icon: LayoutPanelTop,
      count: projects.length,
    },
    {
      id: 'trash',
      label: 'Lixeira',
      icon: Archive,
      count: trashCount,
    },
  ] as const;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#2f2f35] bg-[#1e1e22] text-[#dcddde]">
      <CommandPalette
        open={paletteOpen}
        notes={notes}
        onClose={() => setPaletteOpen(false)}
        onNewNote={startNewNote}
        onOpenNote={(note) => void openNote(note)}
        onOpenGraph={() => setMode('graph')}
        onCreateTask={async (title) => {
          await createTask({
            title,
            status: 'pending',
            priority: 'medium',
            tags: ['capture'],
          });
          await load();
        }}
      />
      <NoteContextMenu
        state={noteContextMenu}
        note={contextMenuNote}
        folderTree={folderTree}
        onClose={() => setNoteContextMenu(null)}
        onRename={startNoteRename}
        onToggleFavorite={(note) => void handleToggleNoteFavorite(note)}
        onMoveToFolder={(note, folder) =>
          void handleMoveNote(note.id, folder?.id || null)
        }
        onCopyPath={(note) => void copyNotePath(note)}
        onMoveToTrash={(note) => void handleMoveNoteToTrash(note)}
      />
      <FolderContextMenu
        state={folderContextMenu}
        folder={folderContextTarget}
        folderTree={folderTree}
        onClose={() => setFolderContextMenu(null)}
        onCreateNote={(folder) => void handleCreateNoteInFolder(folder)}
        onCreateFolder={(parentId) => startCreateFolder(parentId)}
        onRename={(folder) => {
          setEditingFolderId(folder.id);
          setEditingFolderName(folder.name);
          setFolderContextMenu(null);
        }}
        onMoveFolder={(folderId, parentId) =>
          void handleMoveFolder(folderId, parentId)
        }
        onCopyPath={(folder) =>
          void copyNotePath({
            id: folder.id,
            title: folder.name,
            slug: folder.path,
            content: '',
            excerpt: null,
            visibility: 'PRIVATE',
            status: 'DRAFT',
            isFavorite: false,
            viewCount: 0,
            filePath: folder.path,
            folderPath: folder.path,
            folderName: folder.name,
            folderId: folder.id,
            projectId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            project: null,
            tags: [],
          })
        }
        onMoveToTrash={(folder) => void handleDeleteFolder(folder)}
      />
      <ConfirmDialog
        state={confirmState}
        pending={confirmPending}
        onCancel={() => !confirmPending && setConfirmState(null)}
      />
      <div
        aria-live="polite"
        className={`fixed right-4 bottom-4 z-50 rounded-md border px-3 py-2 text-xs shadow-xl transition-opacity ${
          noteFeedback ? 'opacity-100' : 'pointer-events-none opacity-0'
        } ${
          noteFeedback?.tone === 'error'
            ? 'border-red-500/30 bg-red-500/10 text-red-200'
            : 'border-[#3b365a] bg-[#242133] text-[#d7ccff]'
        }`}
      >
        {noteFeedback?.message}
      </div>

      {quickCaptureOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => setQuickCaptureOpen(false)}
        >
          <div
            className="mx-auto mt-20 max-w-3xl rounded-lg border border-[#33333a] bg-[#202024] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#303036] px-4 py-3">
              <span className="flex items-center gap-2 font-medium text-[#f2f2f3]">
                <Sparkles className="h-4 w-4 text-[#9a8cff]" />
                Quick Capture
              </span>
              <button
                type="button"
                onClick={() => void saveNote({ closeModal: true })}
                disabled={saving || !draft.title?.trim()}
                className="rounded-md bg-[#6f55d9] px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
            <input
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  title: event.target.value,
                  slug: current.slug || slugifyNote(event.target.value),
                }))
              }
              placeholder="Titulo da nota"
              className="w-full border-b border-[#303036] bg-transparent px-5 py-4 text-xl text-[#f2f2f3] outline-none placeholder:text-[#777780]"
            />
            <textarea
              value={draft.content}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  content: event.target.value,
                }))
              }
              onKeyDown={handleEditorKeyDown}
              onPaste={handleEditorPaste}
              placeholder="Capture ideias, decisões, links [[wiki]] ou tarefas - [ ] ..."
              className="h-80 w-full resize-none bg-transparent px-5 py-4 font-mono text-sm leading-6 outline-none placeholder:text-[#777780]"
            />
          </div>
        </div>
      )}

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <aside
          className={`${leftCollapsed ? 'w-12' : 'w-64'} flex h-full min-h-0 shrink-0 flex-col border-r border-[#2f2f35] bg-[#19191d] transition-all`}
        >
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#2f2f35] px-3">
            {!leftCollapsed && (
              <span className="text-sm font-semibold text-[#f2f2f3]">
                Knowledge Vault
              </span>
            )}
            <div className="flex items-center gap-1">
              {!leftCollapsed && notesListCollapsed && (
                <button
                  type="button"
                  onClick={() => setNotesListCollapsed(false)}
                  className="rounded p-1.5 text-[#8f8f98] hover:bg-[#2a2a30] hover:text-white"
                  aria-label="Expandir lista de notas"
                >
                  <PanelRightClose className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setLeftCollapsed((value) => !value)}
                className="rounded p-2 text-[#8f8f98] hover:bg-[#2a2a30] hover:text-white"
                aria-label="Alternar sidebar"
              >
                {leftCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
          {!leftCollapsed && (
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
              <button
                type="button"
                onClick={startNewNote}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#6f55d9] text-sm font-medium text-white hover:bg-[#7c66df]"
              >
                <Plus className="h-4 w-4" />
                Nova Nota
              </button>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setScope(item.id);
                        if (item.id === 'all') setActiveFolder(undefined);
                        if (item.id !== 'tags') setActiveTag('');
                        if (item.id !== 'projects') setActiveProject('');
                      }}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-sm ${scope === item.id && (item.id !== 'all' || activeFolder === undefined) ? 'bg-[#2d2940] text-[#c9b8ff]' : 'text-[#b8b8bf] hover:bg-[#24242a] hover:text-white'}`}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </span>
                      <span className="text-xs text-[#777780]">
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </nav>
              <div
                className={`space-y-1 rounded ${dropFolderId === 'root' ? 'bg-[#24243a] ring-1 ring-[#8f7cff]' : ''}`}
                onDragOver={(event) => {
                  if (
                    event.dataTransfer.types.includes('application/x-folder-id')
                  ) {
                    event.preventDefault();
                    setDropFolderId('root');
                  }
                }}
                onDragLeave={() => setDropFolderId(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  const folderId = event.dataTransfer.getData(
                    'application/x-folder-id'
                  );
                  setDropFolderId(null);
                  if (folderId) void handleMoveFolder(folderId, null);
                }}
              >
                <div
                  className="flex items-center justify-between px-2 text-[11px] font-medium tracking-normal text-[#777780] uppercase"
                  onContextMenu={(event) => {
                    event.preventDefault();
                    openFolderContextMenu(
                      menuFolderId === 'root' ? null : 'root',
                      event
                    );
                  }}
                >
                  <span>Pastas</span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startCreateFolder(null)}
                      className="grid h-6 w-6 place-items-center rounded text-[#9b9ba3] hover:bg-[#24242a] hover:text-white"
                      aria-label="Criar pasta na raiz"
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) =>
                        openFolderContextMenu(
                          menuFolderId === 'root' ? null : 'root',
                          event
                        )
                      }
                      className="grid h-6 w-6 place-items-center rounded text-[#9b9ba3] hover:bg-[#24242a] hover:text-white"
                      aria-label="Acoes da raiz"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
                {folderFormParentId !== undefined && (
                  <div className="space-y-1 rounded-md border border-[#303036] bg-[#202024] p-2">
                    <div className="text-[11px] text-[#777780]">
                      {folderFormParentId
                        ? `Nova pasta em ${folderById.get(folderFormParentId)?.name || 'pasta'}`
                        : 'Nova pasta na raiz'}
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        value={folderName}
                        onChange={(event) => setFolderName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') void saveFolder();
                          if (event.key === 'Escape')
                            setFolderFormParentId(undefined);
                        }}
                        autoFocus
                        className="h-8 min-w-0 flex-1 rounded border border-[#3a3a42] bg-[#151518] px-2 text-xs text-[#f2f2f3] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => void saveFolder()}
                        disabled={folderSaving}
                        className="grid h-8 w-8 place-items-center rounded text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50"
                        aria-label="Criar pasta"
                      >
                        {folderSaving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFolderFormParentId(undefined)}
                        className="grid h-8 w-8 place-items-center rounded text-[#9b9ba3] hover:bg-[#2a2a30]"
                        aria-label="Cancelar criacao"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setScope('all');
                    setActiveFolder(undefined);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-xs ${activeFolder === undefined ? 'bg-[#2d2940] text-[#c9b8ff]' : 'text-[#9b9ba3] hover:bg-[#24242a] hover:text-white'}`}
                >
                  <span className="flex items-center gap-2">
                    <Inbox className="h-3.5 w-3.5" />
                    Todas as Notas
                  </span>
                  <span className="text-[11px] text-[#777780]">
                    {totalCount || notes.length}
                  </span>
                </button>
                <div>
                  <div
                    onDragOver={(event) => {
                      if (
                        event.dataTransfer.types.includes(
                          'application/x-note-id'
                        )
                      ) {
                        event.preventDefault();
                        setDropFolderId('unfiled');
                      }
                    }}
                    onDragLeave={() => setDropFolderId(null)}
                    onDrop={(event) => {
                      event.preventDefault();
                      const noteId = event.dataTransfer.getData(
                        'application/x-note-id'
                      );
                      setDropFolderId(null);
                      if (noteId) void handleMoveNote(noteId, null);
                    }}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      openFolderContextMenu(
                        menuFolderId === 'unfiled' ? null : 'unfiled',
                        event
                      );
                    }}
                    className={`group flex items-center rounded-md text-xs ${dropFolderId === 'unfiled' ? 'bg-[#34245f] text-[#d7ccff] ring-1 ring-[#8f7cff]' : activeFolder === null ? 'bg-[#2d2940] text-[#c9b8ff]' : 'text-[#9b9ba3] hover:bg-[#24242a] hover:text-white'}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setScope('all');
                        setActiveFolder(null);
                      }}
                      className="flex min-w-0 flex-1 items-center justify-between px-2 py-1.5 text-left"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" />
                        Sem Pasta
                      </span>
                      <span className="text-[11px] text-[#777780]">
                        {unfiledCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(event) =>
                        openFolderContextMenu(
                          menuFolderId === 'unfiled' ? null : 'unfiled',
                          event
                        )
                      }
                      className="mr-1 grid h-6 w-6 shrink-0 place-items-center rounded text-[#777780] opacity-0 group-hover:opacity-100 hover:bg-[#24242a] hover:text-white focus:opacity-100"
                      aria-label="Acoes de Sem Pasta"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <FolderTree
                  nodes={folderTree}
                  activeFolder={activeFolder}
                  expanded={expandedFolders}
                  menuFolderId={menuFolderId}
                  editingFolderId={editingFolderId}
                  editingName={editingFolderName}
                  dropFolderId={dropFolderId}
                  onToggle={(path) => {
                    setExpandedFolders((current) => {
                      const next = new Set(current);
                      if (next.has(path)) next.delete(path);
                      else next.add(path);
                      return next;
                    });
                  }}
                  onSelect={(folder) => {
                    setScope('all');
                    setActiveFolder(folder.path);
                    setExpandedFolders(
                      (current) =>
                        new Set([
                          ...current,
                          ...folder.path
                            .split('/')
                            .map((_, index, parts) =>
                              parts.slice(0, index + 1).join('/')
                            ),
                        ])
                    );
                  }}
                  onMenu={openFolderContextMenu}
                  onStartCreate={(parentId) => startCreateFolder(parentId)}
                  onStartRename={(folder) => {
                    setEditingFolderId(folder.id);
                    setEditingFolderName(folder.name);
                    setFolderContextMenu(null);
                  }}
                  onEditingNameChange={setEditingFolderName}
                  onSaveRename={(folder) => void saveFolderRename(folder)}
                  onCancelRename={() => setEditingFolderId(null)}
                  onDelete={(folder) => void handleDeleteFolder(folder)}
                  onMoveFolder={(folderId, parentId) =>
                    void handleMoveFolder(folderId, parentId)
                  }
                  onMoveNote={(noteId, folderId) =>
                    void handleMoveNote(noteId, folderId)
                  }
                  onReorder={(folder, direction) =>
                    void reorderFolder(folder, direction)
                  }
                  onDropState={setDropFolderId}
                  onCreateNote={(folder) =>
                    void handleCreateNoteInFolder(folder)
                  }
                />
              </div>
              {scope === 'tags' && (
                <div className="space-y-1">
                  {tags.map((tag) => (
                    <button
                      key={tag.slug}
                      type="button"
                      onClick={() => setActiveTag(tag.slug)}
                      className={`flex w-full justify-between rounded px-2 py-1.5 text-xs ${activeTag === tag.slug ? 'bg-[#2d2940] text-[#c9b8ff]' : 'text-[#9b9ba3] hover:bg-[#24242a]'}`}
                    >
                      <span>#{tag.name}</span>
                      <span>{tag.count}</span>
                    </button>
                  ))}
                </div>
              )}
              {scope === 'projects' && (
                <div className="space-y-1">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => setActiveProject(project.id)}
                      className={`block w-full truncate rounded px-2 py-1.5 text-left text-xs ${activeProject === project.id ? 'bg-[#2d2940] text-[#c9b8ff]' : 'text-[#9b9ba3] hover:bg-[#24242a]'}`}
                    >
                      {project.title}
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-2 rounded-md border border-[#303036] p-2">
                <label
                  className={`flex items-center gap-2 rounded-md px-2 py-2 text-xs ${importing ? 'cursor-not-allowed text-[#777780]' : 'cursor-pointer text-[#9b9ba3] hover:bg-[#24242a] hover:text-white'}`}
                >
                  {importing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileArchive className="h-4 w-4" />
                  )}
                  {importing ? 'Importando...' : 'Importar Vault ZIP'}
                  <input
                    type="file"
                    accept=".zip,application/zip,application/x-zip-compressed"
                    className="sr-only"
                    disabled={importing}
                    onChange={(event) =>
                      void importZip(event.target.files?.[0] || null)
                    }
                  />
                </label>
                {selectedZip && (
                  <div className="space-y-0.5 px-2 text-[11px] text-[#8f8f98]">
                    <div className="truncate text-[#c9c9d1]">
                      {selectedZip.name}
                    </div>
                    <div>
                      {formatFileSize(selectedZip.size)} / limite{' '}
                      {formatFileSize(MAX_VAULT_ZIP_SIZE)}
                    </div>
                  </div>
                )}
                {importSummary && (
                  <div className="space-y-0.5 rounded bg-emerald-500/10 px-2 py-1.5 text-[11px] text-emerald-200">
                    <div>{importSummary.imported} notas importadas</div>
                    <div>{importSummary.updated} notas atualizadas</div>
                    <div>
                      {importSummary.imagesImported || 0} imagens importadas
                    </div>
                    <div>
                      {importSummary.otherAttachmentsImported || 0} outros
                      anexos
                    </div>
                    <div>
                      {importSummary.attachmentsCreated || 0} anexos criados
                    </div>
                    <div>
                      {importSummary.attachmentsUpdated || 0} anexos atualizados
                    </div>
                    <div>{importSummary.ignored} arquivos ignorados</div>
                    <div>
                      {importSummary.attachmentsIgnored || 0} anexos ignorados
                    </div>
                    <div>{importSummary.folders} pastas detectadas</div>
                    {Boolean(importSummary.partialErrors?.length) && (
                      <div className="pt-1 text-amber-100">
                        {importSummary.partialErrors!.slice(0, 2).join(' ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>

        {notesListCollapsed && (
          <div className="flex shrink-0 justify-center border-r border-[#2f2f35] bg-[#202024] px-1 py-2">
            <button
              type="button"
              onClick={() => setNotesListCollapsed(false)}
              className="grid h-8 w-8 place-items-center rounded text-[#8f8f98] hover:bg-[#2a2a30] hover:text-white"
              aria-label="Expandir lista de notas"
              title="Expandir lista de notas"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        )}

        <section
          className={`${notesListCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-80'} flex min-h-0 max-w-full min-w-0 shrink-0 overflow-hidden border-r border-[#2f2f35] bg-[#202024] transition-[width] duration-200`}
        >
          <div className="flex h-full min-h-0 w-full max-w-full min-w-0 flex-col overflow-hidden">
            <div className="min-w-0 shrink-0 border-b border-[#2f2f35] p-3">
              <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
                <h2 className="min-w-0 truncate text-sm font-semibold text-[#f2f2f3]">
                  Notas
                </h2>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setNotesListCollapsed((v) => !v)}
                    className="rounded p-1.5 text-[#8f8f98] hover:bg-[#2a2a30] hover:text-white"
                    aria-label="Recolher lista"
                    title="Recolher lista"
                  >
                    <PanelRightClose className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaletteOpen(true)}
                    className="rounded p-1.5 text-[#8f8f98] hover:bg-[#2a2a30]"
                    aria-label="Command palette"
                  >
                    <Command className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="relative max-w-full min-w-0 overflow-hidden">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#777780]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar"
                  className="box-border h-10 w-full max-w-full min-w-0 rounded-md border border-[#303036] bg-[#19191d] pr-3 pl-9 text-sm outline-none placeholder:text-[#777780] focus:border-[#6f55d9]"
                />
              </div>
              {scope === 'trash' && (
                <div className="mt-3 space-y-2 rounded-md border border-[#303036] bg-[#19191d] p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setTrashSelection(
                          new Set(trashRows.map((row) => row.key))
                        )
                      }
                      disabled={trashRows.length === 0}
                      className="inline-flex h-8 items-center gap-1.5 rounded border border-[#34343c] px-2 text-xs text-[#c9c9d1] hover:bg-[#2a2a30] disabled:opacity-50"
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      Selecionar todos
                    </button>
                    {trashSelection.size > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setTrashSelection(new Set());
                          setLastTrashSelectionIndex(null);
                        }}
                        className="h-8 rounded border border-[#34343c] px-2 text-xs text-[#c9c9d1] hover:bg-[#2a2a30]"
                      >
                        Limpar seleção
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={confirmRestoreAllTrash}
                      disabled={trashRows.length === 0}
                      className="inline-flex h-8 items-center gap-1.5 rounded border border-emerald-500/30 px-2 text-xs text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restaurar tudo
                    </button>
                    <button
                      type="button"
                      onClick={confirmEmptyTrash}
                      disabled={trashRows.length === 0}
                      className="inline-flex h-8 items-center gap-1.5 rounded border border-red-500/30 px-2 text-xs text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Esvaziar lixeira
                    </button>
                  </div>
                  {selectedTrashRows.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-[#303036] pt-2 text-xs text-[#b8b8bf]">
                      <span>{selectedTrashRows.length} selecionado(s)</span>
                      <button
                        type="button"
                        onClick={confirmRestoreSelectedTrash}
                        className="inline-flex h-8 items-center gap-1.5 rounded bg-emerald-500/10 px-2 text-emerald-200 hover:bg-emerald-500/15"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Restaurar selecionados
                      </button>
                      <button
                        type="button"
                        onClick={confirmDeleteSelectedTrash}
                        className="inline-flex h-8 items-center gap-1.5 rounded bg-red-500/10 px-2 text-red-200 hover:bg-red-500/15"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir permanentemente
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
              {loading && (
                <div className="flex items-center gap-2 p-4 text-sm text-[#8f8f98]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando
                </div>
              )}
              {!loading &&
                scope === 'trash' &&
                trashRows.map((row, index) => {
                  const checked = trashSelection.has(row.key);
                  const isFolder = row.type === 'folder';
                  const title = isFolder ? row.folder.name : row.note.title;
                  const path = isFolder ? row.folder.path : row.note.folderPath;
                  const updatedAt = isFolder
                    ? row.folder.trashedAt || row.folder.deletedAt
                    : row.note.updatedAt;

                  return (
                    <div
                      key={row.key}
                      className={`group min-w-0 overflow-hidden border-b border-[#2a2a30] hover:bg-[#282830] ${
                        checked ? 'bg-[#2d2940]' : ''
                      }`}
                    >
                      <div className="flex min-w-0 items-start gap-2 p-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onClick={(event) =>
                            handleTrashRowSelection(row, index, event)
                          }
                          onChange={() => undefined}
                          className="mt-1 h-4 w-4 accent-[#7c5cff]"
                          aria-label={`Selecionar ${title}`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            row.type === 'note'
                              ? void openNote(row.note)
                              : undefined
                          }
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex min-w-0 items-start gap-2">
                            {isFolder ? (
                              <Folder className="mt-0.5 h-4 w-4 shrink-0 text-[#9a8cff]" />
                            ) : (
                              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#8f8f98]" />
                            )}
                            <div className="min-w-0 flex-1">
                              <h3 className="line-clamp-1 text-sm font-medium text-[#f2f2f3]">
                                {title}
                              </h3>
                              {path && (
                                <div className="mt-1 truncate text-[11px] text-[#777780]">
                                  {path}
                                </div>
                              )}
                              <div className="mt-2 text-[11px] text-[#777780]">
                                {updatedAt
                                  ? formatDate(updatedAt)
                                  : 'Na lixeira'}
                              </div>
                            </div>
                          </div>
                        </button>
                        <div className="flex shrink-0 items-center gap-1 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => void restoreTrashRows([row])}
                            className="grid h-7 w-7 place-items-center rounded text-emerald-200 hover:bg-emerald-500/10"
                            aria-label="Restaurar"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              runConfirmed({
                                title: 'Excluir permanentemente?',
                                description:
                                  'Este item será excluído permanentemente. Esta ação não poderá ser desfeita.',
                                confirmLabel: 'Excluir',
                                pendingLabel: 'Excluindo...',
                                tone: 'danger',
                                onConfirm: async () =>
                                  permanentlyDeleteTrashRows([row]),
                              })
                            }
                            className="grid h-7 w-7 place-items-center rounded text-red-200 hover:bg-red-500/10"
                            aria-label="Excluir permanentemente"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              {!loading &&
                scope !== 'trash' &&
                filteredNotes.map((note) => (
                  <div
                    key={note.id}
                    draggable={renamingNoteId !== note.id}
                    onContextMenu={(event) => openNoteContextMenu(event, note)}
                    onDragStart={(event) => {
                      if (renamingNoteId === note.id) {
                        event.preventDefault();
                        return;
                      }
                      event.dataTransfer.setData(
                        'application/x-note-id',
                        note.id
                      );
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    className={`group min-w-0 overflow-hidden border-b border-[#2a2a30] hover:bg-[#282830] ${
                      selectedNote?.id === note.id ||
                      noteContextMenu?.noteId === note.id
                        ? 'bg-[#2d2940]'
                        : ''
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-1 p-3">
                      {renamingNoteId === note.id ? (
                        <div className="min-w-0 flex-1 text-left">
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <input
                              ref={renameInputRef}
                              value={renamingTitle}
                              onChange={(event) =>
                                setRenamingTitle(event.target.value)
                              }
                              onClick={(event) => event.stopPropagation()}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  void saveNoteRename(note);
                                }
                                if (event.key === 'Escape') {
                                  event.preventDefault();
                                  cancelNoteRename();
                                }
                              }}
                              onBlur={() => void saveNoteRename(note)}
                              aria-label="Renomear nota"
                              className="h-7 min-w-0 flex-1 rounded border border-[#6f55d9]/60 bg-[#17171b] px-2 text-sm font-medium text-[#f2f2f3] ring-1 ring-[#6f55d9]/20 outline-none"
                            />
                            {note.isFavorite && (
                              <Star className="mt-1.5 h-3.5 w-3.5 shrink-0 fill-[#d6a94a] text-[#d6a94a]" />
                            )}
                          </div>
                          {note.folderPath && (
                            <div className="mt-1 truncate text-[11px] text-[#777780]">
                              {note.folderPath}
                            </div>
                          )}
                          <p className="mt-1 line-clamp-2 text-xs text-[#8f8f98]">
                            {note.excerpt || 'Sem resumo'}
                          </p>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-[#777780]">
                            <span>{formatDate(note.updatedAt)}</span>
                            <span>{note._count?.incoming || 0} backlinks</span>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void openNote(note)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <h3 className="line-clamp-1 min-w-0 text-sm font-medium text-[#f2f2f3]">
                              {note.title}
                            </h3>
                            {note.isFavorite && (
                              <Star className="h-3.5 w-3.5 shrink-0 fill-[#d6a94a] text-[#d6a94a]" />
                            )}
                          </div>
                          {note.folderPath && (
                            <div className="mt-1 truncate text-[11px] text-[#777780]">
                              {note.folderPath}
                            </div>
                          )}
                          <p className="mt-1 line-clamp-2 text-xs text-[#8f8f98]">
                            {note.excerpt || 'Sem resumo'}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {note.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag.slug}
                                className="rounded bg-[#292936] px-1.5 py-0.5 text-[11px] text-[#b8a9ff]"
                              >
                                #{tag.name}
                              </span>
                            ))}
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-[#777780]">
                            <span>{formatDate(note.updatedAt)}</span>
                            <span>{note._count?.incoming || 0} backlinks</span>
                          </div>
                        </button>
                      )}
                      <div className="flex shrink-0 flex-col opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => void reorderNote(note, -1)}
                          className="grid h-6 w-6 place-items-center rounded text-[#777780] hover:bg-[#33333a] hover:text-white"
                          aria-label="Mover nota para cima"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void reorderNote(note, 1)}
                          className="grid h-6 w-6 place-items-center rounded text-[#777780] hover:bg-[#33333a] hover:text-white"
                          aria-label="Mover nota para baixo"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              {!loading &&
                (scope === 'trash'
                  ? trashRows.length === 0
                  : filteredNotes.length === 0) && (
                  <div className="p-6 text-center text-sm text-[#8f8f98]">
                    {scope === 'trash'
                      ? 'A lixeira está vazia.'
                      : 'Nenhuma nota encontrada.'}
                  </div>
                )}
            </div>
          </div>
        </section>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#1e1e22]">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#2f2f35] px-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              <button
                type="button"
                onClick={() => void openPreviousNote()}
                disabled={navigationHistory.length < 2}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded px-2 text-xs text-[#9b9ba3] hover:bg-[#2a2a30] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Voltar para a nota anterior"
                title="Voltar para a nota anterior"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">Voltar</span>
              </button>
              {selectedNote ? (
                <nav
                  className="flex min-w-0 items-center gap-1 overflow-hidden text-xs"
                  aria-label="Historico recente de notas"
                >
                  {navigationHistory.map((entry, index) => {
                    const isCurrent =
                      index === navigationHistory.length - 1 &&
                      entry.id === selectedNote.id;
                    return (
                      <div
                        key={`${entry.id}-${index}`}
                        className="flex min-w-0 items-center gap-1"
                      >
                        {index > 0 && (
                          <ChevronRight className="h-3 w-3 shrink-0 text-[#55555d]" />
                        )}
                        <button
                          type="button"
                          onClick={() => void openHistoryEntry(entry, index)}
                          className={`max-w-28 truncate rounded px-1.5 py-1 text-left hover:bg-[#2a2a30] xl:max-w-40 ${
                            isCurrent
                              ? 'font-medium text-[#f2f2f3]'
                              : 'text-[#8f8f98] hover:text-white'
                          }`}
                          title={entry.title}
                          aria-current={isCurrent ? 'page' : undefined}
                        >
                          {entry.title}
                        </button>
                      </div>
                    );
                  })}
                </nav>
              ) : (
                <>
                  <FileText className="h-4 w-4 shrink-0 text-[#8f8f98]" />
                  <span className="truncate text-sm text-[#f2f2f3]">
                    Nenhuma nota selecionada
                  </span>
                </>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {notesListCollapsed && (
                <button
                  type="button"
                  onClick={() => setNotesListCollapsed(false)}
                  className="rounded p-1.5 text-[#8f8f98] hover:bg-[#2a2a30]"
                  aria-label="Expandir lista"
                  title="Expandir lista"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              )}
              {selectedNote && autoSaveStatus !== 'idle' && (
                <span
                  className={`hidden items-center gap-1 rounded px-2 py-1 text-[11px] md:inline-flex ${
                    autoSaveStatus === 'saved'
                      ? 'text-emerald-300'
                      : autoSaveStatus === 'saving'
                        ? 'text-amber-300'
                        : autoSaveStatus === 'error'
                          ? 'text-red-300'
                          : 'text-[#8f8f98]'
                  }`}
                >
                  {autoSaveStatus === 'saved' && <span>Salvo</span>}
                  {autoSaveStatus === 'saving' && (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> Salvando
                    </>
                  )}
                  {autoSaveStatus === 'error' && <span>Erro ao salvar</span>}
                  {autoSaveStatus === 'editing' && <span>Editando...</span>}
                </span>
              )}
              {pasteUploading && (
                <span className="hidden items-center gap-1 rounded px-2 py-1 text-[11px] text-[#8f8f98] md:inline-flex">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Enviando imagem...
                </span>
              )}
              {(['edit', 'preview', 'split', 'graph'] as WorkspaceMode[]).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMode(item)}
                    className={`rounded px-3 py-1.5 text-xs capitalize ${mode === item ? 'bg-[#34245f] text-[#d7ccff]' : 'text-[#9b9ba3] hover:bg-[#2a2a30]'}`}
                  >
                    {item}
                  </button>
                )
              )}
              {selectedNote && (
                <button
                  type="button"
                  onClick={() => void handleToggleNoteFavorite(selectedNote)}
                  className="rounded p-2 text-[#9b9ba3] hover:bg-[#2a2a30]"
                  aria-label="Favoritar"
                >
                  <Star
                    className={`h-4 w-4 ${selectedNote.isFavorite ? 'fill-[#d6a94a] text-[#d6a94a]' : ''}`}
                  />
                </button>
              )}
              <button
                type="button"
                onClick={() => setRightCollapsed((value) => !value)}
                className="rounded p-2 text-[#9b9ba3] hover:bg-[#2a2a30]"
                aria-label="Alternar backlinks"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>

          {error && (
            <div className="shrink-0 border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
              {!selectedNote && mode !== 'graph' && (
                <div className="flex h-full flex-col items-center justify-center text-center text-[#8f8f98]">
                  <Edit3 className="mb-3 h-10 w-10" />
                  <p className="text-[#dcddde]">
                    Abra uma nota ou use Ctrl+B para capturar uma ideia.
                  </p>
                  <p className="mt-1 text-sm">Ctrl+K abre a command palette.</p>
                </div>
              )}

              {mode === 'graph' && (
                <GraphView
                  notes={notes}
                  onOpenNote={(note) => void openNote(note)}
                />
              )}

              {selectedNote && mode !== 'graph' && (
                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                  <div className="grid shrink-0 gap-0 border-b border-[#2f2f35] p-3 lg:grid-cols-[1fr_180px_150px_150px]">
                    <input
                      value={draft.title}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          title: event.target.value,
                          slug: current.slug || slugifyNote(event.target.value),
                        }))
                      }
                      className="h-10 bg-transparent px-3 text-xl font-semibold text-[#f2f2f3] outline-none"
                    />
                    <select
                      value={draft.projectId || ''}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          projectId: event.target.value || null,
                        }))
                      }
                      className="h-10 rounded border border-[#303036] bg-[#19191d] px-2 text-xs outline-none"
                    >
                      <option value="">Sem projeto</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.title}
                        </option>
                      ))}
                    </select>
                    <select
                      value={draft.status}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          status: event.target.value as NoteStatus,
                        }))
                      }
                      className="h-10 rounded border border-[#303036] bg-[#19191d] px-2 text-xs outline-none"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => void saveNote()}
                      disabled={saving}
                      className="ml-2 h-10 rounded bg-[#6f55d9] px-3 text-sm text-white disabled:opacity-50"
                    >
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>

                  <div className="relative flex min-h-0 flex-1 overflow-hidden">
                    {(mode === 'edit' || mode === 'split') && (
                      <textarea
                        ref={textareaRef}
                        value={draft.content}
                        onChange={(event) => {
                          setDraft((current) => ({
                            ...current,
                            content: event.target.value,
                          }));
                          setCursorPos(event.target.selectionStart);
                          setWikilinkBlocked(false);
                        }}
                        onSelect={(event) => {
                          setCursorPos(event.currentTarget.selectionStart);
                        }}
                        onClick={(event) => {
                          setCursorPos(event.currentTarget.selectionStart);
                        }}
                        onKeyUp={(event) => {
                          setCursorPos(event.currentTarget.selectionStart);
                        }}
                        onKeyDown={handleEditorKeyDown}
                        onPaste={handleEditorPaste}
                        className={`${mode === 'split' ? 'w-1/2 border-r border-[#2f2f35]' : 'w-full'} h-full min-h-0 resize-none overflow-y-auto bg-[#1e1e22] px-8 py-7 font-mono text-sm leading-6 text-[#dcddde] outline-none placeholder:text-[#777780]`}
                        placeholder="# Titulo&#10;&#10;[[Wiki Link]]&#10;- [ ] Task sincronizada"
                      />
                    )}
                    {isAutocompleteOpen && (
                      <WikiLinkAutocomplete
                        suggestions={autocompleteSuggestions}
                        selectedIndex={autocompleteSelectedIndex}
                        position={autocompletePosition}
                        title={
                          wikilinkParse?.mode === 'heading'
                            ? 'Headings da nota'
                            : wikilinkParse?.mode === 'block'
                              ? 'Block references'
                              : 'Notas sugeridas'
                        }
                        onSelect={(index) => {
                          handleAutocompleteSelect(index);
                        }}
                        onMouseEnter={(index) => {
                          setAutocompleteSelectedIndex(index);
                        }}
                      />
                    )}
                    {(mode === 'preview' || mode === 'split') && (
                      <div
                        className={`${mode === 'split' ? 'w-1/2' : 'w-full'} h-full min-h-0 min-w-0 overflow-x-hidden overflow-y-auto`}
                      >
                        <MarkdownPreview
                          content={draft.content || ''}
                          notes={linkableNotes}
                          currentNote={selectedNote}
                          attachments={attachments}
                          onOpenWikiLink={openWikiLink}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {!rightCollapsed && selectedNote && mode !== 'graph' && (
              <aside className="flex h-full min-h-0 w-80 shrink-0 flex-col overflow-hidden border-l border-[#2f2f35] bg-[#19191d]">
                <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
                  <div className="border-b border-[#2f2f35] p-4">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#f2f2f3]">
                      <Link2 className="h-4 w-4 text-[#9a8cff]" />
                      Linked Mentions
                    </h3>
                    <div className="space-y-2">
                      {selectedNote.incoming.length === 0 && (
                        <p className="text-xs text-[#777780]">Sem backlinks.</p>
                      )}
                      {selectedNote.incoming.map(
                        (link) =>
                          link.sourceNote && (
                            <button
                              key={link.id}
                              type="button"
                              onClick={() =>
                                void openWikiLink(link.sourceNote!.slug)
                              }
                              className="block w-full rounded border border-[#303036] bg-[#202024] p-2 text-left text-xs text-[#dcddde] hover:bg-[#2a2a30]"
                            >
                              {link.sourceNote.title}
                            </button>
                          )
                      )}
                    </div>
                  </div>
                  <div className="border-b border-[#2f2f35] p-4">
                    <h3 className="mb-2 text-sm font-semibold text-[#f2f2f3]">
                      Outgoing Links
                    </h3>
                    <div className="space-y-2">
                      {selectedNote.outgoing.length === 0 && (
                        <p className="text-xs text-[#777780]">Sem links.</p>
                      )}
                      {selectedNote.outgoing.map((link) => {
                        const label =
                          'alias' in link && typeof link.alias === 'string'
                            ? link.alias
                            : link.targetTitle;
                        return (
                          <button
                            key={link.id}
                            type="button"
                            onClick={() =>
                              link.targetExists &&
                              void openWikiLink(
                                link.targetNote?.id || link.targetSlug
                              )
                            }
                            disabled={!link.targetExists}
                            className="flex w-full items-center justify-between rounded border border-[#303036] bg-[#202024] p-2 text-left text-xs hover:bg-[#2a2a30]"
                          >
                            <span>{label}</span>
                            <span
                              className={
                                link.targetExists
                                  ? 'text-emerald-300'
                                  : 'text-amber-300'
                              }
                            >
                              {link.targetExists ? 'linked' : 'unresolved'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="border-b border-[#2f2f35] p-4">
                    <h3 className="mb-2 text-sm font-semibold text-[#f2f2f3]">
                      Tasks da Nota
                    </h3>
                    <div className="space-y-2">
                      {(selectedNote.tasks || []).length === 0 && (
                        <p className="text-xs text-[#777780]">
                          Use - [ ] no Markdown para sincronizar tasks.
                        </p>
                      )}
                      {(selectedNote.tasks || []).map((task) => (
                        <div
                          key={task.id}
                          className="rounded border border-[#303036] bg-[#202024] p-2 text-xs"
                        >
                          <span
                            className={
                              task.status === 'completed'
                                ? 'text-[#777780] line-through'
                                : 'text-[#dcddde]'
                            }
                          >
                            {task.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4">
                    <button
                      type="button"
                      onClick={() =>
                        selectedNote && void handleMoveNoteToTrash(selectedNote)
                      }
                      className="flex w-full items-center justify-center gap-2 rounded border border-red-500/30 py-2 text-sm text-red-200 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                      Mover para a lixeira
                    </button>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
