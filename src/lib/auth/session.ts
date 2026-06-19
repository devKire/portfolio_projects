import { createHash, randomBytes } from 'crypto';
import type { Prisma } from '@prisma/client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { db } from '@/lib/prisma';

export const SESSION_COOKIE_NAME = 'portfolio_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const currentUserSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  role: true,
  landingPages: {
    orderBy: { createdAt: 'asc' },
    take: 1,
    select: { id: true, slug: true },
  },
} satisfies Prisma.UserSelect;

export type CurrentUser = Prisma.UserGetPayload<{
  select: typeof currentUserSelect;
}>;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await db.userSession.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    expires: expiresAt,
    path: '/',
  });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await db.userSession.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      user: { select: currentUserSelect },
    },
  });

  if (!session) return null;

  if (session.expiresAt <= new Date()) {
    await db.userSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function deleteCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await db.userSession
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => {});
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
