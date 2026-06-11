// components/SectionHero.tsx
'use client';

import { ContactInfo, LandingPage } from '@prisma/client';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Code,
  LayoutTemplate,
  MessageCircle,
  Rocket,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import Image from 'next/image';
import { useRef } from 'react';

import { AnimatedText } from '@/components/ui/animated-text';
import { ContainerTextFlip } from '@/components/ui/container-text-flip';

interface SectionHeroProps {
  contact: ContactInfo;
  landingpage: LandingPage;
}

const words = ['Lucro', 'Impacto', 'Valor', 'Leads'];

const serviceHighlights = [
  { label: 'Landing Pages', icon: LayoutTemplate },
  { label: 'Automações', icon: Zap },
  { label: 'Sistemas', icon: Code },
  { label: 'UI/UX', icon: Sparkles },
];

const desktopProcessSteps = [
  'Diagnóstico',
  'Estratégia',
  'Design',
  'Desenvolvimento',
  'Otimização',
  'Entrega',
];

const mobileProcessSteps = ['Estratégia', 'Construção', 'Entrega'];

const resultMetrics = [
  { value: '+43%', label: 'conversão média' },
  { value: '95+', label: 'performance' },
  { value: '2h', label: 'resposta' },
];

const SectionHero = ({ contact, landingpage }: SectionHeroProps) => {
  const sectionRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 22,
    mass: 0.4,
  });

  const heroTextOpacity = useTransform(
    smoothProgress,
    [0, 0.28, 0.48],
    [1, 1, 0]
  );
  const heroTextY = useTransform(smoothProgress, [0, 0.48], [0, -56]);
  const heroTextScale = useTransform(smoothProgress, [0, 0.48], [1, 0.98]);

  const cardRotateX = useTransform(smoothProgress, [0.34, 0.82], [12, 0]);
  const cardScale = useTransform(smoothProgress, [0.34, 0.82], [0.82, 0.92]);
  const cardY = useTransform(smoothProgress, [0.34, 0.82], [96, 12]);
  const cardRadius = useTransform(smoothProgress, [0.34, 0.82], [32, 22]);
  const cardOpacity = useTransform(smoothProgress, [0.34, 0.5], [0, 1]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const delays = {
    h1Line1: 0.1,
    h1Line2: 0.35,
    h1Line3: 0.55,
    h1Line4: 0.75,
    paragraph: 1.0,
    subheadline: 1.0,
    ctaPrimary: 1.2,
    ctaSecondary: 1.35,
    microCompromisso: 1.45,
    scrollIcon: 1.6,
    avatar: 0.15,
    badge: 0.55,
  };

  return (
    <section
      ref={sectionRef}
      id="inicio"
      className="relative z-10 h-[165svh] text-white sm:h-[175svh] lg:h-[180svh]"
    >
      <div className="sticky top-0 flex min-h-svh items-center justify-center overflow-visible">
        <div className="relative z-10 mx-auto flex min-h-svh w-full max-w-7xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8">
          <motion.div
            style={{
              opacity: heroTextOpacity,
              y: heroTextY,
              scale: heroTextScale,
              willChange: 'transform, opacity',
            }}
            className="relative z-20 mx-auto w-full max-w-5xl space-y-6 sm:space-y-8 md:space-y-10"
          >
            {/* AVATAR COM PROVA SOCIAL */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: delays.avatar,
                type: 'spring',
                duration: 0.8,
              }}
              className="flex justify-center"
            >
              <div className="relative">
                {landingpage.avatarImageUrl ? (
                  <Image
                    src={landingpage.avatarImageUrl}
                    alt={landingpage.name}
                    width={96}
                    height={96}
                    priority
                    sizes="(max-width: 640px) 64px, (max-width: 768px) 80px, 96px"
                    className="border-electric-500/50 shadow-electric-500/25 h-16 w-16 rounded-full border-4 object-cover shadow-2xl sm:h-20 sm:w-20 md:h-24 md:w-24"
                  />
                ) : (
                  <div className="border-electric-500/50 from-electric-500 shadow-electric-500/25 flex h-16 w-16 items-center justify-center rounded-full border-4 bg-gradient-to-r to-blue-600 shadow-2xl sm:h-20 sm:w-20 md:h-24 md:w-24">
                    <span className="text-xl text-white sm:text-2xl md:text-3xl">
                      {landingpage.name.charAt(0)}
                    </span>
                  </div>
                )}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: delays.badge,
                    type: 'spring',
                    duration: 0.5,
                  }}
                  className="absolute -right-1 -bottom-1 rounded-full bg-gradient-to-r from-green-500 to-green-600 px-2 py-[2px] text-[10px] whitespace-nowrap text-white shadow-lg sm:px-3 sm:py-1 sm:text-xs"
                >
                  ✓ Verificado
                </motion.div>
              </div>
            </motion.div>

            {/* HEADLINE PRINCIPAL */}
            <div className="space-y-4">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delays.h1Line1, duration: 0.2 }}
                className="text-3xl leading-tight font-semibold tracking-normal text-balance sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
              >
                <AnimatedText
                  text="Transformo Ideias em "
                  delay={delays.h1Line1 + 0.1}
                  duration={0.08}
                  mode="word"
                />
                <span className="block">
                  <AnimatedText
                    text="Negócios Digitais"
                    delay={delays.h1Line2 + 0.1}
                    duration={0.09}
                    mode="word"
                  />
                </span>
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delays.h1Line2, duration: 0.3 }}
                className="flex flex-wrap items-center justify-center gap-2 text-2xl leading-tight font-semibold tracking-normal sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
              >
                <AnimatedText
                  text="Que Geram"
                  delay={delays.h1Line3 + 0.1}
                  duration={0.08}
                  mode="word"
                />

                <motion.div
                  initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{
                    delay: delays.h1Line4,
                    duration: 0.8,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="inline-flex"
                >
                  <ContainerTextFlip words={words} />
                </motion.div>
              </motion.div>
            </div>

            {/* SUBHEADLINE */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delays.subheadline, duration: 0.4 }}
              className="mx-auto max-w-2xl text-sm text-gray-300 sm:text-base md:text-lg"
            >
              Crio interfaces, landing pages e soluções digitais com foco em
              performance, conversão e experiência — do planejamento à entrega
              final.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delays.subheadline + 0.15, duration: 0.45 }}
              className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-2"
            >
              {serviceHighlights.map(({ label, icon: Icon }, index) => (
                <span
                  key={label}
                  className={`inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-gray-300 backdrop-blur-sm ${index > 1 ? 'hidden sm:inline-flex' : ''}`}
                >
                  <Icon size={13} className="text-cyan-300" />
                  {label}
                </span>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delays.ctaPrimary, duration: 0.5 }}
              className="flex flex-col items-center gap-4"
            >
              {/* CTA PRIMÁRIO - Responsivo e limitado no mobile */}
              <div className="flex w-full justify-center">
                <motion.a
                  href={
                    contact.whatsappLink ||
                    'https://api.whatsapp.com/send/?phone=554797086965&text=Olá! Gostaria de saber mais sobre seus serviços'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: '0 0 60px rgba(34, 197, 94, 0.6)',
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="group relative flex w-full max-w-xs items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-green-500 to-green-600 px-5 py-3 text-sm text-white shadow-2xl shadow-green-500/30 transition-all duration-300 hover:from-green-600 hover:to-green-700 focus-visible:ring-2 focus-visible:ring-green-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none sm:max-w-none sm:gap-3 sm:px-8 sm:py-4 sm:text-lg md:text-xl"
                >
                  <MessageCircle size={20} className="sm:hidden" />
                  <MessageCircle size={24} className="hidden sm:block" />
                  Quero Criar Meu Projeto
                  <ArrowRight
                    size={18}
                    className="transition-transform duration-300 group-hover:translate-x-1 sm:hidden"
                  />
                  <ArrowRight
                    size={20}
                    className="hidden transition-transform duration-300 group-hover:translate-x-1 sm:block"
                  />
                </motion.a>
              </div>

              {/* CTA SECUNDÁRIO */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delays.ctaSecondary, duration: 0.5 }}
              >
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => scrollToSection('projetos')}
                  className="group flex items-center gap-2 rounded-full border border-gray-600/50 px-6 py-3 text-sm text-gray-300 backdrop-blur-sm transition-all duration-300 hover:border-gray-500 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none sm:text-base"
                >
                  <Eye size={18} />
                  Ver Projetos
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </motion.button>
              </motion.div>

              {/* Micro-compromisso - mais compacto no mobile */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delays.microCompromisso, duration: 0.5 }}
                className="flex items-center gap-1.5 text-xs text-gray-400 sm:text-sm"
              >
                <Clock size={14} />
                Resposta rápida • Planejamento personalizado • Orçamento sem
                compromisso
              </motion.p>
            </motion.div>

            {/* ÍCONE DE SCROLL */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, y: [0, 10, 0] }}
              transition={{
                delay: delays.scrollIcon,
                duration: 2,
                repeat: Infinity,
                opacity: { delay: delays.scrollIcon, duration: 0.5 },
              }}
              className="pt-2"
            >
              <button
                type="button"
                onClick={() => scrollToSection('projetos')}
                className="text-gray-500 transition-colors hover:text-gray-300 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-none"
                aria-label="Ver mais conteúdo"
              >
                <ChevronDown size={32} />
              </button>
            </motion.div>
          </motion.div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-[58%] left-1/2 z-10 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 sm:top-[55%] sm:w-[calc(100%-3rem)] sm:max-w-3xl lg:top-[56%] lg:max-w-5xl"
          >
            <motion.div
              style={{
                opacity: cardOpacity,
                y: cardY,
                rotateX: cardRotateX,
                scale: cardScale,
                borderRadius: cardRadius,
                transformPerspective: 1100,
                transformStyle: 'preserve-3d',
                willChange: 'transform, opacity, border-radius',
              }}
              className="max-h-[64svh] overflow-hidden border border-white/10 bg-white/[0.04] shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:max-h-[68svh] lg:max-h-[70svh]"
            >
              <div className="relative">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 sm:px-5">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-red-400/90" />
                    <span className="h-3 w-3 rounded-full bg-amber-300/90" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400/90" />
                  </div>
                  <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 sm:flex">
                    <Search size={12} />
                    projeto.digital/dashboard
                  </div>
                  <div className="flex h-7 items-center rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 text-[10px] text-emerald-100 sm:text-xs">
                    Online
                  </div>
                </div>

                <div className="grid gap-3 p-3 sm:grid-cols-[1.18fr_0.82fr] sm:p-4 lg:p-5">
                  <div className="rounded-2xl border border-white/10 bg-black/35 p-3 sm:rounded-3xl sm:p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-300/15 bg-cyan-300/10 px-2.5 py-1 text-[10px] text-cyan-100 sm:text-xs">
                          <Rocket size={12} />
                          Projeto em construção
                        </div>
                        <div className="text-left text-base font-medium text-white sm:text-xl lg:text-2xl">
                          Landing page de alta conversão
                        </div>
                      </div>
                      <div className="hidden rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-100 sm:block">
                        78% pronto
                      </div>
                    </div>

                    <div className="mb-3 rounded-full bg-white/10 p-1">
                      <div className="h-2 w-[78%] rounded-full bg-gradient-to-r from-emerald-300 via-cyan-300 to-sky-400" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                      {[
                        {
                          label: 'Design',
                          value: 'UI clara',
                          icon: Sparkles,
                          tone: 'text-violet-200',
                        },
                        {
                          label: 'Desenvolvimento',
                          value: 'Next.js',
                          icon: Code,
                          tone: 'text-cyan-200',
                        },
                        {
                          label: 'Conversão',
                          value: '+Leads',
                          icon: TrendingUp,
                          tone: 'text-emerald-200',
                        },
                      ].map(({ label, value, icon: Icon, tone }, index) => (
                        <div
                          key={label}
                          className={`rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 text-left sm:p-3 ${index === 1 ? 'hidden sm:block' : ''}`}
                        >
                          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                            <Icon size={15} className={tone} />
                          </div>
                          <div className="text-[11px] text-white/55 sm:text-xs">
                            {label}
                          </div>
                          <div className="mt-1 text-sm text-white sm:text-base">
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-left">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs text-white/60">
                          Processo aplicado
                        </span>
                        <span className="hidden text-xs text-white/35 sm:inline">
                          do briefing ao deploy
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 sm:hidden">
                        {mobileProcessSteps.map((step, index) => (
                          <div key={step} className="min-w-0">
                            <div className="mb-2 flex items-center gap-1.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/70">
                                {index + 1}
                              </span>
                              <span className="truncate text-[10px] text-white/70">
                                {step}
                              </span>
                            </div>
                            <div className="h-1 rounded-full bg-white/10">
                              <div className="h-1 rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300" />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="hidden grid-cols-6 gap-2 sm:grid">
                        {desktopProcessSteps.map((step, index) => (
                          <div key={step} className="min-w-0">
                            <div className="mb-2 flex items-center gap-1.5">
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[10px] text-white/70">
                                {index + 1}
                              </span>
                              <span className="truncate text-[10px] text-white/60">
                                {step}
                              </span>
                            </div>
                            <div className="h-1 rounded-full bg-white/10">
                              <div
                                className="h-1 rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300"
                                style={{ width: index < 4 ? '100%' : '52%' }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="hidden gap-3 sm:grid">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-3 text-left">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs text-white/60">
                          Preview do projeto
                        </span>
                        <span className="rounded-full bg-violet-400/10 px-3 py-1 text-xs text-violet-100">
                          Responsivo
                        </span>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-2.5">
                        <div className="mb-3 h-3 w-28 rounded-full bg-white/20" />
                        <div className="grid grid-cols-[0.9fr_1.1fr] gap-2.5">
                          <div className="space-y-2">
                            <div className="h-8 rounded-xl bg-emerald-300/20" />
                            <div className="h-2 rounded-full bg-white/15" />
                            <div className="h-2 w-3/4 rounded-full bg-white/10" />
                          </div>
                          <div className="rounded-xl border border-white/10 bg-cyan-300/10 p-2">
                            <div className="mb-2 h-2 w-16 rounded-full bg-white/20" />
                            <div className="h-10 rounded-lg bg-white/[0.05]" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-black/35 p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs text-white/60">
                          Indicadores
                        </span>
                        <CheckCircle size={15} className="text-emerald-300" />
                      </div>
                      <div className="grid gap-2">
                        {resultMetrics.map(({ value, label }) => (
                          <div
                            key={label}
                            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2"
                          >
                            <span className="text-lg text-white">{value}</span>
                            <span className="text-xs text-white/45">
                              {label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Componentes Eye e ChevronDown mantidos iguais...
const Eye = ({ size, className }: { size?: number; className?: string }) => (
  <svg
    width={size || 24}
    height={size || 24}
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const ChevronDown = ({
  size,
  className,
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    width={size || 24}
    height={size || 24}
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

export default SectionHero;
