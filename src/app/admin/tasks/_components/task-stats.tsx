// src/app/(admin)/tasks/_components/task-stats.tsx
'use client';

import { memo } from 'react';

interface StatCardProps {
  label: string;
  value: number;
  color: 'gray' | 'yellow' | 'blue' | 'green';
  icon: string;
}

const colorMap = {
  gray: 'text-white',
  yellow: 'text-yellow-400',
  blue: 'text-[#9a8cff]',
  green: 'text-green-400',
};

const StatCard = memo(function StatCard({
  label,
  value,
  color,
  icon,
}: StatCardProps) {
  return (
    <div className="group rounded-lg border border-[#2f2f35] bg-[#1a1a1a] p-4 transition-all hover:border-[#303036] hover:bg-[#1e1e1e]">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-[#777780]">{label}</span>
        <span className="text-sm">{icon}</span>
      </div>
      <div className={`text-2xl font-bold ${colorMap[color]} tabular-nums`}>
        {value}
      </div>
    </div>
  );
});

interface TaskStatsDisplayProps {
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  } | null;
}

export const TaskStatsDisplay = memo(function TaskStatsDisplay({
  stats,
}: TaskStatsDisplayProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total de Tarefas"
        value={stats.total}
        color="gray"
        icon="📊"
      />
      <StatCard
        label="Pendentes"
        value={stats.pending}
        color="yellow"
        icon="📋"
      />
      <StatCard
        label="Em Andamento"
        value={stats.inProgress}
        color="blue"
        icon="🔄"
      />
      <StatCard
        label="Concluídas"
        value={stats.completed}
        color="green"
        icon="✅"
      />
    </div>
  );
});
