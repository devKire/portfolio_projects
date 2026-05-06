// components/SectionHero.tsx
'use client';

import { ContactInfo, LandingPage } from '@prisma/client';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, MessageCircle } from 'lucide-react';
import Image from 'next/image';

import { AnimatedText } from '@/components/ui/animated-text';
import { ContainerTextFlip } from '@/components/ui/container-text-flip';

interface SectionHeroProps {
  contact: ContactInfo;
  landingpage: LandingPage;
}

const words = ['Lucro', 'Impacto', 'Valor', 'Leads'];

const SectionHero = ({ contact, landingpage }: SectionHeroProps) => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Detecção simples de mobile para otimizar delays
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Sequência de delays otimizada para mobile
  const delays = {
    h1Line1: isMobile ? 0.2 : 0.3,
    h1Line2: isMobile ? 0.8 : 2.3,
    h1Line3: isMobile ? 1.5 : 4.2,
    h1Line4: isMobile ? 2.0 : 5.2,
    paragraph: isMobile ? 2.5 : 6.8,
    subheadline: isMobile ? 2.5 : 6.8,
    ctaPrimary: isMobile ? 3.0 : 7.5,
    ctaSecondary: isMobile ? 3.5 : 8.8,
    microCompromisso: isMobile ? 3.8 : 9.1,
    scrollIcon: isMobile ? 4.2 : 10.4,
    avatar: isMobile ? 4.5 : 11.0,
    badge: isMobile ? 5.0 : 12.5,
  };

  return (
    <section
      id="inicio"
      className="relative flex min-h-[90vh] items-center justify-center overflow-hidden sm:min-h-screen"
    >
      {/* Main Content */}
      <div className="relative z-10 mx-auto mt-16 w-full max-w-7xl px-4 text-center sm:mt-20 sm:px-6 lg:px-8">
        <div className="space-y-6 sm:space-y-8 md:space-y-10">
          {/* AVATAR COM PROVA SOCIAL */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delays.avatar, type: 'spring', duration: 0.8 }}
            className="flex justify-center"
          >
            <div className="relative">
              {landingpage.avatarImageUrl ? (
                <Image
                  src="https://1hcgs7spbatxhpzg.public.blob.vercel-storage.com/me.png"
                  alt={landingpage.name}
                  width={96}
                  height={96}
                  className="border-electric-500/50 shadow-electric-500/25 h-16 w-16 rounded-full border-4 object-cover shadow-2xl sm:h-20 sm:w-20 md:h-24 md:w-24"
                />
              ) : (
                <div className="border-electric-500/50 from-electric-500 shadow-electric-500/25 flex h-16 w-16 items-center justify-center rounded-full border-4 bg-gradient-to-r to-blue-600 shadow-2xl sm:h-20 sm:w-20 md:h-24 md:w-24">
                  <span className="text-xl text-white sm:text-2xl md:text-3xl">
                    {landingpage.name.charAt(0)}
                  </span>
                </div>
              )}
              {/* Badge de credibilidade - menor e mais proporcional */}
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
                <AnimatedText
                  text="✓ Verificado"
                  delay={delays.badge + 0.2}
                  duration={0.03}
                />
              </motion.div>
            </div>
          </motion.div>

          {/* HEADLINE PRINCIPAL */}
          <div className="space-y-4">
            {/* Título H1 */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delays.h1Line1, duration: 0.2 }}
              className="text-3xl leading-tight sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
            >
              <AnimatedText
                text="Transformo Ideias em "
                delay={delays.h1Line1 + 0.1}
                duration={0.08}
              />
              <span className="block">
                <AnimatedText
                  text="Negócios Digitais"
                  delay={delays.h1Line2 + 0.1}
                  duration={0.09}
                />
              </span>
            </motion.h1>

            {/* ContainerTextFlip - com flex-wrap para evitar quebra */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delays.h1Line2, duration: 0.3 }}
              className="flex flex-wrap items-center justify-center gap-2 text-2xl leading-tight sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
            >
              <AnimatedText
                text="Que Geram"
                delay={delays.h1Line3 + 0.1}
                duration={0.08}
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
            className="mx-auto max-w-2xl text-sm text-gray-400 sm:text-base md:text-lg"
          >
            <AnimatedText
              text="Sem dores de cabeça com tecnologia. Sem resultados medíocres. Apenas soluções digitais que realmente funcionam para o seu negócio."
              delay={delays.subheadline + 0.1}
              duration={0.015}
            />
          </motion.p>

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
                className="group relative flex w-full max-w-xs items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-green-500 to-green-600 px-5 py-3 text-sm text-white shadow-2xl shadow-green-500/30 transition-all duration-300 hover:from-green-600 hover:to-green-700 sm:max-w-none sm:gap-3 sm:px-8 sm:py-4 sm:text-lg md:text-xl"
              >
                <MessageCircle size={20} className="sm:hidden" />
                <MessageCircle size={24} className="hidden sm:block" />
                <AnimatedText
                  text="Quero Um Orçamento Agora"
                  delay={delays.ctaPrimary + 0.1}
                  duration={0.02}
                />
                <ArrowRight
                  size={18}
                  className="transition-transform duration-300 group-hover:translate-x-1 sm:hidden"
                />
                <ArrowRight
                  size={20}
                  className="hidden transition-transform duration-300 group-hover:translate-x-1 sm:block"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </motion.a>
            </div>

            {/* CTA SECUNDÁRIO */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delays.ctaSecondary, duration: 0.5 }}
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => scrollToSection('projetos')}
                className="group flex items-center gap-2 rounded-full border border-gray-600/50 px-6 py-3 text-sm text-gray-400 backdrop-blur-sm transition-all duration-300 hover:border-gray-500 hover:text-white sm:text-base"
              >
                <Eye size={18} />
                <AnimatedText
                  text="Ver Projetos Anteriores"
                  delay={delays.ctaSecondary + 0.1}
                  duration={0.02}
                />
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
              className="flex items-center gap-1.5 text-xs text-gray-500 sm:text-sm"
            >
              <Clock size={14} />
              <AnimatedText
                text="Resposta em até 2 horas • Orçamento sem compromisso"
                delay={delays.microCompromisso + 0.1}
                duration={0.015}
              />
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
            className="pt-4"
          >
            <button
              onClick={() => scrollToSection('projetos')}
              className="text-gray-500 transition-colors hover:text-gray-300"
              aria-label="Ver mais conteúdo"
            >
              <ChevronDown size={32} />
            </button>
          </motion.div>
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
