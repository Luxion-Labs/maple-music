import React, { useState, useRef } from 'react';
import {
  MoreHorizontal, Pin, PinOff, ArrowUpNarrowWide, ArrowDownWideNarrow,
  Radio, LayoutDashboard, Share2, BookmarkMinus,
} from 'lucide-react';
import type { BrowseItem } from '../lib/api';
import { isLocalId, ON_REPEAT_ID } from '../lib/api';
import { anchorMenu } from '../lib/menu';
import { enqueueItem } from '../lib/browse';
import { cn } from '../lib/utils';
import { usePlayer } from '../features/player/PlayerContext';
import { usePersonal } from '../features/home/PersonalContext';

interface Props {
  item: BrowseItem;
  showPin?: boolean;
  vertical?: boolean;
  iconClass?: string;
  triggerClass?: string;
}

export const PlaylistMenu: React.FC<Props> = ({
  item,
  showPin = true,
  vertical = false,
  iconClass = 'h-4 w-4',
  triggerClass = 'absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 transition hover:bg-accent/20 hover:text-foreground focus-visible:opacity-100 group-hover/row:opacity-100',
}) => {
  const { startRadio } = usePlayer();
  const { personal, togglePin, toggleSaved, isSaved, addPick } = usePersonal();
  const [open, setOpen] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [pos, setPos] = useState({ right: 0, y: 0, openUp: false });
  const triggerRef = useRef<HTMLButtonElement>(null);

  const pinned = personal.pins.includes(item.id);
  const savedHere = isSaved(item.id);
  const onYouTube = !isLocalId(item.id) && item.id !== ON_REPEAT_ID;
  const canQueue = item.kind === 'song' || item.kind === 'album' || item.kind === 'playlist';

  function openMenu(e: React.MouseEvent) {
    e.stopPropagation();
    if (triggerRef.current) setPos(anchorMenu(triggerRef.current, 192));
    setOpen(true);
  }

  function run(e: React.MouseEvent, action?: () => void) {
    e.stopPropagation();
    setOpen(false);
    action?.();
  }

  async function queue(next: boolean) {
    if (queueing) return;
    setQueueing(true);
    try {
      await enqueueItem(item, next);
      setOpen(false);
    } finally {
      setQueueing(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        className={cn(triggerClass, open && 'opacity-100')}
        onClick={openMenu}
        aria-label="Options"
      >
        <MoreHorizontal className={iconClass} />
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
              'fixed z-50 min-w-48 rounded-lg border bg-popover p-1 text-popover-foreground shadow-xl',
              'animate-in fade-in-0 zoom-in-95 duration-150',
              pos.openUp ? 'origin-bottom-right' : 'origin-top-right',
            )}
            style={{ right: pos.right, [pos.openUp ? 'bottom' : 'top']: pos.y }}
          >
            {showPin && (
              <button className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/10"
                onClick={(e) => run(e, () => togglePin(item.id))}>
                {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                {pinned ? 'Unpin' : 'Pin to top'}
              </button>
            )}
            {canQueue && (
              <>
                <button disabled={queueing} className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/10 disabled:opacity-50"
                  onClick={(e) => { e.stopPropagation(); queue(true); }}>
                  <ArrowUpNarrowWide className="h-4 w-4" /> Play next
                </button>
                <button disabled={queueing} className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/10 disabled:opacity-50"
                  onClick={(e) => { e.stopPropagation(); queue(false); }}>
                  <ArrowDownWideNarrow className="h-4 w-4" /> Add to queue
                </button>
              </>
            )}
            {onYouTube && (
              <button className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/10"
                onClick={(e) => run(e, () => startRadio(item.kind as 'artist' | 'album' | 'playlist', item.id, item.title))}>
                <Radio className="h-4 w-4" /> Start radio
              </button>
            )}
            <button className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/10"
              onClick={(e) => run(e, () => addPick(item))}>
              <LayoutDashboard className="h-4 w-4" /> Add to shortcuts
            </button>
            {savedHere && (
              <button className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent/10"
                onClick={(e) => run(e, () => toggleSaved(item))}>
                <BookmarkMinus className="h-4 w-4" /> Remove from library
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
};
