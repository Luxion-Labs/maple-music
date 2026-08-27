/** Search feature types — ported from Svelte ui/src/lib/api.ts */

import { BrowseItem } from '../home/homeTypes';

export interface SearchResults {
	top: BrowseItem[];
	songs: BrowseItem[];
	albums: BrowseItem[];
	artists: BrowseItem[];
	playlists: BrowseItem[];
}

export interface SearchSection {
	key: 'top' | 'songs' | 'albums' | 'artists' | 'playlists';
	label: string;
	items: BrowseItem[];
	max: number;
	more: boolean;
	list: boolean;
}

export type SearchCategory = 'songs' | 'albums' | 'artists' | 'playlists';

export interface SearchMoreResult {
	songs: import('../home/homeTypes').SongItem[];
	cards: BrowseItem[];
}

export const SEARCH_CATEGORIES: { key: SearchCategory; label: string }[] = [
	{ key: 'songs', label: 'Songs' },
	{ key: 'albums', label: 'Albums' },
	{ key: 'artists', label: 'Artists' },
	{ key: 'playlists', label: 'Playlists' }
];

export function getCategoryLabel(cat: SearchCategory): string {
	return SEARCH_CATEGORIES.find((c) => c.key === cat)?.label ?? cat;
}