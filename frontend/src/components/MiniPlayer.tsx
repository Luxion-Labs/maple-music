import React, { useState } from 'react';
import {
  SkipBack, SkipForward, Play, Pause, Shuffle, Repeat, Repeat1, Heart,
  Music, Volume2, VolumeX, Maximize2,
} from 'lucide-react';
import { usePlayer } from '../features/player/PlayerContext';
import { Marquee } from './Marquee';
import { thumb } from '../lib/thumb';
import { cn } from '../lib/utils';
import * as api from '../lib/api';

// Port of ui/src/lib/components/MiniPlayer.svelte — the whole UI of the mini-player window
// (Rust `mini.rs`). It is the same SPA as the main window; the root layout renders this
// instead of the app chrome when the window label is `mini`. Nothing here is mini-specific state.

const artBtn =
  'flex size-6 shrink-0 items-center justify-center rounded-md text-white/70 transition hover:bg-white/15 hover:text-white';
const panelBtn =
  'flex size-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted';

export const MiniPlayer: React.FC = () => {
  const {
    now, queue, paused, position, duration, volume,
    togglePause, nextTrack, prevTrack, toggleShuffle, cycleRepeat, seek,
    dragVolume, commitVolume, toggleNowPlayingLike, toggleMute,
  } = usePlayer();

  const shuffleOn = queue.shuffle ?? false;
  const repeat = queue.repeat ?? 'off';
  const likeable = !!now && !api.isLocalId(now.videoId);
  const rating = now?.rating ?? 'indifferent';

  const [seekDrag, setSeekDrag] = useState<number | null>(null);
  const [volHover, setVolHover] = useState(false);
  const [volDragging, setVolDragging] = useState(false);
  const [justLiked, setJustLiked] = useState(false);

  const volOpen = volHover || volDragging;
  const shownPos = seekDrag ?? position;

  const upcoming = now
    ? queue.items.slice(queue.currentIndex + 1, queue.currentIndex + 5)
             .map((item, k) => ({ item, index: queue.currentIndex + 1 + k }))
    : [];

  const onSeekInput = (e: React.ChangeEvent<HTMLInputElement>) => setSeekDrag(Number(e.target.value));
  const onSeekCommit = (v: number) => {
    if (api.isTauri) void api.seek(v);
    setSeekDrag(null);
  };

  const toggleLike = () => {
    if (rating !== 'like') setJustLiked(true);
    void toggleNowPlayingLike();
  };

  return (
    <div
      onPointerUp={() => setVolDragging(false)}
      className="group relative flex h-screen w-screen select-none overflow-hidden rounded-2xl border border-border/60 bg-card text-foreground"
      data-tauri-drag-region
    >
      {/* Cover art under the left half, masked so it dissolves into the card. */}
      {now?.thumbnail && (
        <img
          src={thumb(now.thumbnail, 480)}
          alt=""
          className="pointer-events-none absolute inset-y-0 left-0 h-full w-[62%] object-cover"
          style={{
            maskImage: 'linear-gradient(to right,#000 0,#000 70%,transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right,#000 0,#000 70%,transparent 100%)',
          }}
        />
      )}
      {/* Shade so white text reads over a bright cover. */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-[62%]"
        style={{ background: 'linear-gradient(to right,rgb(0 0 0/0.72) 0%,rgb(0 0 0/0.58) 70%,rgb(0 0 0/0) 100%)' }}
      />

      {/* Back to the app, revealed on hover. */}
      <button
        className="absolute left-2 top-2 z-10 flex size-6 items-center justify-center rounded-md text-white/60 opacity-0 transition hover:bg-white/15 hover:text-white focus-visible:opacity-100 group-hover:opacity-100"
        onClick={() => { void api.closeMini().catch(() => {}); }}
        title="Back to Maple"
        aria-label="Back to Maple"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>

      {/* Left: what's playing, over the art. */}
      <div className="relative flex min-w-0 flex-1 flex-col justify-between p-3.5 pl-4">
        <div className="flex items-center justify-end gap-0.5">
          {/* Volume: slider grows in-flow to the left of its icon on hover. */}
          <div
            className="flex items-center"
            role="group"
            aria-label="Volume"
            onPointerEnter={() => setVolHover(true)}
            onPointerLeave={() => setVolHover(false)}
          >
            <input
              type="range"
              className={cn('maple-range on-art min-w-0 transition-[width,opacity] duration-150', volOpen ? 'w-20 opacity-100' : 'w-0 opacity-0')}
              style={{ '--pct': `${volume}%` } as React.CSSProperties}
              min={0}
              max={100}
              value={volume}
              onPointerDown={() => setVolDragging(true)}
              onChange={(e) => dragVolume(Number(e.target.value))}
              onBlur={(e) => commitVolume(Number((e.target as HTMLInputElement).value))}
              aria-label="Volume"
            />
            <button className={artBtn} onClick={() => { void toggleMute(); }} aria-label={volume === 0 ? 'Unmute' : 'Mute'}>
              {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
          {likeable && (
            <button className={artBtn} onClick={toggleLike} aria-label={rating === 'like' ? 'Remove from liked songs' : 'Add to liked songs'}>
              <span
                className="flex"
                onAnimationEnd={() => setJustLiked(false)}
              >
                <Heart className={cn('h-4 w-4', justLiked && 'animate-heart-pop', rating === 'like' && 'fill-current text-primary')} />
              </span>
            </button>
          )}
        </div>

        <div className="min-w-0 [text-shadow:0_1px_4px_rgb(0_0_0/0.7)]">
          <Marquee text={now?.title ?? 'Nothing playing'} className="font-heading text-[0.95rem] font-semibold leading-tight text-white" />
          <Marquee text={now?.artists ?? ''} className="text-xs leading-snug text-white/75" />
        </div>

        <div className="flex items-center gap-2">
          <button className={artBtn} onClick={() => { void prevTrack(); }} aria-label="Previous">
            <SkipBack className="h-4 w-4" />
          </button>
          <input
            type="range"
            className="maple-range on-art min-w-0 flex-1"
            style={{ '--pct': `${duration ? (shownPos / duration) * 100 : 0}%` } as React.CSSProperties}
            min={0}
            max={duration || 0}
            value={shownPos}
            onChange={onSeekInput}
            onMouseUp={(e) => onSeekCommit(Number((e.target as HTMLInputElement).value))}
            onTouchEnd={(e) => onSeekCommit(Number((e.target as HTMLInputElement).value))}
            aria-label="Seek"
          />
          <button className={artBtn} onClick={() => { void nextTrack(); }} aria-label="Next">
            <SkipForward className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Right: what's next and the transport. */}
      <div className="relative flex w-56 shrink-0 flex-col gap-2 py-3 pl-1 pr-3">
        <div
          className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to bottom,#000 0,#000 78%,transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom,#000 0,#000 78%,transparent 100%)',
          }}
        >
          {upcoming.map(({ item, index }) => (
            <button
              key={item.video_id + index}
              className="flex shrink-0 items-center gap-2 rounded-md px-1.5 py-0.5 text-left transition-colors hover:bg-muted"
              onClick={() => { void api.playIndex(index); }}
              title={item.title}
            >
              {item.thumbnail ? (
                <img src={thumb(item.thumbnail, 64)} alt="" style={{ maxWidth: 'none' }} className="h-6 w-6 shrink-0 rounded object-cover" />
              ) : (
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground/50">
                  <Music className="h-3 w-3" />
                </div>
              )}
              <span className="truncate text-xs">{item.title}</span>
            </button>
          ))}
          {upcoming.length === 0 && <p className="px-1.5 py-0.5 text-xs text-muted-foreground">Nothing up next</p>}
        </div>

        <div className="flex shrink-0 items-center justify-center gap-2.5">
          <button
            className={cn(panelBtn, shuffleOn ? 'text-primary' : 'text-muted-foreground')}
            onClick={() => { void toggleShuffle(); }}
            aria-label="Shuffle"
            aria-pressed={shuffleOn}
          >
            <Shuffle className="h-4 w-4" />
          </button>
          <button
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/80"
            onClick={() => { void togglePause(); }}
            aria-label="Play/pause"
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button
            className={cn(panelBtn, repeat !== 'off' ? 'text-primary' : 'text-muted-foreground')}
            onClick={() => { void cycleRepeat(); }}
            aria-label={`Repeat: ${repeat}`}
            aria-pressed={repeat !== 'off'}
          >
            {repeat === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
