import { notFound } from 'next/navigation';

import { Separator } from '@/components/ui/separator';
import { db } from '@/lib/prisma';

import Footer from './components/Footer';
import Header from './components/Header';
import SectionAbout from './components/SectionAbout';
import SectionContacts from './components/SectionContacts';
import SectionHero from './components/SectionHero';
import SectionProjects from './components/SectionProjects';
import SectionProcess from './components/SectionProcess';
import SectionServices from './components/SectionServices';

interface LandingPageProps {
  params: Promise<{ slug: string }>;
}

const Page = async ({ params }: LandingPageProps) => {
  const { slug } = await params;

  const landingpage = await db.landingPage.findUnique({
    where: { slug },
    include: {
      contactInfo: true,
      projects: true,
    },
  });

  if (!landingpage) {
    notFound();
  }

  if (!landingpage.contactInfo) {
    notFound();
  }

  return (
    <>
      <div className="bg-dark-950 min-h-screen overflow-x-hidden text-white">
        {/* 
          🔥 ORDEM ESTRATÉGICA DE CONVERSÃO (Framework AIDA)
          
          1. ATENÇÃO    → Hero (gancho inicial, promessa de valor)
          2. INTERESSE  → Projetos (prova social, exemplos reais)
          3. DESEJO     → Serviços (o que você oferece, preços)
          4. CONFIANÇA  → Processo (como funciona, transparência)
          5. AUTORIDADE → Sobre (quem é você, credibilidade)
          6. AÇÃO       → Contato (CTA final, fechamento)
        */}

        {/* 1️⃣ ATENÇÃO - Hero Section */}
        {/* Objetivo: Capturar atenção em 3 segundos com promessa clara */}
        <section id="hero">
          <SectionHero
            contact={landingpage.contactInfo}
            landingpage={landingpage}
          />
        </section>
        <Separator />

        {/* 2️⃣ INTERESSE - Projetos (Prova Social) */}
        {/* Objetivo: Mostrar resultados reais, gerar confiança inicial */}
        <section id="projects">
          <SectionProjects
            contact={landingpage.contactInfo}
            landingpage={landingpage}
            projects={landingpage.projects}
          />
        </section>
        <Separator />

        {/* 3️⃣ DESEJO - Serviços com Preços */}
        {/* Objetivo: Apresentar ofertas com valor claro e transparente */}
        <section id="services">
          <SectionServices
            contact={landingpage.contactInfo}
            landingpage={landingpage}
          />
        </section>
        <Separator />

        {/* 4️⃣ CONFIANÇA - Processo de Trabalho */}
        {/* Objetivo: Remover ansiedade mostrando como funciona */}
        <section id="process">
          <SectionProcess
            contact={landingpage.contactInfo}
            landingpage={landingpage}
          />
        </section>
        <Separator />

        {/* 5️⃣ AUTORIDADE - Sobre Mim */}
        {/* Objetivo: Construir conexão pessoal e credibilidade */}
        <section id="about">
          <SectionAbout
            contact={landingpage.contactInfo}
            landingpage={landingpage}
          />
        </section>
        <Separator />

        {/* 6️⃣ AÇÃO - Contato (Fechamento) */}
        {/* Objetivo: Converter com CTA forte e objeções respondidas */}
        <section id="contact">
          <SectionContacts
            contact={landingpage.contactInfo}
            landingpage={landingpage}
          />
        </section>

        <Footer contact={landingpage.contactInfo} landingpage={landingpage} />
      </div>
    </>
  );
};

export default Page;
