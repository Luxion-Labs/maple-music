import React from 'react';
import { cn } from '../lib/utils';
import { thumb } from '../lib/thumb';
import { isLocalId } from '../lib/api';
import type { SongItem } from '../lib/api';
import { isMobile } from '../lib/mobile';
import { ArtistLine } from './ArtistLine';
import { ExplicitIcon } from './ExplicitIcon';
import { TrackMenu } from './TrackMenu';
import { usePlayer } from '../features/player/PlayerContext';
import { Music, ThumbsUp, ThumbsDown, Heart, Play, ListPlus } from 'lucide-react';

interface Props {
  song: SongItem;
  index?: number;
  active?: boolean;
  hideThumb?: boolean;
  compact?: boolean;
  showPlayCount?: boolean;
  hideRating?: boolean;
  onplay: () => void;
  onAdd?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
}

export const TrackRow: React.FC<Props> = ({
  song, index, active = false, hideThumb = false, compact = false,
  showPlayCount = false, hideRating = false, onplay, onAdd, onRemove,
  removeLabel = 'Remove from playlist',
}) => {
  const { ratingOf, toggleRating, isLiked } = usePlayer();
  const duration = /^[\d:]+$/.test(song.duration ?? '') ? song.duration : undefined;
  const rated = ratingOf(song);
  const isLocal = isLocalId(song.video_id);
  const showRating = !compact && !hideRating && !isLocal;
  const mobile = isMobile();

  function onKey(e: React.KeyboardEvent) {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onplay(); }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onplay}
      onKeyDown={onKey}
      aria-label={`Play ${song.title}`}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent/10',
        active && 'bg-accent/10',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex min-w-0 shrink-0 items-center gap-3">
          {index !== undefined && (
            <span className={cn('relative w-5 shrink-0 text-center text-xs', active ? 'text-primary' : 'text-muted-foreground')}>
              <span className="group-hover:opacity-0">{index + 1}</span>
              <Play className="absolute inset-0 m-auto h-3.5 w-3.5 opacity-0 group-hover:opacity-100" />
            </span>
          )}
          {!hideThumb && (
            song.thumbnail ? (
              <img src={thumb(song.thumbnail, 96)} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" loading="lazy" />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground/50">
                <Music className="h-4 w-4" />
              </div>
            )
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn('min-w-0 truncate text-sm font-medium', active && 'text-primary')}>{song.title}</span>
            {song.queued_by && (
              <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">{song.queued_by}</span>
            )}
          </div>
          <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <ArtistLine runs={song.artist_runs} text={song.artists} />
            {compact && duration && <span className="shrink-0">· {duration}</span>}
          </div>
        </div>
      </div>

      {song.play_count && showPlayCount && !compact && (
        <div className="flex shrink-0 items-center justify-center text-xs text-muted-foreground lg:flex-1">
          <span className="truncate">{song.play_count} plays</span>
        </div>
      )}

      <div className={cn('flex shrink-0 items-center', compact ? 'gap-0.5' : 'gap-2')}>
        {!hideRating && (
          <span className="flex h-3.5 w-3.5 shrink-0 items-center">
            {song.explicit && <ExplicitIcon className="h-3.5 w-3.5 text-muted-foreground" />}
          </span>
        )}
        {showRating && (
          <div className={cn('flex items-center gap-0.5 transition-opacity focus-within:opacity-100', mobile ? '' : 'group-hover:opacity-100', rated === 'indifferent' && !mobile ? 'opacity-0' : '')}>
            <button
              className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition hover:bg-accent/20 hover:text-foreground"
              aria-label={rated === 'like' ? 'Remove rating' : 'Like'}
              aria-pressed={rated === 'like'}
              onClick={(e) => { e.stopPropagation(); toggleRating(song, 'like'); }}
            >
              <ThumbsUp className={cn('h-4 w-4', rated === 'like' && 'fill-current text-primary')} />
            </button>
            <button
              className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition hover:bg-accent/20 hover:text-foreground"
              aria-label={rated === 'dislike' ? 'Remove rating' : 'Dislike'}
              aria-pressed={rated === 'dislike'}
              onClick={(e) => { e.stopPropagation(); toggleRating(song, 'dislike'); }}
            >
              <ThumbsDown className={cn('h-4 w-4', rated === 'dislike' && 'fill-current')} />
            </button>
          </div>
        )}
        {duration && !compact && (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{duration}</span>
        )}
        {compact && (
          <button
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition hover:bg-accent/20 hover:text-foreground"
            aria-label={isLiked(song) ? 'Remove from liked songs' : 'Save to liked songs'}
            aria-pressed={isLiked(song)}
            onClick={(e) => { e.stopPropagation(); toggleRating(song, 'like'); }}
          >
            <Heart className={cn('h-4 w-4', isLiked(song) && 'fill-current text-primary')} />
          </button>
        )}
        <TrackMenu
          song={song}
          onAdd={onAdd}
          onRemove={onRemove}
          removeLabel={removeLabel}
          triggerClass={cn(
            'cursor-pointer rounded-md p-1.5 text-muted-foreground transition hover:bg-accent/20 hover:text-foreground focus-visible:opacity-100',
            compact || mobile ? '' : 'opacity-0 group-hover:opacity-100',
          )}
        />
      </div>
    </div>
  );
};
