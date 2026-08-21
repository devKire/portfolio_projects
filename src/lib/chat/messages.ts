import type { OrganizationRole, Prisma } from '@prisma/client';

import { requireChatChannelPost } from '@/lib/chat/authorization';
import { isOrganizationManager } from '@/lib/organizations/policy';
import { db } from '@/lib/prisma';
import { ticketVisibilityWhere } from '@/lib/tickets/access';

import type { ValidatedChatAttachment } from './attachments';
import { CHAT_EDIT_WINDOW_MS, CHAT_MESSAGE_MAX_LENGTH } from './config';
import { enforceChatMessageRateLimit } from './rate-limit';
import {
  type ChatResourceInput,
  validateChatSharedResource,
} from './resources';
import type {
  ChatAttachmentDTO,
  ChatMessageDTO,
  ChatReactionDTO,
  ChatSharedResourceDTO,
} from './types';

const personSelect = {
  id: true,
  name: true,
  username: true,
} satisfies Prisma.UserSelect;

const attachmentSelect = {
  id: true,
  fileName: true,
  originalName: true,
  mimeType: true,
  extension: true,
  size: true,
  width: true,
  height: true,
} satisfies Prisma.ChatAttachmentSelect;

export const chatMessageInclude = {
  author: { select: personSelect },
  pinnedBy: { select: personSelect },
  replyTo: {
    select: {
      id: true,
      content: true,
      deletedAt: true,
      author: { select: personSelect },
      attachments: { select: attachmentSelect, take: 1 },
    },
  },
  attachments: { select: attachmentSelect, orderBy: { createdAt: 'asc' } },
  reactions: {
    select: {
      emoji: true,
      userId: true,
      user: { select: personSelect },
    },
    orderBy: { createdAt: 'asc' },
  },
  event: {
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      allDay: true,
      type: true,
    },
  },
  task: {
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      team: { select: { name: true } },
    },
  },
  ticket: {
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      queue: { select: { name: true } },
    },
  },
  note: {
    select: {
      id: true,
      title: true,
      status: true,
      folderPath: true,
    },
  },
  _count: { select: { replies: true } },
} satisfies Prisma.ChatMessageInclude;

export type ChatMessagePayload = Prisma.ChatMessageGetPayload<{
  include: typeof chatMessageInclude;
}>;

function attachmentCategory(mimeType: string) {
  return mimeType.startsWith('image/')
    ? ('IMAGE' as const)
    : ('DOCUMENT' as const);
}

export function serializeChatAttachment(
  attachment: ChatMessagePayload['attachments'][number]
): ChatAttachmentDTO {
  return {
    ...attachment,
    category: attachmentCategory(attachment.mimeType),
    url: `/api/chat/attachments/${attachment.id}`,
  };
}

function serializeReactions(
  reactions: ChatMessagePayload['reactions'],
  userId: string
) {
  const grouped = new Map<string, ChatReactionDTO>();
  for (const reaction of reactions) {
    const current = grouped.get(reaction.emoji) || {
      emoji: reaction.emoji,
      count: 0,
      reactedByMe: false,
      users: [],
    };
    current.count += 1;
    current.reactedByMe ||= reaction.userId === userId;
    if (current.users.length < 12) current.users.push(reaction.user);
    grouped.set(reaction.emoji, current);
  }
  return Array.from(grouped.values());
}

function sharedResource(
  message: ChatMessagePayload
): ChatSharedResourceDTO | null {
  if (message.event) {
    return {
      type: 'CALENDAR_EVENT',
      id: message.event.id,
      title: message.event.title,
      subtitle: message.event.allDay
        ? 'Evento de dia inteiro'
        : message.event.type,
      startAt: message.event.startAt.toISOString(),
      endAt: message.event.endAt.toISOString(),
    };
  }
  if (message.task) {
    return {
      type: 'TASK',
      id: message.task.id,
      title: message.task.title,
      subtitle: message.task.team?.name || 'Work Manager',
      status: message.task.status,
      priority: message.task.priority,
    };
  }
  if (message.ticket) {
    return {
      type: 'TICKET',
      id: message.ticket.id,
      title: message.ticket.title,
      subtitle: message.ticket.queue.name,
      status: message.ticket.status,
      priority: message.ticket.priority,
    };
  }
  if (message.note) {
    return {
      type: 'KCS',
      id: message.note.id,
      title: message.note.title,
      subtitle: message.note.folderPath || 'KCS',
      status: message.note.status,
    };
  }
  return null;
}

export function serializeChatMessage(
  message: ChatMessagePayload,
  userId: string,
  otherReadAt: Date | null = null
): ChatMessageDTO {
  const deleted = Boolean(message.deletedAt);
  const replyAttachment = message.replyTo?.attachments[0];
  return {
    id: message.id,
    channelId: message.channelId,
    organizationId: message.organizationId,
    authorId: message.authorId,
    content: deleted ? 'Mensagem excluída' : message.content,
    replyToId: message.replyToId,
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    editedAt: message.editedAt?.toISOString() || null,
    deletedAt: message.deletedAt?.toISOString() || null,
    pinnedAt: message.pinnedAt?.toISOString() || null,
    author: message.author,
    pinnedBy: message.pinnedBy,
    replyTo: message.replyTo
      ? {
          id: message.replyTo.id,
          content: message.replyTo.deletedAt
            ? 'Mensagem excluída'
            : message.replyTo.content,
          deletedAt: message.replyTo.deletedAt?.toISOString() || null,
          author: message.replyTo.author,
          attachment:
            replyAttachment && !message.replyTo.deletedAt
              ? {
                  id: replyAttachment.id,
                  fileName: replyAttachment.fileName,
                  mimeType: replyAttachment.mimeType,
                  category: attachmentCategory(replyAttachment.mimeType),
                }
              : null,
        }
      : null,
    attachments: deleted
      ? []
      : message.attachments.map(serializeChatAttachment),
    reactions: deleted ? [] : serializeReactions(message.reactions, userId),
    sharedResource: deleted ? null : sharedResource(message),
    replyCount: message._count.replies,
    readByOthers: Boolean(
      message.authorId === userId &&
      otherReadAt &&
      message.createdAt.getTime() <= otherReadAt.getTime()
    ),
    canEdit:
      !deleted &&
      message.authorId === userId &&
      Date.now() - message.createdAt.getTime() <= CHAT_EDIT_WINDOW_MS,
  };
}

export async function serializeChatMessagesForViewer(input: {
  messages: ChatMessagePayload[];
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  otherReadAt?: Date | null;
}) {
  const taskIds = input.messages.flatMap((message) =>
    message.taskId ? [message.taskId] : []
  );
  const ticketIds = input.messages.flatMap((message) =>
    message.ticketId ? [message.ticketId] : []
  );
  const eventIds = input.messages.flatMap((message) =>
    message.eventId ? [message.eventId] : []
  );
  const noteIds = input.messages.flatMap((message) =>
    message.noteId ? [message.noteId] : []
  );
  const needsTeamMembership =
    eventIds.length > 0 ||
    (!isOrganizationManager(input.role) && taskIds.length > 0);
  const teamMemberships = needsTeamMembership
    ? await db.teamMember.findMany({
        where: {
          organizationId: input.organizationId,
          userId: input.userId,
        },
        select: { teamId: true },
      })
    : [];
  const teamIds = teamMemberships.map((membership) => membership.teamId);
  const [tasks, tickets, events, notes] = await Promise.all([
    taskIds.length
      ? db.task.findMany({
          where: {
            id: { in: taskIds },
            organizationId: input.organizationId,
            ...(isOrganizationManager(input.role)
              ? {}
              : {
                  OR: [
                    { userId: input.userId },
                    { createdById: input.userId },
                    { assigneeId: input.userId },
                    ...(teamIds.length ? [{ teamId: { in: teamIds } }] : []),
                  ],
                }),
          },
          select: { id: true },
        })
      : [],
    ticketIds.length
      ? db.ticket.findMany({
          where: {
            id: { in: ticketIds },
            organizationId: input.organizationId,
            ...ticketVisibilityWhere(input.userId, input.role),
          },
          select: { id: true },
        })
      : [],
    eventIds.length
      ? db.calendarEvent.findMany({
          where: {
            id: { in: eventIds },
            organizationId: input.organizationId,
            OR: [
              { creatorId: input.userId },
              { participants: { some: { userId: input.userId } } },
              { visibility: 'ORGANIZATION' },
              ...(teamIds.length
                ? [
                    {
                      visibility: 'TEAMS' as const,
                      teams: { some: { teamId: { in: teamIds } } },
                    },
                  ]
                : []),
            ],
          },
          select: { id: true },
        })
      : [],
    noteIds.length
      ? db.note.findMany({
          where: {
            id: { in: noteIds },
            organizationId: input.organizationId,
            scopeKey: `organization:${input.organizationId}`,
            trashedAt: null,
          },
          select: { id: true },
        })
      : [],
  ]);
  const visibleResources = new Set([
    ...tasks.map((task) => `TASK:${task.id}`),
    ...tickets.map((ticket) => `TICKET:${ticket.id}`),
    ...events.map((event) => `CALENDAR_EVENT:${event.id}`),
    ...notes.map((note) => `KCS:${note.id}`),
  ]);
  return input.messages.map((message) => {
    const serialized = serializeChatMessage(
      message,
      input.userId,
      input.otherReadAt
    );
    if (
      serialized.sharedResource &&
      !visibleResources.has(
        `${serialized.sharedResource.type}:${serialized.sharedResource.id}`
      )
    ) {
      return { ...serialized, sharedResource: null };
    }
    return serialized;
  });
}

export async function getDirectConversationReadAt(
  userId: string,
  channelId: string,
  isDirect: boolean
) {
  if (!isDirect) return null;
  const state = await db.chatChannelReadState.findFirst({
    where: { channelId, userId: { not: userId } },
    orderBy: { lastReadAt: 'desc' },
    select: { lastReadAt: true },
  });
  return state?.lastReadAt || null;
}

function mentionSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-');
}

export async function replaceChatMentions(
  tx: Prisma.TransactionClient,
  messageId: string,
  organizationId: string,
  content: string,
  allowEveryone: boolean
) {
  const usernames = Array.from(
    new Set(
      Array.from(content.matchAll(/(?:^|\s)@([a-z0-9._-]{2,50})/gi)).map(
        (match) => match[1].toLowerCase()
      )
    )
  ).filter((username) => username !== 'todos');
  const wantsEveryone = /(?:^|\s)@todos\b/i.test(content);
  if (wantsEveryone && !allowEveryone) {
    throw new Error('Somente administradores podem mencionar @todos.');
  }
  const teamSlugs = Array.from(
    new Set(
      Array.from(content.matchAll(/@equipe:([a-z0-9-]{2,80})/gi)).map((match) =>
        match[1].toLowerCase()
      )
    )
  );
  const [members, teams] = await Promise.all([
    wantsEveryone || usernames.length
      ? tx.organizationMember.findMany({
          where: {
            organizationId,
            ...(wantsEveryone
              ? {}
              : { user: { username: { in: usernames, mode: 'insensitive' } } }),
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
  await Promise.all([
    tx.chatMessageUserMention.deleteMany({ where: { messageId } }),
    tx.chatMessageTeamMention.deleteMany({ where: { messageId } }),
  ]);
  if (members.length) {
    await tx.chatMessageUserMention.createMany({
      data: members.map((member) => ({
        messageId,
        organizationId,
        userId: member.userId,
      })),
      skipDuplicates: true,
    });
  }
  const matchedTeams = teams.filter((team) =>
    teamSlugs.includes(mentionSlug(team.name))
  );
  if (matchedTeams.length) {
    await tx.chatMessageTeamMention.createMany({
      data: matchedTeams.map((team) => ({
        messageId,
        organizationId,
        teamId: team.id,
      })),
      skipDuplicates: true,
    });
  }
}

export type CreateChatMessageInput = ChatResourceInput & {
  organizationId: string;
  channelId: string;
  content: string;
  replyToId?: string | null;
  clientNonce?: string | null;
  attachments?: ValidatedChatAttachment[];
};

export async function createChatMessage(
  userId: string,
  input: CreateChatMessageInput
) {
  const access = await requireChatChannelPost(userId, input.channelId);
  if (access.channel.organizationId !== input.organizationId) {
    throw new Error('Recurso não encontrado ou acesso negado.');
  }
  const attachments = input.attachments || [];
  await enforceChatMessageRateLimit(
    userId,
    input.channelId,
    attachments.reduce((total, attachment) => total + attachment.size, 0)
  );
  await validateChatSharedResource(userId, access, input);
  if (input.content.length > CHAT_MESSAGE_MAX_LENGTH) {
    throw new Error(
      `A mensagem deve ter até ${CHAT_MESSAGE_MAX_LENGTH} caracteres.`
    );
  }
  const content = input.content.trim();
  const hasResource = Boolean(
    input.eventId || input.taskId || input.ticketId || input.noteId
  );
  if (!content && !attachments.length && !hasResource) {
    throw new Error('Digite uma mensagem ou adicione um arquivo.');
  }
  const clientNonce = input.clientNonce?.trim().slice(0, 100) || null;
  if (clientNonce) {
    const existing = await db.chatMessage.findUnique({
      where: {
        channelId_authorId_clientNonce: {
          channelId: input.channelId,
          authorId: userId,
          clientNonce,
        },
      },
      include: chatMessageInclude,
    });
    if (existing) {
      const readAt = await getDirectConversationReadAt(
        userId,
        input.channelId,
        access.channel.type === 'DIRECT'
      );
      const [serialized] = await serializeChatMessagesForViewer({
        messages: [existing],
        userId,
        organizationId: input.organizationId,
        role: access.membership.role,
        otherReadAt: readAt,
      });
      return serialized;
    }
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
    if (!reply) throw new Error('Mensagem original não encontrada.');
  }
  const created = await db.$transaction(async (tx) => {
    const message = await tx.chatMessage.create({
      data: {
        channelId: input.channelId,
        organizationId: input.organizationId,
        authorId: userId,
        content,
        replyToId: input.replyToId || null,
        eventId: input.eventId || null,
        taskId: input.taskId || null,
        ticketId: input.ticketId || null,
        noteId: input.noteId || null,
        clientNonce,
        attachments: {
          create: attachments.map((attachment) => ({
            id: attachment.id,
            organization: { connect: { id: input.organizationId } },
            fileName: attachment.fileName,
            originalName: attachment.originalName,
            mimeType: attachment.mimeType,
            extension: attachment.extension,
            size: attachment.size,
            storageKey: attachment.storageKey,
            data: Buffer.from(attachment.data),
            width: attachment.width,
            height: attachment.height,
          })),
        },
      },
    });
    await replaceChatMentions(
      tx,
      message.id,
      input.organizationId,
      content,
      isOrganizationManager(access.membership.role)
    );
    if (input.replyToId) {
      await tx.chatMessage.update({
        where: { id: input.replyToId },
        data: { updatedAt: new Date() },
      });
    }
    return message.id;
  });
  const message = await db.chatMessage.findUniqueOrThrow({
    where: { id: created },
    include: chatMessageInclude,
  });
  const readAt = await getDirectConversationReadAt(
    userId,
    input.channelId,
    access.channel.type === 'DIRECT'
  );
  const [serialized] = await serializeChatMessagesForViewer({
    messages: [message],
    userId,
    organizationId: input.organizationId,
    role: access.membership.role,
    otherReadAt: readAt,
  });
  return serialized;
}
