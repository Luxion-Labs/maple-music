import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { BrowseItem } from '../lib/api';
import { MediaCard } from './MediaCard';
import { cn } from '../lib/utils';

interface Props {
  title?: string;
  items: BrowseItem[];
  onMore?: () => void;
  community?: boolean;
  headingClass?: string;
}

export const Shelf: React.FC<Props> = ({
  title, items, onMore, community = false, headingClass = 'font-heading text-lg font-semibold',
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  function update() {
    const row = rowRef.current;
    if (!row) return;
    setCanLeft(row.scrollLeft > 4);
    setCanRight(row.scrollLeft + row.clientWidth < row.scrollWidth - 4);
  }

  useEffect(() => { update(); }, [items]);
  useEffect(() => {
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  function page(dir: 1 | -1) {
    const row = rowRef.current;
    if (!row) return;
    row.scrollBy({ left: dir * Math.round(row.clientWidth * 0.9), behavior: 'smooth' });
  }

  return (
    <section>
      {(title || onMore) && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          {title && onMore ? (
            <button className="min-w-0 cursor-pointer text-left hover:underline" onClick={onMore} title={`See all ${title}`}>
              <h2 className={cn(headingClass, 'truncate')}>{title}</h2>
            </button>
          ) : title ? (
            <h2 className={cn(headingClass, 'truncate')}>{title}</h2>
          ) : null}
          {onMore && (
            <button
              className="flex shrink-0 cursor-pointer items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              onClick={onMore}
            >
              See all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
      <div
        className="group/shelf relative"
        onPointerEnter={update}
      >
        <div
          ref={rowRef}
          className={cn('no-scrollbar flex snap-x overflow-x-auto pb-2', community ? 'gap-3' : 'gap-2')}
          onScroll={update}
        >
          {items.map((item, i) => {
            const rich = community && item.kind === 'playlist';
            return (
              <div
                key={item.id + ':' + i}
                className={cn(
                  'shrink-0 snap-start',
                  rich ? 'basis-full sm:basis-[calc((100%-0.75rem)/2)] lg:basis-[calc((100%-1.5rem)/3)]' : 'w-40',
                )}
              >
                <MediaCard item={item} />
              </div>
            );
          })}
        </div>
        {canLeft && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent" />
            <button
              aria-label="Scroll left"
              onClick={() => page(-1)}
              className="absolute left-1 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border bg-background text-foreground opacity-0 shadow-lg transition hover:scale-105 focus-visible:opacity-100 group-hover/shelf:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </>
        )}
        {canRight && (
          <>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent" />
            <button
              aria-label="Scroll right"
              onClick={() => page(1)}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border bg-background text-foreground opacity-0 shadow-lg transition hover:scale-105 focus-visible:opacity-100 group-hover/shelf:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </section>
  );
};
