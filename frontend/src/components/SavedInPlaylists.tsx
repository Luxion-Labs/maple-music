import { useState, useRef, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { BrowseItem } from '../lib/api';
import { thumb } from '../lib/thumb';

interface SavedInPlaylistsProps {
  playlists: BrowseItem[];
}

const SHOWN = 3;

/**
 * The "saved" mark on a track row: this song is already in one or more of your own playlists.
 * Pointing at it names them (three at most, "and N more" for the rest), and each one links
 * through to that playlist.
 */
export function SavedInPlaylists({ playlists }: SavedInPlaylistsProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ right: 0, top: 0, openUp: false });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const shown = playlists.slice(0, SHOWN);
  const extra = playlists.length - shown.length;

  const label =
    playlists.length === 1
      ? `Saved in ${playlists[0].title}`
      : `Saved in ${playlists.length} playlists`;

  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuHeight = 44 + shown.length * 40;
    const openUp = rect.bottom + menuHeight > window.innerHeight;
    
    setPosition({
      right: window.innerWidth - rect.right,
      top: openUp ? window.innerHeight - rect.top : rect.bottom,
      openUp,
    });
  };

  const show = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    calculatePosition();
    setOpen(true);
  };

  const hide = () => {
    closeTimeoutRef.current = setTimeout(() => setOpen(false), 140);
  };

  const keep = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        className="cursor-pointer rounded-md p-1.5 text-primary transition hover:bg-accent/20"
        aria-label={label}
        title={label}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => e.stopPropagation()}
      >
        <CheckCircle className="h-4 w-4" />
      </button>

      {open && (
        <div
          className={`fixed z-50 min-w-52 max-w-72 animate-in rounded-lg border bg-popover p-1 text-popover-foreground shadow-xl duration-150 fade-in-0 zoom-in-95 ${
            position.openUp ? 'origin-bottom-right' : 'origin-top-right'
          }`}
          style={{
            right: `${position.right}px`,
            [position.openUp ? 'bottom' : 'top']: `${position.top}px`,
          }}
          onMouseEnter={keep}
          onMouseLeave={hide}
          role="tooltip"
        >
          <p className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Saved in
          </p>
          {shown.map((pl) => (
            <a
              key={pl.id}
              href={`/playlist/${pl.id}`}
              className="flex w-full items-center gap-2 rounded-md p-1.5 hover:bg-accent/10"
              onClick={() => setOpen(false)}
            >
              {pl.thumbnail ? (
                <img src={thumb(pl.thumbnail, 96)} alt="" className="h-7 w-7 shrink-0 rounded object-cover" />
              ) : (
                <div className="h-7 w-7 shrink-0 rounded bg-muted"></div>
              )}
              <span className="min-w-0 truncate text-sm">{pl.title}</span>
            </a>
          ))}
          {extra > 0 && (
            <p className="px-2 pb-1 pt-0.5 text-xs text-muted-foreground">and {extra} more</p>
          )}
        </div>
      )}
    </>
  );
}
