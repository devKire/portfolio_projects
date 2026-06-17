export function stripSimpleMarkdownToken(value: string) {
  let token = value.trim();

  const wrappers: Array<[string, string]> = [
    ['**', '**'],
    ['`', '`'],
  ];

  for (const [start, end] of wrappers) {
    if (
      token.length > start.length + end.length &&
      token.startsWith(start) &&
      token.endsWith(end)
    ) {
      token = token.slice(start.length, -end.length).trim();
      break;
    }
  }

  return token;
}

export function normalizeTaskTag(tag: string) {
  return stripSimpleMarkdownToken(tag)
    .trim()
    .replace(/^#+/, '')
    .replace(/^["'`]+|["'`,.;:!?]+$/g, '')
    .replace(/\\/g, '/')
    .replace(/[^\p{L}\p{N}_\-/]/gu, '')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+|\/+$/g, '');
}

export function taskTagKey(tag: string) {
  return normalizeTaskTag(tag)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function mergeTaskTags(tags: string[] = []) {
  const seen = new Set<string>();
  const nextTags: string[] = [];

  for (const tag of tags) {
    const normalized = normalizeTaskTag(tag);
    const key = taskTagKey(normalized);
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    nextTags.push(normalized);
  }

  return nextTags;
}

export function parseTaskTagsInput(value: string) {
  return mergeTaskTags(value.split(/[,\s]+/));
}

export function haveSameTaskTags(first: string[] = [], second: string[] = []) {
  const firstKeys = mergeTaskTags(first).map(taskTagKey);
  const secondKeys = mergeTaskTags(second).map(taskTagKey);

  if (firstKeys.length !== secondKeys.length) return false;
  return firstKeys.every((key, index) => key === secondKeys[index]);
}
