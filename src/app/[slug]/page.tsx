import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';

import { AuroraBackground } from '@/components/ui/aurora-background';
import { db } from '@/lib/prisma';

import SectionHero from './components/SectionHero';

const SectionProjects = dynamic(() => import('./components/SectionProjects'), {
  loading: () => <SectionFallback className="min-h-screen" />,
});
const SectionServices = dynamic(() => import('./components/SectionServices'), {
  loading: () => <SectionFallback className="min-h-screen" />,
});
const SectionProcess = dynamic(() => import('./components/SectionProcess'), {
  loading: () => <SectionFallback className="min-h-[80vh]" />,
});
const SectionAbout = dynamic(() => import('./components/SectionAbout'), {
  loading: () => <SectionFallback className="min-h-screen" />,
});
const SectionContacts = dynamic(() => import('./components/SectionContacts'), {
  loading: () => <SectionFallback className="min-h-[90vh]" />,
});
const Footer = dynamic(() => import('./components/Footer'), {
  loading: () => <div className="min-h-32 bg-black" />,
});

interface LandingPageProps {
  params: Promise<{ slug: string }>;
}

const SectionFallback = ({
  className = 'min-h-screen',
}: {
  className?: string;
}) => (
  // Mantém espaço reservado para seções abaixo da dobra e evita CLS enquanto o chunk carrega.
  <div className={`relative bg-black ${className}`} aria-hidden="true" />
);

const ServicesShell = ({ children }: { children: React.ReactNode }) => (
  <div className="relative min-h-screen w-full overflow-hidden bg-black px-2 py-4 md:px-10">
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.06),transparent_70%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)] bg-[size:80px_80px]" />
    </div>
    <div className="relative z-10 flex h-full w-full flex-col items-center justify-center">
      {children}
    </div>
  </div>
);

const Page = async ({ params }: LandingPageProps) => {
  const { slug } = await params;

  const landingpage = await db.landingPage.findUnique({
    where: { slug },
    include: {
      contactInfo: true,
      projects: {
        where: { isActive: true },
        orderBy: { position: 'asc' },
      },
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
        <ServicesShell>
          <SectionServices
            contact={landingpage.contactInfo}
            landingpage={landingpage}
          />
        </ServicesShell>

        <SectionProcess
          contact={landingpage.contactInfo}
          landingpage={landingpage}
        />
        <SectionAbout
          contact={landingpage.contactInfo}
          landingpage={landingpage}
        />
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
