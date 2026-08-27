import { useState, useEffect } from 'react';

/** Touch-first platform (phone/tablet UA). Constant for the session. */
export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' &&
    (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
}

/** True when running inside the mobile Android app (Tauri on Android). */
function isMobilePlatform(): boolean {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);
}

/**
 * Reactive hook: true when this is the mobile app or the viewport is < 768px.
 *
 * The Tauri Android build is always phone-first regardless of the WebView layout-viewport width
 * (edge-to-edge WebViews can report a CSS width ≥ 768px, which used to force the desktop layout —
 * leaving the phone without the top-bar hamburger/account and with desktop shelves overflowing).
 * A tablet in a browser keeps the width-based breakpoint.
 */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? isMobilePlatform() || window.innerWidth < 768 : false,
  );

  useEffect(() => {
    if (isMobilePlatform()) { setMobile(true); return; }
    const mq = window.matchMedia('(max-width: 767.98px)');
    setMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return mobile;
}

/** One-shot check (legacy, prefer useIsMobile). */
export function isMobile(): boolean {
  return typeof window !== 'undefined' && (isMobilePlatform() || window.innerWidth < 640);
}
