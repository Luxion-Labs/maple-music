import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import { AuthProvider } from './features/auth/AuthContext';
import { PersonalProvider } from './features/home/PersonalContext';
import { LTProvider } from './features/home/LTContext';
import { LibraryProvider } from './features/library/LibraryContext';
import { PlayerProvider, usePlayer } from './features/player/PlayerContext';
import { PlayerBar } from './features/player/components/PlayerBar';
import { NowPlaying } from './features/player/components/NowPlaying';
import { BottomNav } from './components/BottomNav';
import { Sidebar } from './components/Sidebar';
import { AddToPlaylist } from './components/AddToPlaylist';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useIsMobile } from './lib/mobile';
import { Home } from './features/home/Home';
import { Search } from './features/search/Search';
import { SearchMore } from './features/search/SearchMore';
import { Library } from './features/library/Library';
import { AlbumPage } from './features/album/AlbumPage';
import { ArtistPage } from './features/artist/ArtistPage';
import { PlaylistPage } from './features/playlist/PlaylistPage';
import { ListPage } from './features/list/ListPage';

function AppShell() {
  const { addToPlaylistSongs, closeAddToPlaylist } = usePlayer();
  const mobile = useIsMobile();
  const location = useLocation();

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground md:flex-row">
      {!mobile && <Sidebar />}

      <div className="flex min-h-0 flex-1 flex-col">
        <main className="min-h-0 flex-1 overflow-y-auto page-scroll">
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

        <PlayerBar />
      </div>

      {mobile && <BottomNav />}

      <NowPlaying />

      {addToPlaylistSongs && (
        <AddToPlaylist songs={addToPlaylistSongs} onClose={closeAddToPlaylist} />
      )}
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
                <ErrorBoundary>
                  <BrowserRouter>
                    <AppShell />
                  </BrowserRouter>
                </ErrorBoundary>
              </PlayerProvider>
            </LibraryProvider>
          </LTProvider>
        </PersonalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
