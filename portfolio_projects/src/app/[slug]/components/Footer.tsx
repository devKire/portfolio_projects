"use client";

import { ContactInfo, LandingPage } from "@prisma/client";
import { motion } from "framer-motion";
import {
  Coffee,
  Facebook,
  Heart,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";
import Image from "next/image";
interface FooterProps {
  contact: ContactInfo;
  landingpage: LandingPage;
}

const currentYear = new Date().getFullYear();

const Footer = ({ contact, landingpage }: FooterProps) => {
  // Links sociais baseados nos dados do banco
  const socialLinks = [
    {
      icon: MessageCircle,
      href: contact.whatsappLink || "#",
      label: "WhatsApp",
    },
    {
      icon: Instagram,
      href: contact.instagramLink || "#",
      label: "Instagram",
    },
    {
      icon: Facebook,
      href: contact.facebookLink || "#",
      label: "Facebook",
    },
    {
      icon: Linkedin,
      href: contact.linkedinLink || "#",
      label: "LinkedIn",
    },
    {
      icon: Mail,
      href: `mailto:${contact.email}`,
      label: "Email",
    },
  ].filter((link) => link.href !== "#"); // Filtra links não preenchidos

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
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
                {landingpage.name.split(" ")[0]}
                <span className="text-electric-500">
                  {landingpage.name.split(" ")[1]}
                </span>
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

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h3 className="font-space mb-6 text-lg font-semibold text-white">
              Navegação
            </h3>
            <nav className="space-y-4">
              {[
                { name: "Inicio", id: "hero" },
                { name: "Sobre", id: "sobre" },
                { name: "Projetos", id: "Projetos" },
                { name: "Contato", id: "contato" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="font-inter hover:text-electric-500 block w-full py-2 text-left text-gray-400 transition-colors duration-300"
                >
                  {item.name}
                </button>
              ))}
            </nav>
          </motion.div>

          {/* Connect */}
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

            {/* Social Links Grid */}
            <div className="grid grid-cols-3 gap-3">
              {socialLinks.map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="hover:bg-electric-500 group flex items-center justify-center rounded-lg bg-gray-800 p-3 transition-all duration-300"
                  aria-label={label}
                >
                  <Icon
                    size={20}
                    className="text-gray-400 transition-colors group-hover:text-white"
                  />
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-12 border-t border-gray-800 pt-8"
        >
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            {/* Copyright */}
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
              <span>por {landingpage.name}</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
