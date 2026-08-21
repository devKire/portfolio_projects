'use client';

import {
  Download,
  File,
  FileArchive,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Presentation,
  X,
  ZoomIn,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ChatAttachmentDTO } from '@/lib/chat/types';

import { formatChatFileSize } from './client';

function documentIcon(extension: string) {
  if (['xls', 'xlsx', 'csv'].includes(extension)) return FileSpreadsheet;
  if (['ppt', 'pptx'].includes(extension)) return Presentation;
  if (['zip'].includes(extension)) return FileArchive;
  if (['json', 'xml', 'log', 'md'].includes(extension)) return FileCode2;
  if (['pdf', 'txt', 'doc', 'docx'].includes(extension)) return FileText;
  return File;
}

export function MessageAttachments({
  attachments,
}: {
  attachments: ChatAttachmentDTO[];
}) {
  const [activeImage, setActiveImage] = useState<ChatAttachmentDTO | null>(
    null
  );
  const images = attachments.filter((item) => item.category === 'IMAGE');
  const documents = attachments.filter((item) => item.category === 'DOCUMENT');
  return (
    <>
      {images.length ? (
        <div
          className={`mt-2 grid max-w-xl gap-1 overflow-hidden rounded-xl ${
            images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
          }`}
        >
          {images.map((attachment, index) => (
            <button
              key={attachment.id}
              type="button"
              onClick={() => setActiveImage(attachment)}
              className={`group relative overflow-hidden border border-zinc-200 bg-zinc-100 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none dark:border-zinc-700 dark:bg-zinc-900 ${
                images.length === 3 && index === 0 ? 'row-span-2' : ''
              }`}
              aria-label={`Abrir ${attachment.originalName}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachment.url}
                alt={attachment.originalName}
                loading="lazy"
                className={`w-full object-cover transition group-hover:scale-[1.01] ${
                  images.length === 1 ? 'max-h-[420px]' : 'h-40 sm:h-48'
                }`}
              />
              <span className="absolute right-2 bottom-2 rounded-full bg-black/65 p-1.5 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                <ZoomIn className="size-4" />
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {documents.length ? (
        <div className="mt-2 grid max-w-xl gap-2 sm:grid-cols-2">
          {documents.map((attachment) => {
            const Icon = documentIcon(attachment.extension);
            return (
              <a
                key={attachment.id}
                href={`${attachment.url}?download=1`}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-zinc-200 bg-white/70 p-3 transition hover:border-violet-400 hover:bg-violet-50/50 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none dark:border-zinc-700 dark:bg-zinc-900/70 dark:hover:border-violet-500 dark:hover:bg-violet-950/20"
              >
                <span className="rounded-lg bg-violet-500/10 p-2 text-violet-600 dark:text-violet-300">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {attachment.originalName}
                  </span>
                  <span className="text-xs text-zinc-500 uppercase dark:text-zinc-400">
                    {attachment.extension} ·{' '}
                    {formatChatFileSize(attachment.size)}
                  </span>
                </span>
                <Download className="size-4 shrink-0 text-zinc-500" />
              </a>
            );
          })}
        </div>
      ) : null}

      <Dialog
        open={Boolean(activeImage)}
        onOpenChange={(open) => !open && setActiveImage(null)}
      >
        <DialogContent className="flex h-[min(90vh,900px)] max-w-6xl grid-rows-[auto_1fr_auto] p-3 sm:p-4">
          <div className="flex items-center gap-3 pr-10">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base">
                {activeImage?.originalName}
              </DialogTitle>
              <DialogDescription>
                {activeImage ? formatChatFileSize(activeImage.size) : ''}
              </DialogDescription>
            </div>
            {activeImage ? (
              <Button asChild size="sm" variant="outline">
                <a href={`${activeImage.url}?download=1`}>
                  <Download /> Baixar
                </a>
              </Button>
            ) : null}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setActiveImage(null)}
              aria-label="Fechar visualização"
            >
              <X />
            </Button>
          </div>
          <div className="flex min-h-0 items-center justify-center overflow-auto rounded-lg bg-black/90 p-2">
            {activeImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeImage.url}
                alt={activeImage.originalName}
                className="max-h-full max-w-full object-contain"
              />
            ) : null}
          </div>
          <p className="text-center text-xs text-zinc-500">
            Use o zoom do navegador ou abra o original para ampliar.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
