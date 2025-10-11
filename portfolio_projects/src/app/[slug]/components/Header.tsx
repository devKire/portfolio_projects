"use client";

import { ContactInfo, LandingPage } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, Menu, MessageCircle, Phone, X } from "lucide-react";
import React, { useEffect, useState } from "react";

interface HeaderProps {
  contact: ContactInfo;
  landingpage: LandingPage;
}

const Header = ({ contact, landingpage }: HeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("inicio");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      // Atualiza a seção ativa baseada no scroll
      const sections = ["inicio", "projetos", "sobre", "servicos", "contato"];
      const current = sections.find((section) => {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          return rect.top <= 100 && rect.bottom >= 100;
        }
        return false;
      });
      if (current) setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  const navItems = [
    { name: "Início", id: "hero" },
    { name: "Projetos", id: "projects" },
    { name: "Sobre", id: "about" },
    { name: "Contato", id: "contact" },
  ];

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${
          isScrolled
            ? "border-b border-gray-800/50 bg-gray-900/95 shadow-2xl shadow-black/20 backdrop-blur-xl"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            {/* Logo com Avatar */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="group flex cursor-pointer items-center gap-3"
              onClick={() => scrollToSection("inicio")}
            >
              {landingpage.avatarImageUrl ? (
                <motion.img
                  src={landingpage.avatarImageUrl}
                  alt={landingpage.name}
                  className="border-electric-500 shadow-electric-500/20 group-hover:shadow-electric-500/40 h-10 w-10 rounded-full border-2 object-cover shadow-lg transition-all duration-300"
                  whileHover={{ rotate: 5 }}
                />
              ) : (
                <motion.div
                  className="from-electric-500 shadow-electric-500/20 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r to-blue-600 shadow-lg"
                  whileHover={{ rotate: 5 }}
                >
                  <span className="text-sm font-bold text-white">
                    {landingpage.name.charAt(0)}
                  </span>
                </motion.div>
              )}
              <div className="font-space text-xl font-bold text-white">
                {landingpage.name.split(" ")[0]}
                <span className="text-electric-500">
                  {landingpage.name.split(" ")[1]}
                </span>
              </div>
            </motion.div>

            {/* Desktop Navigation */}
            <nav className="hidden items-center space-x-1 lg:flex">
              {navItems.map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -2 }}
                  onClick={() => scrollToSection(item.id)}
                  className={`font-inter relative rounded-lg px-4 py-2 transition-all duration-300 ${
                    activeSection === item.id
                      ? "text-electric-500 font-semibold"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  {item.name}
                  {activeSection === item.id && (
                    <motion.div
                      className="bg-electric-500 absolute bottom-0 left-1/2 h-1 w-1 rounded-full"
                      layoutId="activeIndicator"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 20,
                      }}
                    />
                  )}
                </motion.button>
              ))}
            </nav>

            {/* Contact CTA - Desktop */}
            <div className="hidden items-center gap-4 lg:flex">
              {contact.whatsappLink && (
                <motion.a
                  href={contact.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-colors duration-300 hover:bg-green-700"
                >
                  <MessageCircle size={16} />
                  <span className="font-inter text-sm">WhatsApp</span>
                </motion.a>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => scrollToSection("contato")}
                className="from-electric-500 hover:from-electric-600 font-inter shadow-electric-500/25 rounded-lg bg-gradient-to-r to-blue-600 px-6 py-2 font-semibold text-white shadow-lg transition-all duration-300 hover:to-blue-700"
              >
                Vamos Conversar
              </motion.button>
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-300 transition-colors hover:text-white lg:hidden"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-gray-800 bg-gray-900/95 backdrop-blur-xl lg:hidden"
            >
              <div className="space-y-4 px-6 py-4">
                {/* Mobile Navigation */}
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`font-inter block w-full border-l-2 px-4 py-3 text-left transition-all duration-300 ${
                      activeSection === item.id
                        ? "text-electric-500 border-electric-500 bg-electric-500/10 font-semibold"
                        : "border-transparent text-gray-300 hover:border-gray-600 hover:text-white"
                    }`}
                  >
                    {item.name}
                  </button>
                ))}

                {/* Mobile Contact Info */}
                <div className="space-y-3 border-t border-gray-800 pt-4">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="flex items-center gap-3 py-2 text-gray-300 transition-colors hover:text-white"
                    >
                      <Mail size={16} />
                      <span className="font-inter text-sm">
                        {contact.email}
                      </span>
                    </a>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="flex items-center gap-3 py-2 text-gray-300 transition-colors hover:text-white"
                    >
                      <Phone size={16} />
                      <span className="font-inter text-sm">
                        {contact.phone}
                      </span>
                    </a>
                  )}
                  {contact.whatsappLink && (
                    <motion.a
                      href={contact.whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileTap={{ scale: 0.95 }}
                      className="mt-4 flex items-center gap-3 rounded-lg bg-green-600 px-4 py-3 text-white transition-colors duration-300 hover:bg-green-700"
                    >
                      <MessageCircle size={18} />
                      <span className="font-inter font-semibold">
                        Conversar no WhatsApp
                      </span>
                    </motion.a>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Overlay para mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
