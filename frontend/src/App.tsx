import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { PersonalProvider } from './features/home/PersonalContext';
import { LTProvider } from './features/home/LTContext';
import { LibraryProvider, useLibrary } from './features/library/LibraryContext';
import { PlayerProvider, usePlayer } from './features/player/PlayerContext';
import { ToastProvider } from './components/Toast';
import { PlayerBar } from './features/player/components/PlayerBar';
import { NowPlaying } from './features/player/components/NowPlaying';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MobileDrawer } from './components/MobileDrawer';
import { ChannelPicker } from './components/ChannelPicker';
import { AddToPlaylist } from './components/AddToPlaylist';
import { SettingsDialog } from './components/SettingsDialog';
import { QueuePanel } from './components/QueuePanel';
import { LyricsPanel } from './components/LyricsPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Titlebar } from './components/Titlebar';
import { ResizeBorders } from './components/ResizeBorders';
import { MiniPlayer } from './components/MiniPlayer';
import { ListenTogether } from './components/ListenTogether';
import { useIsMobile } from './lib/mobile';
import { initWin, getMaximized, onWinChanged } from './lib/win';
import { initZoom } from './lib/zoom';
import { cn } from './lib/utils';
import { useLT } from './features/home/LTContext';
import * as api from './lib/api';
import { Home } from './features/home/Home';
import { Search } from './features/search/Search';
import { SearchMore } from './features/search/SearchMore';
import { Library } from './features/library/Library';
import { AlbumPage } from './features/album/AlbumPage';
import { ArtistPage } from './features/artist/ArtistPage';
import { PlaylistPage } from './features/playlist/PlaylistPage';
import { ListPage } from './features/list/ListPage';

function useIsMini(): boolean {
  const [isMini, setIsMini] = useState(false);
  useEffect(() => {
    if (!api.isTauri) return;
    let active = true;
    (async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      try {
        const label = getCurrentWindow().label;
        if (active) setIsMini(label === 'mini');
      } catch { /* not tauri */ }
    })();
    return () => { active = false; };
  }, []);
  return isMini;
}

function AppShell() {
  const { addToPlaylistSongs, closeAddToPlaylist, settingsOpen, setSettingsOpen, np, setNpOpen } = usePlayer();
  const { account, epoch, signIn, signOut } = useAuth();
  const { playlists, loadLibrary } = useLibrary();
  const { lt } = useLT();
  const mobile = useIsMobile();
  const isMini = useIsMini();
  const location = useLocation();
  const [queueOpen, setQueueOpen] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [ltOpen, setLtOpen] = useState(false);
  const [maximized, setMaximized] = useState(getMaximized);

  const closeDrawer = () => setDrawerOpen(false);
  const navigate = useNavigate();

  // Android system back button: implement a proper back stack instead of letting it quit the app
  // from a Settings submenu. Top-most overlay first, then deep routes, then exit from the home tabs.
  useEffect(() => {
    if (!mobile || !api.isTauri) return;
    let active = true;
    let unlisten: (() => void) | undefined;
    (async () => {
      const { onBackButtonPress } = await import('@tauri-apps/api/app');
      const onBack = async () => {
        if (addToPlaylistSongs) { closeAddToPlaylist(); return; }
        if (settingsOpen) { setSettingsOpen(false); return; }
        if (ltOpen) { setLtOpen(false); return; }
        if (np.open) { setNpOpen(false); return; }
        if (queueOpen) { setQueueOpen(false); return; }
        if (lyricsOpen) { setLyricsOpen(false); return; }
        if (drawerOpen) { setDrawerOpen(false); return; }
        if (pickerOpen) { setPickerOpen(false); return; }
        const deep = /^\/(album|artist|playlist|list|search-more)(\/|$)/.test(location.pathname);
        if (deep) { navigate(-1); return; }
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        getCurrentWindow().destroy().catch(() => {});
      };
      const listener = await onBackButtonPress(onBack);
      if (active) unlisten = () => { listener.unregister().catch(() => {}); };
    })();
    return () => { active = false; unlisten?.(); };
  }, [mobile, addToPlaylistSongs, closeAddToPlaylist, settingsOpen, setSettingsOpen, ltOpen, np.open, setNpOpen, queueOpen, lyricsOpen, drawerOpen, pickerOpen, navigate, location.pathname]);

  // Init once: show the window (post-restore) + track maximize state; start zoom hotkeys.
  useEffect(() => {
    if (!api.isTauri) return;
    let unWin: (() => void) | undefined;
    let unResize: (() => void) | undefined;
    (async () => {
      const un = await initWin();
      unResize = un;
      setMaximized(getMaximized());
      unWin = onWinChanged(() => setMaximized(getMaximized()));
    })();
    const unZoom = initZoom();
    return () => { unZoom(); unWin?.(); unResize?.(); };
  }, []);

  // Load the library on first drawer open so a fresh install shows playlists without a Library visit.
  const drawerOpenedRef = React.useRef(false);
  React.useEffect(() => {
    if (drawerOpen && !drawerOpenedRef.current) {
      drawerOpenedRef.current = true;
      loadLibrary();
    }
  }, [drawerOpen, loadLibrary]);

  // The mini-player window is this same SPA: no chrome, no routes, no toasts.
  if (isMini) return <MiniPlayer />;

  const desktop = !isMini && !mobile;

  return (
    <div className={cn('flex h-full flex-col overflow-hidden bg-background text-foreground', desktop && !maximized ? 'rounded-lg' : '')}>
      {desktop && (
        <>
          <ResizeBorders />
          <Titlebar
            onOpenListenTogether={() => setLtOpen(true)}
            ltActive={lt.role !== 'none'}
            onSwitchChannel={() => setPickerOpen(true)}
          />
        </>
      )}

      <div className="relative flex min-h-0 min-w-0 flex-1 md:flex-row">
        {desktop && <Sidebar />}

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {!desktop && !isMini && (
            <TopBar
              account={account}
              onOpenDrawer={() => setDrawerOpen(true)}
              onOpenSettings={() => setSettingsOpen(true)}
              onOpenListenTogether={() => setLtOpen(true)}
              ltActive={lt.role !== 'none'}
              onSignIn={() => signIn()}
              onSignOut={() => signOut()}
              onSwitchChannel={() => setPickerOpen(true)}
            />
          )}

          <main key={epoch} className="min-h-0 flex-1 overflow-y-auto page-scroll">
            <div key={location.pathname} className="page-enter">
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<Search />} />
                <Route path="/search-more" element={<SearchMore />} />
                <Route path="/library" element={<Library />} />
                <Route path="/album/:id" element={<AlbumPage />} />
                <Route path="/artist/:id" element={<ArtistPage />} />
                <Route path="/playlist/:id" element={<PlaylistPage />} />
                <Route path="/list" element={<ListPage />} />
              </Routes>
            </div>
          </main>

          <PlayerBar
            queueOpen={queueOpen}
            onToggleQueue={() => setQueueOpen((o) => !o)}
            lyricsOpen={lyricsOpen}
            onToggleLyrics={() => setLyricsOpen((o) => !o)}
          />

          {queueOpen && <QueuePanel onClose={() => setQueueOpen(false)} />}
          {lyricsOpen && <LyricsPanel onClose={() => setLyricsOpen(false)} queueOpen={queueOpen} />}
        </div>
      </div>

      {mobile && !isMini && <BottomNav />}

      {mobile && !isMini && (
        <MobileDrawer
          open={drawerOpen}
          onClose={closeDrawer}
          playlists={playlists}
          accountName={account.name ?? undefined}
          isSignedIn={account.signedIn}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenListenTogether={() => setLtOpen(true)}
          ltActive={lt.role !== 'none'}
        />
      )}

      <ChannelPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        identities={[]}
        onLoad={() => api.getAccountIdentities()}
        onChoose={async (key) => {
          await api.switchAccount(key);
          setPickerOpen(false);
        }}
      />

      <NowPlaying />

      {addToPlaylistSongs && (
        <AddToPlaylist songs={addToPlaylistSongs} onClose={closeAddToPlaylist} />
      )}

      <ListenTogether open={ltOpen} onClose={() => setLtOpen(false)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PersonalProvider>
          <LTProvider>
            <LibraryProvider>
              <PlayerProvider>
                <ToastProvider>
                  <ErrorBoundary>
                    <BrowserRouter>
                      <AppShell />
                    </BrowserRouter>
                  </ErrorBoundary>
                </ToastProvider>
              </PlayerProvider>
            </LibraryProvider>
          </LTProvider>
        </PersonalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
