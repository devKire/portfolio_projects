import { cookies } from 'next/headers';

import { db } from '@/lib/prisma';

export const ACTIVE_ORGANIZATION_COOKIE = 'portfolio_active_organization';

export async function getOrganizationContextForUser(userId: string) {
  const memberships = await db.organizationMember.findMany({
    where: { userId, organization: { active: true } },
    orderBy: { organization: { name: 'asc' } },
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          avatarUrl: true,
          active: true,
          _count: {
            select: { members: true, teams: true, ticketQueues: true },
          },
        },
      },
    },
  });

  const cookieStore = await cookies();
  const preferredId = cookieStore.get(ACTIVE_ORGANIZATION_COOKIE)?.value;
  const activeMembership =
    memberships.find((item) => item.organization.id === preferredId) ||
    memberships[0] ||
    null;

  return {
    organizations: memberships.map((item) => ({
      ...item.organization,
      role: item.role,
    })),
    activeOrganizationId: activeMembership?.organization.id || null,
    activeRole: activeMembership?.role || null,
  };
}

export type OrganizationContext = Awaited<
  ReturnType<typeof getOrganizationContextForUser>
>;
