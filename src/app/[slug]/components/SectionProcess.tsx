'use client';

import Image from 'next/image';
import { GravityStarsBackground } from '@/components/animate-ui/components/backgrounds/gravity-stars';
import { Spotlight } from '@/components/ui/spotlight-new';
import { cn } from '@/lib/utils';
import { ContactInfo, LandingPage } from '@prisma/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageCircle,
  Rocket,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

/* ================================================================
   INTERFACES
   ================================================================ */
interface SectionProcessProps {
  contact: ContactInfo;
  landingpage: LandingPage;
}

/* ================================================================
   DADOS — Texto reduzido, foco no essencial
   ================================================================ */
const processSteps = [
  {
    step: '01',
    title: 'Discovery',
    description: 'Entendemos seu negócio, objetivos e definimos a estratégia.',
    details: [
      'Briefing e objetivos',
      'Análise de mercado',
      'Estratégia definida',
    ],
    duration: '1-2 dias',
    image:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?q=75&w=1200&auto=format&fit=crop',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    step: '02',
    title: 'Planejamento',
    description: 'Roadmap claro com tecnologias, cronograma e milestones.',
    details: ['Arquitetura definida', 'Stack tecnológico', 'Cronograma visual'],
    duration: '2-3 dias',
    image:
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=75&w=1200&auto=format&fit=crop',
    color: 'from-purple-500 to-pink-500',
  },
  {
    step: '03',
    title: 'Desenvolvimento',
    description: 'Código limpo, atualizações diárias e feedback constante.',
    details: [
      'Sprints ágeis',
      'Atualizações no WhatsApp',
      'Revisões por etapa',
    ],
    duration: '7-30 dias',
    image:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=75&w=1200&auto=format&fit=crop',
    color: 'from-blue-600 to-cyan-600',
  },
  {
    step: '04',
    title: 'Lançamento',
    description: 'Publicação, testes de performance e suporte pós-entrega.',
    details: [
      'Deploy otimizado',
      'Testes Lighthouse',
      'Testes de Carga',
      'Suporte 30 dias',
    ],
    duration: '1-2 dias',
    image:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=75&w=1200&auto=format&fit=crop',
    color: 'from-green-500 to-emerald-500',
  },
];

const slideRotations = [-6, 4, -3, 6];

/* ================================================================
   GARANTIAS — Layout horizontal, ultra-simples
   ================================================================ */
const guarantees = [
  { icon: Shield, label: 'Satisfação Garantida' },
  { icon: Zap, label: 'Performance Premium' },
  { icon: MessageCircle, label: 'Comunicação Direta' },
  { icon: Clock, label: 'Prazo Garantido' },
];

/* ================================================================
   COMPONENTE PRINCIPAL
   ================================================================ */
const SectionProcess = ({ contact }: SectionProcessProps) => {
  const [active, setActive] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleAutoplayResume = () => {
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => setAutoplay(true), 15000);
  };

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    };
  }, []);

  const handleNext = () =>
    setActive((prev) => (prev + 1) % processSteps.length);
  const handlePrev = () =>
    setActive((prev) => (prev - 1 + processSteps.length) % processSteps.length);

  // Autoplay
  useEffect(() => {
    if (!autoplay) return;
    const interval = setInterval(handleNext, 6000);
    return () => clearInterval(interval);
  }, [autoplay]);

  const handleManualNavigation = (direction: 'prev' | 'next') => {
    setAutoplay(false);
    direction === 'next' ? handleNext() : handlePrev();
    scheduleAutoplayResume();
  };

  return (
    <section
      id="processo"
      className="relative isolate overflow-hidden bg-black py-20 md:py-28"
    >
      <Spotlight />
      <GravityStarsBackground className="absolute inset-0 flex items-center justify-center rounded-xl" />
      {/* Grid Pattern */}
      <div className="pattern-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)] bg-[size:64px_64px]" />

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
            <span className="text-xs text-gray-400">Como funciona</span>
          </div>

          <h2 className="text-4xl leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Da ideia ao{' '}
            <span className="bg-gradient-to-r from-sky-400 via-purple-400 to-purple-500 bg-clip-text text-transparent">
              lançamento
            </span>{' '}
            em 4 passos
          </h2>

          <p className="mx-auto mt-4 max-w-lg text-sm text-gray-500 sm:text-base">
            Processo transparente, sem surpresas, sem dor de cabeça.
          </p>
        </motion.div>

        {/* ============================================ */}
        {/* SLIDER DE PROCESSO */}
        {/* ============================================ */}
        <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Lado Esquerdo — Imagens empilhadas */}
          <div>
            <div className="relative h-[380px] w-full overflow-hidden rounded-3xl border border-white/[0.06] lg:h-[480px]">
              <AnimatePresence mode="wait">
                {processSteps.map((step, index) => {
                  const isActive = active === index;
                  if (!isActive) return null;

                  return (
                    <motion.div
                      key={step.step}
                      initial={{
                        opacity: 0,
                        scale: 0.96,
                        rotate: slideRotations[index] ?? 0,
                      }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{
                        opacity: 0,
                        scale: 0.96,
                        rotate: slideRotations[index] ?? 0,
                      }}
                      transition={{ duration: 0.35, ease: 'easeInOut' }}
                      className="absolute inset-0 origin-bottom"
                    >
                      <div className="relative h-full w-full">
                        <Image
                          src={step.image}
                          alt={step.title}
                          fill
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          className="object-cover"
                          draggable={false}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        {/* Badges */}
                        <div
                          className={`absolute top-4 left-4 rounded-xl bg-gradient-to-r ${step.color} px-4 py-2 text-lg text-white shadow-lg`}
                        >
                          {step.step}
                        </div>
                        <div className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
                          <Clock size={12} />
                          {step.duration}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Indicadores */}
            <div className="mt-5 flex justify-center gap-2">
              {processSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setActive(index);
                    setAutoplay(false);
                    scheduleAutoplayResume();
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    active === index
                      ? 'w-8 bg-gradient-to-r from-blue-500 to-purple-500'
                      : 'w-4 bg-white/[0.08] hover:bg-white/[0.15]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Lado Direito — Info do passo */}
          <div className="flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="space-y-6"
              >
                {/* Badge do passo */}
                <div className="flex items-center gap-3">
                  <div
                    className={`rounded-lg bg-gradient-to-r ${processSteps[active].color} p-2`}
                  >
                    <Rocket size={18} className="text-white" />
                  </div>
                  <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs text-gray-400">
                    Passo {processSteps[active].step}
                  </span>
                </div>

                {/* Título */}
                <h3 className="text-3xl sm:text-4xl">
                  {processSteps[active].title}
                </h3>

                {/* Descrição — SIMPLES, sem animação por palavra */}
                <p className="text-base leading-relaxed text-gray-400 sm:text-lg">
                  {processSteps[active].description}
                </p>

                {/* Detalhes */}
                <div className="space-y-2 rounded-2xl border border-white/[0.05] bg-white/[0.01] p-5 backdrop-blur-sm">
                  <p className="mb-3 flex items-center gap-2 text-xs text-gray-500">
                    <CheckCircle size={14} className="text-green-500" />O que
                    está incluído:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {processSteps[active].details.map((detail, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-1.5 text-sm text-gray-300"
                      >
                        {detail}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navegação */}
            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={() => handleManualNavigation('prev')}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm transition-all hover:border-white/[0.2] hover:bg-white/[0.05]"
              >
                <ChevronLeft className="h-5 w-5 text-gray-400" />
              </button>
              <button
                onClick={() => handleManualNavigation('next')}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm transition-all hover:border-white/[0.2] hover:bg-white/[0.05]"
              >
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </button>
              <span className="ml-auto text-xs text-gray-600">
                {active + 1} / {processSteps.length}
              </span>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* CTA FINAL — Único, sem competição */}
        {/* ============================================ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="mx-auto max-w-lg rounded-2xl border border-white/[0.06] bg-white/[0.01] p-8 backdrop-blur-xl sm:p-10">
            <Rocket size={32} className="mx-auto mb-4 text-blue-400" />
            <h3 className="text-xl sm:text-2xl">Vamos começar?</h3>
            <p className="mt-2 text-sm text-gray-400">
              Me conta sua ideia. Em até 2 horas você recebe um plano claro.
            </p>
            <motion.a
              href={
                contact.whatsappLink ||
                'https://api.whatsapp.com/send/?phone=554797086965&text=Olá! Quero começar um projeto'
              }
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-6 py-3.5 text-sm text-white shadow-lg shadow-green-500/20 transition-all hover:bg-green-600 sm:w-auto sm:px-8"
            >
              <MessageCircle size={18} />
              Falar no WhatsApp
              <ArrowRight size={16} />
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SectionProcess;
