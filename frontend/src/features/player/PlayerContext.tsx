import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { NowPlaying, QueueState, RepeatMode, SongItem, Rating } from '../../lib/api';
import * as api from '../../lib/api';

interface PlayerState {
  now: NowPlaying | null;
  queue: QueueState;
  paused: boolean;
  position: number;
  duration: number;
  volume: number;
  speed: number;
  semitones: number;
  np: { open: boolean; tab: 'queue' | 'lyrics' };
  /** Songs queued for Add-to-Playlist modal (null = closed) */
  addToPlaylistSongs: SongItem[] | null;
}

interface PlayerActions {
  play: (song: SongItem) => Promise<void>;
  playIndex: (index: number) => Promise<void>;
  playNext: (items: SongItem[], from?: string) => Promise<void>;
  addToQueue: (items: SongItem[], from?: string, continuation?: string) => Promise<void>;
  playPlaylist: (items: SongItem[], start?: number, sourceId?: string, sourceName?: string, shuffle?: boolean, continuation?: string) => Promise<void>;
  startRadio: (kind: 'song' | 'artist' | 'album' | 'playlist', id: string, name?: string) => Promise<void>;
  nextTrack: () => Promise<void>;
  prevTrack: () => Promise<void>;
  removeFromQueue: (index: number) => Promise<void>;
  moveInQueue: (from: number, to: number) => Promise<void>;
  clearQueued: () => Promise<void>;
  toggleShuffle: () => Promise<void>;
  setRepeat: (mode: RepeatMode) => Promise<void>;
  cycleRepeat: () => Promise<void>;
  togglePause: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  dragVolume: (v: number) => void;
  commitVolume: (v: number) => Promise<void>;
  toggleMute: () => Promise<void>;
  setPlaybackParams: (speed: number, semitones: number) => Promise<void>;
  toggleNowPlayingLike: () => Promise<void>;
  openPlayer: () => void;
  setNpOpen: (open: boolean) => void;
  setNpTab: (tab: 'queue' | 'lyrics') => void;
  /** Open the add-to-playlist picker with these songs */
  openAddToPlaylist: (songs: SongItem[]) => void;
  closeAddToPlaylist: () => void;
  /** Rating helpers used by TrackRow/TrackMenu */
  ratingOf: (song: SongItem) => Rating;
  isLiked: (song: SongItem) => boolean;
  toggleRating: (song: SongItem, want: Rating) => Promise<void>;
  asSong: (item: { id: string; title: string; subtitle?: string; thumbnail?: string }) => SongItem;
}

type PlayerCtx = PlayerState & PlayerActions;

const defaultQueue: QueueState = {
  items: [],
  currentIndex: 0,
  playedFrom: 0,
  shuffle: false,
  repeat: 'off',
  sourceName: null,
};

const PlayerContext = createContext<PlayerCtx>({
  now: null, queue: defaultQueue, paused: true, position: 0, duration: 0,
  volume: 50, speed: 1, semitones: 0, addToPlaylistSongs: null,
  np: { open: false, tab: 'queue' },
  play: async () => {}, playIndex: async () => {}, playNext: async () => {},
  addToQueue: async () => {}, playPlaylist: async () => {}, startRadio: async () => {},
  nextTrack: async () => {}, prevTrack: async () => {}, removeFromQueue: async () => {},
  moveInQueue: async () => {}, clearQueued: async () => {}, toggleShuffle: async () => {},
  setRepeat: async () => {}, cycleRepeat: async () => {}, togglePause: async () => {},
  seek: async () => {}, setVolume: async () => {}, dragVolume: () => {},
  commitVolume: async () => {}, toggleMute: async () => {}, setPlaybackParams: async () => {},
  toggleNowPlayingLike: async () => {}, openPlayer: () => {}, setNpOpen: () => {}, setNpTab: () => {},
  openAddToPlaylist: () => {}, closeAddToPlaylist: () => {},
  ratingOf: () => 'indifferent', isLiked: () => false, toggleRating: async () => {},
  asSong: (item) => ({ video_id: item.id, title: item.title, artists: item.subtitle ?? '', thumbnail: item.thumbnail } as any),
});

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [now, setNow] = useState<NowPlaying | null>(null);
  const [queue, setQueue] = useState<QueueState>(defaultQueue);
  const [paused, setPaused] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(50);
  const [speed, setSpeed] = useState(1);
  const [semitones, setSemitones] = useState(0);
  const [np, setNpState] = useState({ open: false, tab: 'queue' as 'queue' | 'lyrics' });
  const [addToPlaylistSongs, setAddToPlaylistSongs] = useState<SongItem[] | null>(null);
  const preMute = useRef(50);
  // ratings cache: videoId → Rating
  const [ratings, setRatings] = useState<Record<string, Rating>>({});

  // Init from backend
  useEffect(() => {
    if (!api.isTauri) return;
    api.getPlayback().then((snap) => {
      if (snap.now) setNow(snap.now);
      setPaused(snap.paused);
      setPosition(snap.position);
      setDuration(snap.duration);
      setVolumeState(snap.volume);
    }).catch(() => {});
    api.getQueue().then(setQueue).catch(() => {});
  }, []);

  // Tauri event listeners
  useEffect(() => {
    if (!api.isTauri) return;
    const cleanup: (() => void)[] = [];
    let mounted = true;
    (async () => {
      const u = await api.onNowPlaying((n) => { if (mounted) setNow(n); });
      cleanup.push(u);
      const u2 = await api.onQueueChanged((q) => { if (mounted) setQueue(q); });
      cleanup.push(u2);
      const u3 = await api.onQueueIndex((qi) => {
        if (!mounted) return;
        setQueue((prev) => ({
          ...prev,
          currentIndex: qi.currentIndex,
          playedFrom: qi.playedFrom ?? prev.playedFrom,
          shuffle: qi.shuffle ?? prev.shuffle,
          repeat: qi.repeat ?? prev.repeat,
          sourceName: qi.sourceName ?? prev.sourceName,
        }));
      });
      cleanup.push(u3);
      const u4 = await api.onPosition((p) => { if (mounted) setPosition(p); });
      cleanup.push(u4);
      const u5 = await api.onDuration((d) => { if (mounted) setDuration(d); });
      cleanup.push(u5);
      const u6 = await api.onPlaybackState((s) => { if (mounted) setPaused(s === 'paused'); });
      cleanup.push(u6);
      const u7 = await api.onVolume((v) => { if (mounted) setVolumeState(v); });
      cleanup.push(u7);
    })();
    return () => { mounted = false; cleanup.forEach((u) => u()); };
  }, []);

  // Actions
  const cycleRepeat = useCallback(async () => {
    const next: RepeatMode = queue.repeat === 'off' ? 'all' : queue.repeat === 'all' ? 'one' : 'off';
    if (api.isTauri) await api.setRepeat(next);
    else setQueue((q) => ({ ...q, repeat: next }));
  }, [queue.repeat]);

  const toggleNowPlayingLike = useCallback(async () => {
    if (!now || !api.isTauri) return;
    const cur = now.rating ?? 'indifferent';
    const next: Rating = cur === 'like' ? 'indifferent' : 'like';
    setNow((n) => n ? { ...n, rating: next } : n);
    await api.rate(now.videoId, next);
  }, [now]);

  const dragVolume = useCallback((v: number) => setVolumeState(v), []);
  const commitVolume = useCallback(async (v: number) => {
    setVolumeState(v);
    if (api.isTauri) await api.setVolume(v);
  }, []);

  const toggleMute = useCallback(async () => {
    if (volume === 0) {
      await commitVolume(preMute.current || 50);
    } else {
      preMute.current = volume;
      await commitVolume(0);
    }
  }, [volume, commitVolume]);

  const openPlayer = useCallback(() => setNpState({ open: true, tab: 'queue' }), []);
  const setNpOpen = useCallback((open: boolean) => setNpState((p) => ({ ...p, open })), []);
  const setNpTab = useCallback((tab: 'queue' | 'lyrics') => setNpState((p) => ({ ...p, tab })), []);

  const tauriOr = (fn: () => Promise<void>) => api.isTauri ? fn() : Promise.resolve();

  return (
    <PlayerContext.Provider value={{
      now, queue, paused, position, duration, volume, speed, semitones, np,
      play: (song) => tauriOr(() => api.play(song)),
      playIndex: (i) => tauriOr(() => api.playIndex(i)),
      playNext: (items, from) => tauriOr(() => api.playNext(items, from)),
      addToQueue: (items, from, cont) => tauriOr(() => api.addToQueue(items, from, cont)),
      playPlaylist: (items, start, sid, sname, shuf, cont) => tauriOr(() =>
        api.playNext(items, sname).then()),  // simplified for browser; Tauri routes through playPlaylist command
      startRadio: (kind, id, name) => tauriOr(() => api.startRadio(kind, id, name)),
      nextTrack: () => tauriOr(() => api.nextTrack()),
      prevTrack: () => tauriOr(() => api.prevTrack()),
      removeFromQueue: (i) => tauriOr(() => api.removeFromQueue(i)),
      moveInQueue: (f, t) => tauriOr(() => api.moveInQueue(f, t)),
      clearQueued: () => tauriOr(() => api.clearQueued()),
      toggleShuffle: () => tauriOr(() => api.toggleShuffle()),
      setRepeat: (m) => tauriOr(() => api.setRepeat(m)),
      cycleRepeat,
      togglePause: () => tauriOr(() => api.togglePause()),
      seek: (p) => tauriOr(() => api.seek(p)),
      setVolume: (v) => commitVolume(v),
      dragVolume, commitVolume, toggleMute,
      setPlaybackParams: (s, sem) => tauriOr(() => api.setPlaybackParams(s, sem)),
      toggleNowPlayingLike,
      openPlayer, setNpOpen, setNpTab,
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);
