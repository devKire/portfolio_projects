'use server';

import type { NoteStatus, Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import type { VaultImportFile } from '@/app/actions/notes';
import { requireUser } from '@/lib/auth/session';
import {
  OrganizationAuthorizationError,
  requireKcsManager,
  requireOrganizationMembership,
} from '@/lib/organizations/authorization';
import {
  organizationCapabilities,
  organizationNoteScope,
} from '@/lib/organizations/policy';
import {
  createExcerpt,
  extractNoteTags,
  getVaultFileMetadata,
  inferNoteTitleFromPath,
  isIgnoredVaultPath,
  isUnsafeVaultPath,
  slugifyNote,
} from '@/lib/notes';
import { extractMarkdownTasks } from '@/lib/note-task-sync';
import { db } from '@/lib/prisma';
import {
  refreshKnowledgeLinkTargets,
  syncKnowledgeRelations,
} from '@/lib/knowledge/relations';

const MAX_ATTACHMENT_SIZE = 8 * 1024 * 1024;
const ATTACHMENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/ogg',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

type KcsScope = {
  organizationId: string;
  scopeKey: string;
};

function scope(organizationId: string): KcsScope {
  return { organizationId, scopeKey: organizationNoteScope(organizationId) };
}

function cleanText(value: string | undefined, max: number) {
  return (value || '').trim().slice(0, max);
}

function revalidateKcs() {
  revalidatePath('/admin');
  revalidatePath('/admin/kcs');
}

function actionError(error: unknown, fallback: string) {
  if (error instanceof OrganizationAuthorizationError) return error.message;
  if (
    typeof error === 'object' &&
    error &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  ) {
    return 'Já existe um item com esse nome neste espaço.';
  }
  console.error(fallback, error);
  return fallback;
}

function folderName(path: string | null) {
  return path?.split('/').filter(Boolean).at(-1) || null;
}

function joinPath(parent: string | null | undefined, name: string) {
  return parent ? `${parent}/${name}` : name;
}

function safeFolderName(value: string) {
  return value
    .trim()
    .replace(/[\\/]+/g, '-')
    .replace(/\0/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 100);
}

function noteFilePath(path: string | null, fileName: string) {
  return path ? `${path}/${fileName}` : fileName;
}

async function uniqueKcsSlug(
  organizationId: string,
  title: string,
  preferred?: string,
  currentId?: string
) {
  const scopeKey = organizationNoteScope(organizationId);
  const base = slugifyNote(preferred || title) || 'nota';
  let slug = base;
  let suffix = 2;
  while (true) {
    const existing = await db.note.findUnique({
      where: { scopeKey_slug: { scopeKey, slug } },
      select: { id: true },
    });
    if (!existing || existing.id === currentId) return slug;
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
}

async function nextFolderPosition(
  organizationId: string,
  parentId: string | null
) {
  const result = await db.noteFolder.aggregate({
    where: { ...scope(organizationId), parentId, deletedAt: null },
    _max: { position: true },
  });
  return (result._max.position ?? -1) + 1;
}

async function nextNotePosition(
  organizationId: string,
  folderId: string | null
) {
  const result = await db.note.aggregate({
    where: { ...scope(organizationId), folderId, status: { not: 'ARCHIVED' } },
    _max: { position: true },
  });
  return (result._max.position ?? -1) + 1;
}

async function ensureKcsFolderPath(
  organizationId: string,
  userId: string,
  pathInput: string | null
) {
  const normalized = (pathInput || '')
    .split('/')
    .map(safeFolderName)
    .filter(Boolean)
    .join('/');
  if (!normalized) return null;

  const scoped = scope(organizationId);
  let parentId: string | null = null;
  let currentPath = '';
  let folder = null as Awaited<
    ReturnType<typeof db.noteFolder.findUnique>
  > | null;
  for (const segment of normalized.split('/')) {
    currentPath = joinPath(currentPath || null, segment);
    folder = await db.noteFolder.findUnique({
      where: {
        scopeKey_path: { scopeKey: scoped.scopeKey, path: currentPath },
      },
    });
    if (!folder) {
      folder = await db.noteFolder.create({
        data: {
          userId,
          ...scoped,
          name: segment,
          path: currentPath,
          parentId,
          position: await nextFolderPosition(organizationId, parentId),
        },
      });
    }
    parentId = folder.id;
  }
  return folder;
}

async function syncKcsRelations(
  organizationId: string,
  noteId: string,
  content: string,
  explicitTags: string[] = []
) {
  await syncKnowledgeRelations(db, {
    scope: scope(organizationId),
    noteId,
    content,
    explicitTags,
  });
}

async function refreshKcsLinkTargets(organizationId: string) {
  await refreshKnowledgeLinkTargets(db, scope(organizationId));
}

async function syncKcsTasks(
  organizationId: string,
  actorId: string,
  noteId: string,
  content: string
) {
  const markdownTasks = extractMarkdownTasks(content);
  const keys = markdownTasks.map((task) => task.key);
  if (markdownTasks.length) {
    await db.$transaction(
      markdownTasks.map((task) =>
        db.task.upsert({
          where: { noteId_noteTaskKey: { noteId, noteTaskKey: task.key } },
          create: {
            userId: actorId,
            organizationId,
            createdById: actorId,
            assigneeId: actorId,
            title: task.title,
            status: task.completed ? 'completed' : 'pending',
            completedAt: task.completed ? new Date() : null,
            priority: 'medium',
            tags: ['kcs'],
            noteId,
            noteTaskKey: task.key,
          },
          update: {
            title: task.title,
            status: task.completed ? 'completed' : 'pending',
            completedAt: task.completed ? new Date() : null,
          },
        })
      )
    );
  }
  await db.task.updateMany({
    where: {
      organizationId,
      noteId,
      noteTaskKey: keys.length ? { notIn: keys } : { not: null },
    },
    data: { noteId: null, noteTaskKey: null },
  });
}

export async function getKcsWorkspace(
  organizationId: string,
  filters: { search?: string; folderId?: string | null } = {}
) {
  try {
    const user = await requireUser();
    const membership = await requireOrganizationMembership(
      user.id,
      organizationId
    );
    const scoped = scope(organizationId);
    const search = cleanText(filters.search, 200);
    const noteWhere: Prisma.NoteWhereInput = {
      ...scoped,
      status: { not: 'ARCHIVED' },
      ...(filters.folderId !== undefined
        ? { folderId: filters.folderId || null }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } },
              {
                tags: {
                  some: { name: { contains: search, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
    };
    const [organization, folders, notes, attachments] = await Promise.all([
      db.organization.findFirst({
        where: { id: organizationId, members: { some: { userId: user.id } } },
        select: { id: true, name: true },
      }),
      db.noteFolder.findMany({
        where: { ...scoped, deletedAt: null },
        orderBy: [{ parentId: 'asc' }, { position: 'asc' }, { name: 'asc' }],
      }),
      db.note.findMany({
        where: noteWhere,
        orderBy: [
          { isFavorite: 'desc' },
          { position: 'asc' },
          { updatedAt: 'desc' },
        ],
        include: {
          tags: { orderBy: { name: 'asc' } },
          outgoing: {
            include: {
              targetNote: { select: { id: true, title: true, slug: true } },
            },
          },
          incoming: {
            include: {
              sourceNote: { select: { id: true, title: true, slug: true } },
            },
          },
          tasks: {
            select: { id: true, title: true, status: true, noteTaskKey: true },
          },
        },
      }),
      db.noteAttachment.findMany({
        where: scoped,
        orderBy: { filePath: 'asc' },
        select: {
          id: true,
          fileName: true,
          filePath: true,
          folderPath: true,
          mimeType: true,
          dataUrl: true,
        },
      }),
    ]);
    if (!organization) throw new OrganizationAuthorizationError();
    return {
      success: true as const,
      data: {
        organization,
        folders,
        notes,
        attachments,
        role: membership.role,
        capabilities: organizationCapabilities(membership.role),
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível carregar o KCS.'),
    };
  }
}

export async function createKcsFolder(
  organizationId: string,
  input: { name: string; parentId?: string | null }
) {
  try {
    const { user } = await requireKcsManager(organizationId);
    const scoped = scope(organizationId);
    const name = safeFolderName(input.name);
    if (name.length < 1 || name === '.' || name === '..') {
      return { success: false as const, error: 'Nome de pasta inválido.' };
    }
    const parent = input.parentId
      ? await db.noteFolder.findFirst({
          where: { id: input.parentId, ...scoped, deletedAt: null },
        })
      : null;
    if (input.parentId && !parent) throw new OrganizationAuthorizationError();
    const path = joinPath(parent?.path, name);
    const folder = await db.noteFolder.create({
      data: {
        userId: user.id,
        ...scoped,
        name,
        path,
        parentId: parent?.id || null,
        position: await nextFolderPosition(organizationId, parent?.id || null),
      },
    });
    revalidateKcs();
    return { success: true as const, data: folder };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível criar a pasta.'),
    };
  }
}

export async function renameKcsFolder(
  organizationId: string,
  folderId: string,
  nameInput: string
) {
  try {
    await requireKcsManager(organizationId);
    const scoped = scope(organizationId);
    const folder = await db.noteFolder.findFirst({
      where: { id: folderId, ...scoped, deletedAt: null },
      include: { parent: { select: { path: true } } },
    });
    if (!folder) throw new OrganizationAuthorizationError();
    const name = safeFolderName(nameInput);
    if (!name)
      return { success: false as const, error: 'Nome de pasta inválido.' };
    const nextPath = joinPath(folder.parent?.path, name);
    const descendants = await db.noteFolder.findMany({
      where: {
        ...scoped,
        OR: [{ id: folder.id }, { path: { startsWith: `${folder.path}/` } }],
      },
    });
    const notes = await db.note.findMany({
      where: {
        ...scoped,
        OR: [
          { folderPath: folder.path },
          { folderPath: { startsWith: `${folder.path}/` } },
        ],
      },
      select: { id: true, folderPath: true, fileName: true },
    });
    const attachments = await db.noteAttachment.findMany({
      where: {
        ...scoped,
        OR: [
          { folderPath: folder.path },
          { folderPath: { startsWith: `${folder.path}/` } },
        ],
      },
      select: { id: true, folderPath: true, fileName: true },
    });
    const replace = (path: string | null) =>
      path === folder.path
        ? nextPath
        : path?.replace(`${folder.path}/`, `${nextPath}/`) || null;
    await db.$transaction([
      ...descendants.map((item) => {
        const path = replace(item.path) || item.path;
        return db.noteFolder.update({
          where: { id: item.id },
          data: { path, name: folderName(path) || item.name },
        });
      }),
      ...notes.map((note) => {
        const path = replace(note.folderPath);
        return db.note.update({
          where: { id: note.id },
          data: {
            folderPath: path,
            folderName: folderName(path),
            filePath: note.fileName ? noteFilePath(path, note.fileName) : null,
          },
        });
      }),
      ...attachments.map((attachment) => {
        const path = replace(attachment.folderPath);
        return db.noteAttachment.update({
          where: { id: attachment.id },
          data: {
            folderPath: path,
            folderName: folderName(path),
            filePath: noteFilePath(path, attachment.fileName),
          },
        });
      }),
    ]);
    revalidateKcs();
    return {
      success: true as const,
      data: { id: folder.id, name, path: nextPath },
    };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível renomear a pasta.'),
    };
  }
}

export async function deleteKcsFolder(
  organizationId: string,
  folderId: string
) {
  try {
    await requireKcsManager(organizationId);
    const scoped = scope(organizationId);
    const folder = await db.noteFolder.findFirst({
      where: { id: folderId, ...scoped, deletedAt: null },
    });
    if (!folder) throw new OrganizationAuthorizationError();
    const nested = await db.noteFolder.findMany({
      where: {
        ...scoped,
        OR: [{ id: folder.id }, { path: { startsWith: `${folder.path}/` } }],
      },
      select: { id: true },
    });
    const folderIds = nested.map((item) => item.id);
    await db.$transaction([
      db.note.updateMany({
        where: { ...scoped, folderId: { in: folderIds } },
        data: { folderId: null, folderPath: null, folderName: null },
      }),
      db.noteFolder.deleteMany({ where: { ...scoped, id: { in: folderIds } } }),
    ]);
    revalidateKcs();
    return { success: true as const, data: { folderId } };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível excluir a pasta.'),
    };
  }
}

export type KcsNoteInput = {
  title: string;
  content: string;
  status?: NoteStatus;
  tags?: string[];
  folderId?: string | null;
};

export async function createKcsNote(
  organizationId: string,
  input: KcsNoteInput
) {
  try {
    const { user } = await requireKcsManager(organizationId);
    const scoped = scope(organizationId);
    const title = cleanText(input.title, 240);
    if (!title) return { success: false as const, error: 'Informe um título.' };
    const folder = input.folderId
      ? await db.noteFolder.findFirst({
          where: { id: input.folderId, ...scoped, deletedAt: null },
        })
      : null;
    if (input.folderId && !folder) throw new OrganizationAuthorizationError();
    const content = (input.content || '').slice(0, 2_000_000);
    const slug = await uniqueKcsSlug(organizationId, title);
    const fileName = `${slug}.md`;
    const note = await db.note.create({
      data: {
        userId: user.id,
        ...scoped,
        title,
        slug,
        content,
        excerpt: createExcerpt(content, title),
        visibility: 'PRIVATE',
        status: input.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
        folderId: folder?.id || null,
        folderPath: folder?.path || null,
        folderName: folder?.name || null,
        fileName,
        filePath: noteFilePath(folder?.path || null, fileName),
        extension: 'md',
        position: await nextNotePosition(organizationId, folder?.id || null),
      },
    });
    await syncKcsRelations(organizationId, note.id, content, input.tags);
    await syncKcsTasks(organizationId, user.id, note.id, content);
    await refreshKcsLinkTargets(organizationId);
    revalidateKcs();
    return { success: true as const, data: note };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível criar a nota KCS.'),
    };
  }
}

export async function updateKcsNote(
  organizationId: string,
  noteId: string,
  input: Partial<KcsNoteInput>
) {
  try {
    const { user } = await requireKcsManager(organizationId);
    const scoped = scope(organizationId);
    const existing = await db.note.findFirst({
      where: { id: noteId, ...scoped },
    });
    if (!existing) throw new OrganizationAuthorizationError();
    const folder =
      input.folderId === undefined
        ? undefined
        : input.folderId
          ? await db.noteFolder.findFirst({
              where: { id: input.folderId, ...scoped, deletedAt: null },
            })
          : null;
    if (input.folderId && !folder) throw new OrganizationAuthorizationError();
    const title =
      input.title === undefined ? existing.title : cleanText(input.title, 240);
    if (!title) return { success: false as const, error: 'Informe um título.' };
    const content =
      input.content === undefined
        ? existing.content
        : input.content.slice(0, 2_000_000);
    const slug = await uniqueKcsSlug(
      organizationId,
      title,
      slugifyNote(title),
      noteId
    );
    const folderPath =
      folder === undefined ? existing.folderPath : folder?.path || null;
    const folderId =
      folder === undefined ? existing.folderId : folder?.id || null;
    const fileName = `${slug}.md`;
    const note = await db.note.update({
      where: { id: existing.id },
      data: {
        title,
        slug,
        content,
        excerpt: createExcerpt(content, title),
        visibility: 'PRIVATE',
        status:
          input.status === 'PUBLISHED' ||
          input.status === 'DRAFT' ||
          input.status === 'ARCHIVED'
            ? input.status
            : existing.status,
        folderId,
        folderPath,
        folderName: folderName(folderPath),
        fileName,
        filePath: noteFilePath(folderPath, fileName),
      },
    });
    await syncKcsRelations(organizationId, note.id, content, input.tags);
    await syncKcsTasks(organizationId, user.id, note.id, content);
    if (existing.title !== note.title || existing.slug !== note.slug) {
      await refreshKcsLinkTargets(organizationId);
    }
    revalidateKcs();
    return { success: true as const, data: note };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível salvar a nota KCS.'),
    };
  }
}

export async function deleteKcsNote(organizationId: string, noteId: string) {
  try {
    await requireKcsManager(organizationId);
    const note = await db.note.findFirst({
      where: { id: noteId, ...scope(organizationId) },
      select: { id: true },
    });
    if (!note) throw new OrganizationAuthorizationError();
    await db.note.delete({ where: { id: note.id } });
    await refreshKcsLinkTargets(organizationId);
    revalidateKcs();
    return { success: true as const, data: { noteId } };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível excluir a nota KCS.'),
    };
  }
}

export async function createKcsAttachment(
  organizationId: string,
  input: {
    fileName: string;
    dataUrl: string;
    mimeType: string;
    size: number;
    folderId?: string | null;
  }
) {
  try {
    const { user } = await requireKcsManager(organizationId);
    const payload = input.dataUrl.split(',', 2)[1] || '';
    const decodedSize = Math.ceil((payload.length * 3) / 4);
    if (
      !ATTACHMENT_TYPES.has(input.mimeType) ||
      input.size < 0 ||
      input.size > MAX_ATTACHMENT_SIZE ||
      decodedSize > MAX_ATTACHMENT_SIZE
    ) {
      return {
        success: false as const,
        error: 'Anexo inválido ou maior que 8 MB.',
      };
    }
    if (!input.dataUrl.startsWith(`data:${input.mimeType};base64,`)) {
      return { success: false as const, error: 'Conteúdo do anexo inválido.' };
    }
    const scoped = scope(organizationId);
    const folder = input.folderId
      ? await db.noteFolder.findFirst({
          where: { id: input.folderId, ...scoped, deletedAt: null },
        })
      : null;
    if (input.folderId && !folder) throw new OrganizationAuthorizationError();
    const fileName = cleanText(input.fileName, 240).replace(/[\\/\0]/g, '-');
    if (!fileName)
      return { success: false as const, error: 'Nome de arquivo inválido.' };
    const basePath = noteFilePath(folder?.path || null, fileName);
    let filePath = basePath;
    let suffix = 2;
    while (
      await db.noteAttachment.findUnique({
        where: { scopeKey_filePath: { scopeKey: scoped.scopeKey, filePath } },
        select: { id: true },
      })
    ) {
      const dot = fileName.lastIndexOf('.');
      const base = dot > 0 ? fileName.slice(0, dot) : fileName;
      const extension = dot > 0 ? fileName.slice(dot) : '';
      filePath = noteFilePath(
        folder?.path || null,
        `${base}-${suffix}${extension}`
      );
      suffix += 1;
    }
    const attachment = await db.noteAttachment.create({
      data: {
        userId: user.id,
        ...scoped,
        fileName: filePath.split('/').at(-1) || fileName,
        filePath,
        folderPath: folder?.path || null,
        folderName: folder?.name || null,
        extension: fileName.split('.').at(-1)?.toLowerCase() || null,
        mimeType: input.mimeType,
        size: input.size,
        dataUrl: input.dataUrl,
      },
    });
    revalidateKcs();
    return { success: true as const, data: attachment };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível salvar o anexo KCS.'),
    };
  }
}

export async function importKcsVault(
  organizationId: string,
  files: VaultImportFile[],
  folderPaths: string[] = []
) {
  try {
    const { user } = await requireKcsManager(organizationId);
    if (!Array.isArray(files) || files.length > 2000) {
      return {
        success: false as const,
        error: 'Quantidade de arquivos inválida.',
      };
    }

    const scoped = scope(organizationId);
    const usableFiles = files.filter(
      (file) => !isUnsafeVaultPath(file.path) && !isIgnoredVaultPath(file.path)
    );
    const markdownFiles = usableFiles.filter(
      (file) => getVaultFileMetadata(file.path).extension === 'md'
    );
    if (!markdownFiles.length) {
      return {
        success: false as const,
        error: 'Nenhum arquivo .md encontrado.',
      };
    }

    const usableFolders = Array.from(
      new Set(
        folderPaths
          .filter(
            (path) => !isUnsafeVaultPath(path) && !isIgnoredVaultPath(path)
          )
          .map((path) => getVaultFileMetadata(`${path}/placeholder`).folderPath)
          .filter((path): path is string => Boolean(path))
      )
    ).sort((left, right) => left.localeCompare(right));
    for (const path of usableFolders) {
      await ensureKcsFolderPath(organizationId, user.id, path);
    }

    const rawAttachments = usableFiles.filter(
      (file) => getVaultFileMetadata(file.path).extension !== 'md'
    );
    const attachments = rawAttachments.filter((file) => {
      if (
        !file.dataUrl ||
        !file.mimeType ||
        !ATTACHMENT_TYPES.has(file.mimeType)
      ) {
        return false;
      }
      if (!file.dataUrl.startsWith(`data:${file.mimeType};base64,`))
        return false;
      const payload = file.dataUrl.split(',', 2)[1] || '';
      const decodedSize = Math.ceil((payload.length * 3) / 4);
      return (
        (file.size ?? decodedSize) >= 0 &&
        (file.size ?? decodedSize) <= MAX_ATTACHMENT_SIZE &&
        decodedSize <= MAX_ATTACHMENT_SIZE
      );
    });

    let attachmentsCreated = 0;
    let attachmentsUpdated = 0;
    for (const file of attachments) {
      const metadata = getVaultFileMetadata(file.path);
      await ensureKcsFolderPath(organizationId, user.id, metadata.folderPath);
      const existing = await db.noteAttachment.findUnique({
        where: {
          scopeKey_filePath: {
            scopeKey: scoped.scopeKey,
            filePath: metadata.filePath,
          },
        },
        select: { id: true },
      });
      if (existing) attachmentsUpdated += 1;
      else attachmentsCreated += 1;
      await db.noteAttachment.upsert({
        where: {
          scopeKey_filePath: {
            scopeKey: scoped.scopeKey,
            filePath: metadata.filePath,
          },
        },
        create: {
          userId: user.id,
          ...scoped,
          ...metadata,
          mimeType: file.mimeType,
          size: file.size || null,
          dataUrl: file.dataUrl,
        },
        update: {
          ...metadata,
          mimeType: file.mimeType,
          size: file.size || null,
          dataUrl: file.dataUrl,
          importedAt: new Date(),
        },
      });
    }

    const importedNotes: Array<{
      id: string;
      title: string;
      slug: string;
      updated: boolean;
    }> = [];
    for (const file of markdownFiles) {
      const metadata = getVaultFileMetadata(file.path);
      const folder = await ensureKcsFolderPath(
        organizationId,
        user.id,
        metadata.folderPath
      );
      const content = (file.content || '').slice(0, 2_000_000);
      const title = inferNoteTitleFromPath(metadata.fileName).slice(0, 240);
      const existing = await db.note.findUnique({
        where: {
          scopeKey_filePath: {
            scopeKey: scoped.scopeKey,
            filePath: metadata.filePath,
          },
        },
        select: { id: true, slug: true },
      });
      const slug = await uniqueKcsSlug(
        organizationId,
        title,
        existing?.slug,
        existing?.id
      );
      const note = await db.note.upsert({
        where: {
          scopeKey_filePath: {
            scopeKey: scoped.scopeKey,
            filePath: metadata.filePath,
          },
        },
        create: {
          userId: user.id,
          ...scoped,
          title,
          slug,
          content,
          excerpt: createExcerpt(content, title),
          visibility: 'PRIVATE',
          status: 'DRAFT',
          ...metadata,
          folderId: folder?.id || null,
          importedAt: new Date(),
        },
        update: {
          title,
          slug,
          content,
          excerpt: createExcerpt(content, title),
          visibility: 'PRIVATE',
          ...metadata,
          folderId: folder?.id || null,
          importedAt: new Date(),
        },
      });
      await syncKcsRelations(
        organizationId,
        note.id,
        content,
        extractNoteTags(content)
      );
      await syncKcsTasks(organizationId, user.id, note.id, content);
      importedNotes.push({
        id: note.id,
        title: note.title,
        slug: note.slug,
        updated: Boolean(existing),
      });
    }

    await refreshKcsLinkTargets(organizationId);
    revalidateKcs();
    return {
      success: true as const,
      data: {
        imported: importedNotes.length,
        notes: importedNotes,
        attachments: {
          total: attachments.length,
          created: attachmentsCreated,
          updated: attachmentsUpdated,
          ignored: rawAttachments.length - attachments.length,
          images: attachments.filter((file) =>
            file.mimeType?.startsWith('image/')
          ).length,
          other: attachments.filter(
            (file) => !file.mimeType?.startsWith('image/')
          ).length,
        },
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível importar o Vault KCS.'),
    };
  }
}
