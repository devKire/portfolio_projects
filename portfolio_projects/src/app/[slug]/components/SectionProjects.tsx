"use client";

import { ContactInfo, LandingPage } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Code,
  ExternalLink,
  Eye,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import React, { useState } from "react";

interface SectionProjectsProps {
  contact: ContactInfo;
  landingpage: LandingPage;
}

interface Project {
  id: number;
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
  accentColor?: string;
}

const projects: Project[] = [
  {
    id: 1,
    title: "Rafa Manicure & Pedicure",
    category: "Beleza e Estética",
    description:
      "Landing page para profissional de beleza com agendamento via WhatsApp.",
    fullDescription:
      "Desenvolvido para Rafa Manicure, com um design feminino e elegante. Inclui galeria de serviços, integração para contato rápido e layout 100% responsivo.",
    image:
      "https://1hcgs7spbatxhpzg.public.blob.vercel-storage.com/featured/featured_rafamanicure.png",
    technologies: ["Next.js", "TypeScript", "Tailwind CSS"],
    liveUrl: "https://rafamanicurepedicure.vercel.app/",
    featured: true,
    status: "completed",
    accentColor: "from-rose-500/20 to-pink-600/20",
  },
  {
    id: 2,
    title: "Erik Santos",
    category: "Portfólio Pessoal",
    description:
      "Portfólio moderno e minimalista para desenvolvedor web full-stack.",
    fullDescription:
      "Portfólio pessoal com foco em design limpo, navegação fluida e destaque para projetos, tecnologias dominadas e formas de contato. Desenvolvido com animações suaves via Framer Motion e SEO otimizado.",
    image:
      "https://1hcgs7spbatxhpzg.public.blob.vercel-storage.com/featured/featured_eriksantos.png",
    technologies: ["Next.js", "TypeScript", "Framer Motion", "Tailwind CSS"],
    liveUrl: "https://erikdossantos.vercel.app",
    featured: true,
    status: "completed",
    accentColor: "from-purple-500/20 to-pink-600/20",
  },
  {
    id: 3,
    title: "João Garcia Fotografia",
    category: "Fotografia",
    description:
      "Landing page artística e elegante para fotógrafo profissional.",
    fullDescription:
      "Landing page desenvolvida para o fotógrafo João Garcia, com galeria categorizada, depoimentos e contato direto via WhatsApp. Layout moderno, foco visual e excelente responsividade.",
    image:
      "https://1hcgs7spbatxhpzg.public.blob.vercel-storage.com/featured/featured_joaogarcia.png",
    technologies: [
      "Next.js",
      "TypeScript",
      "Prisma",
      "Tailwind CSS",
      "Neon",
      "ShadCN",
    ],
    liveUrl: "https://joaogarcia.vercel.app/",
    featured: true,
    status: "completed",
    accentColor: "from-yellow-500/20 to-orange-600/20",
  },
  {
    id: 4,
    title: "Marivaldo Corretor de Imóveis",
    category: "Serviços Profissionais",
    description:
      "Landing page moderna e estratégica para corretores de imóveis.",
    fullDescription:
      "Desenvolvimento de uma landing page com foco em conversão e autoridade. Inclui apresentação profissional, portfólio de imóveis, formulário de contato e integração com WhatsApp.",
    image:
      "https://1hcgs7spbatxhpzg.public.blob.vercel-storage.com/featured/featured_marivaldo.png",
    technologies: [
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
      "Prisma",
      "Neon",
      "ShadCN",
    ],
    liveUrl: "https://corretor-landing-page.vercel.app/",
    featured: true,
    status: "in-progress",
    accentColor: "from-green-500/20 to-emerald-600/20",
  },
  {
    id: 5,
    title: "Neodoxa",
    category: "Agência Digital",
    description:
      "Landing page para agência de marketing e desenvolvimento digital.",
    fullDescription:
      "Landing page institucional da Neodoxa, criada para reforçar presença digital e captar leads. Interface moderna com animações suaves e seções estratégicas.",
    image:
      "https://1hcgs7spbatxhpzg.public.blob.vercel-storage.com/featured/featured_neodoxa.png",
    technologies: [
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
      "Prisma",
      "Neon",
      "ShadCN",
    ],
    liveUrl: "https://neodoxa.vercel.app/neodoxa",
    featured: true,
    status: "completed",
    accentColor: "from-pink-500/20 to-purple-600/20",
  },
  {
    id: 6,
    title: "Cantinho Gourmet",
    category: "Restaurante e Delivery",
    description:
      "Sistema de delivery moderno e responsivo para restaurante especializado em marmitas.",
    fullDescription:
      "Plataforma completa desenvolvida para o Cantinho Gourmet, apresentando cardápio, pedidos online e integração com WhatsApp. Otimizada para conversão e experiência mobile, com pagamentos via Stripe e painel administrativo.",
    image:
      "https://1hcgs7spbatxhpzg.public.blob.vercel-storage.com/featured/featured_cantinhogourmet.png",
    technologies: [
      "Next.js 14",
      "TypeScript",
      "Prisma",
      "Stripe",
      "Tailwind CSS",
      "PostgreSQL",
    ],
    liveUrl: "https://cantinho-gourmet-theta.vercel.app/",
    featured: true,
    status: "planned",
    accentColor: "from-blue-500/20 to-purple-600/20",
  },
  {
    id: 7,
    title: "RDS Eletricista",
    category: "Serviços Técnicos",
    description:
      "Landing page institucional para profissional autônomo da área elétrica.",
    fullDescription:
      "Site criado para o eletricista RDS, com foco em autoridade, confiança e conversão. Design escuro, moderno e integração direta com WhatsApp para orçamentos.",
    image:
      "https://1hcgs7spbatxhpzg.public.blob.vercel-storage.com/featured/featured_rdseletrecista.png",
    technologies: ["Next.js", "TypeScript", "Tailwind CSS"],
    liveUrl: "https://rds-psi.vercel.app/",
    featured: true,
    status: "in-progress",
    accentColor: "from-yellow-400/20 to-orange-500/20",
  },
  {
    id: 8,
    title: "Tarefando",
    category: "Aplicativo Web",
    description:
      "Gerenciador de tarefas simples e eficiente para organizar o dia a dia.",
    fullDescription:
      "Aplicativo web com funcionalidades de adicionar, editar e concluir tarefas. Interface intuitiva e responsiva, com armazenamento local e design minimalista.",
    image:
      "https://1hcgs7spbatxhpzg.public.blob.vercel-storage.com/featured/featured_tarefando.png",
    technologies: [
      "Next.js",
      "TypeScript",
      "Local Storage",
      "Tailwind CSS",
      "Framer Motion",
    ],
    liveUrl: "https://tarefando-one.vercel.app/",
    featured: false,
    status: "completed",
    accentColor: "from-indigo-500/20 to-sky-600/20",
  },
];

const SectionProjects = ({ contact, landingpage }: SectionProjectsProps) => {
  console.log(contact, landingpage);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filter, setFilter] = useState("Todos");

  // Categorias atualizadas baseadas nos projetos reais
  const categories = [
    "Todos",
    "Beleza e Estética",
    "Portfólio Pessoal",
    "Fotografia",
    "Serviços Profissionais",
    "Agência Digital",
    "Restaurante e Delivery",
    "Serviços Técnicos",
    "Aplicativo Web",
  ];

  const filteredProjects =
    filter === "Todos"
      ? projects
      : projects.filter((project) => project.category === filter);

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

  // Contador de projetos por categoria para mostrar nos filtros
  const getProjectCountByCategory = (category: string) => {
    if (category === "Todos") return projects.length;
    return projects.filter((project) => project.category === category).length;
  };

  return (
    <section
      id="projetos"
      className="relative overflow-hidden bg-gradient-to-b from-gray-900 to-black py-24"
    >
      {/* Background Elements */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
          }}
          className="bg-electric-500/10 absolute top-1/4 right-1/4 h-96 w-96 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.05, 0.15, 0.05],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            delay: 2,
          }}
          className="absolute bottom-1/4 left-1/4 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-800/50 px-6 py-3 backdrop-blur-sm"
          >
            <Zap size={20} className="text-electric-500" />
            <span className="font-inter text-gray-300">
              Galeria de Projetos
            </span>
          </motion.div>

          <h2 className="font-space mb-6 text-4xl font-bold md:text-6xl lg:text-7xl">
            Projetos <span className="text-electric-500">Impactantes</span>
          </h2>
          <p className="font-inter mx-auto max-w-3xl text-xl text-gray-400 md:text-2xl">
            Cada imagem conta uma história de inovação, design e excelência
            técnica
          </p>
        </motion.div>

        {/* Filter Buttons - Atualizados */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <motion.button
                key={category}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(category)}
                className={`font-inter group relative rounded-full border px-6 py-3 font-medium backdrop-blur-sm transition-all duration-300 ${
                  filter === category
                    ? "bg-electric-500 border-electric-500 shadow-electric-500/25 text-white shadow-lg"
                    : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-white"
                }`}
              >
                <span>{category}</span>
                <span
                  className={`ml-2 text-xs ${
                    filter === category ? "text-white/80" : "text-gray-500"
                  }`}
                >
                  ({getProjectCountByCategory(category)})
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Projects Grid - Layout Focado na Imagem */}
        <motion.div
          layout
          className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence>
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{
                  y: -8,
                  scale: 1.02,
                }}
                className="group cursor-pointer"
              >
                <div className="hover:border-electric-500/30 relative flex h-full flex-col overflow-hidden rounded-3xl border border-gray-700/50 bg-gray-800/30 shadow-2xl shadow-black/30 backdrop-blur-sm transition-all duration-500">
                  {/* Featured Badge */}
                  {project.featured && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 + 0.3 }}
                      className="absolute top-4 left-4 z-20"
                    >
                      <div className="font-inter flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 px-3 py-1.5 text-xs font-bold text-black shadow-lg">
                        <Sparkles size={12} />
                        Destaque
                      </div>
                    </motion.div>
                  )}

                  {/* Status Badge */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + 0.4 }}
                    className="absolute top-4 right-4 z-20"
                  >
                    <div
                      className={`font-inter rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-sm ${getStatusColor(project.status)} border border-white/10`}
                    >
                      {getStatusText(project.status)}
                    </div>
                  </motion.div>

                  {/* Project Image Container */}
                  <div
                    className={`relative h-64 overflow-hidden bg-gradient-to-br ${project.accentColor}`}
                  >
                    {/* Main Image with Glow Effect */}
                    <motion.img
                      src={project.image}
                      alt={project.title}
                      className="h-full w-full transform object-cover transition-transform duration-700 group-hover:scale-110"
                      whileHover={{ scale: 1.1 }}
                    />

                    {/* Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-transparent" />

                    {/* Shine Effect on Hover */}
                    <div className="absolute inset-0 translate-x-[-100%] -skew-x-12 transform bg-gradient-to-r from-transparent via-white/5 to-transparent transition-transform duration-1000 group-hover:translate-x-[100%]" />

                    {/* View Project Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all duration-500 group-hover:bg-black/40">
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        whileHover={{ opacity: 1, scale: 1 }}
                        className="transform rounded-xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-md transition-all duration-300"
                      >
                        <Eye size={24} />
                      </motion.div>
                    </div>
                  </div>

                  {/* Content Below Image */}
                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-electric-500 font-inter text-sm font-semibold">
                        {project.category}
                      </span>
                      <Code size={18} className="text-gray-500" />
                    </div>

                    <h3 className="font-space group-hover:text-electric-400 mb-3 line-clamp-1 text-xl font-bold transition-colors duration-300">
                      {project.title}
                    </h3>

                    <p className="font-inter mb-4 line-clamp-2 flex-1 text-sm leading-relaxed text-gray-300">
                      {project.description}
                    </p>

                    {/* Technologies Tags */}
                    <div className="mb-4 flex flex-wrap gap-2">
                      {project.technologies.slice(0, 3).map((tech) => (
                        <motion.span
                          key={tech}
                          whileHover={{ scale: 1.05 }}
                          className="font-inter rounded-full border border-gray-600/50 bg-gray-700/50 px-3 py-1 text-xs text-gray-200 backdrop-blur-sm"
                        >
                          {tech}
                        </motion.span>
                      ))}
                      {project.technologies.length > 3 && (
                        <span className="font-inter rounded-full border border-gray-600/50 bg-gray-700/50 px-3 py-1 text-xs text-gray-400 backdrop-blur-sm">
                          +{project.technologies.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Action Button */}
                    <motion.button
                      onClick={() => setSelectedProject(project)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="hover:from-electric-500/20 hover:border-electric-500/30 font-inter flex w-full items-center justify-center gap-2 rounded-xl border border-gray-600/50 bg-gradient-to-r from-gray-700/50 to-gray-800/50 px-4 py-3 text-sm font-semibold text-gray-300 backdrop-blur-sm transition-all duration-300 hover:to-purple-500/20 hover:text-white"
                    >
                      <Eye size={16} />
                      Ver Detalhes
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty State */}
        {filteredProjects.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-16 text-center"
          >
            <Code size={64} className="mx-auto mb-4 text-gray-600" />
            <h3 className="font-space mb-2 text-2xl font-bold text-gray-400">
              Nenhum projeto encontrado
            </h3>
            <p className="font-inter text-gray-500">
              Não há projetos na categoria {`"${filter}"`} no momento.
            </p>
          </motion.div>
        )}
      </div>

      {/* Project Modal com Foco na Imagem */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-lg"
            onClick={() => setSelectedProject(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-gray-700/50 bg-gray-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 flex items-center justify-between border-b border-gray-700/50 bg-gray-900/95 p-8 backdrop-blur-xl">
                <div>
                  <h3 className="font-space bg-gradient-to-r from-white to-gray-300 bg-clip-text text-3xl font-bold text-transparent">
                    {selectedProject.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-electric-500 font-inter text-lg font-semibold">
                      {selectedProject.category}
                    </span>
                    <div
                      className={`font-inter rounded-full px-3 py-1 text-sm font-medium backdrop-blur-sm ${getStatusColor(selectedProject.status)} border border-white/10`}
                    >
                      {getStatusText(selectedProject.status)}
                    </div>
                  </div>
                </div>
                <motion.button
                  onClick={() => setSelectedProject(null)}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  className="rounded-xl p-3 text-gray-400 backdrop-blur-sm transition-colors hover:bg-gray-800/50 hover:text-white"
                >
                  <X size={28} />
                </motion.button>
              </div>

              {/* Modal Content */}
              <div className="p-8">
                {/* Hero Image */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative mb-8 h-96 overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900"
                >
                  <Image
                    src={selectedProject.image}
                    alt={selectedProject.title}
                    width={1000}
                    height={1000}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />

                  {/* Shine Effect */}
                  <div className="absolute inset-0 -skew-x-12 transform animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </motion.div>

                {/* Description */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-8"
                >
                  <h4 className="font-space mb-4 flex items-center gap-3 text-2xl font-semibold">
                    <Sparkles size={24} className="text-electric-500" />
                    Sobre o Projeto
                  </h4>
                  <p className="font-inter text-lg leading-relaxed text-gray-300">
                    {selectedProject.fullDescription}
                  </p>
                </motion.div>

                {/* Technologies */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-8"
                >
                  <h4 className="font-space mb-4 flex items-center gap-3 text-2xl font-semibold">
                    <Code size={24} className="text-electric-500" />
                    Tecnologias Utilizadas
                  </h4>
                  <div className="flex flex-wrap gap-4">
                    {selectedProject.technologies.map((tech) => (
                      <motion.span
                        key={tech}
                        whileHover={{ scale: 1.05, y: -2 }}
                        className="font-inter rounded-xl border border-gray-700/50 bg-gray-800/50 px-5 py-3 text-lg font-medium text-gray-200 backdrop-blur-sm"
                      >
                        {tech}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-col gap-4 sm:flex-row"
                >
                  {selectedProject.liveUrl && (
                    <motion.a
                      href={selectedProject.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-electric-500 hover:bg-electric-600 font-inter shadow-electric-500/25 flex items-center justify-center gap-3 rounded-xl px-8 py-4 text-lg font-bold shadow-2xl transition-all duration-300"
                    >
                      <ExternalLink size={20} />
                      Ver Projeto Online
                      <ArrowUpRight size={18} />
                    </motion.a>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default SectionProjects;
