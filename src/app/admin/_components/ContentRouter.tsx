// app/admin/_components/ContentRouter.tsx
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { Globe, MessageSquare, Users, BrainCircuit } from 'lucide-react';
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

const Notes = dynamic(() => import('../_tabs/Notes'), {
  loading: () => <ContentLoader />,
});

const SettingsTab = dynamic(() => import('../_tabs/Settings'), {
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
      <div className="mb-4 rounded-md border border-[#303036] bg-[#202024] p-4">
        <Icon className="h-8 w-8 text-[#9a8cff]" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm text-[#9b9ba3]">Em breve...</p>
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
      case 'notes':
        return <Notes />;
      case 'ia':
        return (
          <ComingSoon icon={BrainCircuit} title="Inteligência Artificial" />
        );
      case 'social':
        return <ComingSoon icon={Users} title="Redes Sociais" />;
      case 'comments':
        return <ComingSoon icon={MessageSquare} title="Comentários" />;
      case 'analytics':
        return <ComingSoon icon={Globe} title="Analytics" />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* Breadcrumb */}
      <div className="mb-3 hidden shrink-0 items-center gap-2 text-xs lg:flex">
        <span className="text-[#777780]">Admin</span>
        <span className="text-[#55555d]">/</span>
        <span className="font-medium text-white capitalize">{activeTab}</span>
      </div>

      <Suspense fallback={<ContentLoader />}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {renderContent()}
        </div>
      </Suspense>
    </div>
  );
}
