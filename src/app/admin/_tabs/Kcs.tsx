'use client';

import type { NoteStatus } from '@prisma/client';
import {
  Download,
  FilePlus2,
  Folder,
  FolderPlus,
  Library,
  Loader2,
  Paperclip,
  Pencil,
  Save,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  createKcsAttachment,
  createKcsFolder,
  createKcsNote,
  deleteKcsFolder,
  deleteKcsNote,
  getKcsWorkspace,
  renameKcsFolder,
  updateKcsNote,
} from '@/app/actions/kcs';
import type { OrganizationContext } from '@/lib/organizations/context';
import type { KnowledgeCapabilities } from '@/types/knowledge';
import {
  KnowledgeNoteEditor,
  type KnowledgeEditorMode,
} from './Notes/KnowledgeNoteEditor';
import { NoteComments } from './Notes/NoteComments';

type OrganizationSummary = OrganizationContext['organizations'][number];

type KcsFolder = {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  position: number;
};

type KcsNote = {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: NoteStatus;
  folderId: string | null;
  folderPath: string | null;
  filePath: string | null;
  updatedAt: Date;
  tags: Array<{ id: string; name: string; slug: string }>;
};

type KcsAttachment = {
  id: string;
  fileName: string;
  filePath: string;
  folderPath: string | null;
  mimeType: string | null;
  dataUrl: string | null;
};

type KcsWorkspace = {
  organization: { id: string; name: string };
  folders: KcsFolder[];
  notes: KcsNote[];
  attachments: KcsAttachment[];
  role: OrganizationSummary['role'];
  capabilities: KnowledgeCapabilities;
};

const inputClass =
  'h-10 w-full rounded-md border border-[#303036] bg-[#111] px-3 text-sm text-white outline-none placeholder:text-[#666670] focus:border-[#6f55d9]';

export default function Kcs({
  organization,
  userId,
}: {
  organization: OrganizationSummary | null;
  userId: string;
}) {
  const organizationId = organization?.id || null;
  const [workspace, setWorkspace] = useState<KcsWorkspace | null>(null);
  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(Boolean(organizationId));
  const [busy, setBusy] = useState<string | null>(null);
  const [mode, setMode] = useState<KnowledgeEditorMode>('preview');
  const [draft, setDraft] = useState({
    title: '',
    content: '',
    status: 'DRAFT' as NoteStatus,
    tags: '',
  });
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const vaultInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!organizationId) {
      setWorkspace(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await getKcsWorkspace(organizationId, {
      search: search || undefined,
      folderId,
    });
    if (result.success) {
      setWorkspace(result.data as KcsWorkspace);
      setSelectedId((current) =>
        current && result.data.notes.some((note) => note.id === current)
          ? current
          : result.data.notes[0]?.id || null
      );
    } else toast.error(result.error);
    setLoading(false);
  }, [folderId, organizationId, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => workspace?.notes.find((note) => note.id === selectedId) || null,
    [selectedId, workspace]
  );
  const canManageKcs = Boolean(workspace?.capabilities.canManageKcsContent);

  useEffect(() => {
    if (!selected) {
      setDraft({ title: '', content: '', status: 'DRAFT', tags: '' });
      return;
    }
    setDraft({
      title: selected.title,
      content: selected.content,
      status: selected.status,
      tags: selected.tags.map((tag) => tag.name).join(', '),
    });
  }, [selected]);

  const run = async (
    key: string,
    action: () => Promise<{ success: boolean; error?: string }>,
    message: string
  ) => {
    setBusy(key);
    const result = await action();
    if (result.success) {
      toast.success(message);
      await load();
    } else toast.error(result.error || 'Não foi possível concluir a operação.');
    setBusy(null);
    return result.success;
  };

  if (!organization) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#3a3a43] p-8 text-center">
        <Library className="mb-3 h-8 w-8 text-[#9a8cff]" />
        <h1 className="text-lg font-semibold text-white">
          Selecione uma organização
        </h1>
        <p className="mt-1 text-sm text-[#777780]">
          O KCS é privado e sempre validado contra a organização ativa.
        </p>
      </div>
    );
  }

  if (loading && !workspace) {
    return (
      <div className="flex flex-1 items-center justify-center text-[#9b9ba3]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando KCS...
      </div>
    );
  }

  const save = () => {
    if (!selectedId || !organizationId || !canManageKcs) return;
    void run(
      'save',
      () =>
        updateKcsNote(organizationId, selectedId, {
          title: draft.title,
          content: draft.content,
          status: draft.status,
          tags: draft.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      'Nota KCS salva.'
    );
  };

  const handleAttachment = async (file: File) => {
    if (!organizationId || !canManageKcs) return;
    setBusy('attachment');
    try {
      const dataUrl = await readDataUrl(file);
      const result = await createKcsAttachment(organizationId, {
        fileName: file.name,
        dataUrl,
        mimeType: file.type,
        size: file.size,
        folderId: selected?.folderId || folderId || null,
      });
      if (!result.success) {
        toast.error(result.error);
      } else {
        setWorkspace((current) =>
          current
            ? {
                ...current,
                attachments: [
                  ...current.attachments,
                  result.data as KcsAttachment,
                ],
              }
            : current
        );
        setDraft((current) => ({
          ...current,
          content: `${current.content}${current.content ? '\n\n' : ''}![[${result.data.fileName}]]`,
        }));
        toast.success('Anexo inserido. Salve a nota para persistir o link.');
      }
    } catch (error) {
      console.error('Failed to read KCS attachment:', error);
      toast.error('Não foi possível ler o anexo.');
    } finally {
      setBusy(null);
      if (attachmentInputRef.current) attachmentInputRef.current.value = '';
    }
  };

  const exportVault = async () => {
    if (!organizationId) return;
    setBusy('export');
    try {
      const response = await fetch(
        `/api/notes/export-vault?organizationId=${encodeURIComponent(organizationId)}`
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || 'Não foi possível exportar o KCS.');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = encodedName
        ? decodeURIComponent(encodedName)
        : plainName || `KCS-${organization.name}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success('KCS exportado.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível exportar o KCS.'
      );
    } finally {
      setBusy(null);
    }
  };

  const importVault = async (file: File) => {
    if (!organizationId) return;
    if (
      !file.name.toLowerCase().endsWith('.zip') ||
      file.size > 50 * 1024 * 1024
    ) {
      toast.error('Selecione um ZIP de até 50 MB.');
      return;
    }
    setBusy('import');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('organizationId', organizationId);
      const response = await fetch('/api/notes/import-vault', {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json()) as {
        success: boolean;
        error?: string;
        data?: { imported: number; updated: number; ignored: number };
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Não foi possível importar o Vault.');
      }
      toast.success(
        `${payload.data?.imported || 0} nota(s) importada(s), ${payload.data?.updated || 0} atualizada(s).`
      );
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível importar o KCS.'
      );
    } finally {
      setBusy(null);
      if (vaultInputRef.current) vaultInputRef.current.value = '';
    }
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
      <header className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wider text-[#9a8cff] uppercase">
            KCS • {organization.name}
          </p>
          <h1 className="text-xl font-semibold text-white">
            Base de conhecimento
          </h1>
        </div>
        <div className="flex w-full flex-col gap-2 sm:max-w-xl">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(searchDraft.trim());
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute top-3 left-3 h-4 w-4 text-[#777780]" />
              <input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Buscar no KCS"
                className={`${inputClass} pl-9`}
              />
            </div>
            <button className="rounded-md border border-[#303036] px-3 text-xs text-[#c9b8ff]">
              Buscar
            </button>
          </form>
          <div className="flex justify-end gap-2">
            <input
              ref={vaultInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importVault(file);
              }}
            />
            {canManageKcs && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => vaultInputRef.current?.click()}
                className="flex h-8 items-center gap-1.5 rounded-md border border-[#303036] px-2.5 text-xs text-[#b9b9c1] disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" /> Importar Vault
              </button>
            )}
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void exportVault()}
              className="flex h-8 items-center gap-1.5 rounded-md border border-[#303036] px-2.5 text-xs text-[#b9b9c1] disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" /> Exportar
            </button>
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto lg:grid-cols-[220px_280px_minmax(0,1fr)] lg:overflow-hidden">
        <aside className="min-h-48 rounded-xl border border-[#303036] bg-[#1b1b1f] p-3 lg:overflow-y-auto">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wide text-[#9b9ba3] uppercase">
              Pastas
            </h2>
            {canManageKcs && (
              <button
                type="button"
                onClick={() => {
                  const name = window.prompt('Nome da nova pasta');
                  if (name && organizationId)
                    void run(
                      'folder-create',
                      () =>
                        createKcsFolder(organizationId, {
                          name,
                          parentId: folderId || null,
                        }),
                      'Pasta criada.'
                    );
                }}
                className="rounded p-1.5 text-[#c9b8ff] hover:bg-[#292936]"
                aria-label="Criar pasta"
              >
                <FolderPlus className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFolderId(undefined)}
            className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm ${folderId === undefined ? 'bg-[#29263a] text-white' : 'text-[#b9b9c1] hover:bg-[#24242a]'}`}
          >
            <Library className="h-4 w-4" /> Todas as notas
          </button>
          <button
            type="button"
            onClick={() => setFolderId('')}
            className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm ${folderId === '' ? 'bg-[#29263a] text-white' : 'text-[#b9b9c1] hover:bg-[#24242a]'}`}
          >
            <Folder className="h-4 w-4" /> Raiz
          </button>
          {workspace?.folders.map((folder) => (
            <div
              key={folder.id}
              className="group flex items-center"
              style={{
                paddingLeft: `${Math.max(0, folder.path.split('/').length - 1) * 10}px`,
              }}
            >
              <button
                type="button"
                onClick={() => setFolderId(folder.id)}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-2 text-left text-sm ${folderId === folder.id ? 'bg-[#29263a] text-white' : 'text-[#b9b9c1] hover:bg-[#24242a]'}`}
              >
                <Folder className="h-4 w-4 shrink-0" />
                <span className="truncate">{folder.name}</span>
              </button>
              {canManageKcs && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const name = window.prompt('Novo nome', folder.name);
                      if (name && organizationId)
                        void run(
                          `folder-rename-${folder.id}`,
                          () =>
                            renameKcsFolder(organizationId, folder.id, name),
                          'Pasta renomeada.'
                        );
                    }}
                    className="hidden rounded p-1 text-[#777780] group-hover:block"
                    aria-label="Renomear pasta"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        organizationId &&
                        window.confirm(
                          `Excluir a pasta ${folder.name}? As notas irão para a raiz.`
                        )
                      )
                        void run(
                          `folder-delete-${folder.id}`,
                          () => deleteKcsFolder(organizationId, folder.id),
                          'Pasta excluída.'
                        );
                    }}
                    className="hidden rounded p-1 text-red-300 group-hover:block"
                    aria-label="Excluir pasta"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          ))}
        </aside>

        <aside className="min-h-56 rounded-xl border border-[#303036] bg-[#1b1b1f] lg:overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#303036] bg-[#1b1b1f] p-3">
            <h2 className="text-xs font-semibold tracking-wide text-[#9b9ba3] uppercase">
              Notas ({workspace?.notes.length || 0})
            </h2>
            {canManageKcs && (
              <button
                type="button"
                onClick={() =>
                  organizationId &&
                  void run(
                    'note-create',
                    async () => {
                      const result = await createKcsNote(organizationId, {
                        title: 'Nova nota',
                        content: '# Nova nota\n',
                        folderId: folderId || null,
                      });
                      if (result.success) setSelectedId(result.data.id);
                      return result;
                    },
                    'Nota criada.'
                  )
                }
                className="rounded p-1.5 text-[#c9b8ff] hover:bg-[#292936]"
                aria-label="Criar nota"
              >
                <FilePlus2 className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="divide-y divide-[#2f2f35]">
            {workspace?.notes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => setSelectedId(note.id)}
                className={`w-full p-3 text-left ${selectedId === note.id ? 'bg-[#29263a]' : 'hover:bg-[#222228]'}`}
              >
                <p className="truncate text-sm font-medium text-white">
                  {note.title}
                </p>
                <p className="mt-1 truncate text-xs text-[#777780]">
                  {note.folderPath || 'Raiz'} ·{' '}
                  {new Date(note.updatedAt).toLocaleDateString('pt-BR')}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {note.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded bg-[#24242a] px-1.5 py-0.5 text-[10px] text-[#9b9ba3]"
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
          {!workspace?.notes.length && (
            <p className="p-6 text-center text-sm text-[#777780]">
              Nenhuma nota neste filtro.
            </p>
          )}
        </aside>

        <main className="min-h-[560px] min-w-0 overflow-y-auto rounded-xl border border-[#303036] bg-[#1b1b1f] lg:min-h-0">
          {selected ? (
            <>
              <div className="h-[min(680px,calc(100vh-13rem))] min-h-[500px]">
                <KnowledgeNoteEditor
                  scope={{
                    type: 'organization',
                    organizationId: organization.id,
                    role: workspace?.role || organization.role,
                  }}
                  title={draft.title}
                  content={draft.content}
                  status={draft.status}
                  tags={draft.tags}
                  mode={mode}
                  readOnly={!canManageKcs}
                  notes={(workspace?.notes || []).map((note) => ({
                    id: note.id,
                    title: note.title,
                    slug: note.slug,
                    content: note.content,
                    filePath: note.filePath,
                    folderId: note.folderId,
                    folderPath: note.folderPath,
                  }))}
                  currentNote={{
                    id: selected.id,
                    title: draft.title,
                    slug: selected.slug,
                    filePath: selected.filePath,
                    folderId: selected.folderId,
                    folderPath: selected.folderPath,
                  }}
                  attachments={workspace?.attachments || []}
                  actionsSlot={
                    canManageKcs ? (
                      <>
                        <input
                          ref={attachmentInputRef}
                          type="file"
                          className="hidden"
                          accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,audio/*,video/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void handleAttachment(file);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => attachmentInputRef.current?.click()}
                          disabled={busy !== null}
                          className="flex h-9 items-center gap-1 rounded-md border border-[#303036] px-2 text-xs text-[#b9b9c1] disabled:opacity-50"
                        >
                          <Paperclip className="h-3.5 w-3.5" /> Anexo
                        </button>
                        <button
                          type="button"
                          onClick={save}
                          disabled={busy !== null || !draft.title.trim()}
                          className="flex h-9 items-center gap-1 rounded-md bg-[#6f55d9] px-3 text-xs text-white disabled:opacity-50"
                        >
                          {busy === 'save' ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}{' '}
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              organizationId &&
                              window.confirm('Excluir esta nota KCS?')
                            )
                              void run(
                                'note-delete',
                                () =>
                                  deleteKcsNote(organizationId, selected.id),
                                'Nota excluída.'
                              );
                          }}
                          className="h-9 rounded-md p-2 text-red-300 hover:bg-red-500/10"
                          aria-label="Excluir nota"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : undefined
                  }
                  onTitleChange={(title) =>
                    setDraft((current) => ({ ...current, title }))
                  }
                  onContentChange={(content) =>
                    setDraft((current) => ({ ...current, content }))
                  }
                  onStatusChange={(status) =>
                    setDraft((current) => ({ ...current, status }))
                  }
                  onTagsChange={(tags) =>
                    setDraft((current) => ({ ...current, tags }))
                  }
                  onModeChange={setMode}
                  onOpenWikiLink={(idOrSlug) => {
                    const target = workspace?.notes.find(
                      (note) => note.id === idOrSlug || note.slug === idOrSlug
                    );
                    if (target) setSelectedId(target.id);
                  }}
                  onToggleTask={
                    canManageKcs
                      ? (lineIndex) =>
                          setDraft((current) => ({
                            ...current,
                            content: toggleMarkdownTask(
                              current.content,
                              lineIndex
                            ),
                          }))
                      : undefined
                  }
                />
              </div>
              <NoteComments
                key={selected.id}
                organizationId={organization.id}
                noteId={selected.id}
                userId={userId}
                canModerate={canManageKcs}
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-[#777780]">
              Crie ou selecione uma nota KCS.
            </div>
          )}
        </main>
      </div>
    </section>
  );
}

function readDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function toggleMarkdownTask(content: string, lineIndex: number) {
  const lines = content.split('\n');
  if (lineIndex < 0 || lineIndex >= lines.length) return content;
  lines[lineIndex] = lines[lineIndex].replace(
    /^(\s*[-*+]\s+)\[([ xX])\]/,
    (_match, prefix: string, checked: string) =>
      `${prefix}[${checked.toLowerCase() === 'x' ? ' ' : 'x'}]`
  );
  return lines.join('\n');
}
