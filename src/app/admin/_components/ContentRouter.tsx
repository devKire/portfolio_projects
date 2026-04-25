// app/admin/_components/ContentRouter.tsx
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Globe, MessageSquare, Settings, Users } from 'lucide-react';
import ContentLoader from './ContentLoader';

// Lazy loading dos módulos pesados
const Dashboard = dynamic(() => import('../_tabs/Dashboard'), {
  loading: () => <ContentLoader />,
});

const Tasks = dynamic(() => import('../_tabs/Tasks'), {
  loading: () => <ContentLoader />,
});

const Projects = dynamic(() => import('../_tabs/Projects'), {
  loading: () => <ContentLoader />,
});

// Componente para tabs em desenvolvimento
function ComingSoon({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<any>;
  title: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="mb-4 rounded-full bg-gray-800/50 p-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-gray-400">Em breve...</p>
    </div>
  );
}

interface ContentRouterProps {
  activeTab: string;
}

export default function ContentRouter({ activeTab }: ContentRouterProps) {
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'tasks':
        return <Tasks />;
      case 'projects':
        return <Projects />;
      case 'social':
        return <ComingSoon icon={Users} title="Redes Sociais" />;
      case 'comments':
        return <ComingSoon icon={MessageSquare} title="Comentários" />;
      case 'analytics':
        return <ComingSoon icon={Globe} title="Analytics" />;
      case 'settings':
        return <ComingSoon icon={Settings} title="Configurações" />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="rounded-xl border border-gray-800/50 bg-gray-900/40 p-4 backdrop-blur-sm md:p-6">
      <Suspense fallback={<ContentLoader />}>
        {/* Breadcrumb */}
        <div className="mb-6 hidden items-center gap-2 text-sm lg:flex">
          <span className="text-gray-500">Admin</span>
          <span className="text-gray-600">/</span>
          <span className="font-medium text-white capitalize">{activeTab}</span>
        </div>

        {renderContent()}
      </Suspense>
    </div>
  );
}
