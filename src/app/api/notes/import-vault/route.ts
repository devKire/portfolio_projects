import JSZip from 'jszip';
import { NextResponse } from 'next/server';

import { importVault, type VaultImportFile } from '@/app/actions/notes';
import {
  getVaultFileMetadata,
  isIgnoredVaultPath,
  isUnsafeVaultPath,
  normalizeVaultPath,
} from '@/lib/notes';

const MAX_ZIP_SIZE = 50 * 1024 * 1024;
const MAX_INLINE_ATTACHMENT_SIZE = 8 * 1024 * 1024;
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
  };

  return extension
    ? types[extension] || 'application/octet-stream'
    : 'application/octet-stream';
}

function toDataUrl(bytes: Uint8Array, mimeType: string) {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString('base64')}`;
}

export async function POST(request: Request) {
  try {
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

    for (const entry of Object.values(zip.files)) {
      if (entry.dir) {
        const folderPath = normalizeVaultPath(entry.name).replace(/\/$/, '');
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

      const path = normalizeVaultPath(entry.name);
      const metadata = getVaultFileMetadata(path);
      if (metadata.folderPath) folders.add(metadata.folderPath);

      if (metadata.extension === 'md') {
        importFiles.push({ path, content: await entry.async('string') });
        continue;
      }

      const uint8Array = await entry.async('uint8array');
      const mimeType = mimeFor(path);
      importFiles.push({
        path,
        size: uint8Array.byteLength,
        mimeType,
        dataUrl:
          uint8Array.byteLength <= MAX_INLINE_ATTACHMENT_SIZE
            ? toDataUrl(uint8Array, mimeType)
            : undefined,
      });
    }

    if (unsafe > 0) {
      return errorResponse(
        'O ZIP contem caminhos inseguros e foi recusado para evitar path traversal.'
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
        attachments: data.attachments,
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
