import type {
  OrganizationRole,
  TicketActivityType,
  TicketStatus,
} from '@prisma/client';

export const ORGANIZATION_MANAGER_ROLES: readonly OrganizationRole[] = [
  'OWNER',
  'ADMIN',
];

export function isOrganizationManager(role: OrganizationRole) {
  return ORGANIZATION_MANAGER_ROLES.includes(role);
}

export function canManageMember(
  actorRole: OrganizationRole,
  targetRole: OrganizationRole,
  nextRole?: OrganizationRole
) {
  if (actorRole === 'OWNER') return true;
  if (actorRole !== 'ADMIN') return false;
  return targetRole === 'MEMBER' && (!nextRole || nextRole === 'MEMBER');
}

export function canManageTeam(role: OrganizationRole) {
  return isOrganizationManager(role);
}

export function canManageQueue(role: OrganizationRole) {
  return isOrganizationManager(role);
}

export function canViewAllTickets(role: OrganizationRole) {
  return isOrganizationManager(role);
}

export function personalNoteScope(userId: string) {
  return `user:${userId}`;
}

export function organizationNoteScope(organizationId: string) {
  return `organization:${organizationId}`;
}

export function isPersonalTaskAssignmentValid(input: {
  actorId: string;
  teamId?: string | null;
  assigneeId?: string | null;
}) {
  return (
    !input.teamId && (!input.assigneeId || input.assigneeId === input.actorId)
  );
}

export function ticketStatusActivityType(
  status: TicketStatus
): TicketActivityType {
  if (status === 'RESOLVED') return 'RESOLVED';
  if (status === 'CLOSED') return 'CLOSED';
  return 'STATUS_CHANGED';
}
