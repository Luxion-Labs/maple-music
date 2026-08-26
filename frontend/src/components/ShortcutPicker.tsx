import { useState, useEffect } from 'react';
import { X, Plus, Check } from 'lucide-react';
import { BrowseItem } from '../lib/api';
import { thumb } from '../lib/thumb';

interface ShortcutPickerProps {
  onClose: () => void;
  onAdd: (item: BrowseItem) => void;
  library: BrowseItem[];
  picks: BrowseItem[];
}

/**
 * The Shortcuts grid's "+" — pick from your library without hunting for a ⋯ menu. Stays open so
 * several can go in at once; already-added rows show a tick instead of vanishing.
 */
export function ShortcutPicker({ onClose, onAdd, library, picks }: ShortcutPickerProps) {
  const [filter, setFilter] = useState('');

  const matches = library.filter((i) =>
    i.title.toLowerCase().includes(filter.trim().toLowerCase())
  );

  const isAlreadyAdded = (id: string) => picks.some((p) => p.id === id);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[32rem] w-full max-w-sm flex-col rounded-xl border bg-card p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold">Add a shortcut</h2>
          <button
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <input
          autoFocus
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter your library…"
          className="mb-2 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {matches.length > 0 ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {matches.map((item) => {
              const on = isAlreadyAdded(item.id);
              return (
                <button
                  key={item.id}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-2 text-left hover:bg-accent/10 disabled:cursor-default disabled:opacity-60"
                  disabled={on}
                  onClick={() => onAdd(item)}
                >
                  {item.thumbnail ? (
                    <img
                      src={thumb(item.thumbnail, 96)}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 shrink-0 rounded-md bg-muted"></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{item.title}</div>
                    {item.subtitle && (
                      <div className="truncate text-xs text-muted-foreground">{item.subtitle}</div>
                    )}
                  </div>
                  {on ? (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="p-2 text-sm text-muted-foreground">
            {filter.trim()
              ? 'Nothing matches that.'
              : 'No playlists yet. Save one from its page, or create one in your Library.'}
          </p>
        )}
      </div>
    </div>
  );
}
