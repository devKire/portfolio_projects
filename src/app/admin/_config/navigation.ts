// app/admin/_config/navigation.ts
import {
  BarChart3,
  BookOpen,
  Folder,
  Globe,
  Info,
  ListChecks,
  MessageSquare,
  Settings,
  Users,
  Building2,
  Library,
  BriefcaseBusiness,
} from 'lucide-react';

export const TAB_CONFIG = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'work', label: 'Trabalho', icon: BriefcaseBusiness },
  { id: 'daily-checklist', label: 'Checklist Diário', icon: ListChecks },
  { id: 'projects', label: 'Projetos', icon: Folder },
  { id: 'notes', label: 'Notas', icon: BookOpen },
  { id: 'organization', label: 'Organização', icon: Building2 },
  { id: 'kcs', label: 'KCS', icon: Library },
  { id: 'social', label: 'Redes Sociais', icon: Users },
  { id: 'comments', label: 'Comentários', icon: MessageSquare },
  { id: 'analytics', label: 'Analytics', icon: Globe },
  { id: 'documentation', label: 'Documentação', icon: Info },
  { id: 'settings', label: 'Configurações', icon: Settings },
] as const;

export type TabId = (typeof TAB_CONFIG)[number]['id'];
