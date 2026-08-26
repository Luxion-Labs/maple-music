import React, { useRef } from 'react';
import { Heart, Play, Pause, SkipForward } from 'lucide-react';
import { usePlayer } from '../PlayerContext';
import { thumb } from '../../../lib/thumb';
import { isLocalId } from '../../../lib/api';
import { cn } from '../../../lib/utils';
import { Marquee } from '../../../components/Marquee';
import { ArtistLine } from '../../../components/ArtistLine';

interface PlayerBarProps {
  className?: string;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({ className }) => {
  const {
    now, queue, paused, position, duration, volume, np,
    togglePause, nextTrack, toggleNowPlayingLike, setNpOpen,
  } = usePlayer();

  const pressedControl = useRef(false);
  const progressPct = duration > 0 ? (position / duration) * 100 : 0;
  const rating = now?.rating ?? 'indifferent';
  const isControl = (t: EventTarget | null) =>
    !!(t && (t as HTMLElement).closest?.('button,a,input,[role=button]'));

  if (!now) return null;

  return (
    <footer
      className={cn(
        'relative flex shrink-0 cursor-pointer items-center gap-3 border-t bg-card py-2 pl-3 pr-2',
        className,
      )}
      onPointerDown={(e) => { pressedControl.current = isControl(e.target); }}
      onClick={(e) => { if (!pressedControl.current && !isControl(e.target)) setNpOpen(!np.open); }}
    >
      {/* progress bar */}
      <div
        className="absolute left-0 top-0 h-0.5 bg-primary transition-[width] duration-300 ease-linear"
        style={{ width: `${progressPct}%` }}
      />

      {/* artwork */}
      {now.thumbnail ? (
        <img
          src={thumb(now.thumbnail, 120)}
          alt=""
          className="h-10 w-10 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground/40">
          <Play className="h-4 w-4" />
        </div>
      )}

      {/* track info */}
      <div className="min-w-0 flex-1">
        <Marquee text={now.title} className="text-sm font-medium" />
        <ArtistLine
          runs={now.artistRuns}
          text={now.artists}
          className="block truncate text-xs text-muted-foreground"
        />
      </div>

      {/* like */}
      {!isLocalId(now.videoId) && (
        <button
          className="shrink-0 rounded-full p-2 hover:bg-accent/20"
          onClick={(e) => { e.stopPropagation(); toggleNowPlayingLike(); }}
          aria-label="Like"
          aria-pressed={rating === 'like'}
        >
          <Heart
            className={cn('h-5 w-5', rating === 'like' ? 'fill-current text-primary' : 'text-muted-foreground')}
          />
        </button>
      )}

      {/* play/pause */}
      <button
        className="shrink-0 rounded-full p-2 hover:bg-accent/20"
        onClick={(e) => { e.stopPropagation(); togglePause(); }}
        aria-label={paused ? 'Play' : 'Pause'}
      >
        {paused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
      </button>

      {/* next */}
      <button
        className="shrink-0 rounded-full p-2 hover:bg-accent/20"
        onClick={(e) => { e.stopPropagation(); nextTrack(); }}
        aria-label="Next"
      >
        <SkipForward className="h-5 w-5" />
      </button>
    </footer>
  );
};
