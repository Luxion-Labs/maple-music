/** Keyed in-memory cache for Home browse pages — ported from Svelte ui/src/lib/pagecache.ts */

const TTL_MS = 5 * 60_000;
const MAX_ENTRIES = 80;

const store = new Map<string, { data: unknown; at: number }>();

export function getCached<T>(key: string): T | null {
	const e = store.get(key);
	if (!e) return null;
	if (Date.now() - e.at > TTL_MS) {
		store.delete(key);
		return null;
	}
	return e.data as T;
}

export function putCached(key: string, data: unknown): void {
	if (store.size >= MAX_ENTRIES && !store.has(key)) {
		const oldest = store.keys().next().value;
		if (oldest !== undefined) store.delete(oldest);
	}
	store.delete(key);
	store.set(key, { data, at: Date.now() });
}

export function invalidateCached(key: string): void {
	store.delete(key);
}

export function clearCached(): void {
	store.clear();
}