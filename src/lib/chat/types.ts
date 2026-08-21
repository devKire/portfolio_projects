import type { ChatChannelType, OrganizationRole } from '@prisma/client';

export type ChatPersonDTO = {
  id: string;
  name: string | null;
  username: string;
  email?: string;
};

export type ChatAttachmentDTO = {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  extension: string;
  size: number;
  width: number | null;
  height: number | null;
  category: 'IMAGE' | 'DOCUMENT';
  url: string;
};

export type ChatReactionDTO = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
  users: ChatPersonDTO[];
};

export type ChatReplyPreviewDTO = {
  id: string;
  content: string;
  deletedAt: string | null;
  author: ChatPersonDTO;
  attachment: Pick<
    ChatAttachmentDTO,
    'id' | 'fileName' | 'mimeType' | 'category'
  > | null;
};

export type ChatSharedResourceDTO =
  | {
      type: 'CALENDAR_EVENT';
      id: string;
      title: string;
      subtitle: string;
      startAt: string;
      endAt: string;
    }
  | {
      type: 'TASK';
      id: string;
      title: string;
      subtitle: string;
      status: string;
      priority: string;
    }
  | {
      type: 'TICKET';
      id: string;
      title: string;
      subtitle: string;
      status: string;
      priority: string;
    }
  | {
      type: 'KCS';
      id: string;
      title: string;
      subtitle: string;
      status: string;
    };

export type ChatMessageDTO = {
  id: string;
  channelId: string;
  organizationId: string;
  authorId: string;
  content: string;
  replyToId: string | null;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  pinnedAt: string | null;
  author: ChatPersonDTO;
  pinnedBy: ChatPersonDTO | null;
  replyTo: ChatReplyPreviewDTO | null;
  attachments: ChatAttachmentDTO[];
  reactions: ChatReactionDTO[];
  sharedResource: ChatSharedResourceDTO | null;
  replyCount: number;
  readByOthers: boolean;
  canEdit: boolean;
};

export type ChatChannelDTO = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  type: ChatChannelType;
  teamId: string | null;
  team: { id: string; name: string; active: boolean } | null;
  members: ChatPersonDTO[];
  memberCount: number;
  lastMessage: {
    id: string;
    content: string;
    createdAt: string;
    author: ChatPersonDTO;
    hasAttachments: boolean;
  } | null;
  unreadCount: number;
  mentionCount: number;
  pinnedCount: number;
  canPin: boolean;
};

export type ChatWorkspaceDTO = {
  organization: { id: string; name: string };
  role: OrganizationRole;
  canCreateChannel: boolean;
  channels: ChatChannelDTO[];
  members: ChatPersonDTO[];
  teams: { id: string; name: string }[];
  unreadCount: number;
  mentionCount: number;
};

export type ChatMessagesPageDTO = {
  messages: ChatMessageDTO[];
  nextCursor: string | null;
  syncedAt: string;
};

export type ChatSearchInput = {
  channelId: string;
  query?: string;
  authorId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  withAttachments?: boolean;
  imagesOnly?: boolean;
  pinnedOnly?: boolean;
  cursor?: string | null;
  limit?: number;
};

export type ChatSearchResultDTO = {
  messages: ChatMessageDTO[];
  nextCursor: string | null;
};

export type ChatClientAttachment = {
  id: string;
  file: File;
  previewUrl: string | null;
  width: number | null;
  height: number | null;
  status: 'READY' | 'UPLOADING' | 'FAILED';
  error: string | null;
};

export type ChatPendingMessage = ChatMessageDTO & {
  clientNonce: string;
  clientStatus: 'SENDING' | 'FAILED';
  uploadProgress: number;
  pendingFiles: ChatClientAttachment[];
  pendingResource: {
    eventId?: string | null;
    taskId?: string | null;
    ticketId?: string | null;
    noteId?: string | null;
  };
  error: string | null;
};

export type ChatRenderedMessage = ChatMessageDTO | ChatPendingMessage;

export function isPendingChatMessage(
  message: ChatRenderedMessage
): message is ChatPendingMessage {
  return 'clientStatus' in message;
}
