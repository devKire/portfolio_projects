'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

interface EditableListProps {
  label: string;
  values: string[];
  placeholder?: string;
  onChange: (values: string[]) => void;
}

export function EditableList({
  label,
  values,
  placeholder = 'Novo item',
  onChange,
}: EditableListProps) {
  const updateItem = (index: number, value: string) => {
    onChange(
      values.map((item, itemIndex) => (itemIndex === index ? value : item))
    );
  };

  const addItem = () => {
    onChange([...values, '']);
  };

  const removeItem = (index: number) => {
    onChange(values.filter((_, itemIndex) => itemIndex !== index));
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= values.length) return;

    const next = [...values];
    const current = next[index];
    next[index] = next[nextIndex];
    next[nextIndex] = current;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-200">{label}</label>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 text-xs text-cyan-100 transition-colors hover:bg-cyan-400/15"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </div>

      <div className="space-y-2">
        {values.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-700 bg-black/20 px-3 py-4 text-sm text-gray-500">
            Nenhum item cadastrado.
          </div>
        ) : null}

        {values.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={value}
              placeholder={placeholder}
              onChange={(event) => updateItem(index, event.target.value)}
              className="min-h-10 flex-1 rounded-lg border border-gray-700 bg-gray-950/60 px-3 text-sm text-white transition-colors outline-none placeholder:text-gray-600 focus:border-cyan-400/50"
            />
            <button
              type="button"
              onClick={() => moveItem(index, -1)}
              disabled={index === 0}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 text-gray-300 transition-colors hover:border-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Mover para cima"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => moveItem(index, 1)}
              disabled={index === values.length - 1}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-700 bg-gray-900 text-gray-300 transition-colors hover:border-gray-600 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Mover para baixo"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 transition-colors hover:bg-red-500/15"
              aria-label="Remover item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
