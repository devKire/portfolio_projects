import { db } from '@/lib/prisma';

export async function getOwnedLandingPage(
  userId: string,
  landingpageId?: string
) {
  return db.landingPage.findFirst({
    where: {
      userId,
      ...(landingpageId ? { id: landingpageId } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function requireOwnedLandingPage(
  userId: string,
  landingpageId?: string
) {
  const landingpage = await getOwnedLandingPage(userId, landingpageId);
  if (!landingpage) {
    throw new Error('Landing page não encontrada.');
  }
  return landingpage;
}
