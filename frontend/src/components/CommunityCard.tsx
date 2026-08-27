import { useState, useEffect, useRef } from 'react';
import { Play, ListPlus, Music } from 'lucide-react';
import { BrowseItem, PlaylistPage } from '../lib/api';
import { thumb } from '../lib/thumb';
import { Skeleton } from './ui/Skeleton';

interface CommunityCardProps {
  item: BrowseItem;
  onOpen: (item: BrowseItem) => void;
  onPlay: (playlist: PlaylistPage) => Promise<void>;
  onAddToPlaylist: (items: any[]) => void;
  loadPlaylist: (id: string) => Promise<PlaylistPage>;
}

/**
 * A "From the community" playlist card: cover, title, a peek at the first three tracks, and
 * play / add-to-playlist. Wider than a MediaCard, so the shelf stretches these instead of
 * packing more of them per row.
 */
export function CommunityCard({
  item,
  onOpen,
  onPlay,
  onAddToPlaylist,
  loadPlaylist,
}: CommunityCardProps) {
  const [pl, setPl] = useState<PlaylistPage | null>(null);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // A community playlist's "cover" is usually just the creator's channel avatar
  const avatar = /\/\/yt3\./.test(item.thumbnail ?? '');

  useEffect(() => {
    if (!rootRef.current) return;

    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      loadPlaylist(item.id)
        .then(setPl)
        .catch(() => {}); // best-effort
    });

    io.observe(rootRef.current);
    return () => io.disconnect();
  }, [item.id, loadPlaylist]);

  const tracks = pl?.items.slice(0, 3) ?? [];
  const covers = [
    ...new Set((pl?.items ?? []).map((s) => s.thumbnail).filter((t): t is string => !!t)),
  ];
  const mosaic = avatar && covers.length >= 4 ? covers.slice(0, 4) : [];
  const cover = avatar ? covers[0] ?? item.thumbnail : item.thumbnail;
  const stats = pl?.subtitle?.replace(/^[^•]*views\s*•\s*/i, '') ?? '';

  const handlePlay = async () => {
    if (busy || !pl) return;
    setBusy(true);
    try {
      await onPlay(pl);
    } catch {
      console.error('Could not load that playlist');
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = () => {
    if (busy || !pl) return;
    onAddToPlaylist(pl.items);
  };

  return (
    <div
      ref={rootRef}
      className="group flex h-full flex-col gap-2 rounded-2xl border bg-card/40 p-2.5 transition-colors hover:border-foreground/20 hover:bg-card"
    >
      <button className="block w-full min-w-0 cursor-pointer" onClick={() => onOpen(item)} title={item.title}>
        <div className="relative mx-auto aspect-square w-full max-w-44 overflow-hidden rounded-xl bg-muted shadow-xs transition-shadow duration-300 group-hover:shadow-lg">
          {mosaic.length === 4 ? (
            <div className="grid h-full w-full grid-cols-2 grid-rows-2">
              {mosaic.map((m, i) => (
                <img key={i} src={thumb(m, 200)} alt="" className="h-full w-full object-cover" loading="lazy" />
              ))}
            </div>
          ) : cover ? (
            <img
              src={thumb(cover, 400)}
              alt=""
              className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
              <Music className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="mt-2 truncate text-center text-sm font-medium">{item.title}</div>
        {item.subtitle && <div className="truncate text-center text-xs text-muted-foreground">{item.subtitle}</div>}
        {stats && <div className="truncate text-center text-[0.6875rem] text-muted-foreground/70">{stats}</div>}
      </button>

      <div className="flex flex-col gap-0.5">
        {tracks.length ? (
          tracks.map((t, i) => (
            <button
              key={`${t.video_id}:${i}`}
              className="flex cursor-pointer items-center gap-2 rounded-lg p-1 text-left transition-colors hover:bg-accent/10"
              title={t.artists ? `${t.title} — ${t.artists}` : t.title}
            >
              {t.thumbnail ? (
                <img
                  src={thumb(t.thumbnail, 100)}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-md bg-muted object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-8 w-8 shrink-0 rounded-md bg-muted"></div>
              )}
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium">{t.title}</span>
                <span className="block truncate text-[0.6875rem] text-muted-foreground">{t.artists}</span>
              </span>
            </button>
          ))
        ) : (
          Array(3)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="flex items-center gap-2 p-1">
                <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="mb-1 h-3 w-3/5 rounded" />
                  <Skeleton className="h-2.5 w-2/5 rounded" />
                </div>
              </div>
            ))
        )}
      </div>

      <div className="mt-auto flex items-center justify-center gap-3 pt-1">
        <button
          aria-label="Play"
          disabled={busy}
          className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:brightness-110 ${
            busy ? 'animate-pulse' : ''
          }`}
          onClick={handlePlay}
        >
          <Play className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label="Add to playlist"
          disabled={busy}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border text-foreground transition-colors hover:bg-accent/10"
          onClick={handleAdd}
        >
          <ListPlus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
