/**
 * Home feature types.
 * Re-exports shared types from lib/api and adds home-specific ones.
 */
export type {
  BrowseItem, ArtistRun, HomeSection, HomeChip, HomePage,
  SongItem, Account,
} from '../../lib/api';

export interface Pick {
  kind: import('../../lib/api').BrowseItem['kind'];
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  duration?: string;
  artistRuns?: import('../../lib/api').ArtistRun[];
  playCount?: string;
  explicit?: boolean;
  lastUsedAt: number;
}

export interface RecentEntry {
  kind: import('../../lib/api').BrowseItem['kind'];
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  duration?: string;
  artistRuns?: import('../../lib/api').ArtistRun[];
  playCount?: string;
  explicit?: boolean;
  at: number;
}

export interface Saved {
  kind: import('../../lib/api').BrowseItem['kind'];
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  duration?: string;
  explicit?: boolean;
  synced?: boolean;
}

export interface Personal {
  picks: Pick[];
  saved: Saved[];
  pins: string[];
  recent: Record<string, RecentEntry>;
  artists: Record<string, { name: string; count: number }>;
  dismissedSeeds: string[];
  home: { order: string[]; hidden: string[] };
}

export interface HomeBlock {
  id: string;
  key: string;
  title: string;
  shelf?: import('../../lib/api').HomeSection;
}

export const MAX_PICKS = 18;
export const MAX_PINS = 3;
export const MAX_RECENT = 100;
export const MAX_ARTISTS = 100;
export const ON_REPEAT_ID = 'MAPLE_ON_REPEAT';
export const ON_REPEAT_SEED_MIN = 5;
export const RECENT_KEY = '@recent';
export const FAMILIAR_KEY = '@familiar';
export const FORGOTTEN_KEY = '@forgotten';
