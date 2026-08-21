import { CheckCircle2 } from 'lucide-react';

import { cn } from '@/lib/utils';

import { formatShortDate, type ChecklistHistoryDay } from './types';

type DailyProgressProps = {
  selectedDate: string;
  completed: number;
  total: number;
  percentage: number;
  history: ChecklistHistoryDay[];
  editMode: boolean;
  onDateChange: (date: string) => void;
};

function weekdayLabel(date: string) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
    .format(new Date(`${date}T12:00:00`))
    .replace('.', '');
}

export function DailyProgress({
  selectedDate,
  completed,
  total,
  percentage,
  history,
  editMode,
  onDateChange,
}: DailyProgressProps) {
  return (
    <div className="rounded-md border border-[#2f2f35] bg-[#0d0d0d] p-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">
            {formatShortDate(selectedDate)}: {completed}/{total} concluídos ·{' '}
            {percentage}%
          </p>
          <p className="mt-0.5 text-xs text-[#777780]">
            {editMode
              ? 'Modo de edição: alterações valem para próximos dias.'
              : 'Um clique marca ou desmarca cada atividade.'}
          </p>
        </div>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-[#19191d]"
        role="progressbar"
        aria-label="Progresso do checklist diário"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        <div
          className="h-full rounded-full bg-[#6f55d9] transition-[width] duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div
        className="mt-3 grid grid-cols-7 gap-1.5"
        aria-label="Dias da semana"
      >
        {history.map((day) => {
          const selected = day.date === selectedDate;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onDateChange(day.date)}
              aria-current={selected ? 'date' : undefined}
              title={`${formatShortDate(day.date)} · ${day.completed}/${day.total}`}
              className={cn(
                'min-w-0 rounded-md border border-[#2f2f35] bg-[#151519] px-1 py-2 text-center transition-colors hover:border-[#6f55d9]/60 focus-visible:ring-2 focus-visible:ring-[#6f55d9]/40 focus-visible:outline-none',
                selected && 'border-[#6f55d9] bg-[#6f55d9]/15'
              )}
            >
              <span className="block truncate text-[10px] font-medium text-[#8d8d97] capitalize sm:text-[11px]">
                {weekdayLabel(day.date)}
              </span>
              <span className="mt-0.5 block text-sm font-semibold text-[#e8e8eb]">
                {day.date.slice(8)}
              </span>
              <span className="mt-0.5 flex h-4 items-center justify-center text-[10px] text-[#777780]">
                {day.total === 0 ? (
                  '—'
                ) : day.percentage === 100 ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  `${day.percentage}%`
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
