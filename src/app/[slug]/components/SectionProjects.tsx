'use client';

import {
  ContactInfo,
  LandingPage,
  Project as PrismaProject,
} from '@prisma/client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle,
  ChevronDown,
  Clock,
  Code,
  ExternalLink,
  MessageCircle,
  Rocket,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Users,
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

import { CometCard } from '@/components/ui/comet-card';
import { useOutsideClick } from '@/hooks/use-outside-click';

interface SectionProjectsProps {
  contact: ContactInfo;
  landingpage: LandingPage;
  projects: PrismaProject[];
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
      return 'text-green-400 bg-green-500/10 border-green-500/20';
    case 'in-progress':
      return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    case 'planned':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    default:
      return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
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

const SectionProjects = ({
  contact,
  landingpage,
  projects: prismaProjects,
}: SectionProjectsProps) => {
  const projects = useMemo(
    () =>
      prismaProjects
        .map(convertPrismaProjectToProject)
        .sort((a, b) => a.position - b.position),
    [prismaProjects]
  );

  // Estado do ExpandableCard
  const [active, setActive] = useState<Project | boolean | null>(null);
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);

  const [filter, setFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [visibleProjects, setVisibleProjects] = useState(6);

  // Fechar com ESC e bloquear scroll
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setActive(false);
    }

    if (active && typeof active === 'object') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);

  // Fechar ao clicar fora
  useOutsideClick(ref, () => setActive(null));

  const categories = useMemo(() => {
    const allCategories = [
      'Todos',
      ...Array.from(new Set(projects.map((p) => p.category))),
    ];
    return allCategories.filter(
      (category) =>
        category === 'Todos' || projects.some((p) => p.category === category)
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

    result = [...result].sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return a.position - b.position;
    });

    return result;
  }, [filter, searchQuery, projects]);

  const displayedProjects = useMemo(
    () => filteredProjects.slice(0, visibleProjects),
    [filteredProjects, visibleProjects]
  );

  const getProjectCountByCategory = useCallback(
    (category: string) => {
      if (category === 'Todos') return projects.length;
      return projects.filter((project) => project.category === category).length;
    },
    [projects]
  );

  const loadMoreProjects = () => {
    setIsLoading(true);
    setTimeout(() => {
      setVisibleProjects((prev) => Math.min(prev + 6, filteredProjects.length));
      setIsLoading(false);
    }, 300);
  };

  const handleFilterChange = (category: string) => {
    setFilter(category);
    setVisibleProjects(6);
  };

  return (
    <>
      {/* ============================================ */}
      {/* 🔥 EXPANDABLE CARD OVERLAY - Inspirado Aceternity UI */}
      {/* ============================================ */}
      <AnimatePresence>
        {active && typeof active === 'object' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {active && typeof active === 'object' ? (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            {/* Botão Fechar Mobile */}
            <motion.button
              key={`close-${active.title}-${id}`}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-white shadow-lg lg:hidden"
              onClick={() => setActive(null)}
            >
              <X size={20} />
            </motion.button>

            <motion.div
              layoutId={`card-${active.title}-${id}`}
              ref={ref}
              className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-gray-700/50 bg-gray-900 shadow-2xl shadow-black/50"
            >
              {/* Imagem Expandida */}
              <motion.div layoutId={`image-${active.title}-${id}`}>
                <div className="relative aspect-video w-full overflow-hidden sm:rounded-t-3xl">
                  <Image
                    src={active.image}
                    alt={active.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 700px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent" />

                  {/* Badges na imagem */}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    <span className="bg-electric-500/20 text-electric-400 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                      {active.category}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur-sm ${getStatusColor(active.status)}`}
                    >
                      <CheckCircle size={12} />
                      {getStatusText(active.status)}
                    </span>
                    {active.featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1 text-xs font-bold text-black">
                        <Sparkles size={12} />
                        Destaque
                      </span>
                    )}
                  </div>

                  {/* Botão Fechar Desktop */}
                  <button
                    onClick={() => setActive(null)}
                    className="absolute top-4 right-4 hidden rounded-xl bg-black/50 p-2 backdrop-blur-sm transition-colors hover:bg-black/70 lg:flex"
                  >
                    <X size={20} className="text-white" />
                  </button>
                </div>
              </motion.div>

              {/* Conteúdo Scrollável */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                {/* Header com Título e CTA */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <motion.h3
                      layoutId={`title-${active.title}-${id}`}
                      className="font-space text-2xl font-bold md:text-3xl"
                    >
                      {active.title}
                    </motion.h3>
                    <motion.p
                      layoutId={`description-${active.description}-${id}`}
                      className="mt-1 text-sm text-gray-400"
                    >
                      {active.description}
                    </motion.p>
                  </div>

                  {/* CTA Principal */}
                  <motion.a
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    href={
                      contact.whatsappLink ||
                      'https://api.whatsapp.com/send/?phone=554797086965&text=Olá! Gostaria de um orçamento para um projeto similar'
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/25 transition-all hover:from-green-600 hover:to-green-700"
                  >
                    <MessageCircle size={18} />
                    Quero Um Projeto Assim
                    <ArrowRight size={16} />
                  </motion.a>
                </div>

                {/* Grid de Conteúdo */}
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  {/* Descrição Completa */}
                  <div>
                    <h4 className="font-space mb-3 flex items-center gap-2 text-lg font-semibold">
                      <Rocket size={20} className="text-electric-500" />
                      Sobre o Projeto
                    </h4>
                    <p className="leading-relaxed text-gray-300">
                      {active.fullDescription}
                    </p>
                  </div>

                  {/* Resultados */}
                  {active.results && (
                    <div>
                      <h4 className="font-space mb-3 flex items-center gap-2 text-lg font-semibold">
                        <TrendingUp size={20} className="text-green-500" />
                        Resultados Alcançados
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {active.results.map((result, index) => (
                          <div
                            key={index}
                            className="rounded-xl border border-gray-700/50 bg-gray-800/30 p-4"
                          >
                            <div className="font-space text-2xl font-bold text-green-400">
                              {result.metric}
                            </div>
                            <div className="mt-1 text-sm text-gray-400">
                              {result.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Depoimento */}
                  {active.testimonial && (
                    <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
                      <div className="mb-3 flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            className="fill-yellow-500 text-yellow-500"
                          />
                        ))}
                      </div>
                      <p className="mb-3 text-gray-300 italic">
                        &ldquo;{active.testimonial.quote}&rdquo;
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-sm font-bold">
                          {active.testimonial.author.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium">
                            {active.testimonial.author}
                          </div>
                          <div className="text-xs text-gray-500">
                            {active.testimonial.role}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tecnologias */}
                  <div>
                    <h4 className="font-space mb-3 flex items-center gap-2 text-sm font-semibold text-gray-400">
                      <Code size={16} />
                      Tecnologias Utilizadas
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {active.technologies.map((tech) => (
                        <span
                          key={tech}
                          className="rounded-lg border border-gray-600/50 bg-gray-700/30 px-3 py-1.5 text-xs font-medium text-gray-300"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Info Adicional + Link */}
                  <div className="flex flex-col gap-3 rounded-xl border border-gray-700/50 bg-gray-800/20 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-space mb-1 flex items-center gap-2 text-sm font-semibold text-gray-400">
                        <Clock size={16} />
                        Prazo e Investimento
                      </h4>
                      <p className="text-sm text-gray-300">
                        Projetos similares são entregues em{' '}
                        <strong className="text-white">7-15 dias</strong> com
                        investimento a partir de{' '}
                        <strong className="text-white">R$ 997</strong>
                      </p>
                    </div>

                    {active.liveUrl && (
                      <motion.a
                        href={active.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex flex-shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-600/50 bg-gray-700/30 px-4 py-2.5 text-sm font-medium text-gray-300 transition-all hover:border-gray-500 hover:text-white"
                      >
                        <ExternalLink size={16} />
                        Visitar Site
                      </motion.a>
                    )}
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      {/* ============================================ */}
      {/* SEÇÃO PRINCIPAL */}
      {/* ============================================ */}
      <section
        id="projetos"
        className="relative overflow-hidden bg-gradient-to-b from-gray-900 to-black py-16 md:py-24"
      >
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="bg-electric-500/10 absolute -top-24 -right-24 h-96 w-96 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center md:mb-20"
          >
            <h2 className="font-space mb-6 text-3xl font-bold md:text-5xl lg:text-6xl">
              Projetos Que{' '}
              <span className="bg-gradient-to-r from-sky-400 via-purple-400 to-purple-500 bg-clip-text text-transparent">
                Geram Resultados
              </span>{' '}
              Reais
            </h2>

            <p className="mx-auto max-w-2xl text-sm text-gray-400 sm:text-base md:text-lg">
              Cada projeto é desenvolvido com foco em performance, conversão e
              experiência do usuário.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-electric-500" />
                <span>{projects.length}+ Clientes</span>
              </div>
              <div className="flex items-center gap-2">
                <Star size={16} className="text-yellow-500" />
                <span>98% Satisfação</span>
              </div>
              <div className="flex items-center gap-2">
                <Rocket size={16} className="text-green-500" />
                <span>100% No Prazo</span>
              </div>
            </div>
          </motion.div>

          {/* Filtros */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10 space-y-4"
          >
            <div className="relative mx-auto max-w-md">
              <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar projetos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="focus:border-electric-500/50 focus:ring-electric-500/50 w-full rounded-xl border border-gray-700/50 bg-gray-800/30 py-3 pr-4 pl-12 text-sm backdrop-blur-sm transition-all placeholder:text-gray-500 focus:ring-1 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleFilterChange(category)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    filter === category
                      ? 'bg-electric-500 shadow-electric-500/25 text-white shadow-lg'
                      : 'bg-gray-800/30 text-gray-400 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  {category}
                  <span className="ml-2 text-xs opacity-75">
                    ({getProjectCountByCategory(category)})
                  </span>
                </button>
              ))}
            </div>

            <div className="text-center text-sm text-gray-500">
              Mostrando {Math.min(visibleProjects, filteredProjects.length)} de{' '}
              {filteredProjects.length} projetos
            </div>
          </motion.div>

          {/* 🔥 Grid de Projetos com CometCard + ExpandableCard */}
          <motion.div
            layout
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {displayedProjects.map((project) => (
                <motion.article
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  layoutId={`card-${project.title}-${id}`}
                  onClick={() => setActive(project)}
                  className="cursor-pointer"
                >
                  <CometCard rotateDepth={10} translateDepth={12}>
                    <div
                      className={`overflow-hidden rounded-2xl border transition-colors duration-300 ${
                        project.featured
                          ? 'border-yellow-500/30 bg-gradient-to-b from-yellow-500/5 to-gray-800/30'
                          : 'border-gray-700/50 bg-gray-800/30'
                      } hover:border-electric-500/50`}
                    >
                      {/* Imagem com layoutId para animação compartilhada */}
                      <motion.div
                        layoutId={`image-${project.title}-${id}`}
                        className="relative aspect-video overflow-hidden"
                      >
                        <Image
                          src={project.image}
                          alt={project.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-110"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent opacity-60 transition-opacity group-hover:opacity-80" />

                        <div className="absolute top-3 right-3 left-3 flex items-start justify-between">
                          {project.featured && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-2.5 py-1 text-xs font-bold text-black shadow-lg">
                              <Sparkles size={10} />
                              Destaque
                            </span>
                          )}
                          <span
                            className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusColor(project.status)}`}
                          >
                            {getStatusText(project.status)}
                          </span>
                        </div>
                      </motion.div>

                      {/* Conteúdo */}
                      <div className="p-5">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-electric-500 text-xs font-semibold">
                            {project.category}
                          </span>
                          {project.liveUrl && (
                            <span className="flex items-center gap-1 text-xs text-green-400">
                              <CheckCircle size={12} />
                              Online
                            </span>
                          )}
                        </div>

                        <motion.h3
                          layoutId={`title-${project.title}-${id}`}
                          className="font-space group-hover:text-electric-500 mb-2 text-lg font-bold transition-colors"
                        >
                          {project.title}
                        </motion.h3>

                        <motion.p
                          layoutId={`description-${project.description}-${id}`}
                          className="mb-4 line-clamp-2 text-sm leading-relaxed text-gray-400"
                        >
                          {project.description}
                        </motion.p>

                        <div className="mb-4 flex flex-wrap gap-1.5">
                          {project.technologies.slice(0, 3).map((tech) => (
                            <span
                              key={tech}
                              className="rounded-md border border-gray-600/30 bg-gray-700/20 px-2 py-1 text-xs text-gray-400"
                            >
                              {tech}
                            </span>
                          ))}
                          {project.technologies.length > 3 && (
                            <span className="rounded-md border border-gray-600/30 bg-gray-700/20 px-2 py-1 text-xs text-gray-500">
                              +{project.technologies.length - 3}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-700/30 pt-4">
                          <span className="text-sm text-gray-500">
                            Clique para expandir
                          </span>
                          <ArrowRight
                            size={18}
                            className="group-hover:text-electric-500 text-gray-500 transition-all group-hover:translate-x-0.5"
                          />
                        </div>
                      </div>
                    </div>
                  </CometCard>
                </motion.article>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* CTA Final */}
          {filteredProjects.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-16 text-center"
            >
              <div className="mx-auto max-w-2xl rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8 backdrop-blur-sm md:p-12">
                <Rocket size={40} className="text-electric-500 mx-auto mb-4" />
                <h3 className="font-space mb-3 text-2xl font-bold">
                  Gostou do que viu?
                </h3>
                <p className="mb-6 text-gray-400">
                  Vamos criar algo incrível juntos. Conte-me sobre seu projeto.
                </p>
                <motion.a
                  href={
                    contact.whatsappLink ||
                    'https://api.whatsapp.com/send/?phone=554797086965&text=Olá! Gostaria de solicitar um orçamento'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 px-8 py-4 text-lg font-semibold text-white shadow-2xl shadow-green-500/25 transition-all hover:from-green-600 hover:to-green-700"
                >
                  <MessageCircle size={24} />
                  Solicitar Orçamento
                  <ArrowRight size={20} />
                </motion.a>
              </div>
            </motion.div>
          )}

          {/* Carregar Mais */}
          {visibleProjects < filteredProjects.length && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-10 flex justify-center"
            >
              <button
                onClick={loadMoreProjects}
                disabled={isLoading}
                className="group flex items-center gap-2 rounded-xl border border-gray-700/50 bg-gray-800/30 px-8 py-4 font-medium text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-700/50 disabled:opacity-50"
              >
                {isLoading ? 'Carregando...' : 'Ver Mais Projetos'}
                <ChevronDown size={20} />
              </button>
            </motion.div>
          )}

          {/* Estado Vazio */}
          {filteredProjects.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 text-center"
            >
              <Search size={48} className="mx-auto mb-4 text-gray-600" />
              <h3 className="font-space mb-2 text-xl font-bold text-gray-400">
                Nenhum projeto encontrado
              </h3>
              <button
                onClick={() => {
                  setFilter('Todos');
                  setSearchQuery('');
                }}
                className="mt-4 rounded-lg bg-gray-800 px-6 py-2 text-sm text-gray-300 transition-colors hover:bg-gray-700"
              >
                Limpar Filtros
              </button>
            </motion.div>
          )}
        </div>
      </section>
    </>
  );
};

export default SectionProjects;
