"use client";

import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Folder,
  Globe,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { checkAuth, logoutAdmin } from "@/app/actions/auth";

import Dashboard from "./components/Dashboard";
import LoginModal from "./components/LoginModal";
import Projects from "./components/Projects";

// Componente para loading
function LoadingSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const sidebarRef = useRef<HTMLDivElement>(null);

  // Verificar autenticação
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const authResult = await checkAuth();
        setIsAuthenticated(authResult.authenticated);
      } catch (error) {
        console.error("Auth check error:", error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  // Fechar menu mobile ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node) &&
        showMobileMenu
      ) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMobileMenu]);

  const handleLogout = async () => {
    try {
      await logoutAdmin();
      setIsAuthenticated(false);
      setActiveTab("dashboard");
      setShowMobileMenu(false);
    } catch (error) {
      console.error("Logout error:", error);
      setIsAuthenticated(false);
      router.push("/admin");
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  // Tabs de navegação
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "projects", label: "Projetos", icon: Folder },
    { id: "social", label: "Redes Sociais", icon: Users },
    { id: "comments", label: "Comentários", icon: MessageSquare },
    { id: "analytics", label: "Analytics", icon: Globe },
    { id: "settings", label: "Configurações", icon: Settings },
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  // Dados de exemplo para o dashboard
  const dashboardStats = {
    portfolioViews: 1247,
    linkedinFollowers: 543,
    githubFollowers: 289,
    socialMediaComments: 87,
    projectsCount: 12,
    lastUpdated: new Date().toLocaleDateString("pt-BR"),
    pageViewsByDay: [
      { date: "01/01", views: 150 },
      { date: "02/01", views: 200 },
      { date: "03/01", views: 180 },
      { date: "04/01", views: 220 },
      { date: "05/01", views: 250 },
      { date: "06/01", views: 230 },
      { date: "07/01", views: 210 },
    ],
    recentActivities: [
      {
        title: "Visualização da página: home",
        time: "2 horas atrás",
        type: "view" as const,
      },
      {
        title: "Visualização do projeto 'E-commerce'",
        time: "4 horas atrás",
        type: "view" as const,
      },
      {
        title: "Novo seguidor no GitHub",
        time: "1 dia atrás",
        type: "follower" as const,
      },
      {
        title: "Projeto atualizado: 'Dashboard Admin'",
        time: "2 dias atrás",
        type: "update" as const,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header Mobile */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-800 bg-gray-900/95 p-4 backdrop-blur-sm lg:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="rounded-lg p-2 hover:bg-gray-800"
            aria-label={showMobileMenu ? "Fechar menu" : "Abrir menu"}
          >
            {showMobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
          <h1 className="text-lg font-semibold">
            {tabs.find((tab) => tab.id === activeTab)?.label || "Admin"}
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
          aria-label="Sair"
        >
          <LogOut size={20} />
        </button>
      </header>

      <div className="flex">
        {/* Sidebar Desktop */}
        <aside
          className={`hidden border-r border-gray-800 bg-gray-900/95 backdrop-blur-sm transition-all duration-300 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col ${
            isSidebarCollapsed ? "lg:w-16" : "lg:w-64"
          }`}
        >
          {/* Header da Sidebar */}
          <div className="border-b border-gray-800 p-4">
            <div
              className={`flex items-center justify-between ${isSidebarCollapsed ? "justify-center" : ""}`}
            >
              {!isSidebarCollapsed && (
                <div>
                  <h1 className="mb-1 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-xl font-bold text-transparent">
                    Admin Dashboard
                  </h1>
                  <p className="truncate text-xs text-gray-400">
                    Gerencie seu portfólio
                  </p>
                </div>
              )}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="ml-2 rounded-lg p-2 hover:bg-gray-800"
                aria-label={
                  isSidebarCollapsed ? "Expandir menu" : "Recolher menu"
                }
              >
                {isSidebarCollapsed ? (
                  <ChevronRight size={18} />
                ) : (
                  <ChevronLeft size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Navegação */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-all ${
                      activeTab === tab.id
                        ? "border-l-2 border-blue-500 bg-gradient-to-r from-blue-500/15 to-purple-500/10 text-white"
                        : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                    } ${isSidebarCollapsed ? "justify-center px-2" : ""}`}
                    title={isSidebarCollapsed ? tab.label : ""}
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    {!isSidebarCollapsed && (
                      <span className="truncate">{tab.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Footer fixo com botão de logout */}
          <div className="border-t border-gray-800 p-4">
            <button
              onClick={handleLogout}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300 ${
                isSidebarCollapsed ? "justify-center px-2" : ""
              }`}
              title={isSidebarCollapsed ? "Sair" : ""}
            >
              <LogOut size={20} className="flex-shrink-0" />
              {!isSidebarCollapsed && <span>Sair</span>}
            </button>
          </div>
        </aside>

        {/* Sidebar Mobile */}
        {showMobileMenu && (
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden">
            <div
              ref={sidebarRef}
              className="fixed inset-y-0 left-0 flex w-72 flex-col bg-gray-900 shadow-xl"
            >
              {/* Header Mobile */}
              <div className="border-b border-gray-800 p-4">
                <h1 className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-xl font-bold text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-400">
                  Gerencie seu portfólio e redes sociais
                </p>
              </div>

              {/* Navegação Mobile */}
              <nav className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setShowMobileMenu(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all ${
                          activeTab === tab.id
                            ? "border-l-2 border-blue-500 bg-gradient-to-r from-blue-500/20 to-purple-500/15 text-white"
                            : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
                        }`}
                      >
                        <Icon size={20} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </nav>

              {/* Footer Mobile fixo com botão de logout */}
              <div className="border-t border-gray-800 p-4">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-red-500/20 to-red-600/10 px-4 py-3 text-red-400 transition-all hover:bg-red-500/20 hover:text-red-300"
                >
                  <LogOut size={20} />
                  <span>Sair da Conta</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo Principal */}
        <main
          className={`min-h-screen flex-1 p-4 transition-all duration-300 lg:p-6 ${
            isSidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
          }`}
        >
          <div className="mx-auto max-w-7xl">
            {/* Breadcrumb Desktop */}
            <div className="mb-6 hidden items-center gap-2 text-sm text-gray-400 lg:flex">
              <span className="text-gray-500">Admin</span>
              <span className="text-gray-600">/</span>
              <span className="font-medium text-white">
                {tabs.find((tab) => tab.id === activeTab)?.label}
              </span>
            </div>

            {/* Container Responsivo */}
            <div className="rounded-xl border border-gray-800/50 bg-gray-900/40 p-4 backdrop-blur-sm sm:rounded-2xl sm:p-6">
              {activeTab === "dashboard" && (
                <Dashboard stats={dashboardStats} />
              )}
              {activeTab === "projects" && <Projects />}
              {activeTab === "social" && (
                <div className="p-4 text-center sm:p-8">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gray-800/50 p-3 sm:h-20 sm:w-20 sm:p-4">
                    <Users className="h-full w-full text-gray-600" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold sm:text-xl">
                    Redes Sociais
                  </h3>
                  <p className="text-gray-400">Em breve...</p>
                </div>
              )}
              {activeTab === "comments" && (
                <div className="p-4 text-center sm:p-8">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gray-800/50 p-3 sm:h-20 sm:w-20 sm:p-4">
                    <MessageSquare className="h-full w-full text-gray-600" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold sm:text-xl">
                    Comentários
                  </h3>
                  <p className="text-gray-400">Em breve...</p>
                </div>
              )}
              {activeTab === "analytics" && (
                <div className="p-4 text-center sm:p-8">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gray-800/50 p-3 sm:h-20 sm:w-20 sm:p-4">
                    <Globe className="h-full w-full text-gray-600" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold sm:text-xl">
                    Analytics
                  </h3>
                  <p className="text-gray-400">Em breve...</p>
                </div>
              )}
              {activeTab === "settings" && (
                <div className="p-4 text-center sm:p-8">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gray-800/50 p-3 sm:h-20 sm:w-20 sm:p-4">
                    <Settings className="h-full w-full text-gray-600" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold sm:text-xl">
                    Configurações
                  </h3>
                  <p className="text-gray-400">Em breve...</p>
                </div>
              )}
            </div>

            {/* Footer Mobile (apenas para mobile) */}
            <footer className="mt-6 flex justify-center lg:hidden">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-red-400 transition-all hover:bg-red-500/20"
              >
                <LogOut size={16} />
                <span className="text-sm">Sair</span>
              </button>
            </footer>
          </div>
        </main>
      </div>

      {/* Estilos para scrollbar */}
      <style jsx global>{`
        /* Custom scrollbar para navegação */
        nav::-webkit-scrollbar {
          width: 4px;
        }

        nav::-webkit-scrollbar-track {
          background: transparent;
        }

        nav::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 2px;
        }

        nav::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }

        /* Melhorias para mobile */
        @media (max-width: 768px) {
          body {
            overflow-x: hidden;
          }
        }
      `}</style>
    </div>
  );
}
