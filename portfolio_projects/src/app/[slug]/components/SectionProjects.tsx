"use client";

import { ContactInfo, LandingPage } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  Code,
  ExternalLink,
  Eye,
  Filter,
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
    title: "Erik Santos",
    category: "Portfólio Pessoal",
    description:
      "Portfólio moderno e minimalista para desenvolvedor web full-stack.",
    fullDescription:
      "Portfólio pessoal com foco em design limpo, navegação fluida e destaque para projetos, tecnologias dominadas e formas de contato. Desenvolvido com animações suaves via Framer Motion e SEO otimizado.",
    image:
      "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_eriksantos.png",
    technologies: [
      "Next.js",
      "TypeScript",
      "Framer Motion",
      "Tailwind CSS",
      "ShadCN",
      "Prisma",
      "NeonDB",
      "Vercel",
    ],
    liveUrl: "https://eriksantos.vercel.app",
    featured: true,
    status: "completed",
    accentColor: "from-purple-500/20 to-pink-600/20",
  },
  {
    id: 2,
    title: "Fran Costa | Mentora & Designer de Olhar",
    category: "Serviços Profissionais",
    description:
      "Divulgação de serviços e curso de beleza da Mentora Fran Costa.",
    fullDescription:
      "Foco em designer premium e elegante, palheta de cores seguindo as redes sociais da Fran Costa, navegação fluida e responsiva. Desenvolvido com animações suaves via Framer Motion e SEO otimizado.",
    image:
      "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_francostaacademy.png",
    technologies: [
      "Next.js",
      "TypeScript",
      "Framer Motion",
      "Tailwind CSS",
      "Artifact UI",
      "Aceternity UI",
      "Supabase",
      "NeonDB",
      "Prisma",
      "Vercel",
    ],
    liveUrl: "https://francostaacademy.vercel.app",
    featured: true,
    status: "completed",
    accentColor: "from-purple-500/20 to-pink-600/20",
  },
  {
    id: 3,
    title: "Insertion 3D Studio",
    category: "Serviços Profissionais",
    description:
      "Landing Page moderna e otimizada desenvolvida para um estúdio nacional de design imobiliário 3D.",
    fullDescription:
      "Projeto com foco em SEO, acessibilidade, alta performance e experiência do usuário. Totalmente responsivo e integrado a ferramentas modernas de envio e gestão de conteúdo.",
    image:
      "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_insertion.png",
    technologies: [
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
      "Resend",
      "Artifact UI",
      "Aceternity UI",
      "Framer Motion",
      "Supabase",
      "NeonDB",
      "Prisma",
      "Vercel",
    ],
    liveUrl: "https://insertion.com.br/",
    featured: true,
    status: "completed",
    accentColor: "from-teal-400 to-emerald-500",
  },
  {
    id: 4,
    title: "Sendo Metanoiamente Bíblico",
    category: "Página de Vendas",
    description:
      "Landing page para e-book focado em crescimento espiritual e estudo bíblico.",
    fullDescription:
      "Página de vendas otimizada para conversão, com design limpo e foco na mensagem do e-book. Inclui seções estratégicas para destacar benefícios, conteúdo e chamada para ação clara.",
    image:
      "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_metanoiamentebiblico.png",
    technologies: [
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
      "Framer Motion",
      "Prisma",
      "Neon",
      "Aceternity UI",
    ],
    liveUrl: "https://metanoiamentebiblico.vercel.app",
    featured: true,
    status: "completed",
    accentColor: "from-pink-500/20 to-purple-600/20",
  },
  {
    id: 5,
    title: "Neodoxa",
    category: "Serviços Profissionais",
    description:
      "Landing page para agência de marketing e desenvolvimento digital.",
    fullDescription:
      "Landing page institucional da Neodoxa, criada para reforçar presença digital e captar leads. Interface moderna com animações suaves e seções estratégicas.",
    image:
      "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_neodoxa.png",
    technologies: [
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
      "Framer Motion",
      "Prisma",
      "Neon",
      "ShadCN",
    ],
    liveUrl: "https://neodoxa.vercel.app/neodoxa",
    featured: true,
    status: "in-progress",
    accentColor: "from-pink-500/20 to-purple-600/20",
  },
  {
    id: 6,
    title: "Projeto Cafarnaum Em Ação",
    category: "Institucional",
    description:
      "Landing page simples e eficaz para organização sem fins lucrativos.",
    fullDescription:
      "Landing page desenvolvida para o Projeto Cafarnaum Em Ação, com foco em apresentar a missão, projetos e formas de apoio. Design limpo, responsivo e otimizado para engajamento.",
    image:
      "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_projetocafarnaum.png",
    technologies: [
      "Next.js",
      "TypeScript",
      "Prisma",
      "Tailwind CSS",
      "NeonDb",
      "Supabase",
    ],
    liveUrl: "https://projetocafarnaum.vercel.app/",
    featured: false,
    status: "completed",
    accentColor: "from-yellow-500/20 to-orange-600/20",
  },
  {
    id: 7,
    title: "Gil Schinaider Terceirizações",
    category: "Serviços Profissionais",
    description:
      "Landing page institucional desenvolvida para empresa de terceirização e serviços de limpeza profissional.",
    fullDescription:
      "Projeto focado em transmitir confiança e credibilidade, com design limpo, responsivo e otimizado para conversão via WhatsApp. Estruturado com tecnologias modernas e performance aprimorada.",
    image:
      "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_gilshinaider.png",
    technologies: [
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
      "Artifact UI",
      "Aceternity UI",
      "NeonDB",
      "Prisma",
      "Vercel",
    ],
    liveUrl: "https://gilschinaider.vercel.app/",
    featured: true,
    status: "completed",
    accentColor: "from-sky-400/30 to-blue-600/40",
  },
  {
    id: 8,
    title: "RDS Eletricista",
    category: "Serviços Profissionais",
    description:
      "Landing page institucional para profissional autônomo da área elétrica.",
    fullDescription:
      "Site criado para o eletricista RDS, com foco em autoridade, confiança e conversão. Design escuro, moderno e integração direta com WhatsApp para orçamentos.",
    image:
      "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_rdseletrecista.png",
    technologies: ["Next.js", "TypeScript", "Tailwind CSS"],
    liveUrl: "https://rds-psi.vercel.app/",
    featured: false,
    status: "in-progress",
    accentColor: "from-yellow-400/20 to-orange-500/20",
  },
  {
    id: 9,
    title: "Rafa Manicure & Pedicure",
    category: "Serviços Profissionais",
    description: "Landing page para profissionais em limpeza e zeladoria",
    fullDescription:
      "Desenvolvido para Rafa Manicure, com um design feminino e elegante. Inclui galeria de serviços, integração para contato rápido e layout 100% responsivo.",
    image:
      "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_rafamanicure.png",
    technologies: ["Next.js", "TypeScript", "Tailwind CSS", "Prisma", "NeonDb"],
    liveUrl: "https://rafamanicurepedicure.vercel.app/",
    featured: false,
    status: "completed",
    accentColor: "from-rose-500/20 to-pink-600/20",
  },
  {
    id: 10,
    title: "Itajuba Casamar",
    category: "Serviços Profissionais",
    description:
      "Landing page desenvolvida para destacar empreendimentos imobiliários com design moderno e foco em performance.",
    fullDescription:
      "Projeto desenvolvido para a construtora Rottas, apresentando o empreendimento Itajuba Casamar com ênfase em experiência do usuário, responsividade e carregamento otimizado. A página foi criada para valorizar o alto padrão do empreendimento e fortalecer a presença digital da marca.",
    image:
      "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_itajubacasamar.png",
    technologies: [
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
      "NeonDB",
      "Prisma",
      "Vercel",
    ],
    liveUrl: "https://itajubacasamar.vercel.app/",
    featured: false,
    status: "completed",
    accentColor: "from-blue-700/30 to-sky-400/30",
  },
  {
    id: 11,
    title: "Marivaldo Corretor de Imóveis",
    category: "Serviços Profissionais",
    description:
      "Landing page moderna e estratégica para corretores de imóveis.",
    fullDescription:
      "Desenvolvimento de uma landing page com foco em conversão e autoridade. Inclui apresentação profissional, portfólio de imóveis, formulário de contato e integração com WhatsApp.",
    image:
      "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_marivaldo.png",
    technologies: [
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
      "Prisma",
      "Neon",
      "ShadCN",
    ],
    liveUrl: "https://corretor-landing-page.vercel.app/",
    featured: false,
    status: "in-progress",
    accentColor: "from-green-500/20 to-emerald-600/20",
  },
  {
    id: 12,
    title: "João Garcia Fotografia",
    category: "Serviços Profissionais",
    description:
      "Landing page artística e elegante para fotógrafo profissional.",
    fullDescription:
      "Landing page desenvolvida para o fotógrafo João Garcia, com galeria categorizada, depoimentos e contato direto via WhatsApp. Layout moderno, foco visual e excelente responsividade.",
    image:
      "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_joaogarcia.png",
    technologies: [
      "Next.js",
      "TypeScript",
      "Prisma",
      "Tailwind CSS",
      "NeonDb",
      "ShadCN",
    ],
    liveUrl: "https://joaogarcia.vercel.app/",
    featured: false,
    status: "completed",
    accentColor: "from-yellow-500/20 to-orange-600/20",
  },
  {
    id: 13,
    title: "Neodoxa Delivery",
    category: "Restaurante e Delivery",
    description:
      "Sistema de delivery moderno e responsivo para restaurante especializado em marmitas.",
    fullDescription:
      "Plataforma completa desenvolvida para a Neodoxa Delivery, apresentando cardápio, pedidos online e integração com WhatsApp. Otimizada para conversão e experiência mobile, com pagamentos via Stripe e painel administrativo.",
    image:
      "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_neodoxadelivery.png",
    technologies: [
      "Next.js 14",
      "TypeScript",
      "Prisma",
      "Stripe",
      "Tailwind CSS",
      "NeonDb",
      "ShadCN",
    ],
    liveUrl: "https://neodoxa-delivery.vercel.app/",
    featured: true,
    status: "completed",
    accentColor: "from-blue-500/20 to-purple-600/20",
  },
  {
    id: 14,
    title: "Tarefando",
    category: "Aplicativo Web",
    description:
      "Gerenciador de tarefas simples e eficiente para organizar o dia a dia.",
    fullDescription:
      "Aplicativo web com funcionalidades de adicionar, editar e concluir tarefas. Interface intuitiva e responsiva, com armazenamento local e design minimalista.",
    image:
      "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_tarefando.png",
    technologies: ["Python", "Django", "NeonDb"],
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
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Categorias atualizadas baseadas nos projetos reais
  const categories = [
    "Todos",
    "Portfólio Pessoal",
    "Serviços Profissionais",
    "Página de Vendas",
    "Institucional",
    "Restaurante e Delivery",
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
            Veja os{" "}
            <span className="text-electric-500">{projects.length}+</span>{" "}
            Projetos <span className="text-electric-500">Impactantes</span>
          </h2>
          <p className="font-inter mx-auto max-w-3xl text-xl text-gray-400 md:text-2xl">
            Cada imagem conta uma história de inovação, design e excelência
            técnica entre {projects.length} projetos entregues
          </p>
        </motion.div>

        {/* Filter Dropdown Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16 flex justify-center"
        >
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="font-inter group relative flex items-center gap-3 rounded-full border border-gray-700 bg-gray-800/50 px-6 py-3 font-medium backdrop-blur-sm transition-all duration-300 hover:border-gray-600 hover:text-white"
            >
              <Filter size={20} className="text-electric-500" />
              <span>Filtrar por Categoria</span>
              <span className="text-electric-500">
                ({getProjectCountByCategory(filter)})
              </span>
            </motion.button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showFilterDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 left-0 z-50 mt-2 rounded-2xl border border-gray-700/50 bg-gray-800/95 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl"
                >
                  {categories.map((category) => (
                    <motion.button
                      key={category}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setFilter(category);
                        setShowFilterDropdown(false);
                      }}
                      className={`font-inter group flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-all duration-300 ${
                        filter === category
                          ? "bg-electric-500 shadow-electric-500/25 text-white shadow-lg"
                          : "text-gray-400 hover:bg-gray-700/50 hover:text-white"
                      }`}
                    >
                      <span>{category}</span>
                      <span
                        className={`text-sm ${
                          filter === category
                            ? "text-white/80"
                            : "text-gray-500"
                        }`}
                      >
                        {getProjectCountByCategory(category)}
                      </span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
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

      {/* Project Modal com Foco na Imagem - RESPONSIVO */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 backdrop-blur-lg sm:p-4"
            onClick={() => setSelectedProject(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="mx-2 max-h-[95dvh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-gray-700/50 bg-gray-900/95 shadow-2xl shadow-black/50 backdrop-blur-xl sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 flex flex-col justify-between gap-4 border-b border-gray-700/50 bg-gray-900/95 p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:gap-0 sm:p-6 lg:p-8">
                <div className="min-w-0 flex-1">
                  <h3 className="font-space bg-gradient-to-r from-white to-gray-300 bg-clip-text text-xl font-bold break-words text-transparent sm:text-2xl lg:text-3xl">
                    {selectedProject.title}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="text-electric-500 font-inter text-sm font-semibold sm:text-base lg:text-lg">
                      {selectedProject.category}
                    </span>
                    <div
                      className={`font-inter rounded-full px-2 py-1 text-xs font-medium backdrop-blur-sm sm:px-3 sm:py-1 sm:text-sm ${getStatusColor(selectedProject.status)} border border-white/10 whitespace-nowrap`}
                    >
                      {getStatusText(selectedProject.status)}
                    </div>
                  </div>
                </div>
                <motion.button
                  onClick={() => setSelectedProject(null)}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  className="flex-shrink-0 self-start rounded-xl p-2 text-gray-400 backdrop-blur-sm transition-colors hover:bg-gray-800/50 hover:text-white sm:self-auto sm:p-3"
                >
                  <X size={20} className="sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
                </motion.button>
              </div>

              {/* Modal Content */}
              <div className="p-4 sm:p-6 lg:p-8">
                {/* Hero Image */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative mb-6 h-48 overflow-hidden rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 sm:mb-8 sm:h-64 sm:rounded-2xl md:h-80 lg:h-96"
                >
                  <Image
                    src={selectedProject.image}
                    alt={selectedProject.title}
                    width={1200}
                    height={600}
                    className="h-full w-full object-cover"
                    priority
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
                  className="mb-6 sm:mb-8"
                >
                  <h4 className="font-space mb-3 flex items-center gap-2 text-lg font-semibold sm:mb-4 sm:gap-3 sm:text-xl lg:text-2xl">
                    <Sparkles
                      size={20}
                      className="text-electric-500 sm:h-6 sm:w-6"
                    />
                    <span className="text-base sm:text-lg lg:text-xl">
                      Sobre o Projeto
                    </span>
                  </h4>
                  <p className="font-inter text-sm leading-relaxed text-gray-300 sm:text-base sm:leading-loose lg:text-lg">
                    {selectedProject.fullDescription}
                  </p>
                </motion.div>

                {/* Technologies */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-6 sm:mb-8"
                >
                  <h4 className="font-space mb-3 flex items-center gap-2 text-lg font-semibold sm:mb-4 sm:gap-3 sm:text-xl lg:text-2xl">
                    <Code
                      size={20}
                      className="text-electric-500 sm:h-6 sm:w-6"
                    />
                    <span className="text-base sm:text-lg lg:text-xl">
                      Tecnologias Utilizadas
                    </span>
                  </h4>
                  <div className="flex flex-wrap gap-2 sm:gap-3 lg:gap-4">
                    {selectedProject.technologies.map((tech) => (
                      <motion.span
                        key={tech}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className="font-inter rounded-lg border border-gray-700/50 bg-gray-800/50 px-3 py-2 text-xs font-medium whitespace-nowrap text-gray-200 backdrop-blur-sm sm:rounded-xl sm:px-4 sm:py-2 sm:text-sm lg:px-5 lg:py-3 lg:text-base"
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
                  className="flex flex-col gap-3 sm:gap-4"
                >
                  {selectedProject.liveUrl && (
                    <motion.a
                      href={selectedProject.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="bg-electric-500 hover:bg-electric-600 font-inter shadow-electric-500/25 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-center text-sm font-bold shadow-xl transition-all duration-300 sm:w-auto sm:gap-3 sm:rounded-xl sm:px-6 sm:py-4 sm:text-base sm:shadow-2xl lg:px-8 lg:text-lg"
                    >
                      <ExternalLink size={18} className="sm:h-5 sm:w-5" />
                      <span>Ver Projeto Online</span>
                      <ArrowUpRight size={16} className="sm:h-4 sm:w-4" />
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
