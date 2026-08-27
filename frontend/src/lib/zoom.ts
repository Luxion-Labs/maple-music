// Port of ui/src/lib/zoom.ts — Ctrl+wheel / Ctrl+± zoom with a sane ceiling.
// Tauri's built-in zoomHotkeys caps at 1000%, which shreds the layout (fixed chrome
// overlaps, player bar eats the page). Same hotkeys, our own range. Not persisted:
// zoom resets with the window.
const MIN = 0.2;
const MAX = 1.8;
const STEP = 0.2;

let level = 1;

async function apply(next: number): Promise<void> {
  next = Math.min(Math.max(next, MIN), MAX);
  if (next === level) return;
  level = next;
  const { getCurrentWebview } = await import('@tauri-apps/api/webview');
  getCurrentWebview()
    .setZoom(level)
    .catch(() => {});
}

export function initZoom(): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    if (e.key === '-') void apply(level - STEP);
    else if (e.key === '=' || e.key === '+') void apply(level + STEP);
    else if (e.key === '0') void apply(1);
  };
  const onWheel = (e: WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    void apply(level + (e.deltaY < 0 ? STEP : -STEP));
  };
  window.addEventListener('keydown', onKey);
  window.addEventListener('wheel', onWheel, { passive: false });
  return () => {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('wheel', onWheel);
  };
}
