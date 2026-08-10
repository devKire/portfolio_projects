'use client';

import {
  AlertTriangle,
  Bug,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
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
import { useEffect, useMemo, useRef, useState } from 'react';

import { resolveWikiLinkTarget, slugifyNote } from '@/lib/notes';

import {
  getFencedCodeLineIndexes,
  getSafeExternalHref,
  stripFootnoteDefinitions,
  tokenizeInline,
  tokenizeMarkdownBlocks,
} from './markdownPreviewUtils';

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

function normalizeCodeLanguage(language: string) {
  const normalized = language.trim().toLowerCase();
  return codeLanguageAliases[normalized] || normalized || 'text';
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
        .replace(/\s(?:target|rel)=(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
        .replace(
          /\shref=(["'])(.*?)\1/gi,
          (_match, quote: string, href: string) =>
            getSafeExternalHref(href) ? ` href=${quote}${href}${quote}` : ''
        )
        .replace(/\shref=([^\s>"']+)/gi, (_match, href: string) =>
          getSafeExternalHref(href) ? ` href="${href}"` : ''
        )
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
      const externalAttrs =
        tagName === 'a' ? ' target="_blank" rel="noopener noreferrer"' : '';
      return tag.startsWith('</')
        ? `</${tagName}>`
        : `<${tagName}${safeAttrs}${externalAttrs}>`;
    });
}

function CodeBlock({
  content,
  language,
}: {
  content: string;
  language: string;
}) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    []
  );

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="group overflow-hidden rounded-md border border-[#2b2b30] bg-[#111113]">
      <div className="flex min-h-10 items-center justify-between border-b border-[#2b2b30] bg-[#17171a] px-3 py-1.5">
        <span className="font-mono text-xs text-[#8f8f98]">{language}</span>
        <button
          type="button"
          onClick={() => void copyCode()}
          className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-[#a8a8b0] hover:bg-[#292930] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f7cff]"
          aria-label={copied ? 'Código copiado' : 'Copiar código'}
          title={copied ? 'Código copiado' : 'Copiar código'}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-300" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>
      </div>
      <pre className="overflow-x-auto overflow-y-hidden p-4 text-sm leading-6 whitespace-pre text-[#d4d4d4]">
        <code className={`language-${language}`} data-language={language}>
          {content}
        </code>
      </pre>
    </div>
  );
}

function ExternalLink({ href, label }: { href: string; label: string }) {
  const opensNewTab = /^https?:/i.test(href);
  return (
    <a
      href={href}
      target={opensNewTab ? '_blank' : undefined}
      rel={opensNewTab ? 'noopener noreferrer' : undefined}
      className="rounded-sm text-[#9a8cff] underline underline-offset-2 hover:text-[#b8a9ff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f7cff]"
    >
      {label}
    </a>
  );
}

export function MarkdownPreview({
  content,
  notes,
  currentNote,
  attachments,
  onOpenWikiLink,
  onToggleTask,
}: {
  content: string;
  notes: PreviewNote[];
  currentNote?: PreviewNote | null;
  attachments: PreviewAttachment[];
  onOpenWikiLink: (idOrSlug: string, anchor?: string) => void;
  onToggleTask: (lineIndex: number) => void;
}) {
  const [closedCallouts, setClosedCallouts] = useState<Record<string, boolean>>(
    {}
  );
  const { body, footnotes } = useMemo(
    () => stripFootnoteDefinitions(content),
    [content]
  );
  const blocks = useMemo(() => tokenizeMarkdownBlocks(body), [body]);
  const fencedCodeLines = useMemo(
    () => getFencedCodeLineIndexes(content),
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
          rel="noopener noreferrer"
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

  const renderInline = (text: string, keyPrefix: string): ReactNode[] =>
    tokenizeInline(text).map((token, index) => {
      const key = `${keyPrefix}-${index}`;
      switch (token.type) {
        case 'embed':
          return renderEmbed(token.target, key);
        case 'wiki': {
          const resolved = resolveNote(token.target);
          return (
            <button
              key={key}
              type="button"
              onClick={() =>
                resolved && onOpenWikiLink(resolved.note.id, resolved.anchor)
              }
              className={`rounded px-1.5 py-0.5 ${resolved ? 'bg-[#34245f] text-[#c9b8ff] hover:bg-[#49347e]' : 'bg-[#3a2b1e] text-[#f2c57c]'}`}
            >
              {token.alias || token.target}
            </button>
          );
        }
        case 'external-link':
          return (
            <ExternalLink key={key} href={token.href} label={token.label} />
          );
        case 'unsafe-link':
          return <span key={key}>{token.label}</span>;
        case 'highlight':
          return (
            <mark
              key={key}
              className="rounded bg-[#d6a94a]/25 px-1 text-[#ffe8a8]"
            >
              {token.value}
            </mark>
          );
        case 'strong':
          return <strong key={key}>{token.value}</strong>;
        case 'emphasis':
          return <em key={key}>{token.value}</em>;
        case 'strikethrough':
          return <s key={key}>{token.value}</s>;
        case 'inline-code':
          return (
            <code
              key={key}
              className="rounded bg-[#111113] px-1.5 py-0.5 text-[#9cdcfe]"
            >
              {token.value}
            </code>
          );
        case 'footnote':
          return (
            <sup key={key} className="text-[#b8a9ff]">
              {token.value}
            </sup>
          );
        case 'tag':
          return (
            <span
              key={key}
              className="rounded bg-[#292936] px-1.5 py-0.5 text-[#b8a9ff]"
            >
              {token.value}
            </span>
          );
        case 'text':
          return <span key={key}>{token.value}</span>;
      }
    });

  const renderLines = (text: string, keyPrefix: string, startLine: number) => {
    const lines = text.split('\n');
    const elements: ReactNode[] = [];

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const sourceLine = startLine + index;
      if (!line.trim()) continue;

      if (/^\s{0,3}(?:(?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/.test(line)) {
        elements.push(
          <hr
            key={`${keyPrefix}-hr-${sourceLine}`}
            className="my-6 border-0 border-t border-[#34343b]"
          />
        );
        continue;
      }

      if (line.startsWith('|') && lines[index + 1]?.includes('---')) {
        const header = line
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim());
        index += 1;
        const rows: { cells: string[]; lineIndex: number }[] = [];
        while (lines[index + 1]?.startsWith('|')) {
          index += 1;
          rows.push({
            cells: lines[index]
              .split('|')
              .slice(1, -1)
              .map((cell) => cell.trim()),
            lineIndex: startLine + index,
          });
        }
        elements.push(
          <div
            key={`${keyPrefix}-table-${sourceLine}`}
            className="overflow-x-auto"
          >
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {header.map((cell, cellIndex) => (
                    <th
                      key={`${sourceLine}-${cellIndex}`}
                      className="border border-[#34343b] bg-[#24242a] px-3 py-2 text-left text-[#f2f2f3]"
                    >
                      {renderInline(cell, `${keyPrefix}-th-${cellIndex}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.lineIndex}>
                    {row.cells.map((cell, cellIndex) => (
                      <td
                        key={`${row.lineIndex}-${cellIndex}`}
                        className="border border-[#34343b] px-3 py-2"
                      >
                        {renderInline(
                          cell,
                          `${keyPrefix}-td-${row.lineIndex}-${cellIndex}`
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
        const children = renderInline(
          heading[2],
          `${keyPrefix}-h-${sourceLine}`
        );
        const headingAnchor = heading[2].trim();
        const headingId = slugifyNote(headingAnchor);
        const commonProps = {
          id: headingId,
          'data-wiki-anchor': headingAnchor,
          className,
        };
        if (heading[1].length === 1)
          elements.push(
            <h1 key={`${keyPrefix}-h-${sourceLine}`} {...commonProps}>
              {children}
            </h1>
          );
        else if (heading[1].length === 2)
          elements.push(
            <h2 key={`${keyPrefix}-h-${sourceLine}`} {...commonProps}>
              {children}
            </h2>
          );
        else if (heading[1].length === 3)
          elements.push(
            <h3 key={`${keyPrefix}-h-${sourceLine}`} {...commonProps}>
              {children}
            </h3>
          );
        else if (heading[1].length === 4)
          elements.push(
            <h4 key={`${keyPrefix}-h-${sourceLine}`} {...commonProps}>
              {children}
            </h4>
          );
        else if (heading[1].length === 5)
          elements.push(
            <h5 key={`${keyPrefix}-h-${sourceLine}`} {...commonProps}>
              {children}
            </h5>
          );
        else
          elements.push(
            <h6 key={`${keyPrefix}-h-${sourceLine}`} {...commonProps}>
              {children}
            </h6>
          );
        continue;
      }

      if (
        !fencedCodeLines.has(sourceLine) &&
        /^\s*[-*+]\s+\[[ xX]\]/.test(line)
      ) {
        const items = [{ content: line, lineIndex: sourceLine }];
        while (
          !fencedCodeLines.has(startLine + index + 1) &&
          /^\s*[-*+]\s+\[[ xX]\]/.test(lines[index + 1] || '')
        ) {
          index += 1;
          items.push({
            content: lines[index],
            lineIndex: startLine + index,
          });
        }
        elements.push(
          <ul key={`${keyPrefix}-tasks-${sourceLine}`} className="space-y-2">
            {items.map((item) => {
              const checked = /^\s*[-*+]\s+\[[xX]\]/.test(item.content);
              const label = item.content.replace(
                /^\s*[-*+]\s+\[[ xX]\]\s*/,
                ''
              );
              return (
                <li key={item.lineIndex} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleTask(item.lineIndex)}
                    aria-label={`${checked ? 'Desmarcar' : 'Marcar'} tarefa: ${label}`}
                    className="mt-1 accent-[#7c5cff] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8f7cff]"
                  />
                  <span
                    className={checked ? 'text-[#8f8f98] line-through' : ''}
                  >
                    {renderInline(label, `${keyPrefix}-task-${item.lineIndex}`)}
                  </span>
                </li>
              );
            })}
          </ul>
        );
        continue;
      }

      if (/^\s*[-*+]\s+/.test(line)) {
        const items = [{ content: line, lineIndex: sourceLine }];
        while (/^\s*[-*+]\s+/.test(lines[index + 1] || '')) {
          index += 1;
          items.push({
            content: lines[index],
            lineIndex: startLine + index,
          });
        }
        elements.push(
          <ul
            key={`${keyPrefix}-ul-${sourceLine}`}
            className="list-disc space-y-1 pl-6"
          >
            {items.map((item) => (
              <li key={item.lineIndex}>
                {renderInline(
                  item.content.replace(/^\s*[-*+]\s+/, ''),
                  `${keyPrefix}-li-${item.lineIndex}`
                )}
              </li>
            ))}
          </ul>
        );
        continue;
      }

      if (/^<\/?[A-Za-z][A-Za-z0-9-]*(?:\s|>|\/)/.test(line.trim())) {
        elements.push(
          <div
            key={`${keyPrefix}-html-${sourceLine}`}
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
            key={`${keyPrefix}-block-ref-${sourceLine}`}
            id={`block-${blockId}`}
            data-wiki-anchor={`^${blockId}`}
          >
            {renderInline(blockContent, `${keyPrefix}-block-ref-${sourceLine}`)}
          </p>
        );
        continue;
      }

      elements.push(
        <p key={`${keyPrefix}-p-${sourceLine}`}>
          {renderInline(line, `${keyPrefix}-p-${sourceLine}`)}
        </p>
      );
    }

    return elements;
  };

  if (!content.trim())
    return <div className="p-8 text-sm text-[#7f7f87]">Preview vazio.</div>;

  return (
    <div className="space-y-4 px-8 py-7 text-[15px] leading-7 text-[#dcddde]">
      {blocks.map((block, index) => {
        if (block.type === 'code') {
          const language = normalizeCodeLanguage(block.language);
          return (
            <div key={`code-${block.startLine}`}>
              {language === 'mermaid' && (
                <div className="mb-1 text-xs text-[#8f8f98]">
                  Mermaid preview indisponivel, exibindo fonte.
                </div>
              )}
              <CodeBlock content={block.content} language={language} />
            </div>
          );
        }

        const callout = block.content.match(
          /^>\s*\[!([\w-]+)\]([+-])?\s*(.*)(?:\n([\s\S]*))?$/
        );
        if (callout) {
          const type = normalizeCalloutType(callout[1]);
          const config = calloutConfig[type] || calloutConfig.note;
          const Icon = config.Icon;
          const title = callout[3]?.trim() || config.label;
          const fold = callout[2];
          const key = `callout-${block.startLine}`;
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
                disabled={!fold}
                aria-expanded={fold ? !closed : undefined}
                onClick={() =>
                  fold &&
                  setClosedCallouts((current) => ({
                    ...current,
                    [key]: !closed,
                  }))
                }
                className="flex w-full items-center gap-2 text-left text-sm font-semibold tracking-normal uppercase disabled:cursor-default"
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
                  {renderLines(bodyText, key, block.startLine + 1)}
                </div>
              )}
            </div>
          );
        }

        if (block.content.startsWith('>')) {
          return (
            <blockquote
              key={`quote-${block.startLine}`}
              className="border-l-2 border-[#7c5cff] pl-4 text-[#b8b8bf]"
            >
              {renderLines(
                block.content.replace(/^>\s?/gm, ''),
                `quote-${block.startLine}`,
                block.startLine
              )}
            </blockquote>
          );
        }

        return (
          <div key={`block-${block.startLine}-${index}`} className="space-y-3">
            {renderLines(
              block.content,
              `block-${block.startLine}`,
              block.startLine
            )}
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
