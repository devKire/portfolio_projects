'use client';

import { useEffect, useState, type ReactNode } from 'react';
import {
  Archive,
  Check,
  Copy,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Star,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

import { formatRoutineSchedule, type RoutineView } from './types';

type RoutineManagerProps = {
  open: boolean;
  createMode: boolean;
  routines: RoutineView[];
  selectedRoutineId: string | null;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateModeChange: (createMode: boolean) => void;
  onCreate: (name: string, baseRoutineId: string | null) => Promise<boolean>;
  onSelect: (routineId: string) => void;
  onEdit: (routine: RoutineView) => void;
  onDuplicate: (routineId: string) => void;
  onSetDefault: (routineId: string) => void;
  onArchiveToggle: (routine: RoutineView) => void;
  onDelete: (routine: RoutineView) => void;
};

export function RoutineManager({
  open,
  createMode,
  routines,
  selectedRoutineId,
  pending,
  onOpenChange,
  onCreateModeChange,
  onCreate,
  onSelect,
  onEdit,
  onDuplicate,
  onSetDefault,
  onArchiveToggle,
  onDelete,
}: RoutineManagerProps) {
  const [name, setName] = useState('');
  const [baseRoutineId, setBaseRoutineId] = useState<string>('');

  useEffect(() => {
    if (!createMode) {
      setName('');
      setBaseRoutineId('');
    }
  }, [createMode]);

  async function create() {
    const success = await onCreate(name, baseRoutineId || null);
    if (success) {
      setName('');
      setBaseRoutineId('');
      onCreateModeChange(false);
      onOpenChange(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[calc(100%-1rem)] gap-0 border-[#303036] bg-[#121214] p-0 text-white sm:max-w-md"
      >
        <SheetHeader className="border-b border-[#2f2f35] px-4 py-4 pr-12">
          <SheetTitle className="text-white">Minhas rotinas</SheetTitle>
          <SheetDescription className="text-[#8d8d97]">
            Gerencie programação, cópias e arquivamento sem sair do checklist.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
          {createMode ? (
            <section className="rounded-lg border border-[#6f55d9]/30 bg-[#6f55d9]/5 p-3">
              <h3 className="text-sm font-semibold text-white">Nova rotina</h3>
              <label className="mt-3 grid gap-1 text-xs text-[#9b9ba3]">
                Nome
                <input
                  autoFocus
                  value={name}
                  maxLength={80}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && name.trim().length >= 2) {
                      event.preventDefault();
                      void create();
                    }
                    if (event.key === 'Escape') onCreateModeChange(false);
                  }}
                  className="h-9 rounded-md border border-[#303036] bg-[#101010] px-2.5 text-sm text-white outline-none focus:border-[#6f55d9]/70"
                  placeholder="Ex.: Semana normal"
                />
              </label>
              <fieldset className="mt-3">
                <legend className="text-xs text-[#9b9ba3]">Basear em</legend>
                <label className="mt-2 flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-[#303036] bg-[#101010] px-2.5 text-sm text-[#dcddde]">
                  <input
                    type="radio"
                    name="routine-base"
                    value=""
                    checked={!baseRoutineId}
                    onChange={() => setBaseRoutineId('')}
                    className="accent-violet-500"
                  />
                  Rotina vazia
                </label>
                {routines
                  .filter((routine) => routine.active)
                  .map((routine) => (
                    <label
                      key={routine.id}
                      className="mt-1.5 flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-[#303036] bg-[#101010] px-2.5 text-sm text-[#dcddde]"
                    >
                      <input
                        type="radio"
                        name="routine-base"
                        value={routine.id}
                        checked={baseRoutineId === routine.id}
                        onChange={() => setBaseRoutineId(routine.id)}
                        className="accent-violet-500"
                      />
                      <span className="min-w-0 truncate">
                        Duplicar {routine.name}
                      </span>
                    </label>
                  ))}
              </fieldset>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => onCreateModeChange(false)}
                  className="text-[#9b9ba3]"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending || name.trim().length < 2}
                  onClick={() => void create()}
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Criar
                </Button>
              </div>
            </section>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onCreateModeChange(true)}
              className="mb-3 border border-[#303036] bg-[#1a1a1a] text-[#dcddde]"
            >
              <Plus className="h-4 w-4" /> Nova rotina
            </Button>
          )}

          <div className="space-y-2">
            {routines.map((routine) => (
              <article
                key={routine.id}
                className={cn(
                  'rounded-lg border border-[#2f2f35] bg-[#17171b] p-3',
                  routine.id === selectedRoutineId && 'border-[#6f55d9]/60'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    disabled={!routine.active}
                    onClick={() => {
                      onSelect(routine.id);
                      onOpenChange(false);
                    }}
                    className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: routine.color || '#6f55d9' }}
                      />
                      <span className="truncate text-sm font-semibold text-white">
                        {routine.name}
                      </span>
                      {routine.isDefault && (
                        <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                      )}
                      {routine.id === selectedRoutineId && (
                        <Check className="h-3.5 w-3.5 text-violet-300" />
                      )}
                    </span>
                    <span className="mt-1 block text-xs text-[#777780]">
                      {formatRoutineSchedule(routine.weekdays)} ·{' '}
                      {routine.itemCount} itens
                    </span>
                  </button>
                  {!routine.active && (
                    <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-[#8d8d97]">
                      Arquivada
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-1 border-t border-[#29292e] pt-2">
                  <ManagerAction
                    label="Editar"
                    onClick={() => {
                      onEdit(routine);
                      onOpenChange(false);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </ManagerAction>
                  <ManagerAction
                    label="Duplicar"
                    onClick={() => onDuplicate(routine.id)}
                  >
                    <Copy className="h-3.5 w-3.5" /> Duplicar
                  </ManagerAction>
                  {!routine.isDefault && routine.active && (
                    <ManagerAction
                      label="Definir como padrão"
                      onClick={() => onSetDefault(routine.id)}
                    >
                      <Star className="h-3.5 w-3.5" /> Padrão
                    </ManagerAction>
                  )}
                  <ManagerAction
                    label={routine.active ? 'Arquivar' : 'Reativar'}
                    onClick={() => onArchiveToggle(routine)}
                  >
                    {routine.active ? (
                      <Archive className="h-3.5 w-3.5" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    {routine.active ? 'Arquivar' : 'Reativar'}
                  </ManagerAction>
                  <ManagerAction
                    danger
                    label="Excluir"
                    onClick={() => onDelete(routine)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </ManagerAction>
                </div>
              </article>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ManagerAction({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'flex min-h-7 items-center gap-1 rounded px-1.5 text-[11px] text-[#8d8d97] hover:bg-white/[0.05] hover:text-white',
        danger && 'text-red-300/80 hover:bg-red-500/10 hover:text-red-200'
      )}
    >
      {children}
    </button>
  );
}
