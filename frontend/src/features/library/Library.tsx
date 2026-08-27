import React, { useState, useEffect } from 'react';
import { MediaCard } from '../../components/MediaCard';
import { MediaCardSkeleton } from '../../components/MediaCardSkeleton';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { useLibrary } from './LibraryContext';
import { useAuth } from '../auth/AuthContext';
import { cn } from '../../lib/utils';

type Tab = 'all' | 'playlists' | 'albums' | 'artists' | 'local';
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'albums', label: 'Albums' },
  { key: 'artists', label: 'Artists' },
  { key: 'local', label: 'Local' },
];

export const Library: React.FC = () => {
  const { library, allItems, playlists, local, tab, setTab, loadLibrary, loadLibraryExtras, loadLocalLibrary } = useLibrary();
  const { account } = useAuth();

  useEffect(() => { loadLibrary(); loadLibraryExtras(); }, []);
  useEffect(() => { if (tab === 'local') loadLocalLibrary(); }, [tab]);

  const loading = library.loading && !allItems.length;
  const error = library.error ?? library.extrasError;

  const tabItems = tab === 'all' ? allItems
    : tab === 'playlists' ? playlists
    : tab === 'albums' ? library.albums
    : tab === 'artists' ? library.artists
    : [];

  return (
    <div className="page-scroll">
      <div className="border-b px-4 py-4">
        <h1 className="text-xl font-bold">Library</h1>
      </div>

      {/* Tabs */}
      <div className="no-scrollbar flex gap-1 overflow-x-auto border-b px-4 py-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            className={cn(
              'shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors',
              tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'local' ? (
          <div className="flex flex-col gap-3">
            {local.loading ? (
              [0,1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{local.songs.length} local songs · {local.folders.length} folders</p>
                {local.albums.length > 0 && (
                  <div className="card-grid">
                    {local.albums.map((item) => <MediaCard key={item.id} item={item} />)}
                  </div>
                )}
              </>
            )}
          </div>
        ) : loading ? (
          <div className="card-grid">
            {[0,1,2,3,4,5,6,7].map((i) => <MediaCardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => loadLibrary(true)} />
        ) : tabItems.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {account.signedIn ? 'Nothing here yet.' : 'Sign in to see your library.'}
          </p>
        ) : (
          <div className="card-grid">
            {tabItems.map((item) => <MediaCard key={item.id} item={item} />)}
          </div>
        )}
      </div>
    </div>
  );
};
