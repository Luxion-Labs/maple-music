// Mobile detection + the sidebar drawer state, shared by every component that needs to behave
// differently on a phone. UA-based because Tauri's platform cfg lives in Rust, not in the webview;
// `inTauri` (player.svelte.ts) covers the "no backend at all" case separately.
import { browser } from '$app/environment';

/** Touch-first device (phone/tablet). Constant for the tab's lifetime. */
export const isMobile = browser && /Android|iPhone|iPad/i.test(navigator.userAgent);

/** The off-canvas sidebar drawer (mobile only — desktop keeps the always-visible rail). */
export const drawer = $state({ open: false });

export function closeDrawer() {
	drawer.open = false;
}
