import { getLeadingFrontmatterEndLine } from '@/lib/notes';

export type Footnote = { id: string; content: string };

export type MarkdownBlock =
  | { type: 'markdown'; content: string; startLine: number }
  | { type: 'code'; content: string; language: string; startLine: number };

export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'embed'; target: string }
  | { type: 'wiki'; target: string; alias?: string }
  | { type: 'external-link'; label: string; href: string }
  | { type: 'unsafe-link'; label: string }
  | {
      type:
        | 'inline-code'
        | 'highlight'
        | 'strong'
        | 'emphasis'
        | 'strikethrough'
        | 'footnote'
        | 'tag';
      value: string;
    };

export function stripFootnoteDefinitions(content: string) {
  const footnotes: Footnote[] = [];
  const body = content.replace(
    /^\[\^([^\]]+)\]:\s+(.+)$/gm,
    (_match, id: string, text: string) => {
      footnotes.push({ id, content: text });
      return '';
    }
  );
  return { body, footnotes };
}

export function tokenizeMarkdownBlocks(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = content.split(/\r?\n/);
  const frontmatterEndLine = getLeadingFrontmatterEndLine(content);
  let markdownLines: { content: string; lineIndex: number }[] = [];

  const flushMarkdown = () => {
    if (markdownLines.length === 0) return;
    blocks.push({
      type: 'markdown',
      content: markdownLines.map((line) => line.content).join('\n'),
      startLine: markdownLines[0].lineIndex,
    });
    markdownLines = [];
  };

  for (
    let index = frontmatterEndLine === null ? 0 : frontmatterEndLine + 1;
    index < lines.length;
    index += 1
  ) {
    const line = lines[index];
    const openingFence = line.match(
      /^\s{0,3}(`{3,}|~{3,})[ \t]*([^\s`~]+)?[^\r\n]*$/
    );

    if (openingFence) {
      flushMarkdown();
      const marker = openingFence[1][0];
      const fenceLength = openingFence[1].length;
      const codeLines: string[] = [];
      const startLine = index;

      for (index += 1; index < lines.length; index += 1) {
        const closingFence = lines[index].match(/^\s{0,3}(`{3,}|~{3,})\s*$/);
        if (
          closingFence &&
          closingFence[1][0] === marker &&
          closingFence[1].length >= fenceLength
        ) {
          break;
        }
        codeLines.push(lines[index]);
      }

      blocks.push({
        type: 'code',
        content: codeLines.join('\n'),
        language: openingFence[2] || '',
        startLine,
      });
      continue;
    }

    if (!line.trim()) {
      flushMarkdown();
      continue;
    }

    markdownLines.push({ content: line, lineIndex: index });
  }

  flushMarkdown();
  return blocks;
}

export function getFencedCodeLineIndexes(content: string) {
  const fencedLines = new Set<number>();
  const lines = content.split(/\r?\n/);
  let activeFence: { marker: string; length: number } | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].replace(/^\s*(?:>\s*)+/, '');
    if (activeFence) {
      fencedLines.add(index);
      const closingFence = line.match(/^\s{0,3}(`{3,}|~{3,})\s*$/);
      if (
        closingFence &&
        closingFence[1][0] === activeFence.marker &&
        closingFence[1].length >= activeFence.length
      ) {
        activeFence = null;
      }
      continue;
    }

    const openingFence = line.match(
      /^\s{0,3}(`{3,}|~{3,})[ \t]*([^\s`~]+)?[^\r\n]*$/
    );
    if (!openingFence) continue;
    activeFence = {
      marker: openingFence[1][0],
      length: openingFence[1].length,
    };
    fencedLines.add(index);
  }

  return fencedLines;
}

function normalizeExternalTarget(target: string) {
  let normalized = target.trim();
  if (normalized.startsWith('<') && normalized.endsWith('>')) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized.replace(/\\([\\_*{}\[\]()#+.!:=?&%\-/])/g, '$1');
}

export function getSafeExternalHref(target: string) {
  const normalized = normalizeExternalTarget(target);
  if (!normalized || /[\u0000-\u001f\u007f\s]/.test(normalized)) return null;

  try {
    const url = new URL(normalized);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol.toLowerCase())
      ? normalized
      : null;
  } catch {
    return null;
  }
}

function findUnescaped(text: string, character: string, start: number) {
  for (let index = start; index < text.length; index += 1) {
    if (text[index] !== character) continue;
    let slashCount = 0;
    for (let previous = index - 1; text[previous] === '\\'; previous -= 1) {
      slashCount += 1;
    }
    if (slashCount % 2 === 0) return index;
  }
  return -1;
}

function parseMarkdownLink(text: string, start: number) {
  const labelEnd = findUnescaped(text, ']', start + 1);
  if (labelEnd === -1 || text[labelEnd + 1] !== '(') return null;

  let depth = 1;
  let escaped = false;
  for (let index = labelEnd + 2; index < text.length; index += 1) {
    const character = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character === '(') depth += 1;
    if (character !== ')') continue;
    depth -= 1;
    if (depth !== 0) continue;

    const label = text.slice(start + 1, labelEnd).replace(/\\([\[\]])/g, '$1');
    const target = text.slice(labelEnd + 2, index);
    return { label, target, end: index + 1 };
  }

  return null;
}

function readBareUrl(text: string, start: number) {
  const match = text.slice(start).match(/^https?:\/\/[^\s<>"']+/i);
  if (!match) return null;

  let value = match[0];
  while (/[.,;!?]$/.test(value)) value = value.slice(0, -1);

  const openingParentheses = (value.match(/\(/g) || []).length;
  let closingParentheses = (value.match(/\)/g) || []).length;
  while (value.endsWith(')') && closingParentheses > openingParentheses) {
    value = value.slice(0, -1);
    closingParentheses -= 1;
  }

  const href = getSafeExternalHref(value);
  return href ? { href, end: start + value.length } : null;
}

function pushText(tokens: InlineToken[], value: string) {
  if (!value) return;
  const previous = tokens.at(-1);
  if (previous?.type === 'text') previous.value += value;
  else tokens.push({ type: 'text', value });
}

export function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const source = text.replace(/%%[\s\S]*?%%/g, '');

  for (let index = 0; index < source.length; ) {
    const isEmbed = source.startsWith('![[', index);
    const isWiki = source.startsWith('[[', index);
    if (isEmbed || isWiki) {
      const contentStart = index + (isEmbed ? 3 : 2);
      const end = source.indexOf(']]', contentStart);
      if (end !== -1) {
        const inner = source.slice(contentStart, end);
        const separator = inner.indexOf('|');
        const target = (
          separator === -1 ? inner : inner.slice(0, separator)
        ).trim();
        const alias =
          separator === -1 ? undefined : inner.slice(separator + 1).trim();
        if (target) {
          tokens.push(
            isEmbed
              ? { type: 'embed', target }
              : { type: 'wiki', target, alias: alias || undefined }
          );
          index = end + 2;
          continue;
        }
      }
    }

    if (source[index] === '`') {
      const end = source.indexOf('`', index + 1);
      if (end !== -1) {
        tokens.push({
          type: 'inline-code',
          value: source.slice(index + 1, end),
        });
        index = end + 1;
        continue;
      }
    }

    if (source[index] === '[' && !source.startsWith('[[', index)) {
      const markdownLink = parseMarkdownLink(source, index);
      if (markdownLink) {
        const href = getSafeExternalHref(markdownLink.target);
        tokens.push(
          href
            ? { type: 'external-link', label: markdownLink.label, href }
            : { type: 'unsafe-link', label: markdownLink.label }
        );
        index = markdownLink.end;
        continue;
      }
    }

    if (source[index] === '<') {
      const end = source.indexOf('>', index + 1);
      if (end !== -1) {
        const label = source.slice(index + 1, end);
        const href = getSafeExternalHref(label);
        if (href) {
          tokens.push({ type: 'external-link', label, href });
          index = end + 1;
          continue;
        }
      }
    }

    if (/^https?:\/\//i.test(source.slice(index))) {
      const bareUrl = readBareUrl(source, index);
      if (bareUrl) {
        tokens.push({
          type: 'external-link',
          label: bareUrl.href,
          href: bareUrl.href,
        });
        index = bareUrl.end;
        continue;
      }
    }

    const pairedTokens: {
      marker: string;
      type: 'highlight' | 'strong' | 'strikethrough' | 'emphasis';
    }[] = [
      { marker: '==', type: 'highlight' },
      { marker: '**', type: 'strong' },
      { marker: '~~', type: 'strikethrough' },
      { marker: '*', type: 'emphasis' },
    ];
    let matchedPair = false;
    for (const paired of pairedTokens) {
      if (!source.startsWith(paired.marker, index)) continue;
      const end = source.indexOf(paired.marker, index + paired.marker.length);
      if (end === -1) continue;
      tokens.push({
        type: paired.type,
        value: source.slice(index + paired.marker.length, end),
      });
      index = end + paired.marker.length;
      matchedPair = true;
      break;
    }
    if (matchedPair) continue;

    const footnote = source.slice(index).match(/^\[\^([^\]]+)\]/);
    if (footnote) {
      tokens.push({ type: 'footnote', value: footnote[0] });
      index += footnote[0].length;
      continue;
    }

    const previous = index === 0 ? '' : source[index - 1];
    const tag = source.slice(index).match(/^#[^\s#()[\]{}'"`<>.,;:!?\\]+/);
    if (tag && (!previous || /[\s([{\'"`]/.test(previous))) {
      tokens.push({ type: 'tag', value: tag[0] });
      index += tag[0].length;
      continue;
    }

    pushText(tokens, source[index]);
    index += 1;
  }

  return tokens;
}

export function toggleMarkdownTask(content: string, lineIndex: number) {
  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(newline);
  if (lineIndex < 0 || lineIndex >= lines.length) return content;

  const task = lines[lineIndex].match(/^((?:\s*>\s*)*\s*[-*+]\s+)\[([ xX])\]/);
  if (!task) return content;

  const nextMarker = task[2].toLowerCase() === 'x' ? ' ' : 'x';
  lines[lineIndex] = lines[lineIndex].replace(
    /^((?:\s*>\s*)*\s*[-*+]\s+)\[[ xX]\]/,
    `$1[${nextMarker}]`
  );
  return lines.join(newline);
}
