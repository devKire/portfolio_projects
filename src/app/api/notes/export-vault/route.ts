import JSZip from 'jszip';
import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { getOrganizationMembership } from '@/lib/organizations/authorization';
import {
  getVaultFileMetadata,
  isIgnoredVaultPath,
  isUnsafeVaultPath,
  normalizeVaultPath,
} from '@/lib/notes';
import {
  organizationNoteScope,
  personalNoteScope,
} from '@/lib/organizations/policy';
import { db } from '@/lib/prisma';

export const runtime = 'nodejs';

const VAULT_ROOT = 'Knowledge-Vault';

function errorResponse(message: string, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function sanitizePathSegment(segment: string) {
  return (
    segment
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
      .replace(/[. ]+$/g, '')
      .trim() || 'Sem nome'
  );
}

function safeExportPath(path: string | null | undefined) {
  if (!path) return '';
  if (
    path.startsWith('/') ||
    /^[A-Za-z]:[\\/]/.test(path) ||
    path.includes('\0') ||
    isUnsafeVaultPath(path) ||
    isIgnoredVaultPath(path)
  ) {
    return null;
  }

  const normalized = normalizeVaultPath(path);
  if (!normalized) return '';
  const segments = normalized.split('/');
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    return null;
  }
  return segments.map(sanitizePathSegment).join('/');
}

function sanitizeMarkdownFileName(fileName: string) {
  const safe = sanitizePathSegment(fileName);
  return /\.md$/i.test(safe) ? safe : `${safe}.md`;
}

function joinPath(folderPath: string, fileName: string) {
  return folderPath ? `${folderPath}/${fileName}` : fileName;
}

function noteExportPath(note: {
  title: string;
  fileName: string | null;
  filePath: string | null;
  folderPath: string | null;
}) {
  const existingPath = safeExportPath(note.filePath);
  if (existingPath) {
    const metadata = getVaultFileMetadata(existingPath);
    return joinPath(
      metadata.folderPath || '',
      sanitizeMarkdownFileName(metadata.fileName)
    );
  }

  const folderPath = safeExportPath(note.folderPath) || '';
  const fileName = sanitizeMarkdownFileName(
    note.fileName || note.title.trim() || 'Nota'
  );
  return joinPath(folderPath, fileName);
}

function reserveUniquePath(path: string, usedPaths: Set<string>) {
  const metadata = getVaultFileMetadata(path);
  const extensionMatch = metadata.fileName.match(/(\.[^.]+)$/);
  const extension = extensionMatch?.[1] || '';
  const baseName = extension
    ? metadata.fileName.slice(0, -extension.length)
    : metadata.fileName;
  let candidate = path;
  let suffix = 2;

  while (usedPaths.has(candidate.toLocaleLowerCase())) {
    candidate = joinPath(
      metadata.folderPath || '',
      `${baseName} ${suffix}${extension}`
    );
    suffix += 1;
  }

  usedPaths.add(candidate.toLocaleLowerCase());
  return candidate;
}

function dataUrlToBytes(dataUrl: string) {
  const separator = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:') || separator === -1) return null;

  const metadata = dataUrl.slice(5, separator);
  const payload = dataUrl.slice(separator + 1);
  try {
    return metadata.toLowerCase().includes(';base64')
      ? Buffer.from(payload, 'base64')
      : Buffer.from(decodeURIComponent(payload), 'utf8');
  } catch {
    return null;
  }
}

function isInsideFolder(path: string | null, folderPaths: string[]) {
  return Boolean(
    path &&
    folderPaths.some(
      (folderPath) => path === folderPath || path.startsWith(`${folderPath}/`)
    )
  );
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse('Sessão expirada. Entre novamente.', 401);
    const organizationId = new URL(request.url).searchParams.get(
      'organizationId'
    );
    const membership = organizationId
      ? await getOrganizationMembership(user.id, organizationId)
      : null;
    if (organizationId && !membership) {
      return errorResponse('Recurso não encontrado ou acesso negado.', 404);
    }
    const scopeWhere = organizationId
      ? {
          organizationId,
          scopeKey: organizationNoteScope(organizationId),
        }
      : {
          userId: user.id,
          organizationId: null,
          scopeKey: personalNoteScope(user.id),
        };
    const vaultRootName = organizationId
      ? `KCS-${sanitizePathSegment(membership!.organization.name)}`
      : VAULT_ROOT;

    const [notes, folders, deletedFolders, attachments] = await Promise.all([
      db.note.findMany({
        where: { ...scopeWhere, status: { not: 'ARCHIVED' } },
        orderBy: [{ folderPath: 'asc' }, { filePath: 'asc' }, { title: 'asc' }],
        select: {
          id: true,
          title: true,
          content: true,
          fileName: true,
          filePath: true,
          folderPath: true,
        },
      }),
      db.noteFolder.findMany({
        where: { ...scopeWhere, deletedAt: null },
        orderBy: { path: 'asc' },
        select: { path: true },
      }),
      db.noteFolder.findMany({
        where: { ...scopeWhere, deletedAt: { not: null } },
        select: { pathBeforeTrash: true },
      }),
      db.noteAttachment.findMany({
        where: scopeWhere,
        orderBy: { filePath: 'asc' },
        select: {
          id: true,
          fileName: true,
          filePath: true,
          folderPath: true,
          dataUrl: true,
        },
      }),
    ]);

    const zip = new JSZip();
    const vault = zip.folder(vaultRootName);
    if (!vault) return errorResponse('Nao foi possivel preparar o Vault.');

    for (const folder of folders) {
      const folderPath = safeExportPath(folder.path);
      if (folderPath) vault.folder(folderPath);
    }

    const usedPaths = new Set<string>();
    for (const note of notes) {
      const path = reserveUniquePath(noteExportPath(note), usedPaths);
      vault.file(path, note.content);
    }

    const deletedFolderPaths = deletedFolders
      .map((folder) => safeExportPath(folder.pathBeforeTrash))
      .filter((path): path is string => Boolean(path));
    const exportedAttachmentPaths = new Set<string>();

    for (const attachment of attachments) {
      if (isInsideFolder(attachment.folderPath, deletedFolderPaths)) continue;
      const path = safeExportPath(attachment.filePath);
      if (!path || exportedAttachmentPaths.has(path.toLocaleLowerCase())) {
        continue;
      }
      const bytes = attachment.dataUrl
        ? dataUrlToBytes(attachment.dataUrl)
        : null;
      if (!bytes) continue;

      exportedAttachmentPaths.add(path.toLocaleLowerCase());
      vault.file(reserveUniquePath(path, usedPaths), bytes);
    }

    const archive = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    const date = new Date().toISOString().slice(0, 10);
    const fileName = organizationId
      ? `${vaultRootName}-${date}.zip`
      : `Knowledge-Vault-${date}.zip`;
    const responseBody = new ArrayBuffer(archive.byteLength);
    new Uint8Array(responseBody).set(archive);

    return new NextResponse(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error exporting vault ZIP:', error);
    return errorResponse('Nao foi possivel exportar o Vault.');
  }
}
