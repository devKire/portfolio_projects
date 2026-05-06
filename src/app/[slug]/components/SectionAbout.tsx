'use client';

import { ContactInfo, LandingPage } from '@prisma/client';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import {
  ArrowRight,
  CheckCircle,
  Code,
  Heart,
  Mail,
  MessageCircle,
  Phone,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import React, { useRef, useState } from 'react';

/* ================================================================
   SPOTLIGHT CARD — Hover com luz seguindo o mouse
   ================================================================ */
const SpotlightCard = ({
  children,
  className,
  spotlightColor = 'rgba(59, 130, 246, 0.08)',
}: {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 20 });
  const background = useMotionTemplate`radial-gradient(500px circle at ${springX}px ${springY}px, ${spotlightColor}, transparent 80%)`;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl transition-all duration-300 hover:border-white/[0.12] ${className || ''}`}
    >
      {children}
    </div>
  );
};

/* ================================================================
   BENTO GRID — Layout vertical no desktop
   ================================================================ */
const BentoGrid = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => (
  <div
    className={`mx-auto grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5 ${className || ''}`}
  >
    {children}
  </div>
);

const BentoGridItem = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
  colSpan?: number;
  rowSpan?: number;
}) => {
  return <div className={`${className || ''}`}>{children}</div>;
};

/* ================================================================
   INTERFACES
   ================================================================ */
interface SectionAboutProps {
  contact: ContactInfo;
  landingpage: LandingPage;
}

const technologies = [
  'Next.js',
  'React',
  'TypeScript',
  'Tailwind CSS',
  'Node.js',
  'Prisma',
  'PostgreSQL',
  'Firebase',
  'Stripe',
  'ShadCN UI',
  'Framer Motion',
  'Docker',
];

/* ================================================================
   COMPONENTE PRINCIPAL
   ================================================================ */
const SectionAbout = ({ contact, landingpage }: SectionAboutProps) => {
  const [copied, setCopied] = useState(false);
  const experienceYears = new Date().getFullYear() - 2021;

  const handleCopy = () => {
    navigator.clipboard.writeText(contact.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="sobre" className="overflow-hiddenpy-20 relative md:py-28">
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center md:mb-20"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 backdrop-blur-sm">
            <Sparkles size={14} className="text-blue-400" />
            <span className="text-xs font-medium text-gray-400">
              Quem está por trás do código
            </span>
          </div>

          <h2 className="font-space text-4xl leading-tight font-bold tracking-tight sm:text-5xl md:text-6xl">
            Não é só código.
            <span className="mt-2 block bg-gradient-to-r from-blue-400 via-purple-400 to-purple-500 bg-clip-text text-transparent">
              É resultado.
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-sm text-gray-500 sm:text-base">
            {experienceYears}+ anos transformando ideias em soluções digitais
            que geram valor real.
          </p>
        </motion.div>

        {/* ============================================ */}
        {/* BENTO GRID — 2 COLUNAS NO DESKTOP */}
        {/* ============================================ */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
          {/* COLUNA ESQUERDA */}
          <div className="flex flex-col gap-4 lg:gap-5">
            {/* CARD HERO — Foto + Bio + Contato */}
            <SpotlightCard
              spotlightColor="rgba(59, 130, 246, 0.06)"
              className="flex flex-col p-6 sm:p-8"
            >
              {/* Foto */}
              <div className="-mx-6 -mt-6 mb-5 overflow-hidden sm:-mx-8 sm:-mt-8">
                {landingpage.coverImageUrl ? (
                  <Image
                    src={landingpage.coverImageUrl}
                    alt={landingpage.name}
                    width={700}
                    height={400}
                    className="h-52 w-full object-cover sm:h-64"
                  />
                ) : (
                  <div className="flex h-52 items-center justify-center bg-gradient-to-br from-blue-600/30 to-purple-600/30 sm:h-64">
                    <span className="text-7xl font-bold text-white/20">
                      {landingpage.name.charAt(0)}
                    </span>
                  </div>
                )}
                {/* Badge disponível */}
                <div className="absolute top-0 right-0 left-0 flex justify-between p-4">
                  <div />
                  <div className="flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 backdrop-blur-sm">
                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                    <span className="text-xs font-medium text-green-400">
                      Disponível
                    </span>
                  </div>
                </div>
              </div>

              {/* Nome + Bio */}
              <h3 className="font-space text-2xl font-bold sm:text-3xl">
                {landingpage.name}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400 sm:text-base">
                {landingpage.description}
              </p>

              {/* Contato rápido */}
              <div className="mt-auto flex flex-wrap gap-2 pt-5">
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-white/[0.15] hover:text-white"
                  >
                    <Mail size={12} />
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-white/[0.15] hover:text-white"
                  >
                    <Phone size={12} />
                    {contact.phone}
                  </a>
                )}
              </div>
            </SpotlightCard>

            {/* CARD STACK TECNOLÓGICA */}
            <SpotlightCard
              spotlightColor="rgba(6, 182, 212, 0.05)"
              className="p-6 sm:p-7"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-cyan-500/10 p-2">
                  <Code size={20} className="text-cyan-400" />
                </div>
                <h4 className="font-space text-lg font-semibold">
                  Stack Tecnológica
                </h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {technologies.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-1.5 text-xs text-gray-400 transition-colors hover:border-white/[0.12] hover:text-white"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </SpotlightCard>
          </div>

          {/* COLUNA DIREITA */}
          <div className="flex flex-col gap-4 lg:gap-5">
            {/* CARD SATISFAÇÃO */}
            <SpotlightCard
              spotlightColor="rgba(236, 72, 153, 0.06)"
              className="flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="mb-3 inline-flex rounded-2xl bg-pink-500/10 p-3">
                <Heart size={28} className="text-pink-400" />
              </div>
              <p className="font-space text-4xl font-bold text-white">98%</p>
              <p className="mt-1 text-sm text-gray-400">Clientes satisfeitos</p>
              <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                <Star size={12} className="text-yellow-500" />
                Recorrentes
              </p>
            </SpotlightCard>

            {/* CARD DIFERENCIAIS */}
            <SpotlightCard
              spotlightColor="rgba(16, 185, 129, 0.05)"
              className="p-6 sm:p-7"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-green-500/10 p-2">
                  <TrendingUp size={20} className="text-green-400" />
                </div>
                <h4 className="font-space text-lg font-semibold">
                  Foco em Resultados
                </h4>
              </div>
              <p className="mb-4 text-sm text-gray-400">
                Não entrego apenas código. Entrego soluções que impactam seu
                negócio.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: Shield, text: 'Código Seguro' },
                  { icon: Zap, text: 'Performance' },
                  { icon: Users, text: 'Comunicação' },
                  { icon: CheckCircle, text: 'Qualidade' },
                ].map((item) => (
                  <div
                    key={item.text}
                    className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2"
                  >
                    <item.icon size={14} className="text-blue-400" />
                    <span className="text-xs text-gray-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </SpotlightCard>

            {/* CARD CTA */}
            <div className="flex flex-col justify-between rounded-3xl border border-green-500/20 bg-green-500/[0.03] p-6 backdrop-blur-xl transition-all hover:border-green-500/30 sm:p-7">
              <div>
                <div className="mb-4 inline-flex rounded-xl bg-green-500/10 p-2">
                  <MessageCircle size={20} className="text-green-400" />
                </div>
                <h4 className="font-space text-xl font-semibold">
                  Vamos conversar?
                </h4>
                <p className="mt-2 text-sm text-gray-400">
                  Me conta sobre o seu projeto. Resposta em até 2 horas.
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {/* CTA Principal */}
                <motion.a
                  href={
                    contact.whatsappLink ||
                    'https://api.whatsapp.com/send/?phone=554797086965&text=Olá! Gostaria de conversar sobre um projeto'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition-all hover:bg-green-600"
                >
                  <MessageCircle size={18} />
                  Falar no WhatsApp
                  <ArrowRight size={16} />
                </motion.a>

                {/* Secundário */}
                <button
                  onClick={handleCopy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-xs text-gray-400 transition-colors hover:border-white/[0.15] hover:text-white"
                >
                  <Mail size={14} />
                  {copied ? 'Email copiado!' : 'Copiar email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SectionAbout;
