"use client";

import { ContactInfo, LandingPage } from "@prisma/client";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  BarChart3,
  Code,
  Coffee,
  Globe,
  Heart,
  Palette,
  Rocket,
  ShoppingCart,
  Star,
  Users,
} from "lucide-react";
import Image from "next/image";
import React from "react";
interface SectionAboutProps {
  contact: ContactInfo;
  landingpage: LandingPage;
}

// Serviços substituindo as habilidades
const services = [
  {
    name: "Desenvolvimento Web",
    icon: Code,
    description:
      "Criação de sites modernos e otimizados com React, Next.js e TypeScript.",
    features: ["Responsivo", "Otimizado para SEO", "Alta Performance"],
  },
  {
    name: "UI/UX Design",
    icon: Palette,
    description:
      "Designs intuitivos e atraentes que aumentam a conversão e melhoram a experiência do usuário.",
    features: ["Prototipagem", "Design System", "User Testing"],
  },
  {
    name: "E-commerce",
    icon: ShoppingCart,
    description:
      "Lojas virtuais completas e seguras com integração de pagamentos e gestão fácil.",
    features: ["Pagamentos Online", "Gestão de Estoque", "Dashboard"],
  },
  {
    name: "Landing Pages",
    icon: Globe,
    description:
      "Páginas de alta conversão para divulgar produtos, serviços ou campanhas.",
    features: ["Copy Otimizado", "A/B Testing", "Analytics"],
  },
  {
    name: "Consultoria Tech",
    icon: BarChart3,
    description:
      "Análise e estratégia para otimizar a presença digital do seu negócio.",
    features: ["Análise Técnica", "Roadmap", "Mentoria"],
  },
];

const stats = [
  { number: "10+", label: "Projetos Desenvolvidos", icon: Rocket },
  { number: "100%", label: "Capacitado", icon: Users },
  { number: "100%", label: "Dedicação em Cada Projeto", icon: Star },
  { number: "∞", label: "Cafés & Criatividade", icon: Coffee },
];

const technologies = [
  { name: "Next.js", color: "text-white" },
  { name: "React", color: "text-cyan-400" },
  { name: "TypeScript", color: "text-blue-500" },
  { name: "Tailwind CSS", color: "text-teal-400" },
  { name: "Node.js", color: "text-green-500" },
  { name: "Prisma", color: "text-white" },
  { name: "MySQL", color: "text-blue-400" },
  { name: "Firebase", color: "text-yellow-400" },
  { name: "ShadCN", color: "text-white" },
  { name: "Stripe", color: "text-purple-500" },
  { name: "Vite", color: "text-purple-400" },
];

const SectionAbout = ({ contact, landingpage }: SectionAboutProps) => {
  const experienceYears = new Date().getFullYear() - 2021;

  return (
    <section
      id="sobre"
      className="relative overflow-hidden bg-gradient-to-b from-gray-900 to-gray-950 py-24"
    >
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="bg-electric-500/10 absolute top-1/4 left-1/4 h-72 w-72 animate-pulse rounded-full blur-3xl"></div>
        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 animate-pulse rounded-full bg-purple-500/10 blur-3xl delay-1000"></div>
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <h2 className="font-space mb-6 text-4xl font-bold md:text-6xl">
            Sobre <span className="text-electric-500">Mim</span>
          </h2>
          <p className="font-inter mx-auto max-w-3xl text-xl text-gray-300">
            Conheça a paixão e expertise por trás de cada linha de código
          </p>
        </motion.div>

        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* Left Side - Image & Personal Info */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative">
              {/* Background Glow */}
              <div className="from-electric-500/20 absolute -inset-4 rounded-3xl bg-gradient-to-r to-purple-500/20 blur-3xl" />

              {/* Profile Card */}
              <div className="relative rounded-2xl border border-gray-700 bg-gray-800/50 p-8 shadow-2xl backdrop-blur-sm">
                {/* Profile Image */}
                <div className="relative mb-6">
                  {landingpage.coverImageUrl ? (
                    <Image
                      src={landingpage.coverImageUrl}
                      alt={landingpage.name}
                      width={1000}
                      height={500}
                      className="border-electric-500/50 shadow-electric-500/20 h-64 w-full rounded-xl border-2 object-cover shadow-lg"
                    />
                  ) : (
                    <div className="from-electric-500 flex h-64 w-full items-center justify-center rounded-xl bg-gradient-to-br to-purple-600">
                      <span className="text-4xl font-bold text-white">
                        {landingpage.name.charAt(0)}
                      </span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="font-inter absolute -top-3 -right-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg"
                  >
                    🚀 Disponível para projetos
                  </motion.div>
                </div>

                {/* Personal Info */}
                <div className="space-y-4">
                  <h3 className="font-space text-2xl font-bold text-white">
                    {landingpage.name}
                  </h3>
                  <p className="font-inter leading-relaxed text-gray-300">
                    {landingpage.description}
                  </p>

                  {/* Contact Quick Info */}
                  <div className="flex flex-wrap gap-4 pt-4">
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Mail size={16} />
                        <span>{contact.email}</span>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Phone size={16} />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Botão Mais Sobre Mim */}
                  <motion.a
                    href="https://eriksantos.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="font-inter mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gray-700/50 px-6 py-3 font-semibold text-gray-300 transition-all duration-300 hover:bg-gray-600 hover:text-white"
                  >
                    <Heart size={18} />
                    Mais sobre mim
                    <ArrowUpRight size={16} />
                  </motion.a>
                </div>

                {/* Floating Elements */}
                <motion.div
                  animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="bg-electric-500 absolute -top-2 -right-2 rounded-xl p-3 shadow-lg"
                >
                  <Code size={20} className="text-white" />
                </motion.div>

                <motion.div
                  animate={{ y: [0, 10, 0], rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, delay: 2 }}
                  className="absolute -bottom-2 -left-2 rounded-xl bg-purple-500 p-3 shadow-lg"
                >
                  <Palette size={20} className="text-white" />
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-8"
          >
            {/* Introduction */}
            <div className="space-y-6">
              <h3 className="font-space text-3xl font-bold text-white">
                Minha <span className="text-electric-500">Jornada</span>
              </h3>
              <div className="font-inter space-y-4 leading-relaxed text-gray-300">
                <p>
                  Sou <strong className="text-white">{landingpage.name}</strong>
                  , um desenvolvedor full-stack apaixonado por criar soluções
                  digitais que fazem a diferença. Com mais de {experienceYears}{" "}
                  anos de experiência, especializo-me em transformar ideias
                  complexas em experiências intuitivas e performáticas.
                </p>
                <p>
                  Minha stack principal inclui{" "}
                  <strong className="text-electric-500">Next.js</strong>,
                  <strong className="text-blue-500"> TypeScript</strong>, e
                  <strong className="text-teal-400"> Tailwind CSS</strong>,
                  sempre priorizando as melhores práticas de desenvolvimento e
                  UX.
                </p>
                <p>
                  Acredito que o código vai além da funcionalidade - é sobre
                  criar experiências memoráveis que resolvem problemas reais e
                  geram valor para os usuários.
                </p>
              </div>
            </div>

            {/* Services Grid */}
            <div>
              <h3 className="font-space mb-6 text-2xl font-semibold text-white">
                Serviços que <span className="text-electric-500">Ofereço</span>
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {services.map((service, index) => (
                  <motion.div
                    key={service.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="group hover:border-electric-500/50 hover:shadow-electric-500/10 rounded-xl border border-gray-700 bg-gray-800/50 p-4 backdrop-blur-sm transition-all duration-300 hover:shadow-lg"
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <div className="bg-electric-500/20 rounded-lg p-2 transition-transform duration-300 group-hover:scale-110">
                        <service.icon size={20} className="text-electric-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-inter text-sm font-semibold text-white">
                          {service.name}
                        </h4>
                        <p className="font-inter mt-1 text-xs text-gray-400">
                          {service.description}
                        </p>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="mb-3 flex flex-wrap gap-1">
                      {service.features.map((feature, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-gray-700/50 px-2 py-1 text-xs text-gray-300"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          document
                            .getElementById("contato")
                            ?.scrollIntoView({ behavior: "smooth" })
                        }
                        className="font-inter text-electric-500 flex gap-2 text-sm font-semibold"
                      >
                        Solicitar Orçamento
                        <ArrowUpRight size={16} />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-2 gap-6 pt-8 lg:grid-cols-4"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 + 0.6 }}
                  className="group text-center transition-all duration-300 hover:scale-105"
                >
                  <div className="group-hover:border-electric-500/50 rounded-xl border border-gray-700 bg-gray-800/50 p-4 backdrop-blur-sm">
                    <div className="mb-2 flex justify-center">
                      <stat.icon size={24} className="text-electric-500" />
                    </div>
                    <div className="font-space text-electric-500 mb-1 text-2xl font-bold">
                      {stat.number}
                    </div>
                    <div className="font-inter text-xs text-gray-400">
                      {stat.label}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Technologies */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="pt-8"
            >
              <h4 className="font-inter mb-4 text-center text-sm font-semibold text-gray-400">
                Tecnologias que domino:
              </h4>
              <div className="flex flex-wrap justify-center gap-3">
                {technologies.map((tech, index) => (
                  <motion.span
                    key={tech.name}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className={`font-inter rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs ${tech.color} hover:border-electric-500 transition-colors duration-300`}
                  >
                    {tech.name}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// Adicionando ícones que faltavam
const Mail = ({ size, className }: { size: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const Phone = ({ size, className }: { size: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
    />
  </svg>
);

export default SectionAbout;
