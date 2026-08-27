// Port of ui/src/lib/win.svelte.ts — shared window-maximized state (the resize borders hide
// when maximized, and the root drops its rounded corners). One listener, initialized once.
import type { getCurrentWindow as _g } from '@tauri-apps/api/window';

type WinLike = Awaited<ReturnType<typeof _g>> | null;

const state: { maximized: boolean; listeners: Set<() => void> } = {
  maximized: false,
  listeners: new Set(),
};

let win: WinLike = null;
let started = false;

function notify(): void {
  for (const l of state.listeners) l();
}

function setMaximized(m: boolean): void {
  if (state.maximized === m) return;
  state.maximized = m;
  notify();
}

async function getWin(): Promise<WinLike> {
  if (win) return win;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  win = getCurrentWindow() as WinLike;
  return win;
}

function subscribe(listener: () => void): () => void {
  state.listeners.add(listener);
  return () => state.listeners.delete(listener);
}

function getMaximized(): boolean {
  return state.maximized;
}

export async function initWin(): Promise<() => void> {
  const w = await getWin();
  if (!w) return () => {};
  if (started) return () => {};
  started = true;
  // Restore the previous size before anything is on screen; then show the window.
  w.show().catch(() => {});
  const sync = () => w.isMaximized().then(setMaximized).catch(() => {});
  await sync();
  const un = await w.onResized(sync);
  return un;
}

export async function minimize(): Promise<void> {
  const w = await getWin();
  w?.minimize().catch(() => {});
}

export async function toggleMaximize(): Promise<void> {
  const w = await getWin();
  w?.toggleMaximize().catch(() => {});
}

export async function closeWindow(): Promise<void> {
  const w = await getWin();
  w?.close().catch(() => {});
}

export { subscribe as onWinChanged, getMaximized };
