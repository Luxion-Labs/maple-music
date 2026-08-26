import React, { createContext, useContext, useState, useCallback } from 'react';
import type { BrowseItem, LocalLibrary } from '../../lib/api';
import * as api from '../../lib/api';
import { mergeSaved, unsynced } from '../home/personal';
import { usePersonal } from '../home/PersonalContext';
import { useAuth } from '../auth/AuthContext';

export type LibraryTab = 'all' | 'playlists' | 'albums' | 'artists' | 'local';

interface LibraryState {
  items: BrowseItem[];   // playlists
  albums: BrowseItem[];
  artists: BrowseItem[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  extrasLoaded: boolean;
  extrasLoading: boolean;
  extrasError: string | null;
}

interface LocalState {
  folders: string[];
  albums: BrowseItem[];
  artists: BrowseItem[];
  songs: import('../../lib/api').SongItem[];
  loading: boolean;
  scanned: boolean;
  error: string | null;
}

interface LibraryCtx {
  library: LibraryState;
  local: LocalState;
  tab: LibraryTab;
  setTab: (t: LibraryTab) => void;
  loadLibrary: (force?: boolean) => Promise<void>;
  loadLibraryExtras: (force?: boolean) => Promise<void>;
  loadLocalLibrary: () => Promise<void>;
  addLocalFolder: (path: string) => Promise<void>;
  removeLocalFolder: (path: string) => Promise<void>;
  createLibraryPlaylist: (title: string) => Promise<string>;
  syncSavedToYouTube: () => Promise<{ synced: number; failed: number }>;
  // merged views
  playlists: BrowseItem[];
  allItems: BrowseItem[];
  toSync: import('../home/personal').Saved[];
}

const emptyLib: LibraryState = {
  items: [], albums: [], artists: [],
  loaded: false, loading: false, error: null,
  extrasLoaded: false, extrasLoading: false, extrasError: null,
};
const emptyLocal: LocalState = {
  folders: [], albums: [], artists: [], songs: [],
  loading: false, scanned: false, error: null,
};

const LibraryContext = createContext<LibraryCtx | null>(null);

export const LibraryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { personal } = usePersonal();
  const { account } = useAuth();
  const [library, setLibrary] = useState<LibraryState>(emptyLib);
  const [local, setLocal] = useState<LocalState>(emptyLocal);
  const [tab, setTab] = useState<LibraryTab>('all');

  const loadLibrary = useCallback(async (force = false) => {
    if (!api.isTauri) return;
    if (library.loading || (library.loaded && !force)) return;
    setLibrary((p) => ({ ...p, loading: true, error: null }));
    try {
      const items = await api.getLibrary();
      setLibrary((p) => ({ ...p, items, loaded: true, loading: false }));
    } catch (e) {
      setLibrary((p) => ({ ...p, error: String(e), loading: false }));
    }
  }, [library.loading, library.loaded]);

  const loadLibraryExtras = useCallback(async (force = false) => {
    if (!api.isTauri) return;
    if (library.extrasLoading || (library.extrasLoaded && !force)) return;
    setLibrary((p) => ({ ...p, extrasLoading: true, extrasError: null }));
    try {
      const [albums, artists] = await Promise.all([api.getLibraryAlbums(), api.getLibraryArtists()]);
      setLibrary((p) => ({ ...p, albums, artists, extrasLoaded: true, extrasLoading: false }));
    } catch (e) {
      setLibrary((p) => ({ ...p, extrasError: String(e), extrasLoading: false }));
    }
  }, [library.extrasLoading, library.extrasLoaded]);

  const loadLocalLibrary = useCallback(async () => {
    if (!api.isTauri) return;
    if (local.loading || local.scanned) return;
    setLocal((p) => ({ ...p, loading: true, error: null }));
    try {
      const lib = await api.getLocalLibrary();
      setLocal({ folders: lib.folders, albums: lib.albums, artists: lib.artists, songs: lib.songs, loading: false, scanned: true, error: null });
    } catch (e) {
      setLocal((p) => ({ ...p, error: String(e), loading: false }));
    }
  }, [local.loading, local.scanned]);

  const addLocalFolder = useCallback(async (path: string) => {
    if (!api.isTauri) return;
    const lib = await api.addLocalFolder(path);
    setLocal((p) => ({ ...p, folders: lib.folders, albums: lib.albums, artists: lib.artists, songs: lib.songs }));
  }, []);

  const removeLocalFolder = useCallback(async (path: string) => {
    if (!api.isTauri) return;
    const lib = await api.removeLocalFolder(path);
    setLocal((p) => ({ ...p, folders: lib.folders, albums: lib.albums, artists: lib.artists, songs: lib.songs }));
  }, []);

  const createLibraryPlaylist = useCallback(async (title: string) => {
    if (!api.isTauri) return '';
    const id = await api.createPlaylist(title);
    await loadLibrary(true);
    return id;
  }, [loadLibrary]);

  const syncSavedToYouTube = useCallback(async () => {
    if (!api.isTauri) return { synced: 0, failed: 0 };
    const toSync = unsynced(personal);
    let synced = 0; let failed = 0;
    for (const item of toSync) {
      try {
        if (item.kind === 'playlist') await api.addToPlaylist(item.id, '');
        synced++;
      } catch { failed++; }
    }
    return { synced, failed };
  }, [personal]);

  const playlists = mergeSaved(personal, library.items, 'playlist');
  const allAlbums = mergeSaved(personal, library.albums, 'album');
  const allArtists = mergeSaved(personal, library.artists, 'artist');
  const allItems = [...playlists, ...allAlbums, ...allArtists];
  const toSync = unsynced(personal);

  return (
    <LibraryContext.Provider value={{
      library, local, tab, setTab,
      loadLibrary, loadLibraryExtras, loadLocalLibrary,
      addLocalFolder, removeLocalFolder, createLibraryPlaylist, syncSavedToYouTube,
      playlists, allItems, toSync,
    }}>
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = () => {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be within LibraryProvider');
  return ctx;
};
