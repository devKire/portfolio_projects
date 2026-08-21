'use client';

import {
  Archive,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  Copy,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
  type DailyChecklistItemInput,
  type DailyRoutineInput,
} from '@/app/actions/daily-checklist';

const PERIODS = ['Morning', 'Afternoon', 'Night'] as const;
const WEEKDAYS = [
  { value: 1, short: 'Seg', label: 'Segunda-feira' },
  { value: 2, short: 'Ter', label: 'Terça-feira' },
  { value: 3, short: 'Qua', label: 'Quarta-feira' },
  { value: 4, short: 'Qui', label: 'Quinta-feira' },
  { value: 5, short: 'Sex', label: 'Sexta-feira' },
  { value: 6, short: 'Sáb', label: 'Sábado' },
  { value: 0, short: 'Dom', label: 'Domingo' },
] as const;

const PERIOD_LABELS: Record<(typeof PERIODS)[number], string> = {
  Morning: 'Manhã',
  Afternoon: 'Tarde',
  Night: 'Noite',
};

type RoutineView = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  active: boolean;
  isDefault: boolean;
  weekdays: number[];
  itemCount: number;
  historyCount: number;
};

type ItemView = {
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

type ChecklistData = {
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
  checklist: ItemView[];
  items: ItemView[];
  summary: { completed: number; total: number; percentage: number };
  history: {
    date: string;
    completed: number;
    total: number;
    percentage: number;
  }[];
  logs: { id: string; message: string; createdAt: string }[];
};

type RoutineDraft = DailyRoutineInput & { id?: string };

type ItemDraft = DailyChecklistItemInput & { id?: string };

function todayInput() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
  }).format(new Date(`${value}T12:00:00`));
}

function routineDraft(routine?: RoutineView): RoutineDraft {
  return {
    id: routine?.id,
    name: routine?.name || '',
    description: routine?.description || '',
    color: routine?.color || '#8b5cf6',
    weekdays: routine?.weekdays || [],
    isDefault: routine?.isDefault || false,
  };
}

function itemDraft(routineId: string, item?: ItemView): ItemDraft {
  return {
    id: item?.id,
    routineId,
    title: item?.title || '',
    description: item?.description || '',
    period: item?.period || 'Morning',
    startTime: item?.startTime || '',
    endTime: item?.endTime || '',
    active: item?.active ?? true,
    isSacred: item?.isSacred || false,
  };
}

export function DailyChecklistCard() {
  const [selectedDate, setSelectedDate] = useState(todayInput);
  const [data, setData] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const [routineEditor, setRoutineEditor] = useState<RoutineDraft | null>(null);
  const [itemEditor, setItemEditor] = useState<ItemDraft | null>(null);

  const load = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    const result = await getDailyChecklist(date);
    if (result.success) setData(result.data as ChecklistData);
    else setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(selectedDate);
  }, [load, selectedDate]);

  const selectedRoutine = useMemo(
    () =>
      data?.routines.find((routine) => routine.id === data.selectedRoutineId),
    [data]
  );

  async function run(
    action: () => Promise<{ success: boolean; error?: string }>
  ) {
    setPending(true);
    setError(null);
    const result = await action();
    if (!result.success)
      setError(result.error || 'Não foi possível concluir a ação.');
    else await load(selectedDate);
    setPending(false);
    return result.success;
  }

  async function selectRoutine(routineId: string) {
    if (!data?.canChangeRoutine) {
      setError(
        'Desmarque os itens concluídos antes de trocar a rotina deste dia.'
      );
      return;
    }
    await run(() => setRoutineForDate(routineId, selectedDate));
  }

  async function saveRoutine() {
    if (!routineEditor) return;
    const draft = routineEditor;
    if (draft.id) {
      const success = await run(() => updateDailyRoutine(draft.id!, draft));
      if (success) setRoutineEditor(null);
      return;
    }
    setPending(true);
    setError(null);
    const result = await createDailyRoutine(draft);
    if (!result.success) {
      setError(result.error);
      setPending(false);
      return;
    }
    await setRoutineForDate(result.data.id, selectedDate);
    await load(selectedDate);
    setPending(false);
    setRoutineEditor(null);
  }

  async function saveItem() {
    if (!itemEditor) return;
    const draft = itemEditor;
    const success = draft.id
      ? await run(() => updateDailyChecklistItem(draft.id!, draft))
      : await run(() => createDailyChecklistItem(draft));
    if (success) setItemEditor(null);
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-white/10 bg-[#17171b]">
        <Loader2
          className="h-6 w-6 animate-spin text-violet-300"
          aria-label="Carregando checklist"
        />
      </div>
    );
  }

  return (
    <section
      className="min-w-0 space-y-4"
      aria-labelledby="daily-checklist-title"
    >
      <div className="rounded-2xl border border-white/10 bg-[#17171b] p-4 shadow-xl sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-violet-300">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
              <span className="text-xs font-semibold tracking-[0.18em] uppercase">
                Rotinas
              </span>
            </div>
            <h2
              id="daily-checklist-title"
              className="mt-1 text-xl font-semibold text-white"
            >
              Checklist Diário
            </h2>
            <p className="mt-1 text-sm text-[#a8a8b2] capitalize">
              {formatDate(selectedDate)}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="grid gap-1 text-xs text-[#b7b7c0]">
              Data
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="min-h-11 rounded-xl border border-white/10 bg-[#202026] px-3 text-sm text-white outline-none focus:border-violet-400"
              />
            </label>
            <label className="grid min-w-56 gap-1 text-xs text-[#b7b7c0]">
              Rotina do dia
              <select
                value={data?.selectedRoutineId || ''}
                disabled={pending || !data?.canChangeRoutine}
                onChange={(event) => void selectRoutine(event.target.value)}
                className="min-h-11 rounded-xl border border-white/10 bg-[#202026] px-3 text-sm text-white outline-none focus:border-violet-400 disabled:opacity-60"
              >
                {!data?.selectedRoutineId && (
                  <option value="">Nenhuma rotina</option>
                )}
                {data?.routines
                  .filter(
                    (routine) =>
                      routine.active || routine.id === data.selectedRoutineId
                  )
                  .map((routine) => (
                    <option key={routine.id} value={routine.id}>
                      {routine.isDefault ? '★ ' : ''}
                      {routine.name}
                      {routine.active ? '' : ' (arquivada)'}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setRoutineEditor(routineDraft())}
              className="min-h-11 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
            >
              <Plus className="mr-2 inline h-4 w-4" aria-hidden="true" />
              Nova rotina
            </button>
            <button
              type="button"
              onClick={() => setManaging((value) => !value)}
              className="min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white hover:bg-white/[0.08]"
            >
              {managing ? 'Fechar gerenciamento' : 'Minhas rotinas'}
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm text-red-100"
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

        {data?.isDateOverride && data.canChangeRoutine && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
            <span>
              Este dia usa uma substituição manual da programação semanal.
            </span>
            <button
              type="button"
              onClick={() =>
                void run(() => setRoutineForDate(null, selectedDate))
              }
              className="font-semibold underline underline-offset-4"
            >
              Usar programação
            </button>
          </div>
        )}
      </div>

      {routineEditor && (
        <RoutineEditor
          draft={routineEditor}
          pending={pending}
          onChange={setRoutineEditor}
          onCancel={() => setRoutineEditor(null)}
          onSave={() => void saveRoutine()}
        />
      )}

      {managing && data && (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {data.routines.map((routine) => (
            <article
              key={routine.id}
              className="rounded-2xl border border-white/10 bg-[#17171b] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full border border-white/20"
                      style={{ backgroundColor: routine.color || '#8b5cf6' }}
                      aria-hidden="true"
                    />
                    <h3 className="truncate font-semibold text-white">
                      {routine.name}
                    </h3>
                    {routine.isDefault && (
                      <Star
                        className="h-4 w-4 fill-amber-300 text-amber-300"
                        aria-label="Rotina padrão"
                      />
                    )}
                  </div>
                  <p className="mt-2 text-sm text-[#a8a8b2]">
                    {routine.description || 'Sem descrição.'}
                  </p>
                  <p className="mt-3 text-xs text-[#868691]">
                    {routine.weekdays.length
                      ? WEEKDAYS.filter((day) =>
                          routine.weekdays.includes(day.value)
                        )
                          .map((day) => day.short)
                          .join(', ')
                      : 'Sob demanda'}{' '}
                    · {routine.itemCount} itens
                  </p>
                </div>
                {!routine.active && (
                  <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-[#b7b7c0]">
                    Arquivada
                  </span>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <IconButton
                  label="Editar rotina"
                  onClick={() => setRoutineEditor(routineDraft(routine))}
                >
                  <Edit3 className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label="Duplicar rotina"
                  onClick={() =>
                    void run(() => duplicateDailyRoutine(routine.id))
                  }
                >
                  <Copy className="h-4 w-4" />
                </IconButton>
                {!routine.isDefault && routine.active && (
                  <IconButton
                    label="Definir como padrão"
                    onClick={() =>
                      void run(() => setDefaultDailyRoutine(routine.id))
                    }
                  >
                    <Star className="h-4 w-4" />
                  </IconButton>
                )}
                <IconButton
                  label={routine.active ? 'Arquivar rotina' : 'Reativar rotina'}
                  onClick={() =>
                    void run(() =>
                      setDailyRoutineActive(routine.id, !routine.active)
                    )
                  }
                >
                  <Archive className="h-4 w-4" />
                </IconButton>
                <IconButton
                  label="Excluir rotina"
                  danger
                  onClick={() => void run(() => deleteDailyRoutine(routine.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
            </article>
          ))}
        </div>
      )}

      {!data?.routines.length ? (
        <div className="rounded-2xl border border-dashed border-violet-400/30 bg-violet-500/[0.05] px-6 py-14 text-center">
          <CalendarDays
            className="mx-auto h-9 w-9 text-violet-300"
            aria-hidden="true"
          />
          <h3 className="mt-4 text-lg font-semibold text-white">
            Nenhuma rotina criada ainda
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#a8a8b2]">
            Crie uma rotina vazia e adicione apenas os itens que fazem sentido
            para você.
          </p>
          <button
            type="button"
            onClick={() => setRoutineEditor(routineDraft())}
            className="mt-5 min-h-11 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400"
          >
            Criar primeira rotina
          </button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="rounded-2xl border border-white/10 bg-[#17171b] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">
                    {selectedRoutine?.name || 'Rotina do dia'}
                  </h3>
                  <p className="mt-1 text-xs text-[#8f8f99]">
                    {data?.selectedRoutineSource === 'history'
                      ? 'Snapshot histórico'
                      : data?.selectedRoutineSource === 'schedule'
                        ? 'Programação semanal'
                        : data?.selectedRoutineSource === 'override'
                          ? 'Override desta data'
                          : 'Rotina padrão'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedRoutine && data?.canChangeRoutine && (
                    <button
                      type="button"
                      onClick={() =>
                        void run(() =>
                          setRoutineForDate(selectedRoutine.id, selectedDate)
                        )
                      }
                      className="min-h-10 rounded-xl border border-white/10 px-3 text-xs font-medium text-white hover:bg-white/[0.06]"
                      title="Atualiza o snapshot do dia enquanto nenhum item foi concluído"
                    >
                      <RefreshCw className="mr-2 inline h-4 w-4" />
                      Reaplicar rotina
                    </button>
                  )}
                  {selectedRoutine && (
                    <button
                      type="button"
                      onClick={() =>
                        setItemEditor(itemDraft(selectedRoutine.id))
                      }
                      className="min-h-10 rounded-xl bg-white/[0.08] px-3 text-xs font-semibold text-white hover:bg-white/[0.12]"
                    >
                      <Plus className="mr-2 inline h-4 w-4" />
                      Novo item
                    </button>
                  )}
                </div>
              </div>

              {itemEditor && (
                <ItemEditor
                  draft={itemEditor}
                  pending={pending}
                  onChange={setItemEditor}
                  onCancel={() => setItemEditor(null)}
                  onSave={() => void saveItem()}
                />
              )}

              {!data?.checklist.length ? (
                <div className="mt-6 rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-[#9696a0]">
                  Esta rotina ainda não possui itens ativos.
                </div>
              ) : (
                <div className="mt-5 space-y-6">
                  {PERIODS.map((period) => {
                    const items = data.checklist.filter(
                      (item) => item.period === period
                    );
                    if (!items.length) return null;
                    return (
                      <div key={period}>
                        <h4 className="mb-2 text-xs font-semibold tracking-[0.16em] text-[#8f8f99] uppercase">
                          {PERIOD_LABELS[period]}
                        </h4>
                        <div className="space-y-2">
                          {items.map((item) => (
                            <label
                              key={item.id}
                              className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-[#202026] p-3 hover:border-violet-400/40"
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(item.completed)}
                                disabled={pending}
                                onChange={(event) =>
                                  void run(() =>
                                    toggleDailyChecklistItem(
                                      item.id,
                                      selectedDate,
                                      event.target.checked
                                    )
                                  )
                                }
                                className="mt-1 h-5 w-5 accent-violet-500"
                              />
                              <span className="min-w-0 flex-1">
                                <span
                                  className={`block font-medium ${item.completed ? 'text-[#777780] line-through' : 'text-white'}`}
                                >
                                  {item.title}
                                </span>
                                <span className="mt-1 block text-xs text-[#9c9ca6]">
                                  {item.timeRange || 'Sem horário'}
                                  {item.description
                                    ? ` · ${item.description}`
                                    : ''}
                                </span>
                              </span>
                              {item.isSacred && (
                                <span className="rounded-full bg-amber-400/10 px-2 py-1 text-[10px] font-semibold text-amber-200">
                                  Prioritário
                                </span>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-[#17171b] p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#aaaab4]">Progresso</span>
                  <strong className="text-white">
                    {data?.summary.percentage || 0}%
                  </strong>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-400"
                    style={{ width: `${data?.summary.percentage || 0}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-[#8f8f99]">
                  {data?.summary.completed || 0} de {data?.summary.total || 0}{' '}
                  itens
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#17171b] p-4">
                <h3 className="text-sm font-semibold text-white">
                  Últimos 7 dias
                </h3>
                <div className="mt-4 grid grid-cols-7 gap-2">
                  {data?.history.map((day) => (
                    <div key={day.date} className="text-center">
                      <div
                        className="flex h-20 items-end overflow-hidden rounded-lg bg-white/[0.05]"
                        title={`${day.completed}/${day.total} itens`}
                      >
                        <div
                          className="w-full rounded-lg bg-violet-500/70"
                          style={{
                            height: `${Math.max(day.percentage, day.total ? 8 : 0)}%`,
                          }}
                        />
                      </div>
                      <span className="mt-1 block text-[10px] text-[#858590]">
                        {day.date.slice(8)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>

          {selectedRoutine && (
            <div className="rounded-2xl border border-white/10 bg-[#17171b] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">Itens da rotina</h3>
                  <p className="mt-1 text-xs text-[#8f8f99]">
                    Alterações afetam apenas dias ainda não materializados.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {data?.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#202026] p-3 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${item.active ? 'text-white' : 'text-[#777780]'}`}
                        >
                          {item.title}
                        </span>
                        {!item.active && (
                          <span className="text-xs text-[#777780]">
                            Arquivado
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-xs text-[#90909a]">
                        {item.timeRange || 'Sem horário'} · {item.period}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <IconButton
                        label="Subir"
                        disabled={index === 0}
                        onClick={() =>
                          void run(() => moveDailyChecklistItem(item.id, 'up'))
                        }
                      >
                        <ArrowUp className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label="Descer"
                        disabled={index === data.items.length - 1}
                        onClick={() =>
                          void run(() =>
                            moveDailyChecklistItem(item.id, 'down')
                          )
                        }
                      >
                        <ArrowDown className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label="Editar"
                        onClick={() =>
                          setItemEditor(itemDraft(selectedRoutine.id, item))
                        }
                      >
                        <Edit3 className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label={item.active ? 'Arquivar' : 'Reativar'}
                        onClick={() =>
                          void run(() =>
                            setDailyChecklistItemActive(item.id, !item.active)
                          )
                        }
                      >
                        <Archive className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label="Excluir"
                        danger
                        onClick={() =>
                          void run(() => deleteDailyChecklistItem(item.id))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function IconButton({
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
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex min-h-10 min-w-10 items-center justify-center rounded-lg border px-2 disabled:cursor-not-allowed disabled:opacity-30 ${danger ? 'border-red-400/20 text-red-200 hover:bg-red-500/10' : 'border-white/10 text-[#c6c6ce] hover:bg-white/[0.07] hover:text-white'}`}
    >
      {children}
    </button>
  );
}

function RoutineEditor({
  draft,
  pending,
  onChange,
  onCancel,
  onSave,
}: {
  draft: RoutineDraft;
  pending: boolean;
  onChange: (draft: RoutineDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="rounded-2xl border border-violet-400/20 bg-[#191820] p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">
          {draft.id ? 'Editar rotina' : 'Nova rotina'}
        </h3>
        <button type="button" onClick={onCancel} aria-label="Fechar editor">
          <X className="h-5 w-5 text-[#aaaab4]" />
        </button>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="grid gap-1 text-sm text-[#b7b7c0]">
          Nome
          <input
            value={draft.name}
            onChange={(event) =>
              onChange({ ...draft, name: event.target.value })
            }
            maxLength={80}
            className="min-h-11 rounded-xl border border-white/10 bg-[#202026] px-3 text-white outline-none focus:border-violet-400"
          />
        </label>
        <label className="grid gap-1 text-sm text-[#b7b7c0]">
          Cor
          <input
            type="color"
            value={draft.color || '#8b5cf6'}
            onChange={(event) =>
              onChange({ ...draft, color: event.target.value })
            }
            className="h-11 w-full rounded-xl border border-white/10 bg-[#202026] p-1"
          />
        </label>
        <label className="grid gap-1 text-sm text-[#b7b7c0] lg:col-span-2">
          Descrição
          <textarea
            value={draft.description || ''}
            onChange={(event) =>
              onChange({ ...draft, description: event.target.value })
            }
            rows={2}
            className="rounded-xl border border-white/10 bg-[#202026] px-3 py-2 text-white outline-none focus:border-violet-400"
          />
        </label>
      </div>
      <fieldset className="mt-4">
        <legend className="text-sm text-[#b7b7c0]">Dias da semana</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => {
            const checked = draft.weekdays?.includes(day.value) || false;
            return (
              <label
                key={day.value}
                className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm ${checked ? 'border-violet-400 bg-violet-500/15 text-white' : 'border-white/10 text-[#aaaab4]'}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    onChange({
                      ...draft,
                      weekdays: checked
                        ? draft.weekdays?.filter((value) => value !== day.value)
                        : [...(draft.weekdays || []), day.value],
                    })
                  }
                  className="sr-only"
                />
                <span>{day.short}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-xl border border-white/10 px-4 text-sm text-white"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending || draft.name.trim().length < 2}
          onClick={onSave}
          className="min-h-11 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Check className="mr-2 inline h-4 w-4" />
              Salvar
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ItemEditor({
  draft,
  pending,
  onChange,
  onCancel,
  onSave,
}: {
  draft: ItemDraft;
  pending: boolean;
  onChange: (draft: ItemDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-500/[0.05] p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-xs text-[#b7b7c0]">
          Título
          <input
            value={draft.title}
            onChange={(event) =>
              onChange({ ...draft, title: event.target.value })
            }
            className="min-h-10 rounded-lg border border-white/10 bg-[#202026] px-3 text-sm text-white outline-none focus:border-violet-400"
          />
        </label>
        <label className="grid gap-1 text-xs text-[#b7b7c0]">
          Período
          <select
            value={draft.period}
            onChange={(event) =>
              onChange({ ...draft, period: event.target.value })
            }
            className="min-h-10 rounded-lg border border-white/10 bg-[#202026] px-3 text-sm text-white"
          >
            {PERIODS.map((period) => (
              <option key={period} value={period}>
                {PERIOD_LABELS[period]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-[#b7b7c0]">
          Início
          <input
            value={draft.startTime || ''}
            onChange={(event) =>
              onChange({ ...draft, startTime: event.target.value })
            }
            placeholder="08:00"
            className="min-h-10 rounded-lg border border-white/10 bg-[#202026] px-3 text-sm text-white"
          />
        </label>
        <label className="grid gap-1 text-xs text-[#b7b7c0]">
          Fim
          <input
            value={draft.endTime || ''}
            onChange={(event) =>
              onChange({ ...draft, endTime: event.target.value })
            }
            placeholder="09:00"
            className="min-h-10 rounded-lg border border-white/10 bg-[#202026] px-3 text-sm text-white"
          />
        </label>
        <label className="grid gap-1 text-xs text-[#b7b7c0] md:col-span-2">
          Descrição
          <textarea
            value={draft.description || ''}
            onChange={(event) =>
              onChange({ ...draft, description: event.target.value })
            }
            rows={2}
            className="rounded-lg border border-white/10 bg-[#202026] px-3 py-2 text-sm text-white"
          />
        </label>
      </div>
      <label className="mt-3 flex min-h-10 items-center gap-2 text-sm text-[#c0c0c8]">
        <input
          type="checkbox"
          checked={Boolean(draft.isSacred)}
          onChange={(event) =>
            onChange({ ...draft, isSacred: event.target.checked })
          }
          className="h-4 w-4 accent-violet-500"
        />
        Marcar como prioritário
      </label>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-10 rounded-lg border border-white/10 px-3 text-sm text-white"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending || !draft.title.trim()}
          onClick={onSave}
          className="min-h-10 rounded-lg bg-violet-500 px-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          Salvar item
        </button>
      </div>
    </div>
  );
}
