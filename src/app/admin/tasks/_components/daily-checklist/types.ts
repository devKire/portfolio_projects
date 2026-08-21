import type {
  DailyChecklistItemInput,
  DailyRoutineInput,
} from '@/app/actions/daily-checklist';

export const CHECKLIST_PERIODS = ['Morning', 'Afternoon', 'Night'] as const;

export type ChecklistPeriod = (typeof CHECKLIST_PERIODS)[number];
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export const PERIOD_LABELS: Record<ChecklistPeriod, string> = {
  Morning: 'Morning',
  Afternoon: 'Afternoon',
  Night: 'Night',
};

export const PERIOD_ACTION_LABELS: Record<ChecklistPeriod, string> = {
  Morning: 'Adicionar pela manhã',
  Afternoon: 'Adicionar à tarde',
  Night: 'Adicionar à noite',
};

export const WEEKDAYS = [
  { value: 1, short: 'Seg', label: 'Segunda-feira' },
  { value: 2, short: 'Ter', label: 'Terça-feira' },
  { value: 3, short: 'Qua', label: 'Quarta-feira' },
  { value: 4, short: 'Qui', label: 'Quinta-feira' },
  { value: 5, short: 'Sex', label: 'Sexta-feira' },
  { value: 6, short: 'Sáb', label: 'Sábado' },
  { value: 0, short: 'Dom', label: 'Domingo' },
] as const;

export type RoutineView = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  reminders: string[];
  active: boolean;
  isDefault: boolean;
  weekdays: number[];
  itemCount: number;
  historyCount: number;
};

export type ChecklistItemView = {
  id: string;
  routineId?: string;
  slug: string;
  title: string;
  description: string;
  period: string;
  startTime: string | null;
  endTime: string | null;
  timeRange: string;
  position: number;
  active: boolean;
  isSacred: boolean;
  entryId?: string | null;
  completed?: boolean;
  completedAt?: string | null;
  note?: string;
};

export type ChecklistHistoryDay = {
  date: string;
  completed: number;
  total: number;
  percentage: number;
};

export type ActivityLogView = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
};

export type ChecklistData = {
  date: string;
  selectedRoutineId: string | null;
  selectedRoutineSource:
    | 'history'
    | 'override'
    | 'schedule'
    | 'default'
    | 'none';
  isDateOverride: boolean;
  canChangeRoutine: boolean;
  routines: RoutineView[];
  checklist: ChecklistItemView[];
  items: ChecklistItemView[];
  summary: { completed: number; total: number; percentage: number };
  history: ChecklistHistoryDay[];
  logs: ActivityLogView[];
};

export type RoutineDraft = DailyRoutineInput & { id: string };
export type ItemDraft = DailyChecklistItemInput & { id?: string };

export function todayInput() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${value}T12:00:00`));
}

export function formatRoutineSchedule(weekdays: number[]) {
  if (!weekdays.length) return 'Sob demanda';
  const ordered = WEEKDAYS.filter((day) => weekdays.includes(day.value));
  if (ordered.length === 7) return 'Todos os dias';
  if (
    ordered.length === 5 &&
    ordered.every((day) => day.value >= 1 && day.value <= 5)
  ) {
    return 'Segunda–Sexta';
  }
  return ordered.map((day) => day.short).join(', ');
}

export function normalizePeriod(period: string): ChecklistPeriod {
  return CHECKLIST_PERIODS.includes(period as ChecklistPeriod)
    ? (period as ChecklistPeriod)
    : 'Morning';
}

export function routineDraft(routine: RoutineView): RoutineDraft {
  return {
    id: routine.id,
    name: routine.name,
    description: routine.description || '',
    color: routine.color || '#8b5cf6',
    weekdays: routine.weekdays,
    isDefault: routine.isDefault,
  };
}

export function itemDraft(
  routineId: string,
  period: ChecklistPeriod,
  item?: ChecklistItemView
): ItemDraft {
  return {
    id: item?.id,
    routineId,
    title: item?.title || '',
    description: item?.description || '',
    period: item?.period || period,
    startTime: item?.startTime || '',
    endTime: item?.endTime || '',
    position: item?.position,
    active: item?.active ?? true,
    isSacred: item?.isSacred || false,
  };
}

export function recalculateSummary(checklist: ChecklistItemView[]) {
  const completed = checklist.filter((item) => item.completed).length;
  return {
    completed,
    total: checklist.length,
    percentage: checklist.length
      ? Math.round((completed / checklist.length) * 100)
      : 0,
  };
}
