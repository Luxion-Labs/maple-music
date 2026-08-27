import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { BrowseItem } from '../../lib/api';
import {
  Personal, Pick, RecentEntry,
  emptyPersonal, loadPersonal, savePersonal,
  addPick as _addPick, placePick as _placePick, removePick as _removePick,
  touchPick as _touchPick, toggleSaved as _toggleSaved, isSaved as _isSaved,
  togglePin as _togglePin, noteRecent as _noteRecent, recentItems as _recentItems,
  topArtistIds as _topArtistIds, topArtists as _topArtists, seedPick as _seedPick,
  saveHomeLayout as _saveHomeLayout, noteArtist as _noteArtist,
} from './personal';
import { ON_REPEAT_ID, ON_REPEAT_SEED_MIN } from './homeTypes';
import * as api from '../../lib/api';

interface PersonalCtx {
  personal: Personal;
  addPick: (item: BrowseItem) => boolean;
  placePick: (item: BrowseItem, beforeId: string | null) => void;
  removePick: (id: string) => void;
  touchPick: (id: string) => boolean;
  toggleSaved: (item: BrowseItem) => boolean;
  isSaved: (id: string) => boolean;
  togglePin: (id: string) => 'pinned' | 'unpinned' | 'full';
  noteRecent: (item: BrowseItem) => void;
  recentItems: (n?: number) => RecentEntry[];
  topArtistIds: (n?: number) => string[];
  topArtists: (n?: number) => string[];
  noteArtist: (key: string, name: string) => void;
  saveHomeLayout: (order: string[], hidden: string[]) => void;
  seedOnRepeatPick: () => Promise<void>;
}

const PersonalContext = createContext<PersonalCtx>({
  personal: emptyPersonal(),
  addPick: () => false,
  placePick: () => {},
  removePick: () => {},
  touchPick: () => false,
  toggleSaved: () => false,
  isSaved: () => false,
  togglePin: () => 'unpinned',
  noteRecent: () => {},
  recentItems: () => [],
  topArtistIds: () => [],
  topArtists: () => [],
  noteArtist: () => {},
  saveHomeLayout: () => {},
  seedOnRepeatPick: async () => {},
});

export const PersonalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [personal, setPersonal] = useState<Personal>(loadPersonal);

  useEffect(() => {
    const h = () => setPersonal(loadPersonal());
    window.addEventListener('storage', h);
    return () => window.removeEventListener('storage', h);
  }, []);

  // Mutate-then-persist helper — avoids double renders
  const mutate = useCallback((fn: (p: Personal) => void) => {
    setPersonal((prev) => {
      const next: Personal = JSON.parse(JSON.stringify(prev));
      fn(next);
      savePersonal(next);
      return next;
    });
  }, []);

  const addPick = useCallback((item: BrowseItem) => {
    let added = false;
    mutate((p) => { added = _addPick(p, item); });
    return added;
  }, [mutate]);

  const placePick = useCallback((item: BrowseItem, beforeId: string | null) => {
    mutate((p) => _placePick(p, item, beforeId));
  }, [mutate]);

  const removePick = useCallback((id: string) => {
    mutate((p) => _removePick(p, id));
  }, [mutate]);

  const touchPick = useCallback((id: string) => {
    let touched = false;
    mutate((p) => { touched = _touchPick(p, id); });
    return touched;
  }, [mutate]);

  const toggleSaved = useCallback((item: BrowseItem) => {
    let saved = false;
    mutate((p) => { saved = _toggleSaved(p, item); });
    return saved;
  }, [mutate]);

  const isSaved = useCallback((id: string) => _isSaved(personal, id), [personal]);

  const togglePin = useCallback((id: string) => {
    let result: 'pinned' | 'unpinned' | 'full' = 'unpinned';
    mutate((p) => { result = _togglePin(p, id); });
    return result;
  }, [mutate]);

  const noteRecent = useCallback((item: BrowseItem) => {
    mutate((p) => _noteRecent(p, item));
  }, [mutate]);

  const recentItems = useCallback((n = 12) => _recentItems(personal, n), [personal]);
  const topArtistIds = useCallback((n = 7) => _topArtistIds(personal, n), [personal]);
  const topArtists = useCallback((n = 3) => _topArtists(personal, n), [personal]);

  const noteArtist = useCallback((key: string, name: string) => {
    mutate((p) => _noteArtist(p, key, name));
  }, [mutate]);

  const saveHomeLayout = useCallback((order: string[], hidden: string[]) => {
    mutate((p) => _saveHomeLayout(p, order, hidden));
  }, [mutate]);

  const seedOnRepeatPick = useCallback(async () => {
    try {
      if (!api.isTauri) return;
      const pl = await api.getPlaylist(ON_REPEAT_ID);
      if (pl.items.length >= ON_REPEAT_SEED_MIN) {
        mutate((p) => _seedPick(p, { kind: 'playlist', id: ON_REPEAT_ID, title: pl.title ?? 'On Repeat', subtitle: 'Your most played' }));
      }
    } catch { /* no tile this time */ }
  }, [mutate]);

  return (
    <PersonalContext.Provider value={{
      personal, addPick, placePick, removePick, touchPick, toggleSaved, isSaved,
      togglePin, noteRecent, recentItems, topArtistIds, topArtists, noteArtist,
      saveHomeLayout, seedOnRepeatPick,
    }}>
      {children}
    </PersonalContext.Provider>
  );
};

export const usePersonal = () => useContext(PersonalContext);
