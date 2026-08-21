import { Check, RefreshCw, Star, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { WEEKDAYS, type RoutineDraft } from './types';

type RoutineSettingsProps = {
  draft: RoutineDraft;
  pending: boolean;
  canReapply: boolean;
  onChange: (draft: RoutineDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  onSetDefault: () => void;
  onReapply: () => void;
};

export function RoutineSettings({
  draft,
  pending,
  canReapply,
  onChange,
  onSave,
  onCancel,
  onSetDefault,
  onReapply,
}: RoutineSettingsProps) {
  return (
    <div className="rounded-md border border-[#6f55d9]/30 bg-[#6f55d9]/5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Editar rotina</h3>
          <p className="text-xs text-[#777780]">
            Nome, programação e itens sem sair do checklist.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="h-8 w-8 text-[#9b9ba3]"
          aria-label="Sair do modo de edição"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(180px,0.8fr)_minmax(240px,1.2fr)_auto]">
        <label className="grid gap-1 text-[11px] text-[#9b9ba3]">
          Nome
          <input
            value={draft.name}
            maxLength={80}
            onChange={(event) =>
              onChange({ ...draft, name: event.target.value })
            }
            className="h-9 rounded-md border border-[#303036] bg-[#101010] px-2.5 text-sm text-white outline-none focus:border-[#6f55d9]/70"
          />
        </label>
        <label className="grid gap-1 text-[11px] text-[#9b9ba3]">
          Descrição
          <input
            value={draft.description || ''}
            maxLength={500}
            onChange={(event) =>
              onChange({ ...draft, description: event.target.value })
            }
            className="h-9 rounded-md border border-[#303036] bg-[#101010] px-2.5 text-sm text-white outline-none focus:border-[#6f55d9]/70"
            placeholder="Descrição opcional"
          />
        </label>
        <label className="grid gap-1 text-[11px] text-[#9b9ba3]">
          Cor
          <input
            type="color"
            value={draft.color || '#8b5cf6'}
            onChange={(event) =>
              onChange({ ...draft, color: event.target.value })
            }
            className="h-9 w-14 rounded-md border border-[#303036] bg-[#101010] p-1"
          />
        </label>
      </div>

      <fieldset className="mt-3">
        <legend className="text-[11px] text-[#9b9ba3]">
          Usar esta rotina em
        </legend>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {WEEKDAYS.map((day) => {
            const selected = draft.weekdays?.includes(day.value) || false;
            return (
              <label
                key={day.value}
                title={day.label}
                className={cn(
                  'flex h-8 min-w-10 cursor-pointer items-center justify-center rounded-md border px-2 text-xs transition-colors',
                  selected
                    ? 'border-[#6f55d9] bg-[#6f55d9]/20 text-white'
                    : 'border-[#303036] bg-[#101010] text-[#8d8d97] hover:text-white'
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={selected}
                  onChange={() =>
                    onChange({
                      ...draft,
                      weekdays: selected
                        ? draft.weekdays?.filter(
                            (weekday) => weekday !== day.value
                          )
                        : [...(draft.weekdays || []), day.value],
                    })
                  }
                />
                {day.short.slice(0, 1)}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#2f2f35] pt-3">
        <div className="flex flex-wrap gap-1.5">
          {!draft.isDefault && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={onSetDefault}
              className="h-8 text-xs text-[#b7b7c0]"
            >
              <Star className="h-3.5 w-3.5" /> Tornar padrão
            </Button>
          )}
          {canReapply && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={onReapply}
              className="h-8 text-xs text-[#b7b7c0]"
              title="Atualiza o snapshot deste dia enquanto nada foi concluído"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Atualizar este dia
            </Button>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          disabled={pending || draft.name.trim().length < 2}
          onClick={onSave}
          className="h-8 text-xs"
        >
          <Check className="h-3.5 w-3.5" /> Salvar rotina
        </Button>
      </div>
    </div>
  );
}
