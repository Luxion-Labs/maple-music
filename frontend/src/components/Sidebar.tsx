import React, { useState, useMemo, useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, Search, Library, Settings, Sun, Moon, Plus, Pin, Music,
  RotateCcw, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { useLibrary } from '../features/library/LibraryContext';
import { usePersonal } from '../features/home/PersonalContext';
import { usePlayer } from '../features/player/PlayerContext';
import { useDarkMode } from '../lib/theme';
import { orderLibrary } from '../features/home/personal';
import { thumb } from '../lib/thumb';
import { ON_REPEAT_ID } from '../lib/api';
import { cn } from '../lib/utils';
import { PlaylistMenu } from './PlaylistMenu';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Dialog } from './ui/Dialog';
import { useToast } from './Toast';
import type { BrowseItem } from '../lib/api';

const nav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/library', label: 'Library', icon: Library },
];

const playlistHref = (item: BrowseItem) =>
  item.kind === 'album'
    ? `/album/${encodeURIComponent(item.id)}`
    : item.kind === 'artist'
      ? `/artist/${encodeURIComponent(item.id)}`
      : `/playlist/${encodeURIComponent(item.id)}`;

const rowSubtitle = (s?: string) =>
  s
    ?.split('•')
    .map((p) => p.trim())
    .filter((p) => /\d/.test(p))
    .at(-1) ?? s;

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { account } = useAuth();
  const { library, playlists: mergedPlaylists, createLibraryPlaylist } = useLibrary();
  const { personal } = usePersonal();
  const { setSettingsOpen } = usePlayer();
  const toast = useToast();
  const [dark, toggleDark] = useDarkMode();

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; }
    catch { return false; }
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      localStorage.setItem('sidebar-collapsed', String(!prev));
      return !prev;
    });
  }, []);

  const playlists = useMemo(
    () => orderLibrary(mergedPlaylists, personal),
    [mergedPlaylists, personal],
  );
  const pinnedCount = useMemo(
    () => playlists.filter((p) => personal.pins.includes(p.id)).length,
    [playlists, personal.pins],
  );

  const isActive = (href: string) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  const wide = (cls: string) => (collapsed ? '' : cls);

  const createNew = useCallback(async () => {
    const title = newTitle.trim();
    if (!title || creating) return;
    setCreating(true);
    try {
      await createLibraryPlaylist(title);
      toast.success(`Created "${title}"`);
      setNewTitle('');
      setDialogOpen(false);
    } catch (e) {
      console.error(e);
      toast.error(String(e));
    } finally {
      setCreating(false);
    }
  }, [newTitle, creating, createLibraryPlaylist, toast]);

  return (
    <aside className={cn(
      'flex h-full w-16 shrink-0 flex-col border-r bg-sidebar p-3 text-sidebar-foreground',
      wide('lg:w-60'),
    )}>
      {/* Header: logo + collapse + theme toggle */}
      <div className={cn('flex items-center justify-center px-2 py-2', wide('lg:justify-between'))}>
        <span className={cn('hidden font-heading text-lg font-bold tracking-tight', wide('lg:block'))}>
          <span className="text-primary">Maple</span>
        </span>
        <div className={cn('flex items-center gap-1', collapsed && 'flex-col')}>
          <Button
            variant="ghost"
            size="sm"
            className="hidden hover:text-primary lg:inline-flex"
            onClick={toggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <ChevronsRight className="h-4 w-4" />
              : <ChevronsLeft className="h-4 w-4" />
            }
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="hover:text-primary"
            onClick={toggleDark}
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 dark:hidden" />
            <Moon className="hidden h-4 w-4 dark:block" />
          </Button>
        </div>
      </div>

      {/* Nav links */}
      <nav className="mt-2 flex flex-col gap-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive: active }) => cn(
              'group relative flex items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              wide('lg:justify-start'),
              active
                ? 'bg-primary/10 text-primary'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
            )}
          >
            {({ isActive: active }) => (
              <>
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-transform duration-200" />
                )}
                <Icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                <span className={cn('hidden', wide('lg:inline'))}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          className={cn(
            'group flex items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
            wide('lg:justify-start'),
          )}
        >
          <Settings className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
          <span className={cn('hidden', wide('lg:inline'))}>Settings</span>
        </button>
      </nav>

      {/* Playlists */}
      {(account?.signedIn || playlists.length > 0) && (
        <div className={cn('mt-3 hidden min-h-0 flex-1 flex-col border-t pt-3', wide('lg:flex'))}>
          {account?.signedIn && (
            <Button
              variant="outline"
              size="sm"
              className="mb-2 w-full gap-2"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4" /> New playlist
            </Button>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {playlists.map((pl, i) => (
              <React.Fragment key={pl.id}>
                <div className="group/row relative">
                  <NavLink
                    to={playlistHref(pl)}
                    title={pl.title}
                    className="flex items-center gap-2.5 rounded-lg py-1.5 pl-2 pr-9 transition-colors hover:bg-sidebar-accent/50"
                  >
                    <div className={cn(
                      'relative h-10 w-10 shrink-0 overflow-hidden bg-muted',
                      pl.kind === 'artist' ? 'rounded-full' : 'rounded-md',
                    )}>
                      {pl.thumbnail && pl.id !== ON_REPEAT_ID ? (
                        <img
                          src={thumb(pl.thumbnail, 96)}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className={cn(
                          'flex h-full w-full items-center justify-center',
                          pl.id === ON_REPEAT_ID
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground/50',
                        )}>
                          {pl.id === ON_REPEAT_ID
                            ? <RotateCcw className="h-5 w-5" />
                            : <Music className="h-4 w-4" />
                          }
                        </div>
                      )}
                    </div>
                    {personal.pins.includes(pl.id) && (
                      <span className="absolute left-9 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                        <Pin className="h-2.5 w-2.5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium">{pl.title}</div>
                      {pl.subtitle && (
                        <div className="truncate text-xs text-muted-foreground">
                          {rowSubtitle(pl.subtitle)}
                        </div>
                      )}
                    </div>
                  </NavLink>
                  <PlaylistMenu item={pl} />
                </div>
                {pinnedCount > 0 && i === pinnedCount - 1 && (
                  <div className="mx-3 my-1.5 h-px bg-border" />
                )}
              </React.Fragment>
            ))}
            {library.loading && (
              <p className="px-3 py-1.5 text-xs text-muted-foreground">Loading...</p>
            )}
          </div>
        </div>
      )}

      {/* New playlist dialog */}
      <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>New playlist</Dialog.Title>
            <Dialog.Description>
              Give your playlist a name to get started.
            </Dialog.Description>
          </Dialog.Header>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => { e.preventDefault(); createNew(); }}
          >
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Playlist name"
              autoFocus
            />
            <Dialog.Footer>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newTitle.trim()}>
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </Dialog.Footer>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </aside>
  );
};
