import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { X, Save, Eye, EyeOff, GripVertical } from 'lucide-react';

interface HomeLayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: { key: string; title: string }[];
  hiddenKeys: string[];
  onSave: (order: string[], hidden: string[]) => void;
}

type Row = { key: string; title: string; shown: boolean };

/**
 * Arrange home: drag the sections into the order you want them, hide the ones you don't. Nothing
 * is written until Save, so dismissing the modal any other way (Esc, the overlay, the ✕) throws
 * the edit away — which is why the list below is a working copy.
 */
export function HomeLayoutDialog({
  open,
  onOpenChange,
  sections,
  hiddenKeys,
  onSave,
}: HomeLayoutDialogProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [dragging, setDragging] = useState<number | null>(null);

  // Snapshot when the modal opens
  useEffect(() => {
    if (!open) return;
    const hidden = new Set(hiddenKeys);
    setRows(sections.map((s) => ({ ...s, shown: !hidden.has(s.key) })));
    setDragging(null);
  }, [open, sections, hiddenKeys]);

  const moveTo = (to: number) => {
    if (dragging === null || dragging === to) return;
    const next = [...rows];
    next.splice(to, 0, ...next.splice(dragging, 1));
    setRows(next);
    setDragging(to);
  };

  const handleSave = () => {
    onSave(
      rows.map((r) => r.key),
      rows.filter((r) => !r.shown).map((r) => r.key)
    );
    onOpenChange(false);
  };

  const toggleShown = (index: number) => {
    const next = [...rows];
    next[index] = { ...next[index], shown: !next[index].shown };
    setRows(next);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="border-b px-5 py-4">
          <Dialog.Title className="text-lg font-semibold">Edit home</Dialog.Title>
          <Dialog.Description className="text-xs text-muted-foreground">
            Drag to reorder. Hide anything you don't want on the page.
          </Dialog.Description>
        </div>

        <div role="list" className="max-h-[24rem] min-h-[12rem] overflow-y-auto p-2">
          {rows.map((row, i) => (
            <div
              key={row.key}
              role="listitem"
              draggable={true}
              onDragStart={(e) => {
                setDragging(i);
                e.dataTransfer?.setData('text/plain', row.key);
                if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                if (dragging === null) return;
                e.preventDefault();
                moveTo(i);
              }}
              onDragEnd={() => setDragging(null)}
              className={`flex cursor-grab items-center gap-2 rounded-lg py-2 pl-3 pr-2 transition-colors hover:bg-muted/50 ${
                dragging === i ? 'bg-muted opacity-50' : ''
              }`}
            >
              <span
                className={`min-w-0 flex-1 truncate text-sm ${
                  row.shown ? '' : 'text-muted-foreground'
                }`}
              >
                {row.title}
              </span>
              <button
                onClick={() => toggleShown(i)}
                title={row.shown ? 'Hide from home' : 'Show on home'}
                aria-label={row.shown ? `Hide ${row.title}` : `Show ${row.title}`}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {row.shown ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground/60"
              >
                <GripVertical className="h-4 w-4" />
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
