import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Shuffle, Plus } from 'lucide-react';
import { TrackRow } from '../../components/TrackRow';
import { Skeleton } from '../../components/ui/Skeleton';
import { TrackRowSkeleton } from '../../components/TrackRowSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { thumb } from '../../lib/thumb';
import { getCached, putCached } from '../home/pageCache';
import { usePlayer } from '../player/PlayerContext';
import type { PlaylistPage as PlaylistPageData } from '../../lib/api';
import * as api from '../../lib/api';

export const PlaylistPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playPlaylist, addToQueue } = usePlayer();

  const [playlist, setPlaylist] = useState<PlaylistPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (pid: string) => {
    const key = `playlist:${pid}`;
    const hit = getCached<PlaylistPageData>(key);
    if (hit) { setPlaylist(hit); setLoading(false); }
    else setLoading(true);
    setError(null);
    try {
      const fresh = await api.getPlaylist(pid);
      setPlaylist(fresh); putCached(key, fresh);
    } catch (e) {
      if (!hit) setError(String(e));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (id) load(id); }, [id]);

  const loadMore = async () => {
    if (!playlist?.continuation || loadingMore) return;
    setLoadingMore(true);
    try {
      const more = await api.getPlaylistMore(playlist.continuation);
      setPlaylist((prev) => prev ? { ...prev, items: [...prev.items, ...more.items], continuation: more.continuation } : null);
    } finally { setLoadingMore(false); }
  };

  if (loading) return (
    <div className="page-scroll p-4">
      <div className="flex items-end gap-4 mb-4">
        <Skeleton className="h-28 w-28 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2"><Skeleton className="h-8 w-2/3 rounded" /><Skeleton className="h-4 w-40 rounded" /></div>
      </div>
      {[0,1,2,3,4,5].map((i) => <TrackRowSkeleton key={i} />)}
    </div>
  );

  if (error) return <ErrorState message={error} onRetry={() => load(id!)} />;
  if (!playlist) return null;

  return (
    <div className="page-scroll relative overflow-hidden">
      {playlist.thumbnail && (
        <>
          <img src={thumb(playlist.thumbnail, 100)} alt="" className="absolute inset-0 h-64 w-full object-cover scale-110 blur-2xl opacity-30" />
          <div className="absolute inset-0 h-64 bg-gradient-to-b from-transparent to-background" />
        </>
      )}
      <div className="relative p-4">
        <div className="flex items-end gap-4 mb-4">
          {playlist.thumbnail ? (
            <img src={thumb(playlist.thumbnail, 400)} alt="" className="h-28 w-28 shrink-0 rounded-xl object-cover shadow-2xl" />
          ) : <div className="h-28 w-28 shrink-0 rounded-xl bg-muted" />}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">{playlist.title}</h1>
            {playlist.subtitle && <p className="text-sm text-muted-foreground">{playlist.subtitle}</p>}
            <p className="text-xs text-muted-foreground">{playlist.items.length} songs</p>
          </div>
        </div>
        <div className="mb-6 flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            onClick={() => playPlaylist(playlist.items, 0, id, playlist.title ?? undefined)}>
            <Play className="h-4 w-4" /> Play
          </button>
          <button className="flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold"
            onClick={() => playPlaylist(playlist.items, undefined, id, playlist.title ?? undefined, true)}>
            <Shuffle className="h-4 w-4" /> Shuffle
          </button>
        </div>
        <div className="flex flex-col">
          {playlist.items.map((item, i) => (
            <TrackRow
              key={item.video_id + ':' + i}
              song={item}
              index={i}
              showPlayCount
              onplay={() => playPlaylist(playlist.items, i, id, playlist.title ?? undefined)}
            />
          ))}
        </div>
        {playlist.continuation && (
          <div className="py-4 text-center">
            <button className="text-sm text-muted-foreground hover:text-foreground" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
