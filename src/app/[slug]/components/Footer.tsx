'use client';

import { ContactInfo, LandingPage } from '@prisma/client';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Github,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
} from 'lucide-react';
import Image from 'next/image';

interface FooterProps {
  contact: ContactInfo;
  landingpage: LandingPage;
}

const currentYear = new Date().getFullYear();

const Footer = ({ contact, landingpage }: FooterProps) => {
  const [firstName, lastName] = landingpage.name.split(' ');

  // Apenas links essenciais
  const socialLinks = [
    {
      icon: MessageCircle,
      href: contact.whatsappLink ?? undefined,
      label: 'WhatsApp',
    },
    {
      icon: Instagram,
      href: contact.instagramLink ?? undefined,
      label: 'Instagram',
    },
    {
      icon: Linkedin,
      href: contact.linkedinLink ?? undefined,
      label: 'LinkedIn',
    },
    {
      icon: Mail,
      href: contact.email ? `mailto:${contact.email}` : undefined,
      label: 'Email',
    },
  ].filter((link) => link.href);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative border-t border-white/5 bg-black">
      <div className="pointer-events-none absolute inset-0">
        {/* Luz suave no topo */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.06),transparent_70%)]" />
        {/* Grid sutil */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)] bg-[size:80px_80px]" />
      </div>
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {/* Linha Principal - Apenas 3 colunas clean */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Marca */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              {landingpage.avatarImageUrl ? (
                <Image
                  src="https://1hcgs7spbatxhpzg.public.blob.vercel-storage.com/me.png"
                  alt={landingpage.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
                  <span className="text-sm text-white/60">
                    {landingpage.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="text-lg text-white">
                {firstName}
                {lastName && <span className="text-white/40"> {lastName}</span>}
              </div>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-white/40">
              {landingpage.description}
            </p>
          </motion.div>

          {/* Links Rápidos - Minimalista */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            <h3 className="text-sm font-medium text-white/60">Navegação</h3>
            <nav className="space-y-2">
              {['Início', 'Sobre', 'Projetos', 'Contato'].map((item) => (
                <button
                  key={item}
                  onClick={() =>
                    scrollToSection(
                      item
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                    )
                  }
                  className="group flex items-center gap-2 text-sm text-white/30 transition-colors hover:text-white/70"
                >
                  <span className="h-px w-0 bg-white/30 transition-all group-hover:w-3" />
                  {item}
                </button>
              ))}
            </nav>
          </motion.div>

          {/* Contato + Social - Unificado */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4"
          >
            <h3 className="text-sm font-medium text-white/60">Contato</h3>

            {/* Email */}
            <a
              href={`mailto:${contact.email}`}
              className="group flex items-center gap-2 text-sm text-white/30 transition-colors hover:text-white/70"
            >
              <Mail size={14} className="text-white/20" />
              {contact.email}
              <ArrowUpRight
                size={12}
                className="opacity-0 transition-all group-hover:opacity-100"
              />
            </a>

            {/* WhatsApp CTA - Único botão */}
            <motion.a
              href={
                contact.whatsappLink ||
                'https://api.whatsapp.com/send/?phone=554797086965'
              }
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm text-white/70 transition-all hover:bg-white/10 hover:text-white"
            >
              <MessageCircle size={14} />
              Vamos conversar
              <ArrowUpRight size={12} />
            </motion.a>

            {/* Social Icons - Minimalista */}
            <div className="flex items-center gap-3 pt-2">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="text-white/20 transition-colors hover:text-white/60"
                  aria-label={label}
                >
                  <Icon size={16} />
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Linha Final - Ultra minimalista */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row"
        >
          <p className="text-xs text-white/20">
            © {currentYear} {firstName}. Todos os direitos reservados.
          </p>
          <p className="text-xs text-white/15">
            Design & Desenvolvimento por {firstName}
          </p>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
