import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { TrackRow } from '../../components/TrackRow';
import { Shelf } from '../../components/Shelf';
import { MediaCardSkeleton } from '../../components/MediaCardSkeleton';
import { TrackRowSkeleton } from '../../components/TrackRowSkeleton';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import type { BrowseItem, SongItem } from '../../lib/api';
import * as api from '../../lib/api';

type Cat = 'songs' | 'albums' | 'artists' | 'playlists';

export const SearchMore: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const q = searchParams.get('q') ?? '';
  const cat = (searchParams.get('cat') ?? 'songs') as Cat;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [cards, setCards] = useState<BrowseItem[]>([]);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    (cat === 'songs'
      ? api.search(q).then((res) => { setSongs(res); })
      : api.searchCards(q, cat as 'albums' | 'artists' | 'playlists').then((res) => { setCards(res); })
    )
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [q, cat]);

  return (
    <div className="page-scroll">
      <div className="border-b px-4 py-4">
        <button className="mb-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => navigate(-1)}>← Back</button>
        <h1 className="text-xl font-bold capitalize">{cat} for "{q}"</h1>
      </div>
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex flex-col gap-2">
            {[0,1,2,3,4,5].map((i) => cat === 'songs' ? <TrackRowSkeleton key={i} /> : (
              <div key={i} className="w-36 shrink-0"><MediaCardSkeleton /></div>
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} />
        ) : cat === 'songs' ? (
          songs.map((song, i) => <TrackRow key={song.video_id} song={song} index={i} showPlayCount onplay={() => {}} />)
        ) : (
          <div className="card-grid">
            {cards.map((item) => (
              <div key={item.id}><MediaCardSkeleton /></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
