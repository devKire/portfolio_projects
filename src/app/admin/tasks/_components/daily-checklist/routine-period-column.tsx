'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import {
  Archive,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Circle,
  Clock3,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import {
  CHECKLIST_PERIODS,
  PERIOD_ACTION_LABELS,
  PERIOD_LABELS,
  type ChecklistItemView,
  type ChecklistPeriod,
  type ItemDraft,
} from './types';

type RoutinePeriodColumnProps = {
  period: ChecklistPeriod;
  items: ChecklistItemView[];
  editMode: boolean;
  itemEditor: ItemDraft | null;
  savingItemIds: Set<string>;
  pending: boolean;
  onToggle: (item: ChecklistItemView) => void;
  onStartCreate: (period: ChecklistPeriod) => void;
  onStartEdit: (item: ChecklistItemView) => void;
  onEditorChange: (draft: ItemDraft) => void;
  onSaveEditor: () => void;
  onCancelEditor: () => void;
  onMove: (item: ChecklistItemView, direction: 'up' | 'down') => void;
  onArchiveToggle: (item: ChecklistItemView) => void;
  onDelete: (item: ChecklistItemView) => void;
};

export function RoutinePeriodColumn({
  period,
  items,
  editMode,
  itemEditor,
  savingItemIds,
  pending,
  onToggle,
  onStartCreate,
  onStartEdit,
  onEditorChange,
  onSaveEditor,
  onCancelEditor,
  onMove,
  onArchiveToggle,
  onDelete,
}: RoutinePeriodColumnProps) {
  const creatingHere =
    itemEditor && !itemEditor.id && itemEditor.period === period;

  return (
    <section
      className="min-w-0 rounded-md border border-[#2f2f35] bg-[#0d0d0d] p-3"
      aria-labelledby={`period-${period}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3
          id={`period-${period}`}
          className="text-sm font-semibold text-[#f2f2f3]"
        >
          {PERIOD_LABELS[period]}
        </h3>
        <span className="text-[11px] text-[#686872]">{items.length} itens</span>
      </div>

      <div className="space-y-2">
        {creatingHere && (
          <InlineItemEditor
            draft={itemEditor}
            pending={pending}
            onChange={onEditorChange}
            onSave={onSaveEditor}
            onCancel={onCancelEditor}
          />
        )}

        {items.length === 0 && !creatingHere && (
          <p className="rounded-md border border-dashed border-[#2f2f35] px-3 py-6 text-center text-xs text-[#686872]">
            Nenhum item neste período.
          </p>
        )}

        {items.map((item, index) =>
          itemEditor?.id === item.id ? (
            <InlineItemEditor
              key={item.id}
              draft={itemEditor}
              pending={pending}
              onChange={onEditorChange}
              onSave={onSaveEditor}
              onCancel={onCancelEditor}
            />
          ) : (
            <RoutineItemRow
              key={item.id}
              item={item}
              editMode={editMode}
              saving={savingItemIds.has(item.id)}
              first={index === 0}
              last={index === items.length - 1}
              onToggle={() => onToggle(item)}
              onEdit={() => onStartEdit(item)}
              onMoveUp={() => onMove(item, 'up')}
              onMoveDown={() => onMove(item, 'down')}
              onArchiveToggle={() => onArchiveToggle(item)}
              onDelete={() => onDelete(item)}
            />
          )
        )}
      </div>

      {editMode && !creatingHere && (
        <button
          type="button"
          onClick={() => onStartCreate(period)}
          className="mt-2 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-[#34343a] text-xs text-[#8d8d97] transition-colors hover:border-[#6f55d9]/60 hover:text-white focus-visible:ring-2 focus-visible:ring-[#6f55d9]/40 focus-visible:outline-none"
        >
          <Plus className="h-3.5 w-3.5" /> {PERIOD_ACTION_LABELS[period]}
        </button>
      )}
    </section>
  );
}

function RoutineItemRow({
  item,
  editMode,
  saving,
  first,
  last,
  onToggle,
  onEdit,
  onMoveUp,
  onMoveDown,
  onArchiveToggle,
  onDelete,
}: {
  item: ChecklistItemView;
  editMode: boolean;
  saving: boolean;
  first: boolean;
  last: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
}) {
  const content = (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5 shrink-0 text-[#777780]">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : editMode ? (
          <GripVertical className="h-4 w-4" />
        ) : item.completed ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              'min-w-0 text-sm font-medium text-white',
              item.completed &&
                'text-emerald-200 line-through decoration-emerald-400/40',
              !item.active && 'text-[#777780] line-through'
            )}
          >
            {item.title}
          </span>
          {item.isSacred && (
            <span className="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300">
              <Sparkles className="h-3 w-3" /> prioritário
            </span>
          )}
          {(item.timeRange || item.startTime || item.endTime) && (
            <span className="inline-flex items-center gap-1 text-[11px] text-[#777780]">
              <Clock3 className="h-3 w-3" />
              {item.timeRange ||
                [item.startTime, item.endTime].filter(Boolean).join(' – ')}
            </span>
          )}
        </span>
        {item.description && (
          <span className="mt-1 block text-xs leading-4 text-[#777780]">
            {item.description}
          </span>
        )}
      </span>
    </div>
  );

  if (!editMode) {
    return (
      <button
        type="button"
        disabled={saving}
        onClick={onToggle}
        className={cn(
          'w-full rounded-md border border-[#2f2f35] bg-[#141414] p-2 text-left transition-colors hover:border-[#4a405f] focus-visible:ring-2 focus-visible:ring-[#6f55d9]/40 focus-visible:outline-none disabled:cursor-wait',
          item.completed && 'border-emerald-500/25 bg-emerald-500/[0.07]',
          item.isSacred && !item.completed && 'border-amber-500/20'
        )}
        aria-label={`${item.completed ? 'Desmarcar' : 'Concluir'} ${item.title}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'group rounded-md border border-[#2f2f35] bg-[#141414] p-2',
        !item.active && 'opacity-60',
        item.isSacred && 'border-amber-500/20'
      )}
    >
      {content}
      <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-[#29292e] pt-1.5">
        <CompactAction label="Editar item" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Editar
        </CompactAction>
        <CompactAction
          label="Mover para cima"
          disabled={first}
          onClick={onMoveUp}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </CompactAction>
        <CompactAction
          label="Mover para baixo"
          disabled={last}
          onClick={onMoveDown}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </CompactAction>
        <CompactAction
          label={item.active ? 'Arquivar item' : 'Reativar item'}
          onClick={onArchiveToggle}
        >
          <Archive className="h-3.5 w-3.5" />{' '}
          {item.active ? 'Arquivar' : 'Reativar'}
        </CompactAction>
        <CompactAction label="Excluir item" danger onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </CompactAction>
      </div>
    </div>
  );
}

function CompactAction({
  label,
  danger,
  disabled,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
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
      className={cn(
        'flex min-h-7 items-center gap-1 rounded px-1.5 text-[11px] text-[#8d8d97] hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-30',
        danger && 'text-red-300/80 hover:bg-red-500/10 hover:text-red-200'
      )}
    >
      {children}
    </button>
  );
}

function InlineItemEditor({
  draft,
  pending,
  onChange,
  onSave,
  onCancel,
}: {
  draft: ItemDraft;
  pending: boolean;
  onChange: (draft: ItemDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  function handleKeyDown(
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onSave();
    }
  }

  return (
    <div className="rounded-md border border-[#6f55d9]/35 bg-[#6f55d9]/5 p-2.5">
      <div className="grid gap-2">
        <input
          autoFocus
          value={draft.title}
          maxLength={120}
          onChange={(event) =>
            onChange({ ...draft, title: event.target.value })
          }
          onKeyDown={handleKeyDown}
          placeholder="Nome da atividade"
          aria-label="Nome da atividade"
          className="h-8 rounded-md border border-[#303036] bg-[#101010] px-2 text-sm text-white outline-none focus:border-[#6f55d9]/70"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={draft.startTime || ''}
            onChange={(event) =>
              onChange({ ...draft, startTime: event.target.value })
            }
            onKeyDown={handleKeyDown}
            placeholder="Início: 05:30"
            aria-label="Horário inicial"
            className="h-8 min-w-0 rounded-md border border-[#303036] bg-[#101010] px-2 text-xs text-white outline-none focus:border-[#6f55d9]/70"
          />
          <input
            value={draft.endTime || ''}
            onChange={(event) =>
              onChange({ ...draft, endTime: event.target.value })
            }
            onKeyDown={handleKeyDown}
            placeholder="Fim: 06:30"
            aria-label="Horário final"
            className="h-8 min-w-0 rounded-md border border-[#303036] bg-[#101010] px-2 text-xs text-white outline-none focus:border-[#6f55d9]/70"
          />
        </div>
        <select
          value={draft.period}
          onChange={(event) =>
            onChange({ ...draft, period: event.target.value })
          }
          aria-label="Período"
          className="h-8 rounded-md border border-[#303036] bg-[#101010] px-2 text-xs text-white outline-none focus:border-[#6f55d9]/70"
        >
          {CHECKLIST_PERIODS.map((option) => (
            <option key={option} value={option}>
              {PERIOD_LABELS[option]}
            </option>
          ))}
        </select>
        <textarea
          value={draft.description || ''}
          maxLength={500}
          rows={2}
          onChange={(event) =>
            onChange({ ...draft, description: event.target.value })
          }
          onKeyDown={handleKeyDown}
          placeholder="Descrição curta"
          aria-label="Descrição"
          className="resize-none rounded-md border border-[#303036] bg-[#101010] px-2 py-1.5 text-xs text-white outline-none focus:border-[#6f55d9]/70"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="inline-flex min-h-8 items-center gap-2 text-xs text-[#9b9ba3]">
            <input
              type="checkbox"
              checked={Boolean(draft.isSacred)}
              onChange={(event) =>
                onChange({ ...draft, isSacred: event.target.checked })
              }
              className="h-4 w-4 accent-violet-500"
            />
            Prioritário
          </label>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={onCancel}
              className="h-8 px-2 text-xs text-[#9b9ba3]"
            >
              <X className="h-3.5 w-3.5" /> Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || !draft.title.trim()}
              onClick={onSave}
              className="h-8 px-2 text-xs"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
