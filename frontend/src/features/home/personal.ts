import type { Personal, Pick, RecentEntry, Saved } from './homeTypes';
import type { BrowseItem } from '../../lib/api';
import { MAX_PICKS, MAX_PINS, MAX_RECENT, MAX_ARTISTS } from './homeTypes';

export type { Personal, Pick, RecentEntry, Saved };

const PERSONAL_KEY = 'maple:personal';

export function emptyPersonal(): Personal {
  return {
    picks: [], saved: [], pins: [], recent: {}, artists: {},
    dismissedSeeds: [], home: { order: [], hidden: [] },
  };
}

export function hydratePersonal(raw: unknown): Personal {
  const base = emptyPersonal();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Partial<Personal>;
  if (Array.isArray(o.picks)) base.picks = o.picks.filter((p) => p && typeof p.id === 'string');
  if (Array.isArray(o.saved)) base.saved = o.saved.filter((s) => s && typeof s.id === 'string');
  if (Array.isArray(o.pins)) base.pins = o.pins.filter((p) => typeof p === 'string').slice(0, MAX_PINS);
  if (o.recent && typeof o.recent === 'object') base.recent = o.recent;
  if (o.artists && typeof o.artists === 'object') base.artists = o.artists;
  if (Array.isArray(o.dismissedSeeds)) base.dismissedSeeds = o.dismissedSeeds.filter((d) => typeof d === 'string');
  if (o.home && typeof o.home === 'object') {
    const h = o.home as Partial<Personal['home']>;
    const keys = (v: unknown) => Array.isArray(v) ? v.filter((k): k is string => typeof k === 'string') : [];
    base.home = { order: keys(h.order), hidden: keys(h.hidden) };
    if (base.home.order.length && !base.home.order.includes('@familiar')) {
      const at = base.home.order.indexOf('@recent');
      base.home.order.splice(at < 0 ? base.home.order.length : at + 1, 0, '@familiar');
    }
  }
  return base;
}

function evictStalest(p: Personal): void {
  while (p.picks.length > MAX_PICKS) {
    const stalest = p.picks.reduce((a, b) => b.lastUsedAt < a.lastUsedAt ? b : a);
    p.picks = p.picks.filter((x) => x !== stalest);
  }
}

export function addPick(p: Personal, item: BrowseItem, now = Date.now()): boolean {
  const existing = p.picks.find((x) => x.id === item.id);
  if (existing) { existing.lastUsedAt = now; return false; }
  p.picks.push({ ...item, lastUsedAt: now });
  evictStalest(p);
  return true;
}

export function placePick(p: Personal, item: BrowseItem, beforeId: string | null, now = Date.now()): void {
  if (beforeId === item.id) return;
  const existing = p.picks.find((x) => x.id === item.id);
  const rest = p.picks.filter((x) => x.id !== item.id);
  const tile: Pick = existing ?? { ...item, lastUsedAt: now };
  const at = beforeId ? rest.findIndex((x) => x.id === beforeId) : -1;
  if (at < 0) rest.push(tile); else rest.splice(at, 0, tile);
  p.picks = rest;
  evictStalest(p);
}

export function seedPick(p: Personal, item: BrowseItem, now = Date.now()): boolean {
  if (p.picks.length >= MAX_PICKS) return false;
  if (p.dismissedSeeds.includes(item.id)) return false;
  if (p.picks.some((x) => x.id === item.id)) return false;
  p.picks.push({ ...item, lastUsedAt: now });
  return true;
}

export function removePick(p: Personal, id: string): void {
  p.picks = p.picks.filter((x) => x.id !== id);
  if (!p.dismissedSeeds.includes(id)) p.dismissedSeeds.push(id);
}

export function touchPick(p: Personal, id: string, now = Date.now()): boolean {
  const hit = p.picks.find((x) => x.id === id);
  if (!hit) return false;
  hit.lastUsedAt = now;
  return true;
}

export function toggleSaved(p: Personal, item: BrowseItem): boolean {
  if (p.saved.some((s) => s.id === item.id)) {
    p.saved = p.saved.filter((s) => s.id !== item.id);
    return false;
  }
  p.saved = [{ ...item }, ...p.saved];
  return true;
}

export const isSaved = (p: Personal, id: string): boolean => p.saved.some((s) => s.id === id);
export const isSynced = (p: Personal, id: string): boolean => p.saved.some((s) => s.id === id && s.synced === true);
export const unsynced = (p: Personal): Saved[] => p.saved.filter((s) => !s.synced);

export function mergeSaved(p: Personal, items: BrowseItem[], kind: BrowseItem['kind']): BrowseItem[] {
  const local = p.saved.filter((s) => s.kind === kind);
  if (!local.length) return items;
  const have = new Set(items.map((i) => i.id));
  return [...local.filter((s) => !have.has(s.id)), ...items];
}

export function togglePin(p: Personal, id: string): 'pinned' | 'unpinned' | 'full' {
  if (p.pins.includes(id)) { p.pins = p.pins.filter((x) => x !== id); return 'unpinned'; }
  if (p.pins.length >= MAX_PINS) return 'full';
  p.pins.push(id);
  return 'pinned';
}

export function noteRecent(p: Personal, item: BrowseItem, now = Date.now()): void {
  p.recent[item.id] = { ...item, at: now };
  const ids = Object.keys(p.recent);
  if (ids.length > MAX_RECENT) {
    for (const id of ids.sort((a, b) => p.recent[b].at - p.recent[a].at).slice(MAX_RECENT)) {
      delete p.recent[id];
    }
  }
}

export function recentItems(p: Personal, n = 12): RecentEntry[] {
  return Object.values(p.recent).sort((a, b) => b.at - a.at).slice(0, n);
}

export function noteArtist(p: Personal, key: string, name: string): void {
  const cur = p.artists[key];
  if (cur) { cur.count++; if (name) cur.name = name; }
  else p.artists[key] = { name, count: 1 };
  const keys = Object.keys(p.artists);
  if (keys.length > MAX_ARTISTS) {
    for (const k of keys.sort((a, b) => p.artists[b].count - p.artists[a].count).slice(MAX_ARTISTS)) {
      delete p.artists[k];
    }
  }
}

export function topArtistIds(p: Personal, n = 7): string[] {
  return Object.entries(p.artists)
    .filter(([id]) => id.startsWith('UC'))
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, n)
    .map(([id]) => id);
}

export function topArtists(p: Personal, n = 3): string[] {
  return Object.values(p.artists)
    .filter((a) => a.name)
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
    .map((a) => a.name);
}

export function interleave<T extends { id: string }>(lists: T[][], cap: number): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  const longest = lists.reduce((m, l) => Math.max(m, l.length), 0);
  for (let i = 0; i < longest && out.length < cap; i++) {
    for (const list of lists) {
      if (out.length >= cap) break;
      const item = list[i];
      if (item && !seen.has(item.id)) { seen.add(item.id); out.push(item); }
    }
  }
  return out;
}

export function arrangeSections<T extends { key: string }>(sections: T[], p: Personal): T[] {
  const ranks = new Map(p.home.order.map((key, i) => [key, i]));
  const rank = (key: string) => ranks.get(key) ?? Number.MAX_SAFE_INTEGER;
  return sections.slice().sort((a, b) => rank(a.key) - rank(b.key));
}

export const hiddenSections = (p: Personal): Set<string> => new Set(p.home.hidden);

/**
 * Pinned first in pin order, then everything else by last played (ties and never-played items keep
 * the backend's order). Pinned ids are resolved through the live list and excluded from the tail,
 * so a playlist can never appear twice and a pin left over from a deleted playlist just vanishes.
 */
export function orderLibrary(items: BrowseItem[], p: Personal): BrowseItem[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const pinned = p.pins.map((id) => byId.get(id)).filter((i): i is BrowseItem => !!i);
  const pinnedIds = new Set(pinned.map((i) => i.id));
  const rest = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => !pinnedIds.has(item.id))
    .sort(
      (a, b) =>
        (p.recent[b.item.id]?.at ?? 0) - (p.recent[a.item.id]?.at ?? 0) || a.index - b.index
    )
    .map(({ item }) => item);
  return [...pinned, ...rest];
}

export function saveHomeLayout(p: Personal, order: string[], hidden: string[]): void {
  p.home = { order, hidden };
}

export function loadPersonal(): Personal {
  if (typeof window === 'undefined') return emptyPersonal();
  try { return hydratePersonal(JSON.parse(localStorage.getItem(PERSONAL_KEY) ?? 'null')); }
  catch { return emptyPersonal(); }
}

export function savePersonal(p: Personal): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(PERSONAL_KEY, JSON.stringify(p)); } catch { /* quota */ }
}
