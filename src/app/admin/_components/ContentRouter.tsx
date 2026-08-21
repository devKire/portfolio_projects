// app/admin/_components/ContentRouter.tsx
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import {
  Globe,
  MessageSquare,
  Users,
  BrainCircuit,
  type LucideIcon,
} from 'lucide-react';
import ContentLoader from './ContentLoader';
import type { OrganizationContext } from '@/lib/organizations/context';

// Lazy loading dos módulos pesados
const Dashboard = dynamic(() => import('../_tabs/Dashboard'), {
  loading: () => <ContentLoader />,
});

const WorkManager = dynamic(() => import('../_tabs/WorkManager'), {
  loading: () => <ContentLoader />,
});

const DailyChecklist = dynamic(() => import('../_tabs/DailyChecklist'), {
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

const Documentation = dynamic(() => import('../_tabs/Documentation'), {
  loading: () => <ContentLoader />,
});

const Organization = dynamic(() => import('../_tabs/Organization'), {
  loading: () => <ContentLoader />,
});

const Kcs = dynamic(() => import('../_tabs/Kcs'), {
  loading: () => <ContentLoader />,
});

// Componente para tabs em desenvolvimento
function ComingSoon({
  icon: Icon,
  title,
}: {
  icon: LucideIcon;
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
  userId: string;
  organizationContext: OrganizationContext;
  onOrganizationContextChange: () => Promise<void>;
}

export default function ContentRouter({
  activeTab,
  userId,
  organizationContext,
  onOrganizationContextChange,
}: ContentRouterProps) {
  const activeOrganization = organizationContext.organizations.find(
    (item) => item.id === organizationContext.activeOrganizationId
  );
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'work':
      case 'tasks':
      case 'tickets':
        return (
          <WorkManager
            userId={userId}
            organization={activeOrganization || null}
          />
        );
      case 'daily-checklist':
        return <DailyChecklist />;
      case 'projects':
        return <Projects />;
      case 'notes':
        return <Notes />;
      case 'organization':
        return (
          <Organization
            userId={userId}
            organizationContext={organizationContext}
            onOrganizationContextChange={onOrganizationContextChange}
          />
        );
      case 'kcs':
        return (
          <Kcs userId={userId} organization={activeOrganization || null} />
        );
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
      case 'documentation':
        return <Documentation />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      {/* Breadcrumb */}
      <div className="mb-3 hidden shrink-0 items-center gap-2 text-xs lg:flex">
        <span className="text-[#777780]">Admin</span>
        <span className="text-[#55555d]">/</span>
        <span className="font-medium text-white capitalize">{activeTab}</span>
      </div>

      <Suspense fallback={<ContentLoader />}>
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col ${
            activeTab === 'notes' || activeTab === 'kcs'
              ? 'overflow-hidden'
              : 'overflow-x-hidden overflow-y-auto'
          }`}
        >
          {renderContent()}
        </div>
      </Suspense>
    </div>
  );
}
