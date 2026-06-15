'use client';

import { useMemo } from 'react';

type GraphNote = {
  id: string;
  title: string;
  slug: string;
  isFavorite: boolean;
  outgoing?: {
    id: string;
    targetSlug: string;
    targetNote: { id: string; title: string; slug: string } | null;
  }[];
};

export function GraphFlow({
  notes,
  onOpenNote,
}: {
  notes: GraphNote[];
  onOpenNote: (note: GraphNote) => void;
}) {
  const graph = useMemo(() => {
    const nodes = notes.map((note, index) => ({
      note,
      x:
        420 + Math.cos((index / Math.max(notes.length, 1)) * Math.PI * 2) * 300,
      y:
        270 + Math.sin((index / Math.max(notes.length, 1)) * Math.PI * 2) * 210,
    }));
    const bySlug = new Map(notes.map((note) => [note.slug, note]));
    const byId = new Map(nodes.map((node) => [node.note.id, node]));
    const byNodeSlug = new Map(nodes.map((node) => [node.note.slug, node]));
    const edges = notes.flatMap((note) =>
      (note.outgoing || [])
        .map((link) => {
          const target = link.targetNote || bySlug.get(link.targetSlug);
          const sourceNode = byId.get(note.id);
          const targetNode =
            target && (byId.get(target.id) || byNodeSlug.get(target.slug));
          return sourceNode && targetNode
            ? { id: link.id, source: sourceNode, target: targetNode }
            : null;
        })
        .filter(
          (
            edge
          ): edge is {
            id: string;
            source: (typeof nodes)[number];
            target: (typeof nodes)[number];
          } => Boolean(edge)
        )
    );
    return { nodes, edges };
  }, [notes]);

  return (
    <svg
      viewBox="0 0 840 540"
      role="img"
      aria-label="Graph view de notas"
      className="h-full w-full bg-[#161619]"
    >
      <defs>
        <radialGradient id="obsidianNode" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8b73ff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#3f326f" stopOpacity="0.9" />
        </radialGradient>
      </defs>
      {graph.edges.map((edge) => (
        <line
          key={edge.id}
          x1={edge.source.x}
          y1={edge.source.y}
          x2={edge.target.x}
          y2={edge.target.y}
          stroke="#514a76"
          strokeWidth="1.4"
        />
      ))}
      {graph.nodes.map((node) => (
        <g
          key={node.note.id}
          role="button"
          tabIndex={0}
          className="cursor-pointer outline-none"
          onClick={() => onOpenNote(node.note)}
        >
          <circle
            cx={node.x}
            cy={node.y}
            r={node.note.isFavorite ? 17 : 13}
            fill={node.note.isFavorite ? '#d6a94a' : 'url(#obsidianNode)'}
            stroke="#c9b8ff"
            strokeWidth="1"
          />
          <text
            x={node.x}
            y={node.y + 31}
            textAnchor="middle"
            className="fill-[#dcddde] text-[12px]"
          >
            {node.note.title.slice(0, 28)}
          </text>
        </g>
      ))}
    </svg>
  );
}
