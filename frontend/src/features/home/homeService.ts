import { HomePage, BrowseItem, HomeChip } from './homeTypes';

/** Home service interface — abstraction over native Tauri API and browser fallback */
export interface HomeService {
	getHome(params?: string): Promise<HomePage>;
	getHomeMore(token: string): Promise<HomePage>;
	searchCards(query: string, category: string): Promise<BrowseItem[]>;
}

/** Browser development implementation — provides mock Home data for browser testing */
class BrowserHomeService implements HomeService {
	private static mockHomePage(params?: string): HomePage {
		const baseChips: HomeChip[] = [
			{ title: 'All', params: '' },
			{ title: 'Pop', params: 'mood_pop' },
			{ title: 'Rock', params: 'mood_rock' },
			{ title: 'Hip Hop', params: 'mood_hiphop' },
			{ title: 'Electronic', params: 'mood_electronic' },
			{ title: 'R&B', params: 'mood_rnb' },
			{ title: 'Country', params: 'mood_country' },
			{ title: 'Jazz', params: 'mood_jazz' }
		];

		const mockSections = [
			{
				title: 'Your mixes',
				items: Array.from({ length: 8 }, (_, i) => ({
					kind: 'playlist' as const,
					id: `mix-${i}`,
					title: `Mix ${i + 1}`,
					subtitle: 'Mixed for you',
					thumbnail: `https://picsum.photos/400/400?random=${100 + i}`,
					explicit: false
				})),
				moreBrowseId: 'mixes',
				moreParams: 'mixes'
			},
			{
				title: 'New releases',
				items: Array.from({ length: 8 }, (_, i) => ({
					kind: 'album' as const,
					id: `new-album-${i}`,
					title: `New Album ${i + 1}`,
					subtitle: 'Artist Name',
					thumbnail: `https://picsum.photos/400/400?random=${200 + i}`,
					explicit: false
				})),
				moreBrowseId: 'new-releases',
				moreParams: 'new_releases'
			},
			{
				title: 'Familiar Artists',
				items: Array.from({ length: 7 }, (_, i) => ({
					kind: 'artist' as const,
					id: `artist-${i}`,
					title: `Artist ${i + 1}`,
					subtitle: 'Verified',
					thumbnail: `https://picsum.photos/400/400?random=${300 + i}`,
					explicit: false
				}))
			},
			{
				title: 'From the community',
				items: Array.from({ length: 6 }, (_, i) => ({
					kind: 'playlist' as const,
					id: `community-${i}`,
					title: `Community Playlist ${i + 1}`,
					subtitle: 'Curated by fans',
					thumbnail: `https://picsum.photos/400/400?random=${400 + i}`,
					explicit: false
				}))
			},
			{
				title: 'Forgotten favourites',
				items: Array.from({ length: 15 }, (_, i) => ({
					kind: 'song' as const,
					id: `song-${i}`,
					title: `Song ${i + 1}`,
					subtitle: 'Artist Name',
					artistRuns: [{ text: 'Artist Name', id: `artist-${i}` }],
					thumbnail: `https://picsum.photos/400/400?random=${500 + i}`,
					explicit: i % 3 === 0,
					duration: '3:45',
					playCount: '1.2M'
				})),
				moreBrowseId: 'forgotten',
				moreParams: 'forgotten'
			},
			{
				title: 'Made for you',
				items: Array.from({ length: 8 }, (_, i) => ({
					kind: 'playlist' as const,
					id: `made-${i}`,
					title: `Made for you ${i + 1}`,
					subtitle: 'Based on your listening',
					thumbnail: `https://picsum.photos/400/400?random=${600 + i}`,
					explicit: false
				}))
			}
		];

		return {
			chips: baseChips.filter((c) => c.title !== 'Podcasts'),
			sections: mockSections,
			continuation: 'next-page-token'
		};
	}

	async getHome(params?: string): Promise<HomePage> {
		// Simulate network delay
		await new Promise((resolve) => setTimeout(resolve, 300));
		return BrowserHomeService.mockHomePage(params);
	}

	async getHomeMore(token: string): Promise<HomePage> {
		await new Promise((resolve) => setTimeout(resolve, 500));
		// Return additional sections for infinite scroll
		const more = BrowserHomeService.mockHomePage();
		return {
			...more,
			sections: more.sections.slice(0, 2),
			continuation: 'next-page-token-2'
		};
	}

	async searchCards(query: string, category: string): Promise<BrowseItem[]> {
		await new Promise((resolve) => setTimeout(resolve, 200));
		return Array.from({ length: 10 }, (_, i) => ({
			kind: 'playlist' as const,
			id: `search-${query}-${i}`,
			title: `${query} Result ${i + 1}`,
			subtitle: 'Search result',
			thumbnail: `https://picsum.photos/400/400?random=${700 + i}`,
			explicit: false
		}));
	}
}

/** Tauri/native implementation — calls actual Rust backend */
class TauriHomeService implements HomeService {
	async getHome(params?: string): Promise<HomePage> {
		const { invoke } = await import('@tauri-apps/api/core');
		return invoke<HomePage>('get_home', { params });
	}

	async getHomeMore(token: string): Promise<HomePage> {
		const { invoke } = await import('@tauri-apps/api/core');
		return invoke<HomePage>('get_home_more', { token });
	}

	async searchCards(query: string, category: string): Promise<BrowseItem[]> {
		const { invoke } = await import('@tauri-apps/api/core');
		return invoke<BrowseItem[]>('search_cards', { query, category });
	}
}

/** Factory to get the appropriate Home service */
export function createHomeService(): HomeService {
	// Check if we're in a Tauri environment
	if (typeof window !== 'undefined' && '__TAURI__' in window) {
		return new TauriHomeService();
	}
	// Browser development mode
	return new BrowserHomeService();
}

/** Singleton instance for the app */
let homeServiceInstance: HomeService | null = null;

export function getHomeService(): HomeService {
	if (!homeServiceInstance) {
		homeServiceInstance = createHomeService();
	}
	return homeServiceInstance;
}