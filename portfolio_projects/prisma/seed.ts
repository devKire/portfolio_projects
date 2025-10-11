/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */

const { PrismaClient, Prisma } = require("@prisma/client");

const prismaClient = new PrismaClient();

const main = async () => {
  await prismaClient.$transaction(
    async (tx: any) => {
      // Limpar dados existentes
      await tx.contactInfo.deleteMany();
      await tx.landingPage.deleteMany();

      // Criar landing page
      const landingPage = await tx.landingPage.create({
        data: {
          name: "Erik Santos",
          slug: "erikdossantos",
          description:
            "Transformo ideias em sites profissionais, rápidos e modernos que geram resultados reais para o seu negócio. Se você quer presença online de verdade, eu te ajudo a construir.",
          avatarImageUrl:
            "https://1hcgs7spbatxhpzg.public.blob.vercel-storage.com/me4.png",
          coverImageUrl:
            "https://1hcgs7spbatxhpzg.public.blob.vercel-storage.com/cover_eriksantos.png",
        },
      });

      // Criar contact info
      await tx.contactInfo.create({
        data: {
          email: "erikdossantos2006@outlook.com",
          phone: "(47) 99953-5245",
          whatsappLink: "https://wa.me/5547999535245",
          instagramLink: "https://www.instagram.com/dossantoserik_jesus/",
          facebookLink:
            "https://www.facebook.com/profile.php?id=61579313971405",
          linkedinLink:
            "https://www.linkedin.com/in/erik-rafael-dos-santos-416b64251/",
          landingpageId: landingPage.id,
        },
      });

      return {
        landingPage,
      };
    },
    { timeout: 20000 },
  );

  console.log("📱 Seed de dados concluído com sucesso! 🎉");
};

main()
  .catch((e) => {
    console.error("Erro ao executar o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
