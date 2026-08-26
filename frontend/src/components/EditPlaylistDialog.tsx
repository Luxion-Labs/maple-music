import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { Input } from './ui/Input';
import { Switch } from './ui/Switch';
import { ImagePlus, Trash2 } from 'lucide-react';
import { thumb } from '../lib/thumb';

interface EditPlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  id: string;
  title?: string;
  description?: string;
  privacy?: string;
  cover?: string;
  fallback?: string;
  onSave: (data: { name?: string; description?: string; public?: boolean }) => Promise<void>;
  onSetCover?: (path: string | null) => Promise<void>;
}

type Edit = { title?: string; description?: string; privacy?: string; cover?: string };

/**
 * "Edit playlist" on a playlist you own: name, description, visibility and a cover of your own.
 * The three text/visibility fields are one write, sent on Save and only for what actually changed.
 */
export function EditPlaylistDialog({
  open,
  onOpenChange,
  id,
  title,
  description,
  privacy,
  cover,
  fallback,
  onSave,
  onSetCover,
}: EditPlaylistDialogProps) {
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraftName(title ?? '');
    setDraftDescription(description ?? '');
    setIsPublic(privacy === 'PUBLIC');
  }, [open, title, description, privacy]);

  const preview = thumb(cover ?? fallback, 400);

  const handlePickCover = async () => {
    // In mobile/web context, use file input instead of Tauri dialog
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && onSetCover) {
        // In a real implementation, you'd upload the file
        // For now, just create a local URL
        const url = URL.createObjectURL(file);
        try {
          await onSetCover(url);
        } catch (e) {
          console.error(e);
        }
      }
    };
    input.click();
  };

  const handleRemoveCover = async () => {
    if (!onSetCover || removing) return;
    setRemoving(true);
    try {
      await onSetCover(null);
    } catch (e) {
      console.error(e);
    } finally {
      setRemoving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const name = draftName.trim();
    const changes: { name?: string; description?: string; public?: boolean } = {};
    if (name && name !== title) changes.name = name;
    if (draftDescription !== (description ?? '')) changes.description = draftDescription;
    if (isPublic !== (privacy === 'PUBLIC')) changes.public = isPublic;

    if (!Object.keys(changes).length) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      await onSave(changes);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="sm:max-w-xl">
        <Dialog.Header>
          <Dialog.Title>Edit playlist</Dialog.Title>
          <Dialog.Description>Change how this playlist looks and who can see it.</Dialog.Description>
        </Dialog.Header>
        <form className="flex flex-col gap-4" onSubmit={handleSave}>
          <div className="flex gap-4">
            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <button
                type="button"
                className="group relative h-32 w-32 cursor-pointer overflow-hidden rounded-xl border bg-muted"
                onClick={handlePickCover}
                aria-label="Change cover art"
              >
                {preview && <img src={preview} alt="" className="h-full w-full object-cover" />}
                <span
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 text-xs font-medium text-white transition group-hover:opacity-100 group-focus-visible:opacity-100 ${
                    preview ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  <ImagePlus className="h-6 w-6" />
                  Choose image
                </span>
              </button>
              {cover && onSetCover && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-muted-foreground"
                  onClick={handleRemoveCover}
                  disabled={removing}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {removing ? 'Removing…' : 'Remove'}
                </Button>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Playlist name"
                aria-label="Playlist name"
              />
              <textarea
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder="Description"
                aria-label="Playlist description"
                rows={4}
                className="w-full flex-1 resize-none rounded-2xl border border-input bg-input/30 px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-2xl border px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-sm font-medium">Public</div>
              <p className="text-xs text-muted-foreground">
                {isPublic ? 'Anyone can find this playlist on YouTube Music.' : 'Only you can see this playlist.'}
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} aria-label="Public playlist" />
          </div>
          <p className="text-xs text-muted-foreground">
            Artwork applies here at once and uploads to YouTube Music in the background. Square JPEG or PNG works best.
          </p>
          <Dialog.Footer>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !draftName.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
