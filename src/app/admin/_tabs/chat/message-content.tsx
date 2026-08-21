import { Fragment, type ReactNode } from 'react';

const INLINE_TOKEN =
  /(\*\*[^*\n]+\*\*|`[^`\n]+`|https?:\/\/[^\s<]+|@[a-z0-9._:-]+)/gi;

function renderInline(value: string) {
  const parts = value.split(INLINE_TOKEN);
  return parts.map<ReactNode>((part, index) => {
    if (!part) return null;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="rounded bg-black/15 px-1 py-0.5 font-mono text-[0.9em] dark:bg-white/10"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-600 underline decoration-violet-400/60 underline-offset-2 hover:text-violet-500 dark:text-violet-300"
        >
          {part}
        </a>
      );
    }
    if (part.startsWith('@')) {
      return (
        <span
          key={index}
          className="rounded bg-violet-500/15 px-1 font-medium text-violet-700 dark:text-violet-300"
        >
          {part}
        </span>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function MessageContent({ content }: { content: string }) {
  const blocks = content.split(/```/g);
  return (
    <div className="min-w-0 text-sm leading-6 break-words text-zinc-800 dark:text-zinc-100">
      {blocks.map((block, blockIndex) => {
        if (blockIndex % 2 === 1) {
          return (
            <pre
              key={blockIndex}
              className="my-2 max-w-full overflow-x-auto rounded-lg border border-zinc-300/60 bg-zinc-950 p-3 text-xs text-zinc-100"
            >
              <code>{block.replace(/^\w+\n/, '')}</code>
            </pre>
          );
        }
        return block.split('\n').map((line, lineIndex) => {
          const list = /^\s*[-*]\s+(.+)$/.exec(line);
          return list ? (
            <div key={`${blockIndex}-${lineIndex}`} className="flex gap-2">
              <span aria-hidden="true">•</span>
              <span>{renderInline(list[1])}</span>
            </div>
          ) : (
            <Fragment key={`${blockIndex}-${lineIndex}`}>
              {renderInline(line)}
              {lineIndex < block.split('\n').length - 1 ? <br /> : null}
            </Fragment>
          );
        });
      })}
    </div>
  );
}
