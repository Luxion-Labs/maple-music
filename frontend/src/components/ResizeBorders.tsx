import React, { useEffect, useState } from 'react';
import { getMaximized, onWinChanged } from '../lib/win';

// Port of ui/src/lib/components/ResizeBorders.svelte — the window is undecorated
// (tauri.conf `decorations: false`), so the compositor no longer draws resize borders.
// These invisible strips along every edge/corner hand mousedown to the compositor's
// interactive resize. Hidden while maximized (no edges to grab).

type Dir =
  | 'North'
  | 'South'
  | 'East'
  | 'West'
  | 'NorthEast'
  | 'NorthWest'
  | 'SouthEast'
  | 'SouthWest';

// Edges are 4px, corners 8px (corners win by being later in the DOM at the overlap).
const HANDLES: { dir: Dir; cls: string }[] = [
  { dir: 'North', cls: 'top-0 inset-x-2 h-1 cursor-n-resize' },
  { dir: 'South', cls: 'bottom-0 inset-x-2 h-1 cursor-s-resize' },
  { dir: 'West', cls: 'left-0 inset-y-2 w-1 cursor-w-resize' },
  { dir: 'East', cls: 'right-0 inset-y-2 w-1 cursor-e-resize' },
  { dir: 'NorthWest', cls: 'top-0 left-0 h-2 w-2 cursor-nw-resize' },
  { dir: 'NorthEast', cls: 'top-0 right-0 h-2 w-2 cursor-ne-resize' },
  { dir: 'SouthWest', cls: 'bottom-0 left-0 h-2 w-2 cursor-sw-resize' },
  { dir: 'SouthEast', cls: 'bottom-0 right-0 h-2 w-2 cursor-se-resize' },
];

export const ResizeBorders: React.FC = () => {
  const [maximized, setMaximized] = useState(getMaximized);

  useEffect(() => onWinChanged(() => setMaximized(getMaximized())), []);

  const start = async (e: React.MouseEvent<HTMLDivElement>, dir: Dir) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    getCurrentWindow()
      .startResizeDragging(dir)
      .catch(() => {});
  };

  if (maximized) return null;

  return (
    <>
      {HANDLES.map((h) => (
        <div
          key={h.dir}
          className={`fixed z-[60] ${h.cls}`}
          onMouseDown={(e) => { void start(e, h.dir); }}
          aria-hidden="true"
        />
      ))}
    </>
  );
};
