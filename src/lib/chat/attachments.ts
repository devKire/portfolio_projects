import { randomUUID } from 'node:crypto';

import {
  CHAT_MAX_ATTACHMENTS,
  CHAT_MAX_FILE_SIZE,
  CHAT_MAX_TOTAL_ATTACHMENT_SIZE,
} from './config.ts';

export type ChatAttachmentInput = {
  originalName: string;
  mimeType: string;
  bytes: Uint8Array;
  width?: number | null;
  height?: number | null;
};

export type ValidatedChatAttachment = {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  extension: string;
  size: number;
  storageKey: string;
  data: Uint8Array;
  width: number | null;
  height: number | null;
};

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);
const TEXT_EXTENSIONS = new Set(['txt', 'csv', 'json', 'xml', 'log', 'md']);
const ZIP_EXTENSIONS = new Set(['zip', 'docx', 'xlsx', 'pptx']);
const LEGACY_OFFICE_EXTENSIONS = new Set(['doc', 'xls', 'ppt']);
const ALLOWED_EXTENSIONS = new Set([
  ...IMAGE_EXTENSIONS,
  ...TEXT_EXTENSIONS,
  ...ZIP_EXTENSIONS,
  ...LEGACY_OFFICE_EXTENSIONS,
  'pdf',
]);

const MIME_BY_EXTENSION: Record<string, readonly string[]> = {
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
  gif: ['image/gif'],
  pdf: ['application/pdf'],
  txt: ['text/plain'],
  csv: ['text/csv', 'application/csv', 'text/plain'],
  json: ['application/json', 'text/json', 'text/plain'],
  xml: ['application/xml', 'text/xml', 'text/plain'],
  log: ['text/plain'],
  md: ['text/markdown', 'text/plain'],
  zip: ['application/zip', 'application/x-zip-compressed'],
  doc: ['application/msword'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
};

function extensionFromName(fileName: string) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]{1,10})$/);
  return match?.[1] || '';
}

function safeOriginalName(fileName: string) {
  return (
    fileName
      .normalize('NFKC')
      .replace(/[\u0000-\u001f<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180) || 'arquivo'
  );
}

function startsWith(bytes: Uint8Array, signature: readonly number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

function isZip(bytes: Uint8Array) {
  return (
    startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) ||
    startsWith(bytes, [0x50, 0x4b, 0x05, 0x06]) ||
    startsWith(bytes, [0x50, 0x4b, 0x07, 0x08])
  );
}

function isSafeText(bytes: Uint8Array) {
  const sample = bytes.slice(0, 8_192);
  if (sample.some((value) => value === 0)) return false;
  const controls = sample.filter(
    (value) => value < 32 && ![9, 10, 13].includes(value)
  ).length;
  return sample.length === 0 || controls / sample.length < 0.02;
}

function hasExpectedSignature(extension: string, bytes: Uint8Array) {
  if (extension === 'png') {
    return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (extension === 'jpg' || extension === 'jpeg') {
    return startsWith(bytes, [0xff, 0xd8, 0xff]);
  }
  if (extension === 'gif') {
    const header = new TextDecoder('ascii').decode(bytes.slice(0, 6));
    return header === 'GIF87a' || header === 'GIF89a';
  }
  if (extension === 'webp') {
    const riff = new TextDecoder('ascii').decode(bytes.slice(0, 4));
    const webp = new TextDecoder('ascii').decode(bytes.slice(8, 12));
    return riff === 'RIFF' && webp === 'WEBP';
  }
  if (extension === 'pdf') {
    return new TextDecoder('ascii').decode(bytes.slice(0, 5)) === '%PDF-';
  }
  if (extension === 'zip') return isZip(bytes);
  if (['docx', 'xlsx', 'pptx'].includes(extension)) {
    if (!isZip(bytes)) return false;
    const archiveNames = new TextDecoder('latin1').decode(bytes);
    const expectedDirectory =
      extension === 'docx' ? 'word/' : extension === 'xlsx' ? 'xl/' : 'ppt/';
    return (
      archiveNames.includes('[Content_Types].xml') &&
      archiveNames.includes(expectedDirectory)
    );
  }
  if (LEGACY_OFFICE_EXTENSIONS.has(extension)) {
    return startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  }
  return TEXT_EXTENSIONS.has(extension) && isSafeText(bytes);
}

function hasExecutableSignature(bytes: Uint8Array) {
  return (
    startsWith(bytes, [0x4d, 0x5a]) ||
    startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46]) ||
    startsWith(bytes, [0xcf, 0xfa, 0xed, 0xfe]) ||
    startsWith(bytes, [0xfe, 0xed, 0xfa, 0xcf])
  );
}

export function isChatImageMime(mimeType: string) {
  return ['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(
    mimeType.toLowerCase()
  );
}

export function validateChatAttachments(
  organizationId: string,
  channelId: string,
  files: ChatAttachmentInput[]
) {
  if (files.length > CHAT_MAX_ATTACHMENTS) {
    throw new Error(`Envie no máximo ${CHAT_MAX_ATTACHMENTS} arquivos.`);
  }
  const total = files.reduce((sum, file) => sum + file.bytes.byteLength, 0);
  if (total > CHAT_MAX_TOTAL_ATTACHMENT_SIZE) {
    throw new Error('Os anexos excedem o limite total de 8 MB por mensagem.');
  }

  return files.map<ValidatedChatAttachment>((file) => {
    const originalName = safeOriginalName(file.originalName);
    const extension = extensionFromName(originalName);
    const size = file.bytes.byteLength;
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new Error(`Formato não permitido: ${originalName}.`);
    }
    if (size === 0) throw new Error(`O arquivo ${originalName} está vazio.`);
    if (size > CHAT_MAX_FILE_SIZE) {
      throw new Error(`O arquivo ${originalName} excede o limite de 3 MB.`);
    }
    if (hasExecutableSignature(file.bytes)) {
      throw new Error(`O arquivo ${originalName} possui conteúdo executável.`);
    }
    const mimeType = (
      file.mimeType || 'application/octet-stream'
    ).toLowerCase();
    const expectedMimes = MIME_BY_EXTENSION[extension] || [];
    if (
      mimeType !== 'application/octet-stream' &&
      !expectedMimes.includes(mimeType)
    ) {
      throw new Error(`Tipo MIME incompatível com ${originalName}.`);
    }
    if (!hasExpectedSignature(extension, file.bytes)) {
      throw new Error(`A assinatura do arquivo ${originalName} é inválida.`);
    }
    const id = randomUUID();
    const base = originalName.slice(0, -(extension.length + 1)) || 'arquivo';
    const fileName = `${base.slice(0, 100)}-${id.slice(0, 8)}.${extension}`;
    const validatedMimeType =
      mimeType === 'application/octet-stream'
        ? expectedMimes[0] || mimeType
        : mimeType;
    return {
      id,
      fileName,
      originalName,
      mimeType: validatedMimeType,
      extension,
      size,
      storageKey: `chat/${organizationId}/${channelId}/${id}`,
      data: file.bytes,
      width:
        isChatImageMime(validatedMimeType) &&
        typeof file.width === 'number' &&
        Number.isFinite(file.width)
          ? Math.max(1, Math.min(12_000, Math.round(file.width)))
          : null,
      height:
        isChatImageMime(validatedMimeType) &&
        typeof file.height === 'number' &&
        Number.isFinite(file.height)
          ? Math.max(1, Math.min(12_000, Math.round(file.height)))
          : null,
    };
  });
}
