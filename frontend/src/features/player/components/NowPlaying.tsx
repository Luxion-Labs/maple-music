import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowDown, List, Mic, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Repeat1, Heart,
} from 'lucide-react';
import { usePlayer } from '../PlayerContext';
import { thumb } from '../../../lib/thumb';
import { formatDuration } from '../../../lib/utils';
import { Marquee } from '../../../components/Marquee';
import { ArtistLine } from '../../../components/ArtistLine';
import { LyricsView } from '../../../components/LyricsView';
import { QueueList } from './QueueList';
import { cn } from '../../../lib/utils';

export const NowPlaying: React.FC = () => {
  const {
    now, queue, paused, position, duration, volume, np,
    togglePause, nextTrack, prevTrack, toggleShuffle, cycleRepeat,
    seek, dragVolume, commitVolume, toggleNowPlayingLike,
    setNpOpen, setNpTab,
  } = usePlayer();

  const [seekDrag, setSeekDrag] = useState<number | null>(null);
  const [flash, setFlash] = useState<'play' | 'pause' | null>(null);
  const [thumbAttempt, setThumbAttempt] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<'queue' | 'lyrics'>('queue');
  const [exiting, setExiting] = useState(false);

  const shuffleOn = queue.shuffle ?? false;
  const repeatMode = queue.repeat ?? 'off';
  const progressPct = duration > 0 ? ((seekDrag ?? position) / duration) * 100 : 0;
  const shownPos = seekDrag ?? position;
  const rating = now?.rating ?? 'indifferent';

  useEffect(() => { setThumbAttempt(0); }, [now?.thumbnail]);
  useEffect(() => { if (!np.open) { setSheetOpen(false); setExiting(false); } }, [np.open]);

  const handleClose = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      setExiting(false);
      setNpOpen(false);
    }, 250);
  }, [setNpOpen]);

  const toggleFlash = () => {
    setFlash(paused ? 'play' : 'pause');
    setTimeout(() => setFlash(null), 220);
    togglePause();
  };

  if (!np.open && !exiting) return null;
  if (!now) return null;

  const thumbSrc = thumb(now.thumbnail, thumbAttempt === 0 ? 720 : thumbAttempt === 1 ? 400 : 120);

  return (
    <div className={cn(
      "fixed inset-0 z-40 flex flex-col overflow-hidden bg-background px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]",
      exiting ? "np-exit" : "np-enter",
    )}>
      {/* blurred backdrop */}
      {now.thumbnail && (
        <img
          src={thumb(now.thumbnail, 100)}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-2xl"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />

      {/* header */}
      <header className="relative flex items-center justify-between">
        <button className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-accent/20" onClick={handleClose} aria-label="Minimise">
          <ArrowDown className="h-6 w-6" />
        </button>
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Now Playing</span>
        <button className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-accent/20" onClick={() => setSheetOpen(!sheetOpen)} aria-label="Queue/Lyrics">
          <List className="h-6 w-6" />
        </button>
      </header>

      {/* artwork */}
      <button
        type="button"
        className="relative mx-auto my-4 w-full max-w-[min(100%,calc(100dvh-22rem))] cursor-pointer self-center"
        onClick={toggleFlash}
        aria-label="Play/pause"
      >
        {flash && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="rounded-full bg-black/55 p-3.5 text-white">
              {flash === 'play' ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
            </div>
          </div>
        )}
        {now.thumbnail ? (
          <img
            src={thumbSrc}
            alt=""
            onError={() => setThumbAttempt((a) => Math.min(a + 1, 2))}
            className="aspect-square w-full rounded-2xl object-cover shadow-2xl"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-muted text-muted-foreground/40">
            <Play className="h-16 w-16" />
          </div>
        )}
      </button>

      {/* title + artist */}
      <div className="relative min-w-0 text-center">
        <Marquee text={now.title} className="justify-center text-lg font-semibold" />
        <ArtistLine runs={now.artistRuns} text={now.artists} className="mt-0.5 block truncate text-sm text-muted-foreground" />
      </div>

      {/* seek bar */}
      <div className="relative mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums">{formatDuration(shownPos)}</span>
        <input
          type="range"
          className="maple-range flex-1"
          style={{ '--pct': `${progressPct}%` } as React.CSSProperties}
          min={0}
          max={duration || 0}
          value={seekDrag ?? position}
          onChange={(e) => setSeekDrag(Number(e.target.value))}
          onMouseUp={(e) => { seek(Number((e.target as HTMLInputElement).value)); setSeekDrag(null); }}
          onTouchEnd={(e) => { seek(Number((e.target as HTMLInputElement).value)); setSeekDrag(null); }}
          aria-label="Seek"
        />
        <span className="tabular-nums">{formatDuration(duration)}</span>
      </div>

      {/* controls */}
      <div className="relative mt-2 flex items-center justify-between px-2">
        <button
          className={cn('flex h-12 w-12 items-center justify-center rounded-full hover:bg-accent/20', shuffleOn && 'text-primary')}
          onClick={toggleShuffle} aria-label="Shuffle" aria-pressed={shuffleOn}
        >
          <Shuffle className="h-5 w-5" />
        </button>
        <button className="flex h-14 w-14 items-center justify-center rounded-full hover:bg-accent/20" onClick={prevTrack} aria-label="Previous">
          <SkipBack className="h-7 w-7" />
        </button>
        <button className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg" onClick={toggleFlash} aria-label="Play/pause">
          {paused ? <Play className="h-8 w-8" /> : <Pause className="h-8 w-8" />}
        </button>
        <button className="flex h-14 w-14 items-center justify-center rounded-full hover:bg-accent/20" onClick={nextTrack} aria-label="Next">
          <SkipForward className="h-7 w-7" />
        </button>
        <button
          className={cn('flex h-12 w-12 items-center justify-center rounded-full hover:bg-accent/20', repeatMode !== 'off' && 'text-primary')}
          onClick={cycleRepeat} aria-label="Repeat" aria-pressed={repeatMode !== 'off'}
        >
          {repeatMode === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
        </button>
      </div>

      {/* like button */}
      <div className="relative mt-3 flex justify-center">
        <button
          className={cn('rounded-full p-2', rating === 'like' ? 'text-primary' : 'text-muted-foreground')}
          onClick={toggleNowPlayingLike}
          aria-label="Like"
        >
          <Heart className={cn('h-6 w-6', rating === 'like' && 'fill-current')} />
        </button>
      </div>

      {/* Queue / Lyrics sheet */}
      {sheetOpen && (
        <div className="relative mt-3 flex min-h-0 flex-col overflow-hidden rounded-t-2xl border bg-card/95 backdrop-blur" style={{ height: '38vh' }}>
          <div className="flex shrink-0 gap-1 border-b px-3 pt-1">
            {(['queue', 'lyrics'] as const).map((t) => (
              <button key={t} onClick={() => setSheetTab(t)}
                className={cn('flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors', sheetTab === t ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {t === 'queue' ? <List className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {t === 'queue' ? 'Queue' : 'Lyrics'}
              </button>
            ))}
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {sheetTab === 'queue' ? (
              <div className="min-h-0 flex-1 overflow-y-auto"><QueueList /></div>
            ) : (
              <LyricsView />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
