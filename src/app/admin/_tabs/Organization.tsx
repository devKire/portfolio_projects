'use client';

import type { OrganizationRole } from '@prisma/client';
import {
  Building2,
  Loader2,
  Plus,
  ShieldCheck,
  UserMinus,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  addOrganizationMember,
  addTeamMember,
  createOrganization,
  createTeam,
  getOrganizationWorkspace,
  leaveOrganization,
  removeOrganizationMember,
  removeTeamMember,
  updateOrganization,
  updateOrganizationMemberRole,
  updateTeam,
} from '@/app/actions/organizations';
import type { OrganizationContext } from '@/lib/organizations/context';

type Workspace = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  active: boolean;
  members: Array<{
    id: string;
    role: OrganizationRole;
    joinedAt: Date;
    user: { id: string; name: string | null; username: string; email: string };
  }>;
  teams: Array<{
    id: string;
    name: string;
    description: string | null;
    active: boolean;
    members: Array<{
      userId: string;
      organizationMember: {
        user: { id: string; name: string | null; username: string };
      };
    }>;
    _count: { tasks: number; tickets: number };
  }>;
  _count: { tickets: number; tasks: number; notes: number };
};

type OrganizationProps = {
  userId: string;
  organizationContext: OrganizationContext;
  onOrganizationContextChange: () => Promise<void>;
};

const inputClass =
  'h-10 w-full rounded-md border border-[#303036] bg-[#111] px-3 text-sm text-white outline-none placeholder:text-[#666670] focus:border-[#6f55d9]';

const roleLabel: Record<OrganizationRole, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MEMBER: 'Membro',
};

export default function Organization({
  userId,
  organizationContext,
  onOrganizationContextChange,
}: OrganizationProps) {
  const organizationId = organizationContext.activeOrganizationId;
  const activeRole = organizationContext.activeRole;
  const canManage = activeRole === 'OWNER' || activeRole === 'ADMIN';
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(Boolean(organizationId));
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationId) {
      setWorkspace(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await getOrganizationWorkspace(organizationId);
    if (result.success) setWorkspace(result.data as Workspace);
    else toast.error(result.error);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (
    key: string,
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string,
    refreshContext = false
  ) => {
    setBusy(key);
    const result = await action();
    if (result.success) {
      toast.success(successMessage);
      if (refreshContext) await onOrganizationContextChange();
      await load();
    } else {
      toast.error(result.error || 'Não foi possível concluir a operação.');
    }
    setBusy(null);
    return result.success;
  };

  const membersById = useMemo(
    () => new Map(workspace?.members.map((member) => [member.user.id, member])),
    [workspace]
  );

  const handleCreateOrganization = async (formData: FormData) => {
    await run(
      'create-organization',
      () =>
        createOrganization({
          name: String(formData.get('name') || ''),
          description: String(formData.get('description') || ''),
        }),
      'Organização criada.',
      true
    );
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-[#9b9ba3]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando
        organização...
      </div>
    );
  }

  if (!organizationId || !workspace) {
    return (
      <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center">
        <div className="rounded-xl border border-[#303036] bg-[#1b1b1f] p-6 sm:p-8">
          <Building2 className="mb-4 h-9 w-9 text-[#9a8cff]" />
          <h1 className="text-xl font-semibold text-white">
            Crie sua organização
          </h1>
          <p className="mt-2 text-sm text-[#9b9ba3]">
            Reúna equipes, tarefas, filas, chamados e conhecimento em um espaço
            privado.
          </p>
          <form action={handleCreateOrganization} className="mt-6 space-y-3">
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              placeholder="Nome da organização"
              className={inputClass}
            />
            <textarea
              name="description"
              maxLength={1000}
              placeholder="Descrição (opcional)"
              className={`${inputClass} min-h-24 py-3`}
            />
            <button
              disabled={busy !== null}
              className="flex h-10 items-center gap-2 rounded-md bg-[#6f55d9] px-4 text-sm font-medium text-white hover:bg-[#7d65df] disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}{' '}
              Criar organização
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 space-y-5 pb-8">
      <header className="flex flex-col gap-3 rounded-xl border border-[#303036] bg-[#1b1b1f] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#342d54] text-lg font-semibold text-[#d5cbff]">
            {workspace.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wider text-[#9a8cff] uppercase">
              Organização
            </p>
            <h1 className="truncate text-xl font-semibold text-white">
              {workspace.name}
            </h1>
            <p className="text-sm text-[#9b9ba3]">
              {roleLabel[activeRole || 'MEMBER']} · {workspace.members.length}{' '}
              membros
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <Metric value={workspace._count.tasks} label="Tarefas" />
          <Metric value={workspace._count.tickets} label="Chamados" />
          <Metric value={workspace._count.notes} label="KCS" />
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)]">
        <div className="space-y-5">
          <Panel
            title="Membros"
            icon={Users}
            description="Usuários cadastrados associados a esta organização."
          >
            {canManage && (
              <form
                action={async (formData) => {
                  await run(
                    'add-member',
                    () =>
                      addOrganizationMember({
                        organizationId,
                        identifier: String(formData.get('identifier') || ''),
                        role: String(
                          formData.get('role') || 'MEMBER'
                        ) as OrganizationRole,
                      }),
                    'Membro adicionado.',
                    true
                  );
                }}
                className="mb-4 grid gap-2 border-b border-[#2f2f35] pb-4 sm:grid-cols-[1fr_150px_auto]"
              >
                <input
                  name="identifier"
                  required
                  placeholder="Email ou @username cadastrado"
                  className={inputClass}
                />
                <select name="role" className={inputClass}>
                  <option value="MEMBER">Membro</option>
                  {activeRole === 'OWNER' && (
                    <option value="ADMIN">Administrador</option>
                  )}
                  {activeRole === 'OWNER' && (
                    <option value="OWNER">Proprietário</option>
                  )}
                </select>
                <button
                  disabled={busy !== null}
                  className="h-10 rounded-md bg-[#6f55d9] px-4 text-sm text-white disabled:opacity-50"
                >
                  Adicionar
                </button>
              </form>
            )}
            <div className="divide-y divide-[#2f2f35]">
              {workspace.members.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {member.user.name || `@${member.user.username}`}
                    </p>
                    <p className="truncate text-xs text-[#777780]">
                      @{member.user.username} · {member.user.email}
                    </p>
                  </div>
                  {canManage && member.user.id !== userId ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        disabled={
                          busy !== null ||
                          (activeRole === 'ADMIN' && member.role !== 'MEMBER')
                        }
                        onChange={(event) =>
                          void run(
                            `role-${member.user.id}`,
                            () =>
                              updateOrganizationMemberRole({
                                organizationId,
                                userId: member.user.id,
                                role: event.target.value as OrganizationRole,
                              }),
                            'Papel atualizado.',
                            true
                          )
                        }
                        className="h-8 rounded border border-[#303036] bg-[#111] px-2 text-xs text-white"
                      >
                        <option value="MEMBER">Membro</option>
                        {activeRole === 'OWNER' && (
                          <option value="ADMIN">Administrador</option>
                        )}
                        {activeRole === 'OWNER' && (
                          <option value="OWNER">Proprietário</option>
                        )}
                      </select>
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() =>
                          void run(
                            `remove-${member.user.id}`,
                            () =>
                              removeOrganizationMember({
                                organizationId,
                                userId: member.user.id,
                              }),
                            'Membro removido.',
                            true
                          )
                        }
                        className="rounded p-2 text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                        aria-label={`Remover ${member.user.name || member.user.username}`}
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex w-fit items-center gap-1 rounded bg-[#292936] px-2 py-1 text-xs text-[#c9b8ff]">
                      <ShieldCheck className="h-3 w-3" />{' '}
                      {roleLabel[member.role]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Equipes"
            icon={Users}
            description="As equipes agrupam responsáveis de tarefas e chamados."
          >
            {canManage && (
              <form
                action={async (formData) => {
                  await run(
                    'create-team',
                    () =>
                      createTeam(organizationId, {
                        name: String(formData.get('name') || ''),
                        description: String(formData.get('description') || ''),
                      }),
                    'Equipe criada.'
                  );
                }}
                className="mb-4 grid gap-2 border-b border-[#2f2f35] pb-4 sm:grid-cols-2"
              >
                <input
                  name="name"
                  required
                  minLength={2}
                  placeholder="Nome da equipe"
                  className={inputClass}
                />
                <input
                  name="description"
                  placeholder="Descrição"
                  className={inputClass}
                />
                <button
                  disabled={busy !== null}
                  className="h-10 w-fit rounded-md bg-[#6f55d9] px-4 text-sm text-white disabled:opacity-50"
                >
                  Criar equipe
                </button>
              </form>
            )}
            <div className="grid gap-3 lg:grid-cols-2">
              {workspace.teams.map((team) => (
                <article
                  key={team.id}
                  className={`rounded-lg border p-3 ${team.active ? 'border-[#303036] bg-[#17171a]' : 'border-[#303036] bg-[#141416] opacity-65'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium text-white">
                        {team.name}
                      </h3>
                      <p className="mt-1 text-xs text-[#777780]">
                        {team.description || 'Sem descrição'} ·{' '}
                        {team._count.tasks} tarefas · {team._count.tickets}{' '}
                        chamados
                      </p>
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => {
                            const name = window.prompt(
                              'Nome da equipe',
                              team.name
                            );
                            if (!name) return;
                            const description =
                              window.prompt(
                                'Descrição',
                                team.description || ''
                              ) ??
                              (team.description || '');
                            void run(
                              `team-edit-${team.id}`,
                              () =>
                                updateTeam(organizationId, team.id, {
                                  name,
                                  description,
                                }),
                              'Equipe atualizada.'
                            );
                          }}
                          className="rounded border border-[#303036] px-2 py-1 text-[11px] text-[#b9b9c1]"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() =>
                            void run(
                              `team-${team.id}`,
                              () =>
                                updateTeam(organizationId, team.id, {
                                  active: !team.active,
                                }),
                              team.active
                                ? 'Equipe desativada.'
                                : 'Equipe reativada.'
                            )
                          }
                          className="rounded border border-[#303036] px-2 py-1 text-[11px] text-[#b9b9c1]"
                        >
                          {team.active ? 'Desativar' : 'Reativar'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {team.members.map((teamMember) => {
                      const member = membersById.get(teamMember.userId);
                      return (
                        <span
                          key={teamMember.userId}
                          className="inline-flex items-center gap-1 rounded bg-[#292936] px-2 py-1 text-xs text-[#c9b8ff]"
                        >
                          {member?.user.name || `@${member?.user.username}`}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() =>
                                void run(
                                  `team-member-${team.id}-${teamMember.userId}`,
                                  () =>
                                    removeTeamMember({
                                      organizationId,
                                      teamId: team.id,
                                      userId: teamMember.userId,
                                    }),
                                  'Membro removido da equipe.'
                                )
                              }
                              className="text-[#8d80c5] hover:text-white"
                              aria-label="Remover da equipe"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                  {canManage && team.active && (
                    <select
                      defaultValue=""
                      onChange={(event) => {
                        if (!event.target.value) return;
                        void run(
                          `team-add-${team.id}`,
                          () =>
                            addTeamMember({
                              organizationId,
                              teamId: team.id,
                              userId: event.target.value,
                            }),
                          'Membro adicionado à equipe.'
                        );
                        event.target.value = '';
                      }}
                      className="mt-3 h-8 w-full rounded border border-[#303036] bg-[#111] px-2 text-xs text-[#b9b9c1]"
                    >
                      <option value="">Adicionar membro...</option>
                      {workspace.members
                        .filter(
                          (member) =>
                            !team.members.some(
                              (item) => item.userId === member.user.id
                            )
                        )
                        .map((member) => (
                          <option key={member.user.id} value={member.user.id}>
                            {member.user.name || `@${member.user.username}`}
                          </option>
                        ))}
                    </select>
                  )}
                </article>
              ))}
              {!workspace.teams.length && (
                <p className="text-sm text-[#777780]">Nenhuma equipe criada.</p>
              )}
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          {canManage && (
            <Panel
              title="Configurações"
              icon={Building2}
              description="Dados básicos do espaço atual."
            >
              <form
                action={async (formData) => {
                  await run(
                    'update-organization',
                    () =>
                      updateOrganization(organizationId, {
                        name: String(formData.get('name') || ''),
                        description: String(formData.get('description') || ''),
                      }),
                    'Organização atualizada.',
                    true
                  );
                }}
                className="space-y-3"
              >
                <input
                  name="name"
                  defaultValue={workspace.name}
                  required
                  className={inputClass}
                />
                <textarea
                  name="description"
                  defaultValue={workspace.description || ''}
                  className={`${inputClass} min-h-24 py-3`}
                />
                <button
                  disabled={busy !== null}
                  className="h-10 rounded-md border border-[#6f55d9] px-4 text-sm text-[#c9b8ff] disabled:opacity-50"
                >
                  Salvar
                </button>
              </form>
            </Panel>
          )}

          <Panel
            title="Nova organização"
            icon={Plus}
            description="Você pode participar de vários espaços."
          >
            <form action={handleCreateOrganization} className="space-y-3">
              <input
                name="name"
                required
                minLength={2}
                placeholder="Nome"
                className={inputClass}
              />
              <textarea
                name="description"
                placeholder="Descrição"
                className={`${inputClass} min-h-20 py-3`}
              />
              <button
                disabled={busy !== null}
                className="h-10 rounded-md bg-[#292936] px-4 text-sm text-[#c9b8ff] disabled:opacity-50"
              >
                Criar e ativar
              </button>
            </form>
          </Panel>

          <button
            type="button"
            disabled={busy !== null}
            onClick={() => {
              if (window.confirm('Sair desta organização?')) {
                void run(
                  'leave',
                  () => leaveOrganization(organizationId),
                  'Você saiu da organização.',
                  true
                );
              }
            }}
            className="w-full rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
          >
            Sair da organização
          </button>
        </aside>
      </div>
    </section>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-16 rounded-lg border border-[#303036] bg-[#161619] px-3 py-2">
      <strong className="block text-base text-white">{value}</strong>
      <span className="text-[#777780]">{label}</span>
    </div>
  );
}

function Panel({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#303036] bg-[#1b1b1f] p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 text-[#9a8cff]" />
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <p className="text-xs text-[#777780]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
