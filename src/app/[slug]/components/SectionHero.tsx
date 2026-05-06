'use client';

import { ContactInfo, LandingPage } from '@prisma/client';
import { motion } from 'framer-motion';
import { ArrowRight, Clock, MessageCircle } from 'lucide-react';
import Image from 'next/image';

import { ThreeDMarquee } from '@/components/ui/3d-marquee';
import { FireworksBackground } from '@/components/animate-ui/components/backgrounds/fireworks';
import { HoleBackground } from '@/components/animate-ui/components/backgrounds/hole';
import { HexagonBackground } from '@/components/animate-ui/components/backgrounds/hexagon';
import { AuroraBackground } from '@/components/ui/aurora-background';

interface SectionHeroProps {
  contact: ContactInfo;
  landingpage: LandingPage;
}

const SectionHero = ({ contact, landingpage }: SectionHeroProps) => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="inicio"
      className="overflow-hidde relative flex min-h-screen items-center justify-center"
    >
      {/* Main Content */}
      <div className="relative z-10 mx-auto mt-20 w-full max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="space-y-8 md:space-y-10"
        >
          {/* 🔥 AVATAR COM PROVA SOCIAL - Mais impacto visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="flex justify-center"
          >
            <div className="relative">
              {landingpage.avatarImageUrl ? (
                <Image
                  src={landingpage.avatarImageUrl}
                  alt={landingpage.name}
                  width={96}
                  height={96}
                  className="border-electric-500/50 shadow-electric-500/25 h-20 w-20 rounded-full border-4 object-cover shadow-2xl md:h-24 md:w-24"
                />
              ) : (
                <div className="border-electric-500/50 from-electric-500 shadow-electric-500/25 flex h-20 w-20 items-center justify-center rounded-full border-4 bg-gradient-to-r to-blue-600 shadow-2xl md:h-24 md:w-24">
                  <span className="text-2xl font-bold text-white md:text-3xl">
                    {landingpage.name.charAt(0)}
                  </span>
                </div>
              )}
              {/* Badge de credibilidade */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6, type: 'spring' }}
                className="absolute -right-1 -bottom-1 rounded-full bg-gradient-to-r from-green-500 to-green-600 px-3 py-1 text-xs font-semibold text-white shadow-lg"
              >
                ✓ Verificado
              </motion.div>
            </div>
          </motion.div>

          {/* 🔥 HEADLINE PRINCIPAL - Foco no resultado do cliente */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="space-y-4"
          >
            <h1 className="font-space text-3xl leading-tight font-bold sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
              Transformo Ideias em{' '}
              <span className="bg-gradient-to-r from-sky-400 via-purple-400 to-purple-500 bg-clip-text text-transparent">
                Negócios Digitais
              </span>{' '}
              Que Geram Resultado
            </h1>

            <p className="mx-auto max-w-3xl text-base text-gray-300 sm:text-lg md:text-xl lg:text-2xl">
              Crio sites, landing pages e sistemas web que convertem visitantes
              em clientes para empreendedores e empresas que querem crescer
            </p>
          </motion.div>

          {/* 🔥 SUBHEADLINE COM PROMESSA - Remove objeções */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mx-auto max-w-2xl text-sm text-gray-400 sm:text-base md:text-lg"
          >
            Sem dores de cabeça com tecnologia. Sem resultados medíocres. Apenas
            soluções digitais que realmente funcionam para o seu negócio.
          </motion.p>

          {/* 🔥 CTA PRINCIPAL - Único, claro e irresistível */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.8 }}
            className="flex flex-col items-center gap-4"
          >
            {/* CTA PRIMÁRIO - WhatsApp (principal conversor) */}
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
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-green-500 to-green-600 px-8 py-4 text-lg font-semibold text-white shadow-2xl shadow-green-500/30 transition-all duration-300 hover:from-green-600 hover:to-green-700 sm:w-auto sm:text-xl"
            >
              <MessageCircle size={24} />
              <span>Quero Um Orçamento Agora</span>
              <ArrowRight
                size={20}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </motion.a>

            {/* CTA SECUNDÁRIO - Ver projetos (menor destaque) */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => scrollToSection('projetos')}
              className="group flex items-center gap-2 rounded-full border border-gray-600/50 px-6 py-3 text-sm text-gray-400 backdrop-blur-sm transition-all duration-300 hover:border-gray-500 hover:text-white sm:text-base"
            >
              <Eye size={18} />
              <span>Ver Projetos Anteriores</span>
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </motion.button>

            {/* Micro-compromisso - Remove atrito */}
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Clock size={14} />
              Resposta em até 2 horas • Orçamento sem compromisso
            </p>
          </motion.div>

          {/* 🔥 ÍCONE DE SCROLL - Indica mais conteúdo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 10, 0] }}
            transition={{
              delay: 1.8,
              duration: 2,
              repeat: Infinity,
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
        </motion.div>
      </div>
    </section>
  );
};

// Componente Eye (se não existir no lucide-react)
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
