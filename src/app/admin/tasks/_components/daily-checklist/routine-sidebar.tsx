'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BellRing,
  Loader2,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { ActivityLogView } from './types';

type RoutineSidebarProps = {
  routineId: string | null;
  reminders: string[];
  logs: ActivityLogView[];
  editMode: boolean;
  pending: boolean;
  onSaveReminders: (reminders: string[]) => Promise<boolean>;
};

function formatLogTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function RoutineSidebar({
  routineId,
  reminders,
  logs,
  editMode,
  pending,
  onSaveReminders,
}: RoutineSidebarProps) {
  const [drafts, setDrafts] = useState(reminders);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDrafts(reminders);
    setDirty(false);
  }, [reminders, routineId]);

  function updateReminder(index: number, value: string) {
    setDrafts((current) =>
      current.map((reminder, currentIndex) =>
        currentIndex === index ? value : reminder
      )
    );
    setDirty(true);
  }

  function moveReminder(index: number, direction: 'up' | 'down') {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= drafts.length) return;
    setDrafts((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  }

  function removeReminder(index: number) {
    setDrafts((current) =>
      current.filter((_, currentIndex) => currentIndex !== index)
    );
    setDirty(true);
  }

  async function saveReminders() {
    const cleaned = drafts.map((reminder) => reminder.trim()).filter(Boolean);
    const success = await onSaveReminders(cleaned);
    if (success) setDirty(false);
  }

  return (
    <aside className="min-w-0 space-y-3">
      <section className="rounded-md border border-[#2f2f35] bg-[#0d0d0d] p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-[#c9b8ff]" />
            <h3 className="text-sm font-semibold text-[#f2f2f3]">
              Lembretes essenciais
            </h3>
          </div>
          {editMode && dirty && (
            <Button
              type="button"
              size="sm"
              disabled={pending || !routineId}
              onClick={() => void saveReminders()}
              className="h-7 px-2 text-[11px]"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Salvar
            </Button>
          )}
        </div>

        <div className="mt-3 space-y-2">
          {!editMode && reminders.length === 0 && (
            <p className="rounded-md border border-dashed border-[#2f2f35] px-3 py-6 text-center text-xs text-[#686872]">
              Nenhum lembrete nesta rotina.
            </p>
          )}
          {!editMode &&
            reminders.map((reminder) => (
              <div
                key={reminder}
                className="rounded-md border border-[#2f2f35] bg-[#141414] px-2 py-2 text-xs leading-5 text-[#9b9ba3]"
              >
                {reminder}
              </div>
            ))}

          {editMode &&
            drafts.map((reminder, index) => (
              <div
                key={`${index}-${routineId}`}
                className="flex items-center gap-1 rounded-md border border-[#2f2f35] bg-[#141414] p-1"
              >
                <input
                  value={reminder}
                  maxLength={160}
                  onChange={(event) =>
                    updateReminder(index, event.target.value)
                  }
                  aria-label={`Lembrete ${index + 1}`}
                  className="h-8 min-w-0 flex-1 bg-transparent px-1.5 text-xs text-white outline-none"
                  placeholder="Escreva um lembrete"
                />
                <SidebarAction
                  label="Mover lembrete para cima"
                  disabled={index === 0}
                  onClick={() => moveReminder(index, 'up')}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </SidebarAction>
                <SidebarAction
                  label="Mover lembrete para baixo"
                  disabled={index === drafts.length - 1}
                  onClick={() => moveReminder(index, 'down')}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </SidebarAction>
                <SidebarAction
                  label="Excluir lembrete"
                  onClick={() => removeReminder(index)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-300" />
                </SidebarAction>
              </div>
            ))}

          {editMode && routineId && drafts.length < 20 && (
            <button
              type="button"
              onClick={() => {
                setDrafts((current) => [...current, '']);
                setDirty(true);
              }}
              className="flex min-h-8 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-[#34343a] text-xs text-[#8d8d97] hover:border-[#6f55d9]/60 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Lembrete
            </button>
          )}
        </div>
      </section>

      <section className="rounded-md border border-[#2f2f35] bg-[#0d0d0d] p-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#c9b8ff]" />
          <h3 className="text-sm font-semibold text-[#f2f2f3]">Log do Dia</h3>
        </div>
        <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1 xl:max-h-[420px]">
          {logs.length === 0 ? (
            <p className="rounded-md border border-dashed border-[#2f2f35] px-3 py-6 text-center text-xs text-[#686872]">
              Nenhuma atividade registrada neste dia.
            </p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="rounded-md border border-[#2f2f35] bg-[#141414] px-2 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs leading-4 font-medium text-[#dcddde]">
                    {log.message}
                  </span>
                  <time
                    dateTime={log.createdAt}
                    className="shrink-0 text-[10px] text-[#686872]"
                  >
                    {formatLogTime(log.createdAt)}
                  </time>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </aside>
  );
}

function SidebarAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-7 shrink-0 items-center justify-center rounded text-[#777780] hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
    >
      {children}
    </button>
  );
}
