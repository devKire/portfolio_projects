'use client';

import {
  ArrowDown,
  ArrowUp,
  Check,
  ExternalLink,
  Github,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import Image from 'next/image';
import type { Dispatch, KeyboardEvent, ReactNode, SetStateAction } from 'react';
import { useEffect, useMemo, useState } from 'react';

import {
  createProject,
  deleteProject,
  getProjects,
  ProjectFormData,
  reorderProjects,
  setProjectActive,
  toggleProjectFeatured,
  updateProject,
} from '@/app/actions/project';

const FALLBACK_PROJECT_IMAGE = '/file.svg';

const DEFAULT_CATEGORIES = [
  'Sistema Web',
  'Portfólio Pessoal',
  'Serviços Profissionais',
  'Página de Vendas',
  'Institucional',
];

const STATUS_OPTIONS = [
  { value: 'completed', label: 'Concluído' },
  { value: 'in-progress', label: 'Em desenvolvimento' },
  { value: 'planned', label: 'Planejado' },
] as const;

type ProjectStatus = (typeof STATUS_OPTIONS)[number]['value'];
type ActiveFilter = 'all' | 'active' | 'inactive';
type FeaturedFilter = 'all' | 'featured' | 'standard';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type ProjectWithCounts = {
  id: string;
  title: string;
  category: string;
  description: string;
  fullDescription: string;
  image: string;
  technologies: string[];
  liveUrl: string | null;
  githubUrl: string | null;
  featured: boolean;
  isActive: boolean;
  status: string;
  accentColor: string | null;
  position: number;
  landingpageId: string;
  _count?: {
    tasks: number;
    features: number;
    sprints: number;
  };
};

type ProjectDraft = ProjectFormData;

const emptyDraft = (): ProjectDraft => ({
  title: '',
  category: DEFAULT_CATEGORIES[0],
  description: '',
  fullDescription: '',
  image: '',
  technologies: [],
  liveUrl: '',
  githubUrl: '',
  featured: false,
  isActive: true,
  status: 'in-progress',
  accentColor: 'from-gray-500/20 to-gray-600/20',
});

function statusLabel(status: string) {
  return (
    STATUS_OPTIONS.find((option) => option.value === status)?.label || status
  );
}

function statusClass(status: string) {
  if (status === 'completed')
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  if (status === 'in-progress')
    return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return 'border-[#6f55d9]/30 bg-[#6f55d9]/10 text-sky-200';
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b)
  );
}

export default function Projects() {
  const [projects, setProjects] = useState<ProjectWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [editingProject, setEditingProject] =
    useState<ProjectWithCounts | null>(null);
  const [draft, setDraft] = useState<ProjectDraft>(emptyDraft);
  const [techInput, setTechInput] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>(
    'all'
  );
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [featuredFilter, setFeaturedFilter] = useState<FeaturedFilter>('all');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await getProjects();
      setProjects(data as ProjectWithCounts[]);
    } catch (error) {
      console.error('Error loading projects:', error);
      setErrorMessage('Não foi possível carregar os projetos.');
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(
    () =>
      uniqueValues([
        ...DEFAULT_CATEGORIES,
        ...projects.map((project) => project.category),
      ]),
    [projects]
  );

  const stats = useMemo(
    () => ({
      total: projects.length,
      active: projects.filter((project) => project.isActive).length,
      inactive: projects.filter((project) => !project.isActive).length,
      inProgress: projects.filter((project) => project.status === 'in-progress')
        .length,
      completed: projects.filter((project) => project.status === 'completed')
        .length,
      featured: projects.filter((project) => project.featured).length,
    }),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    const term = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        !term ||
        [
          project.title,
          project.category,
          project.description,
          ...project.technologies,
        ]
          .join(' ')
          .toLowerCase()
          .includes(term);

      const matchesActive =
        activeFilter === 'all' ||
        (activeFilter === 'active' && project.isActive) ||
        (activeFilter === 'inactive' && !project.isActive);

      const matchesStatus =
        statusFilter === 'all' || project.status === statusFilter;

      const matchesCategory =
        categoryFilter === 'all' || project.category === categoryFilter;

      const matchesFeatured =
        featuredFilter === 'all' ||
        (featuredFilter === 'featured' && project.featured) ||
        (featuredFilter === 'standard' && !project.featured);

      return (
        matchesSearch &&
        matchesActive &&
        matchesStatus &&
        matchesCategory &&
        matchesFeatured
      );
    });
  }, [
    activeFilter,
    categoryFilter,
    featuredFilter,
    projects,
    search,
    statusFilter,
  ]);

  const hasFilters =
    search ||
    activeFilter !== 'all' ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    featuredFilter !== 'all';

  const resetFilters = () => {
    setSearch('');
    setActiveFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
    setFeaturedFilter('all');
  };

  const startCreate = () => {
    setDraft(emptyDraft());
    setEditingProject(null);
    setSaveState('idle');
    setErrorMessage('');
    setAdvancedOpen(false);
    setShowForm(true);
  };

  const startEdit = (project: ProjectWithCounts) => {
    setDraft({
      title: project.title,
      category: project.category,
      description: project.description,
      fullDescription: project.fullDescription,
      image: project.image,
      technologies: project.technologies,
      liveUrl: project.liveUrl || '',
      githubUrl: project.githubUrl || '',
      featured: project.featured,
      isActive: project.isActive,
      status: project.status as ProjectStatus,
      accentColor: project.accentColor || 'from-gray-500/20 to-gray-600/20',
      landingpageId: project.landingpageId,
    });
    setEditingProject(project);
    setSaveState('idle');
    setErrorMessage('');
    setAdvancedOpen(false);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingProject(null);
    setDraft(emptyDraft());
    setTechInput('');
    setSaveState('idle');
    setErrorMessage('');
  };

  const addTechnology = () => {
    const value = techInput.trim();
    if (!value) return;

    setDraft((current) => ({
      ...current,
      technologies: Array.from(new Set([...current.technologies, value])),
    }));
    setTechInput('');
  };

  const removeTechnology = (technology: string) => {
    setDraft((current) => ({
      ...current,
      technologies: current.technologies.filter((item) => item !== technology),
    }));
  };

  const normalizedDraft = (): ProjectDraft => ({
    ...draft,
    title: draft.title.trim(),
    category: draft.category.trim(),
    description: draft.description.trim(),
    fullDescription: draft.fullDescription.trim() || draft.description.trim(),
    image: draft.image.trim() || FALLBACK_PROJECT_IMAGE,
    technologies: draft.technologies.map((tech) => tech.trim()).filter(Boolean),
    liveUrl: draft.liveUrl?.trim() || '',
    githubUrl: draft.githubUrl?.trim() || '',
    accentColor: draft.accentColor?.trim() || 'from-gray-500/20 to-gray-600/20',
  });

  const handleSubmit = async () => {
    const nextDraft = normalizedDraft();

    if (!nextDraft.title || !nextDraft.category || !nextDraft.description) {
      setErrorMessage('Título, categoria e descrição curta são obrigatórios.');
      setSaveState('error');
      return;
    }

    try {
      setSaveState('saving');
      setErrorMessage('');

      if (editingProject) {
        const saved = await updateProject(editingProject.id, nextDraft);
        setProjects((current) =>
          current.map((project) =>
            project.id === editingProject.id
              ? (saved as ProjectWithCounts)
              : project
          )
        );
      } else {
        const created = await createProject(nextDraft);
        setProjects((current) => [...current, created as ProjectWithCounts]);
      }

      setSaveState('saved');
      window.setTimeout(closeForm, 450);
    } catch (error) {
      console.error('Error saving project:', error);
      setSaveState('error');
      setErrorMessage('Erro ao salvar. O rascunho foi preservado.');
    }
  };

  const handleFormKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeForm();
    }

    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const updateProjectLocally = (
    id: string,
    updater: (project: ProjectWithCounts) => ProjectWithCounts
  ) => {
    setProjects((current) =>
      current.map((project) => (project.id === id ? updater(project) : project))
    );
  };

  const handleToggleActive = async (project: ProjectWithCounts) => {
    const previous = project.isActive;
    setUpdatingId(project.id);
    updateProjectLocally(project.id, (item) => ({
      ...item,
      isActive: !previous,
    }));

    try {
      const saved = await setProjectActive(project.id, !previous);
      updateProjectLocally(project.id, () => saved as ProjectWithCounts);
    } catch (error) {
      console.error('Error toggling project active state:', error);
      updateProjectLocally(project.id, (item) => ({
        ...item,
        isActive: previous,
      }));
      setErrorMessage('Não foi possível alterar o estado do projeto.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleFeatured = async (project: ProjectWithCounts) => {
    const previous = project.featured;
    setUpdatingId(project.id);
    updateProjectLocally(project.id, (item) => ({
      ...item,
      featured: !previous,
    }));

    try {
      const saved = await toggleProjectFeatured(project.id, !previous);
      updateProjectLocally(project.id, () => saved as ProjectWithCounts);
    } catch (error) {
      console.error('Error toggling featured state:', error);
      updateProjectLocally(project.id, (item) => ({
        ...item,
        featured: previous,
      }));
      setErrorMessage('Não foi possível alterar o destaque.');
    } finally {
      setUpdatingId(null);
    }
  };

  const moveProject = async (projectId: string, direction: 'up' | 'down') => {
    const currentIndex = projects.findIndex(
      (project) => project.id === projectId
    );
    if (currentIndex < 0) return;
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === projects.length - 1) return;

    const previousProjects = projects;
    const nextProjects = [...projects];
    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const [project] = nextProjects.splice(currentIndex, 1);
    nextProjects.splice(nextIndex, 0, project);

    const positionedProjects = nextProjects.map((item, index) => ({
      ...item,
      position: index,
    }));

    setProjects(positionedProjects);
    setIsReordering(true);

    try {
      await reorderProjects(
        positionedProjects.map((item) => ({
          id: item.id,
          position: item.position,
        }))
      );
    } catch (error) {
      console.error('Error reordering projects:', error);
      setProjects(previousProjects);
      setErrorMessage(
        'A ordem não foi salva. A lista voltou ao estado anterior.'
      );
    } finally {
      setIsReordering(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    setUpdatingId(deletingId);
    try {
      await deleteProject(deletingId);
      setProjects((current) =>
        current
          .filter((project) => project.id !== deletingId)
          .map((project, index) => ({ ...project, position: index }))
      );
      setDeletingId(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      setErrorMessage(
        'Não foi possível excluir. Se o projeto tem histórico, inative-o.'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && !projects.length) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#9a8cff]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-[#2f2f35] bg-[#1e1e22] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wide text-[#777780] uppercase">
              Portfolio workspace
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-[#f2f2f3]">
              Projects
            </h2>
            <p className="mt-1 text-sm text-[#9b9ba3]">
              Organize portfolio, clientes e trabalhos sem perder vínculo com
              tasks.
            </p>
          </div>

          <button
            type="button"
            onClick={startCreate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#6f55d9] px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-[#9a8cff] focus:ring-2 focus:ring-[#c9b8ff] focus:outline-none"
          >
            <Plus className="h-4 w-4" />
            Novo Projeto
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Ativos" value={stats.active} tone="green" />
          <StatCard label="Inativos" value={stats.inactive} tone="slate" />
          <StatCard
            label="Em desenvolvimento"
            value={stats.inProgress}
            tone="amber"
          />
          <StatCard label="Concluídos" value={stats.completed} tone="green" />
          <StatCard label="Destaques" value={stats.featured} tone="yellow" />
        </div>
      </section>

      <section className="rounded-lg border border-[#2f2f35] bg-[#1e1e22] p-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(4,minmax(140px,180px))_auto]">
          <label className="relative">
            <span className="sr-only">Buscar projetos</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#777780]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por título, categoria, tecnologia..."
              className="h-11 w-full rounded-md border border-[#2f2f35] bg-[#19191d] pr-3 pl-9 text-sm text-[#f2f2f3] transition outline-none placeholder:text-[#777780] focus:border-[#6f55d9]"
            />
          </label>

          <FilterSelect
            label="Estado"
            value={activeFilter}
            onChange={(value) => setActiveFilter(value as ActiveFilter)}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'active', label: 'Ativos' },
              { value: 'inactive', label: 'Inativos' },
            ]}
          />

          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={(value) =>
              setStatusFilter(value as 'all' | ProjectStatus)
            }
            options={[
              { value: 'all', label: 'Todos status' },
              ...STATUS_OPTIONS,
            ]}
          />

          <FilterSelect
            label="Categoria"
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: 'all', label: 'Todas categorias' },
              ...categories.map((category) => ({
                value: category,
                label: category,
              })),
            ]}
          />

          <FilterSelect
            label="Destaque"
            value={featuredFilter}
            onChange={(value) => setFeaturedFilter(value as FeaturedFilter)}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'featured', label: 'Destacados' },
              { value: 'standard', label: 'Sem destaque' },
            ]}
          />

          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasFilters}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#2f2f35] px-3 text-sm text-[#dcddde] transition hover:border-[#33333a] hover:bg-[#24242a] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
            Limpar
          </button>
        </div>
      </section>

      {showForm && (
        <section
          onKeyDown={handleFormKeyDown}
          className="rounded-lg border border-[#6f55d9]/30 bg-[#19191d] p-4 shadow-xl shadow-sky-950/20"
        >
          <ProjectForm
            advancedOpen={advancedOpen}
            draft={draft}
            editing={Boolean(editingProject)}
            errorMessage={errorMessage}
            saveState={saveState}
            techInput={techInput}
            categories={categories}
            onAddTechnology={addTechnology}
            onCancel={closeForm}
            onRemoveTechnology={removeTechnology}
            onSave={handleSubmit}
            onSetAdvancedOpen={setAdvancedOpen}
            onSetDraft={setDraft}
            onSetTechInput={setTechInput}
          />
        </section>
      )}

      {errorMessage && !showForm && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#9b9ba3]">
            {filteredProjects.length} de {projects.length} projetos
            {isReordering && (
              <span className="ml-2 text-amber-300">Salvando ordem...</span>
            )}
          </p>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#303036] bg-[#1e1e22] p-8 text-center">
            <p className="text-sm text-[#dcddde]">
              Nenhum projeto encontrado com os filtros atuais.
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 text-sm font-medium text-[#c9b8ff] hover:text-sky-200"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {filteredProjects.map((project) => {
              const fullIndex = projects.findIndex(
                (item) => item.id === project.id
              );

              return (
                <ProjectCard
                  key={project.id}
                  disabled={updatingId === project.id || isReordering}
                  isFirst={fullIndex === 0}
                  isLast={fullIndex === projects.length - 1}
                  project={project}
                  onDelete={() => setDeletingId(project.id)}
                  onEdit={() => startEdit(project)}
                  onMoveDown={() => moveProject(project.id, 'down')}
                  onMoveUp={() => moveProject(project.id, 'up')}
                  onToggleActive={() => handleToggleActive(project)}
                  onToggleFeatured={() => handleToggleFeatured(project)}
                />
              );
            })}
          </div>
        )}
      </section>

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-[#303036] bg-[#19191d] p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-[#f2f2f3]">
              Excluir projeto
            </h3>
            <p className="mt-2 text-sm text-[#9b9ba3]">
              Exclusão é bloqueada quando há tasks, features ou sprints
              vinculadas. Para remover da rotina, inative o projeto.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={updatingId === deletingId}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-red-500 px-3 text-sm font-medium text-white transition hover:bg-red-400 disabled:opacity-50"
              >
                {updatingId === deletingId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Excluir
              </button>
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="h-10 flex-1 rounded-md border border-[#303036] px-3 text-sm font-medium text-[#dcddde] transition hover:bg-[#24242a]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = 'sky',
}: {
  label: string;
  value: number;
  tone?: 'sky' | 'green' | 'amber' | 'yellow' | 'slate';
}) {
  const toneClass = {
    sky: 'text-sky-200',
    green: 'text-emerald-200',
    amber: 'text-amber-200',
    yellow: 'text-yellow-200',
    slate: 'text-[#f2f2f3]',
  }[tone];

  return (
    <div className="rounded-md border border-[#2f2f35] bg-[#202024] p-3">
      <p className="text-xs text-[#777780]">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-md border border-[#2f2f35] bg-[#19191d] px-3 text-sm text-[#f2f2f3] transition outline-none focus:border-[#6f55d9]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProjectForm({
  advancedOpen,
  draft,
  editing,
  errorMessage,
  saveState,
  techInput,
  categories,
  onAddTechnology,
  onCancel,
  onRemoveTechnology,
  onSave,
  onSetAdvancedOpen,
  onSetDraft,
  onSetTechInput,
}: {
  advancedOpen: boolean;
  draft: ProjectDraft;
  editing: boolean;
  errorMessage: string;
  saveState: SaveState;
  techInput: string;
  categories: string[];
  onAddTechnology: () => void;
  onCancel: () => void;
  onRemoveTechnology: (technology: string) => void;
  onSave: () => void;
  onSetAdvancedOpen: (open: boolean) => void;
  onSetDraft: Dispatch<SetStateAction<ProjectDraft>>;
  onSetTechInput: (value: string) => void;
}) {
  const saving = saveState === 'saving';

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
      className="space-y-4"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#f2f2f3]">
            {editing ? 'Editar projeto' : 'Novo projeto'}
          </h3>
          <p className="mt-1 text-sm text-[#9b9ba3]">
            Campos principais primeiro. Salve com Ctrl/Cmd + Enter ou cancele
            com Esc.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveState === 'saved' && (
            <span className="text-sm text-emerald-300">Salvo</span>
          )}
          {saveState === 'error' && (
            <span className="text-sm text-red-300">Erro</span>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#303036] px-3 text-sm text-[#dcddde] transition hover:bg-[#24242a]"
          >
            <X className="h-4 w-4" />
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-500 px-4 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <Field label="Título *">
          <input
            value={draft.title}
            onChange={(event) =>
              onSetDraft((current) => ({
                ...current,
                title: event.target.value,
              }))
            }
            className="project-input"
            placeholder="Portfolio OS"
            autoFocus
          />
        </Field>

        <Field label="Categoria *">
          <input
            value={draft.category}
            onChange={(event) =>
              onSetDraft((current) => ({
                ...current,
                category: event.target.value,
              }))
            }
            list="project-categories"
            className="project-input"
          />
          <datalist id="project-categories">
            {categories.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </Field>

        <Field label="Descrição curta *" className="lg:col-span-2">
          <textarea
            value={draft.description}
            onChange={(event) =>
              onSetDraft((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            className="project-input min-h-20 resize-y"
            placeholder="Resumo escaneável para cards e filtros."
          />
        </Field>

        <Field label="Status">
          <select
            value={draft.status}
            onChange={(event) =>
              onSetDraft((current) => ({
                ...current,
                status: event.target.value as ProjectStatus,
              }))
            }
            className="project-input"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <ToggleField
            checked={draft.isActive}
            label="Ativo"
            onChange={(checked) =>
              onSetDraft((current) => ({ ...current, isActive: checked }))
            }
          />
          <ToggleField
            checked={draft.featured}
            label="Destaque"
            onChange={(checked) =>
              onSetDraft((current) => ({ ...current, featured: checked }))
            }
          />
        </div>

        <Field label="Tecnologias" className="lg:col-span-2">
          <div className="flex gap-2">
            <input
              value={techInput}
              onChange={(event) => onSetTechInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) {
                  event.preventDefault();
                  onAddTechnology();
                }
              }}
              className="project-input"
              placeholder="React, Prisma, Tailwind..."
            />
            <button
              type="button"
              onClick={onAddTechnology}
              className="h-11 rounded-md border border-[#303036] px-3 text-sm text-[#f2f2f3] transition hover:bg-[#24242a]"
            >
              Adicionar
            </button>
          </div>

          {draft.technologies.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {draft.technologies.map((technology) => (
                <span
                  key={technology}
                  className="inline-flex items-center gap-1 rounded-md border border-[#303036] bg-[#19191d] px-2 py-1 text-xs text-[#f2f2f3]"
                >
                  {technology}
                  <button
                    type="button"
                    onClick={() => onRemoveTechnology(technology)}
                    className="rounded text-[#777780] hover:text-red-300"
                    aria-label={`Remover ${technology}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </Field>
      </div>

      <button
        type="button"
        onClick={() => onSetAdvancedOpen(!advancedOpen)}
        className="text-sm font-medium text-[#c9b8ff] hover:text-sky-200"
      >
        {advancedOpen ? 'Ocultar campos avançados' : 'Mostrar campos avançados'}
      </button>

      {advancedOpen && (
        <div className="grid gap-3 border-t border-[#2f2f35] pt-4 lg:grid-cols-2">
          <Field label="Descrição completa" className="lg:col-span-2">
            <textarea
              value={draft.fullDescription}
              onChange={(event) =>
                onSetDraft((current) => ({
                  ...current,
                  fullDescription: event.target.value,
                }))
              }
              className="project-input min-h-28 resize-y"
              placeholder="Se vazio, a descrição curta será usada."
            />
          </Field>

          <Field label="URL da imagem">
            <input
              value={draft.image}
              onChange={(event) =>
                onSetDraft((current) => ({
                  ...current,
                  image: event.target.value,
                }))
              }
              className="project-input"
              placeholder="https://..."
            />
          </Field>

          <div className="overflow-hidden rounded-md border border-[#2f2f35] bg-[#19191d]">
            <div className="relative h-28">
              {draft.image ? (
                <Image
                  src={draft.image}
                  alt="Preview do projeto"
                  fill
                  sizes="320px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[#777780]">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
            </div>
          </div>

          <Field label="Live URL">
            <input
              value={draft.liveUrl}
              onChange={(event) =>
                onSetDraft((current) => ({
                  ...current,
                  liveUrl: event.target.value,
                }))
              }
              className="project-input"
              placeholder="https://..."
            />
          </Field>

          <Field label="GitHub URL">
            <input
              value={draft.githubUrl}
              onChange={(event) =>
                onSetDraft((current) => ({
                  ...current,
                  githubUrl: event.target.value,
                }))
              }
              className="project-input"
              placeholder="https://github.com/..."
            />
          </Field>

          <Field label="Accent color">
            <input
              value={draft.accentColor}
              onChange={(event) =>
                onSetDraft((current) => ({
                  ...current,
                  accentColor: event.target.value,
                }))
              }
              className="project-input"
              placeholder="from-gray-500/20 to-gray-600/20"
            />
          </Field>
        </div>
      )}
    </form>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-medium text-[#9b9ba3]">
        {label}
      </span>
      {children}
    </label>
  );
}

function ToggleField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex h-full min-h-11 items-center justify-between gap-3 rounded-md border border-[#2f2f35] bg-[#19191d] px-3">
      <span className="text-sm text-[#f2f2f3]">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-600 bg-[#19191d] text-[#6f55d9] focus:ring-[#9a8cff]"
      />
    </label>
  );
}

function ProjectCard({
  disabled,
  isFirst,
  isLast,
  project,
  onDelete,
  onEdit,
  onMoveDown,
  onMoveUp,
  onToggleActive,
  onToggleFeatured,
}: {
  disabled: boolean;
  isFirst: boolean;
  isLast: boolean;
  project: ProjectWithCounts;
  onDelete: () => void;
  onEdit: () => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onToggleActive: () => void;
  onToggleFeatured: () => void;
}) {
  return (
    <article
      onDoubleClick={onEdit}
      className="group rounded-lg border border-[#2f2f35] bg-[#19191d]/60 p-3 transition hover:border-[#303036] hover:bg-[#19191d]"
    >
      <div className="flex gap-3">
        <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-md border border-[#2f2f35] bg-[#19191d]">
          <Image
            src={project.image || FALLBACK_PROJECT_IMAGE}
            alt={project.title}
            fill
            sizes="112px"
            className="object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-[#f2f2f3]">
                  {project.title}
                </h3>
                {project.featured && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-200">
                    <Star className="h-3 w-3 fill-current" />
                    Destaque
                  </span>
                )}
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-[#9b9ba3]">
                {project.description}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1 opacity-100 transition md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
              <IconButton
                label="Mover para cima"
                disabled={disabled || isFirst}
                onClick={onMoveUp}
              >
                <ArrowUp className="h-4 w-4" />
              </IconButton>
              <IconButton
                label="Mover para baixo"
                disabled={disabled || isLast}
                onClick={onMoveDown}
              >
                <ArrowDown className="h-4 w-4" />
              </IconButton>
              <IconButton label="Editar" disabled={disabled} onClick={onEdit}>
                <Pencil className="h-4 w-4" />
              </IconButton>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>{project.category}</Badge>
            <Badge className={statusClass(project.status)}>
              {statusLabel(project.status)}
            </Badge>
            <Badge
              className={
                project.isActive
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                  : 'border-slate-600 bg-[#24242a] text-[#9b9ba3]'
              }
            >
              {project.isActive ? 'Ativo' : 'Inativo'}
            </Badge>
            <Badge>#{project.position + 1}</Badge>
          </div>

          {project.technologies.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {project.technologies.slice(0, 6).map((technology) => (
                <span
                  key={technology}
                  className="rounded-md bg-[#19191d] px-2 py-1 text-xs text-[#dcddde]"
                >
                  {technology}
                </span>
              ))}
              {project.technologies.length > 6 && (
                <span className="rounded-md bg-[#19191d] px-2 py-1 text-xs text-[#777780]">
                  +{project.technologies.length - 6}
                </span>
              )}
            </div>
          )}

          <div className="mt-3 flex flex-col gap-3 border-t border-[#2f2f35] pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-3 text-xs text-[#777780]">
              <span>{project._count?.tasks || 0} tasks</span>
              <span>{project._count?.features || 0} features</span>
              <span>{project._count?.sprints || 0} sprints</span>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {project.liveUrl && (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-[#2f2f35] px-2 text-xs text-[#dcddde] transition hover:border-[#6f55d9]/50 hover:text-sky-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Live
                </a>
              )}
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-[#2f2f35] px-2 text-xs text-[#dcddde] transition hover:border-slate-500 hover:text-[#f2f2f3]"
                >
                  <Github className="h-3.5 w-3.5" />
                  GitHub
                </a>
              )}
              <IconButton
                label={project.isActive ? 'Inativar' : 'Reativar'}
                disabled={disabled}
                onClick={onToggleActive}
              >
                <Power className="h-4 w-4" />
              </IconButton>
              <IconButton
                label={project.featured ? 'Remover destaque' : 'Destacar'}
                disabled={disabled}
                onClick={onToggleFeatured}
              >
                <Star
                  className={
                    project.featured ? 'h-4 w-4 fill-current' : 'h-4 w-4'
                  }
                />
              </IconButton>
              <IconButton
                label="Excluir"
                disabled={disabled}
                onClick={onDelete}
                danger
              >
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Badge({
  children,
  className = 'border-[#303036] bg-[#19191d] text-[#dcddde]',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${className}`}
    >
      {children}
    </span>
  );
}

function IconButton({
  children,
  danger,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border transition disabled:cursor-not-allowed disabled:opacity-35 ${
        danger
          ? 'border-red-500/20 text-red-300 hover:bg-red-500/10'
          : 'border-[#2f2f35] text-[#9b9ba3] hover:border-[#33333a] hover:bg-[#24242a] hover:text-[#f2f2f3]'
      }`}
    >
      {children}
    </button>
  );
}
