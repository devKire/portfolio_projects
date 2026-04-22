import { PrismaClient } from '@prisma/client';
import { subDays } from 'date-fns';

const prisma = new PrismaClient();

const DEFAULT_LANDINGPAGE_ID = '3eb3839d-eb78-43ed-9eb7-8f39352d64bb';

async function seedDashboardData() {
  try {
    console.log('🌱 Iniciando seed do dashboard...');

    // Gerar dados de visualizações aleatórias para os últimos 30 dias
    for (let i = 0; i < 100; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const date = subDays(new Date(), daysAgo);

      const pages = ['home', 'projects', 'about', 'contact'];
      const page = pages[Math.floor(Math.random() * pages.length)];

      await prisma.pageView.create({
        data: {
          page,
          path: `/${page}`,
          ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          landingpageId: DEFAULT_LANDINGPAGE_ID,
          createdAt: date,
        },
      });
    }

    console.log('✅ Dados de visualizações criados!');

    // Criar interações sociais de exemplo
    const socialInteractions = [
      { platform: 'linkedin', type: 'follow', count: 543 },
      { platform: 'github', type: 'follow', count: 289 },
      { platform: 'linkedin', type: 'comment', count: 45 },
      { platform: 'twitter', type: 'like', count: 87 },
      { platform: 'instagram', type: 'follow', count: 123 },
    ];

    for (const interaction of socialInteractions) {
      for (let i = 0; i < 5; i++) {
        const date = subDays(new Date(), Math.floor(Math.random() * 30));

        await prisma.socialInteraction.create({
          data: {
            platform: interaction.platform,
            type: interaction.type,
            count:
              Math.floor(interaction.count / 5) +
              Math.floor(Math.random() * 10),
            landingpageId: DEFAULT_LANDINGPAGE_ID,
            createdAt: date,
          },
        });
      }
    }

    console.log('✅ Dados de interações sociais criados!');
    console.log('🎉 Seed do dashboard concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar seed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  seedDashboardData();
}

export { seedDashboardData };
