/** Returns true when running on a touch / mobile device. */
export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' &&
    (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
}

/** Returns true when the viewport is phone-width (< 640px). */
export function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 640;
}
