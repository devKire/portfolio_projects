import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import {
  type ChatAttachmentInput,
  validateChatAttachments,
} from '@/lib/chat/attachments';
import { createChatMessage } from '@/lib/chat/messages';
import {
  CHAT_MAX_ATTACHMENTS,
  CHAT_MAX_FILE_SIZE,
  CHAT_MAX_TOTAL_ATTACHMENT_SIZE,
} from '@/lib/chat/config';

export const runtime = 'nodejs';

const MAX_MULTIPART_REQUEST_SIZE =
  CHAT_MAX_TOTAL_ATTACHMENT_SIZE + 2 * 1024 * 1024;

type AttachmentMetadata = {
  width?: number | null;
  height?: number | null;
};

function textField(formData: FormData, name: string) {
  return String(formData.get(name) || '').trim();
}

function optionalField(formData: FormData, name: string) {
  return textField(formData, name) || null;
}

function parseAttachmentMetadata(formData: FormData) {
  const raw = textField(formData, 'attachmentMetadata');
  if (!raw) return [] as AttachmentMetadata[];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((value) => {
          if (!value || typeof value !== 'object') return {};
          const record = value as Record<string, unknown>;
          return {
            width: typeof record.width === 'number' ? record.width : null,
            height: typeof record.height === 'number' ? record.height : null,
          };
        })
      : [];
  } catch {
    throw new Error('Metadados dos anexos são inválidos.');
  }
}

function errorResponse(error: unknown) {
  const message =
    error instanceof Error && error.message
      ? error.message
      : 'Não foi possível enviar a mensagem.';
  const denied = message.includes('acesso negado');
  return NextResponse.json(
    { success: false, error: message },
    { status: denied ? 404 : 400 }
  );
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) {
    const fetchSite = request.headers.get('sec-fetch-site');
    return (
      !fetchSite || ['same-origin', 'same-site', 'none'].includes(fetchSite)
    );
  }
  return origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json(
        { success: false, error: 'Origem da requisição não permitida.' },
        { status: 403 }
      );
    }
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_MULTIPART_REQUEST_SIZE
    ) {
      return NextResponse.json(
        { success: false, error: 'Upload excede o limite permitido.' },
        { status: 413 }
      );
    }
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Sessão expirada. Entre novamente.' },
        { status: 401 }
      );
    }
    const formData = await request.formData();
    const organizationId = textField(formData, 'organizationId');
    const channelId = textField(formData, 'channelId');
    if (!organizationId || !channelId) {
      return NextResponse.json(
        { success: false, error: 'Conversa inválida.' },
        { status: 400 }
      );
    }
    const metadata = parseAttachmentMetadata(formData);
    const files = formData
      .getAll('files')
      .filter((value): value is File => value instanceof File);
    if (files.length > CHAT_MAX_ATTACHMENTS) {
      throw new Error(`Envie no máximo ${CHAT_MAX_ATTACHMENTS} arquivos.`);
    }
    if (files.some((file) => file.size > CHAT_MAX_FILE_SIZE)) {
      throw new Error('Cada arquivo pode ter no máximo 3 MB.');
    }
    if (
      files.reduce((total, file) => total + file.size, 0) >
      CHAT_MAX_TOTAL_ATTACHMENT_SIZE
    ) {
      throw new Error('Os anexos podem somar no máximo 8 MB.');
    }
    const attachmentInputs = await Promise.all(
      files.map<Promise<ChatAttachmentInput>>(async (file, index) => ({
        originalName: file.name,
        mimeType: file.type,
        bytes: new Uint8Array(await file.arrayBuffer()),
        width: metadata[index]?.width ?? null,
        height: metadata[index]?.height ?? null,
      }))
    );
    const attachments = validateChatAttachments(
      organizationId,
      channelId,
      attachmentInputs
    );
    const message = await createChatMessage(user.id, {
      organizationId,
      channelId,
      content: String(formData.get('content') || ''),
      replyToId: optionalField(formData, 'replyToId'),
      clientNonce: optionalField(formData, 'clientNonce'),
      eventId: optionalField(formData, 'eventId'),
      taskId: optionalField(formData, 'taskId'),
      ticketId: optionalField(formData, 'ticketId'),
      noteId: optionalField(formData, 'noteId'),
      attachments,
    });
    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    return errorResponse(error);
  }
}
