'use server';

import { revalidatePath } from 'next/cache';
import { NoteStatus, NoteVisibility, Prisma } from '@prisma/client';

import { db } from '@/lib/prisma';
import {
  createExcerpt,
  extractNoteTags,
  extractWikiLinks,
  getVaultFileMetadata,
  inferNoteTitleFromPath,
  isIgnoredVaultPath,
  isUnsafeVaultPath,
  normalizeNoteTag,
  slugifyNote,
} from '@/lib/notes';
import { extractMarkdownTasks } from '@/lib/note-task-sync';

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type NoteFormInput = {
  title: string;
  slug?: string;
  content: string;
  excerpt?: string;
  visibility?: NoteVisibility;
  status?: NoteStatus;
  tags?: string[];
  projectId?: string | null;
  folderId?: string | null;
  folderPath?: string | null;
  folderName?: string | null;
};

export type NoteFilters = {
  search?: string;
  visibility?: NoteVisibility | 'ALL';
  status?: NoteStatus | 'ALL';
  tag?: string;
  projectId?: string;
  favorite?: boolean;
  folderPath?: string | null;
};

export type VaultImportFile = {
  path: string;
  content?: string;
  dataUrl?: string;
  mimeType?: string;
  size?: number;
};

export type DeleteFolderMode = 'parent' | 'unfiled';

export type TrashSelectionInput = {
  noteIds?: string[];
  folderIds?: string[];
};

export type NoteAttachmentInput = {
  fileName: string;
  dataUrl: string;
  mimeType?: string | null;
  size?: number | null;
  folderPath?: string | null;
};

const SUPPORTED_ATTACHMENT_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/ogg',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const MAX_ATTACHMENT_DATA_URL_SIZE = 8 * 1024 * 1024;

const noteInclude = {
  project: { select: { id: true, title: true } },
  tags: { orderBy: { name: 'asc' } },
  outgoing: {
    include: {
      targetNote: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { targetTitle: 'asc' },
  },
  incoming: {
    include: {
      sourceNote: { select: { id: true, title: true, slug: true } },
    },
    orderBy: { updatedAt: 'desc' },
  },
  tasks: {
    select: {
      id: true,
      title: true,
      status: true,
      noteTaskKey: true,
    },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.NoteInclude;

function revalidateNotes() {
  revalidatePath('/admin');
  revalidatePath('/admin/notes');
}

function isNoteVisibility(value?: NoteVisibility): value is NoteVisibility {
  return value === 'PUBLIC' || value === 'PRIVATE';
}

function isNoteStatus(value?: NoteStatus): value is NoteStatus {
  return value === 'DRAFT' || value === 'PUBLISHED' || value === 'ARCHIVED';
}

async function createUniqueSlug(
  title: string,
  preferredSlug?: string,
  id?: string
) {
  const base = slugifyNote(preferredSlug || title) || 'nota';
  let slug = base;
  let index = 2;

  while (true) {
    const existing = await db.note.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing || existing.id === id) return slug;
    slug = `${base}-${index}`;
    index += 1;
  }
}

async function syncNoteRelations(
  noteId: string,
  content: string,
  tags: string[]
) {
  const links = extractWikiLinks(content);
  const targetSlugs = links.map((link) => link.targetSlug);
  const targets = targetSlugs.length
    ? await db.note.findMany({
        where: { slug: { in: targetSlugs } },
        select: { id: true, slug: true },
      })
    : [];
  const targetBySlug = new Map(
    targets.map((target) => [target.slug, target.id])
  );

  await db.$transaction([
    db.noteTag.deleteMany({ where: { noteId } }),
    db.noteLink.deleteMany({ where: { sourceNoteId: noteId } }),
    db.noteTag.createMany({
      data: tags.map((tag) => ({
        noteId,
        name: tag,
        slug: normalizeNoteTag(tag),
      })),
      skipDuplicates: true,
    }),
    db.noteLink.createMany({
      data: links.map((link) => {
        const targetNoteId = targetBySlug.get(link.targetSlug);
        return {
          sourceNoteId: noteId,
          targetNoteId,
          targetSlug: link.targetSlug,
          targetTitle: link.targetTitle,
          alias: link.alias,
          occurrences: link.occurrences,
          targetExists: Boolean(targetNoteId),
        };
      }),
      skipDuplicates: true,
    }),
  ]);
}

async function syncNoteTasks(
  noteId: string,
  content: string,
  projectId?: string | null
) {
  const markdownTasks = extractMarkdownTasks(content);
  const keys = markdownTasks.map((task) => task.key);

  if (markdownTasks.length) {
    await db.$transaction(
      markdownTasks.map((task) =>
        db.task.upsert({
          where: {
            noteId_noteTaskKey: {
              noteId,
              noteTaskKey: task.key,
            },
          },
          create: {
            title: task.title,
            status: task.completed ? 'completed' : 'pending',
            completedAt: task.completed ? new Date() : null,
            priority: 'medium',
            estimatedHours: 0,
            tags: ['note'],
            noteId,
            noteTaskKey: task.key,
            projectId: projectId || null,
          },
          update: {
            title: task.title,
            status: task.completed ? 'completed' : 'pending',
            completedAt: task.completed ? new Date() : null,
            projectId: projectId || null,
          },
        })
      )
    );
  }

  await db.task.updateMany({
    where: {
      noteId,
      noteTaskKey: keys.length ? { notIn: keys } : { not: null },
    },
    data: {
      noteId: null,
      noteTaskKey: null,
    },
  });
}

async function refreshLinksPointingTo(noteId: string, slug: string) {
  await db.noteLink.updateMany({
    where: { targetSlug: slug },
    data: {
      targetNoteId: noteId,
      targetExists: true,
    },
  });
}

async function refreshAllLinkTargets() {
  const [notes, links] = await Promise.all([
    db.note.findMany({ select: { id: true, slug: true } }),
    db.noteLink.findMany({ select: { id: true, targetSlug: true } }),
  ]);
  const noteBySlug = new Map(notes.map((note) => [note.slug, note.id]));

  await db.$transaction(
    links.map((link) => {
      const targetNoteId = noteBySlug.get(link.targetSlug);
      return db.noteLink.update({
        where: { id: link.id },
        data: {
          targetNoteId: targetNoteId || null,
          targetExists: Boolean(targetNoteId),
        },
      });
    })
  );
}

function normalizeFolderName(name: string) {
  return name
    .trim()
    .replace(/[\\/]+/g, '-')
    .replace(/\s+/g, ' ');
}

function isValidFolderName(name: string) {
  return Boolean(name) && name !== '.' && name !== '..' && !name.includes('\0');
}

function joinFolderPath(parentPath: string | null | undefined, name: string) {
  return parentPath ? `${parentPath}/${name}` : name;
}

function folderNameFromPath(path: string | null | undefined) {
  if (!path) return null;
  return path.split('/').filter(Boolean).at(-1) || null;
}

function updateFilePath(folderPath: string | null, fileName: string | null) {
  if (!fileName) return null;
  return folderPath ? `${folderPath}/${fileName}` : fileName;
}

function fileExtensionFromName(fileName: string | null | undefined) {
  return fileName?.match(/\.([^.]+)$/)?.[1]?.toLowerCase() || null;
}

function fileBaseFromName(fileName: string | null | undefined) {
  if (!fileName) return '';
  return fileName.replace(/\.[^.]+$/, '');
}

function splitFileName(fileName: string) {
  const extension = fileExtensionFromName(fileName);
  if (!extension) return { base: fileName, extension: null };
  return {
    base: fileName.slice(0, -(extension.length + 1)),
    extension,
  };
}

function normalizeVaultFileBase(value: string) {
  return (
    value
      .trim()
      .replace(/[\\/]+/g, '-')
      .replace(/\s+/g, ' ')
      .replace(/\0/g, '') || 'Nota'
  );
}

async function createUniqueAttachmentPath(
  fileNameInput: string,
  folderPath?: string | null
) {
  const metadata = getVaultFileMetadata(
    updateFilePath(folderPath || null, normalizeVaultFileBase(fileNameInput)) ||
      normalizeVaultFileBase(fileNameInput)
  );
  const { base, extension } = splitFileName(metadata.fileName);
  let fileName = metadata.fileName;
  let filePath = metadata.filePath;
  let index = 2;

  while (true) {
    const existing = await db.noteAttachment.findUnique({
      where: { filePath },
      select: { id: true },
    });
    if (!existing) {
      return {
        ...metadata,
        fileName,
        filePath,
        folderPath: metadata.folderPath,
        folderName: metadata.folderName,
        extension: extension || metadata.extension,
      };
    }

    fileName = `${base} ${index}${extension ? `.${extension}` : ''}`;
    filePath = updateFilePath(metadata.folderPath, fileName) || fileName;
    index += 1;
  }
}

function isActiveNoteStatusWhere() {
  return { not: 'ARCHIVED' as const };
}

async function nextFolderPosition(parentId: string | null) {
  const aggregate = await db.noteFolder.aggregate({
    where: { parentId, deletedAt: null },
    _max: { position: true },
  });
  return (aggregate._max.position ?? -1) + 1;
}

async function nextNotePosition(folderId: string | null) {
  const aggregate = await db.note.aggregate({
    where: { folderId, status: isActiveNoteStatusWhere() },
    _max: { position: true },
  });
  return (aggregate._max.position ?? -1) + 1;
}

async function ensureNoteFolderPath(path: string | null | undefined) {
  const normalized = path?.trim();
  if (!normalized) return null;

  const segments = normalized.split('/').filter(Boolean);
  let parentId: string | null = null;
  let currentPath = '';
  let folder = null as Awaited<
    ReturnType<typeof db.noteFolder.findUnique>
  > | null;

  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    folder = await db.noteFolder.findUnique({ where: { path: currentPath } });
    if (!folder) {
      folder = await db.noteFolder.create({
        data: {
          name: segment,
          path: currentPath,
          parentId,
          position: await nextFolderPosition(parentId),
        },
      });
    } else if (
      folder.parentId !== parentId ||
      folder.name !== segment ||
      folder.deletedAt
    ) {
      folder = await db.noteFolder.update({
        where: { id: folder.id },
        data: { parentId, name: segment, deletedAt: null, trashedAt: null },
      });
    }
    parentId = folder.id;
  }

  return folder;
}

function replaceFolderPrefix(
  value: string | null,
  oldPath: string,
  nextPath: string
) {
  if (!value) return null;
  return value === oldPath
    ? nextPath
    : value.replace(`${oldPath}/`, `${nextPath}/`);
}

function trashFolderPath(folderId: string, originalPath: string) {
  return `__trash/${folderId}/${originalPath}`;
}

function originalFolderPath(folder: {
  path: string;
  pathBeforeTrash?: string | null;
}) {
  return folder.pathBeforeTrash || folder.path.replace(/^__trash\/[^/]+\//, '');
}

function isDescendantPath(path: string | null | undefined, rootPath: string) {
  return Boolean(
    path && (path === rootPath || path.startsWith(`${rootPath}/`))
  );
}

export async function syncFoldersFromImportedNotes() {
  try {
    const paths = await db.note.findMany({
      where: { folderPath: { not: null }, status: isActiveNoteStatusWhere() },
      distinct: ['folderPath'],
      select: { folderPath: true },
      orderBy: { folderPath: 'asc' },
    });

    for (const item of paths) {
      await ensureNoteFolderPath(item.folderPath);
    }

    const folders = await db.noteFolder.findMany({
      where: { deletedAt: null },
      select: { id: true, path: true },
    });
    const folderByPath = new Map(
      folders.map((folder) => [folder.path, folder.id])
    );
    const notes = await db.note.findMany({
      where: { folderPath: { not: null }, status: isActiveNoteStatusWhere() },
      select: { id: true, folderPath: true, folderId: true },
    });

    await db.$transaction(
      notes
        .filter(
          (note) =>
            note.folderPath &&
            note.folderId !== folderByPath.get(note.folderPath)
        )
        .map((note) =>
          db.note.update({
            where: { id: note.id },
            data: { folderId: folderByPath.get(note.folderPath || '') || null },
          })
        )
    );

    return { success: true, data: { folders: folders.length } };
  } catch (error) {
    console.error('Error syncing note folders:', error);
    return { success: false, error: 'Nao foi possivel sincronizar pastas.' };
  }
}

async function updateFolderPathCascade(
  folderId: string,
  nextPath: string,
  nextParentId?: string | null
) {
  const folder = await db.noteFolder.findUnique({ where: { id: folderId } });
  if (!folder)
    return { success: false as const, error: 'Pasta nao encontrada.' };

  const oldPath = folder.path;
  const descendants = await db.noteFolder.findMany({
    where: { OR: [{ id: folder.id }, { path: { startsWith: `${oldPath}/` } }] },
    orderBy: { path: 'asc' },
  });
  const pathById = new Map<string, string>();
  const idByNextPath = new Map<string, string>();

  for (const item of descendants) {
    const path = replaceFolderPrefix(item.path, oldPath, nextPath) || item.path;
    pathById.set(item.id, path);
    idByNextPath.set(path, item.id);
  }

  const duplicatePaths = await db.noteFolder.findMany({
    where: {
      path: { in: Array.from(pathById.values()) },
      id: { notIn: descendants.map((item) => item.id) },
    },
    select: { path: true },
  });
  if (duplicatePaths.length)
    return {
      success: false as const,
      error: 'Ja existe uma pasta com esse caminho.',
    };

  const notes = await db.note.findMany({
    where: {
      OR: [
        { folderPath: oldPath },
        { folderPath: { startsWith: `${oldPath}/` } },
      ],
    },
    select: { id: true, fileName: true, folderPath: true },
  });
  const attachments = await db.noteAttachment.findMany({
    where: {
      OR: [
        { folderPath: oldPath },
        { folderPath: { startsWith: `${oldPath}/` } },
      ],
    },
    select: { id: true, fileName: true, folderPath: true },
  });

  await db.$transaction([
    ...descendants.map((item) => {
      const path = pathById.get(item.id) || item.path;
      return db.noteFolder.update({
        where: { id: item.id },
        data: {
          name: folderNameFromPath(path) || item.name,
          path,
          parentId: item.id === folder.id ? nextParentId : item.parentId,
        },
      });
    }),
    ...notes.map((note) => {
      const folderPath = replaceFolderPrefix(
        note.folderPath,
        oldPath,
        nextPath
      );
      return db.note.update({
        where: { id: note.id },
        data: {
          folderPath,
          folderName: folderNameFromPath(folderPath),
          filePath: updateFilePath(folderPath, note.fileName),
          folderId: folderPath ? idByNextPath.get(folderPath) || null : null,
        },
      });
    }),
    ...attachments.map((attachment) => {
      const folderPath = replaceFolderPrefix(
        attachment.folderPath,
        oldPath,
        nextPath
      );
      return db.noteAttachment.update({
        where: { id: attachment.id },
        data: {
          folderPath,
          folderName: folderNameFromPath(folderPath),
          filePath:
            updateFilePath(folderPath, attachment.fileName) ||
            attachment.fileName,
        },
      });
    }),
  ]);

  revalidateNotes();
  return { success: true as const, data: { path: nextPath } };
}

export async function createNoteFolder(input: {
  name: string;
  parentId?: string | null;
}) {
  try {
    const name = normalizeFolderName(input.name);
    if (!isValidFolderName(name))
      return { success: false, error: 'Informe um nome de pasta valido.' };

    const parent = input.parentId
      ? await db.noteFolder.findUnique({ where: { id: input.parentId } })
      : null;
    if (input.parentId && !parent)
      return { success: false, error: 'Pasta pai nao encontrada.' };

    const path = joinFolderPath(parent?.path, name);
    const duplicate = await db.noteFolder.findUnique({ where: { path } });
    if (duplicate)
      return {
        success: false,
        error: 'Ja existe uma pasta com esse nome nesse nivel.',
      };

    const folder = await db.noteFolder.create({
      data: {
        name,
        path,
        parentId: parent?.id || null,
        position: await nextFolderPosition(parent?.id || null),
      },
    });

    revalidateNotes();
    return { success: true, data: { folder } };
  } catch (error) {
    console.error('Error creating note folder:', error);
    return { success: false, error: 'Nao foi possivel criar a pasta.' };
  }
}

export async function renameNoteFolder(id: string, nameInput: string) {
  try {
    const name = normalizeFolderName(nameInput);
    if (!isValidFolderName(name))
      return { success: false, error: 'Informe um nome de pasta valido.' };

    const folder = await db.noteFolder.findUnique({
      where: { id },
      include: { parent: true },
    });
    if (!folder) return { success: false, error: 'Pasta nao encontrada.' };

    const nextPath = joinFolderPath(folder.parent?.path, name);
    if (nextPath === folder.path)
      return { success: true, data: { path: folder.path } };

    return updateFolderPathCascade(folder.id, nextPath, folder.parentId);
  } catch (error) {
    console.error('Error renaming note folder:', error);
    return { success: false, error: 'Nao foi possivel renomear a pasta.' };
  }
}

export async function moveNoteFolder(id: string, parentId: string | null) {
  try {
    const folder = await db.noteFolder.findUnique({ where: { id } });
    if (!folder) return { success: false, error: 'Pasta nao encontrada.' };
    if (parentId === id)
      return {
        success: false,
        error: 'Uma pasta nao pode ser movida para dentro dela mesma.',
      };
    if (folder.parentId === parentId)
      return { success: true, data: { path: folder.path } };

    const parent = parentId
      ? await db.noteFolder.findUnique({ where: { id: parentId } })
      : null;
    if (parentId && !parent)
      return { success: false, error: 'Pasta destino nao encontrada.' };
    if (
      parent?.path === folder.path ||
      parent?.path.startsWith(`${folder.path}/`)
    ) {
      return {
        success: false,
        error: 'Uma pasta nao pode ser movida para dentro de uma descendente.',
      };
    }

    const nextPath = joinFolderPath(parent?.path, folder.name);
    return updateFolderPathCascade(folder.id, nextPath, parent?.id || null);
  } catch (error) {
    console.error('Error moving note folder:', error);
    return { success: false, error: 'Nao foi possivel mover a pasta.' };
  }
}

export async function deleteNoteFolder(id: string, mode?: DeleteFolderMode) {
  try {
    const folder = await db.noteFolder.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        _count: { select: { notes: true } },
      },
    });
    if (!folder) return { success: false, error: 'Pasta nao encontrada.' };

    const descendantCount = await db.noteFolder.count({
      where: { path: { startsWith: `${folder.path}/` } },
    });
    const nestedNoteCount = await db.note.count({
      where: {
        OR: [
          { folderPath: folder.path },
          { folderPath: { startsWith: `${folder.path}/` } },
        ],
      },
    });
    const hasContent = descendantCount > 0 || nestedNoteCount > 0;

    if (hasContent && !mode) {
      return {
        success: false,
        error:
          'A pasta tem conteudo. Escolha mover para a pasta pai ou para Sem Pasta.',
      };
    }

    if (!hasContent) {
      await db.noteFolder.delete({ where: { id } });
      revalidateNotes();
      return { success: true, data: { deleted: true } };
    }

    if (mode === 'unfiled') {
      const affectedFolders = await db.noteFolder.findMany({
        where: {
          OR: [{ id: folder.id }, { path: { startsWith: `${folder.path}/` } }],
        },
        select: { id: true },
      });
      const affectedIds = affectedFolders.map((item) => item.id);
      const notes = await db.note.findMany({
        where: { folderId: { in: affectedIds } },
        select: { id: true, fileName: true },
      });
      const attachments = await db.noteAttachment.findMany({
        where: {
          OR: [
            { folderPath: folder.path },
            { folderPath: { startsWith: `${folder.path}/` } },
          ],
        },
        select: { id: true, fileName: true },
      });

      await db.$transaction([
        ...notes.map((note) =>
          db.note.update({
            where: { id: note.id },
            data: {
              folderId: null,
              folderPath: null,
              folderName: null,
              filePath: updateFilePath(null, note.fileName),
            },
          })
        ),
        ...attachments.map((attachment) =>
          db.noteAttachment.update({
            where: { id: attachment.id },
            data: {
              folderPath: null,
              folderName: null,
              filePath:
                updateFilePath(null, attachment.fileName) ||
                attachment.fileName,
            },
          })
        ),
        db.noteFolder.deleteMany({ where: { id: { in: affectedIds } } }),
      ]);
    } else if (mode === 'parent') {
      const parentPath = folder.parent?.path || null;
      const childFolders = await db.noteFolder.findMany({
        where: { parentId: folder.id },
        select: { id: true, name: true },
      });
      const notes = await db.note.findMany({
        where: { folderPath: folder.path },
        select: { id: true, fileName: true },
      });
      const attachments = await db.noteAttachment.findMany({
        where: { folderPath: folder.path },
        select: { id: true, fileName: true },
      });

      await db.$transaction([
        ...childFolders.map((child) =>
          db.noteFolder.update({
            where: { id: child.id },
            data: { parentId: folder.parentId },
          })
        ),
        ...notes.map((note) =>
          db.note.update({
            where: { id: note.id },
            data: {
              folderId: folder.parentId,
              folderPath: parentPath,
              folderName: folderNameFromPath(parentPath),
              filePath: updateFilePath(parentPath, note.fileName),
            },
          })
        ),
        ...attachments.map((attachment) =>
          db.noteAttachment.update({
            where: { id: attachment.id },
            data: {
              folderPath: parentPath,
              folderName: folderNameFromPath(parentPath),
              filePath:
                updateFilePath(parentPath, attachment.fileName) ||
                attachment.fileName,
            },
          })
        ),
        db.noteFolder.delete({ where: { id: folder.id } }),
      ]);

      for (const child of childFolders) {
        await updateFolderPathCascade(
          child.id,
          joinFolderPath(parentPath, child.name),
          folder.parentId
        );
      }
    }

    revalidateNotes();
    return { success: true, data: { deleted: true } };
  } catch (error) {
    console.error('Error deleting note folder:', error);
    return { success: false, error: 'Nao foi possivel remover a pasta.' };
  }
}

export async function moveNoteToFolder(
  noteId: string,
  folderId: string | null
) {
  try {
    const note = await db.note.findUnique({ where: { id: noteId } });
    if (!note) return { success: false, error: 'Nota nao encontrada.' };

    const folder = folderId
      ? await db.noteFolder.findUnique({ where: { id: folderId } })
      : null;
    if (folderId && !folder)
      return { success: false, error: 'Pasta destino nao encontrada.' };

    const folderPath = folder?.path || null;
    const updated = await db.note.update({
      where: { id: note.id },
      data: {
        folderId: folder?.id || null,
        folderPath,
        folderName: folderNameFromPath(folderPath),
        filePath: updateFilePath(folderPath, note.fileName),
        position: await nextNotePosition(folder?.id || null),
      },
      include: noteInclude,
    });

    revalidateNotes();
    return { success: true, data: { note: updated } };
  } catch (error) {
    console.error('Error moving note:', error);
    return { success: false, error: 'Nao foi possivel mover a nota.' };
  }
}

export async function reorderNoteFolders(folderIds: string[]) {
  try {
    await db.$transaction(
      folderIds.map((id, position) =>
        db.noteFolder.update({ where: { id }, data: { position } })
      )
    );
    revalidateNotes();
    return { success: true, data: { count: folderIds.length } };
  } catch (error) {
    console.error('Error reordering note folders:', error);
    return { success: false, error: 'Nao foi possivel reordenar pastas.' };
  }
}

export async function reorderNotes(noteIds: string[]) {
  try {
    await db.$transaction(
      noteIds.map((id, position) =>
        db.note.update({ where: { id }, data: { position } })
      )
    );
    revalidateNotes();
    return { success: true, data: { count: noteIds.length } };
  } catch (error) {
    console.error('Error reordering notes:', error);
    return { success: false, error: 'Nao foi possivel reordenar notas.' };
  }
}

export async function getProjectsForNotes(): Promise<
  ActionResult<{ id: string; title: string }[]>
> {
  try {
    const projects = await db.project.findMany({
      orderBy: [{ position: 'asc' }, { title: 'asc' }],
      select: { id: true, title: true },
    });
    return { success: true, data: projects };
  } catch (error) {
    console.error('Error fetching note projects:', error);
    return { success: false, error: 'Nao foi possivel carregar projetos.' };
  }
}

export async function getNoteTags(): Promise<
  ActionResult<{ name: string; slug: string; count: number }[]>
> {
  try {
    const grouped = await db.noteTag.groupBy({
      by: ['slug', 'name'],
      _count: { slug: true },
      orderBy: { _count: { slug: 'desc' } },
    });

    return {
      success: true,
      data: grouped.map((tag) => ({
        name: tag.name,
        slug: tag.slug,
        count: tag._count.slug,
      })),
    };
  } catch (error) {
    console.error('Error fetching note tags:', error);
    return { success: false, error: 'Nao foi possivel carregar tags.' };
  }
}

export async function getNotes(filters: NoteFilters = {}) {
  try {
    await syncFoldersFromImportedNotes();

    const search = filters.search?.trim();
    const where: Prisma.NoteWhereInput = {};

    if (filters.visibility && filters.visibility !== 'ALL') {
      where.visibility = filters.visibility;
    }
    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    } else {
      where.status = { not: 'ARCHIVED' };
    }
    if (filters.projectId) {
      where.projectId = filters.projectId;
    }
    if (filters.folderPath !== undefined) {
      where.folderPath = filters.folderPath || null;
    }
    if (filters.favorite) {
      where.isFavorite = true;
    }
    if (filters.tag) {
      where.tags = { some: { slug: normalizeNoteTag(filters.tag) } };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { tags: { some: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const notes = await db.note.findMany({
      where,
      orderBy: [
        { isFavorite: 'desc' },
        { position: 'asc' },
        { updatedAt: 'desc' },
      ],
      include: {
        project: { select: { id: true, title: true } },
        tags: { orderBy: { name: 'asc' } },
        outgoing: {
          select: {
            id: true,
            targetSlug: true,
            targetTitle: true,
            targetExists: true,
            targetNote: { select: { id: true, title: true, slug: true } },
          },
        },
        _count: { select: { incoming: true, outgoing: true } },
      },
    });

    const [
      statusCounts,
      visibilityCounts,
      favoriteCount,
      recent,
      popular,
      folders,
      attachments,
      unfiledCount,
      linkableNotes,
    ] = await Promise.all([
      db.note.groupBy({ by: ['status'], _count: { status: true } }),
      db.note.groupBy({ by: ['visibility'], _count: { visibility: true } }),
      db.note.count({
        where: { isFavorite: true, status: { not: 'ARCHIVED' } },
      }),
      db.note.findMany({
        where: { status: { not: 'ARCHIVED' } },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, slug: true, updatedAt: true },
      }),
      db.note.findMany({
        where: { status: { not: 'ARCHIVED' } },
        take: 5,
        orderBy: [{ viewCount: 'desc' }, { updatedAt: 'desc' }],
        select: { id: true, title: true, slug: true, viewCount: true },
      }),
      db.noteFolder.findMany({
        where: { deletedAt: null },
        orderBy: [{ parentId: 'asc' }, { position: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          path: true,
          name: true,
          parentId: true,
          position: true,
        },
      }),
      db.noteAttachment.findMany({
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
      db.note.count({
        where: { folderPath: null, status: { not: 'ARCHIVED' } },
      }),
      db.note.findMany({
        where: { status: { not: 'ARCHIVED' } },
        orderBy: { title: 'asc' },
        select: {
          id: true,
          title: true,
          slug: true,
          filePath: true,
          folderId: true,
          folderPath: true,
        },
      }),
    ]);
    const [folderCounts, trashedFolders, trashFolderCount] = await Promise.all([
      db.note.groupBy({
        by: ['folderId'],
        where: { folderId: { not: null }, status: { not: 'ARCHIVED' } },
        _count: { _all: true },
      }),
      db.noteFolder.findMany({
        where: { deletedAt: { not: null } },
        orderBy: [{ trashedAt: 'desc' }, { name: 'asc' }],
        select: {
          id: true,
          path: true,
          name: true,
          parentId: true,
          position: true,
          deletedAt: true,
          trashedAt: true,
          pathBeforeTrash: true,
          parentIdBeforeTrash: true,
        },
      }),
      db.noteFolder.count({ where: { deletedAt: { not: null } } }),
    ]);
    const countByFolderId = new Map(
      folderCounts
        .filter((item) => item.folderId)
        .map((item) => [item.folderId!, item._count._all])
    );

    return {
      success: true,
      data: {
        notes,
        stats: {
          total: await db.note.count({
            where: { status: { not: 'ARCHIVED' } },
          }),
          favorites: favoriteCount,
          byStatus: Object.fromEntries(
            statusCounts.map((item) => [item.status, item._count.status])
          ),
          byVisibility: Object.fromEntries(
            visibilityCounts.map((item) => [
              item.visibility,
              item._count.visibility,
            ])
          ),
        },
        widgets: {
          recent,
          popular,
        },
        folders: folders.map((folder) => ({
          id: folder.id,
          path: folder.path,
          name: folder.name,
          parentId: folder.parentId,
          position: folder.position,
          count: countByFolderId.get(folder.id) || 0,
        })),
        trashedFolders: trashedFolders.map((folder) => ({
          id: folder.id,
          path: originalFolderPath(folder),
          trashPath: folder.path,
          name: folder.name,
          parentId: folder.parentIdBeforeTrash || folder.parentId,
          position: folder.position,
          deletedAt: folder.deletedAt,
          trashedAt: folder.trashedAt,
          count: 0,
        })),
        trashFolderCount,
        attachments,
        unfiledCount,
        linkableNotes,
      },
    };
  } catch (error) {
    console.error('Error fetching notes:', error);
    return { success: false, error: 'Nao foi possivel carregar notas.' };
  }
}

export async function getNote(
  idOrSlug: string,
  options: { incrementView?: boolean } = {}
) {
  try {
    const existing = await db.note.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      select: { id: true },
    });

    if (!existing) {
      return { success: false, error: 'Nota nao encontrada.' };
    }

    const note = options.incrementView
      ? await db.note.update({
          where: { id: existing.id },
          data: { viewCount: { increment: 1 } },
          include: noteInclude,
        })
      : await db.note.findUnique({
          where: { id: existing.id },
          include: noteInclude,
        });

    if (!note) {
      return { success: false, error: 'Nota nao encontrada.' };
    }

    const tagSlugs = note.tags.map((tag) => tag.slug);
    const related = tagSlugs.length
      ? await db.note.findMany({
          where: {
            id: { not: note.id },
            tags: { some: { slug: { in: tagSlugs } } },
          },
          take: 6,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            updatedAt: true,
          },
        })
      : [];

    return { success: true, data: { note, related } };
  } catch (error) {
    console.error('Error fetching note:', error);
    return { success: false, error: 'Nao foi possivel carregar a nota.' };
  }
}

export async function createNote(input: NoteFormInput) {
  try {
    const title = input.title.trim();
    if (!title) return { success: false, error: 'Informe um titulo.' };

    const content = input.content || '';
    const slug = await createUniqueSlug(title, input.slug);
    const tags = extractNoteTags(content, input.tags);
    const folder = input.folderId
      ? await db.noteFolder.findUnique({ where: { id: input.folderId } })
      : input.folderPath
        ? await ensureNoteFolderPath(input.folderPath)
        : null;

    if (input.folderId && !folder) {
      return { success: false, error: 'Pasta nao encontrada.' };
    }

    const folderPath = folder?.path || input.folderPath || null;
    const fileName = `${slug}.md`;
    const filePath = updateFilePath(folderPath, fileName);

    const note = await db.note.create({
      data: {
        title,
        slug,
        content,
        excerpt: input.excerpt?.trim() || createExcerpt(content, title),
        visibility: isNoteVisibility(input.visibility)
          ? input.visibility
          : 'PRIVATE',
        status: isNoteStatus(input.status) ? input.status : 'DRAFT',
        projectId: input.projectId || null,
        folderId: folder?.id || null,
        folderPath,
        folderName: folderNameFromPath(folderPath) || input.folderName || null,
        fileName,
        filePath,
        extension: 'md',
        position: await nextNotePosition(folder?.id || null),
      },
    });

    await syncNoteRelations(note.id, content, tags);
    await syncNoteTasks(note.id, content, note.projectId);
    await refreshLinksPointingTo(note.id, note.slug);

    revalidateNotes();
    return getNote(note.id);
  } catch (error) {
    console.error('Error creating note:', error);
    return { success: false, error: 'Nao foi possivel criar a nota.' };
  }
}

export async function updateNote(id: string, input: Partial<NoteFormInput>) {
  try {
    const existing = await db.note.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Nota nao encontrada.' };

    const title = input.title?.trim() || existing.title;
    const content = input.content ?? existing.content;
    const slug = await createUniqueSlug(title, input.slug || existing.slug, id);
    const tags = extractNoteTags(content, input.tags);

    const note = await db.note.update({
      where: { id },
      data: {
        title,
        slug,
        content,
        excerpt:
          input.excerpt !== undefined
            ? input.excerpt.trim() || createExcerpt(content, title)
            : existing.excerpt,
        visibility: isNoteVisibility(input.visibility)
          ? input.visibility
          : existing.visibility,
        status: isNoteStatus(input.status) ? input.status : existing.status,
        projectId:
          input.projectId === undefined
            ? existing.projectId
            : input.projectId || null,
      },
    });

    await syncNoteRelations(note.id, content, tags);
    await syncNoteTasks(note.id, content, note.projectId);
    await refreshLinksPointingTo(note.id, note.slug);
    if (existing.slug !== note.slug) await refreshAllLinkTargets();

    revalidateNotes();
    return getNote(note.id);
  } catch (error) {
    console.error('Error updating note:', error);
    return { success: false, error: 'Nao foi possivel salvar a nota.' };
  }
}

export async function renameNote(id: string, titleInput: string) {
  try {
    const title = titleInput.trim();
    if (!title) return { success: false, error: 'Informe um titulo.' };

    const existing = await db.note.findUnique({ where: { id } });
    if (!existing) return { success: false, error: 'Nota nao encontrada.' };

    const slug = await createUniqueSlug(title, slugifyNote(title), id);
    const data: Prisma.NoteUpdateInput = {
      title,
      slug,
    };

    if (existing.fileName || existing.filePath) {
      const extension =
        existing.extension || fileExtensionFromName(existing.fileName) || 'md';
      const oldBase = fileBaseFromName(existing.fileName);
      const usesSlugFileName = Boolean(oldBase && oldBase === existing.slug);
      const nextBase = usesSlugFileName ? slug : normalizeVaultFileBase(title);
      const fileName = `${nextBase}.${extension}`;
      const filePath = updateFilePath(existing.folderPath, fileName);

      if (filePath) {
        const duplicate = await db.note.findUnique({
          where: { filePath },
          select: { id: true },
        });
        if (duplicate && duplicate.id !== id) {
          return {
            success: false,
            error: 'Ja existe uma nota com esse caminho.',
          };
        }
      }

      data.fileName = fileName;
      data.filePath = filePath;
      data.extension = extension;
    }

    const note = await db.note.update({
      where: { id },
      data,
      include: noteInclude,
    });

    await refreshLinksPointingTo(note.id, note.slug);
    if (existing.slug !== note.slug) await refreshAllLinkTargets();

    revalidateNotes();
    return { success: true, data: { note } };
  } catch (error) {
    console.error('Error renaming note:', error);
    return { success: false, error: 'Nao foi possivel renomear a nota.' };
  }
}

export async function moveNoteToTrash(id: string) {
  try {
    const existing = await db.note.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) return { success: false, error: 'Nota nao encontrada.' };

    const note = await db.note.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        statusBeforeTrash:
          existing.status === 'ARCHIVED' ? undefined : existing.status,
        trashedAt: new Date(),
      },
      include: noteInclude,
    });

    revalidateNotes();
    return { success: true, data: { note } };
  } catch (error) {
    console.error('Error moving note to trash:', error);
    return {
      success: false,
      error: 'Nao foi possivel mover a nota para a lixeira.',
    };
  }
}

export async function moveNoteFolderToTrash(id: string) {
  try {
    const folder = await db.noteFolder.findUnique({ where: { id } });
    if (!folder) return { success: false, error: 'Pasta nao encontrada.' };
    if (folder.deletedAt) {
      return { success: true, data: { folderId: id, noteCount: 0 } };
    }

    const trashedAt = new Date();
    const descendants = await db.noteFolder.findMany({
      where: {
        OR: [{ id: folder.id }, { path: { startsWith: `${folder.path}/` } }],
      },
      orderBy: { path: 'asc' },
    });
    const folderIds = descendants.map((item) => item.id);
    const notes = await db.note.findMany({
      where: {
        OR: [
          { folderPath: folder.path },
          { folderPath: { startsWith: `${folder.path}/` } },
        ],
        status: { not: 'ARCHIVED' },
      },
      select: { id: true, status: true },
    });

    await db.$transaction([
      ...descendants.map((item) => {
        const previousPath = item.path;
        return db.noteFolder.update({
          where: { id: item.id },
          data: {
            path: trashFolderPath(folder.id, previousPath),
            parentIdBeforeTrash: item.parentId,
            pathBeforeTrash: previousPath,
            deletedAt: trashedAt,
            trashedAt,
          },
        });
      }),
      ...notes.map((note) =>
        db.note.update({
          where: { id: note.id },
          data: {
            status: 'ARCHIVED',
            statusBeforeTrash: note.status,
            trashedAt,
          },
        })
      ),
    ]);

    revalidateNotes();
    return {
      success: true,
      data: { folderId: id, folderIds, noteCount: notes.length },
    };
  } catch (error) {
    console.error('Error moving note folder to trash:', error);
    return {
      success: false,
      error: 'Nao foi possivel mover a pasta para a lixeira.',
    };
  }
}

async function restoreFolderTree(folderIds: string[]) {
  if (!folderIds.length) return [];
  const baseFolders = await db.noteFolder.findMany({
    where: { id: { in: folderIds }, deletedAt: { not: null } },
    orderBy: { pathBeforeTrash: 'asc' },
  });
  if (!baseFolders.length) return [];

  const selected = await db.noteFolder.findMany({
    where: {
      deletedAt: { not: null },
      OR: baseFolders.flatMap((folder) => {
        const path = originalFolderPath(folder);
        return [
          { id: folder.id },
          { pathBeforeTrash: { startsWith: `${path}/` } },
        ];
      }),
    },
    orderBy: { pathBeforeTrash: 'asc' },
  });
  if (!selected.length) return [];

  const roots = selected.filter(
    (folder) =>
      !folder.parentIdBeforeTrash ||
      !selected.some((item) => item.id === folder.parentIdBeforeTrash)
  );
  const restoredIds = new Set<string>();
  const updatedFolders: Awaited<ReturnType<typeof db.noteFolder.update>>[] = [];

  for (const root of roots) {
    const originalRootPath = originalFolderPath(root);
    const originalParent = root.parentIdBeforeTrash
      ? await db.noteFolder.findUnique({
          where: { id: root.parentIdBeforeTrash },
          select: { id: true, path: true, deletedAt: true },
        })
      : null;
    const activeParent =
      originalParent && !originalParent.deletedAt ? originalParent : null;
    const parentPath = activeParent?.path || null;
    const baseName = folderNameFromPath(originalRootPath) || root.name;
    let nextRootName = baseName;
    let nextRootPath = joinFolderPath(parentPath, nextRootName);
    let suffix = 2;

    while (true) {
      const conflict = await db.noteFolder.findFirst({
        where: {
          path: nextRootPath,
          deletedAt: null,
          id: { not: root.id },
        },
        select: { id: true },
      });
      if (!conflict) break;
      nextRootName = `${baseName} restaurada ${suffix}`;
      nextRootPath = joinFolderPath(parentPath, nextRootName);
      suffix += 1;
    }

    const subtree = selected.filter((folder) =>
      isDescendantPath(originalFolderPath(folder), originalRootPath)
    );
    const nextPathById = new Map<string, string>();
    subtree.forEach((folder) => {
      const originalPath = originalFolderPath(folder);
      const nextPath =
        originalPath === originalRootPath
          ? nextRootPath
          : replaceFolderPrefix(originalPath, originalRootPath, nextRootPath) ||
            originalPath;
      nextPathById.set(folder.id, nextPath);
    });

    const updates = subtree.map((folder) => {
      const nextPath =
        nextPathById.get(folder.id) || originalFolderPath(folder);
      const parentId =
        folder.id === root.id
          ? activeParent?.id || null
          : folder.parentIdBeforeTrash &&
              restoredIds.has(folder.parentIdBeforeTrash)
            ? folder.parentIdBeforeTrash
            : folder.parentIdBeforeTrash || null;
      restoredIds.add(folder.id);
      return db.noteFolder.update({
        where: { id: folder.id },
        data: {
          name: folderNameFromPath(nextPath) || folder.name,
          path: nextPath,
          parentId,
          deletedAt: null,
          trashedAt: null,
          pathBeforeTrash: null,
          parentIdBeforeTrash: null,
        },
      });
    });

    updatedFolders.push(...(await db.$transaction(updates)));
  }

  return updatedFolders;
}

export async function restoreTrashItems(input: TrashSelectionInput = {}) {
  try {
    const noteIds = Array.from(new Set(input.noteIds || []));
    const folderIds = Array.from(new Set(input.folderIds || []));
    const folderPaths = folderIds.length
      ? (
          await db.noteFolder.findMany({
            where: { id: { in: folderIds }, deletedAt: { not: null } },
            select: { path: true, pathBeforeTrash: true },
          })
        ).map((folder) => originalFolderPath(folder))
      : [];
    const noteIdsFromFolders = folderPaths.length
      ? (
          await db.note.findMany({
            where: {
              status: 'ARCHIVED',
              OR: folderPaths.flatMap((path) => [
                { folderPath: path },
                { folderPath: { startsWith: `${path}/` } },
              ]),
            },
            select: { id: true },
          })
        ).map((note) => note.id)
      : [];
    const allNoteIds = Array.from(new Set([...noteIds, ...noteIdsFromFolders]));
    const restoredFolders = await restoreFolderTree(folderIds);

    const notes = allNoteIds.length
      ? await db.note.findMany({
          where: { id: { in: allNoteIds }, status: 'ARCHIVED' },
          select: {
            id: true,
            statusBeforeTrash: true,
            folderId: true,
            fileName: true,
          },
        })
      : [];
    const candidateFolderIds = Array.from(
      new Set([
        ...restoredFolders.map((folder) => folder.id),
        ...notes.map((note) => note.folderId).filter(Boolean),
      ])
    ) as string[];
    const folderById = candidateFolderIds.length
      ? new Map(
          (
            await db.noteFolder.findMany({
              where: { id: { in: candidateFolderIds }, deletedAt: null },
              select: { id: true, path: true, name: true },
            })
          ).map((folder) => [folder.id, folder])
        )
      : new Map<string, { id: string; path: string; name: string }>();

    await db.$transaction(
      notes.map((note) => {
        const folder = note.folderId ? folderById.get(note.folderId) : null;
        const folderPath = folder?.path || null;
        return db.note.update({
          where: { id: note.id },
          data: {
            status: note.statusBeforeTrash || 'DRAFT',
            statusBeforeTrash: null,
            trashedAt: null,
            folderId: folder?.id || null,
            folderPath,
            folderName: folderNameFromPath(folderPath),
            filePath: updateFilePath(folderPath, note.fileName),
          },
        });
      })
    );

    await refreshAllLinkTargets();
    revalidateNotes();
    return {
      success: true,
      data: {
        notes: notes.length,
        folders: restoredFolders.length,
      },
    };
  } catch (error) {
    console.error('Error restoring trash items:', error);
    return { success: false, error: 'Nao foi possivel restaurar os itens.' };
  }
}

export async function restoreAllTrash() {
  try {
    const [notes, folders] = await Promise.all([
      db.note.findMany({
        where: { status: 'ARCHIVED' },
        select: { id: true },
      }),
      db.noteFolder.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true },
      }),
    ]);
    return restoreTrashItems({
      noteIds: notes.map((note) => note.id),
      folderIds: folders.map((folder) => folder.id),
    });
  } catch (error) {
    console.error('Error restoring all trash:', error);
    return { success: false, error: 'Nao foi possivel restaurar a lixeira.' };
  }
}

export async function deleteTrashItemsPermanently(
  input: TrashSelectionInput = {}
) {
  try {
    const noteIds = Array.from(new Set(input.noteIds || []));
    const selectedFolderIds = Array.from(new Set(input.folderIds || []));
    const selectedFolders = selectedFolderIds.length
      ? await db.noteFolder.findMany({
          where: { id: { in: selectedFolderIds }, deletedAt: { not: null } },
          select: { id: true, pathBeforeTrash: true, path: true },
        })
      : [];
    const folderWhere =
      selectedFolders.length > 0
        ? {
            OR: selectedFolders.flatMap((folder) => {
              const originalPath = originalFolderPath(folder);
              return [
                { id: folder.id },
                { pathBeforeTrash: { startsWith: `${originalPath}/` } },
              ];
            }),
          }
        : { id: { in: [] as string[] } };
    const folders = selectedFolders.length
      ? await db.noteFolder.findMany({
          where: { deletedAt: { not: null }, ...folderWhere },
          select: { id: true, pathBeforeTrash: true },
        })
      : [];
    const folderIds = folders.map((folder) => folder.id);
    const folderPaths = folders
      .map((folder) => folder.pathBeforeTrash)
      .filter((path): path is string => Boolean(path));
    const noteIdsFromFolders = folderPaths.length
      ? (
          await db.note.findMany({
            where: {
              status: 'ARCHIVED',
              OR: folderPaths.flatMap((path) => [
                { folderPath: path },
                { folderPath: { startsWith: `${path}/` } },
              ]),
            },
            select: { id: true },
          })
        ).map((note) => note.id)
      : [];
    const allNoteIds = Array.from(new Set([...noteIds, ...noteIdsFromFolders]));

    await db.$transaction([
      db.note.deleteMany({ where: { id: { in: allNoteIds } } }),
      db.noteFolder.deleteMany({ where: { id: { in: folderIds } } }),
    ]);

    await refreshAllLinkTargets();
    revalidateNotes();
    return {
      success: true,
      data: {
        notes: allNoteIds.length,
        folders: folderIds.length,
      },
    };
  } catch (error) {
    console.error('Error permanently deleting trash items:', error);
    return {
      success: false,
      error: 'Nao foi possivel excluir permanentemente os itens.',
    };
  }
}

export async function emptyTrash() {
  try {
    const [notes, folders] = await Promise.all([
      db.note.findMany({ where: { status: 'ARCHIVED' }, select: { id: true } }),
      db.noteFolder.findMany({
        where: { deletedAt: { not: null } },
        select: { id: true },
      }),
    ]);
    return deleteTrashItemsPermanently({
      noteIds: notes.map((note) => note.id),
      folderIds: folders.map((folder) => folder.id),
    });
  } catch (error) {
    console.error('Error emptying trash:', error);
    return { success: false, error: 'Nao foi possivel esvaziar a lixeira.' };
  }
}

export async function deleteNote(id: string) {
  try {
    await db.note.delete({ where: { id } });
    await refreshAllLinkTargets();
    revalidateNotes();
    return { success: true, data: { id } };
  } catch (error) {
    console.error('Error deleting note:', error);
    return { success: false, error: 'Nao foi possivel remover a nota.' };
  }
}

export async function createNoteAttachment(input: NoteAttachmentInput) {
  try {
    const fileName = normalizeVaultFileBase(input.fileName);
    if (!fileName || isUnsafeVaultPath(fileName)) {
      return { success: false, error: 'Nome de arquivo invalido.' };
    }
    const mimeType = input.mimeType || 'application/octet-stream';
    if (!SUPPORTED_ATTACHMENT_MIME_TYPES.has(mimeType)) {
      return { success: false, error: 'Tipo de arquivo nao suportado.' };
    }
    if (!input.dataUrl.startsWith(`data:${mimeType};base64,`)) {
      return { success: false, error: 'Conteudo do anexo invalido.' };
    }
    if ((input.size || 0) > MAX_ATTACHMENT_DATA_URL_SIZE) {
      return {
        success: false,
        error: 'A imagem excede o limite de 8 MB para anexos.',
      };
    }

    const metadata = await createUniqueAttachmentPath(
      fileName,
      input.folderPath || null
    );
    const attachment = await db.noteAttachment.create({
      data: {
        ...metadata,
        mimeType,
        size: input.size || null,
        dataUrl: input.dataUrl,
      },
    });

    revalidateNotes();
    return { success: true, data: { attachment } };
  } catch (error) {
    console.error('Error creating note attachment:', error);
    return { success: false, error: 'Nao foi possivel salvar o anexo.' };
  }
}

export async function toggleFavorite(id: string) {
  try {
    const note = await db.note.findUnique({
      where: { id },
      select: { isFavorite: true },
    });
    if (!note) return { success: false, error: 'Nota nao encontrada.' };

    const updated = await db.note.update({
      where: { id },
      data: { isFavorite: !note.isFavorite },
      select: { id: true, isFavorite: true },
    });

    revalidateNotes();
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return { success: false, error: 'Nao foi possivel favoritar a nota.' };
  }
}

export async function importVault(files: VaultImportFile[]) {
  try {
    const usableFiles = files.filter(
      (file) => !isUnsafeVaultPath(file.path) && !isIgnoredVaultPath(file.path)
    );
    const markdownFiles = usableFiles.filter(
      (file) => getVaultFileMetadata(file.path).extension === 'md'
    );
    if (!markdownFiles.length) {
      return { success: false, error: 'Nenhum arquivo .md encontrado.' };
    }

    const rawAttachmentFiles = usableFiles.filter((file) => {
      const metadata = getVaultFileMetadata(file.path);
      return metadata.extension !== 'md';
    });
    const attachmentFiles = rawAttachmentFiles.filter(
      (file) =>
        Boolean(file.dataUrl) &&
        Boolean(file.mimeType) &&
        SUPPORTED_ATTACHMENT_MIME_TYPES.has(file.mimeType!)
    );
    const existingAttachments = attachmentFiles.length
      ? await db.noteAttachment.findMany({
          where: {
            filePath: {
              in: attachmentFiles.map(
                (file) => getVaultFileMetadata(file.path).filePath
              ),
            },
          },
          select: { filePath: true },
        })
      : [];
    const existingAttachmentPaths = new Set(
      existingAttachments.map((attachment) => attachment.filePath)
    );
    let attachmentsCreated = 0;
    let attachmentsUpdated = 0;
    let imagesImported = 0;
    let otherAttachmentsImported = 0;

    await Promise.all(
      attachmentFiles.map((file) => {
        const metadata = getVaultFileMetadata(file.path);
        if (existingAttachmentPaths.has(metadata.filePath)) {
          attachmentsUpdated += 1;
        } else {
          attachmentsCreated += 1;
        }
        if (file.mimeType?.startsWith('image/')) imagesImported += 1;
        else otherAttachmentsImported += 1;

        return db.noteAttachment.upsert({
          where: { filePath: metadata.filePath },
          create: {
            ...metadata,
            mimeType: file.mimeType || null,
            size: file.size || null,
            dataUrl: file.dataUrl || null,
          },
          update: {
            fileName: metadata.fileName,
            folderPath: metadata.folderPath,
            folderName: metadata.folderName,
            extension: metadata.extension,
            mimeType: file.mimeType || null,
            size: file.size || null,
            dataUrl: file.dataUrl || null,
            importedAt: new Date(),
          },
        });
      })
    );

    const results: {
      id: string;
      title: string;
      slug: string;
      updated: boolean;
    }[] = [];

    for (const file of markdownFiles) {
      const metadata = getVaultFileMetadata(file.path);
      const folder = await ensureNoteFolderPath(metadata.folderPath);
      const content = file.content || '';
      const title = inferNoteTitleFromPath(metadata.fileName);
      const tags = extractNoteTags(content);
      const existing = await db.note.findUnique({
        where: { filePath: metadata.filePath },
        select: { id: true, slug: true },
      });
      const slug = await createUniqueSlug(title, existing?.slug, existing?.id);

      const note = await db.note.upsert({
        where: { filePath: metadata.filePath },
        create: {
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
          ...metadata,
          folderId: folder?.id || null,
          importedAt: new Date(),
        },
      });

      await syncNoteRelations(note.id, content, tags);
      await syncNoteTasks(note.id, content, note.projectId);
      results.push({
        id: note.id,
        title: note.title,
        slug: note.slug,
        updated: Boolean(existing),
      });
    }

    await refreshAllLinkTargets();
    revalidateNotes();

    return {
      success: true,
      data: {
        imported: results.length,
        attachments: {
          total: attachmentFiles.length,
          created: attachmentsCreated,
          updated: attachmentsUpdated,
          ignored: rawAttachmentFiles.length - attachmentFiles.length,
          images: imagesImported,
          other: otherAttachmentsImported,
        },
        notes: results,
      },
    };
  } catch (error) {
    console.error('Error importing vault:', error);
    return { success: false, error: 'Nao foi possivel importar o vault.' };
  }
}
