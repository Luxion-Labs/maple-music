import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './lib/theme';
import { AuthProvider } from './features/auth/AuthContext';
import { PersonalProvider } from './features/home/PersonalContext';
import { LTProvider } from './features/home/LTContext';
import { LibraryProvider } from './features/library/LibraryContext';
import { PlayerProvider, usePlayer } from './features/player/PlayerContext';
import { PlayerBar } from './features/player/components/PlayerBar';
import { NowPlaying } from './features/player/components/NowPlaying';
import { BottomNav } from './components/BottomNav';
import { AddToPlaylist } from './components/AddToPlaylist';
import { Home } from './features/home/Home';
import { Search } from './features/search/Search';
import { SearchMore } from './features/search/SearchMore';
import { Library } from './features/library/Library';
import { AlbumPage } from './features/album/AlbumPage';
import { ArtistPage } from './features/artist/ArtistPage';
import { PlaylistPage } from './features/playlist/PlaylistPage';
import { ListPage } from './features/list/ListPage';

/** Inner shell — needs PlayerContext for AddToPlaylist overlay */
function AppShell() {
  const { addToPlaylistSongs, closeAddToPlaylist } = usePlayer();
  return (
    <BrowserRouter>
      {/* Mobile-only full-height flex column */}
      <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
        {/* Scrollable page content */}
        <main className="min-h-0 flex-1 overflow-y-auto page-scroll">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/search-more" element={<SearchMore />} />
            <Route path="/library" element={<Library />} />
            <Route path="/album/:id" element={<AlbumPage />} />
            <Route path="/artist/:id" element={<ArtistPage />} />
            <Route path="/playlist/:id" element={<PlaylistPage />} />
            <Route path="/list" element={<ListPage />} />
          </Routes>
        </main>

        {/* Mini player */}
        <PlayerBar />

        {/* Bottom navigation */}
        <BottomNav />

        {/* Full-screen now playing overlay */}
        <NowPlaying />

        {/* Add to playlist modal */}
        {addToPlaylistSongs && (
          <AddToPlaylist songs={addToPlaylistSongs} onClose={closeAddToPlaylist} />
        )}
      </div>
    </BrowserRouter>
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
                <AppShell />
              </PlayerProvider>
            </LibraryProvider>
          </LTProvider>
        </PersonalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
