import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Shuffle, Bookmark, BookmarkCheck, MoreHorizontal, ChevronRight } from 'lucide-react';
import { TrackRow } from '../../components/TrackRow';
import { Shelf } from '../../components/Shelf';
import { Skeleton } from '../../components/ui/Skeleton';
import { TrackRowSkeleton } from '../../components/TrackRowSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { ArtistLine } from '../../components/ArtistLine';
import { thumb } from '../../lib/thumb';
import { isLocalId } from '../../lib/api';
import { getCached, putCached } from '../home/pageCache';
import { usePlayer } from '../player/PlayerContext';
import { usePersonal } from '../home/PersonalContext';
import type { AlbumPage as AlbumPageData } from '../../lib/api';
import * as api from '../../lib/api';

export const AlbumPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playPlaylist, addToQueue, playNext, startRadio } = usePlayer();
  const { isSaved, toggleSaved } = usePersonal();

  const [album, setAlbum] = useState<AlbumPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inLibrary, setInLibrary] = useState(false);

  const load = useCallback(async (aid: string) => {
    const key = `album:${aid}`;
    const hit = getCached<AlbumPageData>(key);
    if (hit) { setAlbum(hit); setInLibrary(hit.inLibrary); setLoading(false); }
    else setLoading(true);
    setError(null);
    try {
      const fresh = await api.getAlbum(aid);
      setAlbum(fresh); setInLibrary(fresh.inLibrary);
      putCached(key, fresh);
    } catch (e) {
      if (!hit) setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (id) load(id); }, [id]);

  const playAll = (start?: number) => {
    if (!album) return;
    const songs = album.items;
    playPlaylist(songs, start, album.playlistId, album.title ?? undefined, false, album.continuation);
  };

  const shuffle = () => {
    if (!album?.items.length) return;
    playPlaylist(album.items, undefined, album.playlistId, album.title ?? undefined, true, album.continuation);
  };

  const showMore = (section: { moreBrowseId?: string; moreParams?: string; title: string }) => {
    const q = new URLSearchParams({ id: section.moreBrowseId!, title: section.title });
    if (section.moreParams) q.set('params', section.moreParams);
    navigate(`/list?${q.toString()}`);
  };

  if (loading) return (
    <div className="page-scroll p-4">
      <div className="flex items-end gap-4 mb-4">
        <Skeleton className="h-28 w-28 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2"><Skeleton className="h-3 w-16 rounded" /><Skeleton className="h-8 w-2/3 rounded" /><Skeleton className="h-4 w-40 rounded" /></div>
      </div>
      <div className="flex gap-3 mb-6"><Skeleton className="h-10 w-24 rounded-full" /><Skeleton className="h-10 w-24 rounded-full" /></div>
      {[0,1,2,3,4].map((i) => <TrackRowSkeleton key={i} />)}
    </div>
  );

  if (error) return <ErrorState message={error} onRetry={() => load(id!)} />;
  if (!album) return null;

  return (
    <div className="page-scroll relative overflow-hidden">
      {album.thumbnail && (
        <>
          <img src={thumb(album.thumbnail, 100)} alt="" className="absolute inset-0 h-64 w-full object-cover scale-110 blur-2xl opacity-40" />
          <div className="absolute inset-0 h-64 bg-gradient-to-b from-transparent to-background" />
        </>
      )}
      <div className="relative p-4">
        <div className="flex items-end gap-4 mb-4">
          {album.thumbnail ? (
            <img src={thumb(album.thumbnail, 400)} alt="" className="h-28 w-28 shrink-0 rounded-xl object-cover shadow-2xl" />
          ) : <div className="h-28 w-28 shrink-0 rounded-xl bg-muted" />}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{album.subtitle ?? 'Album'}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{album.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              {album.artist && <ArtistLine runs={album.artistRuns} text={album.artist} />}
              {album.secondSubtitle && <span>· {album.secondSubtitle}</span>}
            </div>
          </div>
        </div>

        {album.description && (
          <div className="mb-4">
            <p className={`text-sm text-foreground/80 ${expanded ? '' : 'line-clamp-2'}`}>{album.description}</p>
            <button className="mt-1 text-xs font-semibold text-muted-foreground" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Less' : 'More'}
            </button>
          </div>
        )}

        <div className="mb-6 flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground" onClick={() => playAll()}>
            <Play className="h-4 w-4" /> Play
          </button>
          <button className="flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold" onClick={shuffle}>
            <Shuffle className="h-4 w-4" /> Shuffle
          </button>
          {!isLocalId(id) && (
            <button
              className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold ${inLibrary ? 'border-primary text-primary' : ''}`}
              onClick={async () => {
                if (album.playlistId) { await api.setAlbumSaved(album.playlistId, !inLibrary); setInLibrary(!inLibrary); }
              }}
            >
              {inLibrary ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {inLibrary ? 'Saved' : 'Save'}
            </button>
          )}
        </div>

        <div className="flex flex-col">
          {album.items.map((item, i) => (
            <TrackRow
              key={item.video_id + ':' + i}
              song={item}
              index={i}
              hideThumb
              showPlayCount
              onplay={() => playAll(i)}
            />
          ))}
        </div>

        {album.sections?.map((section, i) => (
          <div key={i + ':' + section.title} className="mt-8">
            <Shelf
              title={section.title}
              items={section.items}
              onMore={section.moreBrowseId ? () => showMore(section) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
