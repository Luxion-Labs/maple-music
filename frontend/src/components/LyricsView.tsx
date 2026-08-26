import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as api from '../lib/api';
import { usePlayer } from '../features/player/PlayerContext';
import { cn } from '../lib/utils';

function durationSecs(d?: string): number | undefined {
  if (!d) return undefined;
  const parts = d.split(':').map(Number);
  if (!parts.length || parts.some(Number.isNaN)) return undefined;
  return parts.reduce((a, b) => a * 60 + b, 0);
}

interface Props { expanded?: boolean }

export const LyricsView: React.FC<Props> = ({ expanded = false }) => {
  const { now, queue, position, paused, seek } = usePlayer();
  const [lyrics, setLyrics] = useState<api.Lyrics | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const requested = useRef('');
  const userScrollUntil = useRef(0);
  const hasScrolled = useRef(false);
  const [interpolatedPos, setInterpolatedPos] = useState(position);

  // Interpolated position clock
  useEffect(() => {
    if (paused) { setInterpolatedPos(position); return; }
    const base = position;
    const baseAt = performance.now();
    setInterpolatedPos(position);
    let id = requestAnimationFrame(function tick() {
      setInterpolatedPos(base + (performance.now() - baseAt) / 1000);
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [position, paused]);

  const posMs = interpolatedPos * 1000;

  // Fetch lyrics when track changes
  useEffect(() => {
    if (!now) { requested.current = ''; setLyrics(null); setLoading(false); return; }
    if (now.videoId === requested.current) return;
    const id = (requested.current = now.videoId);
    setLoading(true); setLyrics(null);
    const album = queue.items[queue.currentIndex]?.album;
    api.getLyrics({
      videoId: id, title: now.title, artists: now.artists,
      album: album ?? undefined, duration: durationSecs(now.duration),
    }).then((l) => {
      if (requested.current !== id) return;
      setLyrics(l); setLoading(false); hasScrolled.current = false;
    }).catch(() => {
      if (requested.current === id) setLoading(false);
    });
  }, [now?.videoId]);

  // Active line index
  const activeIndex = (() => {
    if (!lyrics?.synced) return -1;
    let i = -1;
    for (let j = 0; j < lyrics.lines.length; j++) {
      const t = lyrics.lines[j].time_ms;
      if (t === undefined) continue;
      if (t > posMs) break;
      i = j;
    }
    return i;
  })();

  // Auto-scroll
  useEffect(() => {
    if (activeIndex < 0 || !scrollerRef.current || Date.now() < userScrollUntil.current) return;
    scrollerRef.current.querySelector(`[data-line="${activeIndex}"]`)?.scrollIntoView({
      behavior: hasScrolled.current ? 'smooth' : 'instant',
      block: 'center',
    });
    hasScrolled.current = true;
  }, [activeIndex]);

  function onUserScroll() { userScrollUntil.current = Date.now() + 3000; }

  function seekTo(line: api.LyricLine) {
    if (line.time_ms === undefined) return;
    const secs = line.time_ms / 1000;
    userScrollUntil.current = 0;
    seek(secs);
  }

  function getWordProgress(word: api.LyricWord, currentMs: number): number {
    if (currentMs <= word.start_ms) return 0;
    if (currentMs >= word.end_ms) return 1;
    const dur = word.end_ms - word.start_ms;
    return dur <= 0 ? 1 : (currentMs - word.start_ms) / dur;
  }

  return (
    <>
      <div
        ref={scrollerRef}
        onWheel={onUserScroll}
        onTouchMove={onUserScroll}
        onPointerDown={onUserScroll}
        className={cn('min-h-0 flex-1 overflow-y-auto py-6', expanded ? 'px-10' : 'px-5')}
      >
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-5 animate-pulse rounded bg-muted" style={{ width: `${55 + (i * 17) % 40}%` }} />
            ))}
          </div>
        ) : lyrics?.instrumental ? (
          <p className="py-8 text-center text-lg text-muted-foreground">Instrumental ♪</p>
        ) : lyrics?.synced ? (
          <div className={cn('py-[35vh]', expanded && 'mx-auto max-w-3xl')}>
            {lyrics.lines.map((line, i) => {
              const isActive = i === activeIndex;
              const isPast = i < activeIndex;
              return (
                <button
                  key={i}
                  data-line={i}
                  onClick={() => seekTo(line)}
                  className={cn(
                    'block w-full origin-left cursor-pointer text-left font-heading font-bold leading-snug transition-[color,transform] duration-300 ease-out hover:text-foreground',
                    expanded ? 'py-3 text-3xl' : 'py-2 text-xl',
                    isActive ? 'scale-[1.04] text-foreground' : isPast ? 'text-muted-foreground/40' : 'text-muted-foreground/70',
                  )}
                >
                  {line.words && line.words.length > 0 ? (
                    <span className="inline-flex flex-wrap items-baseline">
                      {line.words.map((word, wIdx) => {
                        const isWordEnd = word.text.endsWith(' ');
                        const cleanText = word.text.trimEnd();
                        if (isActive) {
                          const progress = getWordProgress(word, posMs);
                          const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
                          return (
                            <span
                              key={wIdx}
                              className={cn('inline-block bg-clip-text text-transparent [-webkit-text-fill-color:transparent] transition-transform duration-100 ease-out', isWordEnd && 'mr-[0.26em]', progress > 0 && progress < 1 && 'scale-[1.03]')}
                              style={{ backgroundImage: `linear-gradient(90deg, var(--foreground) ${pct}%, var(--muted-foreground) ${pct}%)` }}
                            >{cleanText}</span>
                          );
                        }
                        return (
                          <span key={wIdx} className={cn('inline-block', isWordEnd && 'mr-[0.26em]', isPast ? 'text-muted-foreground/40' : 'text-muted-foreground/70')}>
                            {cleanText}
                          </span>
                        );
                      })}
                    </span>
                  ) : (
                    <span>{line.text || '♪'}</span>
                  )}
                  {line.translation && (
                    <p className="mt-1 text-sm font-normal italic tracking-wide opacity-80">{line.translation}</p>
                  )}
                </button>
              );
            })}
          </div>
        ) : lyrics ? (
          <div className={cn('space-y-2 leading-relaxed text-foreground/90', expanded ? 'mx-auto max-w-3xl text-xl' : 'text-[15px]')}>
            {lyrics.lines.map((line, i) => (
              line.text ? (
                <div key={i}>
                  <p>{line.text}</p>
                  {line.translation && <p className="text-xs italic text-muted-foreground">{line.translation}</p>}
                </div>
              ) : <div key={i} className="h-4" />
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">No lyrics found for this track.</p>
        )}
      </div>
      {lyrics && !loading && (
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          {lyrics.source.startsWith('Source:') ? lyrics.source : `Lyrics from ${lyrics.source}`}
        </p>
      )}
    </>
  );
};
