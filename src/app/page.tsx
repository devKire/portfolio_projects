'use client';

import { useEffect, useState } from 'react';
import {
  BriefcaseIcon,
  PhoneIcon,
  CameraIcon,
  LinkedinIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { HexagonBackground } from '@/components/animate-ui/components/backgrounds/hexagon';

export default function WelcomePage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const links = [
    {
      id: 1,
      title: 'Portfólio',
      url: 'https://portfolioeriksantos.vercel.app/erikdossantos',
      icon: BriefcaseIcon,
      description: 'Conheça meus projetos',
      accent:
        'hover:border-emerald-200 hover:bg-emerald-50/50 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20',
    },
    {
      id: 2,
      title: 'WhatsApp',
      url: 'https://api.whatsapp.com/send/?phone=554797086965&text&type=phone_number&app_absent=0',
      icon: PhoneIcon,
      description: 'Vamos conversar',
      accent:
        'hover:border-green-200 hover:bg-green-50/50 dark:hover:border-green-800 dark:hover:bg-green-950/20',
    },
    {
      id: 3,
      title: 'Instagram',
      url: 'https://www.instagram.com/dossantoserik_jesus/',
      icon: CameraIcon,
      description: 'Me siga no Instagram',
      accent:
        'hover:border-pink-200 hover:bg-pink-50/50 dark:hover:border-pink-800 dark:hover:bg-pink-950/20',
    },
    {
      id: 4,
      title: 'LinkedIn',
      url: 'https://www.linkedin.com/in/erik-rafael-dos-santos-416b64251/',
      icon: LinkedinIcon,
      description: 'Conecte-se comigo',
      accent:
        'hover:border-blue-200 hover:bg-blue-50/50 dark:hover:border-blue-800 dark:hover:bg-blue-950/20',
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-neutral-50 to-neutral-100 p-4 sm:p-6 dark:from-neutral-950 dark:to-neutral-900">
      <HexagonBackground className="absolute inset-0 flex items-center justify-center rounded-xl" />

      <div
        className={`w-full max-w-md transition-[transform,opacity] duration-700 ease-out ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
        }`}
      >
        {/* Card Principal com Profundidade */}
        <div className="rounded-3xl border border-neutral-200/60 bg-white/80 p-8 shadow-xl shadow-neutral-200/20 backdrop-blur-sm dark:border-neutral-800/60 dark:bg-neutral-900/80 dark:shadow-neutral-950/30">
          {/* Header com Logo e Nome */}
          <div className="space-y-6">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-neutral-800 to-neutral-950 shadow-lg ring-1 shadow-neutral-300/20 ring-neutral-200 dark:from-white dark:to-neutral-200 dark:shadow-neutral-950/50 dark:ring-neutral-700">
                <span className="text-xl font-bold tracking-tighter text-white dark:text-neutral-900">
                  ES
                </span>
              </div>
            </div>

            {/* Nome e Subtítulo - Hierarquia Melhorada */}
            <div className="space-y-2">
              <h1 className="text-center text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-white">
                Erik Santos
              </h1>
              <p className="mx-auto max-w-xs text-center text-sm font-normal tracking-wide text-neutral-500 dark:text-neutral-400">
                Desenvolvedor Web • Criador de Soluções Digitais
              </p>
            </div>
          </div>

          {/* Lista de Links - Microinterações Refinadas */}
          <div className="mt-8 space-y-3">
            {links.map((link, index) => {
              const IconComponent = link.icon;
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir ${link.title}`}
                  className={`group flex w-full cursor-pointer items-center rounded-2xl border border-neutral-200 bg-white p-4 transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-neutral-200/30 focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 focus:outline-none active:scale-[0.98] dark:border-neutral-700/40 dark:bg-neutral-800/40 dark:hover:shadow-neutral-900/50 dark:focus:ring-neutral-500 dark:focus:ring-offset-neutral-900 ${link.accent} ${
                    isVisible
                      ? 'translate-y-0 opacity-100'
                      : 'translate-y-4 opacity-0'
                  }`}
                  style={{
                    transitionDelay: `${index * 100}ms`,
                    transitionProperty: 'transform, opacity, box-shadow',
                  }}
                >
                  {/* Ícone */}
                  <div className="mr-4 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-neutral-100 transition-colors duration-200 group-hover:bg-neutral-200 dark:bg-neutral-700/40 dark:group-hover:bg-neutral-600/40">
                    <IconComponent className="h-5 w-5 text-neutral-600 transition-colors duration-200 group-hover:text-neutral-900 dark:text-neutral-300 dark:group-hover:text-white" />
                  </div>

                  {/* Conteúdo do Link */}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold tracking-tight text-neutral-900 dark:text-white">
                      {link.title}
                    </h2>
                    <p className="mt-0.5 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                      {link.description}
                    </p>
                  </div>

                  {/* Ícone de Ação - Sempre Visível com Opacidade */}
                  <div className="ml-3 flex-shrink-0 translate-x-0 transform opacity-30 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100">
                    <ChevronRightIcon className="h-4 w-4 text-neutral-400 group-hover:text-neutral-900 dark:text-neutral-500 dark:group-hover:text-white" />
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* Footer Fora do Card */}
        <div className="mt-6 text-center">
          <p className="text-xs font-normal tracking-wide text-neutral-400 dark:text-neutral-500">
            © {new Date().getFullYear()} Erik Santos
          </p>
        </div>
      </div>
    </div>
  );
}
