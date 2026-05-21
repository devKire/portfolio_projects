'use client';
import { cn } from '@/lib/utils';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createNoise3D } from 'simplex-noise';

export const WavyBackground = ({
  children,
  className,
  containerClassName,
  colors,
  waveWidth,
  backgroundFill,
  blur = 10,
  speed = 'fast',
  waveOpacity = 0.5,
  ...props
}: {
  children?: any;
  className?: string;
  containerClassName?: string;
  colors?: string[];
  waveWidth?: number;
  backgroundFill?: string;
  blur?: number;
  speed?: 'slow' | 'fast';
  waveOpacity?: number;
  [key: string]: any;
}) => {
  const noise = useMemo(() => createNoise3D(), []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const isVisibleRef = useRef(true);
  const reducedMotionRef = useRef(false);
  const [isSafari, setIsSafari] = useState(false);

  const waveColors = colors ?? [
    '#38bdf8',
    '#818cf8',
    '#c084fc',
    '#e879f9',
    '#22d3ee',
  ];

  const getSpeed = () => {
    switch (speed) {
      case 'slow':
        return 0.001;
      case 'fast':
        return 0.002;
      default:
        return 0.001;
    }
  };

  useEffect(() => {
    setIsSafari(
      typeof window !== 'undefined' &&
        navigator.userAgent.includes('Safari') &&
        !navigator.userAgent.includes('Chrome')
    );
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let tick = 0;

    const stop = () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      width = canvas.width = Math.max(rect.width, window.innerWidth);
      height = canvas.height = Math.max(rect.height, window.innerHeight);
      ctx.filter = `blur(${blur}px)`;
    };

    const drawWave = (count: number) => {
      tick += getSpeed();
      for (let waveIndex = 0; waveIndex < count; waveIndex++) {
        ctx.beginPath();
        ctx.lineWidth = waveWidth || 50;
        ctx.strokeStyle = waveColors[waveIndex % waveColors.length];
        for (let x = 0; x < width; x += 10) {
          const y = noise(x / 800, 0.3 * waveIndex, tick) * 100;
          ctx.lineTo(x, y + height * 0.5);
        }
        ctx.stroke();
        ctx.closePath();
      }
    };

    const render = () => {
      if (
        !isVisibleRef.current ||
        reducedMotionRef.current ||
        document.hidden
      ) {
        stop();
        return;
      }

      ctx.fillStyle = backgroundFill || 'black';
      ctx.globalAlpha = waveOpacity || 0.5;
      ctx.fillRect(0, 0, width, height);
      drawWave(3);
      animationRef.current = requestAnimationFrame(render);
    };

    const start = () => {
      if (animationRef.current === null && !reducedMotionRef.current) {
        animationRef.current = requestAnimationFrame(render);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else if (isVisibleRef.current) {
        start();
      }
    };

    const handleMotionChange = () => {
      reducedMotionRef.current = mediaQuery.matches;
      if (reducedMotionRef.current) {
        stop();
        ctx.fillStyle = backgroundFill || 'black';
        ctx.fillRect(0, 0, width, height);
      } else if (isVisibleRef.current) {
        start();
      }
    };

    // Pausa o canvas fora da viewport para não manter RAF ativo em seções abaixo da dobra.
    const observer = new IntersectionObserver(([entry]) => {
      isVisibleRef.current = entry.isIntersecting;
      if (entry.isIntersecting) {
        start();
      } else {
        stop();
      }
    });

    resizeCanvas();
    reducedMotionRef.current = mediaQuery.matches;
    observer.observe(container);
    window.addEventListener('resize', resizeCanvas);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    mediaQuery.addEventListener('change', handleMotionChange);
    if (!reducedMotionRef.current) start();

    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      mediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, [backgroundFill, blur, noise, speed, waveColors, waveOpacity, waveWidth]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col items-center justify-center',
        containerClassName
      )}
    >
      <canvas
        className="absolute inset-0 z-0"
        ref={canvasRef}
        id="canvas"
        style={{
          ...(isSafari ? { filter: `blur(${blur}px)` } : {}),
        }}
      ></canvas>
      <div className={cn('relative z-10', className)} {...props}>
        {children}
      </div>
    </div>
  );
};
