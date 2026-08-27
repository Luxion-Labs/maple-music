import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { X, Copy, Check, AlertCircle } from 'lucide-react';
import { Switch } from './ui/Switch';
import { thumb } from '../lib/thumb';
import { BrowseItem } from '../lib/api';
import { copyText } from '../lib/clipboard';
import * as api from '../lib/api';

interface ShareDialogProps {
  item: BrowseItem | null;
  onClose: () => void;
}

export function ShareDialog({ item, onClose }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [privacy, setPrivacy] = useState<string | undefined>(undefined);
  const [owned, setOwned] = useState(false);
  const [wasPrivate, setWasPrivate] = useState(false);

  // Playlist browseIds carry a `VL` prefix that the watch/playlist URLs don't take.
  const getShareUrl = (item: BrowseItem): string => {
    const id = item.id.replace(/^VL/, '');
    if (item.kind === 'song') return `https://music.youtube.com/watch?v=${id}`;
    if (item.kind === 'artist') return `https://music.youtube.com/channel/${id}`;
    // Albums only ever reach us as an `MPRE…` browseId, so link the browse page rather than the
    // `OLAK5uy_…` playlist URL YouTube's own share sheet hands out. Both resolve to the album.
    if (item.kind === 'album') return `https://music.youtube.com/browse/${id}`;
    return `https://music.youtube.com/playlist?list=${id}`;
  };

  const url = item ? getShareUrl(item) : '';
  const canToggle = owned && item?.id.replace(/^VL/, '') !== 'LM'; // Liked Music has no editable privacy

  useEffect(() => {
    setPrivacy(undefined);
    setOwned(false);
    setWasPrivate(false);
    setCopied(false);

    if (!item || item.kind !== 'playlist') return;

    // Fetch playlist details to get privacy status
    api
      .getPlaylist(item.id)
      .then((playlist) => {
        if (item.id !== item.id) return; // Dialog retargeted - we don't have playlist.id, so checking item
        setPrivacy(playlist.privacy);
        setOwned(playlist.owned || false);
        setWasPrivate(playlist.privacy === 'PRIVATE');
      })
      .catch(() => {
        // Can't read = not private or not accessible
      });
  }, [item]);

  const handleCopy = async () => {
    try {
      await copyText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Show error toast if available
      console.error('Could not copy the link');
    }
  };

  const handleSetPublic = async (isPublic: boolean) => {
    if (!item) return;
    const before = privacy;
    setPrivacy(isPublic ? 'PUBLIC' : 'PRIVATE');
    try {
      await api.editPlaylistDetails(item.id, { public: isPublic });
    } catch (e) {
      setPrivacy(before);
      console.error(e);
    }
  };

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85dvh] w-full overflow-y-auto rounded-t-xl border bg-card p-4 shadow-xl sm:max-w-md sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="font-heading text-base font-semibold">Share</h2>
          <button
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          {item.thumbnail ? (
            <img
              src={thumb(item.thumbnail, 400)}
              alt=""
              className={`h-20 w-20 shrink-0 object-cover ${
                item.kind === 'artist' ? 'rounded-full' : 'rounded-lg'
              }`}
            />
          ) : (
            <div className="h-20 w-20 shrink-0 rounded-lg bg-muted"></div>
          )}
          <div className="min-w-0">
            <div className="truncate font-medium">{item.title}</div>
            {item.subtitle && (
              <div className="truncate text-sm text-muted-foreground">{item.subtitle}</div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg border bg-muted/40 py-1 pl-3 pr-1">
          <input
            className="min-w-0 flex-1 bg-transparent py-1 text-sm text-muted-foreground outline-hidden"
            value={url}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm transition-colors hover:bg-accent/10"
            onClick={handleCopy}
            aria-label="Copy link"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {privacy === 'PRIVATE' && (
          <div className="mt-3 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-500">
            <AlertCircle className="mt-px h-4 w-4 shrink-0" />
            <p>This playlist is private. Anyone you send the link to will get an error.</p>
          </div>
        )}

        {wasPrivate && canToggle && (
          <div className="mt-3 flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-sm font-medium">Public</div>
              <p className="text-xs text-muted-foreground">
                {privacy === 'PUBLIC'
                  ? 'Anyone with the link can open it.'
                  : 'Turn on to make the link work for everyone.'}
              </p>
            </div>
            <Switch
              checked={privacy === 'PUBLIC'}
              onCheckedChange={handleSetPublic}
              aria-label="Public playlist"
            />
          </div>
        )}
      </div>
    </div>
  );
}
