import { useState, useEffect } from 'react';
import { Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SearchSuggest } from './SearchSuggest';
import { thumb } from '../lib/thumb';

interface HomeHeroProps {
  accountName?: string;
  accountThumbnail?: string;
  nowPlayingThumbnail?: string;
  isInRoom?: boolean;
  onOpenListenTogether?: () => void;
}

/**
 * Home page hero with greeting, account avatar, search, and Listen Together button.
 * Features a dynamic backdrop based on current track artwork.
 */
export function HomeHero({
  accountName,
  accountThumbnail,
  nowPlayingThumbnail,
  isInRoom = false,
  onOpenListenTogether,
}: HomeHeroProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [artFailed, setArtFailed] = useState(false);

  // Fixed at mount — a greeting that flips mid-session is uncanny
  const hour = new Date().getHours();
  const daypart =
    hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Re-arm when track changes
  useEffect(() => {
    setArtFailed(false);
  }, [nowPlayingThumbnail]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="relative border-b">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {nowPlayingThumbnail && !artFailed ? (
          <>
            {/* 96px, not display size: blur-2xl is a 40px blur, so every detail above a handful of
                pixels is thrown away anyway. */}
            <img
              src={thumb(nowPlayingThumbnail, 96)}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl"
              onError={() => setArtFailed(true)}
            />
          </>
        ) : (
          /* Nothing playing: accent wash keeps it a header */
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.18]"
            style={{
              background: 'radial-gradient(120% 130% at 12% 0%, var(--primary) 0%, transparent 58%)',
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-background/30 to-transparent" />
      </div>
      <div className="relative p-6 pt-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            {accountThumbnail && (
              <img
                src={thumb(accountThumbnail, 128)}
                alt=""
                style={{ width: '2.75rem', height: '2.75rem', maxWidth: 'none' }}
                className="shrink-0 rounded-full object-cover ring-2 ring-border"
              />
            )}
            <h1 className="truncate font-heading text-4xl font-bold tracking-tight drop-shadow">
              {daypart}
              {accountName ? `, ${accountName.split(' ')[0]}` : ''}
            </h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onOpenListenTogether && (
              <button
                onClick={onOpenListenTogether}
                title="Listen Together"
                aria-label="Listen Together"
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  isInRoom
                    ? 'border-primary text-primary hover:bg-primary/10'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Users className="h-5 w-5" />
                {isInRoom && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
                )}
              </button>
            )}
            <form className="relative w-full max-w-xs" onSubmit={handleSearch}>
              <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <SearchSuggest
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search"
                inputClass="rounded-full pl-9"
                panelClass="right-0 w-[26rem]"
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
