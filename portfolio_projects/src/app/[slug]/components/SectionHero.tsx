"use client";

import { ContactInfo, LandingPage } from "@prisma/client";
import { motion } from "framer-motion";
import {
  Code,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Sparkles,
  Zap,
} from "lucide-react";
import Image from "next/image";
interface SectionHeroProps {
  contact: ContactInfo;
  landingpage: LandingPage;
}

const SectionHero = ({ contact, landingpage }: SectionHeroProps) => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Social links baseadas nos dados do banco
  const socialLinks = [
    ...(contact.whatsappLink
      ? [
          {
            icon: MessageCircle,
            href: contact.whatsappLink,
            label: "WhatsApp",
          },
        ]
      : []),
    ...(contact.instagramLink
      ? [
          {
            icon: Instagram,
            href: contact.instagramLink,
            label: "Instagram",
          },
        ]
      : []),
    ...(contact.linkedinLink
      ? [
          {
            icon: Linkedin,
            href: contact.linkedinLink,
            label: "LinkedIn",
          },
        ]
      : []),
    {
      icon: Mail,
      href: `mailto:${contact.email}`,
      label: "Email",
    },
  ];

  const highlights = [
    { icon: Code, text: "Código Limpo" },
    { icon: Zap, text: "Alta Performance" },
    { icon: Sparkles, text: "Design Moderno" },
  ];

  return (
    <section
      id="inicio"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 via-gray-950 to-black"
    >
      {/* Background Animated Gradient */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            background: [
              "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 40% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute inset-0"
        />
      </div>

      {/* Animated Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)] bg-[size:64px_64px]" />

      {/* Floating Elements */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -40, 0],
              rotate: [0, 180, 360],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 5 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          >
            {i % 3 === 0 ? (
              <Code className="text-electric-500/40 h-4 w-4" />
            ) : i % 3 === 1 ? (
              <Sparkles className="h-3 w-3 text-purple-500/40" />
            ) : (
              <Zap className="h-3 w-3 text-blue-500/40" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 text-center lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          {/* Avatar & Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mb-8 flex justify-center"
          >
            <div className="relative">
              {landingpage.avatarImageUrl ? (
                <Image
                  src={landingpage.avatarImageUrl}
                  alt={landingpage.name}
                  width={80}
                  height={80}
                  className="border-electric-500 shadow-electric-500/25 h-24 w-24 rounded-full border-4 object-cover shadow-2xl"
                />
              ) : (
                <div className="from-electric-500 border-electric-500 shadow-electric-500/25 flex h-24 w-24 items-center justify-center rounded-full border-4 bg-gradient-to-r to-blue-600 shadow-2xl">
                  <span className="text-2xl font-bold text-white">
                    {landingpage.name.charAt(0)}
                  </span>
                </div>
              )}
              <motion.div
                className="font-inter absolute -right-2 -bottom-2 rounded-full bg-gradient-to-r from-green-500 to-green-600 px-3 py-1 text-xs font-semibold text-white shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
              >
                Disponível
              </motion.div>
            </div>
          </motion.div>

          {/* Main Heading */}
          <div className="space-y-6">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="font-space text-4xl leading-tight font-bold md:text-6xl lg:text-7xl"
            >
              Olá, sou{" "}
              <span className="from-electric-500 bg-gradient-to-r via-blue-500 to-purple-500 bg-clip-text text-transparent">
                {landingpage.name}
              </span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="space-y-4"
            >
              <h2 className="font-space text-2xl text-gray-300 md:text-3xl lg:text-4xl">
                Desenvolvedor{" "}
                <span className="text-electric-500">Full-Stack</span>
              </h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="font-inter mx-auto max-w-3xl text-lg leading-relaxed text-gray-400 md:text-xl"
              >
                {landingpage.description}
              </motion.p>
            </motion.div>
          </div>

          {/* Highlights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="flex flex-wrap justify-center gap-6 py-4"
          >
            {highlights.map((item, index) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + index * 0.1 }}
                className="flex items-center gap-2 rounded-full border border-gray-700 bg-gray-800/50 px-4 py-2 backdrop-blur-sm"
              >
                <item.icon size={16} className="text-electric-500" />
                <span className="font-inter text-sm text-gray-300">
                  {item.text}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.8 }}
            className="flex flex-col items-center justify-center gap-4 pt-8 sm:flex-row"
          >
            <motion.button
              whileHover={{
                scale: 1.05,
                boxShadow: "0 0 40px rgba(59, 130, 246, 0.5)",
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => scrollToSection("projetos")}
              className="group from-electric-500 hover:from-electric-600 font-inter shadow-electric-500/25 relative overflow-hidden rounded-full bg-gradient-to-r to-blue-600 px-8 py-4 font-semibold text-white shadow-2xl transition-all duration-300 hover:to-blue-700"
            >
              <span className="relative z-10">Ver Projetos</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => scrollToSection("contato")}
              className="group font-inter hover:border-electric-500 hover:shadow-electric-500/20 rounded-full border-2 border-gray-600 px-8 py-4 font-semibold text-gray-300 backdrop-blur-sm transition-all duration-300 hover:text-white hover:shadow-lg"
            >
              <span className="group-hover:from-electric-400 bg-gradient-to-r from-gray-300 to-white bg-clip-text text-transparent group-hover:to-blue-400">
                Entrar em Contato
              </span>
            </motion.button>
          </motion.div>

          {/* Social Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3, duration: 0.8 }}
            className="flex justify-center space-x-4 pt-12"
          >
            {socialLinks.map(({ icon: Icon, href, label }, index) => (
              <motion.a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.5 + index * 0.1 }}
                whileHover={{
                  scale: 1.2,
                  y: -5,
                  color: "#3B82F6",
                }}
                className="hover:text-electric-500 hover:border-electric-500/50 rounded-xl border border-gray-700 bg-gray-800/50 p-3 text-gray-400 shadow-lg backdrop-blur-sm transition-all duration-300"
                aria-label={label}
              >
                <Icon size={20} />
              </motion.a>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default SectionHero;
