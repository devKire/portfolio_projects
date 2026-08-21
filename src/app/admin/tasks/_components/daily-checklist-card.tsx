'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Loader2, X } from 'lucide-react';

import {
  createDailyChecklistItem,
  createDailyRoutine,
  deleteDailyChecklistItem,
  deleteDailyRoutine,
  duplicateDailyRoutine,
  getDailyChecklist,
  moveDailyChecklistItem,
  setDailyChecklistItemActive,
  setDailyRoutineActive,
  setDefaultDailyRoutine,
  setRoutineForDate,
  toggleDailyChecklistItem,
  updateDailyChecklistItem,
  updateDailyRoutine,
  updateDailyRoutineReminders,
} from '@/app/actions/daily-checklist';
import { Button } from '@/components/ui/button';

import { ChecklistHeader } from './daily-checklist/checklist-header';
import { DailyProgress } from './daily-checklist/daily-progress';
import { RoutineManager } from './daily-checklist/routine-manager';
import { RoutinePeriodColumn } from './daily-checklist/routine-period-column';
import { RoutineSettings } from './daily-checklist/routine-settings';
import { RoutineSidebar } from './daily-checklist/routine-sidebar';
import {
  CHECKLIST_PERIODS,
  itemDraft,
  normalizePeriod,
  recalculateSummary,
  routineDraft,
  todayInput,
  type ChecklistData,
  type ChecklistItemView,
  type ChecklistPeriod,
  type ItemDraft,
  type RoutineDraft,
  type RoutineView,
  type SaveState,
} from './daily-checklist/types';

type ActionResult = { success: boolean; error?: string };

export function DailyChecklistCard() {
  const [selectedDate, setSelectedDate] = useState(todayInput);
  const selectedDateRef = useRef(selectedDate);
  const [data, setData] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [routineEditor, setRoutineEditor] = useState<RoutineDraft | null>(null);
  const [itemEditor, setItemEditor] = useState<ItemDraft | null>(null);
  const [savingItemIds, setSavingItemIds] = useState<Set<string>>(
    () => new Set()
  );
  const [managerOpen, setManagerOpen] = useState(false);
  const [managerCreateMode, setManagerCreateMode] = useState(false);

  const load = useCallback(async (date: string, quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    const result = await getDailyChecklist(date);
    if (date !== selectedDateRef.current) return;
    if (result.success) {
      setData(result.data as ChecklistData);
    } else {
      setError(result.error);
    }
    if (!quiet) setLoading(false);
  }, []);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
    void load(selectedDate);
  }, [load, selectedDate]);

  useEffect(() => {
    if (saveState !== 'saved') return;
    const timer = window.setTimeout(() => setSaveState('idle'), 1200);
    return () => window.clearTimeout(timer);
  }, [saveState]);

  const selectedRoutine = useMemo(
    () =>
      data?.routines.find((routine) => routine.id === data.selectedRoutineId) ||
      null,
    [data]
  );

  useEffect(() => {
    if (!editMode || !selectedRoutine) return;
    setRoutineEditor((current) =>
      current?.id === selectedRoutine.id
        ? current
        : routineDraft(selectedRoutine)
    );
  }, [editMode, selectedRoutine]);

  const displayItems = editMode ? data?.items || [] : data?.checklist || [];
  const groupedItems = useMemo(() => {
    const groups = new Map<ChecklistPeriod, ChecklistItemView[]>();
    CHECKLIST_PERIODS.forEach((period) => groups.set(period, []));
    displayItems.forEach((item) =>
      groups.get(normalizePeriod(item.period))?.push(item)
    );
    CHECKLIST_PERIODS.forEach((period) =>
      groups
        .get(period)
        ?.sort((first, second) => first.position - second.position)
    );
    return groups;
  }, [displayItems]);

  async function run(action: () => Promise<ActionResult>, quiet = true) {
    setPending(true);
    setSaveState('saving');
    setError(null);
    const result = await action();
    if (!result.success) {
      setError(result.error || 'Não foi possível concluir a ação.');
      setSaveState('error');
      setPending(false);
      return false;
    }
    await load(selectedDateRef.current, quiet);
    setSaveState('saved');
    setPending(false);
    return true;
  }

  function changeDate(date: string) {
    if (!date) return;
    selectedDateRef.current = date;
    setSelectedDate(date);
    setEditMode(false);
    setRoutineEditor(null);
    setItemEditor(null);
  }

  function toggleEditMode() {
    if (!selectedRoutine) return;
    if (editMode) {
      setEditMode(false);
      setRoutineEditor(null);
      setItemEditor(null);
      return;
    }
    setEditMode(true);
    setRoutineEditor(routineDraft(selectedRoutine));
  }

  async function selectRoutine(routineId: string) {
    if (data?.selectedRoutineId === routineId) return true;
    if (!data?.canChangeRoutine) {
      setError(
        'Desmarque os itens concluídos antes de trocar a rotina deste dia.'
      );
      return false;
    }
    setEditMode(false);
    setRoutineEditor(null);
    setItemEditor(null);
    return run(() => setRoutineForDate(routineId, selectedDateRef.current));
  }

  async function toggleItem(item: ChecklistItemView) {
    if (editMode || savingItemIds.has(item.id)) return;
    const nextCompleted = !item.completed;
    const optimisticId = `optimistic-${item.id}-${Date.now()}`;
    setSavingItemIds((current) => new Set(current).add(item.id));
    setError(null);

    setData((current) => {
      if (!current) return current;
      const checklist = current.checklist.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              completed: nextCompleted,
              completedAt: nextCompleted ? new Date().toISOString() : null,
            }
          : entry
      );
      const summary = recalculateSummary(checklist);
      return {
        ...current,
        checklist,
        summary,
        history: current.history.map((day) =>
          day.date === selectedDateRef.current
            ? {
                ...day,
                completed: summary.completed,
                total: summary.total,
                percentage: summary.percentage,
              }
            : day
        ),
        logs: [
          {
            id: optimisticId,
            type: nextCompleted
              ? 'daily_checklist.completed'
              : 'daily_checklist.uncompleted',
            message: nextCompleted
              ? `Checklist concluído: ${item.title}`
              : `Checklist desmarcado: ${item.title}`,
            createdAt: new Date().toISOString(),
          },
          ...current.logs,
        ],
      };
    });

    const actionDate = selectedDateRef.current;
    const result = await toggleDailyChecklistItem(
      item.id,
      actionDate,
      nextCompleted
    );
    if (!result.success) {
      setData((current) => {
        if (!current) return current;
        const checklist = current.checklist.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                completed: Boolean(item.completed),
                completedAt: item.completedAt,
              }
            : entry
        );
        const summary = recalculateSummary(checklist);
        return {
          ...current,
          checklist,
          summary,
          history: current.history.map((day) =>
            day.date === actionDate
              ? {
                  ...day,
                  completed: summary.completed,
                  total: summary.total,
                  percentage: summary.percentage,
                }
              : day
          ),
          logs: current.logs.filter((log) => log.id !== optimisticId),
        };
      });
      setError(result.error || 'Não foi possível atualizar o checklist.');
    } else {
      setSaveState('saved');
      await load(actionDate, true);
    }
    setSavingItemIds((current) => {
      const next = new Set(current);
      next.delete(item.id);
      return next;
    });
  }

  async function saveRoutine() {
    if (!routineEditor) return;
    const success = await run(() =>
      updateDailyRoutine(routineEditor.id, routineEditor)
    );
    if (success) setRoutineEditor({ ...routineEditor });
  }

  async function saveItem() {
    if (!itemEditor) return;
    const success = itemEditor.id
      ? await run(() => updateDailyChecklistItem(itemEditor.id!, itemEditor))
      : await run(() => createDailyChecklistItem(itemEditor));
    if (success) setItemEditor(null);
  }

  async function createRoutine(name: string, baseRoutineId: string | null) {
    setPending(true);
    setSaveState('saving');
    setError(null);
    const result = await createDailyRoutine({
      name: name.trim(),
      duplicateFromRoutineId: baseRoutineId || undefined,
    });
    if (!result.success) {
      setError(result.error);
      setSaveState('error');
      setPending(false);
      return false;
    }
    const selection = await setRoutineForDate(
      result.data.id,
      selectedDateRef.current
    );
    if (!selection.success) {
      setError(selection.error);
      setSaveState('error');
      setPending(false);
      return false;
    }
    await load(selectedDateRef.current, true);
    setEditMode(true);
    setRoutineEditor(null);
    setSaveState('saved');
    setPending(false);
    return true;
  }

  async function duplicateRoutine(routineId: string) {
    setPending(true);
    setSaveState('saving');
    setError(null);
    const result = await duplicateDailyRoutine(routineId);
    if (!result.success) {
      setError(result.error);
      setSaveState('error');
      setPending(false);
      return;
    }
    const selection = await setRoutineForDate(
      result.data.id,
      selectedDateRef.current
    );
    if (!selection.success) {
      setError(selection.error);
      setSaveState('error');
      setPending(false);
      return;
    }
    await load(selectedDateRef.current, true);
    setEditMode(true);
    setRoutineEditor(null);
    setManagerOpen(false);
    setSaveState('saved');
    setPending(false);
  }

  async function editManagedRoutine(routine: RoutineView) {
    if (routine.id !== selectedRoutine?.id) {
      const selected = await selectRoutine(routine.id);
      if (!selected) return;
    }
    setRoutineEditor(routineDraft(routine));
    setEditMode(true);
  }

  async function archiveRoutine(routine: RoutineView) {
    await run(() => setDailyRoutineActive(routine.id, !routine.active));
  }

  async function deleteRoutine(routine: RoutineView) {
    if (!window.confirm(`Excluir a rotina “${routine.name}”?`)) return;
    await run(() => deleteDailyRoutine(routine.id));
  }

  async function moveItem(item: ChecklistItemView, direction: 'up' | 'down') {
    setSavingItemIds((current) => new Set(current).add(item.id));
    await run(() => moveDailyChecklistItem(item.id, direction));
    setSavingItemIds((current) => {
      const next = new Set(current);
      next.delete(item.id);
      return next;
    });
  }

  async function archiveItem(item: ChecklistItemView) {
    setSavingItemIds((current) => new Set(current).add(item.id));
    await run(() => setDailyChecklistItemActive(item.id, !item.active));
    setSavingItemIds((current) => {
      const next = new Set(current);
      next.delete(item.id);
      return next;
    });
  }

  async function deleteItem(item: ChecklistItemView) {
    if (!window.confirm(`Excluir o item “${item.title}”?`)) return;
    setSavingItemIds((current) => new Set(current).add(item.id));
    await run(() => deleteDailyChecklistItem(item.id));
    setSavingItemIds((current) => {
      const next = new Set(current);
      next.delete(item.id);
      return next;
    });
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-lg border border-[#2f2f35] bg-[#121212]">
        <Loader2
          className="h-6 w-6 animate-spin text-violet-300"
          aria-label="Carregando checklist"
        />
      </div>
    );
  }

  const summary = data?.summary || { completed: 0, total: 0, percentage: 0 };

  return (
    <section
      className="min-w-0 rounded-lg border border-[#2f2f35] bg-[#121212] p-3 shadow-xl shadow-black/20 sm:p-4"
      aria-labelledby="daily-checklist-title"
    >
      <ChecklistHeader
        selectedDate={selectedDate}
        selectedRoutine={selectedRoutine}
        routines={data?.routines || []}
        source={data?.selectedRoutineSource || 'none'}
        canChangeRoutine={Boolean(data?.canChangeRoutine)}
        loading={loading}
        saveState={saveState}
        editMode={editMode}
        onDateChange={changeDate}
        onToday={() => changeDate(todayInput())}
        onRoutineChange={(routineId) => void selectRoutine(routineId)}
        onToggleEdit={toggleEditMode}
        onNewRoutine={() => {
          setManagerCreateMode(true);
          setManagerOpen(true);
        }}
        onManageRoutines={() => {
          setManagerCreateMode(false);
          setManagerOpen(true);
        }}
      />

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start justify-between gap-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            aria-label="Fechar erro"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {data?.isDateOverride && data.canChangeRoutine && !editMode && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
          <span>Esta data usa uma rotina escolhida manualmente.</span>
          <button
            type="button"
            onClick={() =>
              void run(() => setRoutineForDate(null, selectedDateRef.current))
            }
            className="font-semibold underline underline-offset-4"
          >
            Voltar à programação automática
          </button>
        </div>
      )}

      <div className="grid min-w-0 gap-4 py-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <main className="min-w-0 space-y-4">
          <DailyProgress
            selectedDate={selectedDate}
            completed={summary.completed}
            total={summary.total}
            percentage={summary.percentage}
            history={data?.history || []}
            editMode={editMode}
            onDateChange={changeDate}
          />

          {editMode && routineEditor && (
            <RoutineSettings
              draft={routineEditor}
              pending={pending}
              canReapply={Boolean(data?.canChangeRoutine)}
              onChange={setRoutineEditor}
              onSave={() => void saveRoutine()}
              onCancel={toggleEditMode}
              onSetDefault={() =>
                void run(() => setDefaultDailyRoutine(routineEditor.id)).then(
                  (success) =>
                    success &&
                    setRoutineEditor({ ...routineEditor, isDefault: true })
                )
              }
              onReapply={() =>
                void run(() =>
                  setRoutineForDate(routineEditor.id, selectedDateRef.current)
                )
              }
            />
          )}

          {!selectedRoutine ? (
            <div className="rounded-md border border-dashed border-[#6f55d9]/35 bg-[#6f55d9]/5 px-6 py-12 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-violet-300" />
              <h3 className="mt-3 text-base font-semibold text-white">
                Nenhuma rotina criada ainda
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-[#8d8d97]">
                Comece com uma rotina vazia ou duplique uma configuração
                existente.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setManagerCreateMode(true);
                  setManagerOpen(true);
                }}
                className="mt-4"
              >
                Criar primeira rotina
              </Button>
            </div>
          ) : (
            <div className="grid min-w-0 gap-3 lg:grid-cols-3">
              {CHECKLIST_PERIODS.map((period) => (
                <RoutinePeriodColumn
                  key={period}
                  period={period}
                  items={groupedItems.get(period) || []}
                  editMode={editMode}
                  itemEditor={itemEditor}
                  savingItemIds={savingItemIds}
                  pending={pending}
                  onToggle={(item) => void toggleItem(item)}
                  onStartCreate={(selectedPeriod) =>
                    setItemEditor(itemDraft(selectedRoutine.id, selectedPeriod))
                  }
                  onStartEdit={(item) =>
                    setItemEditor(
                      itemDraft(
                        selectedRoutine.id,
                        normalizePeriod(item.period),
                        item
                      )
                    )
                  }
                  onEditorChange={setItemEditor}
                  onSaveEditor={() => void saveItem()}
                  onCancelEditor={() => setItemEditor(null)}
                  onMove={(item, direction) => void moveItem(item, direction)}
                  onArchiveToggle={(item) => void archiveItem(item)}
                  onDelete={(item) => void deleteItem(item)}
                />
              ))}
            </div>
          )}
        </main>

        <RoutineSidebar
          routineId={selectedRoutine?.id || null}
          reminders={selectedRoutine?.reminders || []}
          logs={data?.logs || []}
          editMode={editMode}
          pending={pending}
          onSaveReminders={(reminders) =>
            selectedRoutine
              ? run(() =>
                  updateDailyRoutineReminders(selectedRoutine.id, reminders)
                )
              : Promise.resolve(false)
          }
        />
      </div>

      <RoutineManager
        open={managerOpen}
        createMode={managerCreateMode}
        routines={data?.routines || []}
        selectedRoutineId={data?.selectedRoutineId || null}
        pending={pending}
        onOpenChange={setManagerOpen}
        onCreateModeChange={setManagerCreateMode}
        onCreate={createRoutine}
        onSelect={(routineId) => void selectRoutine(routineId)}
        onEdit={(routine) => void editManagedRoutine(routine)}
        onDuplicate={(routineId) => void duplicateRoutine(routineId)}
        onSetDefault={(routineId) =>
          void run(() => setDefaultDailyRoutine(routineId))
        }
        onArchiveToggle={(routine) => void archiveRoutine(routine)}
        onDelete={(routine) => void deleteRoutine(routine)}
      />
    </section>
  );
}
