'use server';

import { Prisma, type OrganizationRole } from '@prisma/client';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { requireUser } from '@/lib/auth/session';
import {
  OrganizationAuthorizationError,
  requireOrganizationMembership,
  requireOrganizationRole,
  requireOrganizationTeam,
  requireOrganizationUser,
} from '@/lib/organizations/authorization';
import {
  ACTIVE_ORGANIZATION_COOKIE,
  getOrganizationContextForUser,
} from '@/lib/organizations/context';
import {
  canManageMember,
  ORGANIZATION_MANAGER_ROLES,
} from '@/lib/organizations/policy';
import { db } from '@/lib/prisma';

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type OrganizationInput = {
  name: string;
  description?: string;
  avatarUrl?: string;
};

export type TeamInput = {
  name: string;
  description?: string;
};

function cleanText(value: string | undefined, max: number) {
  return (value || '').trim().slice(0, max);
}

function organizationSlug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'organizacao'
  );
}

async function uniqueOrganizationSlug(name: string) {
  const base = organizationSlug(name);
  let slug = base;
  let suffix = 2;
  while (
    await db.organization.findUnique({ where: { slug }, select: { id: true } })
  ) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

function actionError(error: unknown, fallback: string) {
  if (error instanceof OrganizationAuthorizationError) return error.message;
  if (
    typeof error === 'object' &&
    error &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  ) {
    return 'Já existe um registro com esses dados.';
  }
  console.error(fallback, error);
  return fallback;
}

function revalidateAdmin() {
  revalidatePath('/admin');
  revalidatePath('/admin/tasks');
}

export async function getOrganizationContext() {
  const user = await requireUser();
  return {
    success: true as const,
    data: await getOrganizationContextForUser(user.id),
  };
}

export async function setActiveOrganization(
  organizationId: string | null
): Promise<ActionResult<{ organizationId: string | null }>> {
  try {
    const user = await requireUser();
    const cookieStore = await cookies();
    if (!organizationId) {
      cookieStore.delete(ACTIVE_ORGANIZATION_COOKIE);
      revalidateAdmin();
      return { success: true, data: { organizationId: null } };
    }

    await requireOrganizationMembership(user.id, organizationId);
    cookieStore.set({
      name: ACTIVE_ORGANIZATION_COOKIE,
      value: organizationId,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
    revalidateAdmin();
    return { success: true, data: { organizationId } };
  } catch (error) {
    return {
      success: false,
      error: actionError(error, 'Não foi possível trocar a organização.'),
    };
  }
}

export async function createOrganization(
  input: OrganizationInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();
    const name = cleanText(input.name, 100);
    if (name.length < 2) {
      return { success: false, error: 'Nome deve ter ao menos 2 caracteres.' };
    }
    const slug = await uniqueOrganizationSlug(name);
    const organization = await db.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          name,
          slug,
          description: cleanText(input.description, 1000) || null,
          avatarUrl: cleanText(input.avatarUrl, 500) || null,
          createdById: user.id,
        },
      });
      await tx.organizationMember.create({
        data: {
          organizationId: created.id,
          userId: user.id,
          role: 'OWNER',
        },
      });
      await tx.chatChannel.create({
        data: {
          organizationId: created.id,
          name: 'Geral',
          description: 'Canal geral da organização.',
          type: 'ORGANIZATION',
          createdById: user.id,
        },
      });
      return created;
    });
    await setActiveOrganization(organization.id);
    return { success: true, data: { id: organization.id } };
  } catch (error) {
    return {
      success: false,
      error: actionError(error, 'Não foi possível criar a organização.'),
    };
  }
}

export async function getOrganizationWorkspace(organizationId: string) {
  try {
    const user = await requireUser();
    await requireOrganizationMembership(user.id, organizationId);
    const organization = await db.organization.findFirst({
      where: { id: organizationId, active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        avatarUrl: true,
        active: true,
        members: {
          orderBy: [{ role: 'asc' }, { user: { name: 'asc' } }],
          select: {
            id: true,
            role: true,
            joinedAt: true,
            user: {
              select: { id: true, name: true, username: true, email: true },
            },
          },
        },
        teams: {
          orderBy: [{ active: 'desc' }, { name: 'asc' }],
          select: {
            id: true,
            name: true,
            description: true,
            active: true,
            members: {
              select: {
                userId: true,
                organizationMember: {
                  select: {
                    user: { select: { id: true, name: true, username: true } },
                  },
                },
              },
            },
            _count: { select: { tasks: true, tickets: true } },
          },
        },
        _count: { select: { tickets: true, tasks: true, notes: true } },
      },
    });
    if (!organization) throw new OrganizationAuthorizationError();
    return { success: true as const, data: organization };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível carregar a organização.'),
    };
  }
}

export async function updateOrganization(
  organizationId: string,
  input: Partial<OrganizationInput> & { active?: boolean }
) {
  try {
    const { membership } = await requireOrganizationRole(
      organizationId,
      ORGANIZATION_MANAGER_ROLES
    );
    const data: Prisma.OrganizationUpdateInput = {};
    if (input.name !== undefined) {
      const name = cleanText(input.name, 100);
      if (name.length < 2)
        return { success: false as const, error: 'Nome inválido.' };
      data.name = name;
    }
    if (input.description !== undefined)
      data.description = cleanText(input.description, 1000) || null;
    if (input.avatarUrl !== undefined)
      data.avatarUrl = cleanText(input.avatarUrl, 500) || null;
    if (input.active !== undefined) {
      if (membership.role !== 'OWNER')
        throw new OrganizationAuthorizationError();
      data.active = input.active;
    }
    const organization = await db.organization.update({
      where: { id: organizationId },
      data,
    });
    revalidateAdmin();
    return { success: true as const, data: organization };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível atualizar a organização.'),
    };
  }
}

export async function addOrganizationMember(input: {
  organizationId: string;
  identifier: string;
  role?: OrganizationRole;
}) {
  try {
    const { membership } = await requireOrganizationRole(
      input.organizationId,
      ORGANIZATION_MANAGER_ROLES
    );
    const identifier = cleanText(input.identifier, 254).toLowerCase();
    const role = input.role || 'MEMBER';
    if (!identifier)
      return { success: false as const, error: 'Informe email ou username.' };
    if (membership.role === 'ADMIN' && role !== 'MEMBER') {
      throw new OrganizationAuthorizationError();
    }
    const target = await db.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier.replace(/^@/, '') }],
      },
      select: { id: true },
    });
    if (!target)
      return {
        success: false as const,
        error: 'Usuário cadastrado não encontrado.',
      };
    await db.organizationMember.create({
      data: { organizationId: input.organizationId, userId: target.id, role },
    });
    revalidateAdmin();
    return { success: true as const, data: { userId: target.id } };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível adicionar o membro.'),
    };
  }
}

export async function updateOrganizationMemberRole(input: {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
}) {
  try {
    const { membership: actor } = await requireOrganizationRole(
      input.organizationId,
      ORGANIZATION_MANAGER_ROLES
    );
    const target = await requireOrganizationUser(
      input.organizationId,
      input.userId
    );
    if (!canManageMember(actor.role, target.role, input.role)) {
      throw new OrganizationAuthorizationError();
    }
    await db.$transaction(
      async (tx) => {
        if (target.role === 'OWNER' && input.role !== 'OWNER') {
          const owners = await tx.organizationMember.count({
            where: { organizationId: input.organizationId, role: 'OWNER' },
          });
          if (owners <= 1) {
            throw new OrganizationAuthorizationError(
              'A organização precisa manter ao menos um proprietário.'
            );
          }
        }
        await tx.organizationMember.update({
          where: {
            organizationId_userId: {
              organizationId: input.organizationId,
              userId: input.userId,
            },
          },
          data: { role: input.role },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    revalidateAdmin();
    return {
      success: true as const,
      data: { userId: input.userId, role: input.role },
    };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível alterar o papel.'),
    };
  }
}

async function removeMembership(organizationId: string, userId: string) {
  await db.$transaction(
    async (tx) => {
      const target = await tx.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId, userId } },
        select: { role: true },
      });
      if (!target) throw new OrganizationAuthorizationError();
      if (target.role === 'OWNER') {
        const owners = await tx.organizationMember.count({
          where: { organizationId, role: 'OWNER' },
        });
        if (owners <= 1) {
          throw new OrganizationAuthorizationError(
            'A organização precisa manter ao menos um proprietário.'
          );
        }
      }
      await tx.task.updateMany({
        where: { organizationId, assigneeId: userId },
        data: { assigneeId: null },
      });
      await tx.ticket.updateMany({
        where: { organizationId, assigneeId: userId },
        data: { assigneeId: null },
      });
      await tx.organizationMember.delete({
        where: { organizationId_userId: { organizationId, userId } },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}

export async function removeOrganizationMember(input: {
  organizationId: string;
  userId: string;
}) {
  try {
    const { membership: actor } = await requireOrganizationRole(
      input.organizationId,
      ORGANIZATION_MANAGER_ROLES
    );
    const target = await requireOrganizationUser(
      input.organizationId,
      input.userId
    );
    if (!canManageMember(actor.role, target.role))
      throw new OrganizationAuthorizationError();
    await removeMembership(input.organizationId, input.userId);
    revalidateAdmin();
    return { success: true as const, data: { userId: input.userId } };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível remover o membro.'),
    };
  }
}

export async function leaveOrganization(organizationId: string) {
  try {
    const user = await requireUser();
    const membership = await requireOrganizationMembership(
      user.id,
      organizationId
    );
    await removeMembership(organizationId, user.id);
    const cookieStore = await cookies();
    if (cookieStore.get(ACTIVE_ORGANIZATION_COOKIE)?.value === organizationId) {
      cookieStore.delete(ACTIVE_ORGANIZATION_COOKIE);
    }
    revalidateAdmin();
    return { success: true as const, data: { organizationId } };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível sair da organização.'),
    };
  }
}

export async function createTeam(organizationId: string, input: TeamInput) {
  try {
    await requireOrganizationRole(organizationId, ORGANIZATION_MANAGER_ROLES);
    const name = cleanText(input.name, 100);
    if (name.length < 2)
      return { success: false as const, error: 'Nome de equipe inválido.' };
    const team = await db.team.create({
      data: {
        organizationId,
        name,
        description: cleanText(input.description, 1000) || null,
      },
    });
    revalidateAdmin();
    return { success: true as const, data: team };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível criar a equipe.'),
    };
  }
}

export async function updateTeam(
  organizationId: string,
  teamId: string,
  input: Partial<TeamInput> & { active?: boolean }
) {
  try {
    await requireOrganizationRole(organizationId, ORGANIZATION_MANAGER_ROLES);
    await requireOrganizationTeam(organizationId, teamId, { active: false });
    const data: Prisma.TeamUpdateInput = {};
    if (input.name !== undefined) {
      const name = cleanText(input.name, 100);
      if (name.length < 2)
        return { success: false as const, error: 'Nome de equipe inválido.' };
      data.name = name;
    }
    if (input.description !== undefined)
      data.description = cleanText(input.description, 1000) || null;
    if (input.active !== undefined) data.active = input.active;
    const team = await db.$transaction(async (tx) => {
      if (input.active === false) {
        await tx.ticketQueue.updateMany({
          where: { organizationId, teamId },
          data: { teamId: null },
        });
      }
      return tx.team.update({ where: { id: teamId }, data });
    });
    revalidateAdmin();
    return { success: true as const, data: team };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível atualizar a equipe.'),
    };
  }
}

export async function addTeamMember(input: {
  organizationId: string;
  teamId: string;
  userId: string;
}) {
  try {
    await requireOrganizationRole(
      input.organizationId,
      ORGANIZATION_MANAGER_ROLES
    );
    await Promise.all([
      requireOrganizationTeam(input.organizationId, input.teamId),
      requireOrganizationUser(input.organizationId, input.userId),
    ]);
    const membership = await db.teamMember.create({ data: input });
    revalidateAdmin();
    return { success: true as const, data: membership };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível adicionar à equipe.'),
    };
  }
}

export async function removeTeamMember(input: {
  organizationId: string;
  teamId: string;
  userId: string;
}) {
  try {
    await requireOrganizationRole(
      input.organizationId,
      ORGANIZATION_MANAGER_ROLES
    );
    await requireOrganizationTeam(input.organizationId, input.teamId, {
      active: false,
    });
    await db.$transaction([
      db.task.updateMany({
        where: {
          organizationId: input.organizationId,
          teamId: input.teamId,
          assigneeId: input.userId,
        },
        data: { assigneeId: null },
      }),
      db.ticket.updateMany({
        where: {
          organizationId: input.organizationId,
          teamId: input.teamId,
          assigneeId: input.userId,
        },
        data: { assigneeId: null },
      }),
      db.teamMember.deleteMany({ where: input }),
    ]);
    revalidateAdmin();
    return { success: true as const, data: input };
  } catch (error) {
    return {
      success: false as const,
      error: actionError(error, 'Não foi possível remover da equipe.'),
    };
  }
}
