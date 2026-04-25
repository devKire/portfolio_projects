'use client';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    pending: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  };

  const labels = {
    pending: 'Pendente',
    'in-progress': 'Em Andamento',
    completed: 'Concluído',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${variants[status as keyof typeof variants] || variants.pending}`}
    >
      {labels[status as keyof typeof labels] || status}
    </span>
  );
}
