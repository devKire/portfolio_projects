'use client';

import { ContactInfo, LandingPage } from '@prisma/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  Clock,
  Code,
  Globe,
  MessageCircle,
  Palette,
  Rocket,
  Shield,
  ShoppingCart,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';

interface SectionServicesProps {
  contact: ContactInfo;
  landingpage: LandingPage;
}

// Serviços com cores pastel sólidas
const services = [
  {
    name: 'Landing Pages de Alta Conversão',
    icon: TrendingUp,
    description:
      'Páginas otimizadas para converter visitantes em clientes. Design persuasivo, copy estratégico e performance excepcional.',
    features: [
      'Copywriting persuasivo',
      'Design otimizado para conversão',
      'A/B Testing incluso',
      'Relatório de performance',
      'SEO on-page',
      'Integração com analytics',
    ],
    price: 'A partir de R$ 997',
    delivery: '5-7 dias',
    popular: true,
    badge: 'Mais Vendido',
    cta: 'Quero Uma Landing Page',
    results: '+43% conversão média',
    guarantee: 'Satisfação garantida ou refaço de graça',
    // Cores pastel
    bgColor: 'bg-emerald-100',
    borderColor: 'border-emerald-300',
    iconBg: 'bg-emerald-200',
    iconColor: 'text-emerald-700',
    badgeBg: 'bg-emerald-500',
    priceColor: 'text-emerald-700',
    tagColor: 'bg-emerald-50 text-emerald-700',
    featureDot: 'text-emerald-500',
  },
  {
    name: 'Sistemas Web Completos',
    icon: Code,
    description:
      'Sistemas personalizados para automatizar processos, gerenciar dados e escalar seu negócio com tecnologia de ponta.',
    features: [
      'Painel administrativo',
      'Banco de dados otimizado',
      'API RESTful documentada',
      'Autenticação e autorização',
      'Relatórios customizados',
      'Suporte técnico 30 dias',
    ],
    price: 'A partir de R$ 2.997',
    delivery: '15-30 dias',
    popular: false,
    badge: 'Sob Medida',
    cta: 'Quero Um Sistema',
    results: '98% uptime garantido',
    guarantee: '1 mês de suporte grátis',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    iconBg: 'bg-blue-200',
    iconColor: 'text-blue-700',
    badgeBg: 'bg-blue-500',
    priceColor: 'text-blue-700',
    tagColor: 'bg-blue-50 text-blue-700',
    featureDot: 'text-blue-500',
  },
  {
    name: 'E-commerce Profissional',
    icon: ShoppingCart,
    description:
      'Lojas virtuais completas com integração de pagamentos, gestão de estoque e dashboard de vendas em tempo real.',
    features: [
      'Pagamentos via Stripe/PIX',
      'Painel de produtos e estoque',
      'Relatórios de vendas',
      'Carrinho abandonado',
      'Área do cliente',
      'Treinamento incluso',
    ],
    price: 'A partir de R$ 3.997',
    delivery: '20-35 dias',
    popular: false,
    badge: 'Completo',
    cta: 'Quero Minha Loja Virtual',
    results: 'Suporte a 10k+ produtos',
    guarantee: 'Configuração completa inclusa',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
    iconBg: 'bg-purple-200',
    iconColor: 'text-purple-700',
    badgeBg: 'bg-purple-500',
    priceColor: 'text-purple-700',
    tagColor: 'bg-purple-50 text-purple-700',
    featureDot: 'text-purple-500',
  },
  {
    name: 'UI/UX Design Profissional',
    icon: Palette,
    description:
      'Interfaces modernas e intuitivas que encantam usuários e aumentam o tempo de permanência no seu site.',
    features: [
      'Prototipagem interativa',
      'Design System completo',
      'Testes de usabilidade',
      'UI responsiva (mobile-first)',
      'Paleta de cores estratégica',
      'Ícones e ilustrações',
    ],
    price: 'A partir de R$ 1.497',
    delivery: '7-14 dias',
    popular: false,
    badge: 'Premium',
    cta: 'Quero Um Design Incrível',
    results: 'Nota 95+ no Lighthouse',
    guarantee: 'Revisões ilimitadas',
    bgColor: 'bg-pink-100',
    borderColor: 'border-pink-300',
    iconBg: 'bg-pink-200',
    iconColor: 'text-pink-700',
    badgeBg: 'bg-pink-500',
    priceColor: 'text-pink-700',
    tagColor: 'bg-pink-50 text-pink-700',
    featureDot: 'text-pink-500',
  },
  {
    name: 'Otimização de Performance',
    icon: Zap,
    description:
      'Melhore drasticamente a velocidade e performance do seu site atual para aumentar conversões e ranqueamento SEO.',
    features: [
      'Análise completa de performance',
      'Otimização de código e assets',
      'Melhoria de SEO técnico',
      'Configuração de CDN',
      'Cache inteligente',
      'Relatório antes/depois',
    ],
    price: 'A partir de R$ 797',
    delivery: '3-7 dias',
    popular: false,
    badge: 'Rápido',
    cta: 'Acelerar Meu Site',
    results: 'Até 3x mais rápido',
    guarantee: 'Resultado comprovado ou dinheiro de volta',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-300',
    iconBg: 'bg-amber-200',
    iconColor: 'text-amber-700',
    badgeBg: 'bg-amber-500',
    priceColor: 'text-amber-700',
    tagColor: 'bg-amber-50 text-amber-700',
    featureDot: 'text-amber-500',
  },
  {
    name: 'Consultoria Técnica',
    icon: BarChart3,
    description:
      'Análise completa da sua presença digital com recomendações estratégicas para otimizar resultados e reduzir custos.',
    features: [
      'Auditoria técnica completa',
      'Plano de ação estratégico',
      'Mentoria personalizada',
      'Relatório executivo detalhado',
      'Análise de concorrência',
      'Roadmap de implementação',
    ],
    price: 'A partir de R$ 497',
    delivery: '3-5 dias',
    popular: false,
    badge: 'Estratégico',
    cta: 'Agendar Consultoria',
    results: 'Diagnóstico em 48h',
    guarantee: 'Relatório detalhado garantido',
    bgColor: 'bg-teal-100',
    borderColor: 'border-teal-300',
    iconBg: 'bg-teal-200',
    iconColor: 'text-teal-700',
    badgeBg: 'bg-teal-500',
    priceColor: 'text-teal-700',
    tagColor: 'bg-teal-50 text-teal-700',
    featureDot: 'text-teal-500',
  },
];

// Benefícios gerais
const benefits = [
  {
    icon: Shield,
    title: 'Satisfação Garantida',
    description: 'Não ficou satisfeito? Refaço sem custo adicional.',
  },
  {
    icon: Clock,
    title: 'Entrega no Prazo',
    description: 'Compromisso com deadlines. Atrasou? Você ganha bônus.',
  },
  {
    icon: MessageCircle,
    title: 'Suporte Contínuo',
    description: '30 dias de suporte gratuito após a entrega do projeto.',
  },
  {
    icon: Star,
    title: 'Qualidade Premium',
    description: 'Código limpo, testado e seguindo as melhores práticas.',
  },
];

const SectionServices = ({ contact, landingpage }: SectionServicesProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <section
      id="servicos"
      className="relative overflow-hidden bg-gradient-to-b from-gray-950 to-black py-16 md:py-24"
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -right-24 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 -left-24 h-80 w-80 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)] bg-[size:64px_64px]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center md:mb-24"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-700/50 bg-gray-800/30 px-4 py-2 backdrop-blur-sm md:px-6 md:py-3">
            <Sparkles size={16} className="text-electric-500" />
            <span className="text-sm font-medium text-gray-300">
              Soluções Sob Medida
            </span>
          </div>

          <h2 className="font-space mb-6 text-3xl font-bold md:text-5xl lg:text-6xl">
            Serviços e{' '}
            <span className="bg-gradient-to-r from-sky-400 via-purple-400 to-purple-500 bg-clip-text text-transparent">
              Investimento
            </span>
          </h2>

          <p className="mx-auto max-w-3xl text-base text-gray-400 md:text-lg">
            Soluções digitais completas com preços transparentes. Escolha o
            serviço ideal para seu negócio ou solicite uma proposta
            personalizada.
          </p>

          {/* Benefícios Rápidos */}
          <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex flex-col items-center gap-2 rounded-xl border border-gray-700/30 bg-gray-800/10 p-3 backdrop-blur-sm"
              >
                <benefit.icon size={18} className="text-electric-500" />
                <span className="text-xs font-medium text-gray-300">
                  {benefit.title}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 🔥 Carousel de Serviços com Cores Pastel */}
        <div className="relative mx-auto max-w-6xl">
          <Carousel
            setApi={setApi}
            opts={{
              align: 'center',
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent>
              {services.map((service, index) => (
                <CarouselItem
                  key={service.name}
                  className="basis-full pl-4 md:basis-1/1 lg:basis-1/3"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border-2 p-6 shadow-xl transition-all duration-300 hover:shadow-2xl ${service.bgColor} ${service.borderColor} hover:-translate-y-2`}
                  >
                    {/* Badge */}
                    {service.popular && (
                      <div className="absolute top-4 -right-0.5 rounded-l-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
                        <Sparkles size={12} className="mr-1 inline" />
                        {service.badge}
                      </div>
                    )}
                    {!service.popular && (
                      <div
                        className={`absolute top-4 -right-0.5 rounded-l-full ${service.badgeBg} px-4 py-1.5 text-xs font-bold text-white shadow-lg`}
                      >
                        {service.badge}
                      </div>
                    )}

                    {/* Ícone */}
                    <div
                      className={`mb-5 inline-flex rounded-2xl p-3.5 shadow-sm ${service.iconBg}`}
                    >
                      <service.icon size={28} className={service.iconColor} />
                    </div>

                    {/* Título e Descrição */}
                    <h3 className="font-space mb-3 text-xl font-bold text-gray-900">
                      {service.name}
                    </h3>
                    <p className="mb-5 flex-1 text-sm leading-relaxed text-gray-600">
                      {service.description}
                    </p>

                    {/* Métrica de Resultado */}
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-white/60 px-3 py-1.5 backdrop-blur-sm">
                      <TrendingUp size={14} className="text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-700">
                        {service.results}
                      </span>
                    </div>

                    {/* Features */}
                    <div className="mb-5 space-y-2">
                      {service.features.map((feature, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm text-gray-700"
                        >
                          <CheckCircle
                            size={14}
                            className={`flex-shrink-0 ${service.featureDot}`}
                          />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Preço e Prazo */}
                    <div className="mb-4 border-t border-gray-300/50 pt-4">
                      <div
                        className={`font-space text-2xl font-bold ${service.priceColor}`}
                      >
                        {service.price}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={12} />
                        Entrega em {service.delivery}
                      </div>
                    </div>

                    {/* Garantia */}
                    <div className="mb-4 flex items-center gap-2 rounded-lg bg-white/50 px-3 py-1.5 text-xs font-medium text-gray-700">
                      <Shield size={12} className="text-yellow-600" />
                      {service.guarantee}
                    </div>

                    {/* CTA */}
                    <motion.a
                      href={
                        contact.whatsappLink ||
                        `https://api.whatsapp.com/send/?phone=554797086965&text=Olá! Tenho interesse no serviço: ${service.name}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl ${service.badgeBg}`}
                    >
                      {service.cta}
                      <ArrowRight size={16} />
                    </motion.a>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>

            {/* Botões de Navegação Personalizados */}
            <div className="mt-8 flex items-center justify-center gap-4">
              <CarouselPrevious className="hover:border-electric-500/50 static flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-600/50 bg-gray-800/50 text-gray-400 backdrop-blur-sm transition-all hover:bg-gray-700/50 hover:text-white" />

              {/* Indicadores */}
              <div className="flex items-center gap-2 px-4">
                {Array.from({ length: count }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => api?.scrollTo(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === current - 1
                        ? 'from-electric-500 w-8 bg-gradient-to-r to-blue-500'
                        : 'w-2 bg-gray-600 hover:bg-gray-500'
                    }`}
                  />
                ))}
              </div>

              <CarouselNext className="hover:border-electric-500/50 static flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-600/50 bg-gray-800/50 text-gray-400 backdrop-blur-sm transition-all hover:bg-gray-700/50 hover:text-white" />
            </div>
          </Carousel>
        </div>

        {/* CTA Final */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20 text-center"
        >
          <div className="mx-auto max-w-3xl rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-8 backdrop-blur-sm md:p-12">
            <Rocket size={48} className="text-electric-500 mx-auto mb-6" />
            <h3 className="font-space mb-4 text-2xl font-bold md:text-3xl">
              Não Encontrou o Que Precisava?
            </h3>
            <p className="mb-6 text-gray-400">
              Cada negócio é único. Me conte sobre seu projeto e receba uma
              proposta personalizada em até 2 horas, sem compromisso.
            </p>
            <motion.a
              href={
                contact.whatsappLink ||
                'https://api.whatsapp.com/send/?phone=554797086965&text=Olá! Gostaria de uma proposta personalizada'
              }
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 px-8 py-4 text-lg font-semibold text-white shadow-2xl shadow-green-500/25 transition-all hover:from-green-600 hover:to-green-700"
            >
              <MessageCircle size={24} />
              Solicitar Proposta Personalizada
              <ArrowRight size={20} />
            </motion.a>
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
              <Clock size={14} />
              Resposta em até 2 horas • Sem compromisso • Satisfação garantida
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SectionServices;
