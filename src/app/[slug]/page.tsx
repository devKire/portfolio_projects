import { notFound } from 'next/navigation';

import { Separator } from '@/components/ui/separator';
import { db } from '@/lib/prisma';

import Footer from './components/Footer';
import SectionAbout from './components/SectionAbout';
import SectionContacts from './components/SectionContacts';
import SectionHero from './components/SectionHero';
import SectionProjects from './components/SectionProjects';
import SectionProcess from './components/SectionProcess';
import SectionServices from './components/SectionServices';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { Vortex } from '@/components/ui/vortex';
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
    <div className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <div className="relative z-10">
        <AuroraBackground>
          <SectionHero
            contact={landingpage.contactInfo}
            landingpage={landingpage}
          />
        </AuroraBackground>
        <SectionProjects
          contact={landingpage.contactInfo}
          landingpage={landingpage}
          projects={landingpage.projects}
        />

        <SectionServices
          contact={landingpage.contactInfo}
          landingpage={landingpage}
        />
        <SectionProcess
          contact={landingpage.contactInfo}
          landingpage={landingpage}
        />
        <Vortex
          backgroundColor="black"
          className="flex h-full w-full flex-col items-center justify-center px-2 py-4 md:px-10"
        >
          <div className="absolute inset-0">
            {/* Luz suave no topo */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.06),transparent_70%)]" />
            {/* Grid sutil */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)] bg-[size:80px_80px]" />
          </div>
          <SectionAbout
            contact={landingpage.contactInfo}
            landingpage={landingpage}
          />
        </Vortex>
        <SectionContacts
          contact={landingpage.contactInfo}
          landingpage={landingpage}
        />
        <Footer contact={landingpage.contactInfo} landingpage={landingpage} />
      </div>
    </div>
  );
};

export default Page;
