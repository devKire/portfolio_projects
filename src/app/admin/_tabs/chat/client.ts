import type {
  ChatClientAttachment,
  ChatMessageDTO,
  ChatPendingMessage,
  ChatPersonDTO,
} from '@/lib/chat/types';

export type ChatUploadResource = {
  eventId?: string | null;
  taskId?: string | null;
  ticketId?: string | null;
  noteId?: string | null;
};

export type ChatUploadInput = ChatUploadResource & {
  organizationId: string;
  channelId: string;
  content: string;
  replyToId?: string | null;
  clientNonce: string;
  attachments: ChatClientAttachment[];
};

type ChatUploadResponse =
  | { success: true; data: ChatMessageDTO }
  | { success: false; error: string };

function imageDimensions(previewUrl: string) {
  return new Promise<{ width: number | null; height: number | null }>(
    (resolve) => {
      const image = new Image();
      image.onload = () =>
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => resolve({ width: null, height: null });
      image.src = previewUrl;
    }
  );
}

export async function createChatClientAttachment(
  file: File
): Promise<ChatClientAttachment> {
  const image = file.type.startsWith('image/');
  const previewUrl = image ? URL.createObjectURL(file) : null;
  const dimensions = previewUrl
    ? await imageDimensions(previewUrl)
    : { width: null, height: null };
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl,
    width: dimensions.width,
    height: dimensions.height,
    status: 'READY',
    error: null,
  };
}

export function revokeClientAttachments(attachments: ChatClientAttachment[]) {
  for (const attachment of attachments) {
    if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
  }
}

export function uploadChatMessage(
  input: ChatUploadInput,
  onProgress: (progress: number) => void
) {
  return new Promise<ChatMessageDTO>((resolve, reject) => {
    const formData = new FormData();
    formData.set('organizationId', input.organizationId);
    formData.set('channelId', input.channelId);
    formData.set('content', input.content);
    formData.set('clientNonce', input.clientNonce);
    if (input.replyToId) formData.set('replyToId', input.replyToId);
    if (input.eventId) formData.set('eventId', input.eventId);
    if (input.taskId) formData.set('taskId', input.taskId);
    if (input.ticketId) formData.set('ticketId', input.ticketId);
    if (input.noteId) formData.set('noteId', input.noteId);
    formData.set(
      'attachmentMetadata',
      JSON.stringify(
        input.attachments.map((attachment) => ({
          width: attachment.width,
          height: attachment.height,
        }))
      )
    );
    for (const attachment of input.attachments) {
      formData.append('files', attachment.file, attachment.file.name);
    }

    const request = new XMLHttpRequest();
    request.open('POST', '/api/chat/messages');
    request.responseType = 'json';
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.max(1, Math.round((event.loaded / event.total) * 100)));
      }
    };
    request.onerror = () =>
      reject(new Error('Falha de conexão durante o envio.'));
    request.onload = () => {
      const response = request.response as ChatUploadResponse | null;
      if (request.status >= 200 && request.status < 300 && response?.success) {
        onProgress(100);
        resolve(response.data);
        return;
      }
      reject(
        new Error(
          response && !response.success
            ? response.error
            : 'Não foi possível enviar a mensagem.'
        )
      );
    };
    request.send(formData);
  });
}

export function mergeChatMessages(
  current: ChatMessageDTO[],
  incoming: ChatMessageDTO[]
) {
  const merged = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) merged.set(message.id, message);
  return Array.from(merged.values()).sort((left, right) => {
    const difference =
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    return difference || left.id.localeCompare(right.id);
  });
}

export function createPendingChatMessage(input: {
  organizationId: string;
  channelId: string;
  clientNonce: string;
  content: string;
  author: ChatPersonDTO;
  attachments: ChatClientAttachment[];
  replyTo?: ChatMessageDTO | null;
  resource?: ChatUploadResource;
}): ChatPendingMessage {
  const createdAt = new Date().toISOString();
  return {
    id: `temp:${input.clientNonce}`,
    channelId: input.channelId,
    organizationId: input.organizationId,
    authorId: input.author.id,
    content: input.content.trim(),
    replyToId: input.replyTo?.id || null,
    createdAt,
    updatedAt: createdAt,
    editedAt: null,
    deletedAt: null,
    pinnedAt: null,
    author: input.author,
    pinnedBy: null,
    replyTo: input.replyTo
      ? {
          id: input.replyTo.id,
          content: input.replyTo.content,
          deletedAt: input.replyTo.deletedAt,
          author: input.replyTo.author,
          attachment: input.replyTo.attachments[0]
            ? {
                id: input.replyTo.attachments[0].id,
                fileName: input.replyTo.attachments[0].fileName,
                mimeType: input.replyTo.attachments[0].mimeType,
                category: input.replyTo.attachments[0].category,
              }
            : null,
        }
      : null,
    attachments: input.attachments.map((attachment) => ({
      id: `temp:${attachment.id}`,
      fileName: attachment.file.name,
      originalName: attachment.file.name,
      mimeType: attachment.file.type || 'application/octet-stream',
      extension: attachment.file.name.split('.').pop()?.toLowerCase() || '',
      size: attachment.file.size,
      width: attachment.width,
      height: attachment.height,
      category: attachment.file.type.startsWith('image/')
        ? 'IMAGE'
        : 'DOCUMENT',
      url: attachment.previewUrl || '',
    })),
    reactions: [],
    sharedResource: null,
    replyCount: 0,
    readByOthers: false,
    canEdit: false,
    clientNonce: input.clientNonce,
    clientStatus: 'SENDING',
    uploadProgress: 0,
    pendingFiles: input.attachments,
    pendingResource: input.resource || {},
    error: null,
  };
}

export function formatChatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function personLabel(person: { name: string | null; username: string }) {
  return person.name || `@${person.username}`;
}

export function chatInitials(person: {
  name: string | null;
  username: string;
}) {
  return (person.name || person.username)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
