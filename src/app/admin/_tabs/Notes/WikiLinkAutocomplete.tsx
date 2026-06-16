'use client';

import { useEffect, useRef } from 'react';
import { FileText, Hash, Link2 } from 'lucide-react';

export type WikiLinkSuggestion = {
  id: string;
  label: string;
  value: string;
  type: 'note' | 'heading' | 'block' | 'unresolved';
  detail?: string | null;
  unresolved?: boolean;
};

export type AutocompleteMode = 'search' | 'alias' | 'heading' | 'block';

export type WikilinkParseResult = {
  isInside: boolean;
  startPos: number;
  endPos: number;
  query: string;
  target: string;
  alias?: string;
  mode: AutocompleteMode;
} | null;

export function parseWikilinkAtCursor(
  content: string,
  cursorPos: number
): WikilinkParseResult {
  if (!content || cursorPos <= 0) return null;
  const textBefore = content.slice(0, cursorPos);
  const lastOpen = textBefore.lastIndexOf('[[');
  const lastClose = textBefore.lastIndexOf(']]');

  if (lastOpen === -1 || lastClose > lastOpen) return null;

  const insideText = textBefore.slice(lastOpen + 2);
  const lineEnd = content.indexOf('\n', cursorPos);
  const nextLineEnd = lineEnd === -1 ? content.length : lineEnd;
  const nextClose = content.indexOf(']]', cursorPos);
  const nextOpen = content.indexOf('[[', cursorPos);
  const endPos =
    nextClose !== -1 &&
    nextClose <= nextLineEnd &&
    (nextOpen === -1 || nextClose < nextOpen)
      ? nextClose + 2
      : cursorPos;
  const pipeIndex = insideText.indexOf('|');

  if (pipeIndex !== -1) {
    const targetPart = insideText.slice(0, pipeIndex);
    const aliasPart = insideText.slice(pipeIndex + 1);
    if (!targetPart.trim()) {
      return {
        isInside: true,
        startPos: lastOpen,
        endPos,
        query: '',
        target: '',
        alias: aliasPart,
        mode: 'search',
      };
    }

    return {
      isInside: true,
      startPos: lastOpen,
      endPos,
      query: aliasPart,
      target: targetPart,
      alias: aliasPart,
      mode: 'alias',
    };
  }

  const hashIndex = insideText.indexOf('#');

  if (hashIndex !== -1) {
    const target = insideText.slice(0, hashIndex);
    const headingPart = insideText.slice(hashIndex + 1);
    if (headingPart.startsWith('^')) {
      return {
        isInside: true,
        startPos: lastOpen,
        endPos,
        query: headingPart.slice(1),
        target,
        mode: 'block',
      };
    }

    return {
      isInside: true,
      startPos: lastOpen,
      endPos,
      query: headingPart,
      target,
      mode: 'heading',
    };
  }

  return {
    isInside: true,
    startPos: lastOpen,
    endPos,
    query: insideText,
    target: insideText,
    mode: 'search',
  };
}

export function estimateCursorPosition(textarea: HTMLTextAreaElement): {
  top: number;
  left: number;
} {
  const div = document.createElement('div');
  const style = getComputedStyle(textarea);
  const cssProps = [
    'fontFamily',
    'fontSize',
    'fontWeight',
    'letterSpacing',
    'lineHeight',
    'paddingTop',
    'paddingLeft',
    'paddingRight',
    'paddingBottom',
    'borderTop',
    'borderLeft',
    'borderRight',
    'borderBottom',
    'boxSizing',
    'tabSize',
    'textIndent',
  ];

  div.style.cssText = cssProps
    .map((p) => `${p}:${(style as any)[p]}`)
    .join(';');
  div.style.position = 'absolute';
  div.style.top = '0';
  div.style.left = '0';
  div.style.visibility = 'hidden';
  div.style.whiteSpace = 'pre-wrap';
  div.style.overflowWrap = 'break-word';
  div.style.width = textarea.clientWidth + 'px';
  div.style.minHeight = '0';
  div.style.height = 'auto';

  const textBefore = textarea.value.slice(0, textarea.selectionStart);
  div.textContent = textBefore;

  const marker = document.createElement('span');
  marker.textContent = '\u200B';
  div.appendChild(marker);

  document.body.appendChild(div);
  const markerRect = marker.getBoundingClientRect();
  const textareaRect = textarea.getBoundingClientRect();
  document.body.removeChild(div);

  return {
    top: markerRect.top - textareaRect.top + markerRect.height + 4,
    left: markerRect.left - textareaRect.left,
  };
}

export function WikiLinkAutocomplete({
  suggestions,
  selectedIndex,
  position,
  title = 'Sugestoes',
  onSelect,
  onMouseEnter,
}: {
  suggestions: WikiLinkSuggestion[];
  selectedIndex: number;
  position: { top: number; left: number };
  title?: string;
  onSelect: (index: number) => void;
  onMouseEnter: (index: number) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[selectedIndex] as HTMLElement;
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (suggestions.length === 0) return null;

  const topPos = Math.min(position.top, 320);
  const IconForType = {
    note: FileText,
    heading: Hash,
    block: Link2,
    unresolved: FileText,
  };

  return (
    <div
      className="absolute z-50 max-w-[420px] min-w-[280px] rounded-lg border border-[#33333a] bg-[#202024] shadow-2xl"
      style={{ top: topPos, left: Math.max(Math.min(position.left, 420), 0) }}
    >
      <div className="border-b border-[#303036] px-3 py-1.5 text-[11px] text-[#777780]">
        {title}
      </div>
      <div
        ref={listRef}
        className="max-h-48 overflow-y-auto py-1"
        role="listbox"
      >
        {suggestions.map((item, index) => {
          const Icon = IconForType[item.type];
          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={index === selectedIndex}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                index === selectedIndex
                  ? 'bg-[#2d2940] text-[#c9b8ff]'
                  : item.unresolved
                    ? 'text-[#f2c57c] hover:bg-[#2a2a30]'
                    : 'text-[#dcddde] hover:bg-[#2a2a30]'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(index);
              }}
              onMouseEnter={() => onMouseEnter(index)}
            >
              <Icon className="h-4 w-4 shrink-0 text-[#8f8f98]" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.detail && (
                <span
                  className={`shrink-0 truncate text-[11px] ${item.unresolved ? 'text-[#f2c57c]' : 'text-[#777780]'}`}
                >
                  {item.detail}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 border-t border-[#303036] px-3 py-1.5 text-[11px] text-[#55555d]">
        <span className="flex items-center gap-1">
          <span className="rounded bg-[#2a2a30] px-1">Tab</span>
          <span>ou</span>
          <span className="rounded bg-[#2a2a30] px-1">Enter</span>
          selecionar
        </span>
        <span className="flex items-center gap-1">
          <span className="rounded bg-[#2a2a30] px-1">Esc</span>
          fechar
        </span>
      </div>
    </div>
  );
}
