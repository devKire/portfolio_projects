// src/app/(admin)/tasks/_components/task-header.tsx
'use client';

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { TaskStatsDisplay } from './task-stats';

interface TaskHeaderProps {
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  } | null;
  onNewTask: () => void;
  onNewBulkTasks: () => void;
}

export const TaskHeader = memo(function TaskHeader({
  stats,
  onNewTask,
  onNewBulkTasks,
}: TaskHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Task Manager
          </h1>
          <p className="mt-1 text-sm text-[#9b9ba3]">
            Gerencie suas tarefas com eficiência e clareza
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={onNewTask}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#6f55d9] px-4 text-sm font-medium text-white transition-colors hover:bg-[#7c66df]"
          >
            <span className="text-base">+</span>
            <span>Nova Tarefa</span>
          </Button>
          <Button
            onClick={onNewBulkTasks}
            variant="secondary"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[#303036] bg-[#202024] px-3 text-sm font-medium text-[#c9c9d1] transition-colors hover:border-[#6f55d9]/40 hover:bg-[#24242a] hover:text-white"
          >
            <span className="text-base">+</span>
            <span>Multiplas Tarefas</span>
          </Button>
        </div>
      </div>

      <TaskStatsDisplay stats={stats} />
    </div>
  );
});
