'use client';

import {
  CalendarDays,
  Check,
  ChevronDown,
  Loader2,
  Plus,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  formatRoutineSchedule,
  type RoutineView,
  type SaveState,
} from './types';

type ChecklistHeaderProps = {
  selectedDate: string;
  selectedRoutine: RoutineView | null;
  routines: RoutineView[];
  source: 'history' | 'override' | 'schedule' | 'default' | 'none';
  canChangeRoutine: boolean;
  loading: boolean;
  saveState: SaveState;
  editMode: boolean;
  onDateChange: (date: string) => void;
  onToday: () => void;
  onRoutineChange: (routineId: string) => void;
  onToggleEdit: () => void;
  onNewRoutine: () => void;
  onManageRoutines: () => void;
};

const SOURCE_LABELS = {
  history: 'Snapshot histórico',
  override: 'Escolha desta data',
  schedule: 'Programação semanal',
  default: 'Rotina padrão',
  none: 'Sem rotina',
} as const;

export function ChecklistHeader({
  selectedDate,
  selectedRoutine,
  routines,
  source,
  canChangeRoutine,
  loading,
  saveState,
  editMode,
  onDateChange,
  onToday,
  onRoutineChange,
  onToggleEdit,
  onNewRoutine,
  onManageRoutines,
}: ChecklistHeaderProps) {
  const [routineMenuOpen, setRoutineMenuOpen] = useState(false);
  const availableRoutines = routines.filter(
    (routine) => routine.active || routine.id === selectedRoutine?.id
  );

  return (
    <header className="border-b border-[#2f2f35] pb-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#c9b8ff]" />
            <h2
              id="daily-checklist-title"
              className="text-base font-semibold text-white"
            >
              Checklist Diário
            </h2>
            {loading || saveState === 'saving' ? (
              <Loader2
                className="h-3.5 w-3.5 animate-spin text-[#777780]"
                aria-label="Salvando"
              />
            ) : saveState === 'saved' ? (
              <span className="text-xs text-emerald-300">salvo</span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-[#777780]">
            Rotina diária rápida, separada das tarefas do workspace.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
          <div className="relative min-w-0 sm:min-w-60">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={routineMenuOpen}
              disabled={!availableRoutines.length || !canChangeRoutine}
              onClick={() => setRoutineMenuOpen((current) => !current)}
              className="flex h-9 w-full items-center gap-2 rounded-md border border-[#303036] bg-[#0d0d0d] px-3 text-left text-sm text-[#dcddde] transition-colors outline-none hover:border-[#6f55d9]/60 focus-visible:ring-2 focus-visible:ring-[#6f55d9]/40 disabled:cursor-not-allowed disabled:opacity-60"
              title={
                canChangeRoutine
                  ? 'Trocar rotina somente para esta data'
                  : 'Desmarque os itens concluídos para trocar a rotina'
              }
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: selectedRoutine?.color || '#6f55d9' }}
              />
              <span className="min-w-0 flex-1 truncate">
                {selectedRoutine?.name || 'Selecionar rotina'}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#777780]" />
            </button>

            {routineMenuOpen && canChangeRoutine && (
              <div
                role="menu"
                className="absolute top-11 left-0 z-40 w-full min-w-72 overflow-hidden rounded-lg border border-[#34343a] bg-[#151519] p-1.5 shadow-2xl shadow-black/50"
              >
                <p className="px-2 py-1.5 text-[11px] font-medium tracking-wide text-[#777780] uppercase">
                  Aplicar somente a esta data
                </p>
                {availableRoutines.map((routine) => (
                  <button
                    key={routine.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setRoutineMenuOpen(false);
                      onRoutineChange(routine.id);
                    }}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none',
                      routine.id === selectedRoutine?.id && 'bg-violet-500/10'
                    )}
                  >
                    <span className="mt-0.5 w-4 shrink-0 text-violet-300">
                      {routine.id === selectedRoutine?.id && (
                        <Check className="h-4 w-4" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-white">
                        {routine.isDefault ? '★ ' : ''}
                        {routine.name}
                      </span>
                      <span className="block text-[11px] text-[#777780]">
                        {formatRoutineSchedule(routine.weekdays)}
                      </span>
                    </span>
                  </button>
                ))}
                <div className="mt-1 border-t border-[#2f2f35] pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRoutineMenuOpen(false);
                      onNewRoutine();
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-[#c9b8ff] hover:bg-white/[0.06]"
                  >
                    <Plus className="h-4 w-4" /> Nova rotina
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRoutineMenuOpen(false);
                      onManageRoutines();
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-[#b7b7c0] hover:bg-white/[0.06]"
                  >
                    <SlidersHorizontal className="h-4 w-4" /> Gerenciar rotinas
                  </button>
                </div>
              </div>
            )}
            <p className="mt-1 px-1 text-[11px] text-[#686872]">
              {SOURCE_LABELS[source]}
            </p>
          </div>

          <Button
            type="button"
            variant={editMode ? 'default' : 'secondary'}
            size="sm"
            disabled={!selectedRoutine}
            onClick={onToggleEdit}
            className={cn(
              'h-9 text-xs',
              !editMode && 'border border-[#303036] bg-[#1a1a1a] text-[#dcddde]'
            )}
          >
            <Settings2 className="h-3.5 w-3.5" />
            {editMode ? 'Concluir edição' : 'Editar rotina'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onNewRoutine}
            className="h-9 border border-[#303036] bg-[#1a1a1a] text-xs text-[#dcddde]"
          >
            <Plus className="h-3.5 w-3.5" /> Rotina
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onManageRoutines}
            className="h-9 w-9 border border-[#303036] text-[#9b9ba3]"
            aria-label="Gerenciar rotinas"
            title="Gerenciar rotinas"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <label className="inline-flex h-9 min-w-0 items-center gap-2 rounded-md border border-[#303036] bg-[#0d0d0d] px-3 text-sm text-[#dcddde]">
            <span className="sr-only">Selecionar dia</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => onDateChange(event.target.value)}
              className="min-w-0 bg-transparent text-sm outline-none"
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onToday}
            className="h-9 border border-[#303036] bg-[#1a1a1a] text-xs text-[#dcddde]"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Hoje
          </Button>
        </div>
      </div>
    </header>
  );
}
