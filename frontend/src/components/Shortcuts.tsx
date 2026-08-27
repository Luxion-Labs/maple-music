import { useState } from 'react';
import { Plus, X, Play, Music, User, RotateCcw, Edit } from 'lucide-react';
import { BrowseItem } from '../lib/api';
import { thumb } from '../lib/thumb';
import { ShortcutPicker } from './ShortcutPicker';

interface ShortcutsProps {
  picks: BrowseItem[];
  onAdd: (item: BrowseItem) => void;
  onRemove: (id: string) => void;
  onPlay: (item: BrowseItem) => Promise<void>;
  onOpen: (item: BrowseItem) => void;
  onReorder: (items: BrowseItem[]) => void;
  onEdit?: () => void;
  maxPicks?: number;
}

const ON_REPEAT_ID = 'VLRDrepeat';

/**
 * The home grid the user curates (was "Quick Picks" — renamed: YouTube Music has a shelf by that
 * name and it isn't this one). It holds what was put in it, in the order it was dragged into, plus
 * On Repeat once that has enough songs (the only tile the app suggests, and removing it is
 * permanent).
 */
export function Shortcuts({
  picks,
  onAdd,
  onRemove,
  onPlay,
  onOpen,
  onReorder,
  onEdit,
  maxPicks = 20,
}: ShortcutsProps) {
  const [picking, setPicking] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropBefore, setDropBefore] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  const handleDragStart = (e: React.DragEvent, index: number, item: BrowseItem) => {
    setDragging(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-shortcut', JSON.stringify({ item, index }));
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    setDropBefore(id);
  };

  const handleDrop = (e: React.DragEvent, beforeId?: string) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/x-shortcut');
    if (!data) return;

    try {
      const { item, index: fromIndex } = JSON.parse(data);
      const toIndex = beforeId ? picks.findIndex((p) => p.id === beforeId) : picks.length;
      
      const newPicks = [...picks];
      newPicks.splice(fromIndex, 1);
      newPicks.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, item);
      
      onReorder(newPicks);
    } catch (e) {
      console.error('Drop failed', e);
    }
    
    setDropBefore(undefined);
    setDragging(null);
  };

  const handlePlay = async (item: BrowseItem) => {
    if (busy) return;
    setBusy(item.id);
    try {
      await onPlay(item);
    } finally {
      setBusy(null);
    }
  };

  const handleImageError = (id: string) => {
    setFailed({ ...failed, [id]: true });
  };

  return (
    <>
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="font-heading text-lg font-semibold">Shortcuts</h2>
            {onEdit && (
              <button
                onClick={onEdit}
                title="Edit home"
                className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:bg-muted hover:text-foreground"
              >
                <Edit className="h-4 w-4" />
                Edit Home
              </button>
            )}
          </div>
          {picks.length > 0 && picks.length < maxPicks && (
            <button
              onClick={() => setPicking(true)}
              className="flex shrink-0 cursor-pointer items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          )}
        </div>

        <div
          role="group"
          aria-label="Shortcuts"
          onDragOver={(e) => {
            if (dragging !== null) {
              e.preventDefault();
              const target = e.target as HTMLElement;
              if (!target.closest('[data-pick]')) {
                setDropBefore(null);
              }
            }
          }}
          onDrop={(e) => handleDrop(e)}
          onDragLeave={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            if (e.clientX < r.left || e.clientX >= r.right || e.clientY < r.top || e.clientY >= r.bottom) {
              setDropBefore(undefined);
            }
          }}
        >
          {picks.length === 0 ? (
            <button
              onClick={() => setPicking(true)}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed p-4 text-left transition-colors hover:border-foreground/30 hover:bg-accent/5 ${
                dropBefore === null ? 'border-primary bg-accent/5' : ''
              }`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
                <Plus className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">Add a shortcut</span>
                <span className="block text-xs text-muted-foreground">
                  Whatever you reach for most, one click from home. Drag any card here, or pick from your
                  library.
                </span>
              </span>
            </button>
          ) : (
            <div data-grid className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-2">
              {picks.map((item, index) => {
                const round = item.kind === 'artist';
                const onRepeat = item.id === ON_REPEAT_ID;

                return (
                  <div key={item.id} className="group/pick relative" data-pick={item.id}>
                    {dropBefore === item.id && (
                      <div className="absolute -left-1 bottom-0 top-0 z-20 w-0.5 rounded-full bg-primary"></div>
                    )}
                    <div
                      className="flex h-16 cursor-pointer items-center gap-3 overflow-hidden rounded-xl border bg-card/40 text-left transition-colors hover:border-foreground/20 hover:bg-card"
                      role="button"
                      tabIndex={0}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, index, item)}
                      onDragOver={(e) => handleDragOver(e, item.id)}
                      onDragEnd={() => {
                        setDragging(null);
                        setDropBefore(undefined);
                      }}
                      onClick={() => onOpen(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onOpen(item);
                        }
                      }}
                      title={item.subtitle ? `${item.title} — ${item.subtitle}` : item.title}
                    >
                      <div
                        className={`relative shrink-0 overflow-hidden bg-muted ${
                          round ? 'my-2 ml-2 h-12 w-12 rounded-full' : 'h-16 w-16'
                        }`}
                      >
                        {item.thumbnail && !failed[item.id] && !onRepeat ? (
                          <img
                            src={thumb(item.thumbnail, 400)}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                            draggable="false"
                            onError={() => handleImageError(item.id)}
                          />
                        ) : (
                          <div
                            className={`flex h-full w-full items-center justify-center ${
                              onRepeat ? 'bg-primary/10 text-primary' : 'text-muted-foreground/50'
                            }`}
                          >
                            {onRepeat ? (
                              <RotateCcw className="h-7 w-7" />
                            ) : round ? (
                              <User className="h-5 w-5" />
                            ) : (
                              <Music className="h-5 w-5" />
                            )}
                          </div>
                        )}
                        {!round && (
                          <button
                            className={`absolute inset-0 flex cursor-pointer items-center justify-center bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/60 focus-visible:opacity-100 group-hover/pick:opacity-100 ${
                              busy === item.id ? 'animate-pulse' : ''
                            }`}
                            disabled={busy === item.id}
                            aria-label={`Play ${item.title}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlay(item);
                            }}
                          >
                            <Play className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pr-8">
                        <div className="truncate text-sm font-medium">{item.title}</div>
                        {item.subtitle && (
                          <div className="truncate text-xs text-muted-foreground">{item.subtitle}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onRemove(item.id)}
                      title="Remove from shortcuts"
                      aria-label="Remove from shortcuts"
                      className="absolute right-1 top-1 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover/pick:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}

              {dropBefore === null && picks.length < maxPicks && (
                <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-primary text-xs font-medium text-primary">
                  Add to the end
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {picking && <ShortcutPicker onClose={() => setPicking(false)} onAdd={onAdd} library={[]} picks={picks} />}
    </>
  );
}
