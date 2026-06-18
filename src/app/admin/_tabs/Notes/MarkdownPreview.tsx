'use client';

import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  HelpCircle,
  Info,
  Lightbulb,
  MessageSquareQuote,
  NotebookText,
  OctagonAlert,
  Puzzle,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

import { resolveWikiLinkTarget, slugifyNote } from '@/lib/notes';

export type PreviewNote = {
  id: string;
  title: string;
  slug: string;
  filePath?: string | null;
  folderId?: string | null;
  folderPath?: string | null;
};

export type PreviewAttachment = {
  id: string;
  fileName: string;
  filePath: string;
  folderPath: string | null;
  mimeType: string | null;
  dataUrl: string | null;
};

type Footnote = { id: string; content: string };
type MarkdownBlock =
  | { type: 'markdown'; content: string }
  | { type: 'code'; content: string; language: string };

const codeLanguageAliases: Record<string, string> = {
  '': 'text',
  text: 'text',
  plaintext: 'text',
  powershell: 'powershell',
  ps1: 'powershell',
  cmd: 'cmd',
  batch: 'cmd',
  bash: 'bash',
  shell: 'bash',
  sh: 'bash',
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  tsx: 'tsx',
  json: 'json',
  python: 'python',
  py: 'python',
  sql: 'sql',
  mermaid: 'mermaid',
};

const calloutAliases: Record<string, string> = {
  summary: 'abstract',
  tldr: 'abstract',
  hint: 'tip',
  important: 'tip',
  check: 'success',
  done: 'success',
  help: 'question',
  faq: 'question',
  caution: 'warning',
  attention: 'warning',
  fail: 'failure',
  missing: 'failure',
  error: 'danger',
  cite: 'quote',
};

const calloutConfig: Record<
  string,
  {
    label: string;
    Icon: LucideIcon;
    className: string;
    titleClassName: string;
  }
> = {
  abstract: {
    label: 'Abstract',
    Icon: ClipboardList,
    className: 'border-violet-400 bg-violet-500/10 text-[#dcddde]',
    titleClassName: 'text-violet-200',
  },
  note: {
    label: 'Note',
    Icon: NotebookText,
    className: 'border-sky-400 bg-sky-500/10 text-[#dcddde]',
    titleClassName: 'text-sky-200',
  },
  info: {
    label: 'Info',
    Icon: Info,
    className: 'border-cyan-400 bg-cyan-500/10 text-[#dcddde]',
    titleClassName: 'text-cyan-200',
  },
  todo: {
    label: 'Todo',
    Icon: CheckCircle2,
    className: 'border-sky-400 bg-sky-500/10 text-[#dcddde]',
    titleClassName: 'text-sky-200',
  },
  tip: {
    label: 'Tip',
    Icon: Lightbulb,
    className: 'border-emerald-400 bg-emerald-500/10 text-[#dcddde]',
    titleClassName: 'text-emerald-200',
  },
  success: {
    label: 'Success',
    Icon: CheckCircle2,
    className: 'border-emerald-400 bg-emerald-500/10 text-[#dcddde]',
    titleClassName: 'text-emerald-200',
  },
  question: {
    label: 'Question',
    Icon: HelpCircle,
    className: 'border-yellow-300 bg-yellow-500/10 text-[#dcddde]',
    titleClassName: 'text-yellow-100',
  },
  warning: {
    label: 'Warning',
    Icon: AlertTriangle,
    className: 'border-amber-400 bg-amber-500/10 text-[#dcddde]',
    titleClassName: 'text-amber-100',
  },
  failure: {
    label: 'Failure',
    Icon: XCircle,
    className: 'border-red-700 bg-red-950/35 text-[#dcddde]',
    titleClassName: 'text-red-200',
  },
  danger: {
    label: 'Danger',
    Icon: OctagonAlert,
    className: 'border-red-500 bg-red-500/10 text-[#dcddde]',
    titleClassName: 'text-red-100',
  },
  bug: {
    label: 'Bug',
    Icon: Bug,
    className: 'border-rose-400 bg-rose-500/10 text-[#dcddde]',
    titleClassName: 'text-rose-100',
  },
  example: {
    label: 'Example',
    Icon: Puzzle,
    className: 'border-purple-400 bg-purple-500/10 text-[#dcddde]',
    titleClassName: 'text-purple-100',
  },
  quote: {
    label: 'Quote',
    Icon: MessageSquareQuote,
    className: 'border-zinc-500 bg-zinc-500/10 text-[#dcddde]',
    titleClassName: 'text-zinc-200',
  },
};

function normalizeCalloutType(type: string) {
  const lower = type.toLowerCase();
  return calloutConfig[lower] ? lower : calloutAliases[lower] || 'note';
}

function sanitizeHtml(html: string) {
  const allowedTags = new Set([
    'u',
    's',
    'span',
    'div',
    'p',
    'br',
    'strong',
    'em',
    'b',
    'i',
    'code',
    'pre',
    'kbd',
    'mark',
    'sub',
    'sup',
    'small',
    'a',
  ]);

  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(
      /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
      '<span class="text-[#8f8f98]">iframe bloqueado</span>'
    )
    .replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (tag, name, attrs) => {
      const tagName = String(name).toLowerCase();
      if (!allowedTags.has(tagName)) return '';
      const safeAttrs = String(attrs)
        .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
        .replace(/\s(href|src)=(["'])\s*javascript:[\s\S]*?\2/gi, '')
        .replace(/\sstyle=(["'])(.*?)\1/gi, (_match, quote, style) => {
          const safeStyle = String(style)
            .split(';')
            .map((rule) => rule.trim())
            .filter((rule) =>
              /^(font-family|color|background-color|text-align|font-size)\s*:/i.test(
                rule
              )
            )
            .join('; ');
          return safeStyle ? ` style=${quote}${safeStyle}${quote}` : '';
        });
      return tag.startsWith('</')
        ? `</${tagName}>`
        : `<${tagName}${safeAttrs}>`;
    });
}

function stripFootnoteDefinitions(content: string) {
  const footnotes: Footnote[] = [];
  const body = content.replace(
    /^\[\^([^\]]+)\]:\s+(.+)$/gm,
    (_match, id, text) => {
      footnotes.push({ id, content: text });
      return '';
    }
  );
  return { body, footnotes };
}

function normalizeCodeLanguage(language: string) {
  return codeLanguageAliases[language.trim().toLowerCase()] || 'text';
}

function appendMarkdownBlocks(blocks: MarkdownBlock[], content: string) {
  content
    .split(/\n{2,}/)
    .filter((block) => block.trim())
    .forEach((block) => blocks.push({ type: 'markdown', content: block }));
}

function tokenizeMarkdownBlocks(content: string) {
  const blocks: MarkdownBlock[] = [];
  const lines = content.split('\n');
  let markdownBuffer: string[] = [];

  const flushMarkdown = () => {
    if (markdownBuffer.length > 0) {
      appendMarkdownBlocks(blocks, markdownBuffer.join('\n'));
      markdownBuffer = [];
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const openingFence = lines[index].match(/^\s*(`{3,})(?:\s*([^\s`]+).*)?$/);
    if (!openingFence) {
      markdownBuffer.push(lines[index]);
      continue;
    }

    flushMarkdown();
    const fenceLength = openingFence[1].length;
    const codeLines: string[] = [];
    let closed = false;

    for (index += 1; index < lines.length; index += 1) {
      const closingFence = lines[index].match(/^\s*(`{3,})\s*$/);
      if (closingFence && closingFence[1].length >= fenceLength) {
        closed = true;
        break;
      }
      codeLines.push(lines[index]);
    }

    blocks.push({
      type: 'code',
      content: codeLines.join('\n'),
      language: normalizeCodeLanguage(openingFence[2] || ''),
    });

    if (!closed) break;
  }

  flushMarkdown();
  return blocks;
}

export function MarkdownPreview({
  content,
  notes,
  currentNote,
  attachments,
  onOpenWikiLink,
}: {
  content: string;
  notes: PreviewNote[];
  currentNote?: PreviewNote | null;
  attachments: PreviewAttachment[];
  onOpenWikiLink: (idOrSlug: string, anchor?: string) => void;
}) {
  const [closedCallouts, setClosedCallouts] = useState<Record<string, boolean>>(
    {}
  );
  const { body, footnotes } = useMemo(
    () => stripFootnoteDefinitions(content),
    [content]
  );

  const attachmentByName = useMemo(() => {
    const map = new Map<string, PreviewAttachment>();
    for (const attachment of attachments) {
      map.set(attachment.filePath.toLowerCase(), attachment);
      map.set(attachment.fileName.toLowerCase(), attachment);
    }
    return map;
  }, [attachments]);

  const resolveNote = (target: string) => {
    const resolution = resolveWikiLinkTarget(
      target,
      notes,
      currentNote?.folderPath
    );
    return resolution.status === 'resolved'
      ? { note: resolution.note, anchor: resolution.anchor }
      : null;
  };

  const renderInline = (text: string, keyPrefix: string): ReactNode[] => {
    const withoutComments = text.replace(/%%[\s\S]*?%%/g, '');
    return withoutComments
      .split(
        /(!?\[\[[^\]]+\]\]|==[^=]+==|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|`[^`]+`|\[\^[^\]]+\]|#[^\s#()[\]{}'"`<>.,;:!?\\]+)/g
      )
      .map((part, index) => {
        const key = `${keyPrefix}-${index}`;
        const embed = part.match(/^!\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
        if (embed) return renderEmbed(embed[1].trim(), key);

        const wiki = part.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
        if (wiki) {
          const target = wiki[1].trim();
          const resolved = resolveNote(target);
          return (
            <button
              key={key}
              type="button"
              onClick={() =>
                resolved && onOpenWikiLink(resolved.note.id, resolved.anchor)
              }
              className={`rounded px-1.5 py-0.5 ${resolved ? 'bg-[#34245f] text-[#c9b8ff] hover:bg-[#49347e]' : 'bg-[#3a2b1e] text-[#f2c57c]'}`}
            >
              {wiki[2]?.trim() || target}
            </button>
          );
        }
        if (part.startsWith('==') && part.endsWith('==')) {
          return (
            <mark
              key={key}
              className="rounded bg-[#d6a94a]/25 px-1 text-[#ffe8a8]"
            >
              {part.slice(2, -2)}
            </mark>
          );
        }
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={key}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('*') && part.endsWith('*'))
          return <em key={key}>{part.slice(1, -1)}</em>;
        if (part.startsWith('~~') && part.endsWith('~~'))
          return <s key={key}>{part.slice(2, -2)}</s>;
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={key}
              className="rounded bg-[#111113] px-1.5 py-0.5 text-[#9cdcfe]"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (/^\[\^[^\]]+\]$/.test(part)) {
          return (
            <sup key={key} className="text-[#b8a9ff]">
              {part}
            </sup>
          );
        }
        if (/^#/.test(part)) {
          return (
            <span
              key={key}
              className="rounded bg-[#292936] px-1.5 py-0.5 text-[#b8a9ff]"
            >
              {part}
            </span>
          );
        }
        return <span key={key}>{part}</span>;
      });
  };

  const renderEmbed = (target: string, key: string) => {
    const clean = target.split('#')[0].trim();
    const attachment = attachmentByName.get(clean.toLowerCase());
    if (attachment?.dataUrl && attachment.mimeType?.startsWith('image/')) {
      return (
        <img
          key={key}
          src={attachment.dataUrl}
          alt={attachment.fileName}
          className="my-3 max-h-96 rounded-md border border-[#303036] object-contain"
        />
      );
    }
    if (attachment) {
      return (
        <a
          key={key}
          href={attachment.dataUrl || '#'}
          className="rounded bg-[#252532] px-2 py-1 text-[#c9b8ff]"
          target="_blank"
          rel="noreferrer"
        >
          {attachment.fileName}
        </a>
      );
    }
    const resolved = resolveNote(target);
    if (resolved) {
      return (
        <button
          key={key}
          type="button"
          onClick={() => onOpenWikiLink(resolved.note.id, resolved.anchor)}
          className="my-2 inline-flex items-center gap-2 rounded border border-[#393944] bg-[#25252b] px-3 py-2 text-sm text-[#dcddde] hover:bg-[#2d2940]"
        >
          <FileText className="h-4 w-4 text-[#9a8cff]" />
          {resolved.note.title}
        </button>
      );
    }
    return (
      <span
        key={key}
        className="rounded bg-[#3a2b1e] px-1.5 py-0.5 text-[#f2c57c]"
      >
        ![[{target}]]
      </span>
    );
  };

  const renderLines = (text: string, keyPrefix: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line.trim()) continue;

      if (line.startsWith('|') && lines[i + 1]?.includes('---')) {
        const header = line
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim());
        i += 1;
        const rows: string[][] = [];
        while (lines[i + 1]?.startsWith('|')) {
          i += 1;
          rows.push(
            lines[i]
              .split('|')
              .slice(1, -1)
              .map((cell) => cell.trim())
          );
        }
        elements.push(
          <div key={`${keyPrefix}-table-${i}`} className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {header.map((cell) => (
                    <th
                      key={cell}
                      className="border border-[#34343b] bg-[#24242a] px-3 py-2 text-left text-[#f2f2f3]"
                    >
                      {cell}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${rowIndex}-${cellIndex}`}
                        className="border border-[#34343b] px-3 py-2"
                      >
                        {renderInline(
                          cell,
                          `${keyPrefix}-td-${rowIndex}-${cellIndex}`
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        const size =
          heading[1].length === 1
            ? 'text-3xl'
            : heading[1].length === 2
              ? 'text-2xl'
              : 'text-xl';
        const className = `${size} font-semibold text-[#f2f2f3]`;
        const children = renderInline(heading[2], `${keyPrefix}-h-${i}`);
        const headingAnchor = heading[2].trim();
        const headingId = slugifyNote(headingAnchor);
        if (heading[1].length === 1)
          elements.push(
            <h1
              key={`${keyPrefix}-h-${i}`}
              id={headingId}
              data-wiki-anchor={headingAnchor}
              className={className}
            >
              {children}
            </h1>
          );
        else if (heading[1].length === 2)
          elements.push(
            <h2
              key={`${keyPrefix}-h-${i}`}
              id={headingId}
              data-wiki-anchor={headingAnchor}
              className={className}
            >
              {children}
            </h2>
          );
        else if (heading[1].length === 3)
          elements.push(
            <h3
              key={`${keyPrefix}-h-${i}`}
              id={headingId}
              data-wiki-anchor={headingAnchor}
              className={className}
            >
              {children}
            </h3>
          );
        else if (heading[1].length === 4)
          elements.push(
            <h4
              key={`${keyPrefix}-h-${i}`}
              id={headingId}
              data-wiki-anchor={headingAnchor}
              className={className}
            >
              {children}
            </h4>
          );
        else if (heading[1].length === 5)
          elements.push(
            <h5
              key={`${keyPrefix}-h-${i}`}
              id={headingId}
              data-wiki-anchor={headingAnchor}
              className={className}
            >
              {children}
            </h5>
          );
        else
          elements.push(
            <h6
              key={`${keyPrefix}-h-${i}`}
              id={headingId}
              data-wiki-anchor={headingAnchor}
              className={className}
            >
              {children}
            </h6>
          );
        continue;
      }

      if (/^[-*]\s+\[[ xX]\]/.test(line)) {
        const items: string[] = [line];
        while (/^[-*]\s+\[[ xX]\]/.test(lines[i + 1] || '')) {
          i += 1;
          items.push(lines[i]);
        }
        elements.push(
          <ul key={`${keyPrefix}-tasks-${i}`} className="space-y-2">
            {items.map((item) => {
              const checked = /^[-*]\s+\[[xX]\]/.test(item);
              return (
                <li key={item} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    className="mt-1 accent-[#7c5cff]"
                  />
                  <span
                    className={checked ? 'text-[#8f8f98] line-through' : ''}
                  >
                    {renderInline(
                      item.replace(/^[-*]\s+\[[ xX]\]\s*/, ''),
                      `${keyPrefix}-task-${item}`
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        );
        continue;
      }

      if (/^[-*]\s+/.test(line)) {
        const items: string[] = [line];
        while (/^[-*]\s+/.test(lines[i + 1] || '')) {
          i += 1;
          items.push(lines[i]);
        }
        elements.push(
          <ul key={`${keyPrefix}-ul-${i}`} className="list-disc space-y-1 pl-6">
            {items.map((item) => (
              <li key={item}>
                {renderInline(
                  item.replace(/^[-*]\s+/, ''),
                  `${keyPrefix}-li-${item}`
                )}
              </li>
            ))}
          </ul>
        );
        continue;
      }

      if (/^<[^>]+>/.test(line.trim())) {
        elements.push(
          <div
            key={`${keyPrefix}-html-${i}`}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(line) }}
          />
        );
        continue;
      }

      const blockReference = line.match(
        /(?:^|\s)\^([A-Za-z0-9][A-Za-z0-9_-]*)\s*$/
      );
      if (blockReference) {
        const blockId = blockReference[1];
        const blockContent = line
          .replace(new RegExp(`\\s*\\^${blockId}\\s*$`), '')
          .trim();
        elements.push(
          <p
            key={`${keyPrefix}-block-ref-${i}`}
            id={`block-${blockId}`}
            data-wiki-anchor={`^${blockId}`}
          >
            {renderInline(blockContent, `${keyPrefix}-block-ref-${i}`)}
          </p>
        );
        continue;
      }

      elements.push(
        <p key={`${keyPrefix}-p-${i}`}>
          {renderInline(line, `${keyPrefix}-p-${i}`)}
        </p>
      );
    }

    return elements;
  };

  const blocks = tokenizeMarkdownBlocks(
    body.replace(/^---\s*\n[\s\S]*?\n---/, '')
  );

  if (!content.trim())
    return <div className="p-8 text-sm text-[#7f7f87]">Preview vazio.</div>;

  return (
    <div className="space-y-4 px-8 py-7 text-[15px] leading-7 text-[#dcddde]">
      {blocks.map((block, index) => {
        if (block.type === 'code') {
          const language = block.language;
          return (
            <div key={index}>
              {language === 'mermaid' && (
                <div className="mb-1 text-xs text-[#8f8f98]">
                  Mermaid preview indisponivel, exibindo fonte.
                </div>
              )}
              <pre className="overflow-x-auto overflow-y-hidden rounded-md border border-[#2b2b30] bg-[#111113] p-4 text-sm leading-6 whitespace-pre text-[#d4d4d4]">
                <code
                  className={`language-${language}`}
                  data-language={language}
                >
                  {block.content}
                </code>
              </pre>
            </div>
          );
        }

        const callout = block.content.match(
          /^>\s*\[!(\w+)\]([+-])?\s*(.*)(?:\n([\s\S]*))?$/
        );
        if (callout) {
          const type = normalizeCalloutType(callout[1]);
          const config = calloutConfig[type] || calloutConfig.note;
          const Icon = config.Icon;
          const title = callout[3]?.trim() || config.label;
          const fold = callout[2];
          const key = `callout-${index}`;
          const bodyText = block.content
            .split('\n')
            .slice(1)
            .map((line) => line.replace(/^>\s?/, ''))
            .join('\n');
          const closed = closedCallouts[key] ?? fold === '-';
          return (
            <div
              key={key}
              className={`rounded-md border-l-4 px-4 py-3 ${config.className}`}
            >
              <button
                type="button"
                onClick={() =>
                  fold &&
                  setClosedCallouts((current) => ({
                    ...current,
                    [key]: !closed,
                  }))
                }
                className="flex w-full items-center gap-2 text-left text-sm font-semibold tracking-normal uppercase"
              >
                {fold ? (
                  closed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )
                ) : null}
                <Icon className={`h-4 w-4 shrink-0 ${config.titleClassName}`} />
                <span className={config.titleClassName}>{title}</span>
              </button>
              {!closed && bodyText.trim() && (
                <div className="mt-2 space-y-2 text-[#dcddde]">
                  {renderLines(bodyText, key)}
                </div>
              )}
            </div>
          );
        }

        if (block.content.startsWith('>')) {
          return (
            <blockquote
              key={index}
              className="border-l-2 border-[#7c5cff] pl-4 text-[#b8b8bf]"
            >
              {renderLines(
                block.content.replace(/^>\s?/gm, ''),
                `quote-${index}`
              )}
            </blockquote>
          );
        }

        return (
          <div key={index} className="space-y-3">
            {renderLines(block.content, `block-${index}`)}
          </div>
        );
      })}

      {footnotes.length > 0 && (
        <div className="border-t border-[#303036] pt-4 text-sm text-[#b8b8bf]">
          {footnotes.map((footnote) => (
            <p key={footnote.id}>
              <sup>[^{footnote.id}]</sup>{' '}
              {renderInline(footnote.content, `footnote-${footnote.id}`)}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
