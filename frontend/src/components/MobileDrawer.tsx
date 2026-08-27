import { useEffect } from 'react';
import { Home, Search, Library, Settings, Music, RotateCcw } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { BrowseItem } from '../lib/api';
import { thumb } from '../lib/thumb';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  playlists: BrowseItem[];
  accountName?: string;
  isSignedIn?: boolean;
  onOpenSettings?: () => void;
}

const ON_REPEAT_ID = 'VLRDrepeat';

const nav = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/library', label: 'Library', icon: Library },
];

/**
 * YT Music-style hamburger drawer for phones: primary destinations stay in BottomNav (never
 * hidden), this carries the depth the tab bar can't — the full playlist list and settings.
 */
export function MobileDrawer({
  open,
  onClose,
  playlists,
  accountName,
  isSignedIn,
  onOpenSettings,
}: MobileDrawerProps) {
  const location = useLocation();

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (open && e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  const isActive = (href: string) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  const getPlaylistHref = (item: BrowseItem) => {
    if (item.kind === 'album') return `/album/${encodeURIComponent(item.id)}`;
    if (item.kind === 'artist') return `/artist/${encodeURIComponent(item.id)}`;
    return `/playlist/${encodeURIComponent(item.id)}`;
  };

  if (!open) return null;

  return (
    <>
      <button
        className="fixed inset-0 z-40 cursor-default bg-black/50 transition-opacity duration-150"
        onClick={onClose}
        aria-label="Close menu"
      />
      <div className="fixed inset-y-0 left-0 z-50 flex w-[min(80vw,20rem)] flex-col border-r bg-sidebar text-sidebar-foreground shadow-xl pb-[env(safe-area-inset-bottom)] transition-transform duration-220 ease-out">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <span className="font-heading text-lg font-bold tracking-tight">Maple</span>
          {isSignedIn && accountName && (
            <span className="ml-auto truncate text-xs text-muted-foreground">{accountName}</span>
          )}
        </div>

        <nav className="shrink-0 p-2">
          {nav.map((n) => (
            <Link
              key={n.href}
              to={n.href}
              onClick={onClose}
              aria-current={isActive(n.href) ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive(n.href)
                  ? 'bg-sidebar-accent font-medium text-primary'
                  : 'hover:bg-sidebar-accent/50'
              }`}
            >
              <n.icon strokeWidth={2} className="h-5 w-5 shrink-0" />
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {playlists.length > 0 ? (
            <>
              <p className="px-3 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Playlists
              </p>
              {playlists.map((pl) => (
                <Link
                  key={pl.id}
                  to={getPlaylistHref(pl)}
                  onClick={onClose}
                  title={pl.title}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-sidebar-accent/50"
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {pl.thumbnail && pl.id !== ON_REPEAT_ID ? (
                      <img
                        src={thumb(pl.thumbnail, 96)}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : pl.id === ON_REPEAT_ID ? (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <RotateCcw className="h-5 w-5" />
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Music className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{pl.title}</div>
                    {pl.subtitle && <div className="truncate text-xs text-muted-foreground">{pl.subtitle}</div>}
                  </div>
                </Link>
              ))}
            </>
          ) : isSignedIn ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">No playlists yet.</p>
          ) : null}
        </div>

        <div className="shrink-0 border-t p-2">
          <button
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-sidebar-accent/50"
            onClick={() => {
              onClose();
              onOpenSettings?.();
            }}
          >
            <Settings strokeWidth={2} className="h-5 w-5 shrink-0" />
            Settings
          </button>
        </div>
      </div>
    </>
  );
}
