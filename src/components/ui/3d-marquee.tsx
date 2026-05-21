'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/lib/utils';

export const ThreeDMarquee = ({
  images,
  className,
}: {
  images: string[];
  className?: string;
}) => {
  const prefersReducedMotion = useReducedMotion();
  const uniqueImages = Array.from(new Set(images)).slice(0, 12);
  const chunkSize = Math.ceil(uniqueImages.length / 4);
  const chunks = Array.from({ length: 4 }, (_, colIndex) => {
    const start = colIndex * chunkSize;
    return uniqueImages.slice(start, start + chunkSize);
  });

  return (
    <div
      className={cn(
        'mx-auto hidden h-[600px] overflow-hidden rounded-2xl md:block',
        className
      )}
    >
      <div className="flex size-full items-center justify-center">
        <div className="size-[1280px] shrink-0 scale-75 lg:scale-90">
          <div
            style={{
              transform: 'rotateX(55deg) rotateY(0deg) rotateZ(-45deg)',
            }}
            className="relative top-80 right-[40%] grid size-full origin-top-left grid-cols-4 gap-8 transform-3d"
          >
            {chunks.map((subarray, colIndex) => (
              <motion.div
                animate={
                  prefersReducedMotion
                    ? undefined
                    : { y: colIndex % 2 === 0 ? 60 : -60 }
                }
                transition={{
                  duration: colIndex % 2 === 0 ? 14 : 18,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
                key={colIndex + 'marquee'}
                className="flex flex-col items-start gap-8"
              >
                <GridLineVertical className="-left-4" offset="80px" />
                {subarray.map((image, imageIndex) => (
                  <div className="relative" key={imageIndex + image}>
                    <GridLineHorizontal className="-top-4" offset="20px" />
                    <motion.div
                      whileHover={prefersReducedMotion ? undefined : { y: -10 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="relative aspect-[970/700] w-[520px] overflow-hidden rounded-lg ring ring-gray-950/5 hover:shadow-2xl"
                    >
                      <Image
                        src={image}
                        alt={`Projeto ${imageIndex + 1}`}
                        fill
                        sizes="520px"
                        className="object-cover"
                      />
                    </motion.div>
                  </div>
                ))}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const GridLineHorizontal = ({
  className,
  offset,
}: {
  className?: string;
  offset?: string;
}) => {
  return (
    <div
      style={
        {
          '--background': '#ffffff',
          '--color': 'rgba(0, 0, 0, 0.2)',
          '--height': '1px',
          '--width': '5px',
          '--fade-stop': '90%',
          '--offset': offset || '200px', //-100px if you want to keep the line inside
          '--color-dark': 'rgba(255, 255, 255, 0.2)',
          maskComposite: 'exclude',
        } as React.CSSProperties
      }
      className={cn(
        'absolute left-[calc(var(--offset)/2*-1)] h-[var(--height)] w-[calc(100%+var(--offset))]',
        'bg-[linear-gradient(to_right,var(--color),var(--color)_50%,transparent_0,transparent)]',
        '[background-size:var(--width)_var(--height)]',
        '[mask:linear-gradient(to_left,var(--background)_var(--fade-stop),transparent),_linear-gradient(to_right,var(--background)_var(--fade-stop),transparent),_linear-gradient(black,black)]',
        '[mask-composite:exclude]',
        'z-30',
        'dark:bg-[linear-gradient(to_right,var(--color-dark),var(--color-dark)_50%,transparent_0,transparent)]',
        className
      )}
    ></div>
  );
};

const GridLineVertical = ({
  className,
  offset,
}: {
  className?: string;
  offset?: string;
}) => {
  return (
    <div
      style={
        {
          '--background': '#ffffff',
          '--color': 'rgba(0, 0, 0, 0.2)',
          '--height': '5px',
          '--width': '1px',
          '--fade-stop': '90%',
          '--offset': offset || '150px', //-100px if you want to keep the line inside
          '--color-dark': 'rgba(255, 255, 255, 0.2)',
          maskComposite: 'exclude',
        } as React.CSSProperties
      }
      className={cn(
        'absolute top-[calc(var(--offset)/2*-1)] h-[calc(100%+var(--offset))] w-[var(--width)]',
        'bg-[linear-gradient(to_bottom,var(--color),var(--color)_50%,transparent_0,transparent)]',
        '[background-size:var(--width)_var(--height)]',
        '[mask:linear-gradient(to_top,var(--background)_var(--fade-stop),transparent),_linear-gradient(to_bottom,var(--background)_var(--fade-stop),transparent),_linear-gradient(black,black)]',
        '[mask-composite:exclude]',
        'z-30',
        'dark:bg-[linear-gradient(to_bottom,var(--color-dark),var(--color-dark)_50%,transparent_0,transparent)]',
        className
      )}
    ></div>
  );
};
