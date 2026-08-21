import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Folder,
  Library,
  ListChecks,
  MessagesSquare,
  Settings,
} from 'lucide-react';

export const TAB_CONFIG = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'work', label: 'Trabalho', icon: BriefcaseBusiness },
  { id: 'projects', label: 'Projetos', icon: Folder },
  { id: 'calendar', label: 'Calendário', icon: CalendarDays },
  { id: 'chat', label: 'Chat', icon: MessagesSquare },
  { id: 'notes', label: 'Notas', icon: BookOpen },
  { id: 'kcs', label: 'KCS', icon: Library },
  { id: 'organization', label: 'Organização', icon: Building2 },
  { id: 'daily-checklist', label: 'Checklist', icon: ListChecks },
  { id: 'settings', label: 'Configurações', icon: Settings },
] as const;

export type TabId = (typeof TAB_CONFIG)[number]['id'];
