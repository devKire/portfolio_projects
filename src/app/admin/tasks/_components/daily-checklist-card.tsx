'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Archive,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import {
  createDailyChecklistItem,
  getDailyChecklist,
  moveDailyChecklistItem,
  setDailyChecklistItemActive,
  toggleDailyChecklistItem,
  updateDailyChecklistItem,
  type DailyChecklistItemInput,
} from '@/app/actions/daily-checklist';
import { DAILY_CHECKLIST_REMINDERS } from '@/lib/daily-checklist-items';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ChecklistPeriod = 'Morning' | 'Afternoon' | 'Night';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface ChecklistItemView {
  id: string;
  slug: string;
  title: string;
  description: string;
  period: ChecklistPeriod | string;
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
}

interface ChecklistHistoryDay {
  date: string;
  completed: number;
  total: number;
  percentage: number;
}

interface ActivityLogView {
  id: string;
  taskId: string | null;
  dailyChecklistItemId: string | null;
  type: string;
  message: string;
  createdAt: string;
  task?: { id: string; title: string } | null;
  dailyChecklistItem?: { id: string; title: string } | null;
}

interface DailyChecklistData {
  date: string;
  checklist: ChecklistItemView[];
  items: ChecklistItemView[];
  summary: {
    completed: number;
    total: number;
    percentage: number;
  };
  history: ChecklistHistoryDay[];
  logs: ActivityLogView[];
}

const periods: ChecklistPeriod[] = ['Morning', 'Afternoon', 'Night'];

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatShortDate(dateInput: string) {
  return new Date(`${dateInput}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

function formatLogTime(value: string) {
  return new Date(value).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildTimeRange(startTime?: string | null, endTime?: string | null) {
  if (startTime && endTime) return `${startTime} - ${endTime}`;
  return startTime || endTime || '';
}

function recalculateSummary(checklist: ChecklistItemView[]) {
  const completed = checklist.filter((item) => item.completed).length;
  const total = checklist.length;
  return {
    completed,
    total,
    percentage: total ? Math.round((completed / total) * 100) : 0,
  };
}

function emptyDraft(period: ChecklistPeriod): DailyChecklistItemInput {
  return {
    title: '',
    description: '',
    period,
    startTime: '',
    endTime: '',
    isSacred: false,
    active: true,
  };
}

function draftFromItem(item: ChecklistItemView): DailyChecklistItemInput {
  return {
    title: item.title,
    description: item.description,
    period: item.period,
    startTime: item.startTime || '',
    endTime: item.endTime || '',
    position: item.position,
    isSacred: item.isSacred,
    active: item.active,
  };
}

export function DailyChecklistCard() {
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue);
  const [data, setData] = useState<DailyChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DailyChecklistItemInput | null>(null);
  const [creatingPeriod, setCreatingPeriod] = useState<ChecklistPeriod | null>(
    null
  );
  const [createDraft, setCreateDraft] = useState<DailyChecklistItemInput>(
    emptyDraft('Morning')
  );
  const titleInputRef = useRef<HTMLInputElement>(null);

  const fetchChecklist = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);

    const result = await getDailyChecklist(date);
    if (result.success && result.data) {
      setData(result.data as DailyChecklistData);
    } else {
      setError(result.error || 'Erro ao carregar checklist diario');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchChecklist(selectedDate);
  }, [fetchChecklist, selectedDate]);

  useEffect(() => {
    if (editingItemId) titleInputRef.current?.focus();
  }, [editingItemId]);

  useEffect(() => {
    if (saveState !== 'saved') return;
    const timer = window.setTimeout(() => setSaveState('idle'), 1200);
    return () => window.clearTimeout(timer);
  }, [saveState]);

  const displayItems = editMode ? data?.items || [] : data?.checklist || [];

  const groupedItems = useMemo(() => {
    const groups = new Map<ChecklistPeriod, ChecklistItemView[]>();
    for (const period of periods) groups.set(period, []);

    for (const item of displayItems) {
      const period = periods.includes(item.period as ChecklistPeriod)
        ? (item.period as ChecklistPeriod)
        : 'Morning';
      groups.get(period)?.push(item);
    }

    for (const period of periods) {
      groups
        .get(period)
        ?.sort((first, second) => first.position - second.position);
    }

    return groups;
  }, [displayItems]);

  const startEditing = (item: ChecklistItemView) => {
    setEditMode(true);
    setEditingItemId(item.id);
    setDraft(draftFromItem(item));
    setCreatingPeriod(null);
    setSaveState('idle');
  };

  const cancelEditing = (resetSaveState = true) => {
    setEditingItemId(null);
    setDraft(null);
    if (resetSaveState) setSaveState('idle');
  };

  const commitEdit = async () => {
    if (saveState === 'saving') return;
    if (!editingItemId || !draft?.title.trim()) {
      cancelEditing();
      return;
    }

    setSaveState('saving');
    const result = await updateDailyChecklistItem(editingItemId, draft);
    if (result.success) {
      cancelEditing(false);
      setSaveState('saved');
      await fetchChecklist(selectedDate);
    } else {
      setSaveState('error');
      setError(result.error || 'Erro ao editar item');
    }
  };

  const handleToggle = async (item: ChecklistItemView) => {
    if (!data || editMode) return;

    const nextCompleted = !item.completed;
    const previous = data;
    const nextChecklist = data.checklist.map((current) =>
      current.id === item.id
        ? {
            ...current,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : null,
          }
        : current
    );

    setData({
      ...data,
      checklist: nextChecklist,
      summary: recalculateSummary(nextChecklist),
    });
    setSavingItemId(item.id);
    setError(null);

    const result = await toggleDailyChecklistItem(
      item.id,
      selectedDate,
      nextCompleted
    );

    if (!result.success) {
      setData(previous);
      setError(result.error || 'Erro ao atualizar checklist');
    } else {
      void fetchChecklist(selectedDate);
    }

    setSavingItemId(null);
  };

  const handleCreate = async () => {
    if (saveState === 'saving') return;
    if (!creatingPeriod || !createDraft.title.trim()) return;

    setSaveState('saving');
    const result = await createDailyChecklistItem({
      ...createDraft,
      period: creatingPeriod,
    });

    if (result.success) {
      setSaveState('saved');
      setCreatingPeriod(null);
      setCreateDraft(emptyDraft('Morning'));
      await fetchChecklist(selectedDate);
    } else {
      setSaveState('error');
      setError(result.error || 'Erro ao criar item');
    }
  };

  const handleArchiveToggle = async (item: ChecklistItemView) => {
    setSavingItemId(item.id);
    const result = await setDailyChecklistItemActive(item.id, !item.active);
    if (result.success) {
      await fetchChecklist(selectedDate);
    } else {
      setError(result.error || 'Erro ao atualizar status do item');
    }
    setSavingItemId(null);
  };

  const handleMove = async (
    item: ChecklistItemView,
    direction: 'up' | 'down'
  ) => {
    setSavingItemId(item.id);
    const result = await moveDailyChecklistItem(item.id, direction);
    if (result.success) {
      await fetchChecklist(selectedDate);
    } else {
      setError(result.error || 'Erro ao reordenar item');
    }
    setSavingItemId(null);
  };

  const summary = data?.summary || { completed: 0, total: 0, percentage: 0 };

  return (
    <section className="rounded-lg border border-[#2f2f35] bg-[#121212] p-4 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-3 border-b border-[#2f2f35] pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#c9b8ff]" />
            <h2 className="text-base font-semibold text-white">
              Checklist Diario
            </h2>
            {saveState === 'saving' && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#777780]" />
            )}
            {saveState === 'saved' && (
              <span className="text-xs text-green-300">salvo</span>
            )}
            {saveState === 'error' && (
              <span className="text-xs text-red-300">erro</span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#777780]">
            Rotina separada das tasks normais, com historico por dia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={editMode ? 'default' : 'secondary'}
            size="sm"
            onClick={() => {
              setEditMode((current) => !current);
              cancelEditing();
              setCreatingPeriod(null);
            }}
            className={cn(
              'text-xs',
              !editMode && 'border border-[#303036] bg-[#1a1a1a] text-[#dcddde]'
            )}
          >
            <Settings className="h-3.5 w-3.5" />
            {editMode ? 'Concluir edicao' : 'Editar rotina'}
          </Button>
          <label className="inline-flex h-9 items-center gap-2 rounded-md border border-[#303036] bg-[#0d0d0d] px-3 text-sm text-[#dcddde]">
            <span className="sr-only">Selecionar dia</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="bg-transparent text-sm outline-none"
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setSelectedDate(getTodayInputValue())}
            className="border border-[#303036] bg-[#1a1a1a] text-[#dcddde]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Hoje
          </Button>
        </div>
      </div>

      <div className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="rounded-md border border-[#2f2f35] bg-[#0d0d0d] p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">
                  {formatShortDate(selectedDate)}: {summary.completed}/
                  {summary.total} concluidos · {summary.percentage}%
                </p>
                <p className="text-xs text-[#777780]">
                  {editMode
                    ? 'Edite a rotina sem alterar o historico diario.'
                    : 'Marque apenas o que foi feito no dia selecionado.'}
                </p>
              </div>
              {loading && (
                <Loader2 className="h-4 w-4 animate-spin text-[#777780]" />
              )}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#19191d]">
              <div
                className="h-full rounded-full bg-[#6f55d9] transition-all duration-300"
                style={{ width: `${summary.percentage}%` }}
              />
            </div>
            <div className="mt-3 flex items-end gap-1.5">
              {(data?.history || []).map((day) => (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  title={`${formatShortDate(day.date)} · ${day.percentage}%`}
                  className={cn(
                    'flex h-12 w-8 items-end rounded border border-[#2f2f35] bg-[#19191d] p-1 transition-colors hover:border-[#6f55d9]/60',
                    day.date === selectedDate && 'border-[#6f55d9]/70'
                  )}
                >
                  <span
                    className="w-full rounded-sm bg-[#6f55d9]/80"
                    style={{ height: `${Math.max(day.percentage, 8)}%` }}
                  />
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid gap-3 xl:grid-cols-3">
            {periods.map((period) => (
              <div
                key={period}
                className="rounded-md border border-[#2f2f35] bg-[#0d0d0d] p-3"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#f2f2f3]">
                    {period}
                  </h3>
                  {editMode && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCreatingPeriod(period);
                        setCreateDraft(emptyDraft(period));
                        cancelEditing();
                      }}
                      className="h-7 px-2 text-xs text-[#9b9ba3] hover:text-white"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar item
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {creatingPeriod === period && (
                    <ChecklistItemForm
                      draft={createDraft}
                      onDraftChange={setCreateDraft}
                      onCancel={() => setCreatingPeriod(null)}
                      onSubmit={handleCreate}
                      submitLabel="Criar"
                      saving={saveState === 'saving'}
                    />
                  )}

                  {(groupedItems.get(period) || []).map((item) =>
                    editingItemId === item.id && draft ? (
                      <ChecklistItemForm
                        key={item.id}
                        draft={draft}
                        onDraftChange={setDraft}
                        onCancel={cancelEditing}
                        onSubmit={commitEdit}
                        titleInputRef={titleInputRef}
                        submitLabel="Salvar"
                        saving={saveState === 'saving'}
                      />
                    ) : (
                      <ChecklistItemRow
                        key={item.id}
                        item={item}
                        editMode={editMode}
                        saving={savingItemId === item.id}
                        onToggle={() => handleToggle(item)}
                        onEdit={() => startEditing(item)}
                        onArchiveToggle={() => handleArchiveToggle(item)}
                        onMoveUp={() => handleMove(item, 'up')}
                        onMoveDown={() => handleMove(item, 'down')}
                      />
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-3">
          <div className="rounded-md border border-[#2f2f35] bg-[#0d0d0d] p-3">
            <h3 className="text-sm font-semibold text-[#f2f2f3]">
              Lembretes essenciais
            </h3>
            <div className="mt-3 space-y-2">
              {DAILY_CHECKLIST_REMINDERS.map((reminder) => (
                <div
                  key={reminder}
                  className="rounded-md border border-[#2f2f35] bg-[#141414] px-2 py-1.5 text-xs text-[#9b9ba3]"
                >
                  {reminder}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-[#2f2f35] bg-[#0d0d0d] p-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[#c9b8ff]" />
              <h3 className="text-sm font-semibold text-[#f2f2f3]">
                Log do Dia
              </h3>
            </div>
            <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {(data?.logs || []).length === 0 ? (
                <p className="rounded-md border border-dashed border-[#2f2f35] px-3 py-6 text-center text-xs text-gray-600">
                  Nenhuma atividade registrada nesse dia.
                </p>
              ) : (
                data?.logs.map((log) => (
                  <div
                    key={log.id}
                    className="rounded-md border border-[#2f2f35] bg-[#141414] px-2 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[#dcddde]">
                        {log.message}
                      </span>
                      <span className="shrink-0 text-[11px] text-gray-600">
                        {formatLogTime(log.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-gray-600">{log.type}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ChecklistItemRow({
  item,
  editMode,
  saving,
  onToggle,
  onEdit,
  onArchiveToggle,
  onMoveUp,
  onMoveDown,
}: {
  item: ChecklistItemView;
  editMode: boolean;
  saving: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onArchiveToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const rowContent = (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-[#777780]">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : item.completed ? (
          <CheckCircle2 className="h-4 w-4 text-green-300" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'text-sm font-medium text-white',
              item.completed && 'text-green-200',
              !item.active && 'text-[#777780] line-through'
            )}
          >
            {item.title}
          </span>
          {item.isSacred && (
            <span className="inline-flex items-center gap-1 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-300">
              <Sparkles className="h-3 w-3" />
              sagrado
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-[#777780]">
            <Clock3 className="h-3 w-3" />
            {item.timeRange || buildTimeRange(item.startTime, item.endTime)}
          </span>
        </span>
        <span className="mt-1 block text-xs leading-5 text-[#777780]">
          {item.description}
        </span>
      </span>
    </div>
  );

  if (!editMode) {
    return (
      <button
        type="button"
        disabled={saving}
        onClick={onToggle}
        onDoubleClick={(event) => {
          event.preventDefault();
          onEdit();
        }}
        className={cn(
          'w-full rounded-md border border-[#2f2f35] bg-[#141414] p-2 text-left transition-colors hover:border-[#303036] focus:ring-2 focus:ring-[#6f55d9]/30 focus:outline-none',
          item.completed && 'border-green-500/30 bg-green-500/10',
          item.isSacred && 'border-amber-500/25'
        )}
      >
        {rowContent}
      </button>
    );
  }

  return (
    <div
      onDoubleClick={onEdit}
      className={cn(
        'group rounded-md border border-[#2f2f35] bg-[#141414] p-2 transition-colors hover:border-[#303036]',
        !item.active && 'opacity-60',
        item.isSacred && 'border-amber-500/25'
      )}
    >
      {rowContent}
      <div className="mt-2 flex flex-wrap items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onEdit}
          className="h-7 px-2 text-xs text-[#9b9ba3] hover:text-white"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onMoveUp}
          className="h-7 w-7 text-[#777780] hover:text-white"
          title="Mover para cima"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onMoveDown}
          className="h-7 w-7 text-[#777780] hover:text-white"
          title="Mover para baixo"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onArchiveToggle}
          className="h-7 px-2 text-xs text-[#9b9ba3] hover:text-amber-300"
        >
          <Archive className="h-3.5 w-3.5" />
          {item.active ? 'Arquivar' : 'Reativar'}
        </Button>
      </div>
    </div>
  );
}

function ChecklistItemForm({
  draft,
  onDraftChange,
  onCancel,
  onSubmit,
  submitLabel,
  saving = false,
  titleInputRef,
}: {
  draft: DailyChecklistItemInput;
  onDraftChange: (draft: DailyChecklistItemInput) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  saving?: boolean;
  titleInputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }

    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="rounded-md border border-[#6f55d9]/30 bg-[#6f55d9]/5 p-2">
      <div className="grid gap-2">
        <input
          ref={titleInputRef}
          value={draft.title}
          onChange={(event) =>
            onDraftChange({ ...draft, title: event.target.value })
          }
          onKeyDown={handleKeyDown}
          placeholder="Titulo"
          className="h-8 rounded-md border border-[#303036] bg-[#101010] px-2 text-sm text-white outline-none focus:border-[#6f55d9]/60"
        />
        <textarea
          value={draft.description || ''}
          onChange={(event) =>
            onDraftChange({ ...draft, description: event.target.value })
          }
          onKeyDown={handleKeyDown}
          placeholder="Descricao"
          rows={2}
          className="resize-none rounded-md border border-[#303036] bg-[#101010] px-2 py-1 text-xs text-[#f2f2f3] outline-none focus:border-[#6f55d9]/60"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={draft.period}
            onChange={(event) =>
              onDraftChange({ ...draft, period: event.target.value })
            }
            className="h-8 rounded-md border border-[#303036] bg-[#101010] px-2 text-xs text-[#f2f2f3] outline-none"
          >
            {periods.map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={draft.position ?? 0}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                position: Number(event.target.value) || 0,
              })
            }
            className="h-8 rounded-md border border-[#303036] bg-[#101010] px-2 text-xs text-[#f2f2f3] outline-none"
            placeholder="Posicao"
          />
          <input
            value={draft.startTime || ''}
            onChange={(event) =>
              onDraftChange({ ...draft, startTime: event.target.value })
            }
            onKeyDown={handleKeyDown}
            className="h-8 rounded-md border border-[#303036] bg-[#101010] px-2 text-xs text-[#f2f2f3] outline-none"
            placeholder="Inicio"
          />
          <input
            value={draft.endTime || ''}
            onChange={(event) =>
              onDraftChange({ ...draft, endTime: event.target.value })
            }
            onKeyDown={handleKeyDown}
            className="h-8 rounded-md border border-[#303036] bg-[#101010] px-2 text-xs text-[#f2f2f3] outline-none"
            placeholder="Fim"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="inline-flex items-center gap-2 text-xs text-[#9b9ba3]">
            <input
              type="checkbox"
              checked={!!draft.isSacred}
              onChange={(event) =>
                onDraftChange({ ...draft, isSacred: event.target.checked })
              }
              className="h-4 w-4 rounded border-[#303036] bg-[#101010]"
            />
            Sagrado/destaque
          </label>
          <label className="inline-flex items-center gap-2 text-xs text-[#9b9ba3]">
            <input
              type="checkbox"
              checked={draft.active !== false}
              onChange={(event) =>
                onDraftChange({ ...draft, active: event.target.checked })
              }
              className="h-4 w-4 rounded border-[#303036] bg-[#101010]"
            />
            Ativo
          </label>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onCancel}
              disabled={saving}
              className="h-7 px-2 text-xs text-[#9b9ba3]"
            >
              <X className="h-3.5 w-3.5" />
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onSubmit}
              disabled={!draft.title.trim() || saving}
              className="h-7 px-2 text-xs"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saving ? 'Salvando...' : submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
