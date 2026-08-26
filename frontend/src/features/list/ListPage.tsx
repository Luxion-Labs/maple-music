import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MediaCard } from '../../components/MediaCard';
import { MediaCardSkeleton } from '../../components/MediaCardSkeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import type { BrowseItem, HomeSection } from '../../lib/api';
import * as api from '../../lib/api';
import { getCached, putCached } from '../home/pageCache';

export const ListPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const browseId = searchParams.get('id') ?? '';
  const title = searchParams.get('title') ?? '';
  const params = searchParams.get('params') ?? undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<BrowseItem[]>([]);

  useEffect(() => {
    if (!browseId) return;
    const key = `list:${browseId}:${params ?? ''}`;
    const hit = getCached<BrowseItem[]>(key);
    if (hit) { setItems(hit); setLoading(false); }
    setLoading(true);
    api.getBrowseGrid(browseId, params)
      .then((sec) => { setItems(sec.items); putCached(key, sec.items); })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [browseId, params]);

  return (
    <div className="page-scroll">
      <div className="border-b px-4 py-4">
        <button className="mb-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => navigate(-1)}>← Back</button>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="card-grid">
            {[0,1,2,3,4,5,6,7].map((i) => <MediaCardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <div className="card-grid">
            {items.map((item) => <MediaCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  );
};
