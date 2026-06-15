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

async function nextFolderPosition(parentId: string | null) {
  const aggregate = await db.noteFolder.aggregate({
    where: { parentId },
    _max: { position: true },
  });
  return (aggregate._max.position ?? -1) + 1;
}

async function nextNotePosition(folderId: string | null) {
  const aggregate = await db.note.aggregate({
    where: { folderId },
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
    } else if (folder.parentId !== parentId || folder.name !== segment) {
      folder = await db.noteFolder.update({
        where: { id: folder.id },
        data: { parentId, name: segment },
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

export async function syncFoldersFromImportedNotes() {
  try {
    const paths = await db.note.findMany({
      where: { folderPath: { not: null } },
      distinct: ['folderPath'],
      select: { folderPath: true },
      orderBy: { folderPath: 'asc' },
    });

    for (const item of paths) {
      await ensureNoteFolderPath(item.folderPath);
    }

    const folders = await db.noteFolder.findMany({
      select: { id: true, path: true },
    });
    const folderByPath = new Map(
      folders.map((folder) => [folder.path, folder.id])
    );
    const notes = await db.note.findMany({
      where: { folderPath: { not: null } },
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
      db.note.count({ where: { isFavorite: true } }),
      db.note.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, slug: true, updatedAt: true },
      }),
      db.note.findMany({
        take: 5,
        orderBy: [{ viewCount: 'desc' }, { updatedAt: 'desc' }],
        select: { id: true, title: true, slug: true, viewCount: true },
      }),
      db.noteFolder.findMany({
        orderBy: [{ parentId: 'asc' }, { position: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { notes: true } },
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
      db.note.count({ where: { folderPath: null } }),
      db.note.findMany({
        orderBy: { title: 'asc' },
        select: { id: true, title: true, slug: true, filePath: true },
      }),
    ]);

    return {
      success: true,
      data: {
        notes,
        stats: {
          total: await db.note.count(),
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
          count: folder._count.notes,
        })),
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
            ? input.excerpt.trim() || null
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

    const attachmentFiles = usableFiles.filter((file) => {
      const metadata = getVaultFileMetadata(file.path);
      return metadata.extension !== 'md' && Boolean(file.dataUrl);
    });

    await Promise.all(
      attachmentFiles.map((file) => {
        const metadata = getVaultFileMetadata(file.path);
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
        attachments: attachmentFiles.length,
        notes: results,
      },
    };
  } catch (error) {
    console.error('Error importing vault:', error);
    return { success: false, error: 'Nao foi possivel importar o vault.' };
  }
}
