import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { getChatAttachmentAccess } from '@/lib/chat/authorization';

export const runtime = 'nodejs';

function contentDisposition(fileName: string, inline: boolean) {
  const safeAscii =
    fileName.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 150) || 'arquivo';
  return `${inline ? 'inline' : 'attachment'}; filename="${safeAscii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ attachmentId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Sessão expirada. Entre novamente.' },
        { status: 401 }
      );
    }
    const { attachmentId } = await context.params;
    const { attachment } = await getChatAttachmentAccess(user.id, attachmentId);
    const forceDownload = new URL(request.url).searchParams.has('download');
    const inline =
      !forceDownload &&
      (attachment.mimeType.startsWith('image/') ||
        attachment.mimeType === 'application/pdf');
    return new Response(Buffer.from(attachment.data), {
      status: 200,
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Length': String(attachment.size),
        'Content-Disposition': contentDisposition(
          attachment.originalName,
          inline
        ),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Arquivo não encontrado.' },
      { status: 404 }
    );
  }
}
