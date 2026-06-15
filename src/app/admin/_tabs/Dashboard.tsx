/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import {
  BarChart3,
  Calendar,
  ExternalLink,
  Eye,
  Folder,
  Github,
  Globe,
  Instagram,
  Linkedin,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  Twitter,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  DashboardStats as DashboardStatsType,
  getDashboardStats,
  getDetailedStats,
} from '@/app/actions/dashboard';

// Interface estendida para incluir pageViewsByDay e recentActivities
type EnhancedDashboardStats = DashboardStatsType & {
  pageViewsByDay?: { date: string; views: number }[];
  recentActivities?: {
    title: string;
    time: string;
    type: 'view' | 'comment' | 'follower' | 'update';
  }[];
};

interface DashboardProps {
  stats?: EnhancedDashboardStats;
}

export default function Dashboard({ stats: initialStats }: DashboardProps) {
  const [stats, setStats] = useState<EnhancedDashboardStats | null>(
    initialStats || null
  );
  const [loading, setLoading] = useState(!initialStats);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [detailedStats, setDetailedStats] = useState<any>(null);

  useEffect(() => {
    if (!initialStats || !initialStats.portfolioViews) {
      loadStats();
    }
  }, [initialStats]);

  useEffect(() => {
    loadDetailedStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadDetailedStats = async () => {
    try {
      const data = await getDetailedStats(timeRange);
      setDetailedStats(data);
    } catch (error) {
      console.error('Error loading detailed stats:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    await loadDetailedStats();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#6f55d9] border-t-transparent"></div>
          <p className="text-[#9b9ba3]">Carregando dados do dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-lg border border-[#2f2f35] bg-[#1e1e22] p-4 text-center">
        <p className="text-[#9b9ba3]">
          Não foi possível carregar os dados do dashboard.
        </p>
        <button
          onClick={loadStats}
          className="mt-4 rounded-lg bg-[#6f55d9] px-4 py-2 text-white hover:bg-[#7c66df]"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  // Usar dados padrão se não existirem
  const pageViewsByDay = stats.pageViewsByDay || [];
  const recentActivities = stats.recentActivities || [];

  const statCards = [
    {
      title: 'Visualizações do Portfólio',
      value: stats.portfolioViews.toLocaleString('pt-BR'),
      change: calculateChange(stats.portfolioViews, 1000),
      icon: Eye,
      color: 'from-[#6f55d9] to-[#7c66df]',
      description: `Últimos 30 dias`,
    },
    {
      title: 'Seguidores LinkedIn',
      value: stats.linkedinFollowers.toLocaleString('pt-BR'),
      change: calculateChange(stats.linkedinFollowers, 500),
      icon: Linkedin,
      color: 'from-[#9a8cff] to-[#6f55d9]',
      description: 'Perfil profissional',
      link: '#',
    },
    {
      title: 'Seguidores GitHub',
      value: stats.githubFollowers.toLocaleString('pt-BR'),
      change: calculateChange(stats.githubFollowers, 250),
      icon: Github,
      color: 'from-gray-500 to-gray-600',
      description: 'Repositórios públicos',
      link: '#',
    },
    {
      title: 'Comentários Redes Sociais',
      value: stats.socialMediaComments.toLocaleString('pt-BR'),
      change: calculateChange(stats.socialMediaComments, 50),
      icon: MessageSquare,
      color: 'from-[#9a8cff] to-[#7c66df]',
      description: 'Interações sociais',
    },
    {
      title: 'Projetos Ativos',
      value: stats.projectsCount.toString(),
      change: '+2',
      icon: Folder,
      color: 'from-green-500 to-green-600',
      description: 'No portfólio',
    },
  ];

  return (
    <div>
      {/* Header com controles */}
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-semibold text-white">Dashboard</h2>
          <p className="text-[#9b9ba3]">
            Visão geral das suas redes e portfólio
            <span className="ml-2 text-sm text-[#777780]">
              • Atualizado: {stats.lastUpdated}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-[#303036] bg-[#202024] p-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`rounded-md px-3 py-1 text-sm transition-colors ${
                  timeRange === range
                    ? 'bg-[#6f55d9] text-white'
                    : 'text-[#9b9ba3] hover:text-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-[#303036] bg-[#202024] px-3 py-2 text-sm text-[#9b9ba3] transition-colors hover:bg-[#24242a] hover:text-white disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {/* Stats Grid Responsivo */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div
              key={index}
              className="rounded-lg border border-[#2f2f35] bg-[#202024] p-3 transition-all hover:border-[#303036] sm:p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs text-[#9b9ba3] sm:text-sm">
                    {card.title}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-white sm:text-xl">
                    {card.value}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1 text-xs sm:text-sm">
                    <TrendingUp className="h-3 w-3 text-green-400 sm:h-4 sm:w-4" />
                    <span className="text-green-400">{card.change}</span>
                    <span className="truncate text-[#777780]">
                      {card.description}
                    </span>
                  </div>
                </div>
                <div
                  className={`ml-2 rounded-lg bg-gradient-to-br ${card.color} p-2 sm:p-3`}
                >
                  <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                </div>
              </div>

              {card.link && (
                <a
                  href={card.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-1 text-xs text-[#9a8cff] hover:text-[#c9b8ff]"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ver perfil
                </a>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Gráfico de Visualizações */}
        <div className="rounded-lg border border-[#2f2f35] bg-[#202024] p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-white">
              Visualizações do Portfólio
            </h3>
            <span className="text-sm text-[#9b9ba3]">Últimos 7 dias</span>
          </div>

          {pageViewsByDay.length > 0 ? (
            <div className="h-48">
              <div className="flex h-full items-end justify-between gap-1">
                {pageViewsByDay.map((day, index) => {
                  const maxViews = Math.max(
                    ...pageViewsByDay.map((d) => d.views)
                  );
                  const height =
                    maxViews > 0 ? (day.views / maxViews) * 100 : 0;

                  return (
                    <div
                      key={index}
                      className="flex flex-1 flex-col items-center"
                    >
                      <div className="w-full max-w-12">
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-[#6f55d9] to-[#7c66df] transition-all hover:from-[#9a8cff] hover:to-[#6f55d9]"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-[#9b9ba3]">
                        {day.date}
                      </div>
                      <div className="text-xs font-medium text-white">
                        {day.views}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center">
              <div className="text-center">
                <Eye className="mx-auto mb-2 h-8 w-8 text-[#777780]" />
                <p className="text-[#9b9ba3]">
                  Sem dados de visualização ainda
                </p>
                <p className="text-sm text-[#777780]">
                  As visualizações serão registradas automaticamente quando
                  visitarem seu site
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-center">
            <Link
              href="/admin"
              className="text-sm text-[#9a8cff] hover:text-[#c9b8ff]"
              onClick={(e) => {
                e.preventDefault();
                // Aqui você precisaria de uma forma de mudar a aba para 'projects'
                // Como não temos acesso ao contexto, vamos redirecionar?
                window.location.href = '/admin#projects';
              }}
            >
              Ver todos os projetos →
            </Link>
          </div>
        </div>

        {/* Últimas Atividades */}
        <div className="rounded-lg border border-[#2f2f35] bg-[#202024] p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-white">Atividades Recentes</h3>
            <div className="flex items-center gap-2 text-sm text-[#9b9ba3]">
              <Calendar className="h-4 w-4" />
              <span>Últimas 24h</span>
            </div>
          </div>

          <div className="max-h-64 space-y-4 overflow-y-auto pr-2">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between border-b border-[#2f2f35] pb-4 last:border-0"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 rounded-full p-2 ${
                        activity.type === 'comment'
                          ? 'bg-[#6f55d9]/20'
                          : activity.type === 'view'
                            ? 'bg-[#9a8cff]/20'
                            : activity.type === 'follower'
                              ? 'bg-green-500/20'
                              : 'bg-yellow-500/20'
                      }`}
                    >
                      {activity.type === 'comment' && (
                        <MessageSquare className="h-4 w-4 text-[#9a8cff]" />
                      )}
                      {activity.type === 'view' && (
                        <Eye className="h-4 w-4 text-[#c9b8ff]" />
                      )}
                      {activity.type === 'follower' && (
                        <Users className="h-4 w-4 text-green-400" />
                      )}
                      {activity.type === 'update' && (
                        <Folder className="h-4 w-4 text-yellow-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="line-clamp-2 font-medium text-white">
                        {activity.title}
                      </p>
                      <p className="text-sm text-[#9b9ba3]">{activity.time}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center">
                <p className="text-[#9b9ba3]">Nenhuma atividade recente</p>
                <p className="mt-1 text-sm text-[#777780]">
                  As atividades aparecerão aqui automaticamente
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Estatísticas Detalhadas */}
      {detailedStats && (
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Páginas Mais Visitadas */}
          <div className="rounded-lg border border-[#2f2f35] bg-[#202024] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-white">
                Páginas Mais Visitadas
              </h3>
              <span className="text-sm text-[#9b9ba3]">{timeRange}</span>
            </div>

            <div className="space-y-3">
              {detailedStats.topPages && detailedStats.topPages.length > 0 ? (
                detailedStats.topPages.map((page: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#24242a]">
                        <span className="text-xs font-medium text-[#dcddde]">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{page.page}</p>
                        <p className="text-xs text-[#9b9ba3]">
                          {page.views} visualizações
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-[#9b9ba3]">
                      {((page.views / detailedStats.totalViews) * 100).toFixed(
                        1
                      )}
                      %
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center">
                  <Globe className="mx-auto mb-2 h-8 w-8 text-[#777780]" />
                  <p className="text-[#9b9ba3]">Sem dados de páginas</p>
                </div>
              )}
            </div>
          </div>

          {/* Interações Sociais */}
          <div className="rounded-lg border border-[#2f2f35] bg-[#202024] p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-white">Interações Sociais</h3>
              <span className="text-sm text-[#9b9ba3]">{timeRange}</span>
            </div>

            <div className="space-y-3">
              {detailedStats.socialByPlatform &&
              detailedStats.socialByPlatform.length > 0 ? (
                detailedStats.socialByPlatform.map(
                  (interaction: any, index: number) => {
                    const Icon = getSocialIcon(interaction.platform);
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-[#24242a] p-2">
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-white capitalize">
                              {interaction.platform} - {interaction.type}
                            </p>
                            <p className="text-xs text-[#9b9ba3]">
                              {interaction.count} interações
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )
              ) : (
                <div className="py-8 text-center">
                  <BarChart3 className="mx-auto mb-2 h-8 w-8 text-[#777780]" />
                  <p className="text-[#9b9ba3]">
                    Sem interações sociais registradas
                  </p>
                  <p className="mt-1 text-sm text-[#777780]">
                    Use a API para registrar interações
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Função auxiliar para calcular mudança percentual
function calculateChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+100%' : '0%';

  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? '+' : ''}${Math.round(change)}%`;
}

// Função para obter ícone de rede social
function getSocialIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case 'github':
      return Github;
    case 'linkedin':
      return Linkedin;
    case 'twitter':
      return Twitter;
    case 'instagram':
      return Instagram;
    default:
      return Globe;
  }
}
