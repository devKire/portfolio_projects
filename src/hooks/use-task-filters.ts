// src/hooks/use-task-filters.ts
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { TaskFilters } from '@/lib/task-service';

export function useTaskFilters(initialFilters: TaskFilters = {}) {
  const [filters, setFilters] = useState<TaskFilters>(initialFilters);
  // Debounce interno para busca
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Sincroniza busca com debounce
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(filters.search || '');
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [filters.search]);

  // Combina filtros, substituindo search pelo valor debounced
  const resolvedFilters = useMemo(
    () => ({
      ...filters,
      search: debouncedSearch || undefined,
    }),
    [filters, debouncedSearch]
  );

  const updateFilter = useCallback(
    (key: keyof TaskFilters, value: string | boolean | undefined) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback(
    () => setFilters(initialFilters),
    [initialFilters]
  );

  return { filters, resolvedFilters, setFilters, updateFilter, resetFilters };
}
