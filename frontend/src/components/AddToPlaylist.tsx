import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { BrowseItem, SongItem } from '../lib/api';
import * as api from '../lib/api';
import { cn } from '../lib/utils';

interface Props {
  songs: SongItem[] | null;
  onClose: () => void;
}

export const AddToPlaylist: React.FC<Props> = ({ songs, onClose }) => {
  const [playlists, setPlaylists] = useState<BrowseItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!songs) return;
    setLoading(true);
    api.getLibrary()
      .then((p) => setPlaylists(p.filter((i) => i.id !== api.ON_REPEAT_ID)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [songs]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!songs) return null;

  async function pick(pl: BrowseItem) {
    const s = songs;
    onClose();
    if (!s?.length) return;
    try {
      for (const song of s) {
        await api.addToPlaylist(pl.id, song.video_id);
      }
    } catch (e) {
      console.error('Add to playlist error:', e);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="max-h-[85dvh] w-full overflow-y-auto rounded-t-xl border bg-card p-4 shadow-xl sm:max-w-sm sm:rounded-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold">Add to playlist</h2>
          <button
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {loading ? (
          <p className="p-2 text-sm text-muted-foreground">Loading…</p>
        ) : playlists.length ? (
          <div className="max-h-80 overflow-y-auto">
            {playlists.map((pl) => (
              <button
                key={pl.id}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-accent/10"
                onClick={() => pick(pl)}
              >
                {pl.thumbnail ? (
                  <img src={pl.thumbnail} alt="" className="h-10 w-10 rounded-md object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-md bg-muted" />
                )}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{pl.title}</div>
                  {pl.subtitle && <div className="truncate text-xs text-muted-foreground">{pl.subtitle}</div>}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="p-2 text-sm text-muted-foreground">No playlists yet — create one in your Library.</p>
        )}
      </div>
    </div>
  );
};
