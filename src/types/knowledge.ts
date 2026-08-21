import type { OrganizationRole } from '@prisma/client';

export type KnowledgeScope =
  | { type: 'personal' }
  | {
      type: 'organization';
      organizationId: string;
      role: OrganizationRole;
    };

export type KnowledgeCapabilities = {
  canManageKcsContent: boolean;
  canManageKcsFolders: boolean;
  canManageKcsAttachments: boolean;
  canImportKcs: boolean;
  canCommentKcs: boolean;
  canManageQueues: boolean;
  canViewAllTickets: boolean;
};
