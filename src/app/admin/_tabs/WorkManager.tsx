'use client';

import type { TicketPriority } from '@prisma/client';
import {
  BriefcaseBusiness,
  CheckSquare2,
  Columns3,
  FilterX,
  Headphones,
  List,
  Loader2,
  Plus,
  Search,
  Settings2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  getProjects,
  getTaskTags,
  deleteTasksBulk,
  updateTaskStatus,
} from '@/app/actions/tasks';
import { createTicket } from '@/app/actions/tickets';
import { getWorkWorkspace, updateWorkItemLane } from '@/app/actions/work';
import type { OrganizationContext } from '@/lib/organizations/context';
import {
  filterWorkItems,
  taskToWorkItem,
  workLaneToTaskStatus,
} from '@/lib/work/adapter';
import { mergeTaskTags } from '@/lib/task-tags';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { BulkActionsBar } from '@/app/admin/tasks/_components/bulk-actions-bar';
import { BulkTaskInput } from '@/app/admin/tasks/_components/bulk-task-input';
import { QuickTaskInput } from '@/app/admin/tasks/_components/quick-task-input';
import { TaskItem } from '@/app/admin/tasks/_components/task-item';
import { TaskEditInline } from '@/app/admin/tasks/_components/task-item/task-edit-inline';
import { TaskShortcutsHint } from '@/app/admin/tasks/_components/task-shortcuts-hint';
import { QueueManagement, TicketDetail } from './Tickets';
import type {
  TaskPatch,
  TaskProjectOption,
  TaskScope,
  TaskWithRelations,
} from '@/types/tasks';
import type {
  TicketWorkItem,
  WorkItem,
  WorkItemFilters,
  WorkKind,
  WorkLane,
  WorkPriority,
  WorkWorkspace,
} from '@/types/work';

type OrganizationSummary = OrganizationContext['organizations'][number];
type ViewMode = 'list' | 'kanban';
type Section = 'work' | 'queues';
type Composer = null | 'choose' | 'task' | 'bulk' | 'ticket';

const inputClass =
  'h-10 w-full rounded-md border border-[#303036] bg-[#111] px-3 text-sm text-white outline-none placeholder:text-[#666670] focus:border-[#6f55d9]';

const laneLabels: Record<WorkLane, string> = {
  BACKLOG: 'Aberto / Pendente',
  IN_PROGRESS: 'Em andamento',
  WAITING: 'Aguardando',
  DONE: 'Concluído / Resolvido',
  CLOSED: 'Fechado',
};

const priorityLabels: Record<WorkPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};

const priorityClasses: Record<WorkPriority, string> = {
  LOW: 'border-zinc-500/20 bg-zinc-500/10 text-zinc-300',
  MEDIUM: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
  HIGH: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  URGENT: 'border-red-500/30 bg-red-500/10 text-red-300',
};

export default function WorkManager({
  userId,
  organization,
}: {
  userId: string;
  organization: OrganizationSummary | null;
}) {
  const organizationId = organization?.id || null;
  const [workspace, setWorkspace] = useState<WorkWorkspace | null>(null);
  const [section, setSection] = useState<Section>('work');
  const [scope, setScope] = useState<TaskScope>(
    organizationId ? 'mine' : 'personal'
  );
  const [filters, setFilters] = useState<WorkItemFilters>({});
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [composer, setComposer] = useState<Composer>(null);
  const [projects, setProjects] = useState<TaskProjectOption[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setScope(organizationId ? 'mine' : 'personal');
    setFilters({});
    setSelectedKey(null);
    setSection('work');
  }, [organizationId]);

  const load = useCallback(async () => {
    if (scope === 'team' && !filters.teamId) {
      setWorkspace((current) =>
        current ? { ...current, items: [] } : current
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await getWorkWorkspace({
      organizationId,
      scope,
      teamId: scope === 'team' ? filters.teamId : undefined,
      assigneeId: filters.assigneeId,
    });
    if (result.success) {
      setWorkspace(result.data);
      setSelectedIds((current) => {
        const visibleTaskIds = new Set(
          result.data.items
            .filter((item) => item.kind === 'TASK')
            .map((item) => item.id)
        );
        return new Set([...current].filter((id) => visibleTaskIds.has(id)));
      });
      setSelectedKey((current) =>
        current && result.data.items.some((item) => item.key === current)
          ? current
          : null
      );
    } else {
      toast.error(result.error || 'Não foi possível carregar o trabalho.');
    }
    setLoading(false);
  }, [filters.assigneeId, filters.teamId, organizationId, scope]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let mounted = true;
    Promise.all([getProjects(), getTaskTags()]).then(
      ([projectResult, tagResult]) => {
        if (!mounted) return;
        if (projectResult.success) {
          setProjects(
            (projectResult.data || []).map((project) => ({
              id: project.id,
              title: project.title,
            }))
          );
        }
        if (tagResult.success) setAvailableTags(tagResult.data || []);
      }
    );
    return () => {
      mounted = false;
    };
  }, []);

  const visibleItems = useMemo(
    () => filterWorkItems(workspace?.items || [], filters),
    [filters, workspace?.items]
  );
  const selectedItem = useMemo(
    () => workspace?.items.find((item) => item.key === selectedKey) || null,
    [selectedKey, workspace?.items]
  );
  const members = useMemo(
    () => workspace?.collaboration.members.map((member) => member.user) || [],
    [workspace]
  );
  const teams = useMemo(
    () =>
      workspace?.collaboration.teams.map((team) => ({
        ...team,
        active: true,
      })) || [],
    [workspace]
  );

  const run = useCallback(
    async (
      key: string,
      action: () => Promise<{ success: boolean; error?: string }>,
      successMessage: string
    ) => {
      setBusy(key);
      const result = await action();
      if (result.success) {
        toast.success(successMessage);
        await load();
      } else {
        toast.error(result.error || 'Não foi possível concluir a operação.');
      }
      setBusy(null);
      return result.success;
    },
    [load]
  );

  const updateTaskInWorkspace = useCallback((id: string, patch: TaskPatch) => {
    setWorkspace((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.map((item) => {
          if (item.kind !== 'TASK' || item.id !== id) return item;
          return taskToWorkItem({ ...item.task, ...patch });
        }),
      };
    });
  }, []);

  const mergeTags = useCallback((tags: string[]) => {
    setAvailableTags((current) => mergeTaskTags([...current, ...tags]));
  }, []);

  const addCreatedTasks = useCallback(
    (tasks: TaskWithRelations[]) => {
      setWorkspace((current) =>
        current
          ? {
              ...current,
              items: [...tasks.map(taskToWorkItem), ...current.items],
            }
          : current
      );
      mergeTags(tasks.flatMap((task) => task.tags || []));
    },
    [mergeTags]
  );

  const deleteSelected = useCallback(async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    const result = await deleteTasksBulk(ids);
    if (result.deletedIds.length) {
      setSelectedIds(new Set());
      await load();
    }
    if (!result.success) {
      toast.error(
        result.failedItems?.[0]?.error || 'Não foi possível excluir as tarefas.'
      );
    }
  }, [load, selectedIds]);

  const bulkStatus = useCallback(
    async (status: string) => {
      const results = await Promise.all(
        [...selectedIds].map((id) => updateTaskStatus(id, status))
      );
      if (results.some((result) => !result.success)) {
        toast.error('Algumas tarefas não puderam ser atualizadas.');
      }
      setSelectedIds(new Set());
      await load();
    },
    [load, selectedIds]
  );

  const moveToLane = useCallback(
    async (item: WorkItem, lane: WorkLane) => {
      if (item.kind === 'TASK' && !workLaneToTaskStatus(lane)) {
        toast.error('Tarefas não usam as colunas Aguardando ou Fechado.');
        return;
      }
      if (item.lane === lane) return;
      await run(
        `lane-${item.key}`,
        () =>
          updateWorkItemLane({
            kind: item.kind,
            id: item.id,
            organizationId: item.organizationId,
            lane,
          }),
        'Status atualizado.'
      );
    },
    [run]
  );

  const selectKind = (kind?: WorkKind) => {
    setFilters((current) => ({ ...current, kind }));
  };

  useKeyboardShortcuts({
    onNewTask: () => {
      setSection('work');
      setComposer('task');
    },
    onNewBulkTasks: () => {
      setSection('work');
      setComposer('bulk');
    },
    onSearchFocus: () => searchInputRef.current?.focus(),
    onSelectAll: () =>
      setSelectedIds(
        new Set(
          visibleItems
            .filter((item) => item.kind === 'TASK')
            .map((item) => item.id)
        )
      ),
    onClearSelection: () => setSelectedIds(new Set()),
    isBulkDeleteDisabled: selectedIds.size === 0,
    onBulkDelete: () => {
      if (window.confirm(`Excluir ${selectedIds.size} tarefa(s)?`)) {
        void deleteSelected();
      }
    },
    onViewChange: setViewMode,
  });

  return (
    <section className="min-w-0 space-y-4 pb-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wider text-[#9a8cff] uppercase">
            Operação {organization ? `• ${organization.name}` : '• pessoal'}
          </p>
          <h1 className="text-xl font-semibold text-white">Trabalho</h1>
          <p className="text-sm text-[#777780]">
            Tarefas e chamados em uma fila operacional única.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSection('work')}
            className={tabClass(section === 'work')}
          >
            <BriefcaseBusiness className="h-4 w-4" /> Trabalho
          </button>
          <button
            type="button"
            disabled={!organizationId}
            onClick={() => setSection('queues')}
            className={tabClass(section === 'queues')}
          >
            <Settings2 className="h-4 w-4" /> Filas
          </button>
          {section === 'work' && (
            <button
              type="button"
              onClick={() => setComposer('choose')}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[#6f55d9] px-4 text-sm font-medium text-white hover:bg-[#7c61e8]"
            >
              <Plus className="h-4 w-4" /> Novo
            </button>
          )}
        </div>
      </header>

      {section === 'queues' ? (
        organizationId && workspace?.canManageQueues ? (
          <QueueManagement
            organizationId={organizationId}
            queues={workspace.queues}
            teams={teams}
            members={members}
            busy={busy}
            run={run}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-[#3a3a43] p-8 text-center text-sm text-[#9b9ba3]">
            {organizationId
              ? 'Sua função não permite administrar filas.'
              : 'Selecione uma organização para acessar filas.'}
          </div>
        )
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#303036] bg-[#19191d] p-3">
            <QuickFilter
              active={!filters.kind}
              onClick={() => selectKind(undefined)}
              label="Todos"
            />
            <QuickFilter
              active={filters.kind === 'TASK'}
              onClick={() => selectKind('TASK')}
              label="Tasks"
              icon={<CheckSquare2 className="h-3.5 w-3.5" />}
            />
            <QuickFilter
              active={filters.kind === 'TICKET'}
              onClick={() => selectKind('TICKET')}
              label="Chamados"
              icon={<Headphones className="h-3.5 w-3.5" />}
            />
            <span className="mx-1 h-6 w-px bg-[#303036]" />
            <select
              aria-label="Escopo do trabalho"
              value={scope}
              onChange={(event) => setScope(event.target.value as TaskScope)}
              className="h-9 rounded-md border border-[#303036] bg-[#111] px-2 text-xs text-white outline-none focus:border-[#6f55d9]"
            >
              <option value="mine">Minhas</option>
              <option value="personal">Pessoais</option>
              {organizationId && (
                <>
                  <option value="organization">Organização</option>
                  <option value="team">Equipe</option>
                </>
              )}
            </select>
            <div className="ml-auto flex rounded-md border border-[#303036] bg-[#111] p-1">
              <ViewButton
                active={viewMode === 'list'}
                label="Lista"
                onClick={() => setViewMode('list')}
                icon={<List className="h-4 w-4" />}
              />
              <ViewButton
                active={viewMode === 'kanban'}
                label="Kanban"
                onClick={() => setViewMode('kanban')}
                icon={<Columns3 className="h-4 w-4" />}
              />
            </div>
          </div>

          <WorkFilters
            filters={filters}
            setFilters={setFilters}
            organizationId={organizationId}
            scope={scope}
            teams={workspace?.collaboration.teams || []}
            members={members}
            queues={workspace?.queues || []}
            projects={projects}
            tags={availableTags}
            searchInputRef={searchInputRef}
          />

          {composer === 'choose' && (
            <NewWorkChooser
              canCreateTicket={Boolean(organizationId)}
              onSelect={setComposer}
              onClose={() => setComposer(null)}
            />
          )}
          {composer === 'task' && (
            <QuickTaskInput
              onClose={() => setComposer(null)}
              projects={projects}
              tags={availableTags}
              organizationId={organizationId}
              collaboration={
                workspace?.collaboration || { teams: [], members: [] }
              }
              onSuccess={(task) => {
                addCreatedTasks([task]);
                setComposer(null);
              }}
            />
          )}
          {composer === 'bulk' && (
            <BulkTaskInput
              onClose={() => setComposer(null)}
              projects={projects}
              tags={availableTags}
              onSuccess={(tasks) => {
                addCreatedTasks(tasks);
                setComposer(null);
              }}
            />
          )}
          {composer === 'ticket' && organizationId && (
            <TicketComposer
              organizationId={organizationId}
              queues={workspace?.queues || []}
              teams={teams}
              members={members}
              busy={busy}
              onClose={() => setComposer(null)}
              onCreate={async (input) => {
                const success = await run(
                  'create-ticket',
                  () => createTicket(input),
                  'Chamado aberto.'
                );
                if (success) setComposer(null);
              }}
            />
          )}

          {selectedIds.size > 0 && (
            <BulkActionsBar
              count={selectedIds.size}
              onBulkStatusChange={bulkStatus}
              onBulkDelete={deleteSelected}
              onClearSelection={() => setSelectedIds(new Set())}
              isDeleting={busy === 'delete-tasks'}
            />
          )}

          {loading && !workspace ? (
            <div className="flex min-h-72 items-center justify-center text-sm text-[#9b9ba3]">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando
              trabalho...
            </div>
          ) : viewMode === 'list' ? (
            <WorkList
              items={visibleItems}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              editingTaskId={editingTaskId}
              setEditingTaskId={setEditingTaskId}
              setSelectedKey={setSelectedKey}
              updateTaskInWorkspace={updateTaskInWorkspace}
              onReload={load}
              projects={projects}
              tags={availableTags}
              mergeTags={mergeTags}
              collaboration={
                workspace?.collaboration || { teams: [], members: [] }
              }
            />
          ) : (
            <WorkKanban
              items={visibleItems}
              busy={busy}
              onOpen={setSelectedKey}
              onMove={moveToLane}
            />
          )}

          {!loading && visibleItems.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#3a3a43] p-10 text-center">
              <BriefcaseBusiness className="mx-auto h-8 w-8 text-[#777780]" />
              <p className="mt-3 text-sm text-[#9b9ba3]">
                Nenhum trabalho corresponde aos filtros atuais.
              </p>
            </div>
          )}
        </>
      )}

      {selectedItem && (
        <WorkDetailDialog
          item={selectedItem}
          userId={userId}
          workspace={workspace}
          projects={projects}
          tags={availableTags}
          teams={teams}
          members={members}
          busy={busy}
          run={run}
          mergeTags={mergeTags}
          onReload={load}
          onClose={() => setSelectedKey(null)}
        />
      )}

      {loading && workspace && (
        <div className="fixed top-0 right-0 left-0 z-50 h-1 animate-pulse bg-gradient-to-r from-[#6f55d9] to-[#9a8cff]" />
      )}
      <TaskShortcutsHint />
    </section>
  );
}

function WorkFilters({
  filters,
  setFilters,
  organizationId,
  scope,
  teams,
  members,
  queues,
  projects,
  tags,
  searchInputRef,
}: {
  filters: WorkItemFilters;
  setFilters: React.Dispatch<React.SetStateAction<WorkItemFilters>>;
  organizationId: string | null;
  scope: TaskScope;
  teams: Array<{ id: string; name: string }>;
  members: Array<{ id: string; name: string | null; username: string }>;
  queues: WorkWorkspace['queues'];
  projects: TaskProjectOption[];
  tags: string[];
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const set = <K extends keyof WorkItemFilters>(
    key: K,
    value: WorkItemFilters[K]
  ) => setFilters((current) => ({ ...current, [key]: value || undefined }));

  return (
    <div className="grid gap-2 rounded-xl border border-[#303036] bg-[#19191d] p-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <label className="relative sm:col-span-2">
        <Search className="absolute top-3 left-3 h-4 w-4 text-[#777780]" />
        <input
          ref={searchInputRef}
          value={filters.search || ''}
          onChange={(event) => set('search', event.target.value)}
          placeholder="Buscar trabalho"
          className={`${inputClass} pl-9`}
        />
      </label>
      <FilterSelect
        label="Status"
        value={filters.lane || ''}
        onChange={(value) => set('lane', value as WorkLane)}
        options={Object.entries(laneLabels)}
      />
      <FilterSelect
        label="Prioridade"
        value={filters.priority || ''}
        onChange={(value) => set('priority', value as WorkPriority)}
        options={Object.entries(priorityLabels)}
      />
      {organizationId && (
        <FilterSelect
          label="Equipe"
          value={filters.teamId || ''}
          onChange={(value) => set('teamId', value)}
          options={teams.map((team) => [team.id, team.name])}
          required={scope === 'team'}
        />
      )}
      {organizationId && (
        <FilterSelect
          label="Responsável"
          value={filters.assigneeId || ''}
          onChange={(value) => set('assigneeId', value)}
          options={members.map((member) => [
            member.id,
            member.name || `@${member.username}`,
          ])}
        />
      )}
      <FilterSelect
        label="Fila"
        value={filters.queueId || ''}
        onChange={(value) => set('queueId', value)}
        options={queues.map((queue) => [queue.id, queue.name])}
      />
      <FilterSelect
        label="Projeto"
        value={filters.projectId || ''}
        onChange={(value) => set('projectId', value)}
        options={projects.map((project) => [project.id, project.title])}
      />
      <FilterSelect
        label="Tag"
        value={filters.tag || ''}
        onChange={(value) => set('tag', value)}
        options={tags.map((tag) => [tag, `#${tag}`])}
      />
      <FilterSelect
        label="Prazo"
        value={filters.dueDateRange || ''}
        onChange={(value) =>
          set('dueDateRange', value as WorkItemFilters['dueDateRange'])
        }
        options={[
          ['today', 'Vence hoje'],
          ['week', 'Próximos 7 dias'],
          ['overdue', 'Atrasadas'],
          ['none', 'Sem prazo'],
        ]}
      />
      <button
        type="button"
        onClick={() => setFilters({})}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#303036] text-xs text-[#9b9ba3] hover:text-white"
      >
        <FilterX className="h-4 w-4" /> Limpar
      </button>
    </div>
  );
}

function WorkList({
  items,
  selectedIds,
  setSelectedIds,
  editingTaskId,
  setEditingTaskId,
  setSelectedKey,
  updateTaskInWorkspace,
  onReload,
  projects,
  tags,
  mergeTags,
  collaboration,
}: {
  items: WorkItem[];
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  editingTaskId: string | null;
  setEditingTaskId: (id: string | null) => void;
  setSelectedKey: (key: string) => void;
  updateTaskInWorkspace: (id: string, patch: TaskPatch) => void;
  onReload: () => Promise<void>;
  projects: TaskProjectOption[];
  tags: string[];
  mergeTags: (tags: string[]) => void;
  collaboration: WorkWorkspace['collaboration'];
}) {
  return (
    <div className="space-y-2">
      {items.map((item) =>
        item.kind === 'TASK' ? (
          <div key={item.key} className="relative">
            <button
              type="button"
              onClick={() => setSelectedKey(item.key)}
              className="absolute top-2 right-2 z-10 rounded border border-[#303036] bg-[#17171a] px-2 py-1 text-[10px] text-[#9a8cff]"
            >
              Detalhes
            </button>
            <TaskItem
              task={item.task}
              isSelected={selectedIds.has(item.id)}
              onToggleSelect={(id) =>
                setSelectedIds((current) => {
                  const next = new Set(current);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                })
              }
              isEditing={editingTaskId === item.id}
              onEditStart={setEditingTaskId}
              onUpdate={onReload}
              onTaskPatch={updateTaskInWorkspace}
              onDeleteTasks={async (ids) => {
                await deleteTasksBulk(ids);
                await onReload();
              }}
              isDeleting={false}
              projects={projects}
              availableTags={tags}
              onAvailableTagsChange={mergeTags}
              collaboration={collaboration}
            />
          </div>
        ) : (
          <TicketCard
            key={item.key}
            item={item}
            onOpen={() => setSelectedKey(item.key)}
          />
        )
      )}
    </div>
  );
}

function TicketCard({
  item,
  onOpen,
}: {
  item: TicketWorkItem;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-lg border border-[#2f2f35] bg-[#1a1a1a] p-4 text-left transition hover:border-[#6f55d9]/40 hover:bg-[#202024]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge className="border-sky-500/20 bg-sky-500/10 text-sky-300">
              CHAMADO
            </Badge>
            <span className="text-[10px] text-[#777780]">
              #{item.id.slice(-8)}
            </span>
          </div>
          <h2 className="mt-2 truncate text-sm font-medium text-white">
            {item.title}
          </h2>
        </div>
        <span className="text-[10px] text-[#777780]">
          {formatDate(item.updatedAt)}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge>{laneLabels[item.lane]}</Badge>
        <Badge className={priorityClasses[item.priority]}>
          {priorityLabels[item.priority]}
        </Badge>
        <Badge>{item.queueName}</Badge>
        {item.teamName && <Badge>{item.teamName}</Badge>}
      </div>
      <p className="mt-2 text-xs text-[#777780]">
        {item.assigneeName
          ? `Responsável: ${item.assigneeName}`
          : 'Não atribuído'}
      </p>
    </button>
  );
}

function WorkKanban({
  items,
  busy,
  onOpen,
  onMove,
}: {
  items: WorkItem[];
  busy: string | null;
  onOpen: (key: string) => void;
  onMove: (item: WorkItem, lane: WorkLane) => Promise<void>;
}) {
  const lanes = Object.keys(laneLabels) as WorkLane[];
  return (
    <div className="w-full overflow-x-auto pb-3">
      <div className="grid min-w-[1050px] grid-cols-5 gap-3">
        {lanes.map((lane) => (
          <section
            key={lane}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const key = event.dataTransfer.getData('application/work-item');
              const item = items.find((candidate) => candidate.key === key);
              if (item) void onMove(item, lane);
            }}
            className="min-h-[420px] rounded-xl border border-[#303036] bg-[#161619] p-2"
          >
            <header className="mb-2 flex items-center justify-between px-1 py-2">
              <h2 className="text-xs font-medium text-[#b9b9c1]">
                {laneLabels[lane]}
              </h2>
              <span className="rounded bg-[#292936] px-1.5 py-0.5 text-[10px] text-[#c9b8ff]">
                {items.filter((item) => item.lane === lane).length}
              </span>
            </header>
            <div className="space-y-2">
              {items
                .filter((item) => item.lane === lane)
                .map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    draggable={busy === null}
                    onDragStart={(event) =>
                      event.dataTransfer.setData(
                        'application/work-item',
                        item.key
                      )
                    }
                    onClick={() => onOpen(item.key)}
                    className="w-full cursor-grab rounded-lg border border-[#303036] bg-[#202024] p-3 text-left active:cursor-grabbing"
                  >
                    <Badge
                      className={
                        item.kind === 'TICKET'
                          ? 'border-sky-500/20 text-sky-300'
                          : 'border-violet-500/20 text-violet-300'
                      }
                    >
                      {item.kind === 'TICKET' ? 'CHAMADO' : 'TASK'}
                    </Badge>
                    <h3 className="mt-2 line-clamp-2 text-sm font-medium text-white">
                      {item.title}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-1">
                      <Badge className={priorityClasses[item.priority]}>
                        {priorityLabels[item.priority]}
                      </Badge>
                      {item.teamName && <Badge>{item.teamName}</Badge>}
                    </div>
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function WorkDetailDialog({
  item,
  userId,
  workspace,
  projects,
  tags,
  teams,
  members,
  busy,
  run,
  mergeTags,
  onReload,
  onClose,
}: {
  item: WorkItem;
  userId: string;
  workspace: WorkWorkspace | null;
  projects: TaskProjectOption[];
  tags: string[];
  teams: Array<{ id: string; name: string; active: boolean }>;
  members: Array<{
    id: string;
    name: string | null;
    username: string;
    email: string;
  }>;
  busy: string | null;
  run: (
    key: string,
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string
  ) => Promise<boolean>;
  mergeTags: (tags: string[]) => void;
  onReload: () => Promise<void>;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${item.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-xl border border-[#3a3a43] bg-[#1b1b1f] shadow-2xl">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-[#303036] bg-[#1b1b1f]/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-[#9a8cff]">
            {item.kind === 'TASK' ? (
              <CheckSquare2 className="h-4 w-4" />
            ) : (
              <Headphones className="h-4 w-4" />
            )}
            {item.kind === 'TASK' ? 'Task' : 'Chamado'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-[#9b9ba3] hover:bg-[#292936] hover:text-white"
            aria-label="Fechar detalhes"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {item.kind === 'TASK' ? (
          <TaskEditInline
            task={item.task}
            projects={projects}
            availableTags={tags}
            onAvailableTagsChange={mergeTags}
            onCancel={onClose}
            onSuccess={() => {
              void onReload();
              onClose();
            }}
            collaboration={
              workspace?.collaboration || { teams: [], members: [] }
            }
          />
        ) : (
          <TicketDetail
            ticket={item.ticket}
            queues={workspace?.queues || []}
            teams={teams}
            members={members}
            userId={userId}
            busy={busy}
            run={run}
            organizationId={item.ticket.organizationId}
          />
        )}
      </div>
    </div>
  );
}

function TicketComposer({
  organizationId,
  queues,
  teams,
  members,
  busy,
  onClose,
  onCreate,
}: {
  organizationId: string;
  queues: WorkWorkspace['queues'];
  teams: Array<{ id: string; name: string; active: boolean }>;
  members: Array<{ id: string; name: string | null; username: string }>;
  busy: string | null;
  onClose: () => void;
  onCreate: (input: Parameters<typeof createTicket>[0]) => Promise<void>;
}) {
  const activeQueues = queues.filter((queue) => queue.active);
  return (
    <form
      action={async (formData) =>
        onCreate({
          organizationId,
          queueId: String(formData.get('queueId') || ''),
          title: String(formData.get('title') || ''),
          description: String(formData.get('description') || ''),
          priority: String(
            formData.get('priority') || 'MEDIUM'
          ) as TicketPriority,
          teamId: String(formData.get('teamId') || '') || null,
          assigneeId: String(formData.get('assigneeId') || '') || null,
        })
      }
      className="grid gap-3 rounded-xl border border-sky-500/20 bg-[#171a1d] p-4 lg:grid-cols-2"
    >
      <div className="flex items-center justify-between lg:col-span-2">
        <h2 className="flex items-center gap-2 text-sm font-medium text-white">
          <Headphones className="h-4 w-4 text-sky-300" /> Novo chamado
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-[#9b9ba3]"
        >
          Cancelar
        </button>
      </div>
      <input
        name="title"
        required
        maxLength={240}
        placeholder="Título"
        className={inputClass}
      />
      <select name="queueId" required className={inputClass}>
        <option value="">Selecione a fila</option>
        {activeQueues.map((queue) => (
          <option key={queue.id} value={queue.id}>
            {queue.name}
          </option>
        ))}
      </select>
      <textarea
        name="description"
        required
        maxLength={20000}
        placeholder="Descreva a solicitação"
        className={`${inputClass} min-h-28 py-3 lg:col-span-2`}
      />
      <select name="priority" defaultValue="MEDIUM" className={inputClass}>
        {(Object.keys(priorityLabels) as WorkPriority[]).map((priority) => (
          <option key={priority} value={priority}>
            {priorityLabels[priority]}
          </option>
        ))}
      </select>
      <select name="teamId" className={inputClass}>
        <option value="">Equipe padrão da fila</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
      <select name="assigneeId" className={inputClass}>
        <option value="">Sem responsável</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name || `@${member.username}`}
          </option>
        ))}
      </select>
      <button
        disabled={busy !== null || activeQueues.length === 0}
        className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-[#6f55d9] px-4 text-sm text-white disabled:opacity-50"
      >
        {busy === 'create-ticket' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Abrir chamado
      </button>
      {activeQueues.length === 0 && (
        <p className="text-xs text-amber-300">Uma fila ativa é obrigatória.</p>
      )}
    </form>
  );
}

function NewWorkChooser({
  canCreateTicket,
  onSelect,
  onClose,
}: {
  canCreateTicket: boolean;
  onSelect: (composer: Composer) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#6f55d9]/30 bg-[#19191d] p-3">
      <span className="mr-2 text-sm text-white">Criar:</span>
      <button
        type="button"
        onClick={() => onSelect('task')}
        className={choiceClass}
      >
        <CheckSquare2 className="h-4 w-4" /> Tarefa rápida
      </button>
      <button
        type="button"
        onClick={() => onSelect('bulk')}
        className={choiceClass}
      >
        <List className="h-4 w-4" /> Tarefas em lote
      </button>
      <button
        type="button"
        disabled={!canCreateTicket}
        onClick={() => onSelect('ticket')}
        className={`${choiceClass} disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <Headphones className="h-4 w-4" /> Chamado
      </button>
      <button
        type="button"
        onClick={onClose}
        className="ml-auto p-2 text-[#777780]"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      required={required}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    >
      <option value="">{required ? `${label} obrigatória` : label}</option>
      {options.map(([optionValue, optionLabel]) => (
        <option key={optionValue} value={optionValue}>
          {optionLabel}
        </option>
      ))}
    </select>
  );
}

function QuickFilter({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onClick} className={tabClass(active)}>
      {icon}
      {label}
    </button>
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`rounded p-1.5 ${active ? 'bg-[#292936] text-[#c9b8ff]' : 'text-[#777780]'}`}
    >
      {icon}
    </button>
  );
}

function Badge({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`rounded border border-[#303036] bg-[#202024] px-1.5 py-0.5 text-[10px] text-[#b9b9c1] ${className}`}
    >
      {children}
    </span>
  );
}

function tabClass(active: boolean) {
  return `inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs transition disabled:opacity-40 ${
    active
      ? 'border-[#6f55d9]/40 bg-[#6f55d9]/15 text-[#c9b8ff]'
      : 'border-[#303036] bg-[#17171a] text-[#9b9ba3] hover:text-white'
  }`;
}

const choiceClass =
  'inline-flex h-9 items-center gap-2 rounded-md border border-[#303036] bg-[#202024] px-3 text-xs text-[#d5d5da] hover:border-[#6f55d9]/40';

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}
