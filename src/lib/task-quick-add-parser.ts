import type {
  TaskPriority,
  TaskProjectOption,
  TaskStatus,
  TaskWithRelations,
} from '@/types/tasks';
import {
  mergeTaskTags,
  normalizeTaskTag,
  stripSimpleMarkdownToken,
} from '@/lib/task-tags';

export interface ParsedQuickTask {
  title: string;
  dueDate?: Date;
  priority?: TaskPriority;
  tags: string[];
  estimatedHours?: number;
  projectId?: string;
  projectLabel?: string;
  unmatchedProjectLabels: string[];
  invalidDateTokens: string[];
  status?: TaskStatus;
}

const priorityAliases: Record<string, TaskPriority> = {
  baixa: 'low',
  low: 'low',
  media: 'medium',
  média: 'medium',
  medium: 'medium',
  alta: 'high',
  high: 'high',
  urgente: 'urgent',
  urgent: 'urgent',
};

const statusAliases: Record<string, TaskStatus> = {
  pending: 'pending',
  pendente: 'pending',
  todo: 'pending',
  doing: 'in-progress',
  progresso: 'in-progress',
  andamento: 'in-progress',
  'in-progress': 'in-progress',
  done: 'completed',
  completed: 'completed',
  concluido: 'completed',
  concluído: 'completed',
};

const weekdays: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  terça: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
  sábado: 6,
};

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function nextWeekday(target: number) {
  const date = startOfToday();
  const current = date.getDay();
  const daysAhead = (target - current + 7) % 7 || 7;
  date.setDate(date.getDate() + daysAhead);
  return date;
}

function parseDueDate(token: string) {
  const normalized = normalize(token);

  if (normalized === 'hoje') return startOfToday();
  if (normalized === 'amanha') {
    const date = startOfToday();
    date.setDate(date.getDate() + 1);
    return date;
  }

  if (normalized in weekdays) {
    return nextWeekday(weekdays[normalized]);
  }

  const numericDate = token.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{4}))?$/);
  if (numericDate) {
    const day = Number(numericDate[1]);
    const month = Number(numericDate[2]);
    const today = startOfToday();
    let year = numericDate[3] ? Number(numericDate[3]) : today.getFullYear();

    // Datas sem ano usam o ano atual; se ja passaram, caem no proximo ano.
    let date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);

    if (
      !numericDate[3] &&
      date < today &&
      date.getDate() === day &&
      date.getMonth() === month - 1
    ) {
      year += 1;
      date = new Date(year, month - 1, day);
      date.setHours(0, 0, 0, 0);
    }

    if (date.getDate() === day && date.getMonth() === month - 1) {
      return date;
    }
  }

  return undefined;
}

export function parseTaskHoursInput(token: string) {
  const numeric = token.trim().replace(',', '.');
  if (/^\d+(?:\.\d+)?$/.test(numeric)) return Number(numeric);

  const hoursMatch = token.match(/^(\d+(?:[.,]\d+)?)h$/i);
  if (hoursMatch) return Number(hoursMatch[1].replace(',', '.'));

  const minutesMatch = token.match(/^(\d+(?:[.,]\d+)?)min$/i);
  if (minutesMatch) {
    return Number((Number(minutesMatch[1].replace(',', '.')) / 60).toFixed(2));
  }

  return undefined;
}

function looksLikeDateToken(token: string) {
  return /^\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?$/.test(token);
}

function findProject(label: string, projects: TaskProjectOption[] = []) {
  const wanted = normalize(label).replace(/\s+/g, '');
  return projects.find((project) => {
    const title = normalize(project.title).replace(/\s+/g, '');
    return title === wanted || title.includes(wanted);
  });
}

function isSameCalendarDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function formatQuickAddDate(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const today = startOfToday();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (isSameCalendarDay(date, today)) return 'hoje';
  if (isSameCalendarDay(date, tomorrow)) return 'amanhã';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatQuickAddHours(hours: number) {
  return `${Number(hours.toFixed(2))}h`;
}

const priorityQuickAddTokens: Record<TaskPriority, string> = {
  low: '!baixa',
  medium: '!media',
  high: '!alta',
  urgent: '!urgente',
};

export function formatTaskAsQuickAdd(task: TaskWithRelations) {
  const tokens: string[] = [task.title.replace(/\s+/g, ' ').trim()];
  const projectTitle = task.project?.title?.trim();
  if (projectTitle) {
    tokens.push(`@${projectTitle.replace(/\s+/g, '')}`);
  }

  const priority = task.priority as TaskPriority;
  if (priorityQuickAddTokens[priority]) {
    tokens.push(priorityQuickAddTokens[priority]);
  }

  if (task.dueDate) {
    const dueDateToken = formatQuickAddDate(task.dueDate);
    if (dueDateToken) tokens.push(dueDateToken);
  }

  if (
    typeof task.estimatedHours === 'number' &&
    Number.isFinite(task.estimatedHours) &&
    task.estimatedHours > 0
  ) {
    tokens.push(formatQuickAddHours(task.estimatedHours));
  }

  tokens.push(...mergeTaskTags(task.tags || []).map((tag) => `#${tag}`));
  return tokens.filter(Boolean).join(' ');
}

export function parseQuickTaskInput(
  input: string,
  projects: TaskProjectOption[] = []
): ParsedQuickTask {
  const tags: string[] = [];
  const titleTokens: string[] = [];
  const parsed: ParsedQuickTask = {
    title: '',
    tags,
    unmatchedProjectLabels: [],
    invalidDateTokens: [],
  };

  for (const rawToken of input.trim().split(/\s+/)) {
    const token = stripSimpleMarkdownToken(rawToken);
    if (!token) continue;
    if (token === '#' || token === '@') continue;

    if (token.startsWith('#') && token.length > 1) {
      const nextTags = mergeTaskTags([...tags, normalizeTaskTag(token)]);
      tags.splice(0, tags.length, ...nextTags);
      continue;
    }

    if (token.startsWith('!') && token.length > 1) {
      const command = normalize(token.slice(1));
      if (priorityAliases[command]) {
        parsed.priority = priorityAliases[command];
        continue;
      }
      if (statusAliases[command]) {
        parsed.status = statusAliases[command];
        continue;
      }
    }

    if (token.startsWith('@') && token.length > 1) {
      const projectLabel = token.slice(1);
      const project = findProject(projectLabel, projects);
      if (project) {
        parsed.projectId = project.id;
        parsed.projectLabel = project.title;
        continue;
      }
      parsed.unmatchedProjectLabels.push(projectLabel);
    }

    const hours = parseTaskHoursInput(token);
    if (hours !== undefined && Number.isFinite(hours)) {
      parsed.estimatedHours = hours;
      continue;
    }

    const dueDate = parseDueDate(token);
    if (dueDate) {
      parsed.dueDate = dueDate;
      continue;
    }

    if (looksLikeDateToken(token)) {
      parsed.invalidDateTokens.push(token);
      continue;
    }

    titleTokens.push(stripSimpleMarkdownToken(rawToken));
  }

  parsed.title = titleTokens.join(' ').trim();
  return parsed;
}
