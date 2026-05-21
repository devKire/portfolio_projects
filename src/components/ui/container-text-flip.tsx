'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ContainerTextFlipProps {
  /** Array of words to cycle through in the animation */
  words?: string[];
  /** Time in milliseconds between word transitions */
  interval?: number;
  /** Additional CSS classes to apply to the container */
  className?: string;
  /** Additional CSS classes to apply to the text */
  textClassName?: string;
  /** Duration of the transition animation in milliseconds */
  animationDuration?: number;
}

export function ContainerTextFlip({
  words = ['better', 'modern', 'beautiful', 'awesome'],
  interval = 3000,
  className,
  textClassName,
  animationDuration = 700,
}: ContainerTextFlipProps) {
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const longestWordLength = useMemo(
    () => Math.max(...words.map((word) => word.length), 1),
    [words]
  );

  useEffect(() => {
    if (prefersReducedMotion || words.length <= 1) return;

    const intervalId = setInterval(() => {
      setCurrentWordIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, interval);

    return () => clearInterval(intervalId);
  }, [interval, prefersReducedMotion, words.length]);

  return (
    <motion.p
      // Largura estável baseada na maior palavra evita CLS sem medir/animar layout a cada troca.
      style={{ minWidth: `${longestWordLength + 2}ch` }}
      className={cn(
        'relative inline-flex justify-center overflow-hidden rounded-lg pt-2 pb-3 text-center text-4xl font-bold text-black md:text-7xl dark:text-white',
        '[background:linear-gradient(to_bottom,#f3f4f6,#e5e7eb)]',
        'shadow-[inset_0_-1px_#d1d5db,inset_0_0_0_1px_#d1d5db,_0_4px_8px_#d1d5db]',
        'dark:[background:linear-gradient(to_bottom,#374151,#1f2937)]',
        'dark:shadow-[inset_0_-1px_#10171e,inset_0_0_0_1px_hsla(205,89%,46%,.24),_0_4px_8px_#00000052]',
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[currentWordIndex]}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? undefined : { opacity: 0, y: -12 }}
          transition={{
            duration: prefersReducedMotion ? 0 : animationDuration / 1000,
            ease: 'easeInOut',
          }}
          className={cn('inline-block', textClassName)}
        >
          {words[currentWordIndex]}
        </motion.span>
      </AnimatePresence>
    </motion.p>
  );
}
