import JSZip from 'jszip';
import { NextResponse } from 'next/server';

import { importVault, type VaultImportFile } from '@/app/actions/notes';
import {
  getVaultFileMetadata,
  isIgnoredVaultPath,
  isUnsafeVaultPath,
  normalizeVaultPath,
} from '@/lib/notes';
import { getCurrentUser } from '@/lib/auth/session';

const MAX_ZIP_SIZE = 50 * 1024 * 1024;
const MAX_INLINE_ATTACHMENT_SIZE = 8 * 1024 * 1024;
const SUPPORTED_ATTACHMENT_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'pdf',
  'mp3',
  'wav',
  'm4a',
  'ogg',
  'mp4',
  'webm',
  'mov',
]);
const ZIP_MIME_TYPES = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
  'multipart/x-zip',
  '',
]);

function formatMegabytes(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function mimeFor(path: string) {
  const extension = path.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
  };

  return extension
    ? types[extension] || 'application/octet-stream'
    : 'application/octet-stream';
}

function toDataUrl(bytes: Uint8Array, mimeType: string) {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`;
}

function toTextDataUrl(text: string, mimeType: string) {
  return `data:${mimeType};base64,${Buffer.from(text, 'utf8').toString('base64')}`;
}

function sanitizeSvg(svg: string) {
  return svg
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    .replace(/\s(?:href|xlink:href)=(["'])\s*javascript:[\s\S]*?\1/gi, '');
}

function stripCommonRoot(paths: string[]) {
  const normalized = paths.map(normalizeVaultPath).filter(Boolean);
  if (normalized.length === 0) return new Map<string, string>();
  const firstSegments = normalized.map((path) => path.split('/')[0]);
  const commonRoot = firstSegments[0];
  const hasCommonRoot =
    commonRoot &&
    firstSegments.every((segment) => segment === commonRoot) &&
    normalized.every((path) => path.includes('/'));

  return new Map(
    normalized.map((path) => [
      path,
      hasCommonRoot ? path.split('/').slice(1).join('/') : path,
    ])
  );
}

export async function POST(request: Request) {
  try {
    if (!(await getCurrentUser())) {
      return errorResponse('Sessão expirada. Entre novamente.', 401);
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return errorResponse('Selecione um arquivo ZIP do Obsidian Vault.');
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
      return errorResponse('O arquivo precisa ter extensao .zip.');
    }

    if (!ZIP_MIME_TYPES.has(file.type)) {
      return errorResponse(
        'O arquivo selecionado nao parece ser um ZIP valido.'
      );
    }

    if (file.size > MAX_ZIP_SIZE) {
      return errorResponse(
        `O ZIP excede o limite de ${formatMegabytes(MAX_ZIP_SIZE)}.`
      );
    }

    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const importFiles: VaultImportFile[] = [];
    const folders = new Set<string>();
    let ignored = 0;
    let unsafe = 0;
    const partialErrors: string[] = [];
    const entries = Object.values(zip.files);
    const safeFilePaths = entries
      .filter((entry) => !entry.dir)
      .map((entry) => normalizeVaultPath(entry.name))
      .filter((path) => !isUnsafeVaultPath(path) && !isIgnoredVaultPath(path));
    const pathWithoutRoot = stripCommonRoot(safeFilePaths);

    for (const entry of entries) {
      const normalizedEntryPath = normalizeVaultPath(entry.name);
      const path =
        pathWithoutRoot.get(normalizedEntryPath) || normalizedEntryPath;

      if (entry.dir) {
        const folderPath = normalizeVaultPath(path).replace(/\/$/, '');
        if (
          folderPath &&
          !isUnsafeVaultPath(folderPath) &&
          !isIgnoredVaultPath(folderPath)
        ) {
          folders.add(folderPath);
        }
        continue;
      }

      if (isUnsafeVaultPath(entry.name)) {
        unsafe += 1;
        continue;
      }

      if (isIgnoredVaultPath(entry.name)) {
        ignored += 1;
        continue;
      }

      const metadata = getVaultFileMetadata(path);
      if (metadata.folderPath) folders.add(metadata.folderPath);

      if (metadata.extension === 'md') {
        importFiles.push({ path, content: await entry.async('string') });
        continue;
      }

      if (
        !metadata.extension ||
        !SUPPORTED_ATTACHMENT_EXTENSIONS.has(metadata.extension)
      ) {
        ignored += 1;
        partialErrors.push(`${metadata.fileName}: tipo de anexo ignorado.`);
        continue;
      }

      const uint8Array = await entry.async('uint8array');
      const mimeType = mimeFor(path);
      if (uint8Array.byteLength > MAX_INLINE_ATTACHMENT_SIZE) {
        ignored += 1;
        partialErrors.push(
          `${metadata.fileName}: excede ${formatMegabytes(MAX_INLINE_ATTACHMENT_SIZE)}.`
        );
        continue;
      }

      if (metadata.extension === 'svg') {
        const sanitized = sanitizeSvg(await entry.async('string'));
        importFiles.push({
          path,
          size: Buffer.byteLength(sanitized, 'utf8'),
          mimeType,
          dataUrl: toTextDataUrl(sanitized, mimeType),
        });
        continue;
      }

      importFiles.push({
        path,
        size: uint8Array.byteLength,
        mimeType,
        dataUrl: toDataUrl(uint8Array, mimeType),
      });
    }

    if (unsafe > 0) {
      ignored += unsafe;
      partialErrors.push(
        `${unsafe} arquivo(s) ignorado(s) por caminho inseguro.`
      );
    }

    const result = await importVault(importFiles);
    if (!result.success || !result.data) {
      return errorResponse(
        result.error || 'Nao foi possivel importar o vault.'
      );
    }

    const data = result.data;
    const imported = data.notes.filter((note) => !note.updated).length;
    const updated = data.notes.filter((note) => note.updated).length;

    return NextResponse.json({
      success: true,
      data: {
        imported,
        updated,
        ignored,
        folders: folders.size,
        attachments: data.attachments.total,
        attachmentsCreated: data.attachments.created,
        attachmentsUpdated: data.attachments.updated,
        attachmentsIgnored: data.attachments.ignored,
        imagesImported: data.attachments.images,
        otherAttachmentsImported: data.attachments.other,
        partialErrors,
        totalNotes: data.imported,
      },
    });
  } catch (error) {
    console.error('Error importing vault ZIP:', error);
    return errorResponse(
      'Nao foi possivel ler o ZIP. Verifique o arquivo e tente novamente.',
      500
    );
  }
}
