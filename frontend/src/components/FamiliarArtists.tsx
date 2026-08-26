import { useState, useEffect } from 'react';
import { Heart, User } from 'lucide-react';
import { ArtistPage, BrowseItem } from '../lib/api';
import { thumb } from '../lib/thumb';
import { Skeleton } from './ui/Skeleton';
import { PlaylistMenu } from './PlaylistMenu';

interface FamiliarArtistsProps {
  artistIds: string[];
  fetchArtist: (id: string) => Promise<ArtistPage | null>;
  onOpen: (channelId: string) => void;
  onSubscribe: (channelId: string, subscribe: boolean) => Promise<void>;
}

const COUNT = 7;
const LISTED = 5;
const MIN = 3;
const BOX = 300;
const RY = 112;

const RING = [
  { a: -90, s: 72 },
  { a: -30, s: 70 },
  { a: 30, s: 68 },
  { a: 90, s: 72 },
  { a: 150, s: 70 },
  { a: 210, s: 68 },
];

/**
 * The artists you actually play, from local play counts — read as a short list on the left, and
 * drawn as a cluster of faces on the right. The cluster is the same handful of artists again in
 * picture form: it's what makes the section recognisable at a glance.
 */
export function FamiliarArtists({ artistIds, fetchArtist, onOpen, onSubscribe }: FamiliarArtistsProps) {
  const [artists, setArtists] = useState<ArtistPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<Record<string, boolean>>({});
  const [subBusy, setSubBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [boxWidth, setBoxWidth] = useState(0);

  const ids = artistIds.slice(0, COUNT);
  const rx = Math.min(Math.max(boxWidth / 2 - 46, RY), 170);
  const SLOTS = [
    { x: boxWidth / 2, y: BOX / 2, s: 96 },
    ...RING.map(({ a, s }) => ({
      x: boxWidth / 2 + rx * Math.cos((a * Math.PI) / 180),
      y: BOX / 2 + RY * Math.sin((a * Math.PI) / 180),
      s,
    })),
  ];

  useEffect(() => {
    if (ids.length < MIN) {
      setLoading(false);
      return;
    }

    Promise.all(ids.map(fetchArtist)).then((pages) => {
      const validPages = pages.filter((p): p is ArtistPage => !!p);
      setArtists(validPages);
      setSubs(Object.fromEntries(validPages.map((p) => [p.channelId, p.subscribed])));
      setLoading(false);
    });
  }, [artistIds]);

  const listed = artists.slice(0, LISTED);
  const cluster = artists.slice(0, SLOTS.length);

  const toggleSub = async (a: ArtistPage) => {
    if (subBusy) return;
    const next = !subs[a.channelId];
    setSubBusy(a.channelId);
    setSubs({ ...subs, [a.channelId]: next });
    try {
      await onSubscribe(a.channelId, next);
    } catch (e) {
      setSubs({ ...subs, [a.channelId]: !next });
      console.error(e);
    } finally {
      setSubBusy(null);
    }
  };

  if (loading && ids.length < MIN) return null;
  if (!loading && artists.length < MIN) return null;

  return (
    <section>
      <h2 className="mb-3 font-heading text-lg font-semibold">Familiar Artists</h2>
      <div className="grid items-center gap-6 md:grid-cols-2 md:gap-10">
        <div className="flex flex-col gap-1">
          {loading
            ? Array(Math.min(ids.length, LISTED))
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-1.5" aria-hidden="true">
                    <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <Skeleton className="h-3.5 w-32 rounded" />
                      <Skeleton className="h-3 w-20 rounded" />
                    </div>
                  </div>
                ))
            : listed.map((a) => (
                <div
                  key={a.channelId}
                  className="group/row flex cursor-pointer items-center gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-accent/10"
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpen(a.channelId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpen(a.channelId);
                    }
                  }}
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                    {a.thumbnail && !failed[a.channelId] ? (
                      <img
                        src={thumb(a.thumbnail, 400)}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        draggable="false"
                        onError={() => setFailed({ ...failed, [a.channelId]: true })}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{a.name ?? 'Artist'}</div>
                    <div className="truncate text-xs text-muted-foreground">{a.subscribers ?? 'Artist'}</div>
                  </div>
                  <button
                    className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-accent/10 ${
                      subs[a.channelId] ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    } ${subBusy === a.channelId ? 'animate-pulse' : ''}`}
                    aria-label={subs[a.channelId] ? `Unsubscribe from ${a.name ?? ''}` : `Subscribe to ${a.name ?? ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSub(a);
                    }}
                  >
                    <Heart className="h-5 w-5" />
                  </button>
                </div>
              ))}
        </div>
        <div
          className="relative hidden w-full md:block"
          style={{ height: `${BOX}px` }}
          ref={(el) => {
            if (el) setBoxWidth(el.clientWidth);
          }}
        >
          {(loading ? SLOTS.slice(0, COUNT) : cluster.map((_, i) => SLOTS[i])).map((slot, i) => {
            const a = cluster[i];
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${slot.x}px`,
                  top: `${slot.y}px`,
                  width: `${slot.s}px`,
                  height: `${slot.s}px`,
                }}
              >
                {loading || !a ? (
                  <Skeleton className="h-full w-full rounded-full" />
                ) : (
                  <button
                    className="h-full w-full cursor-pointer overflow-hidden rounded-full bg-muted shadow-sm transition-transform duration-200 ease-out hover:scale-105 hover:shadow-lg"
                    title={a.name ?? 'Artist'}
                    aria-label={a.name ?? 'Artist'}
                    onClick={() => onOpen(a.channelId)}
                  >
                    {a.thumbnail && !failed[a.channelId] ? (
                      <img
                        src={thumb(a.thumbnail, 400)}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        draggable="false"
                        onError={() => setFailed({ ...failed, [a.channelId]: true })}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
                        <User className="h-7 w-7" />
                      </div>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
