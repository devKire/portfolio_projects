import { db } from '@/lib/prisma';

function secondsAgo(seconds: number) {
  return new Date(Date.now() - seconds * 1000);
}

export async function enforceChatMessageRateLimit(
  userId: string,
  channelId: string,
  incomingAttachmentBytes = 0
) {
  const [recentMessages, recentBytes] = await Promise.all([
    db.chatMessage.count({
      where: {
        authorId: userId,
        channelId,
        createdAt: { gte: secondsAgo(60) },
      },
    }),
    db.chatAttachment.aggregate({
      where: {
        createdAt: { gte: secondsAgo(60 * 60) },
        message: { authorId: userId },
      },
      _sum: { size: true },
    }),
  ]);
  if (recentMessages >= 30) {
    throw new Error('Muitas mensagens em pouco tempo. Aguarde um momento.');
  }
  if (
    (recentBytes._sum.size || 0) + incomingAttachmentBytes >
    50 * 1024 * 1024
  ) {
    throw new Error('Limite de uploads por hora atingido.');
  }
}

export async function enforceChatReactionRateLimit(userId: string) {
  const recent = await db.chatReaction.count({
    where: { userId, createdAt: { gte: secondsAgo(60) } },
  });
  if (recent >= 120) {
    throw new Error('Muitas reações em pouco tempo. Aguarde um momento.');
  }
}
