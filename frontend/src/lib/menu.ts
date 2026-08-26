/** Menu positioning — anchors a fixed popup to a trigger element. */
export interface MenuAnchor {
  /** Distance from right edge of viewport */
  right: number;
  /** Distance from top or bottom edge, depending on openUp */
  y: number;
  openUp: boolean;
}

export function anchorMenu(trigger: HTMLElement, minWidth = 176): MenuAnchor {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUp = spaceBelow < 240 && rect.top > spaceBelow;
  const right = Math.max(0, window.innerWidth - rect.right);
  const y = openUp
    ? window.innerHeight - rect.top
    : rect.bottom;
  return { right, y, openUp };
}
