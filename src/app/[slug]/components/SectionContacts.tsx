'use client';

import { FireworksBackground } from '@/components/animate-ui/components/backgrounds/fireworks';
import { ContactInfo, LandingPage } from '@prisma/client';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import { ArrowRight, Mail, MessageCircle, Phone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { PortfolioContactContent } from '@/lib/portfolio-content/types';

interface SectionContactsProps {
  contact: ContactInfo;
  landingpage: LandingPage;
  content: PortfolioContactContent;
}

const SectionContacts = ({ contact, content }: SectionContactsProps) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Spotlight hover
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 200, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 200, damping: 30 });
  const background = useMotionTemplate`radial-gradient(600px circle at ${springX}px ${springY}px, rgba(34,197,94,0.07), transparent 80%)`;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const copyEmail = () => {
    navigator.clipboard.writeText(contact.email);
    setCopiedEmail(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <section
      id="contato"
      className="relative flex min-h-[90vh] items-center justify-center overflow-hidden bg-black px-4 sm:px-6"
    >
      {/* ============================================ */}
      {/* 🔥 BACKGROUND BEAMS (estilo Aceternity) */}
      {/* ============================================ */}
      <FireworksBackground
        className="absolute inset-0 flex items-center justify-center rounded-xl"
        color="white"
        population={1}
      />
      <div className="absolute inset-0">
        {/* Gradiente radial principal */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(34,197,94,0.06),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.04),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(139,92,246,0.04),transparent_50%)]" />

        {/* Grid sutil */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_40%,black,transparent)] bg-[size:80px_80px]" />

        {/* Linhas de luz animadas (Beams) */}
        <motion.div
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.02, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 left-1/4 h-[1px] w-[60%] bg-gradient-to-r from-transparent via-green-500/10 to-transparent blur-sm"
        />
        <motion.div
          animate={{
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.01, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 2,
          }}
          className="absolute top-1/3 right-1/4 h-[1px] w-[50%] bg-gradient-to-l from-transparent via-blue-500/8 to-transparent blur-sm"
        />
        <motion.div
          animate={{
            opacity: [0.2, 0.4, 0.2],
            scale: [1, 1.03, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 4,
          }}
          className="absolute bottom-1/3 left-1/3 h-[1px] w-[40%] bg-gradient-to-r from-transparent via-purple-500/8 to-transparent blur-sm"
        />
      </div>

      {/* ============================================ */}
      {/* CONTEÚDO PRINCIPAL */}
      {/* ============================================ */}
      <div className="relative z-10 mx-auto w-full max-w-2xl text-center">
        {/* Título */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-4xl leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
        >
          {content.titlePrefix}{' '}
          <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent">
            {content.titleHighlight}
          </span>
        </motion.h2>

        {/* Subtexto */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mx-auto mt-5 max-w-lg text-base text-gray-400 sm:text-lg"
        >
          {content.subtitlePrefix}{' '}
          <span className="text-white">{content.subtitleHighlight}</span>{' '}
          {content.subtitleSuffix}
        </motion.p>

        {/* ============================================ */}
        {/* 🔥 CARD GLASS COM SPOTLIGHT HOVER */}
        {/* ============================================ */}
        <motion.div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="relative mx-auto mt-10 max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-xl sm:p-8"
          style={{ background }}
        >
          {/* CTA Principal - WhatsApp */}
          <motion.a
            href={
              contact.whatsappLink ||
              'https://api.whatsapp.com/send/?phone=554797086965&text=Olá! Gostaria de conversar sobre um projeto'
            }
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-green-500 px-6 py-4 text-lg text-white shadow-lg shadow-green-500/20 transition-all hover:bg-green-600 hover:shadow-green-500/30"
          >
            <MessageCircle size={22} />
            <span>{content.primaryCtaLabel}</span>
            <ArrowRight
              size={18}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </motion.a>

          {/* Separador */}
          <div className="my-5 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-xs text-gray-600">
              {content.separatorLabel}
            </span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          {/* Opções Secundárias */}
          <div className="flex items-center justify-center gap-3">
            {/* Email */}
            <button
              onClick={copyEmail}
              className="group flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-sm text-gray-400 backdrop-blur-sm transition-all hover:border-white/[0.12] hover:text-white"
            >
              <Mail
                size={16}
                className="transition-colors group-hover:text-blue-400"
              />
              {copiedEmail ? content.copiedEmailLabel : content.emailLabel}
            </button>

            {/* Telefone */}
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="group flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-sm text-gray-400 backdrop-blur-sm transition-all hover:border-white/[0.12] hover:text-white"
              >
                <Phone
                  size={16}
                  className="transition-colors group-hover:text-purple-400"
                />
                {content.phoneLabel}
              </a>
            )}
          </div>
        </motion.div>

        {/* Micro-texto de confiança */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-6 text-xs text-gray-600"
        >
          {content.trustMicrocopy}
        </motion.p>
      </div>
    </section>
  );
};

export default SectionContacts;
