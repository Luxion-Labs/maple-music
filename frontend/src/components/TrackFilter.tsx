import { Search, X } from 'lucide-react';
import { SongItem } from '../lib/api';

interface TrackFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Filter box for a track list (playlist / album header).
 * Purely client-side, over the rows already loaded.
 */
export function TrackFilter({ value, onChange, placeholder = 'Search this list' }: TrackFilterProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border bg-background/80 py-1.5 pl-3 pr-2 shadow-xs backdrop-blur focus-within:border-accent">
      <Search strokeWidth={2.5} className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-48 min-w-0 bg-transparent text-sm outline-hidden placeholder:text-muted-foreground"
        onKeyDown={(e) => e.key === 'Escape' && onChange('')}
      />
      {/* Holds its 1rem either way, so typing doesn't resize the box. */}
      <button
        className={`w-4 shrink-0 cursor-pointer text-muted-foreground transition hover:text-foreground ${
          !value ? 'invisible' : ''
        }`}
        onClick={() => onChange('')}
        aria-label="Clear search"
        tabIndex={value ? 0 : -1}
      >
        <X strokeWidth={2.5} className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Substring match over title, artist and album. Empty query returns the list untouched. */
export function filterTracks<T extends SongItem>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (t) =>
      t.title?.toLowerCase().includes(q) ||
      t.artists?.toLowerCase().includes(q) ||
      t.album?.toLowerCase().includes(q)
  );
}
