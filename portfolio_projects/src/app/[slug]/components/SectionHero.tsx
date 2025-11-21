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

import { ThreeDMarquee } from "@/components/ui/3d-marquee";

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

  const images = [
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_cantinhogourmet.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_eriksantos.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_francostaacademy.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_gilshinaider.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_insertion.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_itajubacasamar.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_joaogarcia.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_marivaldo.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_metanoiamentebiblico.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_neodoxa.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_projetocafarnaum.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_rafamanicure.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_rdseletrecista.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_tarefando.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_cantinhogourmet.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_eriksantos.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_francostaacademy.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_gilshinaider.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_insertion.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_itajubacasamar.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_joaogarcia.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_marivaldo.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_metanoiamentebiblico.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_neodoxa.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_projetocafarnaum.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_rafamanicure.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_rdseletrecista.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_tarefando.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_cantinhogourmet.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_eriksantos.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_francostaacademy.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_gilshinaider.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_insertion.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_itajubacasamar.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_joaogarcia.png",
    "https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_marivaldo.png",
  ];

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
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)] bg-[size:64px_64px] md:bg-[size:64px_64px]" />

      {/* Floating Elements */}
      <div className="absolute inset-0">
        {[...Array(10)].map((_, i) => (
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
              <Code className="text-electric-500/40 h-3 w-3 md:h-4 md:w-4" />
            ) : i % 3 === 1 ? (
              <Sparkles className="h-2 w-2 text-purple-500/40 md:h-3 md:w-3" />
            ) : (
              <Zap className="h-2 w-2 text-blue-500/40 md:h-3 md:w-3" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 mx-auto mt-20 w-full max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-6 md:space-y-8"
        >
          {/* Avatar & Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mb-6 flex justify-center md:mb-8"
          >
            <div className="relative">
              {landingpage.avatarImageUrl ? (
                <Image
                  src={landingpage.avatarImageUrl}
                  alt={landingpage.name}
                  width={80}
                  height={80}
                  className="border-electric-500 shadow-electric-500/25 h-16 w-16 rounded-full border-4 object-cover shadow-2xl md:h-24 md:w-24"
                />
              ) : (
                <div className="from-electric-500 border-electric-500 shadow-electric-500/25 flex h-16 w-16 items-center justify-center rounded-full border-4 bg-gradient-to-r to-blue-600 shadow-2xl md:h-24 md:w-24">
                  <span className="text-xl font-bold text-white md:text-2xl">
                    {landingpage.name.charAt(0)}
                  </span>
                </div>
              )}
              <motion.div
                className="font-inter absolute -right-1 -bottom-1 rounded-full bg-gradient-to-r from-green-500 to-green-600 px-2 py-1 text-[10px] font-semibold text-white shadow-lg md:-right-2 md:-bottom-2 md:px-3 md:text-xs"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring" }}
              >
                Disponível
              </motion.div>
            </div>
          </motion.div>

          {/* Main Heading */}
          <div className="space-y-4 md:space-y-6">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="font-space text-3xl leading-tight font-bold sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
            >
              Olá, sou{" "}
              <span className="bg-gradient-to-r from-sky-400 via-purple-400 to-purple-500 bg-clip-text text-transparent">
                {landingpage.name}
              </span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="space-y-3 md:space-y-4"
            >
              <h2 className="font-space text-xl text-gray-300 sm:text-2xl md:text-3xl lg:text-4xl">
                Desenvolvedor{" "}
                <span className="text-electric-500">Full-Stack</span>
              </h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.8 }}
                className="font-inter mx-auto max-w-3xl px-4 text-base leading-relaxed text-gray-400 sm:px-6 sm:text-lg md:text-xl"
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
            className="flex flex-wrap justify-center gap-3 py-4 sm:gap-4 md:gap-6"
          >
            {highlights.map((item, index) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1 + index * 0.1 }}
                className="flex items-center gap-2 rounded-full border border-gray-700 bg-gray-800/50 px-3 py-1.5 backdrop-blur-sm sm:px-4 sm:py-2"
              >
                <item.icon size={14} className="text-electric-500 sm:size-4" />
                <span className="font-inter text-xs text-gray-300 sm:text-sm">
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
            className="flex flex-col items-center justify-center gap-3 pt-6 sm:flex-row sm:gap-4 md:pt-8"
          >
            <motion.button
              whileHover={{
                scale: 1.05,
                boxShadow: "0 0 40px rgba(59, 130, 246, 0.5)",
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => scrollToSection("projetos")}
              className="group from-electric-500 hover:from-electric-600 font-inter shadow-electric-500/25 relative w-full overflow-hidden rounded-full bg-gradient-to-r to-blue-600 px-6 py-3 font-semibold text-white shadow-2xl transition-all duration-300 hover:to-blue-700 sm:w-auto sm:px-8 sm:py-4"
            >
              <span className="relative z-10">Ver Projetos</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => scrollToSection("contato")}
              className="group font-inter hover:border-electric-500 hover:shadow-electric-500/20 w-full rounded-full border-2 border-gray-600 px-6 py-3 font-semibold text-gray-300 backdrop-blur-sm transition-all duration-300 hover:text-white hover:shadow-lg sm:w-auto sm:px-8 sm:py-4"
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
            className="flex justify-center space-x-3 pt-8 md:space-x-4 md:pt-12"
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
                className="hover:text-electric-500 hover:border-electric-500/50 rounded-xl border border-gray-700 bg-gray-800/50 p-2 text-gray-400 shadow-lg backdrop-blur-sm transition-all duration-300 sm:p-3"
                aria-label={label}
              >
                <Icon size={18} className="sm:size-5" />
              </motion.a>
            ))}
          </motion.div>
        </motion.div>

        {/* Marquee Section */}
        <div className="mx-auto my-8 max-w-7xl rounded-2xl bg-gray-950/5 p-2 ring-1 ring-neutral-700/10 sm:my-10 sm:rounded-3xl sm:p-4 dark:bg-neutral-800">
          <ThreeDMarquee images={images} />
        </div>
      </div>
    </section>
  );
};

export default SectionHero;
