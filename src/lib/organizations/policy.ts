import type {
  ChatChannelType,
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

export function canCreateChannel(role: OrganizationRole) {
  return isOrganizationManager(role);
}

export function canViewChannel(input: {
  role: OrganizationRole;
  type: ChatChannelType;
  isTeamMember: boolean;
  isChannelMember: boolean;
}) {
  if (input.type === 'ORGANIZATION') return true;
  if (input.type === 'TEAM') {
    return isOrganizationManager(input.role) || input.isTeamMember;
  }
  return input.isChannelMember;
}

export function canManageChannel(input: {
  role: OrganizationRole;
  type: ChatChannelType;
  actorId: string;
  createdById: string;
  isChannelMember: boolean;
}) {
  if (input.type === 'PRIVATE' || input.type === 'DIRECT') {
    return input.isChannelMember && input.actorId === input.createdById;
  }
  return isOrganizationManager(input.role);
}

export function canPostMessage(input: {
  role: OrganizationRole;
  type: ChatChannelType;
  isTeamMember: boolean;
  isChannelMember: boolean;
}) {
  return canViewChannel(input);
}

export function canModerateMessage(input: {
  role: OrganizationRole;
  actorId: string;
  authorId: string;
}) {
  return input.actorId === input.authorId || isOrganizationManager(input.role);
}

export function canManageKcs(role: OrganizationRole) {
  return isOrganizationManager(role);
}

export function canCreateOrganizationEvent(_role: OrganizationRole) {
  return true;
}

export function canManageOrganizationEvent(input: {
  role: OrganizationRole | null;
  actorId: string;
  creatorId: string;
}) {
  return (
    input.actorId === input.creatorId ||
    Boolean(input.role && isOrganizationManager(input.role))
  );
}

export function canViewCalendarEvent(input: {
  actorId: string;
  creatorId: string;
  organizationRole: OrganizationRole | null;
  visibility: 'INVITE_ONLY' | 'ORGANIZATION' | 'TEAMS';
  isParticipant: boolean;
  isTeamMember: boolean;
}) {
  if (input.actorId === input.creatorId || input.isParticipant) return true;
  if (!input.organizationRole) return false;
  if (input.visibility === 'ORGANIZATION') return true;
  return input.visibility === 'TEAMS' && input.isTeamMember;
}

export function canCommentKcs(_role: OrganizationRole) {
  return true;
}

export function canEditKcsComment(input: {
  actorId: string;
  authorId: string;
}) {
  return input.actorId === input.authorId;
}

export function canDeleteKcsComment(input: {
  role: OrganizationRole;
  actorId: string;
  authorId: string;
}) {
  return input.actorId === input.authorId || isOrganizationManager(input.role);
}

export function organizationCapabilities(role: OrganizationRole) {
  const canManageKcsContent = canManageKcs(role);
  return {
    canManageKcsContent,
    canManageKcsFolders: canManageKcsContent,
    canManageKcsAttachments: canManageKcsContent,
    canImportKcs: canManageKcsContent,
    canCommentKcs: canCommentKcs(role),
    canManageQueues: canManageQueue(role),
    canViewAllTickets: canViewAllTickets(role),
  } as const;
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
