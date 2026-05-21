// components/ui/animated-text.tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  blurAmount?: number;
  once?: boolean;
  mode?: 'char' | 'word' | 'none';
}

export function AnimatedText({
  text,
  className,
  delay = 0,
  duration = 0.02,
  blurAmount = 10,
  once = true,
  mode = 'word',
}: AnimatedTextProps) {
  const prefersReducedMotion = useReducedMotion();
  const words = text.split(' ');

  if (prefersReducedMotion || mode === 'none') {
    return <span className={cn('inline', className)}>{text}</span>;
  }

  return (
    <span className={cn('inline', className)}>
      {words.map((word, wordIndex) => {
        if (mode === 'word') {
          return (
            <motion.span
              key={`${word}-${wordIndex}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: delay + wordIndex * duration,
                duration: 0.35,
                ease: 'easeOut',
              }}
              className="inline-block"
            >
              {word}
              {wordIndex < words.length - 1 ? '\u00A0' : null}
            </motion.span>
          );
        }

        const previousLength = words
          .slice(0, wordIndex)
          .reduce((total, current) => total + current.length + 1, 0);

        return (
          <span key={`${word}-${wordIndex}`} className="inline-block">
            {word.split('').map((char, charIndex) => {
              const globalIndex = previousLength + charIndex;

              return (
                <motion.span
                  key={`${wordIndex}-${charIndex}`}
                  initial={{ opacity: 0, filter: `blur(${blurAmount}px)` }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  transition={{
                    delay: delay + globalIndex * duration,
                    duration: 0.3,
                    ease: 'easeOut',
                  }}
                  className="inline-block"
                >
                  {char}
                </motion.span>
              );
            })}
            {wordIndex < words.length - 1 ? (
              <span className="inline-block">&nbsp;</span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
