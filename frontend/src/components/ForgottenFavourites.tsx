import { ArrowRight } from 'lucide-react';
import { TrackRow } from './TrackRow';
import { SongItem } from '../lib/api';

interface ForgottenFavouritesProps {
  title: string;
  songs: SongItem[];
  currentVideoId?: string;
  onMore?: () => void;
  onPlay: (index: number) => Promise<void>;
  onAdd: (song: SongItem) => void;
}

/**
 * "Forgotten favourites" is a pile of half-remembered songs, not a row of destinations — so it
 * reads as a list you scan, in balanced columns, instead of a carousel you page through.
 */
export function ForgottenFavourites({
  title,
  songs,
  currentVideoId,
  onMore,
  onPlay,
  onAdd,
}: ForgottenFavouritesProps) {
  // 15 keeps the block scannable (5 rows × 3 columns at full width)
  const displayedSongs = songs.slice(0, 15);

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        {onMore ? (
          <button className="min-w-0 cursor-pointer text-left hover:underline" onClick={onMore}>
            <h2 className="truncate font-heading text-lg font-semibold">{title}</h2>
          </button>
        ) : (
          <h2 className="truncate font-heading text-lg font-semibold">{title}</h2>
        )}
        {onMore && (
          <button
            className="flex shrink-0 cursor-pointer items-center gap-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            onClick={onMore}
          >
            See all
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {/* CSS columns, not a grid: it fills top-to-bottom like the shelf it replaces, balances the last
          column itself, and needs no row count per breakpoint. */}
      <div className="columns-1 gap-x-6 md:columns-2 xl:columns-3">
        {displayedSongs.map((song, i) => (
          <div key={`${song.video_id}:${i}`} className="break-inside-avoid">
            <TrackRow
              song={song}
              compact
              active={currentVideoId === song.video_id}
              onPlay={() => onPlay(i)}
              onAdd={() => onAdd(song)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
