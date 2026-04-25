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
}

export const TaskHeader = memo(function TaskHeader({
  stats,
  onNewTask,
}: TaskHeaderProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Task Manager
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Gerencie suas tarefas com eficiência e clareza
          </p>
        </div>

        <Button
          onClick={onNewTask}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
        >
          <span className="text-lg">+</span>
          <span>Nova Tarefa</span>
        </Button>
      </div>

      <TaskStatsDisplay stats={stats} />
    </div>
  );
});
