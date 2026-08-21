import type { Prisma } from '@prisma/client';

import {
  extractNoteTags,
  extractWikiLinks,
  normalizeNoteTag,
  resolveWikiLinkTarget,
  wikiLinkTargetStorageKey,
} from '@/lib/notes';

export type KnowledgeScopeWhere = {
  scopeKey: string;
  organizationId: string | null;
  userId?: string;
};

type KnowledgeClient = Pick<
  Prisma.TransactionClient,
  'note' | 'noteTag' | 'noteLink'
>;

export async function syncKnowledgeRelations(
  client: KnowledgeClient,
  input: {
    scope: KnowledgeScopeWhere;
    noteId: string;
    content: string;
    explicitTags?: string[];
  }
) {
  const [source, notes] = await Promise.all([
    client.note.findFirst({
      where: { id: input.noteId, ...input.scope },
      select: { folderPath: true },
    }),
    client.note.findMany({
      where: { ...input.scope, status: { not: 'ARCHIVED' } },
      select: {
        id: true,
        title: true,
        slug: true,
        filePath: true,
        folderPath: true,
      },
    }),
  ]);
  if (!source)
    throw new Error('Knowledge note is outside the authorized scope.');

  const tags = extractNoteTags(input.content, input.explicitTags || []);
  const links = extractWikiLinks(input.content).map((link) => {
    const resolution = resolveWikiLinkTarget(
      link.targetTitle,
      notes,
      source.folderPath
    );
    const target = resolution.status === 'resolved' ? resolution.note : null;
    return {
      ...link,
      targetNoteId: target?.id || null,
      targetSlug: target?.slug || wikiLinkTargetStorageKey(link.targetTitle),
      targetExists: Boolean(target),
    };
  });

  await client.noteTag.deleteMany({ where: { noteId: input.noteId } });
  await client.noteLink.deleteMany({ where: { sourceNoteId: input.noteId } });
  if (tags.length) {
    await client.noteTag.createMany({
      data: tags.map((tag) => ({
        noteId: input.noteId,
        name: tag,
        slug: normalizeNoteTag(tag),
      })),
      skipDuplicates: true,
    });
  }
  if (links.length) {
    await client.noteLink.createMany({
      data: links.map((link) => ({
        sourceNoteId: input.noteId,
        targetNoteId: link.targetNoteId,
        targetSlug: link.targetSlug,
        targetTitle: link.targetTitle,
        alias: link.alias,
        occurrences: link.occurrences,
        targetExists: link.targetExists,
      })),
      skipDuplicates: true,
    });
  }
}

export async function refreshKnowledgeLinkTargets(
  client: KnowledgeClient,
  scope: KnowledgeScopeWhere
) {
  const [notes, links] = await Promise.all([
    client.note.findMany({
      where: { ...scope, status: { not: 'ARCHIVED' } },
      select: {
        id: true,
        title: true,
        slug: true,
        filePath: true,
        folderPath: true,
      },
    }),
    client.noteLink.findMany({
      where: { sourceNote: scope },
      select: {
        id: true,
        targetTitle: true,
        sourceNote: { select: { folderPath: true } },
      },
    }),
  ]);

  await Promise.all(
    links.map((link) => {
      const resolution = resolveWikiLinkTarget(
        link.targetTitle,
        notes,
        link.sourceNote.folderPath
      );
      const target = resolution.status === 'resolved' ? resolution.note : null;
      return client.noteLink.update({
        where: { id: link.id },
        data: {
          targetNoteId: target?.id || null,
          targetSlug:
            target?.slug || wikiLinkTargetStorageKey(link.targetTitle),
          targetExists: Boolean(target),
        },
      });
    })
  );
}
