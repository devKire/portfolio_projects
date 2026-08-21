import { normalizeVaultPath } from '../notes.ts';

export type KnowledgePathReplacement = {
  fromPath: string;
  toPath: string;
};

export type KnowledgeFolderTransferNode = {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
};

export type KnowledgeFolderTransferPlan = {
  id: string;
  sourcePath: string;
  name: string;
  path: string;
  parentId: string | null;
};

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

export function planKnowledgeFolderTree(input: {
  folders: readonly KnowledgeFolderTransferNode[];
  rootId: string;
  destination: { id: string; path: string } | null;
  usedPaths: Set<string>;
}) {
  const folders = [...input.folders].sort(
    (left, right) => left.path.split('/').length - right.path.split('/').length
  );
  const root = folders.find((folder) => folder.id === input.rootId);
  if (!root) throw new Error('Knowledge transfer root folder not found.');

  const plans = new Map<string, KnowledgeFolderTransferPlan>();
  for (const folder of folders) {
    const parentPlan =
      folder.id === root.id
        ? null
        : folder.parentId
          ? plans.get(folder.parentId) || null
          : null;
    if (folder.id !== root.id && !parentPlan) {
      throw new Error('Knowledge transfer folder tree is inconsistent.');
    }
    const parentPath =
      folder.id === root.id
        ? input.destination?.path || null
        : parentPlan?.path;
    const candidate = joinKnowledgePath(parentPath, folder.name);
    const path = reserveUniqueFolderPath(candidate, input.usedPaths);
    plans.set(folder.id, {
      id: folder.id,
      sourcePath: folder.path,
      name: path.split('/').at(-1) || folder.name,
      path,
      parentId:
        folder.id === root.id
          ? input.destination?.id || null
          : parentPlan?.id || null,
    });
  }
  return folders.map((folder) => plans.get(folder.id)!);
}

function normalizePathSegments(path: string) {
  const segments: string[] = [];
  for (const part of normalizeVaultPath(path).split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      segments.pop();
      continue;
    }
    segments.push(part);
  }
  return segments;
}

function splitReferenceSuffix(reference: string) {
  const queryIndex = reference.indexOf('?');
  const hashIndex = reference.indexOf('#');
  const suffixIndex = [queryIndex, hashIndex]
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];
  if (suffixIndex === undefined) return { path: reference, suffix: '' };
  return {
    path: reference.slice(0, suffixIndex),
    suffix: reference.slice(suffixIndex),
  };
}

export function relativeKnowledgePath(
  sourceFolder: string | null | undefined,
  targetPath: string
) {
  const sourceParts = normalizePathSegments(sourceFolder || '');
  const targetParts = normalizePathSegments(targetPath);
  let shared = 0;
  while (
    shared < sourceParts.length &&
    shared < targetParts.length &&
    sourceParts[shared] === targetParts[shared]
  ) {
    shared += 1;
  }
  const relative = [
    ...sourceParts.slice(shared).map(() => '..'),
    ...targetParts.slice(shared),
  ].join('/');
  return relative || targetParts.at(-1) || '';
}

export function resolveKnowledgeReferencePath(
  sourceFolder: string | null | undefined,
  reference: string
) {
  const raw = reference.trim().replace(/^<|>$/g, '');
  const { path } = splitReferenceSuffix(raw);
  if (!path || /^(?:https?:|data:|mailto:|tel:)/i.test(path)) return null;
  return normalizePathSegments(
    sourceFolder ? `${sourceFolder}/${path}` : path
  ).join('/');
}

export function safeKnowledgeTransferRelativePath(
  reference: string,
  fallbackFileName: string
) {
  const raw = reference.trim().replace(/^<|>$/g, '');
  const { path } = splitReferenceSuffix(raw);
  if (!path || /^(?:https?:|data:|mailto:|tel:)/i.test(path)) {
    return fallbackFileName;
  }
  const safeSegments = normalizeVaultPath(path)
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..');
  return safeSegments.join('/') || fallbackFileName;
}

export function extractAttachmentReferences(content: string) {
  const references = new Set<string>();
  const wikiLink = /!?\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]*)?\]\]/g;
  const markdownLink =
    /!?\[[^\]]*\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+["'][^"']*["'])?\s*\)/g;
  let match: RegExpExecArray | null;

  while ((match = wikiLink.exec(content)) !== null) {
    const value = normalizeVaultPath(match[1].trim());
    if (/\.[a-z0-9]{2,10}$/i.test(value)) references.add(value);
  }
  while ((match = markdownLink.exec(content)) !== null) {
    const encoded = match[1].replace(/^<|>$/g, '');
    const value = normalizeVaultPath(encoded);
    if (value && !/^(?:https?:|data:)/i.test(value)) references.add(value);
  }
  return Array.from(references);
}

export function rewriteResolvedKnowledgeReferences(
  content: string,
  sourceFolder: string | null | undefined,
  targetFolder: string | null | undefined,
  replacements: readonly KnowledgePathReplacement[]
) {
  const replacementByPath = new Map(
    replacements.map((replacement) => [
      normalizePathSegments(replacement.fromPath).join('/'),
      normalizePathSegments(replacement.toPath).join('/'),
    ])
  );
  if (!replacementByPath.size) return content;

  const rewrite = (rawTarget: string) => {
    const wrapped = rawTarget.startsWith('<') && rawTarget.endsWith('>');
    const raw = rawTarget.replace(/^<|>$/g, '');
    const { suffix } = splitReferenceSuffix(raw);
    const resolved = resolveKnowledgeReferencePath(sourceFolder, raw);
    const replacement = resolved ? replacementByPath.get(resolved) : null;
    if (!replacement) return rawTarget;
    const next = `${relativeKnowledgePath(targetFolder, replacement)}${suffix}`;
    return wrapped || next.includes(' ') ? `<${next}>` : next;
  };

  return content
    .replace(
      /(!?\[\[)([^\]|#]+)((?:#[^\]|]+)?(?:\|[^\]]*)?\]\])/g,
      (_match, prefix: string, target: string, suffix: string) =>
        `${prefix}${rewrite(target)}${suffix}`
    )
    .replace(
      /(!?\[[^\]]*\]\(\s*)(<[^>]+>|[^)\s]+)((?:\s+["'][^"']*["'])?\s*\))/g,
      (_match, prefix: string, target: string, suffix: string) =>
        `${prefix}${rewrite(target)}${suffix}`
    );
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
      /(!?\[[^\]]*\]\(\s*)(<[^>]+>|[^)\s]+)((?:\s+["'][^"']*["'])?\s*\))/g,
      (_match, prefix: string, target: string, suffix: string) =>
        `${prefix}${rewrite(target)}${suffix}`
    );
}
