'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@/lib/auth/session';
import {
  OrganizationAuthorizationError,
  requireKcsNoteAccess,
  requireOrganizationMembership,
} from '@/lib/organizations/authorization';
import {
  canCommentKcs,
  canDeleteKcsComment,
  canEditKcsComment,
} from '@/lib/organizations/policy';
import { MAX_NOTE_COMMENT_LENGTH } from '@/lib/knowledge/comments';
import { db } from '@/lib/prisma';

function cleanComment(value: string) {
  return value.trim().slice(0, MAX_NOTE_COMMENT_LENGTH);
}

function revalidateKcsComments() {
  revalidatePath('/admin');
  revalidatePath('/admin/kcs');
}

function commentError(error: unknown, fallback: string) {
  if (error instanceof OrganizationAuthorizationError) return error.message;
  console.error(fallback, error);
  return fallback;
}

const commentInclude = {
  author: { select: { id: true, name: true, username: true } },
} as const;

export async function getNoteComments(organizationId: string, noteId: string) {
  try {
    const user = await requireUser();
    await requireKcsNoteAccess(user.id, organizationId, noteId);
    const comments = await db.noteComment.findMany({
      where: { organizationId, noteId },
      orderBy: { createdAt: 'asc' },
      include: commentInclude,
    });
    return { success: true as const, data: comments };
  } catch (error) {
    return {
      success: false as const,
      error: commentError(error, 'Não foi possível carregar os comentários.'),
    };
  }
}

export async function createNoteComment(
  organizationId: string,
  noteId: string,
  contentInput: string
) {
  try {
    const user = await requireUser();
    const { membership, note } = await requireKcsNoteAccess(
      user.id,
      organizationId,
      noteId
    );
    if (!canCommentKcs(membership.role)) {
      throw new OrganizationAuthorizationError();
    }
    const content = cleanComment(contentInput);
    if (!content) {
      return { success: false as const, error: 'Comentário vazio.' };
    }
    const comment = await db.noteComment.create({
      data: {
        noteId: note.id,
        organizationId,
        authorId: user.id,
        content,
      },
      include: commentInclude,
    });
    revalidateKcsComments();
    return { success: true as const, data: comment };
  } catch (error) {
    return {
      success: false as const,
      error: commentError(error, 'Não foi possível adicionar o comentário.'),
    };
  }
}

export async function updateNoteComment(
  organizationId: string,
  commentId: string,
  contentInput: string
) {
  try {
    const user = await requireUser();
    await requireOrganizationMembership(user.id, organizationId);
    const comment = await db.noteComment.findFirst({
      where: { id: commentId, organizationId },
      select: { id: true, noteId: true, authorId: true },
    });
    if (!comment) throw new OrganizationAuthorizationError();
    await requireKcsNoteAccess(user.id, organizationId, comment.noteId);
    if (!canEditKcsComment({ actorId: user.id, authorId: comment.authorId })) {
      throw new OrganizationAuthorizationError();
    }
    const content = cleanComment(contentInput);
    if (!content) {
      return { success: false as const, error: 'Comentário vazio.' };
    }
    const updated = await db.noteComment.update({
      where: { id: comment.id },
      data: { content },
      include: commentInclude,
    });
    revalidateKcsComments();
    return { success: true as const, data: updated };
  } catch (error) {
    return {
      success: false as const,
      error: commentError(error, 'Não foi possível editar o comentário.'),
    };
  }
}

export async function deleteNoteComment(
  organizationId: string,
  commentId: string
) {
  try {
    const user = await requireUser();
    const membership = await requireOrganizationMembership(
      user.id,
      organizationId
    );
    const comment = await db.noteComment.findFirst({
      where: { id: commentId, organizationId },
      select: { id: true, noteId: true, authorId: true },
    });
    if (!comment) throw new OrganizationAuthorizationError();
    await requireKcsNoteAccess(user.id, organizationId, comment.noteId);
    if (
      !canDeleteKcsComment({
        role: membership.role,
        actorId: user.id,
        authorId: comment.authorId,
      })
    ) {
      throw new OrganizationAuthorizationError();
    }
    await db.noteComment.delete({ where: { id: comment.id } });
    revalidateKcsComments();
    return { success: true as const, data: { commentId: comment.id } };
  } catch (error) {
    return {
      success: false as const,
      error: commentError(error, 'Não foi possível excluir o comentário.'),
    };
  }
}
