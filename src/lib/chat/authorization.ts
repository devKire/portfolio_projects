import type { Prisma } from '@prisma/client';

import { OrganizationAuthorizationError } from '@/lib/organizations/authorization';
import {
  canManageChannel,
  canModerateMessage,
  canPinMessage,
  canPostMessage,
  canViewChannel,
} from '@/lib/organizations/policy';
import { db } from '@/lib/prisma';

export const chatChannelInclude = {
  team: { select: { id: true, name: true, active: true } },
  members: {
    include: {
      organizationMember: {
        select: {
          user: {
            select: { id: true, name: true, username: true, email: true },
          },
        },
      },
    },
  },
} satisfies Prisma.ChatChannelInclude;

export async function getChatChannelAccess(userId: string, channelId: string) {
  const channel = await db.chatChannel.findUnique({
    where: { id: channelId },
    include: chatChannelInclude,
  });
  if (!channel) throw new OrganizationAuthorizationError();
  const membership = await db.organizationMember.findFirst({
    where: {
      organizationId: channel.organizationId,
      userId,
      organization: { active: true },
    },
    select: { role: true },
  });
  if (!membership) throw new OrganizationAuthorizationError();
  const [teamMembership, channelMembership] = await Promise.all([
    channel.teamId
      ? db.teamMember.findFirst({
          where: {
            organizationId: channel.organizationId,
            teamId: channel.teamId,
            userId,
          },
          select: { id: true },
        })
      : null,
    channel.type === 'PRIVATE' || channel.type === 'DIRECT'
      ? db.chatChannelMember.findFirst({
          where: { channelId, organizationId: channel.organizationId, userId },
          select: { id: true },
        })
      : null,
  ]);
  const policyInput = {
    role: membership.role,
    type: channel.type,
    isTeamMember: Boolean(teamMembership),
    isChannelMember: Boolean(channelMembership),
  };
  if (!canViewChannel(policyInput)) throw new OrganizationAuthorizationError();
  const canManage = canManageChannel({
    role: membership.role,
    type: channel.type,
    actorId: userId,
    createdById: channel.createdById,
    isChannelMember: Boolean(channelMembership),
  });
  return {
    channel,
    membership,
    isTeamMember: Boolean(teamMembership),
    isChannelMember: Boolean(channelMembership),
    canManage,
    canPost: canPostMessage(policyInput),
    canPin: canPinMessage({
      role: membership.role,
      type: channel.type,
      isChannelMember: Boolean(channelMembership),
      canManageChannel: canManage,
    }),
  };
}

export async function requireChatChannelPost(
  userId: string,
  channelId: string
) {
  const access = await getChatChannelAccess(userId, channelId);
  if (!access.canPost) throw new OrganizationAuthorizationError();
  return access;
}

export async function requireChatMessageModeration(
  userId: string,
  messageId: string
) {
  const message = await db.chatMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      channelId: true,
      organizationId: true,
      authorId: true,
      replyToId: true,
      deletedAt: true,
    },
  });
  if (!message) throw new OrganizationAuthorizationError();
  const access = await getChatChannelAccess(userId, message.channelId);
  if (
    access.channel.organizationId !== message.organizationId ||
    !canModerateMessage({
      role: access.membership.role,
      actorId: userId,
      authorId: message.authorId,
      channelType: access.channel.type,
    })
  ) {
    throw new OrganizationAuthorizationError();
  }
  return { message, access };
}

export async function getChatMessageAccess(userId: string, messageId: string) {
  const message = await db.chatMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      channelId: true,
      organizationId: true,
      authorId: true,
      replyToId: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      pinnedAt: true,
    },
  });
  if (!message) throw new OrganizationAuthorizationError();
  const access = await getChatChannelAccess(userId, message.channelId);
  if (access.channel.organizationId !== message.organizationId) {
    throw new OrganizationAuthorizationError();
  }
  return { message, access };
}

export async function getChatAttachmentAccess(
  userId: string,
  attachmentId: string
) {
  const attachment = await db.chatAttachment.findUnique({
    where: { id: attachmentId },
    select: {
      id: true,
      messageId: true,
      organizationId: true,
      fileName: true,
      originalName: true,
      mimeType: true,
      extension: true,
      size: true,
      data: true,
      message: {
        select: {
          channelId: true,
          organizationId: true,
          deletedAt: true,
        },
      },
    },
  });
  if (!attachment || attachment.message.deletedAt) {
    throw new OrganizationAuthorizationError();
  }
  const access = await getChatChannelAccess(
    userId,
    attachment.message.channelId
  );
  if (
    access.channel.organizationId !== attachment.organizationId ||
    attachment.message.organizationId !== attachment.organizationId
  ) {
    throw new OrganizationAuthorizationError();
  }
  return { attachment, access };
}
