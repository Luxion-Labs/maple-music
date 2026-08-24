// Layout mode, shared by every component that needs to behave differently on a phone.
//
// Two different questions used to be answered by one UA sniff:
//   1. Is this a touch platform with no desktop OS chrome? (Android/iOS — never show a
//      titlebar, updater or resize borders, no matter how wide a tablet is.)
//   2. Should the layout be compact right now? That is purely a width question — an
//      Android tablet at 800px deserves the sidebar, and a narrow desktop window
//      deserves the mini-player. Answered live via matchMedia so rotation and window
//      resizes flip it instantly.
import { browser } from '$app/environment';

/** Touch-first platform (phone/tablet UA): skips desktop-only chrome and Rust commands
 *  (mini player widget, zoom, updater). Constant for the tab's lifetime. */
export const isTouchDevice: boolean = browser && /Android|iPhone|iPad/i.test(navigator.userAgent);

class Viewport {
	// Phone-style layout under Tailwind's `md` (768px), matching where the desktop grid
	// stops fitting. Seeded from the real width before first paint.
	current = $state(browser ? window.innerWidth < 768 : false);
}

export const vp = new Viewport();

if (browser) {
	const mq = window.matchMedia('(max-width: 767.98px)');
	vp.current = mq.matches;
	mq.addEventListener('change', (e) => (vp.current = e.matches));
}

/** True → render the compact layout: bottom nav instead of sidebar, mini-player strip,
 *  full-screen now-playing view. Reactive — call it inside any `{#if}`/`$derived`. */
export const isMobile = () => vp.current;
