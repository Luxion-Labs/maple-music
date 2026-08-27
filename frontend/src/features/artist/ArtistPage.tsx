import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shuffle, Radio, UserPlus, Check, Bookmark, BookmarkCheck } from 'lucide-react';
import { TrackRow } from '../../components/TrackRow';
import { Shelf } from '../../components/Shelf';
import { Skeleton } from '../../components/ui/Skeleton';
import { TrackRowSkeleton } from '../../components/TrackRowSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { thumb } from '../../lib/thumb';
import { getCached, putCached } from '../home/pageCache';
import { usePlayer } from '../player/PlayerContext';
import { usePersonal } from '../home/PersonalContext';
import { useAuth } from '../auth/AuthContext';
import type { ArtistPage as ArtistPageData } from '../../lib/api';
import * as api from '../../lib/api';

export const ArtistPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { playPlaylist, startRadio } = usePlayer();
  const { isSaved, toggleSaved } = usePersonal();
  const { account } = useAuth();

  const [artist, setArtist] = useState<ArtistPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const savedHere = isSaved(id ?? '');

  const load = useCallback(async (cid: string) => {
    const key = `artist:${cid}`;
    const hit = getCached<ArtistPageData>(key);
    if (hit) { setArtist(hit); setSubscribed(hit.subscribed); setLoading(false); }
    else setLoading(true);
    setError(null);
    try {
      const fresh = await api.getArtist(cid);
      if (cid !== id) return;
      setArtist(fresh); setSubscribed(fresh.subscribed); putCached(key, fresh);
    } catch (e) {
      if (!hit) setError(String(e));
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (id) load(id); }, [id]);

  const showMore = (section: { moreBrowseId?: string; moreParams?: string; title: string }) => {
    const q = new URLSearchParams({ id: section.moreBrowseId!, title: section.title });
    if (section.moreParams) q.set('params', section.moreParams);
    navigate(`/list?${q.toString()}`);
  };

  if (loading) return (
    <div className="page-scroll">
      <Skeleton className="h-52 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-8 w-1/2 rounded" />
        <div className="flex gap-3"><Skeleton className="h-10 w-24 rounded-full" /><Skeleton className="h-10 w-24 rounded-full" /></div>
      </div>
    </div>
  );

  if (error) return <ErrorState message={error} onRetry={() => load(id!)} />;
  if (!artist) return null;

  return (
    <div className="page-scroll">
      <div className="relative min-h-[40vw] flex flex-col justify-end overflow-hidden">
        {artist.thumbnail && (
          <img src={artist.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="relative p-4 pb-5">
          <h1 className="text-3xl font-bold drop-shadow-lg">{artist.name}</h1>
          {artist.subscribers && <p className="text-sm text-muted-foreground">{artist.subscribers}</p>}
          {artist.description && (
            <div className="mt-2">
              <p className={`text-sm text-foreground/80 ${expanded ? '' : 'line-clamp-2'}`}>{artist.description}</p>
              <button className="text-xs font-semibold text-muted-foreground" onClick={() => setExpanded(!expanded)}>
                {expanded ? 'Less' : 'More'}
              </button>
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {artist.topSongs.length > 0 && (
              <button
                className="flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background"
                onClick={() => playPlaylist(artist.topSongs, undefined, artist.topSongsId, artist.name ?? undefined, true)}
              >
                <Shuffle className="h-4 w-4" /> Shuffle
              </button>
            )}
            <button
              className="flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold"
              onClick={() => startRadio('artist', id!, artist.name)}
            >
              <Radio className="h-4 w-4" /> Radio
            </button>
            {account.signedIn ? (
              <button
                className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold ${subscribed ? 'border-primary text-primary' : ''}`}
                onClick={async () => { await api.subscribe(artist.channelId, !subscribed); setSubscribed(!subscribed); }}
              >
                {subscribed ? <Check className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {subscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            ) : (
              <button
                className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold ${savedHere ? 'border-primary text-primary' : ''}`}
                onClick={() => toggleSaved({ kind: 'artist', id: id!, title: artist.name ?? '' })}
              >
                {savedHere ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {savedHere ? 'Saved' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-4">
        {artist.topSongs.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Top songs</h2>
              {artist.topSongsId && (
                <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => navigate(`/playlist/${artist.topSongsId}`)}>
                  See all →
                </button>
              )}
            </div>
            {artist.topSongs.slice(0, 10).map((song, i) => (
              <TrackRow
                key={song.video_id + ':' + i}
                song={song}
                showPlayCount
                onplay={() => playPlaylist(artist.topSongs, i, artist.topSongsId, artist.name ?? undefined)}
              />
            ))}
          </section>
        )}
        {artist.sections.map((section, i) => (
          <Shelf
            key={i + ':' + section.title}
            title={section.title}
            items={section.items}
            onMore={section.moreBrowseId ? () => showMore(section) : undefined}
          />
        ))}
      </div>
    </div>
  );
};
