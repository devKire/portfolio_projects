'use server';

import { Prisma, type ChatChannelType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { requireUser } from '@/lib/auth/session';
import {
  chatChannelInclude,
  getChatChannelAccess,
  getChatMessageAccess,
  requireChatMessageModeration,
} from '@/lib/chat/authorization';
import {
  CHAT_EDIT_WINDOW_MS,
  CHAT_MESSAGE_MAX_LENGTH,
  CHAT_PAGE_SIZE,
  CHAT_REACTIONS,
} from '@/lib/chat/config';
import {
  chatMessageInclude,
  createChatMessage,
  getDirectConversationReadAt,
  replaceChatMentions,
  serializeChatAttachment,
  serializeChatMessagesForViewer,
} from '@/lib/chat/messages';
import { enforceChatReactionRateLimit } from '@/lib/chat/rate-limit';
import type {
  ChatMessagesPageDTO,
  ChatSearchInput,
  ChatWorkspaceDTO,
} from '@/lib/chat/types';
import {
  OrganizationAuthorizationError,
  requireOrganizationMembership,
} from '@/lib/organizations/authorization';
import {
  canCreateChannel,
  canManageChannel,
  canPinMessage,
  isOrganizationManager,
} from '@/lib/organizations/policy';
import { db } from '@/lib/prisma';

export type ChatChannelInput = {
  organizationId: string;
  name: string;
  description?: string;
  type: 'ORGANIZATION' | 'TEAM' | 'PRIVATE';
  teamId?: string | null;
  memberIds?: string[];
};

export type ChatSendInput = {
  organizationId: string;
  channelId: string;
  content: string;
  replyToId?: string | null;
  eventId?: string | null;
  taskId?: string | null;
  ticketId?: string | null;
  noteId?: string | null;
  clientNonce?: string | null;
};

function actionError(error: unknown, fallback: string) {
  if (error instanceof OrganizationAuthorizationError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  console.error(fallback, error);
  return fallback;
}

function revalidateChat() {
  revalidatePath('/admin');
}

function normalizeIds(values: string[] | undefined) {
  return Array.from(
    new Set((values || []).map((value) => value.trim()).filter(Boolean))
  );
}

function cleanChannelInput(input: ChatChannelInput) {
  const name = input.name.trim().replace(/\s+/g, ' ').slice(0, 80);
  if (name.length < 2) throw new Error('Nome deve ter ao menos 2 caracteres.');
  return {
    organizationId: input.organizationId.trim(),
    name,
    description: input.description?.trim().slice(0, 1000) || null,
    type: input.type,
    teamId: input.teamId?.trim() || null,
    memberIds: normalizeIds(input.memberIds),
  };
}

async function validateChannelTargets(
  tx: Prisma.TransactionClient,
  actorId: string,
  input: ReturnType<typeof cleanChannelInput>
) {
  const membership = await tx.organizationMember.findFirst({
    where: {
      organizationId: input.organizationId,
      userId: actorId,
      organization: { active: true },
    },
    select: { role: true },
  });
  if (!membership || !canCreateChannel(membership.role)) {
    throw new OrganizationAuthorizationError();
  }
  if (input.type === 'TEAM') {
    if (!input.teamId) throw new Error('Selecione uma equipe.');
    const team = await tx.team.findFirst({
      where: {
        id: input.teamId,
        organizationId: input.organizationId,
        active: true,
      },
      select: { id: true },
    });
    if (!team) throw new OrganizationAuthorizationError();
    return { memberIds: [] as string[] };
  }
  if (input.teamId) throw new OrganizationAuthorizationError();
  if (input.type !== 'PRIVATE') return { memberIds: [] as string[] };
  const memberIds = Array.from(new Set([actorId, ...input.memberIds]));
  const members = await tx.organizationMember.findMany({
    where: {
      organizationId: input.organizationId,
      userId: { in: memberIds },
    },
    select: { userId: true },
  });
  if (members.length !== memberIds.length) {
    throw new OrganizationAuthorizationError();
  }
  return { memberIds };
}

export async function getChatWorkspace(organizationId: string) {
  try {
    const user = await requireUser();
    const membership = await requireOrganizationMembership(
      user.id,
      organizationId
    );
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, createdById: true },
    });
    if (!organization) throw new OrganizationAuthorizationError();
    await db.chatChannel.upsert({
      where: { organizationId_name: { organizationId, name: 'Geral' } },
      update: {},
      create: {
        organizationId,
        name: 'Geral',
        description: 'Canal geral da organização.',
        type: 'ORGANIZATION',
        createdById: organization.createdById,
      },
    });
    const manager = isOrganizationManager(membership.role);
    const [channels, members, teams, unreadRows, mentionRows, pinnedRows] =
      await Promise.all([
        db.chatChannel.findMany({
          where: {
            organizationId,
            OR: [
              { type: 'ORGANIZATION' },
              manager
                ? { type: 'TEAM' }
                : {
                    type: 'TEAM',
                    team: { members: { some: { userId: user.id } } },
                  },
              {
                type: { in: ['PRIVATE', 'DIRECT'] },
                members: { some: { userId: user.id } },
              },
            ],
          },
          orderBy: [{ type: 'asc' }, { name: 'asc' }],
          include: {
            ...chatChannelInclude,
            messages: {
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              take: 1,
              include: {
                author: { select: { id: true, name: true, username: true } },
                attachments: { select: { id: true }, take: 1 },
              },
            },
          },
        }),
        db.organizationMember.findMany({
          where: { organizationId },
          orderBy: { user: { name: 'asc' } },
          select: {
            user: {
              select: { id: true, name: true, username: true, email: true },
            },
          },
        }),
        db.team.findMany({
          where: { organizationId, active: true },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            _count: { select: { members: true } },
          },
        }),
        db.$queryRaw<{ channelId: string; unread: number }[]>(Prisma.sql`
          SELECT channel."id" AS "channelId", COUNT(message."id")::int AS "unread"
          FROM "ChatChannel" channel
          LEFT JOIN "ChatChannelReadState" state
            ON state."channelId" = channel."id" AND state."userId" = ${user.id}
          LEFT JOIN "ChatMessage" message
            ON message."channelId" = channel."id"
            AND message."createdAt" > COALESCE(state."lastReadAt", TIMESTAMP '1970-01-01')
            AND message."authorId" <> ${user.id}
            AND message."deletedAt" IS NULL
          WHERE channel."organizationId" = ${organizationId}
          GROUP BY channel."id"
        `),
        db.$queryRaw<{ channelId: string; mentions: number }[]>(Prisma.sql`
          SELECT message."channelId" AS "channelId", COUNT(DISTINCT message."id")::int AS "mentions"
          FROM "ChatMessage" message
          LEFT JOIN "ChatChannelReadState" state
            ON state."channelId" = message."channelId" AND state."userId" = ${user.id}
          LEFT JOIN "ChatMessageUserMention" usermention
            ON usermention."messageId" = message."id" AND usermention."userId" = ${user.id}
          LEFT JOIN "ChatMessageTeamMention" teammention
            ON teammention."messageId" = message."id"
          LEFT JOIN "TeamMember" teammember
            ON teammember."teamId" = teammention."teamId"
            AND teammember."organizationId" = message."organizationId"
            AND teammember."userId" = ${user.id}
          WHERE message."organizationId" = ${organizationId}
            AND message."createdAt" > COALESCE(state."lastReadAt", TIMESTAMP '1970-01-01')
            AND message."authorId" <> ${user.id}
            AND message."deletedAt" IS NULL
            AND (usermention."userId" IS NOT NULL OR teammember."userId" IS NOT NULL)
          GROUP BY message."channelId"
        `),
        db.chatMessage.groupBy({
          by: ['channelId'],
          where: { organizationId, pinnedAt: { not: null }, deletedAt: null },
          _count: { _all: true },
        }),
      ]);
    const unreadByChannel = new Map(
      unreadRows.map((row) => [row.channelId, Number(row.unread)])
    );
    const mentionsByChannel = new Map(
      mentionRows.map((row) => [row.channelId, Number(row.mentions)])
    );
    const pinsByChannel = new Map(
      pinnedRows.map((row) => [row.channelId, row._count._all])
    );
    const teamCount = new Map(
      teams.map((team) => [team.id, team._count.members])
    );
    const channelDtos = channels.map((channel) => {
      const directPartner =
        channel.type === 'DIRECT'
          ? channel.members.find((member) => member.userId !== user.id)
              ?.organizationMember.user
          : null;
      const isChannelMember = channel.members.some(
        (member) => member.userId === user.id
      );
      const canManage = canManageChannel({
        role: membership.role,
        type: channel.type,
        actorId: user.id,
        createdById: channel.createdById,
        isChannelMember,
      });
      const lastMessage = channel.messages[0];
      return {
        id: channel.id,
        organizationId: channel.organizationId,
        name: directPartner
          ? directPartner.name || `@${directPartner.username}`
          : channel.name,
        description: channel.description,
        type: channel.type,
        teamId: channel.teamId,
        team: channel.team,
        members: channel.members.map(
          (member) => member.organizationMember.user
        ),
        memberCount:
          channel.type === 'ORGANIZATION'
            ? members.length
            : channel.type === 'TEAM' && channel.teamId
              ? teamCount.get(channel.teamId) || 0
              : channel.members.length,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              content: lastMessage.deletedAt
                ? 'Mensagem excluída'
                : lastMessage.content ||
                  (lastMessage.attachments.length ? 'Arquivo anexado' : ''),
              createdAt: lastMessage.createdAt.toISOString(),
              author: lastMessage.author,
              hasAttachments: lastMessage.attachments.length > 0,
            }
          : null,
        unreadCount: unreadByChannel.get(channel.id) || 0,
        mentionCount: mentionsByChannel.get(channel.id) || 0,
        pinnedCount: pinsByChannel.get(channel.id) || 0,
        canPin: canPinMessage({
          role: membership.role,
          type: channel.type,
          isChannelMember,
          canManageChannel: canManage,
        }),
      };
    });
    const data: ChatWorkspaceDTO = {
      organization: { id: organization.id, name: organization.name },
      role: membership.role,
      canCreateChannel: canCreateChannel(membership.role),
      channels: channelDtos,
      members: members.map((member) => member.user),
      teams: teams.map((team) => ({ id: team.id, name: team.name })),
      unreadCount: channelDtos.reduce(
        (total, channel) => total + channel.unreadCount,
        0
      ),
      mentionCount: channelDtos.reduce(
        (total, channel) => total + channel.mentionCount,
        0
      ),
    };
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível carregar o Chat.'),
    };
  }
}

export async function getChatUnreadCount(organizationId: string) {
  const workspace = await getChatWorkspace(organizationId);
  if (!workspace.success) return workspace;
  return {
    success: true as const,
    data: workspace.data.unreadCount,
  };
}

export async function getChatMentionCount(organizationId: string) {
  const workspace = await getChatWorkspace(organizationId);
  if (!workspace.success) return workspace;
  return { success: true as const, data: workspace.data.mentionCount };
}

export async function getChatCollaborationCounts(organizationId: string) {
  const workspace = await getChatWorkspace(organizationId);
  if (!workspace.success) return workspace;
  return {
    success: true as const,
    data: {
      unreadCount: workspace.data.unreadCount,
      mentionCount: workspace.data.mentionCount,
    },
  };
}

export async function createChatChannel(input: ChatChannelInput) {
  try {
    const user = await requireUser();
    const data = cleanChannelInput(input);
    const channel = await db.$transaction(async (tx) => {
      const targets = await validateChannelTargets(tx, user.id, data);
      return tx.chatChannel.create({
        data: {
          organizationId: data.organizationId,
          name: data.name,
          description: data.description,
          type: data.type,
          teamId: data.type === 'TEAM' ? data.teamId : null,
          createdById: user.id,
          members: {
            create: targets.memberIds.map((userId) => ({
              organizationId: data.organizationId,
              userId,
            })),
          },
        },
      });
    });
    revalidateChat();
    return { success: true as const, data: channel };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível criar o canal.'),
    };
  }
}

export async function updateChatChannel(
  channelId: string,
  input: ChatChannelInput
) {
  try {
    const user = await requireUser();
    const access = await getChatChannelAccess(user.id, channelId);
    if (!access.canManage || access.channel.type === 'DIRECT') {
      throw new OrganizationAuthorizationError();
    }
    const data = cleanChannelInput(input);
    if (
      data.organizationId !== access.channel.organizationId ||
      data.type !== access.channel.type
    ) {
      throw new OrganizationAuthorizationError();
    }
    const channel = await db.$transaction(async (tx) => {
      const targets = await validateChannelTargets(tx, user.id, data);
      if (data.type === 'PRIVATE') {
        await tx.chatChannelMember.deleteMany({ where: { channelId } });
      }
      return tx.chatChannel.update({
        where: { id: channelId },
        data: {
          name: data.name,
          description: data.description,
          teamId: data.type === 'TEAM' ? data.teamId : null,
          members:
            data.type === 'PRIVATE'
              ? {
                  create: targets.memberIds.map((userId) => ({
                    organizationId: data.organizationId,
                    userId,
                  })),
                }
              : undefined,
        },
      });
    });
    revalidateChat();
    return { success: true as const, data: channel };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível atualizar o canal.'),
    };
  }
}

export async function deleteChatChannel(channelId: string) {
  try {
    const user = await requireUser();
    const access = await getChatChannelAccess(user.id, channelId);
    if (!access.canManage || access.channel.name === 'Geral') {
      throw new OrganizationAuthorizationError();
    }
    await db.chatChannel.delete({ where: { id: channelId } });
    revalidateChat();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível excluir o canal.'),
    };
  }
}

export async function getOrCreateDirectConversation(
  organizationId: string,
  targetUserId: string
) {
  try {
    const user = await requireUser();
    if (user.id === targetUserId) throw new Error('Selecione outro usuário.');
    const members = await db.organizationMember.findMany({
      where: { organizationId, userId: { in: [user.id, targetUserId] } },
      select: { userId: true },
    });
    if (members.length !== 2) throw new OrganizationAuthorizationError();
    const directKey = [user.id, targetUserId].sort().join(':');
    const channel = await db.$transaction(async (tx) => {
      const existing = await tx.chatChannel.findUnique({
        where: { organizationId_directKey: { organizationId, directKey } },
      });
      if (existing) return existing;
      return tx.chatChannel.create({
        data: {
          organizationId,
          name: `DM-${directKey}`,
          type: 'DIRECT',
          directKey,
          createdById: user.id,
          members: {
            create: [user.id, targetUserId].map((userId) => ({
              organizationId,
              userId,
            })),
          },
        },
      });
    });
    revalidateChat();
    return { success: true as const, data: { id: channel.id } };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível abrir a conversa direta.'),
    };
  }
}

async function messagePage(
  userId: string,
  channelId: string,
  organizationId: string,
  cursor: string | null | undefined,
  limitInput: number | undefined
) {
  const access = await getChatChannelAccess(userId, channelId);
  if (access.channel.organizationId !== organizationId) {
    throw new OrganizationAuthorizationError();
  }
  const limit = Math.min(50, Math.max(10, limitInput || CHAT_PAGE_SIZE));
  const rows = await db.chatMessage.findMany({
    where: {
      channelId,
      organizationId,
      ...(access.channel.type === 'DIRECT' ? {} : { replyToId: null }),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: chatMessageInclude,
  });
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit);
  const nextCursor = hasMore ? page.at(-1)?.id || null : null;
  const readAt = await getDirectConversationReadAt(
    userId,
    channelId,
    access.channel.type === 'DIRECT'
  );
  const serialized = await serializeChatMessagesForViewer({
    messages: page.reverse(),
    userId,
    organizationId,
    role: access.membership.role,
    otherReadAt: readAt,
  });
  const data: ChatMessagesPageDTO = {
    messages: serialized,
    nextCursor,
    syncedAt: new Date().toISOString(),
  };
  return data;
}

export async function getChatMessages(input: {
  organizationId: string;
  channelId: string;
  cursor?: string | null;
  limit?: number;
}) {
  try {
    const user = await requireUser();
    return {
      success: true as const,
      data: await messagePage(
        user.id,
        input.channelId,
        input.organizationId,
        input.cursor,
        input.limit
      ),
    };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível carregar as mensagens.'),
    };
  }
}

export async function syncChatMessages(input: {
  organizationId: string;
  channelId: string;
  since: string;
}) {
  try {
    const user = await requireUser();
    const access = await getChatChannelAccess(user.id, input.channelId);
    if (access.channel.organizationId !== input.organizationId) {
      throw new OrganizationAuthorizationError();
    }
    const since = new Date(input.since);
    if (Number.isNaN(since.getTime())) throw new Error('Cursor inválido.');
    const rows = await db.chatMessage.findMany({
      where: {
        channelId: input.channelId,
        organizationId: input.organizationId,
        updatedAt: { gt: since },
        ...(access.channel.type === 'DIRECT' ? {} : { replyToId: null }),
      },
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: 100,
      include: chatMessageInclude,
    });
    const readAt = await getDirectConversationReadAt(
      user.id,
      input.channelId,
      access.channel.type === 'DIRECT'
    );
    const serialized = await serializeChatMessagesForViewer({
      messages: rows,
      userId: user.id,
      organizationId: input.organizationId,
      role: access.membership.role,
      otherReadAt: readAt,
    });
    return {
      success: true as const,
      data: {
        messages: serialized,
        syncedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível sincronizar as mensagens.'),
    };
  }
}

export async function sendChatMessage(input: ChatSendInput) {
  try {
    const user = await requireUser();
    const message = await createChatMessage(user.id, input);
    revalidateChat();
    return { success: true as const, data: message };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível enviar a mensagem.'),
    };
  }
}

export async function editChatMessage(messageId: string, contentInput: string) {
  try {
    const user = await requireUser();
    const { message, access } = await getChatMessageAccess(user.id, messageId);
    if (
      message.authorId !== user.id ||
      message.deletedAt ||
      Date.now() - message.createdAt.getTime() > CHAT_EDIT_WINDOW_MS
    ) {
      throw new OrganizationAuthorizationError();
    }
    if (contentInput.length > CHAT_MESSAGE_MAX_LENGTH) {
      throw new Error(
        `A mensagem deve ter até ${CHAT_MESSAGE_MAX_LENGTH} caracteres.`
      );
    }
    const content = contentInput.trim();
    const existing = await db.chatMessage.findUniqueOrThrow({
      where: { id: messageId },
      select: {
        _count: { select: { attachments: true } },
        eventId: true,
        taskId: true,
        ticketId: true,
        noteId: true,
      },
    });
    if (
      !content &&
      !existing._count.attachments &&
      !existing.eventId &&
      !existing.taskId &&
      !existing.ticketId &&
      !existing.noteId
    ) {
      throw new Error('Digite uma mensagem.');
    }
    await db.$transaction(async (tx) => {
      await tx.chatMessage.update({
        where: { id: messageId },
        data: { content, editedAt: new Date() },
      });
      await replaceChatMentions(
        tx,
        messageId,
        access.channel.organizationId,
        content,
        isOrganizationManager(access.membership.role)
      );
    });
    const updated = await db.chatMessage.findUniqueOrThrow({
      where: { id: messageId },
      include: chatMessageInclude,
    });
    const readAt = await getDirectConversationReadAt(
      user.id,
      message.channelId,
      access.channel.type === 'DIRECT'
    );
    const [serialized] = await serializeChatMessagesForViewer({
      messages: [updated],
      userId: user.id,
      organizationId: access.channel.organizationId,
      role: access.membership.role,
      otherReadAt: readAt,
    });
    revalidateChat();
    return {
      success: true as const,
      data: serialized,
    };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível editar a mensagem.'),
    };
  }
}

export async function deleteChatMessage(messageId: string) {
  try {
    const user = await requireUser();
    const { message } = await requireChatMessageModeration(user.id, messageId);
    await db.$transaction(async (tx) => {
      await tx.chatMessage.update({
        where: { id: messageId },
        data: {
          deletedAt: new Date(),
          deletedById: user.id,
          pinnedAt: null,
          pinnedById: null,
          eventId: null,
          taskId: null,
          ticketId: null,
          noteId: null,
        },
      });
      await Promise.all([
        tx.chatMessageUserMention.deleteMany({ where: { messageId } }),
        tx.chatMessageTeamMention.deleteMany({ where: { messageId } }),
        tx.chatReaction.deleteMany({ where: { messageId } }),
      ]);
      if (message.replyToId) {
        await tx.chatMessage.update({
          where: { id: message.replyToId },
          data: { updatedAt: new Date() },
        });
      }
    });
    revalidateChat();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível excluir a mensagem.'),
    };
  }
}

export async function toggleChatReaction(messageId: string, emoji: string) {
  try {
    const user = await requireUser();
    const { message, access } = await getChatMessageAccess(user.id, messageId);
    if (
      message.deletedAt ||
      !(CHAT_REACTIONS as readonly string[]).includes(emoji)
    ) {
      throw new OrganizationAuthorizationError();
    }
    await enforceChatReactionRateLimit(user.id);
    await db.$transaction(async (tx) => {
      const existing = await tx.chatReaction.findUnique({
        where: {
          messageId_userId_emoji: { messageId, userId: user.id, emoji },
        },
        select: { id: true },
      });
      if (existing) {
        await tx.chatReaction.delete({ where: { id: existing.id } });
      } else {
        await tx.chatReaction.create({
          data: {
            messageId,
            organizationId: message.organizationId,
            userId: user.id,
            emoji,
          },
        });
      }
      await tx.chatMessage.update({
        where: { id: messageId },
        data: { updatedAt: new Date() },
      });
    });
    const updated = await db.chatMessage.findUniqueOrThrow({
      where: { id: messageId },
      include: chatMessageInclude,
    });
    const readAt = await getDirectConversationReadAt(
      user.id,
      message.channelId,
      access.channel.type === 'DIRECT'
    );
    const [serialized] = await serializeChatMessagesForViewer({
      messages: [updated],
      userId: user.id,
      organizationId: access.channel.organizationId,
      role: access.membership.role,
      otherReadAt: readAt,
    });
    return {
      success: true as const,
      data: serialized,
    };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível atualizar a reação.'),
    };
  }
}

export async function setChatMessagePinned(messageId: string, pinned: boolean) {
  try {
    const user = await requireUser();
    const { message, access } = await getChatMessageAccess(user.id, messageId);
    if (!access.canPin || message.deletedAt) {
      throw new OrganizationAuthorizationError();
    }
    const updated = await db.chatMessage.update({
      where: { id: messageId },
      data: {
        pinnedAt: pinned ? new Date() : null,
        pinnedById: pinned ? user.id : null,
      },
      include: chatMessageInclude,
    });
    const readAt = await getDirectConversationReadAt(
      user.id,
      message.channelId,
      access.channel.type === 'DIRECT'
    );
    const [serialized] = await serializeChatMessagesForViewer({
      messages: [updated],
      userId: user.id,
      organizationId: access.channel.organizationId,
      role: access.membership.role,
      otherReadAt: readAt,
    });
    revalidateChat();
    return {
      success: true as const,
      data: serialized,
    };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível alterar a mensagem fixada.'),
    };
  }
}

export async function getPinnedChatMessages(channelId: string) {
  try {
    const user = await requireUser();
    const access = await getChatChannelAccess(user.id, channelId);
    const rows = await db.chatMessage.findMany({
      where: {
        channelId,
        organizationId: access.channel.organizationId,
        pinnedAt: { not: null },
        deletedAt: null,
      },
      orderBy: { pinnedAt: 'desc' },
      take: 50,
      include: chatMessageInclude,
    });
    const readAt = await getDirectConversationReadAt(
      user.id,
      channelId,
      access.channel.type === 'DIRECT'
    );
    const serialized = await serializeChatMessagesForViewer({
      messages: rows,
      userId: user.id,
      organizationId: access.channel.organizationId,
      role: access.membership.role,
      otherReadAt: readAt,
    });
    return {
      success: true as const,
      data: serialized,
    };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível carregar as fixadas.'),
    };
  }
}

export async function getChatThread(rootMessageId: string) {
  try {
    const user = await requireUser();
    const { message, access } = await getChatMessageAccess(
      user.id,
      rootMessageId
    );
    if (message.replyToId) throw new OrganizationAuthorizationError();
    const [root, replies, readAt] = await Promise.all([
      db.chatMessage.findUniqueOrThrow({
        where: { id: rootMessageId },
        include: chatMessageInclude,
      }),
      db.chatMessage.findMany({
        where: {
          replyToId: rootMessageId,
          channelId: message.channelId,
          organizationId: message.organizationId,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 100,
        include: chatMessageInclude,
      }),
      getDirectConversationReadAt(
        user.id,
        message.channelId,
        access.channel.type === 'DIRECT'
      ),
    ]);
    const serialized = await serializeChatMessagesForViewer({
      messages: [root, ...replies],
      userId: user.id,
      organizationId: message.organizationId,
      role: access.membership.role,
      otherReadAt: readAt,
    });
    return {
      success: true as const,
      data: {
        root: serialized[0],
        replies: serialized.slice(1),
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível carregar a thread.'),
    };
  }
}

export async function getChatMessageContext(messageId: string) {
  try {
    const user = await requireUser();
    const { message, access } = await getChatMessageAccess(user.id, messageId);
    const targetId =
      access.channel.type === 'DIRECT'
        ? message.id
        : message.replyToId || message.id;
    const target = await db.chatMessage.findUniqueOrThrow({
      where: { id: targetId },
      select: { id: true, createdAt: true },
    });
    const rootFilter =
      access.channel.type === 'DIRECT' ? {} : { replyToId: null };
    const [before, after, readAt] = await Promise.all([
      db.chatMessage.findMany({
        where: {
          channelId: message.channelId,
          organizationId: message.organizationId,
          createdAt: { lte: target.createdAt },
          ...rootFilter,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 25,
        include: chatMessageInclude,
      }),
      db.chatMessage.findMany({
        where: {
          channelId: message.channelId,
          organizationId: message.organizationId,
          createdAt: { gt: target.createdAt },
          ...rootFilter,
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: 25,
        include: chatMessageInclude,
      }),
      getDirectConversationReadAt(
        user.id,
        message.channelId,
        access.channel.type === 'DIRECT'
      ),
    ]);
    const rows = [...before.reverse(), ...after];
    const serialized = await serializeChatMessagesForViewer({
      messages: rows,
      userId: user.id,
      organizationId: message.organizationId,
      role: access.membership.role,
      otherReadAt: readAt,
    });
    return {
      success: true as const,
      data: {
        channelId: message.channelId,
        targetMessageId: targetId,
        threadMessageId:
          access.channel.type !== 'DIRECT' && message.replyToId
            ? message.id
            : null,
        messages: serialized,
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível localizar a mensagem.'),
    };
  }
}

export async function searchChatMessages(input: ChatSearchInput) {
  try {
    const user = await requireUser();
    const access = await getChatChannelAccess(user.id, input.channelId);
    const limit = Math.min(50, Math.max(10, input.limit || 30));
    const query = input.query?.trim().slice(0, 200) || '';
    const dateFrom = input.dateFrom
      ? new Date(`${input.dateFrom}T00:00:00Z`)
      : null;
    const dateTo = input.dateTo
      ? new Date(`${input.dateTo}T23:59:59.999Z`)
      : null;
    if (dateFrom && Number.isNaN(dateFrom.getTime()))
      throw new Error('Data inválida.');
    if (dateTo && Number.isNaN(dateTo.getTime()))
      throw new Error('Data inválida.');
    const rows = await db.chatMessage.findMany({
      where: {
        channelId: input.channelId,
        organizationId: access.channel.organizationId,
        deletedAt: null,
        ...(input.authorId ? { authorId: input.authorId } : {}),
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
        ...(input.pinnedOnly ? { pinnedAt: { not: null } } : {}),
        ...(input.imagesOnly
          ? { attachments: { some: { mimeType: { startsWith: 'image/' } } } }
          : input.withAttachments
            ? { attachments: { some: {} } }
            : {}),
        ...(query
          ? {
              OR: [
                { content: { contains: query, mode: 'insensitive' } },
                { author: { name: { contains: query, mode: 'insensitive' } } },
                {
                  author: {
                    username: { contains: query, mode: 'insensitive' },
                  },
                },
                {
                  attachments: {
                    some: {
                      OR: [
                        {
                          originalName: {
                            contains: query,
                            mode: 'insensitive',
                          },
                        },
                        {
                          fileName: { contains: query, mode: 'insensitive' },
                        },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      include: chatMessageInclude,
    });
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const readAt = await getDirectConversationReadAt(
      user.id,
      input.channelId,
      access.channel.type === 'DIRECT'
    );
    const serialized = await serializeChatMessagesForViewer({
      messages: page,
      userId: user.id,
      organizationId: access.channel.organizationId,
      role: access.membership.role,
      otherReadAt: readAt,
    });
    return {
      success: true as const,
      data: {
        messages: serialized,
        nextCursor: hasMore ? page.at(-1)?.id || null : null,
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível pesquisar mensagens.'),
    };
  }
}

export async function getChatMedia(input: {
  channelId: string;
  cursor?: string | null;
  imagesOnly?: boolean;
}) {
  try {
    const user = await requireUser();
    const access = await getChatChannelAccess(user.id, input.channelId);
    const rows = await db.chatAttachment.findMany({
      where: {
        organizationId: access.channel.organizationId,
        message: {
          channelId: input.channelId,
          deletedAt: null,
        },
        ...(input.imagesOnly ? { mimeType: { startsWith: 'image/' } } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 31,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        fileName: true,
        originalName: true,
        mimeType: true,
        extension: true,
        size: true,
        width: true,
        height: true,
        messageId: true,
        createdAt: true,
        message: {
          select: {
            content: true,
            author: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });
    const page = rows.slice(0, 30);
    return {
      success: true as const,
      data: {
        attachments: page.map((attachment) => ({
          ...serializeChatAttachment(attachment),
          messageId: attachment.messageId,
          createdAt: attachment.createdAt.toISOString(),
          message: attachment.message,
        })),
        nextCursor: rows.length > 30 ? page.at(-1)?.id || null : null,
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível carregar os arquivos.'),
    };
  }
}

export async function getChatShareOptions(organizationId: string) {
  try {
    const user = await requireUser();
    const membership = await requireOrganizationMembership(
      user.id,
      organizationId
    );
    const manager = isOrganizationManager(membership.role);
    const teamMemberships = await db.teamMember.findMany({
      where: { organizationId, userId: user.id },
      select: { teamId: true },
    });
    const teamIds = teamMemberships.map(
      (teamMembership) => teamMembership.teamId
    );
    const [tasks, tickets, notes] = await Promise.all([
      db.task.findMany({
        where: {
          organizationId,
          ...(manager
            ? {}
            : {
                OR: [
                  { userId: user.id },
                  { createdById: user.id },
                  { assigneeId: user.id },
                  {
                    team: {
                      members: { some: { userId: user.id, organizationId } },
                    },
                  },
                ],
              }),
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: { id: true, title: true, status: true, priority: true },
      }),
      db.ticket.findMany({
        where: {
          organizationId,
          ...(manager
            ? {}
            : {
                OR: [
                  { requesterId: user.id },
                  { assigneeId: user.id },
                  { teamId: { in: teamIds } },
                ],
              }),
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: { id: true, title: true, status: true, priority: true },
      }),
      db.note.findMany({
        where: {
          organizationId,
          scopeKey: `organization:${organizationId}`,
          trashedAt: null,
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
        select: { id: true, title: true, status: true, folderPath: true },
      }),
    ]);
    return {
      success: true as const,
      data: {
        tasks,
        tickets,
        notes,
        teamIds,
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível carregar recursos.'),
    };
  }
}

export async function markChatChannelRead(
  channelId: string,
  lastVisibleMessageId?: string | null
) {
  try {
    const user = await requireUser();
    const access = await getChatChannelAccess(user.id, channelId);
    const latest = lastVisibleMessageId
      ? await db.chatMessage.findFirst({
          where: {
            id: lastVisibleMessageId,
            channelId,
            organizationId: access.channel.organizationId,
          },
          select: { id: true, createdAt: true },
        })
      : await db.chatMessage.findFirst({
          where: { channelId, organizationId: access.channel.organizationId },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: { id: true, createdAt: true },
        });
    if (lastVisibleMessageId && !latest) {
      throw new OrganizationAuthorizationError();
    }
    const nextReadAt = latest?.createdAt || new Date();
    await db.$transaction(async (tx) => {
      const current = await tx.chatChannelReadState.findUnique({
        where: { channelId_userId: { channelId, userId: user.id } },
        select: { lastReadAt: true },
      });
      if (current && current.lastReadAt >= nextReadAt) return;
      await tx.chatChannelReadState.upsert({
        where: { channelId_userId: { channelId, userId: user.id } },
        update: {
          lastReadAt: nextReadAt,
          lastReadMessageId: latest?.id || null,
        },
        create: {
          channelId,
          organizationId: access.channel.organizationId,
          userId: user.id,
          lastReadAt: nextReadAt,
          lastReadMessageId: latest?.id || null,
        },
      });
    });
    revalidateChat();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível marcar o canal como lido.'),
    };
  }
}
