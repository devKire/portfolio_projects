'use server';

import { endOfDay, format, startOfDay, subDays } from 'date-fns';

import { requireUser } from '@/lib/auth/session';
import { requireOwnedLandingPage } from '@/lib/auth/tenant';
import { db } from '@/lib/prisma';

export interface DashboardStats {
  portfolioViews: number;
  linkedinFollowers: number;
  githubFollowers: number;
  socialMediaComments: number;
  projectsCount: number;
  lastUpdated: string;
  pageViewsByDay: { date: string; views: number }[];
  recentActivities: {
    title: string;
    time: string;
    type: 'view' | 'comment' | 'follower' | 'update';
  }[];
}

type ActivityType = DashboardStats['recentActivities'][number]['type'];

function createActivity(activity: {
  title: string;
  time: string;
  type: ActivityType;
}) {
  return activity;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const user = await requireUser();
    const landingpage = await requireOwnedLandingPage(user.id);
    const landingpageId = landingpage.id;
    // 1. Contar visualizações do portfólio (últimos 30 dias)
    const thirtyDaysAgo = subDays(new Date(), 30);

    const portfolioViews = await db.pageView.count({
      where: {
        landingpageId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // 2. Contar projetos ativos
    const projectsCount = await db.project.count({
      where: {
        userId: user.id,
        landingpageId,
        status: {
          in: ['completed', 'in-progress'],
        },
      },
    });

    // 3. Buscar interações sociais do banco
    const linkedinFollowers = await db.socialInteraction.aggregate({
      where: {
        landingpageId,
        platform: 'linkedin',
        type: 'follow',
      },
      _sum: {
        count: true,
      },
    });

    const githubFollowers = await db.socialInteraction.aggregate({
      where: {
        landingpageId,
        platform: 'github',
        type: 'follow',
      },
      _sum: {
        count: true,
      },
    });

    const socialMediaComments = await db.socialInteraction.aggregate({
      where: {
        landingpageId,
        type: 'comment',
      },
      _sum: {
        count: true,
      },
    });

    // 4. Buscar visualizações por dia (últimos 7 dias)
    const sevenDaysAgo = subDays(new Date(), 7);

    // Gerar array dos últimos 7 dias
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i); // Do mais antigo para o mais recente
      return {
        start: startOfDay(date),
        end: endOfDay(date),
        formattedDate: format(date, 'dd/MM'),
      };
    });

    // Buscar views agrupadas por dia
    const pageViewsData = await db.pageView.groupBy({
      by: ['createdAt'],
      where: {
        landingpageId,
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
      _count: {
        id: true,
      },
    });

    // Mapear dados para o formato correto
    const pageViewsByDay = last7Days.map((day) => {
      const viewsForDay = pageViewsData.filter((view) => {
        const viewDate = new Date(view.createdAt);
        return viewDate >= day.start && viewDate <= day.end;
      });

      const totalViews = viewsForDay.reduce(
        (sum, view) => sum + view._count.id,
        0
      );

      return {
        date: day.formattedDate,
        views: totalViews,
      };
    });

    // 5. Buscar atividades recentes
    const recentPageViews = await db.pageView.findMany({
      where: {
        landingpageId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    // 6. Buscar atualizações recentes de projetos
    const recentProjectUpdates = await db.project.findMany({
      where: {
        userId: user.id,
        landingpageId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: 5,
    });

    // 7. Buscar interações sociais recentes
    const recentSocialInteractions = await db.socialInteraction.findMany({
      where: {
        landingpageId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    // Combinar atividades
    const recentActivities = [
      ...recentPageViews.map((view) =>
        createActivity({
          title: `Visualização da página: ${view.page || 'Home'}`,
          time: formatTimeAgo(view.createdAt),
          type: 'view',
        })
      ),
      ...recentProjectUpdates.map((project) =>
        createActivity({
          title: `Projeto atualizado: ${project.title}`,
          time: formatTimeAgo(project.updatedAt),
          type: 'update',
        })
      ),
      ...recentSocialInteractions.map((interaction) =>
        createActivity({
          title: `Nova interação no ${interaction.platform}: ${interaction.type}`,
          time: formatTimeAgo(interaction.createdAt),
          type: interaction.type === 'comment' ? 'comment' : 'follower',
        })
      ),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10);

    return {
      portfolioViews,
      linkedinFollowers: linkedinFollowers._sum.count || 0,
      githubFollowers: githubFollowers._sum.count || 0,
      socialMediaComments: socialMediaComments._sum.count || 0,
      projectsCount,
      lastUpdated: format(new Date(), 'dd/MM/yyyy HH:mm'),
      pageViewsByDay,
      recentActivities,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);

    // Retornar dados simulados em caso de erro
    return {
      portfolioViews: 0,
      linkedinFollowers: 0,
      githubFollowers: 0,
      socialMediaComments: 0,
      projectsCount: 0,
      lastUpdated: format(new Date(), 'dd/MM/yyyy HH:mm'),
      pageViewsByDay: [],
      recentActivities: [],
    };
  }
}

// Função auxiliar para formatar tempo relativo
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'agora';
  } else if (diffMins < 60) {
    return `${diffMins} min${diffMins !== 1 ? 's' : ''} atrás`;
  } else if (diffHours < 24) {
    return `${diffHours} hora${diffHours !== 1 ? 's' : ''} atrás`;
  } else {
    return `${diffDays} dia${diffDays !== 1 ? 's' : ''} atrás`;
  }
}

// Função para registrar visualização de página
export async function trackPageView(
  page: string,
  path: string,
  ip?: string,
  userAgent?: string
) {
  try {
    const slug = path.split(/[?#]/)[0].split('/').filter(Boolean)[0];
    if (!slug) return;

    const landingpage = await db.landingPage.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!landingpage) return;

    await db.pageView.create({
      data: {
        page,
        path,
        ip,
        userAgent,
        landingpageId: landingpage.id,
      },
    });
  } catch (error) {
    console.error('Error tracking page view:', error);
  }
}

// Função para registrar interação social
export async function trackSocialInteraction(
  platform: string,
  type: string,
  content?: string,
  count: number = 1,
  slug?: string
) {
  try {
    if (!slug) return;
    const landingpage = await db.landingPage.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!landingpage) return;

    await db.socialInteraction.create({
      data: {
        platform,
        type,
        content,
        count,
        landingpageId: landingpage.id,
      },
    });
  } catch (error) {
    console.error('Error tracking social interaction:', error);
  }
}

// Função para obter estatísticas detalhadas
export async function getDetailedStats(timeRange: '7d' | '30d' | '90d') {
  try {
    const user = await requireUser();
    const landingpage = await requireOwnedLandingPage(user.id);
    const landingpageId = landingpage.id;
    let daysAgo: number;
    switch (timeRange) {
      case '7d':
        daysAgo = 7;
        break;
      case '30d':
        daysAgo = 30;
        break;
      case '90d':
        daysAgo = 90;
        break;
    }

    const startDate = subDays(new Date(), daysAgo);

    // Total de visualizações
    const totalViews = await db.pageView.count({
      where: {
        landingpageId,
        createdAt: {
          gte: startDate,
        },
      },
    });

    // Visualizações por página
    const viewsByPage = await db.pageView.groupBy({
      by: ['page'],
      where: {
        landingpageId,
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    // Top páginas
    const topPages = viewsByPage.slice(0, 5).map((item) => ({
      page: item.page || 'Home',
      views: item._count.id,
    }));

    // Interações sociais por plataforma
    const socialByPlatform = await db.socialInteraction.groupBy({
      by: ['platform', 'type'],
      where: {
        landingpageId,
        createdAt: {
          gte: startDate,
        },
      },
      _sum: {
        count: true,
      },
    });

    return {
      totalViews,
      topPages,
      socialByPlatform: socialByPlatform.map((item) => ({
        platform: item.platform,
        type: item.type,
        count: item._sum.count || 0,
      })),
    };
  } catch (error) {
    console.error('Error fetching detailed stats:', error);
    return {
      totalViews: 0,
      topPages: [],
      socialByPlatform: [],
    };
  }
}
