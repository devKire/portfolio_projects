'use server';

import { Prisma, type OrganizationRole } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { requireUser } from '@/lib/auth/session';
import {
  refreshKnowledgeLinkTargets,
  syncKnowledgeRelations,
  type KnowledgeScopeWhere,
} from '@/lib/knowledge/relations';
import {
  extractAttachmentReferences,
  joinKnowledgePath,
  relativeKnowledgePath,
  replaceKnowledgePathPrefix,
  reserveUniqueFilePath,
  reserveUniqueFolderPath,
  reserveUniqueSlug,
  rewriteKnowledgeReference,
} from '@/lib/knowledge/transfer-planning';
import { normalizeVaultPath } from '@/lib/notes';
import {
  organizationNoteScope,
  personalNoteScope,
} from '@/lib/organizations/policy';
import { OrganizationAuthorizationError } from '@/lib/organizations/authorization';
import { db } from '@/lib/prisma';

export type KnowledgeTransferAdjustment = {
  type: 'folder' | 'note' | 'attachment';
  from: string;
  to: string;
};

export type KnowledgeTransferResult = {
  organizationId: string;
  role: OrganizationRole;
  noteIds: string[];
  folderIds: string[];
  attachmentIds: string[];
  detachedTaskCount: number;
  adjustments: KnowledgeTransferAdjustment[];
};

type TransferAttachment = {
  id: string;
  fileName: string;
  filePath: string;
  folderPath: string | null;
};

function personalScope(userId: string): KnowledgeScopeWhere {
  return {
    userId,
    organizationId: null,
    scopeKey: personalNoteScope(userId),
  };
}

function organizationScope(organizationId: string): KnowledgeScopeWhere {
  return {
    organizationId,
    scopeKey: organizationNoteScope(organizationId),
  };
}

function folderName(path: string | null) {
  return path?.split('/').filter(Boolean).at(-1) || null;
}

function isInsideFolder(path: string | null, rootPath: string) {
  return Boolean(
    path && (path === rootPath || path.startsWith(`${rootPath}/`))
  );
}

function isRetryableTransferError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2002' || error.code === 'P2034')
  );
}

async function runTransferTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 30_000,
      });
    } catch (error) {
      lastError = error;
      if (!isRetryableTransferError(error)) throw error;
    }
  }
  throw lastError;
}

async function requireTransferMembership(
  tx: Prisma.TransactionClient,
  userId: string,
  organizationId: string
) {
  const membership = await tx.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
      organization: { active: true },
    },
    select: { role: true },
  });
  if (!membership) throw new OrganizationAuthorizationError();
  return membership;
}

async function requireDestinationFolder(
  tx: Prisma.TransactionClient,
  organizationId: string,
  folderId: string | null | undefined
) {
  if (!folderId) return null;
  const folder = await tx.noteFolder.findFirst({
    where: {
      id: folderId,
      ...organizationScope(organizationId),
      deletedAt: null,
    },
  });
  if (!folder) throw new OrganizationAuthorizationError();
  return folder;
}

function selectReferencedAttachments(
  content: string,
  noteFolderPath: string | null,
  attachments: TransferAttachment[]
) {
  const selected = new Map<string, TransferAttachment>();
  for (const reference of extractAttachmentReferences(content)) {
    const normalized = normalizeVaultPath(reference);
    const relativePath = noteFolderPath
      ? joinKnowledgePath(noteFolderPath, normalized)
      : normalized;
    const exact = attachments.find(
      (attachment) =>
        normalizeVaultPath(attachment.filePath) === normalized ||
        normalizeVaultPath(attachment.filePath) === relativePath
    );
    if (exact) {
      selected.set(exact.id, exact);
      continue;
    }
    const sameFolder = attachments.find(
      (attachment) =>
        attachment.fileName === normalized.split('/').at(-1) &&
        attachment.folderPath === noteFolderPath
    );
    if (sameFolder) {
      selected.set(sameFolder.id, sameFolder);
      continue;
    }
    const byName = attachments.filter(
      (attachment) => attachment.fileName === normalized.split('/').at(-1)
    );
    if (byName.length === 1) selected.set(byName[0].id, byName[0]);
  }
  return Array.from(selected.values());
}

function transferError(error: unknown, fallback: string) {
  if (error instanceof OrganizationAuthorizationError) return error.message;
  console.error(fallback, error);
  return fallback;
}

function revalidateKnowledge() {
  revalidatePath('/admin');
  revalidatePath('/admin/notes');
  revalidatePath('/admin/kcs');
}

export async function getKnowledgeTransferTargets() {
  try {
    const user = await requireUser();
    const memberships = await db.organizationMember.findMany({
      where: { userId: user.id, organization: { active: true } },
      orderBy: { organization: { name: 'asc' } },
      select: {
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
            noteFolders: {
              where: { deletedAt: null },
              orderBy: [{ path: 'asc' }],
              select: { id: true, name: true, path: true, parentId: true },
            },
          },
        },
      },
    });
    return {
      success: true as const,
      data: memberships.map((membership) => ({
        id: membership.organization.id,
        name: membership.organization.name,
        role: membership.role,
        folders: membership.organization.noteFolders,
      })),
    };
  } catch (error) {
    return {
      success: false as const,
      error: transferError(error, 'Não foi possível carregar os destinos.'),
    };
  }
}

export async function movePersonalNoteToOrganization(input: {
  noteId: string;
  organizationId: string;
  folderId?: string | null;
}) {
  try {
    const user = await requireUser();
    const result = await runTransferTransaction(async (tx) => {
      const membership = await requireTransferMembership(
        tx,
        user.id,
        input.organizationId
      );
      const sourceScope = personalScope(user.id);
      const targetScope = organizationScope(input.organizationId);
      const note = await tx.note.findFirst({
        where: { id: input.noteId, ...sourceScope },
        include: { tags: { select: { name: true } } },
      });
      if (!note) throw new OrganizationAuthorizationError();
      const destination = await requireDestinationFolder(
        tx,
        input.organizationId,
        input.folderId
      );

      const [targetNotes, targetAttachments, personalAttachments] =
        await Promise.all([
          tx.note.findMany({
            where: targetScope,
            select: { slug: true, filePath: true },
          }),
          tx.noteAttachment.findMany({
            where: targetScope,
            select: { filePath: true },
          }),
          tx.noteAttachment.findMany({
            where: sourceScope,
            select: {
              id: true,
              fileName: true,
              filePath: true,
              folderPath: true,
            },
          }),
        ]);

      const usedSlugs = new Set(targetNotes.map((item) => item.slug));
      const usedNotePaths = new Set(
        targetNotes.flatMap((item) => (item.filePath ? [item.filePath] : []))
      );
      const usedAttachmentPaths = new Set(
        targetAttachments.map((item) => item.filePath)
      );
      const adjustments: KnowledgeTransferAdjustment[] = [];
      const slug = reserveUniqueSlug(note.slug, usedSlugs);
      if (slug !== note.slug) {
        adjustments.push({ type: 'note', from: note.slug, to: slug });
      }
      const originalFileName = note.fileName || `${note.slug}.md`;
      const preferredFileName =
        slug !== note.slug && originalFileName === `${note.slug}.md`
          ? `${slug}.md`
          : originalFileName;
      const preferredFilePath = joinKnowledgePath(
        destination?.path || null,
        preferredFileName
      );
      const filePath = reserveUniqueFilePath(preferredFilePath, usedNotePaths);
      const fileName = filePath.split('/').at(-1) || preferredFileName;
      if (filePath !== preferredFilePath) {
        adjustments.push({
          type: 'note',
          from: preferredFilePath,
          to: filePath,
        });
      }

      const referencedAttachments = selectReferencedAttachments(
        note.content,
        note.folderPath,
        personalAttachments
      );
      let nextContent = note.content;
      const attachmentIds: string[] = [];
      for (const attachment of referencedAttachments) {
        const relativeFolder =
          note.folderPath &&
          attachment.folderPath?.startsWith(`${note.folderPath}/`)
            ? attachment.folderPath.slice(note.folderPath.length + 1)
            : !note.folderPath
              ? attachment.folderPath
              : null;
        const targetFolderPath = relativeFolder
          ? joinKnowledgePath(destination?.path || null, relativeFolder)
          : destination?.path || null;
        const preferredPath = joinKnowledgePath(
          targetFolderPath,
          attachment.fileName
        );
        const nextPath = reserveUniqueFilePath(
          preferredPath,
          usedAttachmentPaths
        );
        const nextFileName = nextPath.split('/').at(-1) || attachment.fileName;
        const oldRelative = relativeKnowledgePath(
          note.folderPath,
          attachment.filePath
        );
        const nextRelative = relativeKnowledgePath(
          destination?.path || null,
          nextPath
        );
        nextContent = rewriteKnowledgeReference(
          nextContent,
          [attachment.filePath, attachment.fileName, oldRelative],
          nextRelative
        );
        if (nextPath !== preferredPath) {
          adjustments.push({
            type: 'attachment',
            from: preferredPath,
            to: nextPath,
          });
        }
        await tx.noteAttachment.update({
          where: { id: attachment.id },
          data: {
            ...targetScope,
            fileName: nextFileName,
            filePath: nextPath,
            folderPath: targetFolderPath,
            folderName: folderName(targetFolderPath),
          },
        });
        attachmentIds.push(attachment.id);
      }

      const detachedTasks = await tx.task.updateMany({
        where: {
          noteId: note.id,
          organizationId: null,
          userId: user.id,
        },
        data: { noteId: null, noteTaskKey: null },
      });
      await tx.noteLink.deleteMany({
        where: { OR: [{ sourceNoteId: note.id }, { targetNoteId: note.id }] },
      });
      await tx.note.update({
        where: { id: note.id },
        data: {
          ...targetScope,
          content: nextContent,
          slug,
          fileName,
          filePath,
          folderId: destination?.id || null,
          folderPath: destination?.path || null,
          folderName: destination?.name || null,
          visibility: 'PRIVATE',
          projectId: null,
          trashedAt: null,
        },
      });
      await syncKnowledgeRelations(tx, {
        scope: targetScope,
        noteId: note.id,
        content: nextContent,
        explicitTags: note.tags.map((tag) => tag.name),
      });
      await refreshKnowledgeLinkTargets(tx, sourceScope);
      await refreshKnowledgeLinkTargets(tx, targetScope);

      return {
        organizationId: input.organizationId,
        role: membership.role,
        noteIds: [note.id],
        folderIds: [],
        attachmentIds,
        detachedTaskCount: detachedTasks.count,
        adjustments,
      } satisfies KnowledgeTransferResult;
    });
    revalidateKnowledge();
    return { success: true as const, data: result };
  } catch (error) {
    return {
      success: false as const,
      error: transferError(error, 'Não foi possível transferir a nota.'),
    };
  }
}

export async function movePersonalFolderToOrganization(input: {
  folderId: string;
  organizationId: string;
  destinationFolderId?: string | null;
}) {
  try {
    const user = await requireUser();
    const result = await runTransferTransaction(async (tx) => {
      const membership = await requireTransferMembership(
        tx,
        user.id,
        input.organizationId
      );
      const sourceScope = personalScope(user.id);
      const targetScope = organizationScope(input.organizationId);
      const root = await tx.noteFolder.findFirst({
        where: { id: input.folderId, ...sourceScope, deletedAt: null },
      });
      if (!root) throw new OrganizationAuthorizationError();
      const destination = await requireDestinationFolder(
        tx,
        input.organizationId,
        input.destinationFolderId
      );
      const folders = await tx.noteFolder.findMany({
        where: {
          ...sourceScope,
          deletedAt: null,
          OR: [{ id: root.id }, { path: { startsWith: `${root.path}/` } }],
        },
        orderBy: { path: 'asc' },
      });
      const sourceFolderIds = folders.map((folder) => folder.id);
      const [
        notes,
        attachments,
        targetFolders,
        targetNotes,
        targetAttachments,
      ] = await Promise.all([
        tx.note.findMany({
          where: {
            ...sourceScope,
            OR: [
              { folderId: { in: sourceFolderIds } },
              { folderPath: root.path },
              { folderPath: { startsWith: `${root.path}/` } },
            ],
          },
          include: { tags: { select: { name: true } } },
        }),
        tx.noteAttachment.findMany({
          where: {
            ...sourceScope,
            OR: [
              { folderPath: root.path },
              { folderPath: { startsWith: `${root.path}/` } },
            ],
          },
        }),
        tx.noteFolder.findMany({ where: targetScope }),
        tx.note.findMany({
          where: targetScope,
          select: { slug: true, filePath: true },
        }),
        tx.noteAttachment.findMany({
          where: targetScope,
          select: { filePath: true },
        }),
      ]);

      const adjustments: KnowledgeTransferAdjustment[] = [];
      const usedFolderPaths = new Set(
        targetFolders.map((folder) => folder.path)
      );
      const activeFolderByPath = new Map(
        targetFolders
          .filter((folder) => !folder.deletedAt)
          .map((folder) => [folder.path, folder])
      );
      const folderTargets = new Map<
        string,
        { id: string; name: string; path: string; reused: boolean }
      >();

      for (const folder of folders.sort(
        (left, right) =>
          left.path.split('/').length - right.path.split('/').length
      )) {
        const parentTarget =
          folder.id === root.id
            ? destination
            : folder.parentId
              ? folderTargets.get(folder.parentId) || null
              : destination;
        const candidate = joinKnowledgePath(
          parentTarget?.path || null,
          folder.name
        );
        const existing = activeFolderByPath.get(candidate);
        if (existing) {
          folderTargets.set(folder.id, {
            id: existing.id,
            name: existing.name,
            path: existing.path,
            reused: true,
          });
          adjustments.push({
            type: 'folder',
            from: folder.path,
            to: existing.path,
          });
          continue;
        }
        const path = reserveUniqueFolderPath(candidate, usedFolderPaths);
        const name = folderName(path) || folder.name;
        if (path !== candidate) {
          adjustments.push({ type: 'folder', from: candidate, to: path });
        }
        const target = { id: folder.id, name, path, reused: false };
        folderTargets.set(folder.id, target);
        activeFolderByPath.set(path, { ...folder, ...target });
      }

      const mapFolderPath = (path: string | null) => {
        if (!path) return null;
        const source = folders
          .filter((folder) => isInsideFolder(path, folder.path))
          .sort((left, right) => right.path.length - left.path.length)[0];
        if (!source) return path;
        const target = folderTargets.get(source.id);
        return target
          ? replaceKnowledgePathPrefix(path, source.path, target.path)
          : path;
      };

      for (const folder of folders) {
        const target = folderTargets.get(folder.id)!;
        if (target.reused) continue;
        const parentId =
          folder.id === root.id
            ? destination?.id || null
            : folder.parentId
              ? folderTargets.get(folder.parentId)?.id || null
              : destination?.id || null;
        await tx.noteFolder.update({
          where: { id: folder.id },
          data: {
            ...targetScope,
            name: target.name,
            path: target.path,
            parentId,
          },
        });
      }

      const usedSlugs = new Set(targetNotes.map((note) => note.slug));
      const usedNotePaths = new Set(
        targetNotes.flatMap((note) => (note.filePath ? [note.filePath] : []))
      );
      const notePlans = notes.map((note) => {
        const targetFolder = note.folderId
          ? folderTargets.get(note.folderId) || null
          : null;
        const folderPath = targetFolder?.path || mapFolderPath(note.folderPath);
        const slug = reserveUniqueSlug(note.slug, usedSlugs);
        const originalFileName = note.fileName || `${note.slug}.md`;
        const preferredFileName =
          slug !== note.slug && originalFileName === `${note.slug}.md`
            ? `${slug}.md`
            : originalFileName;
        const preferredPath = joinKnowledgePath(folderPath, preferredFileName);
        const filePath = reserveUniqueFilePath(preferredPath, usedNotePaths);
        if (slug !== note.slug) {
          adjustments.push({ type: 'note', from: note.slug, to: slug });
        }
        if (filePath !== preferredPath) {
          adjustments.push({ type: 'note', from: preferredPath, to: filePath });
        }
        return {
          note,
          slug,
          folderId: targetFolder?.id || null,
          folderPath,
          filePath,
          fileName: filePath.split('/').at(-1) || preferredFileName,
          content: note.content,
        };
      });

      const usedAttachmentPaths = new Set(
        targetAttachments.map((attachment) => attachment.filePath)
      );
      const attachmentPlans = attachments.map((attachment) => {
        const folderPath = mapFolderPath(attachment.folderPath);
        const preferredPath = joinKnowledgePath(
          folderPath,
          attachment.fileName
        );
        const filePath = reserveUniqueFilePath(
          preferredPath,
          usedAttachmentPaths
        );
        if (filePath !== preferredPath) {
          adjustments.push({
            type: 'attachment',
            from: preferredPath,
            to: filePath,
          });
        }
        return {
          attachment,
          folderPath,
          filePath,
          fileName: filePath.split('/').at(-1) || attachment.fileName,
        };
      });

      for (const plan of notePlans) {
        let content = plan.content;
        for (const attachmentPlan of attachmentPlans) {
          const oldRelative = relativeKnowledgePath(
            plan.note.folderPath,
            attachmentPlan.attachment.filePath
          );
          const nextRelative = relativeKnowledgePath(
            plan.folderPath,
            attachmentPlan.filePath
          );
          content = rewriteKnowledgeReference(
            content,
            [
              attachmentPlan.attachment.filePath,
              attachmentPlan.attachment.fileName,
              oldRelative,
            ],
            nextRelative
          );
        }
        for (const targetPlan of notePlans) {
          const oldRelative = targetPlan.note.filePath
            ? relativeKnowledgePath(
                plan.note.folderPath,
                targetPlan.note.filePath
              )
            : null;
          const nextRelative = relativeKnowledgePath(
            plan.folderPath,
            targetPlan.filePath
          );
          content = rewriteKnowledgeReference(
            content,
            [
              targetPlan.note.filePath || '',
              targetPlan.note.fileName || '',
              oldRelative || '',
            ],
            nextRelative
          );
          if (targetPlan.slug !== targetPlan.note.slug) {
            content = rewriteKnowledgeReference(
              content,
              [targetPlan.note.slug],
              targetPlan.slug
            );
          }
        }
        plan.content = content;
      }

      const noteIds = notePlans.map((plan) => plan.note.id);
      const detachedTasks = await tx.task.updateMany({
        where: {
          noteId: { in: noteIds },
          organizationId: null,
          userId: user.id,
        },
        data: { noteId: null, noteTaskKey: null },
      });
      await tx.noteLink.deleteMany({
        where: {
          OR: [
            { sourceNoteId: { in: noteIds } },
            { targetNoteId: { in: noteIds } },
          ],
        },
      });

      for (const plan of notePlans) {
        await tx.note.update({
          where: { id: plan.note.id },
          data: {
            ...targetScope,
            slug: plan.slug,
            content: plan.content,
            visibility: 'PRIVATE',
            projectId: null,
            folderId: plan.folderId,
            folderPath: plan.folderPath,
            folderName: folderName(plan.folderPath),
            fileName: plan.fileName,
            filePath: plan.filePath,
            trashedAt: null,
          },
        });
      }
      for (const plan of attachmentPlans) {
        await tx.noteAttachment.update({
          where: { id: plan.attachment.id },
          data: {
            ...targetScope,
            folderPath: plan.folderPath,
            folderName: folderName(plan.folderPath),
            filePath: plan.filePath,
            fileName: plan.fileName,
          },
        });
      }

      const reusedSourceIds = folders
        .filter((folder) => folderTargets.get(folder.id)?.reused)
        .map((folder) => folder.id);
      if (reusedSourceIds.length) {
        await tx.noteFolder.deleteMany({
          where: { id: { in: reusedSourceIds }, ...sourceScope },
        });
      }

      for (const plan of notePlans) {
        await syncKnowledgeRelations(tx, {
          scope: targetScope,
          noteId: plan.note.id,
          content: plan.content,
          explicitTags: plan.note.tags.map((tag) => tag.name),
        });
      }
      await refreshKnowledgeLinkTargets(tx, sourceScope);
      await refreshKnowledgeLinkTargets(tx, targetScope);

      return {
        organizationId: input.organizationId,
        role: membership.role,
        noteIds,
        folderIds: Array.from(
          new Set(folders.map((folder) => folderTargets.get(folder.id)!.id))
        ),
        attachmentIds: attachmentPlans.map((plan) => plan.attachment.id),
        detachedTaskCount: detachedTasks.count,
        adjustments,
      } satisfies KnowledgeTransferResult;
    });
    revalidateKnowledge();
    return { success: true as const, data: result };
  } catch (error) {
    return {
      success: false as const,
      error: transferError(error, 'Não foi possível transferir a pasta.'),
    };
  }
}
