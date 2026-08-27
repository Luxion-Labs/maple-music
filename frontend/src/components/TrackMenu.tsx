import React, { useState, useRef } from 'react';
import {
  MoreHorizontal, ArrowUpNarrowWide, ArrowDownWideNarrow,
  Radio, ThumbsUp, ThumbsDown, User, Disc3, LayoutDashboard, Share2,
  ListPlus, ListMinus, Settings2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SongItem } from '../lib/api';
import { isLocalId } from '../lib/api';
import { anchorMenu } from '../lib/menu';
import { cn } from '../lib/utils';
import { usePlayer } from '../features/player/PlayerContext';
import { usePersonal } from '../features/home/PersonalContext';

interface Props {
  song: SongItem;
  triggerClass?: string;
  onAdd?: () => void;
  onRemove?: () => void;
  removeLabel?: string;
  linksOnly?: boolean;
}

export const TrackMenu: React.FC<Props> = ({
  song, triggerClass = '', onAdd, onRemove, removeLabel = 'Remove from playlist', linksOnly = false,
}) => {
  const navigate = useNavigate();
  const { playNext, addToQueue, startRadio, toggleRating, ratingOf } = usePlayer();
  const { addPick } = usePersonal();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ right: 0, y: 0, openUp: false });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isLocal = isLocalId(song.video_id);
  const rated = ratingOf(song);

  function openMenu(e: React.MouseEvent) {
    e.stopPropagation();
    if (triggerRef.current) {
      const anchor = anchorMenu(triggerRef.current);
      setPos(anchor);
    }
    setOpen(true);
  }

  function run(e: React.MouseEvent, action?: () => void) {
    e.stopPropagation();
    setOpen(false);
    action?.();
  }

  return (
    <>
      <button
        ref={triggerRef}
        className={cn(triggerClass, open && 'opacity-100')}
        onClick={openMenu}
        aria-label="Track options"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default"
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            aria-label="Close menu"
          />
          <div
            className={cn(
              'fixed z-50 min-w-44 rounded-lg border bg-popover p-1 text-popover-foreground shadow-xl',
              'animate-in fade-in-0 zoom-in-95 duration-150',
              pos.openUp ? 'origin-bottom-right' : 'origin-top-right',
            )}
            style={{ right: pos.right, [pos.openUp ? 'bottom' : 'top']: pos.y }}
          >
            {!linksOnly && (
              <>
                <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/10"
                  onClick={(e) => run(e, () => playNext([song], song.title))}>
                  <ArrowUpNarrowWide className="h-4 w-4" /> Play next
                </button>
                <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/10"
                  onClick={(e) => run(e, () => addToQueue([song], song.title))}>
                  <ArrowDownWideNarrow className="h-4 w-4" /> Add to queue
                </button>
              </>
            )}
            {!isLocal && (
              <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/10"
                onClick={(e) => run(e, () => startRadio('song', song.video_id, song.title))}>
                <Radio className="h-4 w-4" /> Start radio
              </button>
            )}
            {!isLocal && (
              <>
                <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/10"
                  onClick={(e) => run(e, () => toggleRating(song, 'like'))}>
                  <ThumbsUp className={cn('h-4 w-4', rated === 'like' && 'fill-current text-primary')} />
                  {rated === 'like' ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
                </button>
                <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/10"
                  onClick={(e) => run(e, () => toggleRating(song, 'dislike'))}>
                  <ThumbsDown className={cn('h-4 w-4', rated === 'dislike' && 'fill-current')} />
                  {rated === 'dislike' ? 'Remove dislike' : 'Dislike'}
                </button>
              </>
            )}
            {song.artist_id && (
              <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/10"
                onClick={(e) => run(e, () => navigate(`/artist/${encodeURIComponent(song.artist_id!)}`) )}>
                <User className="h-4 w-4" /> Go to artist
              </button>
            )}
            {song.album_id && !isLocal && (
              <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/10"
                onClick={(e) => run(e, () => navigate(`/album/${encodeURIComponent(song.album_id!)}`) )}>
                <Disc3 className="h-4 w-4" /> Go to album
              </button>
            )}
            <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/10"
              onClick={(e) => run(e, () => addPick({ kind: 'song', id: song.video_id, title: song.title, subtitle: song.artists, thumbnail: song.thumbnail }))}>
              <LayoutDashboard className="h-4 w-4" /> Add to shortcuts
            </button>
            {onAdd && !isLocal && (
              <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/10"
                onClick={(e) => run(e, onAdd)}>
                <ListPlus className="h-4 w-4" /> Add to playlist
              </button>
            )}
            {onRemove && (
              <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10"
                onClick={(e) => run(e, onRemove)}>
                <ListMinus className="h-4 w-4" /> {removeLabel}
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
};
