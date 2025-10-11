"use client";

import { ContactInfo, LandingPage } from "@prisma/client";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Clock,
  Facebook,
  Linkedin,
  Mail,
  MessageCircle,
  Phone,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

interface SectionContactsProps {
  contact: ContactInfo;
  landingpage: LandingPage;
}

const SectionContacts = ({ contact }: SectionContactsProps) => {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const copyEmailToClipboard = () => {
    navigator.clipboard.writeText(contact.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  // Contact methods baseadas nos dados do banco - COMPLETO com todos os campos
  const contactMethods = [
    {
      icon: MessageCircle,
      title: "WhatsApp",
      description: "Resposta rápida e direta",
      action: "Enviar mensagem",
      href: contact.whatsappLink || "#",
      primary: true,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30",
    },
    {
      icon: Mail,
      title: "Email",
      description: contact.email,
      action: copiedEmail ? "Copiado! ✓" : "Copiar email",
      href: `mailto:${contact.email}`,
      primary: false,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      onClick: copyEmailToClipboard,
    },
    ...(contact.phone
      ? [
          {
            icon: Phone,
            title: "Telefone",
            description: contact.phone,
            action: "Ligar agora",
            href: `tel:${contact.phone}`,
            primary: false,
            color: "text-purple-500",
            bgColor: "bg-purple-500/10",
            borderColor: "border-purple-500/30",
          },
        ]
      : []),
    ...(contact.linkedinLink
      ? [
          {
            icon: Linkedin,
            title: "LinkedIn",
            description: "Conecte-se profissionalmente",
            action: "Conectar",
            href: contact.linkedinLink,
            primary: false,
            color: "text-blue-400",
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-500/30",
          },
        ]
      : []),
    ...(contact.instagramLink
      ? [
          {
            icon: Sparkles,
            title: "Instagram",
            description: "Meu dia a dia e trabalhos",
            action: "Seguir",
            href: contact.instagramLink,
            primary: false,
            color: "text-pink-500",
            bgColor: "bg-pink-500/10",
            borderColor: "border-pink-500/30",
          },
        ]
      : []),
    ...(contact.facebookLink
      ? [
          {
            icon: Facebook,
            title: "Facebook",
            description: "Me acompanhe no Facebook",
            action: "Seguir",
            href: contact.facebookLink,
            primary: false,
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-500/30",
          },
        ]
      : []),
  ].filter((method) => method.href !== "#");

  const availability = [
    { icon: Clock, text: "Resposta em até 24h" },
    { icon: Calendar, text: "Disponível para novos projetos" },
    { icon: Sparkles, text: "Consulta inicial gratuita" },
  ];

  return (
    <section
      id="contato"
      className="relative overflow-hidden bg-gradient-to-b from-gray-900 to-black py-24"
    >
      {/* Background Elements */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
          }}
          className="bg-electric-500/10 absolute top-1/4 left-1/4 h-96 w-96 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            delay: 2,
          }}
          className="absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-20 text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: "spring" }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-800/50 px-6 py-3 backdrop-blur-sm"
          >
            <Sparkles size={20} className="text-electric-500" />
            <span className="font-inter text-gray-300">
              Vamos Trabalhar Juntos
            </span>
          </motion.div>

          <h2 className="font-space mb-6 text-4xl font-bold md:text-6xl lg:text-7xl">
            Vamos Criar Algo <span className="text-electric-500">Incrível</span>
          </h2>
          <p className="font-inter mx-auto max-w-3xl text-xl leading-relaxed text-gray-400 md:text-2xl">
            Pronto para transformar sua ideia em realidade? Entre em contato e
            vamos discutir como posso ajudar no seu próximo projeto.
          </p>
        </motion.div>

        {/* Main CTA Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-16"
        >
          <div className="relative overflow-hidden rounded-3xl border border-gray-700 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8 backdrop-blur-sm md:p-12 lg:p-16">
            {/* Animated Background */}
            <motion.div
              animate={{
                background: [
                  "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
                  "radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)",
                  "radial-gradient(circle at 40% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)",
                  "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
                ],
              }}
              transition={{ duration: 8, repeat: Infinity }}
              className="absolute inset-0"
            />

            <div className="relative z-10 text-center">
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="font-space mb-4 text-2xl font-bold md:text-4xl"
              >
                Vamos Conversar Sobre Seu Projeto
              </motion.h3>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                className="font-inter mx-auto mb-8 max-w-2xl text-lg text-gray-300 md:text-xl"
              >
                Agende uma consulta gratuita de 30 minutos para discutirmos suas
                ideias e como posso ajudar a transformá-las em uma solução
                digital incrível.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
                className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
              >
                <motion.a
                  href={contact.whatsappLink || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 0 50px rgba(34, 197, 94, 0.5)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="group font-inter relative flex items-center gap-3 overflow-hidden rounded-full bg-gradient-to-r from-green-500 to-green-600 px-8 py-4 font-semibold text-white shadow-2xl shadow-green-500/25 transition-all duration-300 hover:from-green-600 hover:to-green-700"
                >
                  <MessageCircle size={24} />
                  <span>Conversar no WhatsApp</span>
                  <ArrowRight
                    size={20}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </motion.a>

                <motion.button
                  onClick={copyEmailToClipboard}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="font-inter hover:border-electric-500 hover:shadow-electric-500/20 flex items-center gap-3 rounded-full border-2 border-gray-600 px-8 py-4 font-semibold text-gray-300 backdrop-blur-sm transition-all duration-300 hover:text-white hover:shadow-lg"
                >
                  <Mail size={20} />
                  {copiedEmail ? "Email Copiado! ✓" : "Copiar Email"}
                </motion.button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Contact Methods Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-16"
        >
          <h3 className="font-space mb-8 text-center text-2xl font-bold md:text-3xl">
            Outras Formas de <span className="text-electric-500">Contato</span>
          </h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {contactMethods.map((method, index) => (
              <motion.div
                key={method.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group"
              >
                <a
                  href={method.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={method.onClick}
                  className={`block h-full rounded-2xl border p-6 transition-all duration-300 ${
                    method.primary
                      ? `${method.borderColor} ${method.bgColor} hover:shadow-2xl hover:shadow-green-500/20`
                      : `border-gray-700 bg-gray-800/50 backdrop-blur-sm hover:border-gray-600 hover:shadow-lg`
                  } group-hover:shadow-xl`}
                >
                  <div className="flex h-full flex-col items-center space-y-4 text-center">
                    <div
                      className={`rounded-xl p-3 transition-all duration-300 ${
                        method.primary
                          ? "bg-green-500 text-white"
                          : `${method.bgColor} ${method.color} group-hover:scale-110`
                      }`}
                    >
                      <method.icon size={24} />
                    </div>

                    <div className="flex-1">
                      <h4
                        className={`font-space mb-2 text-lg font-semibold ${
                          method.primary ? "text-white" : "text-white"
                        }`}
                      >
                        {method.title}
                      </h4>
                      <p className="font-inter mb-3 line-clamp-2 text-sm text-gray-400">
                        {method.description}
                      </p>
                    </div>

                    <span
                      className={`font-inter text-sm font-medium transition-colors duration-300 ${
                        method.primary
                          ? "text-green-400"
                          : `${method.color} group-hover:text-electric-500`
                      }`}
                    >
                      {method.action} →
                    </span>
                  </div>
                </a>
              </motion.div>
            ))}
          </div>

          {/* Mensagem caso não haja métodos de contato */}
          {contactMethods.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-8 text-center"
            >
              <p className="font-inter text-gray-400">
                Métodos de contato serão adicionados em breve.
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Availability & Info */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center"
        >
          <div className="rounded-2xl border border-gray-700 bg-gray-800/50 p-8 backdrop-blur-sm md:p-12">
            <h4 className="font-space mb-6 text-2xl font-semibold">
              Disponibilidade & Processo
            </h4>

            <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              {availability.map((item, index) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="flex items-center justify-center gap-3"
                >
                  <div className="bg-electric-500/20 rounded-lg p-2">
                    <item.icon size={20} className="text-electric-500" />
                  </div>
                  <span className="font-inter text-gray-300">{item.text}</span>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 animate-pulse rounded-full bg-green-500" />
                <span className="font-inter text-sm text-green-500">
                  Disponível para novos projetos
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SectionContacts;
