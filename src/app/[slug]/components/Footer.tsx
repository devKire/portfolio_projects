'use client';

import { ContactInfo, LandingPage } from '@prisma/client';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Coffee,
  Facebook,
  Heart,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Phone,
  Star,
} from 'lucide-react';
import Image from 'next/image';

interface FooterProps {
  contact: ContactInfo;
  landingpage: LandingPage;
}

const currentYear = new Date().getFullYear();

const Footer = ({ contact, landingpage }: FooterProps) => {
  // ✅ Extração segura do nome
  const [firstName, lastName] = landingpage.name.split(' ');

  // Links sociais baseados nos dados do banco
  const socialLinks = [
    {
      icon: MessageCircle,
      href: contact.whatsappLink || '#',
      label: 'WhatsApp',
    },
    {
      icon: Instagram,
      href: contact.instagramLink || '#',
      label: 'Instagram',
    },
    {
      icon: Facebook,
      href: contact.facebookLink || '#',
      label: 'Facebook',
    },
    {
      icon: Linkedin,
      href: contact.linkedinLink || '#',
      label: 'LinkedIn',
    },
    {
      icon: Mail,
      href: `mailto:${contact.email}`,
      label: 'Email',
    },
  ].filter((link) => link.href && link.href !== '#'); // ✅ Filtro mais seguro

  // ✅ IDs corrigidos e expandidos
  const navigationLinks = [
    { name: 'Início', id: 'inicio' },
    { name: 'Sobre', id: 'sobre' },
    { name: 'Processo', id: 'processo' },
    { name: 'Projetos', id: 'projetos' },
    { name: 'Contato', id: 'contato' },
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="border-t border-gray-800 bg-gradient-to-b from-gray-900 to-gray-950">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-4">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2"
          >
            <div className="mb-4 flex items-center gap-3">
              {landingpage.avatarImageUrl ? (
                <Image
                  src={landingpage.avatarImageUrl}
                  alt={landingpage.name}
                  width={80}
                  height={80}
                  className="border-electric-500 h-12 w-12 rounded-full border-2 object-cover"
                />
              ) : (
                <div className="from-electric-500 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r to-blue-600">
                  <span className="text-lg font-bold text-white">
                    {landingpage.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="font-space text-2xl font-bold text-white">
                {/* ✅ Nome seguro - não quebra sem sobrenome */}
                {firstName}
                {lastName && (
                  <span className="text-electric-500"> {lastName}</span>
                )}
              </div>
            </div>
            <p className="font-inter max-w-md text-lg leading-relaxed text-gray-300">
              {landingpage.description}
            </p>

            {/* Contact Info */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-3 text-gray-400">
                <Mail size={16} />
                <a
                  href={`mailto:${contact.email}`}
                  className="hover:text-electric-500 transition-colors"
                >
                  {contact.email}
                </a>
              </div>
              {contact.phone && (
                <div className="flex items-center gap-3 text-gray-400">
                  <Phone size={16} />
                  <a
                    href={`tel:${contact.phone}`}
                    className="hover:text-electric-500 transition-colors"
                  >
                    {contact.phone}
                  </a>
                </div>
              )}
            </div>
          </motion.div>

          {/* ✅ Navegação Expandida */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h3 className="font-space mb-6 text-lg font-semibold text-white">
              Navegação
            </h3>
            <nav className="space-y-2">
              {navigationLinks.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="font-inter hover:text-electric-500 block w-full rounded-lg px-2 py-2 text-left text-gray-400 transition-colors duration-300 hover:bg-white/5"
                >
                  {item.name}
                </button>
              ))}
            </nav>
          </motion.div>

          {/* Connect + Social */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="font-space mb-6 text-lg font-semibold text-white">
              Vamos Conversar
            </h3>
            <p className="font-inter mb-6 text-gray-400">
              Pronto para transformar sua ideia em realidade? Entre em contato!
            </p>

            {/* ✅ Social com Tooltips */}
            <div className="grid grid-cols-3 gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="hover:bg-electric-500 group relative flex items-center justify-center rounded-lg bg-gray-800 p-3 transition-all duration-300"
                  aria-label={label}
                >
                  <Icon
                    size={20}
                    className="text-gray-400 transition-colors group-hover:text-white"
                  />
                  {/* ✅ Tooltip */}
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-gray-700 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                    {label}
                  </span>
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>

        {/* 🔥 CTA DE CONVERSÃO - ÚLTIMO EMPURRÃO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-12 overflow-hidden rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-800/50 to-gray-800/30 p-6 backdrop-blur-sm sm:p-8"
        >
          <div className="flex flex-col items-center text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="mb-6 sm:mb-0">
              <h3 className="font-space text-xl font-semibold text-white sm:text-2xl">
                Pronto para tirar seu projeto do papel?
              </h3>
              <p className="mt-2 text-sm text-gray-400 sm:text-base">
                Fale comigo agora e receba um plano personalizado em até 2 horas
              </p>
              {/* ✅ Prova social no CTA */}
              <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-500 sm:justify-start">
                <span className="flex items-center gap-1">
                  <Star size={12} className="text-yellow-500" />
                  98% satisfação
                </span>
                <span>•</span>
                <span>+30 projetos entregues</span>
              </div>
            </div>

            <motion.a
              href={
                contact.whatsappLink ||
                'https://api.whatsapp.com/send/?phone=554797086965&text=Olá! Gostaria de conversar sobre um projeto'
              }
              target="_blank"
              rel="noopener noreferrer nofollow"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition-all hover:bg-green-600 sm:px-8 sm:py-4"
            >
              <MessageCircle size={18} />
              Falar no WhatsApp
              <ArrowRight size={16} />
            </motion.a>
          </div>
        </motion.div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 border-t border-gray-800 pt-8"
        >
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            {/* Copyright + Prova Social */}
            <div className="text-center sm:text-left">
              <p className="font-inter text-sm text-gray-400">
                © {currentYear} {landingpage.name}. Todos os direitos
                reservados.
              </p>
              <p className="font-inter mt-1 text-xs text-gray-500">
                Desenvolvido com as melhores tecnologias do mercado
              </p>
            </div>

            {/* Made with love */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="font-inter flex items-center gap-2 text-sm text-gray-400"
            >
              <span>Feito com</span>
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 3,
                }}
              >
                <Heart size={16} className="fill-current text-red-500" />
              </motion.div>
              <span>e MUITO</span>
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  rotate: [0, 10, -10, 0],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 3,
                }}
              >
                <Coffee size={16} className="fill-current text-white" />
              </motion.div>
              <span>por {firstName}</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
