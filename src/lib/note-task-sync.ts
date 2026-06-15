import { slugifyNote } from '@/lib/notes';

export type MarkdownTaskItem = {
  key: string;
  title: string;
  completed: boolean;
  line: string;
  index: number;
};

export function extractMarkdownTasks(content: string): MarkdownTaskItem[] {
  const counts = new Map<string, number>();
  const tasks: MarkdownTaskItem[] = [];
  const regex = /^(\s*)-\s+\[([ xX])\]\s+(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const rawTitle = match[3].trim();
    const title = rawTitle.replace(/\s+#([\p{L}\p{N}_-]+)/gu, '').trim();
    const base = slugifyNote(title) || 'task';
    const count = (counts.get(base) || 0) + 1;
    counts.set(base, count);

    tasks.push({
      key: `${base}-${count}`,
      title,
      completed: match[2].toLowerCase() === 'x',
      line: match[0],
      index: match.index,
    });
  }

  return tasks;
}

export function updateMarkdownTaskStatus(
  content: string,
  taskKey: string,
  completed: boolean
) {
  const tasks = extractMarkdownTasks(content);
  const target = tasks.find((task) => task.key === taskKey);
  if (!target) return content;

  const nextMarker = completed ? '[x]' : '[ ]';
  const updatedLine = target.line.replace(/\[[ xX]\]/, nextMarker);

  return `${content.slice(0, target.index)}${updatedLine}${content.slice(
    target.index + target.line.length
  )}`;
}
