"use client";

import {
  ContactInfo,
  LandingPage,
  Project as PrismaProject,
} from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  ChevronDown,
  Code,
  ExternalLink,
  Eye,
  Filter,
  Search,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useState } from "react";

interface SectionProjectsProps {
  contact: ContactInfo;
  landingpage: LandingPage;
  projects: PrismaProject[];
}

// Interface para o projeto
interface Project {
  id: string;
  title: string;
  category: string;
  description: string;
  fullDescription: string;
  image: string;
  technologies: string[];
  liveUrl?: string;
  githubUrl?: string;
  featured?: boolean;
  status: "completed" | "in-progress" | "planned";
  position: number; // Alterado de 'int' para 'number'
  accentColor?: string;
}

// Função para converter PrismaProject para Project
const convertPrismaProjectToProject = (
  prismaProject: PrismaProject,
): Project => ({
  id: prismaProject.id,
  title: prismaProject.title,
  category: prismaProject.category,
  description: prismaProject.description,
  fullDescription: prismaProject.fullDescription,
  image: prismaProject.image,
  technologies: prismaProject.technologies,
  liveUrl: prismaProject.liveUrl || undefined,
  githubUrl: prismaProject.githubUrl || undefined,
  featured: prismaProject.featured,
  status: prismaProject.status as "completed" | "in-progress" | "planned",
  position: prismaProject.position,
  accentColor: prismaProject.accentColor || "from-gray-500/20 to-gray-600/20",
});

const SectionProjects = ({
  contact,
  landingpage,
  projects: prismaProjects,
}: SectionProjectsProps) => {
  console.log(contact, landingpage);
  // Converter projetos do Prisma para a interface Project
  const projects = useMemo(
    () =>
      // Ordenar por position ao converter
      prismaProjects
        .map(convertPrismaProjectToProject)
        .sort((a, b) => a.position - b.position),
    [prismaProjects],
  );

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filter, setFilter] = useState("Todos");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [visibleProjects, setVisibleProjects] = useState(6);
  const [isMobile, setIsMobile] = useState(false);

  // Detecta se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Extrai categorias únicas dos projetos
  const categories = useMemo(() => {
    const allCategories = [
      "Todos",
      ...Array.from(new Set(projects.map((p) => p.category))),
    ];
    return allCategories.filter(
      (category) =>
        category === "Todos" || projects.some((p) => p.category === category),
    );
  }, [projects]);

  // Filtra projetos com memoização
  const filteredProjects = useMemo(() => {
    let result = projects;

    // Filtro por categoria
    if (filter !== "Todos") {
      result = result.filter((project) => project.category === filter);
    }

    // Busca por texto
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (project) =>
          project.title.toLowerCase().includes(query) ||
          project.description.toLowerCase().includes(query) ||
          project.technologies.some((tech) =>
            tech.toLowerCase().includes(query),
          ),
      );
    }

    // Ordenação FINAL: featured primeiro, depois por position
    result = [...result].sort((a, b) => {
      // Projetos em destaque vêm primeiro
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;

      // Para projetos com mesmo status de destaque, ordena por position
      return a.position - b.position;
    });

    return result;
  }, [filter, searchQuery, projects]);

  // Projetos visíveis (paginados)
  const displayedProjects = useMemo(
    () => filteredProjects.slice(0, visibleProjects),
    [filteredProjects, visibleProjects],
  );

  // Contador de projetos
  const getProjectCountByCategory = useCallback(
    (category: string) => {
      if (category === "Todos") return projects.length;
      return projects.filter((project) => project.category === category).length;
    },
    [projects],
  );

  // Cores de status
  const getStatusColor = (status: Project["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-500 bg-green-500/10";
      case "in-progress":
        return "text-yellow-500 bg-yellow-500/10";
      case "planned":
        return "text-blue-500 bg-blue-500/10";
      default:
        return "text-gray-500 bg-gray-500/10";
    }
  };

  const getStatusText = (status: Project["status"]) => {
    switch (status) {
      case "completed":
        return "Concluído";
      case "in-progress":
        return "Em Desenvolvimento";
      case "planned":
        return "Planejado";
      default:
        return "Indisponível";
    }
  };

  // Carregar mais projetos
  const loadMoreProjects = () => {
    setIsLoading(true);
    setTimeout(() => {
      setVisibleProjects((prev) => Math.min(prev + 6, filteredProjects.length));
      setIsLoading(false);
    }, 300);
  };

  // Função para alternar filtro
  const handleFilterChange = (category: string) => {
    setFilter(category);
    setShowFilterDropdown(false);
    setVisibleProjects(6); // Reset paginação ao mudar filtro
  };

  // Modal de projeto responsivo
  const ProjectModal = () => (
    <AnimatePresence>
      {selectedProject && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/90 p-2 backdrop-blur-lg sm:p-4 md:items-center"
          onClick={() => setSelectedProject(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="mx-2 my-4 w-full max-w-5xl overflow-hidden rounded-xl border border-gray-700/50 bg-gray-900 shadow-2xl shadow-black/50 md:my-auto md:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Sticky */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-700/50 bg-gray-900/95 p-4 backdrop-blur-sm md:p-6">
              <div className="flex-1">
                <h3 className="font-space line-clamp-1 text-lg font-bold md:text-2xl">
                  {selectedProject.title}
                </h3>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-electric-500 text-xs font-semibold md:text-sm">
                    {selectedProject.category}
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${getStatusColor(selectedProject.status)}`}
                  >
                    {getStatusText(selectedProject.status)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="ml-4 flex-shrink-0 rounded-lg p-2 hover:bg-gray-800"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 md:p-6">
              {/* Hero Image */}
              <div className="relative mb-4 aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 md:mb-6 md:rounded-xl">
                <Image
                  src={selectedProject.image}
                  alt={selectedProject.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 80vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
              </div>

              {/* Description */}
              <div className="mb-4 md:mb-6">
                <h4 className="font-space mb-2 flex items-center gap-2 text-base font-semibold md:mb-3 md:text-lg">
                  <Sparkles size={16} className="text-electric-500" />
                  Sobre o Projeto
                </h4>
                <p className="text-sm leading-relaxed text-gray-300 md:text-base">
                  {selectedProject.fullDescription}
                </p>
              </div>

              {/* Technologies */}
              <div className="mb-6 md:mb-8">
                <h4 className="font-space mb-2 flex items-center gap-2 text-base font-semibold md:mb-3 md:text-lg">
                  <Code size={16} className="text-electric-500" />
                  Tecnologias Utilizadas
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-1.5 text-xs md:text-sm"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row">
                {selectedProject.liveUrl && (
                  <a
                    href={selectedProject.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-electric-500 hover:bg-electric-600 flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold transition-colors"
                  >
                    <ExternalLink size={18} />
                    <span>Ver Projeto Online</span>
                    <ArrowUpRight size={16} />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <section
      id="projetos"
      className="relative overflow-hidden bg-gradient-to-b from-gray-900 to-black py-12 md:py-24"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="bg-electric-500/10 absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl md:top-1/4 md:right-1/4 md:h-96 md:w-96" />
        <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl md:bottom-1/4 md:left-1/4 md:h-80 md:w-80" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 text-center md:mb-16"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-800/50 px-4 py-2 backdrop-blur-sm md:px-6 md:py-3">
            <Zap size={16} className="text-electric-500 md:h-5 md:w-5" />
            <span className="text-sm md:text-base">Galeria de Projetos</span>
          </div>

          <h2 className="font-space mb-4 text-2xl font-bold md:text-4xl lg:text-5xl xl:text-6xl">
            Veja os{" "}
            <span className="text-electric-500">{projects.length}+</span>{" "}
            Projetos <span className="text-electric-500">Impactantes</span>
          </h2>
          <p className="mx-auto max-w-3xl text-sm text-gray-400 md:text-base lg:text-lg xl:text-xl">
            Cada imagem conta uma história de inovação, design e excelência
            técnica entre {projects.length} projetos entregues
          </p>
        </motion.div>

        {/* Filtros e Busca */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8 space-y-4 md:mb-12"
        >
          {/* Barra de Busca */}
          <div className="relative">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por projeto, tecnologia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="focus:border-electric-500 focus:ring-electric-500 w-full rounded-xl border border-gray-700 bg-gray-800/50 py-3 pr-4 pl-12 backdrop-blur-sm placeholder:text-gray-500 focus:ring-1 focus:outline-none"
            />
          </div>

          {/* Filtros */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Filtro Dropdown para Mobile */}
            <div className="relative sm:hidden">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-3 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-electric-500" />
                  <span>{filter}</span>
                  <span className="text-electric-500">
                    ({getProjectCountByCategory(filter)})
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${showFilterDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {showFilterDropdown && (
                <div className="absolute top-full right-0 left-0 z-10 mt-2 rounded-xl border border-gray-700 bg-gray-800 shadow-2xl">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => handleFilterChange(category)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-700/50"
                    >
                      <div className="flex items-center justify-between">
                        <span>{category}</span>
                        <span className="text-sm text-gray-500">
                          ({getProjectCountByCategory(category)})
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filtros Horizontais para Desktop */}
            <div className="hidden sm:flex sm:flex-wrap sm:gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleFilterChange(category)}
                  className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                    filter === category
                      ? "bg-electric-500 text-white"
                      : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/50"
                  }`}
                >
                  {category} ({getProjectCountByCategory(category)})
                </button>
              ))}
            </div>

            {/* Contador de resultados */}
            <div className="text-sm text-gray-500">
              Mostrando {Math.min(visibleProjects, filteredProjects.length)} de{" "}
              {filteredProjects.length} projetos
            </div>
          </div>
        </motion.div>

        {/* Grid de Projetos */}
        <motion.div
          layout
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6"
        >
          <AnimatePresence mode="popLayout">
            {displayedProjects.map((project, index) => (
              <motion.article
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                className="group relative cursor-pointer"
              >
                <div className="hover:border-electric-500/30 hover:shadow-electric-500/10 overflow-hidden rounded-xl border border-gray-700/50 bg-gray-800/30 shadow-lg transition-all">
                  {/* Image Container */}
                  <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
                    <Image
                      src={project.image}
                      alt={project.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent" />

                    {/* Badges Overlay */}
                    <div className="absolute top-3 right-3 left-3 flex items-start justify-between">
                      {project.featured && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-2 py-1 text-xs font-bold text-black">
                          <Sparkles size={10} />
                          Destaque
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${getStatusColor(project.status)}`}
                      >
                        {getStatusText(project.status)}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-electric-500 text-xs font-semibold">
                        {project.category}
                      </span>
                      <Code size={14} className="text-gray-500" />
                    </div>

                    <h3 className="font-space mb-2 line-clamp-1 text-sm font-bold md:text-base">
                      {project.title}
                    </h3>

                    <p className="mb-3 line-clamp-2 text-xs text-gray-300 md:text-sm">
                      {project.description}
                    </p>

                    {/* Technologies (limitado para mobile) */}
                    <div className="mb-4 flex flex-wrap gap-1">
                      {project.technologies
                        .slice(0, isMobile ? 2 : 3)
                        .map((tech) => (
                          <span
                            key={tech}
                            className="rounded border border-gray-600/50 bg-gray-700/50 px-2 py-1 text-xs"
                          >
                            {tech}
                          </span>
                        ))}
                      {project.technologies.length > (isMobile ? 2 : 3) && (
                        <span className="rounded border border-gray-600/50 bg-gray-700/50 px-2 py-1 text-xs text-gray-400">
                          +{project.technologies.length - (isMobile ? 2 : 3)}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedProject(project)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-700/50 px-4 py-2 text-sm font-medium hover:bg-gray-600/50"
                    >
                      <Eye size={14} />
                      Ver Detalhes
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Botão Carregar Mais */}
        {visibleProjects < filteredProjects.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 flex justify-center md:mt-12"
          >
            <button
              onClick={loadMoreProjects}
              disabled={isLoading}
              className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 px-8 py-3 font-semibold transition-all hover:from-gray-700 hover:to-gray-800 disabled:opacity-50"
            >
              <span className="relative z-10">
                {isLoading ? "Carregando..." : "Carregar Mais Projetos"}
              </span>
              <div className="group-hover:animate-shine absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-full" />
            </button>
          </motion.div>
        )}

        {/* Estado Vazio */}
        {filteredProjects.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 text-center"
          >
            <Code size={48} className="mx-auto mb-4 text-gray-600" />
            <h3 className="font-space mb-2 text-xl font-bold text-gray-400">
              Nenhum projeto encontrado
            </h3>
            <p className="text-gray-500">
              Não encontramos resultados para &ldquo;{searchQuery}&rdquo;{" "}
              {filter !== "Todos" && `na categoria ${filter}`}
            </p>
          </motion.div>
        )}
      </div>

      {/* Modal */}
      <ProjectModal />
    </section>
  );
};

export default SectionProjects;
