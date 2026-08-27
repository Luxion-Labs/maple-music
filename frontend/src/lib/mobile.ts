import { useState, useEffect } from 'react';

/** Touch-first platform (phone/tablet UA). Constant for the session. */
export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' &&
    (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
}

/** Reactive hook: true when viewport < 768px (Tailwind md breakpoint). Updates on resize. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );

  useEffect(() => {
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
  return typeof window !== 'undefined' && window.innerWidth < 640;
}
