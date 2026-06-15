export const NOTE_STATUS_OPTIONS = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export const NOTE_VISIBILITY_OPTIONS = ['PRIVATE', 'PUBLIC'] as const;

export type NoteStatusValue = (typeof NOTE_STATUS_OPTIONS)[number];
export type NoteVisibilityValue = (typeof NOTE_VISIBILITY_OPTIONS)[number];

export type ParsedWikiLink = {
  targetTitle: string;
  targetSlug: string;
  alias?: string;
  anchor?: string;
  occurrences: number;
};

export function slugifyNote(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s_-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function normalizeNoteTag(tag: string) {
  const normalized = tag
    .trim()
    .replace(/^#/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s#()[\]{}'"`<>.,;:!?\\]+/g, '')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');

  return /^\d+$/.test(normalized) ? '' : normalized;
}

export function extractNoteTags(content: string, explicitTags: string[] = []) {
  const tags = new Set<string>();

  for (const tag of explicitTags) {
    const normalized = normalizeNoteTag(tag);
    if (normalized) tags.add(normalized);
  }

  const frontmatter = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (frontmatter) {
    const lines = frontmatter[1].split('\n');
    let inTags = false;
    for (const line of lines) {
      const keyValue = line.match(/^tags:\s*(.*)$/i);
      if (keyValue) {
        inTags = true;
        const inline = keyValue[1].trim();
        if (inline) {
          inline
            .replace(/^\[|\]$/g, '')
            .split(',')
            .map((tag) => tag.trim().replace(/^['"]|['"]$/g, ''))
            .forEach((tag) => {
              const normalized = normalizeNoteTag(tag);
              if (normalized) tags.add(normalized);
            });
        }
        continue;
      }
      if (inTags) {
        const item = line.match(/^\s*-\s*(.+)$/);
        if (item) {
          const normalized = normalizeNoteTag(
            item[1].replace(/^['"]|['"]$/g, '')
          );
          if (normalized) tags.add(normalized);
          continue;
        }
        if (/^\S/.test(line)) inTags = false;
      }
    }
  }

  const withoutCode = content
    .replace(/^---\s*\n[\s\S]*?\n---/, '')
    .replace(/```[\s\S]*?```/g, ' ');
  const tagRegex = /(^|[\s([{'"`])#([^\s#()[\]{}'"`<>.,;:!?\\]+)/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(withoutCode)) !== null) {
    const normalized = normalizeNoteTag(match[2]);
    if (normalized) tags.add(normalized);
  }

  return Array.from(tags).sort((a, b) => a.localeCompare(b));
}

export function extractWikiLinks(content: string) {
  const links = new Map<string, ParsedWikiLink>();
  const wikiLinkRegex = /!?\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = wikiLinkRegex.exec(content)) !== null) {
    const rawTarget = match[1].trim();
    const [pathPart, anchor] = rawTarget.split('#');
    const targetTitle = pathPart.trim();
    if (!targetTitle) continue;

    const targetSlug = slugifyNote(inferNoteTitleFromPath(targetTitle));
    if (!targetSlug) continue;

    const alias = match[2]?.trim() || undefined;
    const existing = links.get(targetSlug);

    if (existing) {
      existing.occurrences += 1;
      if (!existing.alias && alias) existing.alias = alias;
    } else {
      links.set(targetSlug, {
        targetTitle,
        targetSlug,
        alias,
        anchor: anchor?.trim() || undefined,
        occurrences: 1,
      });
    }
  }

  return Array.from(links.values());
}

export function inferNoteTitleFromPath(path: string) {
  const fileName = path.split('/').pop() || path;
  return fileName.replace(/\.md$/i, '').trim() || 'Nota sem titulo';
}

export function normalizeVaultPath(path: string) {
  const decoded = (() => {
    try {
      return decodeURIComponent(path);
    } catch {
      return path;
    }
  })();

  return decoded
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .join('/');
}

export function isUnsafeVaultPath(path: string) {
  const normalized = normalizeVaultPath(path);
  const parts = normalized.split('/');
  return (
    normalized.startsWith('/') ||
    normalized.includes('\0') ||
    parts.some((part) => part === '..')
  );
}

export function isIgnoredVaultPath(path: string) {
  const normalized = normalizeVaultPath(path);
  const parts = normalized.split('/');
  const fileName = parts.at(-1) || '';
  return (
    !normalized ||
    normalized.includes('__MACOSX/') ||
    parts.some((part) => part === '.obsidian' || part.startsWith('.')) ||
    fileName === '.DS_Store' ||
    fileName.startsWith('~') ||
    fileName.endsWith('.tmp') ||
    fileName.endsWith('.temp') ||
    fileName.endsWith('.swp')
  );
}

export function getVaultFileMetadata(path: string) {
  const filePath = normalizeVaultPath(path);
  const parts = filePath.split('/');
  const fileName = parts.pop() || filePath;
  const folderPath = parts.join('/') || null;
  const folderName = parts.at(-1) || null;
  const extensionMatch = fileName.match(/\.([^.]+)$/);

  return {
    fileName,
    filePath,
    folderPath,
    folderName,
    extension: extensionMatch?.[1]?.toLowerCase() || null,
  };
}

export function createExcerpt(content: string, fallback = '') {
  const clean = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, '$2$1')
    .replace(/[#>*_`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return (clean || fallback).slice(0, 220);
}
