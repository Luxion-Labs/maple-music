import { useState, useEffect } from 'react';
import { CheckCircle2, UserCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Dialog } from './ui/Dialog';
import { AccountIdentity } from '../lib/api';
import { thumb } from '../lib/thumb';

interface ChannelPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  required?: boolean;
  identities: AccountIdentity[];
  onChoose: (selectionKey: string) => Promise<void>;
  onCancel?: () => Promise<void>;
  onLoad?: () => Promise<AccountIdentity[]>;
}

/**
 * Choose a YouTube channel for a multi-channel login.
 * When required=true, the dialog cannot be dismissed until a channel is chosen or sign-in is cancelled.
 */
export function ChannelPicker({
  open,
  onOpenChange,
  required = false,
  identities: initialIdentities,
  onChoose,
  onCancel,
  onLoad,
}: ChannelPickerProps) {
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identities, setIdentities] = useState<AccountIdentity[]>(initialIdentities);
  const [loadedForOpen, setLoadedForOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setLoadedForOpen(false);
      setError(null);
      return;
    }
    if (loadedForOpen || !onLoad) return;
    setLoadedForOpen(true);
    setLoading(true);
    setError(null);
    onLoad()
      .then(setIdentities)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [open, onLoad, loadedForOpen]);

  const handleChoose = async (identity: AccountIdentity) => {
    if (switching) return;
    setSwitching(identity.selectionKey);
    setError(null);
    try {
      await onChoose(identity.selectionKey);
      onOpenChange(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setSwitching(null);
    }
  };

  const handleCancel = async () => {
    if (!onCancel || cancelling || switching) return;
    setCancelling(true);
    try {
      await onCancel();
      onOpenChange(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (required && !nextOpen) return; // Cannot dismiss when required
    onOpenChange(nextOpen);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content
        className="gap-0 overflow-hidden p-0 sm:max-w-md"
        onEscapeKeyDown={(e) => required && e.preventDefault()}
        onPointerDownOutside={(e) => required && e.preventDefault()}
      >
        <div className="border-b px-5 py-4">
          <Dialog.Title className="text-lg font-semibold">Choose a YouTube channel</Dialog.Title>
          <Dialog.Description className="mt-1 text-xs text-muted-foreground">
            Library, likes and playlists will use this channel. You can switch again later.
          </Dialog.Description>
        </div>

        <div className="max-h-[26rem] min-h-32 overflow-y-auto p-2">
          {loading ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Loading channels…</p>
          ) : error ? (
            <div className="space-y-3 px-3 py-6 text-center">
              <p className="text-sm text-destructive">{error}</p>
              {onLoad && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLoading(true);
                    setError(null);
                    onLoad()
                      .then(setIdentities)
                      .catch((e) => setError(String(e)))
                      .finally(() => setLoading(false));
                  }}
                >
                  Try again
                </Button>
              )}
            </div>
          ) : identities.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              YouTube did not return any selectable channels.
            </p>
          ) : (
            identities.map((identity) => (
              <button
                key={identity.selectionKey}
                type="button"
                onClick={() => handleChoose(identity)}
                disabled={switching !== null}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-60"
              >
                {identity.thumbnail ? (
                  <img
                    src={thumb(identity.thumbnail, 96)}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <UserCircle className="h-6 w-6 text-muted-foreground" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{identity.name}</span>
                  {(identity.handle || identity.email) && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {identity.handle ?? identity.email}
                    </span>
                  )}
                </span>
                {identity.selected && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    Selected
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end border-t px-5 py-3">
          {required && onCancel ? (
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelling || switching !== null}>
              {cancelling ? 'Cancelling…' : 'Cancel sign-in'}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
