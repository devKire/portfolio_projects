import { normalizeVaultPath } from '../notes.ts';

function splitExtension(fileName: string) {
  const dot = fileName.lastIndexOf('.');
  return dot > 0
    ? { base: fileName.slice(0, dot), extension: fileName.slice(dot) }
    : { base: fileName, extension: '' };
}

export function joinKnowledgePath(
  folderPath: string | null | undefined,
  name: string
) {
  return folderPath ? `${folderPath}/${name}` : name;
}

export function reserveUniqueSlug(preferred: string, used: Set<string>) {
  const base = preferred || 'nota';
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

export function reserveUniqueFilePath(path: string, used: Set<string>) {
  const normalized = normalizeVaultPath(path);
  const segments = normalized.split('/');
  const fileName = segments.pop() || 'arquivo';
  const folderPath = segments.join('/') || null;
  const { base, extension } = splitExtension(fileName);
  let candidate = joinKnowledgePath(folderPath, fileName);
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = joinKnowledgePath(folderPath, `${base}-${suffix}${extension}`);
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

export function reserveUniqueFolderPath(path: string, used: Set<string>) {
  const normalized = normalizeVaultPath(path);
  const segments = normalized.split('/');
  const name = segments.pop() || 'Pasta';
  const parentPath = segments.join('/') || null;
  let candidate = joinKnowledgePath(parentPath, name);
  let suffix = 2;
  while (used.has(candidate)) {
    candidate = joinKnowledgePath(parentPath, `${name}-${suffix}`);
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}

export function replaceKnowledgePathPrefix(
  path: string | null | undefined,
  oldPrefix: string,
  nextPrefix: string
) {
  if (!path) return null;
  if (path === oldPrefix) return nextPrefix;
  if (!path.startsWith(`${oldPrefix}/`)) return path;
  return `${nextPrefix}/${path.slice(oldPrefix.length + 1)}`;
}

export function relativeKnowledgePath(
  sourceFolder: string | null | undefined,
  targetPath: string
) {
  if (!sourceFolder) return targetPath;
  if (targetPath.startsWith(`${sourceFolder}/`)) {
    return targetPath.slice(sourceFolder.length + 1);
  }
  return targetPath;
}

export function extractAttachmentReferences(content: string) {
  const references = new Set<string>();
  const wikiLink = /!?\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]*)?\]\]/g;
  const markdownLink = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  let match: RegExpExecArray | null;

  while ((match = wikiLink.exec(content)) !== null) {
    const value = normalizeVaultPath(match[1].trim());
    if (/\.[a-z0-9]{2,10}$/i.test(value)) references.add(value);
  }
  while ((match = markdownLink.exec(content)) !== null) {
    const encoded = match[1].replace(/^<|>$/g, '');
    // normalizeVaultPath decodes defensively and preserves malformed literals.
    const value = normalizeVaultPath(encoded);
    if (value && !/^(?:https?:|data:)/i.test(value)) references.add(value);
  }
  return Array.from(references);
}

export function rewriteKnowledgeReference(
  content: string,
  oldTargets: readonly string[],
  nextTarget: string
) {
  const targets = new Set(
    oldTargets.map((target) => normalizeVaultPath(target)).filter(Boolean)
  );
  if (!targets.size) return content;

  const rewrite = (target: string) => {
    const normalized = normalizeVaultPath(target.replace(/^<|>$/g, ''));
    return targets.has(normalized) ? nextTarget : target;
  };

  return content
    .replace(
      /(!?\[\[)([^\]|#]+)((?:#[^\]|]+)?(?:\|[^\]]*)?\]\])/g,
      (_match, prefix: string, target: string, suffix: string) =>
        `${prefix}${rewrite(target)}${suffix}`
    )
    .replace(
      /(!?\[[^\]]*\]\()([^)\s]+)((?:\s+["'][^"']*["'])?\))/g,
      (_match, prefix: string, target: string, suffix: string) =>
        `${prefix}${rewrite(target)}${suffix}`
    );
}
