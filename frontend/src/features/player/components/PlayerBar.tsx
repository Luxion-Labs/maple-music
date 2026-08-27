import React, { useState, useCallback, useRef } from 'react';
import {
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1,
  Mic2, ListMusic, Volume2, VolumeX, ChevronUp, ChevronDown, Heart, Plus,
} from 'lucide-react';
import { usePlayer } from '../PlayerContext';
import { thumb } from '../../../lib/thumb';
import { isLocalId } from '../../../lib/api';
import { cn } from '../../../lib/utils';
import { Marquee } from '../../../components/Marquee';
import { ArtistLine } from '../../../components/ArtistLine';
import { Slider } from '../../../components/ui/Slider';

const fmt = (secs: number) => {
  if (!secs || secs < 0) return '0:00';
  const t = Math.floor(secs);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const mm = h ? m.toString().padStart(2, '0') : `${m}`;
  return `${h ? `${h}:` : ''}${mm}:${s.toString().padStart(2, '0')}`;
};

interface PlayerBarProps {
  className?: string;
  queueOpen?: boolean;
  onToggleQueue?: () => void;
  lyricsOpen?: boolean;
  onToggleLyrics?: () => void;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  className,
  queueOpen = false,
  onToggleQueue,
  lyricsOpen = false,
  onToggleLyrics,
}) => {
  const {
    now, queue, paused, position, duration, volume, np,
    togglePause, nextTrack, prevTrack, toggleShuffle, cycleRepeat,
    seek, dragVolume, commitVolume, toggleNowPlayingLike,
    setNpOpen, openAddToPlaylist,
  } = usePlayer();

  const rating = now?.rating ?? 'indifferent';
  const shuffleOn = queue.shuffle ?? false;
  const repeat = queue.repeat ?? 'off';
  const [justLiked, setJustLiked] = useState(false);

  const toggleLike = useCallback(() => {
    if (rating !== 'like') setJustLiked(true);
    toggleNowPlayingLike();
  }, [rating, toggleNowPlayingLike]);

  const [seekDrag, setSeekDrag] = useState<number | null>(null);
  const shownPosition = seekDrag ?? position;
  const progressPct = duration > 0 ? (shownPosition / duration) * 100 : 0;

  const pressedControl = useRef(false);
  const isControl = (t: EventTarget | null) =>
    !!(t && (t as HTMLElement).closest?.('button,a,input,[role="button"]'));

  const onBarClick = useCallback(() => {
    if (pressedControl.current) return;
    setNpOpen(!np.open);
  }, [np.open, setNpOpen]);

  if (!now) return null;

  return (
    <footer
      className={cn(
        'relative flex items-center gap-2 border-t bg-card px-2 py-2.5 animate-in slide-in-from-bottom-8 duration-200 sm:gap-4 sm:px-4 sm:py-3',
        className,
      )}
      onPointerDown={(e) => { pressedControl.current = isControl(e.target); }}
      onClick={(e) => { if (!isControl(e.target)) onBarClick(); }}
    >
      {/* Left: now-playing info */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {now.thumbnail ? (
          <img
            src={thumb(now.thumbnail, 120)}
            alt=""
            style={{ maxWidth: 'none' }}
            className="h-12 w-12 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground/50">
            <Play className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Marquee text={now.title ?? 'Nothing playing'} className="text-sm font-medium" />
          </div>
          <ArtistLine
            runs={now.artistRuns}
            text={now.artists ?? ''}
            className="block max-w-full text-xs text-muted-foreground"
          />
        </div>
        {now && (
          <div className="flex items-center">
            {!isLocalId(now.videoId) && (
              <button
                className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground lg:inline-flex"
                onClick={(e) => { e.stopPropagation(); toggleLike(); }}
                aria-label="Like"
              >
                <span
                  className={cn('inline-flex', justLiked && 'animate-heart-pop')}
                  onAnimationEnd={() => setJustLiked(false)}
                >
                  <Heart className={cn('h-4 w-4', rating === 'like' ? 'fill-current text-primary' : '')} />
                </span>
              </button>
            )}
            {!isLocalId(now.videoId) && (
              <button
                className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground lg:inline-flex"
                onClick={(e) => {
                  e.stopPropagation();
                  openAddToPlaylist([{
                    video_id: now.videoId,
                    title: now.title,
                    artists: now.artists,
                    artist_id: now.artistId,
                    thumbnail: now.thumbnail,
                    duration: now.duration,
                  }]);
                }}
                aria-label="Add to playlist"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Center: transport */}
      <div className="flex flex-[1.5] flex-col items-center gap-1">
        <div className="flex items-center gap-1">
          <button
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
              shuffleOn ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={(e) => { e.stopPropagation(); toggleShuffle(); }}
            aria-label="Shuffle"
            aria-pressed={shuffleOn}
          >
            <Shuffle className="h-4 w-4" />
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); prevTrack(); }}
            aria-label="Previous"
          >
            <SkipBack className="h-5 w-5" />
          </button>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95"
            onClick={(e) => { e.stopPropagation(); togglePause(); }}
            aria-label={paused ? 'Play' : 'Pause'}
          >
            {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); nextTrack(); }}
            aria-label="Next"
          >
            <SkipForward className="h-5 w-5" />
          </button>
          <button
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
              repeat !== 'off' ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={(e) => { e.stopPropagation(); cycleRepeat(); }}
            aria-label={`Repeat: ${repeat}`}
            aria-pressed={repeat !== 'off'}
          >
            {repeat === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex w-full max-w-md items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">{fmt(shownPosition)}</span>
          <Slider
            className="flex-1"
            min={0}
            max={duration || 0}
            step={0.1}
            value={[shownPosition]}
            onValueChange={(v) => setSeekDrag(v[0])}
            onValueCommit={(v) => { seek(v[0]); setSeekDrag(null); }}
          />
          <span className="tabular-nums">{fmt(duration)}</span>
        </div>
      </div>

      {/* Right: volume + toggles */}
      <div className="flex flex-1 items-center justify-end gap-2">
        <div className="hidden items-center gap-1 md:flex">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); commitVolume(volume === 0 ? 50 : 0); }}
            aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          >
            {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <Slider
            className="w-24"
            min={0}
            max={100}
            step={1}
            value={[volume]}
            onValueChange={(v) => dragVolume(v[0])}
            onValueCommit={(v) => commitVolume(v[0])}
          />
        </div>
        <div className="flex items-center gap-0.5">
          <button
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
              lyricsOpen ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={(e) => { e.stopPropagation(); onToggleLyrics?.(); }}
            aria-label="Toggle lyrics"
          >
            <Mic2 className="h-5 w-5" />
          </button>
          <button
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
              queueOpen ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={(e) => { e.stopPropagation(); onToggleQueue?.(); }}
            aria-label="Toggle queue"
          >
            <ListMusic className="h-5 w-5" />
          </button>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); setNpOpen(!np.open); }}
            aria-label={np.open ? 'Minimise player' : 'Open player'}
            aria-expanded={np.open}
          >
            {np.open ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </footer>
  );
};
