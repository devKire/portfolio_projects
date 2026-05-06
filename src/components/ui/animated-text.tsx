// components/ui/animated-text.tsx
'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  blurAmount?: number;
  once?: boolean;
}

export function AnimatedText({
  text,
  className,
  delay = 0,
  duration = 0.02,
  blurAmount = 10,
  once = true,
}: AnimatedTextProps) {
  return (
    <span className={cn('inline', className)}>
      {text.split(' ').map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block">
          {word.split('').map((char, charIndex) => {
            // Calcula o índice global considerando os espaços
            const globalIndex =
              text.split(' ').slice(0, wordIndex).join(' ').length +
              (wordIndex > 0 ? 1 : 0) +
              charIndex;

            return (
              <motion.span
                key={`${wordIndex}-${charIndex}`}
                initial={{
                  opacity: 0,
                  filter: `blur(${blurAmount}px)`,
                }}
                animate={{
                  opacity: 1,
                  filter: 'blur(0px)',
                }}
                transition={{
                  delay: delay + globalIndex * duration,
                  duration: 0.4,
                  ease: 'easeOut',
                }}
                className="inline-block"
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            );
          })}
          {/* Espaço entre palavras */}
          <span className="inline-block">&nbsp;</span>
        </span>
      ))}
    </span>
  );
}
