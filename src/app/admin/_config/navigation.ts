// app/admin/_config/navigation.ts
import {
  BarChart3,
  BookOpen,
  Folder,
  Globe,
  ListChecks,
  MessageSquare,
  Pen,
  Settings,
  Users,
} from 'lucide-react';

export const TAB_CONFIG = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'tasks', label: 'Tasks', icon: Pen },
  { id: 'daily-checklist', label: 'Checklist Diário', icon: ListChecks },
  { id: 'projects', label: 'Projetos', icon: Folder },
  { id: 'notes', label: 'Notas', icon: BookOpen },
  { id: 'social', label: 'Redes Sociais', icon: Users },
  { id: 'comments', label: 'Comentários', icon: MessageSquare },
  { id: 'analytics', label: 'Analytics', icon: Globe },
  { id: 'settings', label: 'Configurações', icon: Settings },
] as const;

export type TabId = (typeof TAB_CONFIG)[number]['id'];
