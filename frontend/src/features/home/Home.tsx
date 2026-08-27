import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, ArrowUp } from 'lucide-react';
import { Shelf } from '../../components/Shelf';
import { MediaCardSkeleton } from '../../components/MediaCardSkeleton';
import { TrackRow } from '../../components/TrackRow';
import { TrackRowSkeleton } from '../../components/TrackRowSkeleton';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { Button } from '../../components/ui/Button';
import { usePersonal } from './PersonalContext';
import { usePlayer } from '../player/PlayerContext';
import { getCached, putCached } from './pageCache';
import { arrangeSections, hiddenSections, interleave } from './personal';
import type { HomePage, HomeSection, HomeChip, BrowseItem } from '../../lib/api';
import { RECENT_KEY, FAMILIAR_KEY, FORGOTTEN_KEY } from './homeTypes';
import type { HomeBlock } from './homeTypes';
import * as api from '../../lib/api';

function isForgotten(s: HomeSection): boolean {
  return /forgotten/i.test(s.title) && s.items.some((i) => i.kind === 'song');
}

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { personal, recentItems, topArtists, seedOnRepeatPick } = usePersonal();
  const { now, openPlayer } = usePlayer();

  const [home, setHome] = useState<HomePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chips, setChips] = useState<HomeChip[]>([]);
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [forgotten, setForgotten] = useState<HomeSection | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const latestChip = useRef<string | null>(null);

  const pinned = useMemo(() => new Set(personal.picks.map((p) => p.id)), [personal.picks]);
  const recent = useMemo(() =>
    recentItems(100).filter((r) => !pinned.has(r.id)).slice(0, 9),
    [personal, pinned],
  );
  const feed = useMemo(() => home?.sections.filter((s) => !isForgotten(s)) ?? [], [home]);
  const hidden = useMemo(() => hiddenSections(personal), [personal]);
  const blocks = useMemo((): HomeBlock[] => {
    const local: HomeBlock[] = selectedChip ? [] : [
      { id: RECENT_KEY, key: RECENT_KEY, title: 'Jump back in' },
      { id: FAMILIAR_KEY, key: FAMILIAR_KEY, title: 'Familiar artists' },
      { id: FORGOTTEN_KEY, key: FORGOTTEN_KEY, title: 'Forgotten favourites' },
    ];
    const shelves: HomeBlock[] = feed.map((s, i) => ({ id: `${i}:${s.title}`, key: s.title, title: s.title, shelf: s }));
    return arrangeSections([...local, ...shelves], personal) as HomeBlock[];
  }, [feed, personal, selectedChip]);
  const visible = useMemo(() => blocks.filter((b) => !hidden.has(b.key)), [blocks, hidden]);

  const load = useCallback(async (params: string | null = null) => {
    setSelectedChip(params);
    latestChip.current = params;
    const key = params ? `home:${params}` : 'home';
    const hit = getCached<HomePage>(key);
    if (hit) { setHome(hit); setLoading(false); noteForgotten(hit); }
    else setLoading(true);
    setError(null);
    try {
      const fresh = await api.getHome(params ?? undefined);
      if (latestChip.current !== params) return;
      setHome(fresh);
      putCached(key, fresh);
      noteForgotten(fresh);
      setLoading(false);
    } catch (e) {
      if (!hit) { setError(String(e)); setLoading(false); }
    }
  }, []);

  const loadMore = useCallback(async () => {
    const token = home?.continuation;
    if (!token || loadingMore) return;
    setLoadingMore(true);
    setMoreError(false);
    const params = selectedChip;
    try {
      const more = await api.getHomeMore(token);
      if (latestChip.current !== params) return;
      setHome((prev) => prev ? {
        ...prev,
        sections: [...prev.sections, ...more.sections],
        continuation: more.sections.length ? more.continuation : undefined,
      } : null);
      noteForgotten(more);
    } catch { setMoreError(true); }
    finally { setLoadingMore(false); }
  }, [home, loadingMore, selectedChip]);

  function noteForgotten(page: HomePage): boolean {
    const found = page.sections.find(isForgotten);
    if (found) { setForgotten(found); putCached('home:forgotten', found); }
    return !!found;
  }

  const showMore = (section: HomeSection) => {
    const q = new URLSearchParams({ id: section.moreBrowseId!, title: section.title });
    if (section.moreParams) q.set('params', section.moreParams);
    navigate(`/list?${q.toString()}`);
  };

  useEffect(() => { load(null); }, []);
  useEffect(() => { if (home?.chips?.length) setChips(home.chips.filter((c) => c.title !== 'Podcasts')); }, [home]);
  useEffect(() => { seedOnRepeatPick(); }, [now?.videoId]);

  // Scroll observer
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const h = () => setScrolled(el.scrollTop > 400);
    el.addEventListener('scroll', h, { passive: true });
    return () => el.removeEventListener('scroll', h);
  }, []);

  // Infinite scroll sentinel
  const sentinelRef = useCallback((node: Element | null) => {
    if (!node) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore(); }, { rootMargin: '400px 0px' });
    io.observe(node);
    return () => io.disconnect();
  }, [loadMore]);

  const shelfSkeletons = (n: number) =>
    Array.from({ length: n }, (_, s) => (
      <section key={s} aria-hidden>
        <Skeleton className="mb-3 h-5 w-40 rounded" />
        <div className="flex gap-3 overflow-hidden pb-2">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="w-36 shrink-0"><MediaCardSkeleton /></div>)}
        </div>
      </section>
    ));

  return (
    <div ref={scrollRef} className="page-scroll">
      {/* Mood chips */}
      {chips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 pt-4" style={{ scrollbarWidth: 'none' }}>
          {[{ title: 'All', params: '' }, ...chips].map((c) => (
            <button
              key={c.params}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                (c.params === '' ? !selectedChip : selectedChip === c.params)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              onClick={() => load(c.params || null)}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 pb-6 pt-4 flex flex-col gap-8">
        {/* Shortcuts */}
        {!selectedChip && personal.picks.length > 0 && (
          <section>
            <h2 className="mb-3 text-base font-semibold">Shortcuts</h2>
            <div className="card-grid">
              {personal.picks.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                      <Music className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  )}
                  <span className="min-w-0 truncate text-sm font-medium">{item.title}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Feed */}
        {visible.map((block) => {
          if (block.shelf) {
            return (
              <Shelf
                key={block.id}
                title={block.shelf.title}
                items={block.shelf.items}
                community={/community/i.test(block.shelf.title)}
                onMore={block.shelf.moreBrowseId ? () => showMore(block.shelf!) : undefined}
              />
            );
          }
          if (block.key === RECENT_KEY && recent.length > 0) {
            return (
              <section key={block.id}>
                <h2 className="mb-3 text-base font-semibold">Jump back in</h2>
                <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                  {recent.map((item) => (
                    <div key={item.id} className="w-36 shrink-0">
                      <div className="flex flex-col gap-1.5">
                        {item.thumbnail ? (
                          <img src={item.thumbnail} alt="" className="aspect-square w-full rounded-lg object-cover" />
                        ) : (
                          <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-muted">
                            <Music className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                        )}
                        <p className="truncate text-sm font-medium">{item.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          }
          if (block.key === FORGOTTEN_KEY && forgotten) {
            return (
              <section key={block.id}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-semibold">{forgotten.title}</h2>
                  {forgotten.moreBrowseId && (
                    <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => showMore(forgotten)}>More</button>
                  )}
                </div>
                <div className="flex flex-col">
                  {forgotten.items.slice(0, 10).map((item) => (
                    <TrackRow
                      key={item.id}
                      song={{ video_id: item.id, title: item.title, artists: item.subtitle ?? '', duration: item.duration, thumbnail: item.thumbnail, artist_runs: item.artistRuns, play_count: item.playCount, explicit: item.explicit } as any}
                      compact
                      showPlayCount
                      onplay={() => {}}
                    />
                  ))}
                </div>
              </section>
            );
          }
          return null;
        })}

        {loading && shelfSkeletons(3)}
        {error && <ErrorState message={error} onRetry={() => load(selectedChip)} />}
        {!loading && !error && !home?.sections.length && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Music className="h-8 w-8 text-muted-foreground/40" />
            <p className="max-w-xs text-sm text-muted-foreground">Sign in and home fills up with mixes and playlists built from what you listen to.</p>
          </div>
        )}
        {!loading && !error && home?.continuation && (
          moreError ? (
            <div className="py-4 text-center">
              <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>Try again</Button>
            </div>
          ) : (
            <div aria-busy={loadingMore}>
              <div ref={sentinelRef as React.RefCallback<Element>} />
              {loadingMore && shelfSkeletons(2)}
            </div>
          )
        )}
      </div>

      {/* Back to top */}
      {scrolled && (
        <button
          className="fixed bottom-24 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
          onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};
