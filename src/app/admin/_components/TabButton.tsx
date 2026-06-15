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
      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
        isActive
          ? 'bg-[#2d2940] text-[#c9b8ff]'
          : 'text-[#9b9ba3] hover:bg-[#24242a] hover:text-white'
      } ${isCollapsed ? 'justify-center px-2' : ''} `}
    >
      <Icon size={20} className="flex-shrink-0" />
      {!isCollapsed && (
        <span className="truncate text-sm font-medium">{label}</span>
      )}
      {isActive && !isCollapsed && (
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[#9a8cff]" />
      )}
    </button>
  );
}
