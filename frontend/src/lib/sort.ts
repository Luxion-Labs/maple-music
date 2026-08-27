import type { SongItem } from './api';

export type SortKey = 'default' | 'title' | 'artist' | 'album' | 'duration' | 'plays';

const SORT_KEY = 'maple:playlist-sort';

export function loadSort(playlistId: string): SortKey {
  try {
    const saved = JSON.parse(localStorage.getItem(SORT_KEY) ?? '{}');
    return (saved[playlistId] as SortKey) ?? 'default';
  } catch {
    return 'default';
  }
}

export function saveSort(playlistId: string, sort: SortKey): void {
  try {
    const saved = JSON.parse(localStorage.getItem(SORT_KEY) ?? '{}');
    saved[playlistId] = sort;
    localStorage.setItem(SORT_KEY, JSON.stringify(saved));
  } catch {}
}

export function sortItems(items: SongItem[], sort: SortKey): SongItem[] {
  if (sort === 'default') return items;
  return [...items].sort((a, b) => {
    switch (sort) {
      case 'title': return a.title.localeCompare(b.title);
      case 'artist': return (a.artists ?? '').localeCompare(b.artists ?? '');
      case 'album': return (a.album ?? '').localeCompare(b.album ?? '');
      case 'duration': {
        const parse = (d?: string) => {
          if (!d) return 0;
          const parts = d.split(':').map(Number);
          return parts.reduce((acc, n) => acc * 60 + n, 0);
        };
        return parse(a.duration) - parse(b.duration);
      }
      case 'plays': return Number(b.play_count ?? 0) - Number(a.play_count ?? 0);
      default: return 0;
    }
  });
}
