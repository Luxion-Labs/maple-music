import React, { useState, useRef, useCallback } from 'react';
import { Search, Music, User } from 'lucide-react';
import type { BrowseItem, SearchResults } from '../lib/api';
import * as api from '../lib/api';
import { getCached, putCached } from '../features/home/pageCache';
import { openItem } from '../lib/browse';
import { thumb } from '../lib/thumb';
import { Skeleton } from './ui/Skeleton';
import { ExplicitIcon } from './ExplicitIcon';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

const KIND: Record<string, string> = { song: 'Song', album: 'Album', artist: 'Artist', playlist: 'Playlist' };

function preview(r: SearchResults): BrowseItem[] {
  const out: BrowseItem[] = [];
  const seen = new Set<string>();
  const take = (from: BrowseItem[], n: number) => {
    for (const i of from) {
      if (n <= 0) break;
      if (seen.has(i.id)) continue;
      seen.add(i.id); out.push(i); n--;
    }
  };
  take(r.top, 1); take(r.songs, 3); take(r.artists, 1); take(r.albums, 1); take(r.playlists, 1);
  return out;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputClass?: string;
  panelClass?: string;
  onPick?: () => void;
  onSubmit?: () => void;
}

export const SearchSuggest: React.FC<Props> = ({
  value, onChange, placeholder = 'Search', inputClass = '', panelClass = 'left-0 right-0',
  onPick, onSubmit,
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const loadedFor = useRef('');
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const close = useCallback(() => {
    clearTimeout(debounce.current);
    setOpen(false); setLoading(false); setActive(-1);
  }, []);

  const load = useCallback(async (q: string) => {
    loadedFor.current = q;
    setActive(-1);
    const key = `search:${q}`;
    const hit = getCached<SearchResults>(key);
    if (hit) { setItems(preview(hit)); setLoading(false); return; }
    setLoading(true);
    try {
      const fresh = await api.searchAll(q);
      if (loadedFor.current !== q) return;
      putCached(key, fresh);
      setItems(preview(fresh));
    } catch { if (loadedFor.current === q) setItems([]); }
    finally { if (loadedFor.current === q) setLoading(false); }
  }, []);

  function onType(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.currentTarget.value;
    onChange(q);
    clearTimeout(debounce.current);
    if (q.trim().length < 2) { close(); return; }
    setOpen(true);
    if (q.trim() !== loadedFor.current) { setItems([]); setLoading(true); }
    debounce.current = setTimeout(() => load(q.trim()), 500);
  }

  function choose(item: BrowseItem) {
    close();
    openItem(item, navigate);
    onPick?.();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && open) { e.preventDefault(); close(); }
    else if (e.key === 'Enter') {
      if (active >= 0 && items[active]) { e.preventDefault(); choose(items[active]); }
      else { close(); onSubmit?.(); }
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && items.length) {
      e.preventDefault(); setOpen(true);
      const n = items.length;
      setActive(e.key === 'ArrowDown' ? (active + 1) % n : (active <= 0 ? n : active) - 1);
    }
  }

  return (
    <div
      className="relative w-full min-w-0"
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) close(); }}
    >
      <input
        value={value}
        onChange={onType}
        onKeyDown={onKeyDown}
        onFocus={() => { if (items.length && value.trim() === loadedFor.current) setOpen(true); }}
        placeholder={placeholder}
        className={cn('w-full rounded-lg border bg-background px-3 py-2 text-sm outline-hidden focus:ring-2 focus:ring-primary/50', inputClass)}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls="search-suggest"
      />
      {open && (
        <div
          id="search-suggest"
          role="listbox"
          aria-label="Search preview"
          className={cn('absolute top-full z-50 mt-2 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl', panelClass)}
        >
          {loading && !items.length ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3 w-40 rounded" />
                  <Skeleton className="mt-2 h-2.5 w-24 rounded" />
                </div>
              </div>
            ))
          ) : !items.length ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">Nothing quick for that.</div>
          ) : items.map((item, i) => {
            const hero = i === 0;
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={i === active}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-3 px-3 text-left transition-colors',
                  i === active ? 'bg-accent/60' : 'hover:bg-accent/40',
                  hero ? 'border-b py-2.5' : 'py-1.5',
                )}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(item)}
              >
                {item.thumbnail ? (
                  <img src={thumb(item.thumbnail, 400)} alt=""
                    className={cn('shrink-0 object-cover', item.kind === 'artist' ? 'rounded-full' : 'rounded-md', hero ? 'h-12 w-12' : 'h-10 w-10')} />
                ) : (
                  <div className={cn('flex shrink-0 items-center justify-center bg-muted text-muted-foreground/50', item.kind === 'artist' ? 'rounded-full' : 'rounded-md', hero ? 'h-12 w-12' : 'h-10 w-10')}>
                    {item.kind === 'artist' ? <User className="h-5 w-5" /> : <Music className="h-5 w-5" />}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className={cn('truncate', hero ? 'font-semibold' : 'text-sm')}>{item.title}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    {item.explicit && <ExplicitIcon className="h-3 w-3 shrink-0" />}
                    <span className="truncate">{KIND[item.kind]}{item.subtitle ? ` • ${item.subtitle}` : ''}</span>
                  </div>
                </div>
                {hero && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-primary">Top result</span>}
              </button>
            );
          })}
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center gap-2 border-t bg-muted/30 px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            onMouseDown={(e) => e.preventDefault()}
            onMouseEnter={() => setActive(-1)}
            onClick={() => { close(); onSubmit?.(); }}
          >
            <Search className="h-3.5 w-3.5" /> All results for "{value.trim()}"
          </button>
        </div>
      )}
    </div>
  );
};
