'use client';
import React, { useRef } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
} from 'motion/react';
import { cn } from '@/lib/utils';

export const CometCard = ({
  rotateDepth = 17.5,
  translateDepth = 20,
  glareEnabled = true,
  glareOpacity = 0.6,
  className,
  children,
}: {
  rotateDepth?: number;
  translateDepth?: number;
  glareEnabled?: boolean;
  glareOpacity?: number;
  className?: string;
  children: React.ReactNode;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(
    mouseYSpring,
    [-0.5, 0.5],
    [`-${rotateDepth}deg`, `${rotateDepth}deg`]
  );
  const rotateY = useTransform(
    mouseXSpring,
    [-0.5, 0.5],
    [`${rotateDepth}deg`, `-${rotateDepth}deg`]
  );

  const translateX = useTransform(
    mouseXSpring,
    [-0.5, 0.5],
    [`-${translateDepth}px`, `${translateDepth}px`]
  );
  const translateY = useTransform(
    mouseYSpring,
    [-0.5, 0.5],
    [`${translateDepth}px`, `-${translateDepth}px`]
  );

  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], [0, 100]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], [0, 100]);

  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.9) 10%, rgba(255, 255, 255, 0.75) 20%, rgba(255, 255, 255, 0) 80%)`;

  const resetCard = () => {
    x.set(0);
    y.set(0);
    rectRef.current = null;
    lastPointerRef.current = null;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  };

  const updatePointer = () => {
    frameRef.current = null;
    const rect = rectRef.current;
    const pointer = lastPointerRef.current;
    if (!rect || !pointer) return;

    const xPct = (pointer.x - rect.left) / rect.width - 0.5;
    const yPct = (pointer.y - rect.top) / rect.height - 0.5;

    x.set(Math.max(-0.5, Math.min(0.5, xPct)));
    y.set(Math.max(-0.5, Math.min(0.5, yPct)));
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    rectRef.current = ref.current?.getBoundingClientRect() ?? null;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !rectRef.current) return;

    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    // Cacheia o rect no pointer enter e limita updates a um RAF por frame.
    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(updatePointer);
    }
  };

  return (
    <div className={cn('perspective-distant transform-3d', className)}>
      <motion.div
        ref={ref}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetCard}
        style={{
          rotateX,
          rotateY,
          translateX,
          translateY,
          boxShadow:
            'rgba(0, 0, 0, 0.01) 0px 260px 100px 0px, rgba(0, 0, 0, 0.18) 0px 64px 64px 0px, rgba(0, 0, 0, 0.24) 0px 18px 36px 0px',
        }}
        initial={{ scale: 1, z: 0 }}
        whileHover={{
          scale: 1.03,
          z: 32,
          transition: { duration: 0.2 },
        }}
        className="relative rounded-2xl"
      >
        {children}
        {glareEnabled && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-50 h-full w-full rounded-[16px] mix-blend-overlay"
            style={{
              background: glareBackground,
              opacity: glareOpacity,
            }}
            transition={{ duration: 0.2 }}
          />
        )}
      </motion.div>
    </div>
  );
};
