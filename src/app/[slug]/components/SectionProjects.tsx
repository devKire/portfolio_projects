'use client';

import {
  ContactInfo,
  LandingPage,
  Project as PrismaProject,
} from '@prisma/client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Code,
  ExternalLink,
  FileText,
  FolderOpen,
  MessageCircle,
  Rocket,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  X,
} from 'lucide-react';
import Image from 'next/image';
import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useOutsideClick } from '@/hooks/use-outside-click';
import type { PortfolioProjectsContent } from '@/lib/portfolio-content/types';

interface SectionProjectsProps {
  contact: ContactInfo;
  landingpage: LandingPage;
  projects: PrismaProject[];
  content: PortfolioProjectsContent;
}

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
  status: 'completed' | 'in-progress' | 'planned';
  position: number;
  accentColor?: string;
  results?: { metric: string; description: string }[];
  testimonial?: { quote: string; author: string; role: string };
}

interface ProjectFileCardProps {
  project: Project;
  index: number;
  activeIndex: number;
  direction: number;
  total: number;
  onOpen: (project: Project) => void;
  onSwipeNext: () => void;
  onSwipePrevious: () => void;
}

const swipeConfidenceThreshold = 9000;

const convertPrismaProjectToProject = (
  prismaProject: PrismaProject
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
  status: prismaProject.status as 'completed' | 'in-progress' | 'planned',
  position: prismaProject.position,
  accentColor: prismaProject.accentColor || 'from-gray-500/20 to-gray-600/20',
  results: prismaProject.featured
    ? [
        { metric: '43%', description: 'Aumento em conversão' },
        { metric: '2.5s', description: 'Tempo de carregamento' },
      ]
    : undefined,
  testimonial: prismaProject.featured
    ? {
        quote: 'Transformou completamente nossa presença digital',
        author: 'Cliente',
        role: 'CEO',
      }
    : undefined,
});

const getStatusColor = (status: Project['status']) => {
  switch (status) {
    case 'completed':
      return 'border-green-500/20 bg-green-500/10 text-green-400';
    case 'in-progress':
      return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400';
    case 'planned':
      return 'border-blue-500/20 bg-blue-500/10 text-blue-400';
    default:
      return 'border-gray-500/20 bg-gray-500/10 text-gray-400';
  }
};

const getStatusText = (status: Project['status']) => {
  switch (status) {
    case 'completed':
      return 'Concluído';
    case 'in-progress':
      return 'Em Desenvolvimento';
    case 'planned':
      return 'Planejado';
    default:
      return 'Indisponível';
  }
};

const swipePower = (offset: number, velocity: number) =>
  Math.abs(offset) * velocity;

const getVisibleIndexes = (activeIndex: number, total: number) => {
  if (total <= 0) return [];

  return Array.from(
    new Set(
      [
        activeIndex,
        (activeIndex + 1) % total,
        (activeIndex + 2) % total,
        (activeIndex - 1 + total) % total,
      ].filter((index) => index >= 0 && index < total)
    )
  );
};

const ProjectFileCard = ({
  project,
  index,
  activeIndex,
  direction,
  total,
  onOpen,
  onSwipeNext,
  onSwipePrevious,
}: ProjectFileCardProps) => {
  const relativeOffset = (index - activeIndex + total) % total;
  const normalizedOffset =
    relativeOffset > total / 2 ? relativeOffset - total : relativeOffset;
  const isActive = index === activeIndex;
  const isBehind = !isActive && normalizedOffset > 0;
  const isPrevious = !isActive && normalizedOffset < 0;

  const stackDepth = isActive
    ? 0
    : isBehind
      ? Math.min(normalizedOffset, 2)
      : -1;

  return (
    <motion.article
      layout
      custom={direction}
      initial={
        isActive
          ? {
              opacity: 0,
              x: direction >= 0 ? 220 : -220,
              rotateZ: direction >= 0 ? 5 : -5,
              scale: 0.94,
            }
          : false
      }
      animate={{
        opacity: isActive ? 1 : isPrevious ? 0 : 0.24,
        x: isActive ? 0 : stackDepth * 18,
        y: isActive ? 0 : stackDepth * 14,
        scale: isActive ? 1 : 0.88 - stackDepth * 0.035,
        rotateZ: isActive ? 0 : stackDepth * 1.8,
        filter: isActive ? 'blur(0px)' : 'blur(1px)',
      }}
      exit={{
        opacity: 0,
        x: direction >= 0 ? -260 : 260,
        rotateZ: direction >= 0 ? -8 : 8,
        scale: 0.92,
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      drag={isActive ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.75}
      onDragEnd={(_, { offset, velocity }) => {
        const swipe = swipePower(offset.x, velocity.x);

        if (swipe < -swipeConfidenceThreshold || offset.x < -120) {
          onSwipeNext();
        } else if (swipe > swipeConfidenceThreshold || offset.x > 120) {
          onSwipePrevious();
        }
      }}
      style={{
        zIndex: isActive ? 30 : 20 - Math.abs(normalizedOffset),
        willChange: isActive ? 'transform, opacity' : undefined,
      }}
      className={`absolute inset-0 mx-auto flex w-full max-w-6xl origin-center items-center ${
        isActive ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
      }`}
      aria-hidden={!isActive}
    >
      <div
        role={isActive ? 'button' : undefined}
        tabIndex={isActive ? 0 : -1}
        onClick={() => isActive && onOpen(project)}
        onKeyDown={(event) => {
          if (!isActive) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen(project);
          }
        }}
        className="group block w-full rounded-[1.6rem] text-left focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
        aria-label={`Abrir detalhes do projeto ${project.title}`}
        aria-current={isActive ? 'true' : undefined}
      >
        <div
          className={`relative overflow-hidden rounded-[1.6rem] border shadow-2xl transition-colors duration-300 ${
            isActive
              ? 'border-white/15 bg-[#09090b]/100 shadow-cyan-950/30 backdrop-blur-md group-hover:border-white/25'
              : 'border-white/[0.06] bg-white/[0.025] shadow-black/20 backdrop-blur-xl'
          }`}
        >
          <div
            className={`absolute top-0 left-8 h-8 w-32 rounded-b-xl border-x border-b sm:left-12 sm:w-40 ${
              isActive
                ? 'border-white/15 bg-white/[0.08]'
                : 'border-white/[0.06] bg-white/[0.035]'
            }`}
          >
            <div className="flex h-full items-center gap-2 px-3 text-[10px] text-white/70 sm:text-xs">
              <FileText size={12} className="text-cyan-300" />
              Arquivo {String(index + 1).padStart(2, '0')}
            </div>
          </div>

          <div className="grid gap-4 p-4 pt-10 sm:p-5 sm:pt-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-5 lg:p-5 lg:pt-11">
            <div className="order-2 flex flex-col justify-between lg:order-1">
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
                    {project.category}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${getStatusColor(project.status)}`}
                  >
                    <CheckCircle size={12} />
                    {getStatusText(project.status)}
                  </span>
                  {project.featured && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-xs text-yellow-100">
                      <Sparkles size={12} />
                      Destaque
                    </span>
                  )}
                </div>

                <h3 className="text-2xl leading-tight text-white sm:text-3xl lg:text-[2rem]">
                  {project.title}
                </h3>

                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-gray-300 sm:text-base">
                  {project.description}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {project.technologies.slice(0, 5).map((tech) => (
                    <span
                      key={tech}
                      className="rounded-lg border border-white/10 bg-white/[0.07] px-2.5 py-1.5 text-xs text-gray-200"
                    >
                      {tech}
                    </span>
                  ))}
                  {project.technologies.length > 5 && (
                    <span className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-xs text-gray-300">
                      +{project.technologies.length - 5}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {project.liveUrl ? (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm text-black transition-colors hover:bg-cyan-100 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none"
                    aria-label={`Abrir projeto ${project.title} em nova aba`}
                  >
                    Ver Projeto
                    <ExternalLink size={15} />
                  </a>
                ) : null}

                <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-gray-200 transition-colors group-hover:border-white/20">
                  Detalhes
                  <ArrowRight
                    size={15}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </span>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                <Image
                  src={project.image}
                  alt={`Preview do projeto ${project.title}`}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 620px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white/80 backdrop-blur-sm">
                  <TrendingUp size={12} className="text-emerald-300" />
                  Performance
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

const SectionProjects = ({
  contact,
  projects: prismaProjects,
  content,
}: SectionProjectsProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const projects = useMemo(
    () =>
      prismaProjects
        .filter((prismaProject) => prismaProject.isActive)
        .map(convertPrismaProjectToProject)
        .sort((a, b) => a.position - b.position),
    [prismaProjects]
  );

  const [active, setActive] = useState<Project | null>(null);
  const [filter, setFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const previousBodyOverflow = useRef<string | null>(null);

  useEffect(() => {
    if (!active) return;

    previousBodyOverflow.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setActive(null);
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousBodyOverflow.current ?? '';
    };
  }, [active]);

  useOutsideClick(modalRef, () => setActive(null));

  const categories = useMemo(() => {
    const allCategories = [
      'Todos',
      ...Array.from(new Set(projects.map((project) => project.category))),
    ];

    return allCategories.filter(
      (category) =>
        category === 'Todos' ||
        projects.some((project) => project.category === category)
    );
  }, [projects]);

  const filteredProjects = useMemo(() => {
    let result = projects;

    if (filter !== 'Todos') {
      result = result.filter((project) => project.category === filter);
    }

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (project) =>
          project.title.toLowerCase().includes(query) ||
          project.description.toLowerCase().includes(query) ||
          project.technologies.some((tech) =>
            tech.toLowerCase().includes(query)
          )
      );
    }

    return [...result].sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return a.position - b.position;
    });
  }, [filter, searchQuery, projects]);

  useEffect(() => {
    setActiveIndex(0);
    setDirection(1);
  }, [filter, searchQuery]);

  useEffect(() => {
    if (activeIndex > filteredProjects.length - 1) {
      setActiveIndex(Math.max(filteredProjects.length - 1, 0));
    }
  }, [activeIndex, filteredProjects.length]);

  const getProjectCountByCategory = useCallback(
    (category: string) => {
      if (category === 'Todos') return projects.length;
      return projects.filter((project) => project.category === category).length;
    },
    [projects]
  );

  const goToProject = useCallback(
    (nextIndex: number) => {
      if (filteredProjects.length <= 0) return;

      setDirection(nextIndex > activeIndex ? 1 : -1);
      setActiveIndex(
        ((nextIndex % filteredProjects.length) + filteredProjects.length) %
          filteredProjects.length
      );
    },
    [activeIndex, filteredProjects.length]
  );

  const goToNextProject = useCallback(() => {
    goToProject(activeIndex + 1);
  }, [activeIndex, goToProject]);

  const goToPreviousProject = useCallback(() => {
    goToProject(activeIndex - 1);
  }, [activeIndex, goToProject]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (active) return;
      if (event.key === 'ArrowRight') goToNextProject();
      if (event.key === 'ArrowLeft') goToPreviousProject();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, goToNextProject, goToPreviousProject]);

  const displayIndex = Math.min(
    Math.max(activeIndex, 0),
    Math.max(filteredProjects.length - 1, 0)
  );
  const currentProject = filteredProjects[displayIndex];
  const visibleIndexes = getVisibleIndexes(
    displayIndex,
    filteredProjects.length
  );
  const activeModalIndex = active
    ? filteredProjects.findIndex((project) => project.id === active.id)
    : -1;
  const canNavigateModal = activeModalIndex >= 0 && filteredProjects.length > 1;

  const openProjectAt = useCallback(
    (nextIndex: number) => {
      if (filteredProjects.length <= 0) return;

      const normalizedIndex =
        ((nextIndex % filteredProjects.length) + filteredProjects.length) %
        filteredProjects.length;

      setDirection(normalizedIndex > displayIndex ? 1 : -1);
      setActiveIndex(normalizedIndex);
      setActive(filteredProjects[normalizedIndex]);
    },
    [displayIndex, filteredProjects]
  );

  const openNextModalProject = useCallback(() => {
    if (activeModalIndex < 0) return;
    openProjectAt(activeModalIndex + 1);
  }, [activeModalIndex, openProjectAt]);

  const openPreviousModalProject = useCallback(() => {
    if (activeModalIndex < 0) return;
    openProjectAt(activeModalIndex - 1);
  }, [activeModalIndex, openProjectAt]);

  useEffect(() => {
    if (!active) return;

    if (!filteredProjects.some((project) => project.id === active.id)) {
      setActive(null);
    }
  }, [active, filteredProjects]);

  useEffect(() => {
    if (!active || !canNavigateModal) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') openNextModalProject();
      if (event.key === 'ArrowLeft') openPreviousModalProject();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    active,
    canNavigateModal,
    openNextModalProject,
    openPreviousModalProject,
  ]);

  return (
    <>
      <AnimatePresence>
        {active ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {active ? (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <motion.div
              key={active.id}
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={`project-title-${id}`}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="relative flex max-h-[90svh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/60"
            >
              {canNavigateModal ? (
                <>
                  <button
                    type="button"
                    onClick={openPreviousModalProject}
                    className="absolute top-1/2 left-3 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none sm:flex"
                    aria-label="Abrir projeto anterior"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={openNextModalProject}
                    className="absolute top-1/2 right-3 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none sm:flex"
                    aria-label="Abrir próximo projeto"
                  >
                    <ArrowRight size={18} />
                  </button>
                </>
              ) : null}

              <div className="relative aspect-video w-full overflow-hidden bg-black">
                <Image
                  src={active.image}
                  alt={`Preview do projeto ${active.title}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 900px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />

                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100 backdrop-blur-sm">
                    {active.category}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs backdrop-blur-sm ${getStatusColor(active.status)}`}
                  >
                    <CheckCircle size={12} />
                    {getStatusText(active.status)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="absolute top-4 right-4 rounded-xl bg-black/50 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none"
                  aria-label="Fechar detalhes do projeto"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-7">
                <div className="mb-4 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {activeModalIndex >= 0
                      ? `${String(activeModalIndex + 1).padStart(2, '0')} / ${String(
                          filteredProjects.length
                        ).padStart(2, '0')}`
                      : 'Projeto'}
                  </span>
                  <span>{active.category}</span>
                </div>

                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3
                      id={`project-title-${id}`}
                      className="text-2xl text-white md:text-3xl"
                    >
                      {active.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-400">
                      {active.description}
                    </p>
                  </div>

                  <motion.a
                    href={
                      contact.whatsappLink ||
                      'https://api.whatsapp.com/send/?phone=554797086965&text=Olá! Gostaria de um orçamento para um projeto similar'
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-5 py-3 text-sm text-white shadow-lg shadow-green-500/20 transition-colors hover:from-green-600 hover:to-green-700 focus-visible:ring-2 focus-visible:ring-green-300 focus-visible:outline-none"
                  >
                    <MessageCircle size={18} />
                    Quero Um Projeto Assim
                  </motion.a>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-lg text-white">
                      <Rocket size={20} className="text-cyan-300" />
                      Sobre o Projeto
                    </h4>
                    <p className="leading-relaxed text-gray-300">
                      {active.fullDescription}
                    </p>
                  </div>

                  {/* {active.results ? (
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 text-lg text-white">
                        <TrendingUp size={20} className="text-green-400" />
                        Resultados Alcançados
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {active.results.map((result) => (
                          <div
                            key={`${result.metric}-${result.description}`}
                            className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
                          >
                            <div className="text-2xl text-green-400">
                              {result.metric}
                            </div>
                            <div className="mt-1 text-sm text-gray-400">
                              {result.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null} */}

                  {/* {active.testimonial ? (
                    <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
                      <div className="mb-3 flex gap-1">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            size={16}
                            className="fill-yellow-500 text-yellow-500"
                          />
                        ))}
                      </div>
                      <p className="mb-3 text-gray-300 italic">
                        &ldquo;{active.testimonial.quote}&rdquo;
                      </p>
                      <div className="text-sm text-white">
                        {active.testimonial.author}
                        <span className="ml-2 text-xs text-gray-500">
                          {active.testimonial.role}
                        </span>
                      </div>
                    </div>
                  ) : null} */}

                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-sm text-gray-400">
                      <Code size={16} />
                      Tecnologias Utilizadas
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {active.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-gray-300"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="mb-1 flex items-center gap-2 text-sm text-gray-400">
                        <Clock size={16} />
                        Prazo e Investimento
                      </h4>
                      <p className="text-sm text-gray-300">
                        Projetos similares são entregues em{' '}
                        <strong className="text-white">7-15 dias</strong> com
                        investimento a partir de{' '}
                        <strong className="text-white">R$ 997</strong>.
                      </p>
                    </div>

                    {active.liveUrl ? (
                      <motion.a
                        href={active.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-gray-200 transition-colors hover:border-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none"
                      >
                        <ExternalLink size={16} />
                        Visitar Site
                      </motion.a>
                    ) : null}
                  </div>
                </div>
              </div>

              {canNavigateModal ? (
                <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-white/[0.02] p-4 sm:hidden">
                  <button
                    type="button"
                    onClick={openPreviousModalProject}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white transition-colors hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none"
                    aria-label="Abrir projeto anterior"
                  >
                    <ArrowLeft size={16} />
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={openNextModalProject}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white transition-colors hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none"
                    aria-label="Abrir próximo projeto"
                  >
                    Próximo
                    <ArrowRight size={16} />
                  </button>
                </div>
              ) : null}
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <section
        id="projetos"
        className="relative isolate overflow-hidden bg-black px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.08),transparent_45%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_80%_55%_at_50%_50%,black,transparent)] bg-[size:72px_72px]" />
        </div>

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-10">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
            <div className="space-y-6">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-xs text-gray-400 backdrop-blur-sm">
                  <FolderOpen size={14} className="text-cyan-300" />
                  Arquivos de Projeto
                </div>

                <h2 className="text-4xl leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Projetos Que Geram{' '}
                  <span className="bg-gradient-to-r from-sky-400 via-purple-400 to-purple-500 bg-clip-text text-transparent">
                    Resultados Reais
                  </span>
                </h2>

                <p className="mt-5 max-w-xl text-sm leading-relaxed text-gray-400 sm:text-base">
                  Uma seleção de interfaces, landing pages e sistemas criados
                  com foco em performance, design, conversão, experiência do
                  usuário e resultados reais.
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">
                <div className="relative mb-4">
                  <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Buscar nos arquivos..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pr-4 pl-11 text-sm text-white transition-colors placeholder:text-gray-500 focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/30 focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setFilter(category)}
                      className={`rounded-xl px-3 py-2 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none ${
                        filter === category
                          ? 'bg-white text-black'
                          : 'border border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {category}
                      <span className="ml-1.5 opacity-60">
                        {getProjectCountByCategory(category)}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-gray-500">
                  <span>
                    {filteredProjects.length === 0
                      ? 'Nenhum arquivo encontrado'
                      : `${String(displayIndex + 1).padStart(2, '0')} / ${String(
                          filteredProjects.length
                        ).padStart(2, '0')}`}
                  </span>
                  <span>
                    {currentProject
                      ? currentProject.category
                      : 'Ajuste os filtros'}
                  </span>
                </div>
              </div>

              {filteredProjects.length > 0 ? (
                <div className="hidden flex-wrap gap-2 lg:flex">
                  {content.organizerTabs.map((tab) => (
                    <span
                      key={tab}
                      className="rounded-full border border-white/10 bg-white/[0.025] px-3 py-1.5 text-xs text-gray-500 backdrop-blur-sm"
                    >
                      {tab}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative">
              <div className="relative min-h-[620px] overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.02] p-3 shadow-2xl shadow-black/40 backdrop-blur-xl sm:min-h-[660px] lg:min-h-[620px]">
                <div className="absolute right-4 bottom-4 left-4 h-24 rounded-[1.6rem] border border-white/10 bg-white/[0.04]">
                  <div className="flex h-full items-start justify-between px-5 pt-4 text-xs text-gray-400">
                    <span>Projetos</span>
                    <span>{filteredProjects.length} arquivos</span>
                  </div>
                </div>

                {filteredProjects.length > 0 ? (
                  <div className="absolute inset-x-4 top-4 h-[calc(100%-5.5rem)]">
                    <AnimatePresence initial={false} custom={direction}>
                      {visibleIndexes.map((projectIndex) => {
                        const project = filteredProjects[projectIndex];

                        return (
                          <ProjectFileCard
                            key={project.id}
                            project={project}
                            index={projectIndex}
                            activeIndex={displayIndex}
                            direction={direction}
                            total={filteredProjects.length}
                            onOpen={setActive}
                            onSwipeNext={goToNextProject}
                            onSwipePrevious={goToPreviousProject}
                          />
                        );
                      })}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-3xl text-center">
                    <div>
                      <Search
                        size={42}
                        className="mx-auto mb-4 text-gray-500"
                      />
                      <h3 className="text-xl text-gray-300">
                        Nenhum projeto encontrado
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setFilter('Todos');
                          setSearchQuery('');
                        }}
                        className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2 text-sm text-gray-300 transition-colors hover:border-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none"
                      >
                        Limpar filtros
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {filteredProjects.length > 0 ? (
                <div className="mt-5 flex flex-col items-center justify-between gap-4 sm:flex-row">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={goToPreviousProject}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition-colors hover:border-white/20 hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none"
                      aria-label="Projeto anterior"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={goToNextProject}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition-colors hover:border-white/20 hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none"
                      aria-label="Próximo projeto"
                    >
                      <ArrowRight size={18} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {filteredProjects.map((project, index) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => goToProject(index)}
                        className={`h-2 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:outline-none ${
                          index === displayIndex
                            ? 'w-8 bg-cyan-300'
                            : 'w-2.5 bg-white/20 hover:bg-white/40'
                        }`}
                        aria-label={`Ir para projeto ${index + 1}`}
                        aria-current={
                          index === displayIndex ? 'true' : undefined
                        }
                      />
                    ))}
                  </div>

                  <div className="text-xs text-gray-500">
                    {String(displayIndex + 1).padStart(2, '0')} /{' '}
                    {String(filteredProjects.length).padStart(2, '0')}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto w-full max-w-2xl rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-center backdrop-blur-xl sm:p-6"
          >
            <Rocket size={28} className="mx-auto mb-3 text-cyan-300" />
            <h3 className="text-xl text-white">Gostou do que viu?</h3>
            <p className="mt-2 text-sm text-gray-400">
              Vamos organizar seu próximo projeto do briefing ao lançamento.
            </p>
            <motion.a
              href={
                contact.whatsappLink ||
                'https://api.whatsapp.com/send/?phone=554797086965&text=Olá! Gostaria de solicitar um orçamento'
              }
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-sm text-white shadow-lg shadow-green-500/20 transition-colors hover:from-green-600 hover:to-green-700 focus-visible:ring-2 focus-visible:ring-green-300 focus-visible:outline-none"
            >
              <MessageCircle size={18} />
              Solicitar Orçamento
              <ArrowRight size={16} />
            </motion.a>
          </motion.div>
        </div>
      </section>
    </>
  );
};

export default SectionProjects;
