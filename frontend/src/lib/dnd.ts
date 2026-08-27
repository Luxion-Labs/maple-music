import type { BrowseItem } from './api';

const MIME = 'application/x-maple-item';

/** Attach the browse item to a drag event. */
export function setDragItem(e: React.DragEvent, item: BrowseItem): void {
  e.dataTransfer.setData(MIME, JSON.stringify(item));
  e.dataTransfer.effectAllowed = 'move';
}

/** Extract a browse item from a drop event. Returns null if none. */
export function getDragItem(e: React.DragEvent): BrowseItem | null {
  try {
    const raw = e.dataTransfer.getData(MIME);
    if (!raw) return null;
    return JSON.parse(raw) as BrowseItem;
  } catch {
    return null;
  }
}

/** Returns true if the drag event carries a maple item. */
export function hasDragItem(e: React.DragEvent): boolean {
  return e.dataTransfer.types.includes(MIME);
}
