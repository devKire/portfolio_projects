/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  Edit,
  Eye,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

import {
  createProject,
  deleteProject,
  getProjects,
  ProjectFormData,
  reorderProjects,
  updateProject,
} from "@/app/actions/project";

// Supondo que você tenha uma landingpage padrão
const DEFAULT_LANDINGPAGE_ID = "3eb3839d-eb78-43ed-9eb7-8f39352d64bb";

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [isReordering, setIsReordering] = useState(false);
  // Form state
  const [formData, setFormData] = useState<ProjectFormData>({
    title: "",
    category: "Sistema Web",
    description: "",
    fullDescription: "",
    image: "",
    technologies: [],
    liveUrl: "",
    githubUrl: "",
    featured: false,
    status: "completed",
    accentColor: "from-gray-500/20 to-gray-600/20",
    landingpageId: DEFAULT_LANDINGPAGE_ID,
  });

  const [techInput, setTechInput] = useState("");

  // Categorias disponíveis
  const categories = [
    "Sistema Web",
    "Portfólio Pessoal",
    "Serviços Profissionais",
    "Página de Vendas",
    "Institucional",
  ];

  // Status disponíveis
  const statusOptions = [
    { value: "completed", label: "Concluído" },
    { value: "in-progress", label: "Em Desenvolvimento" },
    { value: "planned", label: "Planejado" },
  ];

  // Carregar projetos
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await getProjects(DEFAULT_LANDINGPAGE_ID);
      setProjects(data);
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoading(false);
    }
  };

  // Adicionar tecnologia
  const addTechnology = () => {
    if (techInput.trim()) {
      setFormData({
        ...formData,
        technologies: [...formData.technologies, techInput.trim()],
      });
      setTechInput("");
    }
  };

  // Remover tecnologia
  const removeTechnology = (index: number) => {
    const newTech = [...formData.technologies];
    newTech.splice(index, 1);
    setFormData({ ...formData, technologies: newTech });
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      category: "Sistema Web",
      description: "",
      fullDescription: "",
      image: "",
      technologies: [],
      liveUrl: "",
      githubUrl: "",
      featured: false,
      status: "completed",
      accentColor: "from-gray-500/20 to-gray-600/20",
      landingpageId: DEFAULT_LANDINGPAGE_ID,
    });
    setEditingProject(null);
    setShowForm(false);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingProject) {
        await updateProject(editingProject.id, formData);
      } else {
        await createProject(formData);
      }
      resetForm();
      await loadProjects();
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Erro ao salvar projeto");
    } finally {
      setLoading(false);
    }
  };

  // Iniciar edição
  const startEdit = (project: any) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      category: project.category,
      description: project.description,
      fullDescription: project.fullDescription,
      image: project.image,
      technologies: project.technologies,
      liveUrl: project.liveUrl || "",
      githubUrl: project.githubUrl || "",
      featured: project.featured,
      status: project.status,
      accentColor: project.accentColor || "from-gray-500/20 to-gray-600/20",
      landingpageId: project.landingpageId,
    });
    setShowForm(true);
  };
  // Deletar projeto
  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja deletar este projeto?")) return;

    setLoading(true);
    try {
      await deleteProject(id);
      await loadProjects();
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Erro ao deletar projeto");
    } finally {
      setLoading(false);
      setDeletingId(null);
    }
  };

  // Reordenar projeto
  const moveProject = async (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === projects.length - 1)
    ) {
      return;
    }

    setIsReordering(true);
    const newProjects = [...projects];
    const newIndex = direction === "up" ? index - 1 : index + 1;

    // Trocar posições
    const temp = newProjects[index];
    newProjects[index] = newProjects[newIndex];
    newProjects[newIndex] = temp;

    // Recalcular todas as posições
    const projectsWithUpdatedPositions = newProjects.map((project, idx) => ({
      ...project,
      position: idx,
    }));

    setProjects(projectsWithUpdatedPositions);

    try {
      // Enviar array completo com posições atualizadas
      await reorderProjects(
        projectsWithUpdatedPositions.map((p) => ({
          id: p.id,
          position: p.position,
        })),
      );
    } catch (error) {
      console.error("Error reordering projects:", error);
      await loadProjects(); // Recarregar se der erro
    } finally {
      setIsReordering(false);
    }
  };

  if (loading && !projects.length) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Header do componente Projects */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Gerenciar Projetos</h2>
          <p className="mt-2 text-gray-400">
            Total de projetos: {projects.length}
            {isReordering && (
              <span className="ml-2 text-yellow-400">
                (Atualizando ordem...)
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-white transition-all hover:from-blue-600 hover:to-purple-700"
          >
            <Plus className="h-5 w-5" />
            Novo Projeto
          </button>
        </div>
      </div>

      {/* Formulário de criação/edição */}
      {showForm && (
        <div className="mb-8 rounded-2xl border border-gray-700/50 bg-gray-800/50 p-6 shadow-2xl backdrop-blur-sm">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">
              {editingProject ? "Editar Projeto" : "Novo Projeto"}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Título */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Título *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2 text-white"
                  required
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Categoria *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2 text-white"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as any,
                    })
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2 text-white"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Featured */}
              <div className="flex items-center">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) =>
                      setFormData({ ...formData, featured: e.target.checked })
                    }
                    className="rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-gray-300">Projeto em Destaque</span>
                </label>
              </div>

              {/* Imagem */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  URL da Imagem *
                </label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) =>
                    setFormData({ ...formData, image: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2 text-white"
                  required
                />
              </div>

              {/* Descrição Curta */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Descrição Curta *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="h-24 w-full rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2 text-white"
                  required
                />
              </div>

              {/* Descrição Completa */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Descrição Completa *
                </label>
                <textarea
                  value={formData.fullDescription}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fullDescription: e.target.value,
                    })
                  }
                  className="h-32 w-full rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2 text-white"
                  required
                />
              </div>

              {/* Tecnologias */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Tecnologias
                </label>
                <div className="mb-2 flex gap-2">
                  <input
                    type="text"
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addTechnology())
                    }
                    className="flex-1 rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2 text-white"
                    placeholder="Digite uma tecnologia e pressione Enter"
                  />
                  <button
                    type="button"
                    onClick={addTechnology}
                    className="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {formData.technologies.map((tech, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 rounded-full bg-gray-700 px-3 py-1"
                    >
                      <span className="text-sm text-gray-200">{tech}</span>
                      <button
                        type="button"
                        onClick={() => removeTechnology(index)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Links */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  URL Live
                </label>
                <input
                  type="url"
                  value={formData.liveUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, liveUrl: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2 text-white"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  URL GitHub
                </label>
                <input
                  type="url"
                  value={formData.githubUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, githubUrl: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2 text-white"
                  placeholder="https://..."
                />
              </div>

              {/* Accent Color */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Cor de Destaque
                </label>
                <input
                  type="text"
                  value={formData.accentColor}
                  onChange={(e) =>
                    setFormData({ ...formData, accentColor: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2 text-white"
                  placeholder="from-blue-500/20 to-purple-600/20"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Formato: from-cor-500/20 to-cor-600/20
                </p>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 py-3 font-semibold text-white hover:from-green-600 hover:to-emerald-700 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Salvando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Check className="h-5 w-5" />
                    {editingProject ? "Atualizar" : "Criar"} Projeto
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-600 px-6 py-3 text-gray-300 hover:bg-gray-800"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Projetos */}
      <div className="overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-800/30 backdrop-blur-sm">
        {projects.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400">Nenhum projeto cadastrado ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Ordem (Posição)
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Projeto
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Categoria
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Destaque
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {projects.map((project, index) => (
                  <tr key={project.id} className="hover:bg-gray-800/30">
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => moveProject(index, "up")}
                            disabled={index === 0 || isReordering}
                            className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <span className="text-gray-300">{index + 1}</span>
                          <button
                            onClick={() => moveProject(index, "down")}
                            disabled={
                              index === projects.length - 1 || isReordering
                            }
                            className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="text-xs text-gray-500">
                          Posição: {project.position}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 overflow-hidden rounded bg-gray-700">
                          <Image
                            src={project.image}
                            alt={project.title}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-medium text-white">
                            {project.title}
                          </div>
                          <div className="max-w-xs truncate text-sm text-gray-400">
                            {project.description}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-block rounded-full bg-gray-700 px-3 py-1 text-xs text-gray-300">
                        {project.category}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs ${
                          project.status === "completed"
                            ? "bg-green-500/20 text-green-300"
                            : project.status === "in-progress"
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "bg-blue-500/20 text-blue-300"
                        }`}
                      >
                        {project.status === "completed"
                          ? "Concluído"
                          : project.status === "in-progress"
                            ? "Em Desenvolvimento"
                            : "Planejado"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {project.featured ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 text-xs font-semibold text-black">
                          ★ Destaque
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEdit(project)}
                          className="rounded-lg p-2 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        <a
                          href={project.liveUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg p-2 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </a>

                        <button
                          onClick={() => setDeletingId(project.id)}
                          className="rounded-lg p-2 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          title="Deletar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-gray-800 p-6">
            <h3 className="mb-2 text-xl font-bold text-white">
              Confirmar Exclusão
            </h3>
            <p className="mb-6 text-gray-300">
              Tem certeza que deseja excluir este projeto? Esta ação não pode
              ser desfeita.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleDelete(deletingId)}
                className="flex-1 rounded-lg bg-red-500 py-2 font-semibold text-white hover:bg-red-600"
              >
                Excluir
              </button>
              <button
                onClick={() => setDeletingId(null)}
                className="flex-1 rounded-lg border border-gray-600 py-2 font-semibold text-gray-300 hover:bg-gray-700"
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
