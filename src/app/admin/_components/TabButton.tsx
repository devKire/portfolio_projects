// app/admin/_components/TabButton.tsx
'use client';

import { LucideIcon } from 'lucide-react';

interface TabButtonProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

export default function TabButton({
  icon: Icon,
  label,
  isActive,
  isCollapsed,
  onClick,
}: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200 ${
        isActive
          ? 'bg-gradient-to-r from-blue-500/15 to-purple-500/20 text-white'
          : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
      } ${isCollapsed ? 'justify-center px-2' : ''} `}
    >
      <Icon size={20} className="flex-shrink-0" />
      {!isCollapsed && (
        <span className="truncate text-sm font-medium">{label}</span>
      )}
      {isActive && !isCollapsed && (
        <div className="ml-auto h-2 w-2 rounded-full bg-blue-500" />
      )}
    </button>
  );
}
