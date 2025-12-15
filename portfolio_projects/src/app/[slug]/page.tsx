import { notFound } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import { db } from "@/lib/prisma";

import Footer from "./components/Footer";
import Header from "./components/Header";
import SectionAbout from "./components/SectionAbout";
import SectionContacts from "./components/SectionContacts";
import SectionHero from "./components/SectionHero";
import SectionProjects from "./components/SectionProjects";

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
      {/* Seção com imagem de fundo */}
      <div className="bg-dark-950 min-h-screen overflow-x-hidden text-white">
        <Header contact={landingpage.contactInfo} landingpage={landingpage} />
        <section id="hero">
          <SectionHero
            contact={landingpage.contactInfo}
            landingpage={landingpage}
          />
        </section>
        <Separator />
        <section id="projects">
          <SectionProjects
            contact={landingpage.contactInfo}
            landingpage={landingpage}
            projects={landingpage.projects}
          />
        </section>
        <Separator />
        <section id="about">
          <SectionAbout
            contact={landingpage.contactInfo}
            landingpage={landingpage}
          />
        </section>
        <Separator />
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
