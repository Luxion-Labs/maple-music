/**
 * Queue block logic — React port of ui/src/lib/queue.ts
 * Kept as a pure function so it can be tested independently of the DOM.
 */
import type { QueueState, SongItem } from './api';

export interface QueueRow {
  item: SongItem;
  /** video_id + occurrence, so keys stay stable for list animations. */
  key: string;
  /** Index in the backend queue — what playIndex / removeFromQueue act on. */
  i: number;
}

export interface QueueBlock {
  key: string;
  kind: string;
  heading: string;
  autoplay: boolean;
  clearable: boolean;
  rows: QueueRow[];
}

export function queueBlocks(q: QueueState): {
  earlier: QueueRow[];
  earlierHeading: string;
  prev: QueueRow[];
  now: QueueRow | null;
  blocks: QueueBlock[];
} {
  const { items, currentIndex, sourceName } = q;
  const playedFrom = Math.min(q.playedFrom ?? currentIndex, currentIndex);
  const seen = new Map<string, number>();

  const row = (i: number): QueueRow => {
    const item = items[i];
    const occ = seen.get(item.video_id) ?? 0;
    seen.set(item.video_id, occ + 1);
    return { item, key: `${item.video_id}:${occ}`, i };
  };

  const earlier: QueueRow[] = [];
  const prev: QueueRow[] = [];
  for (let i = 0; i < currentIndex; i++) {
    const r = row(i);
    (i >= playedFrom ? prev : earlier).push(r);
  }

  const now = items[currentIndex] ? row(currentIndex) : null;

  let shuffledFrom = items.length;
  if (q.shuffle) {
    shuffledFrom = currentIndex + 1;
    while (items[shuffledFrom]?.queued) shuffledFrom++;
  }

  const blocks: QueueBlock[] = [];
  let cleared = false;
  for (let i = currentIndex + 1; i < items.length; i++) {
    const r = row(i);
    const it = r.item;
    const manual = !!(it.queued || it.queued_end);
    const kind = it.autoplay
      ? 'auto'
      : i >= shuffledFrom
        ? 'shuffled'
        : manual
          ? `manual:${it.queued_from ?? ''}`
          : 'context';
    const last = blocks.at(-1);
    if (last?.kind === kind) { last.rows.push(r); continue; }
    blocks.push({ key: r.key, kind, heading: '', autoplay: !!it.autoplay, clearable: false, rows: [r] });
  }

  for (const block of blocks) {
    block.heading = headingFor(block, sourceName);
    const manual = block.rows.some((r) => r.item.queued || r.item.queued_end);
    block.clearable = manual && !cleared;
    if (block.clearable) cleared = true;
  }

  const earlierName = sharedOrigin(earlier, sourceName);
  return {
    earlier,
    earlierHeading: earlierName ? `Earlier from: ${earlierName}` : 'Earlier',
    prev,
    now,
    blocks,
  };
}

export function moveTarget(from: number, dropAt: number): number | null {
  const to = dropAt > from ? dropAt - 1 : dropAt;
  return to === from ? null : to;
}

function sharedOrigin(rows: QueueRow[], sourceName?: string | null): string | null {
  const names = new Set(
    rows.map((r) => r.item.queued_from ?? (r.item.queued || r.item.queued_end ? '' : (sourceName ?? '')))
  );
  const [name] = names;
  return names.size === 1 && name ? name : null;
}

function headingFor(block: QueueBlock, sourceName?: string | null): string {
  if (block.autoplay) return 'Autoplay';
  const name = sharedOrigin(block.rows, sourceName);
  if (name) return `Next from: ${name}`;
  return block.rows.every((r) => r.item.queued || r.item.queued_end) ? 'Next in queue' : 'Next up';
}
