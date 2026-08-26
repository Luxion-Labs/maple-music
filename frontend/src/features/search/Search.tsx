import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { TrackRow } from '../../components/TrackRow';
import { Shelf } from '../../components/Shelf';
import { MediaCardSkeleton } from '../../components/MediaCardSkeleton';
import { TrackRowSkeleton } from '../../components/TrackRowSkeleton';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { Button } from '../../components/ui/Button';
import { getCached, putCached } from '../home/pageCache';
import type { SearchResults, SongItem, BrowseItem } from '../../lib/api';
import * as api from '../../lib/api';

type SearchCategory = 'songs' | 'albums' | 'artists' | 'playlists';

export const Search: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [searched, setSearched] = useState('');
  const [searching, setSearching] = useState(false);
  const [res, setRes] = useState<SearchResults | null>(null);
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const latestRef = useRef('');

  const runSearch = useCallback(async (q = query.trim()) => {
    if (!q) return;
    latestRef.current = q;
    const key = `search:${q}`;
    const hit = getCached<{ res: SearchResults; songs: SongItem[] }>(key);
    if (hit) { setRes(hit.res); setSongs(hit.songs); setSearched(q); setSearching(false); }
    else setSearching(true);
    setError(null);
    try {
      const [fresh, freshSongs] = await Promise.all([
        api.searchAll(q),
        api.search(q).catch(() => [] as SongItem[]),
      ]);
      if (latestRef.current !== q) return;
      setRes(fresh); setSongs(freshSongs); setSearched(q);
      putCached(key, { res: fresh, songs: freshSongs });
    } catch (e) {
      if (latestRef.current === q && !hit) setError(String(e));
    } finally {
      if (latestRef.current === q) setSearching(false);
    }
  }, [query]);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) { setQuery(q); runSearch(q); }
  }, []);

  const songRows = useMemo(() =>
    songs.length ? songs : (res?.songs ?? []).map((i) => ({
      video_id: i.id, title: i.title, artists: i.subtitle ?? '', duration: i.duration,
      thumbnail: i.thumbnail, artist_runs: i.artistRuns, play_count: i.playCount, explicit: i.explicit,
    } as SongItem)),
    [songs, res],
  );

  const sections = useMemo(() => {
    if (!res) return [];
    return [
      { key: 'songs' as SearchCategory, label: 'Songs', items: res.songs, max: 6, more: true, list: true },
      { key: 'albums' as SearchCategory, label: 'Albums', items: res.albums, max: 5, more: true, list: false },
      { key: 'artists' as SearchCategory, label: 'Artists', items: res.artists, max: 3, more: true, list: false },
      { key: 'playlists' as SearchCategory, label: 'Playlists', items: res.playlists, max: 5, more: true, list: false },
    ].filter((s) => s.list ? songRows.length : s.items.length);
  }, [res, songRows]);

  const showMore = (cat: SearchCategory) => navigate(`/search-more?q=${encodeURIComponent(searched)}&cat=${cat}`);

  return (
    <div className="page-scroll">
      <div className="border-b px-4 pb-4 pt-4">
        <h1 className="mb-3 text-xl font-bold">Search</h1>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); runSearch(); }}>
          <SearchSuggest
            value={query}
            onChange={setQuery}
            placeholder="Songs, albums, artists, playlists…"
            onPick={() => {}}
            onSubmit={() => runSearch()}
          />
          <Button type="submit" size="sm" disabled={searching}>
            <SearchIcon className="h-4 w-4" />
          </Button>
        </form>
        {error && <ErrorState message={error} onRetry={() => runSearch()} className="py-4" />}
      </div>

      <div className="px-4 py-4 flex flex-col gap-8">
        {searching ? (
          <>
            <section>
              <Skeleton className="mb-3 h-5 w-32 rounded" />
              {[0,1,2,3,4].map((i) => <TrackRowSkeleton key={i} />)}
            </section>
            <section>
              <Skeleton className="mb-3 h-5 w-24 rounded" />
              <div className="flex gap-3 overflow-hidden">
                {[0,1,2,3,4].map((i) => <div key={i} className="w-36 shrink-0"><MediaCardSkeleton /></div>)}
              </div>
            </section>
          </>
        ) : !res ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Search for a song, album, artist, or playlist.</p>
        ) : sections.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No results for "{searched}".</p>
        ) : (
          sections.map((sec) => (
            <section key={sec.key}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold">{sec.label}</h2>
                {sec.more && (
                  <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => showMore(sec.key)}>
                    Show more
                  </button>
                )}
              </div>
              {sec.list ? (
                songRows.slice(0, sec.max).map((song) => (
                  <TrackRow key={song.video_id} song={song} showPlayCount onplay={() => {}} />
                ))
              ) : (
                <Shelf items={sec.items.slice(0, sec.max)} />
              )}
            </section>
          ))
        )}
      </div>
    </div>
  );
};
