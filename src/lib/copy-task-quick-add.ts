import { formatTaskAsQuickAdd } from '@/lib/task-quick-add-parser';
import type { TaskWithRelations } from '@/types/tasks';

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!copied) throw new Error('clipboard-unavailable');
}

export async function copyTaskAsQuickAdd(task: TaskWithRelations) {
  await copyText(formatTaskAsQuickAdd(task));
}
