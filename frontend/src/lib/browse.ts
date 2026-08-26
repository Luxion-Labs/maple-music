/**
 * browse.ts — navigation + play helpers for BrowseItem.
 * Ported from ui/src/lib/browse.ts.
 */
import type { BrowseItem, SongItem } from './api';
import * as api from './api';

/** Route path for a browse item. */
export function hrefFor(item: BrowseItem): string {
  switch (item.kind) {
    case 'album':    return `/album/${encodeURIComponent(item.id)}`;
    case 'artist':   return `/artist/${encodeURIComponent(item.id)}`;
    case 'playlist': return `/playlist/${encodeURIComponent(item.id)}`;
    case 'song':     return '#';
  }
}

/** Navigate to the item's page (or play if it's a song). */
export function openItem(item: BrowseItem, navigate: (path: string) => void): void {
  if (item.kind === 'song') {
    playItem(item);
  } else {
    navigate(hrefFor(item));
  }
}

/** Convert a BrowseItem typed as song to a SongItem. */
export function asSong(item: BrowseItem): SongItem {
  return {
    video_id: item.id,
    title: item.title,
    artists: item.subtitle ?? '',
    thumbnail: item.thumbnail,
    duration: item.duration,
    explicit: item.explicit,
  } as SongItem;
}

/** Play a single BrowseItem (song plays immediately; album/playlist fetch-then-play). */
export async function playItem(item: BrowseItem): Promise<void> {
  if (!api.isTauri) return;
  if (item.kind === 'song') {
    await api.play(asSong(item));
  } else if (item.kind === 'album') {
    const page = await api.getAlbum(item.id);
    if (page.items.length) await api.playPlaylist(page.items, 0, page.playlistId, item.title);
  } else if (item.kind === 'playlist') {
    const page = await api.getPlaylist(item.id);
    if (page.items.length) await api.playPlaylist(page.items, 0, item.id, item.title);
  }
}

/** Add/queue a BrowseItem (fetch tracks first for album/playlist). */
export async function enqueueItem(item: BrowseItem, next: boolean): Promise<void> {
  if (!api.isTauri) return;
  if (item.kind === 'song') {
    const song = asSong(item);
    if (next) await api.playNext([song], item.title);
    else await api.addToQueue([song], item.title);
  } else if (item.kind === 'album') {
    const page = await api.getAlbum(item.id);
    if (next) await api.playNext(page.items, item.title);
    else await api.addToQueue(page.items, item.title);
  } else if (item.kind === 'playlist') {
    const page = await api.getPlaylist(item.id);
    if (next) await api.playNext(page.items, item.title);
    else await api.addToQueue(page.items, item.title);
  }
}
