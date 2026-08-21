'use server';

import { Prisma, type ChatChannelType } from '@prisma/client';
import { revalidatePath } from 'next/cache';

import { requireUser } from '@/lib/auth/session';
import {
  chatChannelInclude,
  getChatChannelAccess,
  requireChatChannelPost,
  requireChatMessageModeration,
} from '@/lib/chat/authorization';
import { getCalendarEventAccess } from '@/lib/calendar/authorization';
import {
  OrganizationAuthorizationError,
  requireOrganizationMembership,
} from '@/lib/organizations/authorization';
import {
  canCreateChannel,
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

function mentionSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function resolveMentions(
  tx: Prisma.TransactionClient,
  organizationId: string,
  content: string
) {
  const usernames = Array.from(
    new Set(
      Array.from(content.matchAll(/(?:^|\s)@([a-z0-9._-]{2,50})/gi)).map(
        (match) => match[1].toLowerCase()
      )
    )
  );
  const teamSlugs = Array.from(
    new Set(
      Array.from(content.matchAll(/@equipe:([a-z0-9-]{2,80})/gi)).map((match) =>
        match[1].toLowerCase()
      )
    )
  );
  const [members, teams] = await Promise.all([
    usernames.length
      ? tx.organizationMember.findMany({
          where: {
            organizationId,
            user: { username: { in: usernames } },
          },
          select: { userId: true },
        })
      : [],
    teamSlugs.length
      ? tx.team.findMany({
          where: { organizationId, active: true },
          select: { id: true, name: true },
        })
      : [],
  ]);
  return {
    userIds: members.map((member) => member.userId),
    teamIds: teams
      .filter((team) => teamSlugs.includes(mentionSlug(team.name)))
      .map((team) => team.id),
  };
}

async function replaceMentions(
  tx: Prisma.TransactionClient,
  messageId: string,
  organizationId: string,
  content: string
) {
  const mentions = await resolveMentions(tx, organizationId, content);
  await Promise.all([
    tx.chatMessageUserMention.deleteMany({ where: { messageId } }),
    tx.chatMessageTeamMention.deleteMany({ where: { messageId } }),
  ]);
  if (mentions.userIds.length) {
    await tx.chatMessageUserMention.createMany({
      data: mentions.userIds.map((userId) => ({
        messageId,
        organizationId,
        userId,
      })),
    });
  }
  if (mentions.teamIds.length) {
    await tx.chatMessageTeamMention.createMany({
      data: mentions.teamIds.map((teamId) => ({
        messageId,
        organizationId,
        teamId,
      })),
    });
  }
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
    return { membership, memberIds: [] };
  }
  if (input.teamId) throw new OrganizationAuthorizationError();
  if (input.type !== 'PRIVATE') return { membership, memberIds: [] };
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
  return { membership, memberIds };
}

async function canShareEventInChannel(
  userId: string,
  channelId: string,
  eventId: string
) {
  const [channelAccess, calendarAccess] = await Promise.all([
    getChatChannelAccess(userId, channelId),
    getCalendarEventAccess(userId, eventId),
  ]);
  const { channel } = channelAccess;
  const { event } = calendarAccess;
  if (channel.type === 'ORGANIZATION') {
    return (
      event.organizationId === channel.organizationId &&
      event.visibility === 'ORGANIZATION'
    );
  }
  if (channel.type === 'TEAM') {
    return (
      event.organizationId === channel.organizationId &&
      (event.visibility === 'ORGANIZATION' ||
        (event.visibility === 'TEAMS' &&
          event.teams.some((team) => team.teamId === channel.teamId)))
    );
  }

  const memberIds = channel.members.map((member) => member.userId);
  const explicit = new Set([
    event.creatorId,
    ...event.participants.map((participant) => participant.userId),
  ]);
  if (!event.organizationId) {
    return memberIds.every((memberId) => explicit.has(memberId));
  }
  if (event.organizationId !== channel.organizationId) return false;
  if (event.visibility === 'ORGANIZATION') return true;
  if (event.visibility === 'INVITE_ONLY') {
    return memberIds.every((memberId) => explicit.has(memberId));
  }
  const teamMemberships = await db.teamMember.findMany({
    where: {
      organizationId: channel.organizationId,
      userId: { in: memberIds },
      teamId: { in: event.teams.map((team) => team.teamId) },
    },
    select: { userId: true },
  });
  const teamUsers = new Set(
    teamMemberships.map((membership) => membership.userId)
  );
  return memberIds.every(
    (memberId) => explicit.has(memberId) || teamUsers.has(memberId)
  );
}

const messageInclude = {
  author: { select: { id: true, name: true, username: true } },
  replyTo: {
    select: {
      id: true,
      content: true,
      deletedAt: true,
      author: { select: { id: true, name: true, username: true } },
    },
  },
  event: {
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      allDay: true,
      timezone: true,
      type: true,
      organizationId: true,
    },
  },
  userMentions: { select: { userId: true } },
  teamMentions: { select: { teamId: true } },
  _count: { select: { replies: true } },
} satisfies Prisma.ChatMessageInclude;

function serializeMessage(
  message: Prisma.ChatMessageGetPayload<{ include: typeof messageInclude }>
) {
  return {
    ...message,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    editedAt: message.editedAt?.toISOString() || null,
    deletedAt: message.deletedAt?.toISOString() || null,
    event: message.event
      ? {
          ...message.event,
          startAt: message.event.startAt.toISOString(),
          endAt: message.event.endAt.toISOString(),
        }
      : null,
  };
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
    const channels = await db.chatChannel.findMany({
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
          where: { replyToId: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            author: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });
    const unreadRows = await db.$queryRaw<
      { channelId: string; unread: number }[]
    >(Prisma.sql`
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
    `);
    const unreadByChannel = new Map(
      unreadRows.map((row) => [row.channelId, Number(row.unread)])
    );
    const [members, teams] = await Promise.all([
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
        select: { id: true, name: true },
      }),
    ]);
    return {
      success: true as const,
      data: {
        organization,
        role: membership.role,
        canCreateChannel: canCreateChannel(membership.role),
        channels: channels.map((channel) => {
          const directPartner =
            channel.type === 'DIRECT'
              ? channel.members.find((member) => member.userId !== user.id)
                  ?.organizationMember.user
              : null;
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
            lastMessage: channel.messages[0]
              ? {
                  id: channel.messages[0].id,
                  content: channel.messages[0].content,
                  createdAt: channel.messages[0].createdAt.toISOString(),
                  author: channel.messages[0].author,
                }
              : null,
            unreadCount: unreadByChannel.get(channel.id) || 0,
          };
        }),
        members: members.map((member) => member.user),
        teams,
        unreadCount: channels.reduce(
          (total, channel) => total + (unreadByChannel.get(channel.id) || 0),
          0
        ),
      },
    };
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
      include: { user: { select: { username: true } } },
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

export async function getChatMessages(input: {
  organizationId: string;
  channelId: string;
  cursor?: string | null;
  limit?: number;
}) {
  try {
    const user = await requireUser();
    const access = await getChatChannelAccess(user.id, input.channelId);
    if (access.channel.organizationId !== input.organizationId) {
      throw new OrganizationAuthorizationError();
    }
    const limit = Math.min(50, Math.max(10, input.limit || 40));
    const rows = await db.chatMessage.findMany({
      where: {
        channelId: input.channelId,
        organizationId: input.organizationId,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      include: messageInclude,
    });
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit);
    const nextCursor = hasMore ? page.at(-1)?.id || null : null;
    return {
      success: true as const,
      data: {
        messages: page.reverse().map(serializeMessage),
        nextCursor,
      },
    };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível carregar as mensagens.'),
    };
  }
}

export async function sendChatMessage(input: {
  organizationId: string;
  channelId: string;
  content: string;
  replyToId?: string | null;
  eventId?: string | null;
}) {
  try {
    const user = await requireUser();
    const access = await requireChatChannelPost(user.id, input.channelId);
    if (access.channel.organizationId !== input.organizationId) {
      throw new OrganizationAuthorizationError();
    }
    const content = input.content.trim().slice(0, 8000);
    const eventId = input.eventId?.trim() || null;
    if (!content && !eventId) throw new Error('Digite uma mensagem.');
    if (
      eventId &&
      !(await canShareEventInChannel(user.id, input.channelId, eventId))
    ) {
      throw new OrganizationAuthorizationError();
    }
    if (input.replyToId) {
      const reply = await db.chatMessage.findFirst({
        where: {
          id: input.replyToId,
          channelId: input.channelId,
          organizationId: input.organizationId,
          replyToId: null,
        },
        select: { id: true },
      });
      if (!reply) throw new OrganizationAuthorizationError();
    }
    const message = await db.$transaction(async (tx) => {
      const created = await tx.chatMessage.create({
        data: {
          channelId: input.channelId,
          organizationId: input.organizationId,
          authorId: user.id,
          content: content || 'Evento compartilhado',
          replyToId: input.replyToId || null,
          eventId,
        },
        include: messageInclude,
      });
      await replaceMentions(
        tx,
        created.id,
        input.organizationId,
        created.content
      );
      return created;
    });
    revalidateChat();
    return { success: true as const, data: serializeMessage(message) };
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
    const message = await db.chatMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        authorId: true,
        channelId: true,
        organizationId: true,
        deletedAt: true,
      },
    });
    if (!message || message.authorId !== user.id || message.deletedAt) {
      throw new OrganizationAuthorizationError();
    }
    await getChatChannelAccess(user.id, message.channelId);
    const content = contentInput.trim().slice(0, 8000);
    if (!content) throw new Error('Digite uma mensagem.');
    const updated = await db.$transaction(async (tx) => {
      const result = await tx.chatMessage.update({
        where: { id: messageId },
        data: { content, editedAt: new Date() },
        include: messageInclude,
      });
      await replaceMentions(tx, messageId, message.organizationId, content);
      return result;
    });
    revalidateChat();
    return { success: true as const, data: serializeMessage(updated) };
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
    await requireChatMessageModeration(user.id, messageId);
    await db.chatMessage.update({
      where: { id: messageId },
      data: {
        content: 'Mensagem excluída',
        deletedAt: new Date(),
        eventId: null,
      },
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

export async function markChatChannelRead(channelId: string) {
  try {
    const user = await requireUser();
    const access = await getChatChannelAccess(user.id, channelId);
    const latest = await db.chatMessage.findFirst({
      where: { channelId, organizationId: access.channel.organizationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { id: true, createdAt: true },
    });
    await db.chatChannelReadState.upsert({
      where: { channelId_userId: { channelId, userId: user.id } },
      update: {
        lastReadAt: latest?.createdAt || new Date(),
        lastReadMessageId: latest?.id || null,
      },
      create: {
        channelId,
        organizationId: access.channel.organizationId,
        userId: user.id,
        lastReadAt: latest?.createdAt || new Date(),
        lastReadMessageId: latest?.id || null,
      },
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
